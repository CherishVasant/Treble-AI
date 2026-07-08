import os
import urllib.request
import urllib.parse
import json
import re
from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from config import get_settings
from reference_library import search_library


# Define local reference library search tool
@tool
def search_local_reference_library(query: str) -> str:
    """
    Search the local music reference library database for scales, keys, intervals, definitions, or formulas.
    Use this to get local reference details.
    """
    try:
        results = search_library(query)
        if not results:
            return f"No entries found in local reference library matching '{query}'."
            
        formatted = []
        for ent in results[:5]:
            sect_title = ent["section_title"]
            formatted.append(
                f"[{sect_title}] {ent['title']}\n"
                f"Description: {ent['description'] or 'N/A'}\n"
                f"Formula: {ent['formula'] or 'N/A'}\n"
                f"Notes: {ent['notes']}\n"
                f"Intervals: {ent['intervals']}\n"
            )
        return "\n".join(formatted)
    except Exception as e:
        return f"Failed to query local reference library: {str(e)}"

# DuckDuckGo fallback search
def search_ddg(query: str) -> str:
    try:
        encoded_query = urllib.parse.quote(query)
        url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode("utf-8")
            results = re.findall(
                r'<a class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?<a class="result__snippet"[^>]*>(.*?)</a>',
                html,
                re.DOTALL
            )
            formatted = []
            for link, title, snippet in results[:3]:
                title_clean = re.sub(r'<[^>]+>', '', title).strip()
                snippet_clean = re.sub(r'<[^>]+>', '', snippet).strip()
                if uddg_match := re.search(r'uddg=([^&]+)', link):
                    link = urllib.parse.unquote(uddg_match.group(1))
                elif link.startswith('//'):
                    link = 'https:' + link
                formatted.append(f"Title: {title_clean}\nURL: {link}\nSnippet: {snippet_clean}\n")
            return "\n".join(formatted) if formatted else "No results found on DuckDuckGo."
    except Exception as e:
        return f"DuckDuckGo search failed: {str(e)}"

# Tavily search
def search_tavily(query: str, api_key: str) -> str:
    try:
        url = "https://api.tavily.com/search"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        data = {
            "query": query,
            "search_depth": "basic",
            "include_answer": False,
            "max_results": 3
        }
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            results = res_data.get("results", [])
            formatted = []
            for r in results:
                formatted.append(f"Title: {r.get('title')}\nURL: {r.get('url')}\nContent: {r.get('content')}\n")
            return "\n".join(formatted) if formatted else "No results found on Tavily."
    except Exception as e:
        return f"Tavily search failed: {str(e)}"

# Serper search
def search_serper(query: str, api_key: str) -> str:
    try:
        url = "https://google.serper.dev/search"
        headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json"
        }
        data = {"q": query, "num": 3}
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode("utf-8"), 
            headers=headers, 
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            organic = res_data.get("organic", [])
            formatted = []
            for r in organic:
                formatted.append(f"Title: {r.get('title')}\nURL: {r.get('link')}\nSnippet: {r.get('snippet')}\n")
            return "\n".join(formatted) if formatted else "No results found on Serper."
    except Exception as e:
        return f"Serper search failed: {str(e)}"

# Brave search
def search_brave(query: str, api_key: str) -> str:
    try:
        encoded_query = urllib.parse.quote(query)
        url = f"https://api.search.brave.com/res/v1/web/search?q={encoded_query}&count=3"
        req = urllib.request.Request(url, headers={
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": api_key
        })
        with urllib.request.urlopen(req, timeout=10) as response:
            import gzip
            if response.info().get('Content-Encoding') == 'gzip':
                pagedata = gzip.decompress(response.read())
            else:
                pagedata = response.read()
            res_data = json.loads(pagedata.decode("utf-8"))
            results = res_data.get("web", {}).get("results", [])
            formatted = []
            for r in results:
                formatted.append(f"Title: {r.get('title')}\nURL: {r.get('url')}\nDescription: {r.get('description')}\n")
            return "\n".join(formatted) if formatted else "No results found on Brave Search."
    except Exception as e:
        return f"Brave search failed: {str(e)}"

# Unified web search tool
@tool
def search_web(query: str) -> str:
    """
    Search the web for music-related questions, history, concepts, sheet music references, or definitions
    when local database knowledge is insufficient or you need external details.
    """
    tavily_key = os.environ.get("TAVILY_API_KEY")
    serper_key = os.environ.get("SERPER_API_KEY")
    brave_key = os.environ.get("BRAVE_API_KEY")
    
    if tavily_key:
        return search_tavily(query, tavily_key)
    elif serper_key:
        return search_serper(query, serper_key)
    elif brave_key:
        return search_brave(query, brave_key)
    else:
        return search_ddg(query)

class AgentService:
    @staticmethod
    def run_agent(
        message: str,
        context: str = "",
        system_prompt: str = "You are a helpful music theory tutor.",
        history: list = None
    ) -> dict:
        settings = get_settings()
        api_key = (settings.openrouter_api_key or "").strip()
        if not api_key:
            return {
                "response": "OPENROUTER_API_KEY is not configured on the Python backend. Add it to backend/.env and restart the backend server.",
                "success": False,
                "suggested_follow_up_questions": [],
                "related_concepts": [],
                "citations": [],
                "agent_steps": ["Thinking", "Failed"]
            }

        # Setup tools list
        tools = [search_web, search_local_reference_library]
        
        # Add get_loaded_score_details tool if context is provided
        @tool
        def get_loaded_score_details() -> str:
            """Get the parsed musical details, metadata, and note sequences of the currently loaded sheet music score in the Practice Studio."""
            if not context or "No sheet music" in context:
                return "No sheet music score is currently loaded in the studio."
            return context
            
        tools.append(get_loaded_score_details)

        # Build initial messages list
        json_instructions = (
            "\n\nYou MUST respond ONLY with a valid JSON object. Do not include any conversational text or markdown code blocks (like ```json) outside the JSON. "
            "The JSON object must have exactly the following structure:\n"
            "{\n"
            '  "response": "Your detailed tutor answer in Markdown format (use headings, lists, bold, italics, tables, and code blocks as needed). Support music notation formatting (like sharps/flats).",\n'
            '  "suggested_follow_up_questions": ["Question 1?", "Question 2?", "Question 3?"],\n'
            '  "related_concepts": ["Concept A", "Concept B", "Concept C"],\n'
            '  "citations": ["Reference Source A", "Reference Source B"]\n'
            "}"
        )
        
        instruction_directive = (
            "CRITICAL INSTRUCTIONS:\n"
            "- You have access to a deterministic, algorithmically generated music analysis report for the active piece.\n"
            "- The report contains advanced metrics: melodic register and pitch range, contour classification, diatonicity percentage, voice-leading audits (specifically parallel perfect fifths and octaves), and custom practice scale warm-up recommendations.\n"
            "- DO NOT attempt to compute keys, scales, chords, Roman numerals, intervals, cadences, or fingerings from scratch.\n"
            "- Use the provided report as the absolute source of truth. If the user asks for analysis details, refer to the report.\n"
            "- Your primary role is to act as a supportive music tutor: explain the concepts behind the analysis (such as parallel motion rules or modal similarities), answer follow-up questions, teach theory in relation to the piece, and generate structured practice advice."
        )
        
        system_parts = [system_prompt.strip(), json_instructions, instruction_directive]
        if context.strip():
            system_parts.append(f"Context from the app (Music Analysis Report):\n{context.strip()}")
        system_content = "\n\n".join(system_parts)

        messages = [SystemMessage(content=system_content)]
        if history:
            for h in history:
                role = getattr(h, "role", None) or (h.get("role") if isinstance(h, dict) else None)
                content = getattr(h, "content", None) or (h.get("content") if isinstance(h, dict) else None)
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))
                    
        messages.append(HumanMessage(content=message))

        # Setup LLM with OpenRouter config
        llm = ChatOpenAI(
            model=settings.theory_llm_model,
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=0.7,
            default_headers={
                "HTTP-Referer": "https://github.com/Treble-AI",
                "X-Title": "Treble AI",
            }
        )
        
        # Bind tools to LLM
        llm_with_tools = llm.bind_tools(tools)

        # Track steps taken
        agent_steps = ["Thinking"]
        
        # Loop for tool execution
        max_turns = 5
        curr_turn = 0
        
        while curr_turn < max_turns:
            curr_turn += 1
            try:
                res = llm_with_tools.invoke(messages)
            except Exception as exc:
                message_err = str(exc)
                return {
                    "response": f"Sorry, I encountered an LLM error: {message_err}",
                    "success": False,
                    "suggested_follow_up_questions": [],
                    "related_concepts": [],
                    "citations": [],
                    "agent_steps": agent_steps + ["Failed"]
                }
                
            messages.append(res)
            
            # Check for tool calls
            tool_calls = getattr(res, "tool_calls", [])
            if not tool_calls:
                break
                
            # Execute tool calls
            for tool_call in tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                tool_id = tool_call["id"]
                
                # Expose status message for agent activities
                if tool_name == "search_web":
                    q = tool_args.get("query", "")
                    agent_steps.append(f"Searching web references for '{q}'...")
                elif tool_name == "search_local_reference_library":
                    q = tool_args.get("query", "")
                    agent_steps.append(f"Searching local music database for '{q}'...")
                elif tool_name == "get_loaded_score_details":
                    agent_steps.append("Analyzing loaded sheet music score...")
                
                # Execute the tool
                try:
                    if tool_name == "search_web":
                        tool_out = search_web.invoke(tool_args)
                    elif tool_name == "search_local_reference_library":
                        tool_out = search_local_reference_library.invoke(tool_args)
                    elif tool_name == "get_loaded_score_details":
                        tool_out = get_loaded_score_details.invoke(tool_args)
                    else:
                        tool_out = f"Error: Tool '{tool_name}' not found."
                except Exception as e:
                    tool_out = f"Error executing tool '{tool_name}': {str(e)}"
                    
                messages.append(ToolMessage(content=str(tool_out), tool_call_id=tool_id))
                
        # Final step is generating response
        agent_steps.append("Generating response...")
        agent_steps.append("Finalizing answer...")

        # Parse JSON output from final assistant message
        final_text = messages[-1].content if hasattr(messages[-1], "content") else str(messages[-1])
        
        response_text = str(final_text)
        suggested = []
        concepts = []
        citations = []
        
        try:
            cleaned = response_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            data = json.loads(cleaned)
            response_text = data.get("response", response_text)
            suggested = data.get("suggested_follow_up_questions", [])
            concepts = data.get("related_concepts", [])
            citations = data.get("citations", [])
        except Exception as e:
            print("[agent service] JSON parse fallback. Error:", e)
            
        return {
            "response": response_text,
            "success": True,
            "suggested_follow_up_questions": suggested,
            "related_concepts": concepts,
            "citations": citations,
            "agent_steps": agent_steps
        }
