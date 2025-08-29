from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import Tool
from langchain_community.tools.tavily_search import TavilySearchResults
import wikipedia
from langchain.agents import initialize_agent, AgentType
from langchain.memory import ConversationBufferMemory
from vector_db import VectorDB
import re
from dotenv import load_dotenv
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import HTTPException
import uvicorn

load_dotenv()

app = FastAPI(title="Treble AI", description="Musical Terms Chatbot API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    success: bool = True
    error: Optional[str] = None

gem = os.getenv("GOOGLE_API_KEY")
tavily_key = os.getenv("TAVILY_API_KEY")

vector_db = VectorDB()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=gem,
    temperature=0,
    model_kwargs={
        "system_instruction": (
            "You are a music teaching assistant that answers questions related to music theory and history using tools in ReAct format.\n"
            "Use 'WikipediaSearch' when the user asks for definitions or explanations of musical terms.\n"
            "Use 'TavilySearchResults' for web search if wikipedia doesn't return useful results.\n"
            "Always format with 'Thought:', 'Action:', 'Action Input:' and finish with 'Final Answer:'."
        )
    }
)


def vector_db_search(query: str) -> str:
    result = vector_db.search(query)
    if result:
        return f"(From VectorDB) {result}"
    else:
        return "No entry found in VectorDB."

vector_db_tool = Tool(
    name="VectorDBSearch",
    func=vector_db_search,
    description="Use this tool to get a previously stored meaning of a word from the vector database."
)

def wiki_search(query: str) -> str:
    try:
        return wikipedia.summary(query, sentences=3)
    except wikipedia.exceptions.DisambiguationError as e:
        return f"Multiple results found: {e.options[:5]}"
    except wikipedia.exceptions.PageError:
        return "No Wikipedia page found for this topic."
    except Exception as e:
        return f"An error occurred: {str(e)}"

wiki_tool = Tool(
    name="WikipediaSearch",
    func=wiki_search,
    description="Use this tool to get a short summary of a musical or general term from Wikipedia if web search doesn't return useful results."
)

tools = [vector_db_tool, TavilySearchResults(), wiki_tool]

memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True
)

agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
    verbose=True,
    handle_parsing_errors=True,
    memory=memory
)

def extract_word(query):
    match = re.search(r"(?:what is|define)\s+([a-zA-Z0-9\- ]+)\??", query, re.IGNORECASE)
    if match:
        return match.group(1).strip().lower()
    return None

print()
last_word = None

executor = ThreadPoolExecutor(max_workers=4)

def process_chat_message(query: str) -> dict:
    """Process chat message using your existing agent logic"""
    global last_word
    
    try:
        # Invoke your existing agent
        response = agent.invoke(query)
        
        # Extract word and update vector DB
        word = extract_word(query)
        if word:
            vector_db.add_or_update(word, response["output"])
            last_word = word
        elif "more" in query.lower() and last_word:
            vector_db.add_or_update(last_word, response["output"])
        
        return {
            "answer": response["output"],
            "success": True
        }
    except Exception as e:
        logging.error(f"Error processing chat message: {str(e)}")
        return {
            "answer": "I'm sorry, I encountered an error processing your request. Please try again.",
            "success": False,
            "error": str(e)
        }


@app.get("/")
async def root():
    return {"message": "Treble AI - Musical Terms Chatbot API"}

@app.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """Main chat endpoint"""
    try:
        if not message.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Run the blocking agent code in a thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor, 
            process_chat_message, 
            message.message
        )
        
        return ChatResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "Treble AI"}

@app.get("/search-history")
async def get_search_history():
    """Get recent searches from vector DB"""
    try:
        history = vector_db.get_recent_searches(limit=10)
        return {"history": history, "message": "Search history retrieved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/clear-memory")
async def clear_memory():
    """Clear conversation memory"""
    try:
        global memory
        memory.clear()
        return {"message": "Memory cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

