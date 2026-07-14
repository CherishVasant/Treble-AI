import os
import urllib.request
import urllib.parse
import json
import re
from typing import List, Dict, Any, Optional, Annotated, Sequence, TypedDict
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from config import get_settings
from reference_library import search_library
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages


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


# --- LangChain Agents Implementation ---

class AgentService:
    @staticmethod
    def run_agent(
        message: str,
        context: str = "",
        system_prompt: str = "You are a helpful music theory tutor.",
        history: list = None,
        chat_type: str = "theory"
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

        # Build initial messages list
        messages = []
        
        # Format the appropriate system prompt based on chat_type
        if chat_type == "practice":
            # Practice Studio Agent
            active_score_ctx = ""
            if context and "No sheet music" not in context:
                active_score_ctx = f"\n\n--- Active Loaded Score Context ---\n{context}"
                
            sys_msg = (
                f"{system_prompt}\n\n"
                f"{active_score_ctx}\n\n"
                "Use this report details (difficulty score, chords, Roman numerals, voice-leading rules, and fingerings) to answer questions, "
                "offer structured practice guidelines, suggest scale routines, and explain concept-based insights.\n"
                "You have access to search tools (search_local_reference_library and search_web) to lookup exact definitions, formulas, and general guides if needed.\n"
                "You MUST respond ONLY with a valid JSON object matching this structure:\n"
                "{\n"
                '  "response": "Your detailed tutor answer in Markdown format (use headings, lists, tables). Explain your insights thoroughly.",\n'
                '  "suggested_follow_up_questions": ["Question 1?", "Question 2?", "Question 3?"],\n'
                '  "related_concepts": ["Concept A", "Concept B", "Concept C"],\n'
                '  "citations": ["Citation A", "Citation B"]\n'
                "}\n\n"
                "Do not wrap in markdown code block, just output raw JSON."
            )
            tools = [search_local_reference_library, search_web]
            agent_role = "Practice Coach"
        else:
            # General Music Theory Agent
            sys_msg = (
                f"{system_prompt}\n\n"
                "Answer the user's music theory queries, scale or chord formulas, music history, or definitions. "
                "You have access to search tools (search_local_reference_library and search_web) to lookup exact definitions or formulas if needed. "
                "You MUST respond ONLY with a valid JSON object matching this structure:\n"
                "{\n"
                '  "response": "Your detailed tutor answer in Markdown format (use headings, lists, tables). Explain the concepts in detail.",\n'
                '  "suggested_follow_up_questions": ["Question 1?", "Question 2?", "Question 3?"],\n'
                '  "related_concepts": ["Concept A", "Concept B", "Concept C"],\n'
                '  "citations": ["Citation A", "Citation B"]\n'
                "}\n\n"
                "Do not wrap in markdown code block, just output raw JSON."
            )
            tools = [search_local_reference_library, search_web]
            agent_role = "Theory Scholar"

        messages.append(SystemMessage(content=sys_msg))

        if history:
            for h in history:
                role = getattr(h, "role", None) or (h.get("role") if isinstance(h, dict) else None)
                content = getattr(h, "content", None) or (h.get("content") if isinstance(h, dict) else None)
                if role == "user":
                    messages.append(HumanMessage(content=content))
                elif role == "assistant":
                    messages.append(AIMessage(content=content))
                    
        messages.append(HumanMessage(content=message))

        steps = [f"Thinking: Running {agent_role}..."]
        response_text = ""

        try:
            llm = ChatOpenAI(
                model=settings.theory_llm_model,
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
                temperature=0.5,
                default_headers={
                    "HTTP-Referer": "https://github.com/Treble-AI",
                    "X-Title": f"Treble AI {agent_role}",
                }
            )
            
            llm_with_tools = llm.bind_tools(tools)
            
            # Simple standard ReAct loop using LangChain
            max_turns = 5
            for turn in range(max_turns):
                res = llm_with_tools.invoke(messages)
                messages.append(res)
                if not getattr(res, "tool_calls", []):
                    response_text = res.content
                    break
                for tool_call in res.tool_call_queries if hasattr(res, "tool_call_queries") else res.tool_calls:
                    name = tool_call["name"]
                    args = tool_call["args"]
                    tid = tool_call["id"]
                    if name == "search_local_reference_library":
                        steps.append(f"Scholar: Searching local library for '{args.get('query', '')}'...")
                        out = search_local_reference_library.invoke(args)
                    elif name == "search_web":
                        steps.append(f"Scholar: Searching web references for '{args.get('query', '')}'...")
                        out = search_web.invoke(args)
                    else:
                        out = f"Tool {name} not found."
                    messages.append(ToolMessage(content=str(out), tool_call_id=tid))
            else:
                # If loop finishes without breaking, run a final synthesis step forcing text output
                steps.append("Planner: Finalizing response synthesis...")
                final_res = llm.invoke(messages)
                response_text = final_res.content
        except Exception as exc:
            return {
                "response": f"Sorry, I encountered an error during execution: {str(exc)}",
                "success": False,
                "suggested_follow_up_questions": [],
                "related_concepts": [],
                "citations": [],
                "agent_steps": steps + ["Failed"]
            }

        # Parse JSON output from the response
        suggested = []
        concepts = []
        citations_list = []
        
        try:
            # 1. Clean markdown wrappers
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                first_line_end = cleaned.find("\n")
                if first_line_end != -1:
                    cleaned = cleaned[first_line_end:]
                else:
                    cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            
            # 2. Try parsing direct or extracting bracket block using strict=False
            data = None
            try:
                data = json.loads(cleaned, strict=False)
            except Exception:
                first_brace = cleaned.find("{")
                last_brace = cleaned.rfind("}")
                if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                    candidate = cleaned[first_brace:last_brace + 1]
                    data = json.loads(candidate, strict=False)
            
            if data is not None:
                response_text = data.get("response", response_text)
                suggested = data.get("suggested_follow_up_questions", [])
                concepts = data.get("related_concepts", [])
                citations_list = data.get("citations", [])
            else:
                print("[agent service] JSON extraction failed: No braces found.")
        except Exception as e:
            print("[agent service] JSON parse fallback. Error:", e)
            # Try regex fallback parsing to salvage response details from malformed JSON
            try:
                res_match = re.search(r'"response"\s*:\s*"(.*)"\s*,\s*"(?:suggested_follow_up_questions|related_concepts|citations)"', cleaned, re.DOTALL)
                if res_match:
                    response_text = res_match.group(1).replace("\\n", "\n").replace('\\"', '"')
                
                sug_match = re.search(r'"suggested_follow_up_questions"\s*:\s*\[(.*?)\]', cleaned, re.DOTALL)
                if sug_match:
                    suggested = re.findall(r'"(.*?)"', sug_match.group(1))
                    
                con_match = re.search(r'"related_concepts"\s*:\s*\[(.*?)\]', cleaned, re.DOTALL)
                if con_match:
                    concepts = re.findall(r'"(.*?)"', con_match.group(1))
                    
                cit_match = re.search(r'"citations"\s*:\s*\[(.*?)\]', cleaned, re.DOTALL)
                if cit_match:
                    citations_list = re.findall(r'"(.*?)"', cit_match.group(1))
            except Exception as fe:
                print("[agent service] JSON fallback regex parse failed:", fe)
            
        steps.append("Planner: Finalizing response structure...")
        return {
            "response": response_text,
            "success": True,
            "suggested_follow_up_questions": suggested,
            "related_concepts": concepts,
            "citations": citations_list,
            "agent_steps": steps
        }

