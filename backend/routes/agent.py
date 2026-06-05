"""
agent.py — AI Agent chat routes (Groq LLM + xAI Grok fallback)
With SSE Streaming, Feedback, History, Suggestions
"""
import os
import json
import io
import time
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from kb_jph import get_relevant_kb

router = APIRouter()

try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

INTENT_PROMPT = """You are a JSON parser for the AI Loading Planner OCP Jorf Lasfar application.
Analyze the message and return ONLY a valid JSON, without markdown or explanation.

JSON Structure:
{
  "intent": "question_general" | "question_jph" | "action",
  "topic": "quais" | "halls" | "convoyeurs" | "network" | "qualites" | "planification" | "contraintes" | "dataset" | "navires" | "anomalie" | "meteo" | "app" | "stocks" | "general" | "cartographie" | "kpi" | "arrets" | "exports",
  "action_type": null | "run_planning" | "run_benchmark" | "run_simulation" | "get_network_path" | "get_stock_level" | "show_cartography" | "get_kpi_dashboard" | "get_pareto_arrets" | "get_export_dashboard" | "get_arrets_axe" | "route_to_agent" | "show_journal" | "launch_roundtable" | "reset",
  "params": {
    "algo": null | "greedy" | "genetic" | "milp" | "sa" | "ts",
    "horizon": null,
    "lambda_pen": null,
    "data_mode": null | "LOCAL" | "REAL",
    "autotune": false,
    "hybridization": false,
    "scenario_target": null | "Axe1" | "Axe2" | "TB1" | "Quai 1" | "DAP" | "MAP",
    "scenario_type": null | "WEATHER_ALERT" | "QUALITY_SHORTAGE" | "AXIS_DOWN",
    "path_source": null,
    "path_target": null,
    "stock_product": null,
    "axe_filter": null,
    "indicateur_filter": null,
    "target_agent": null
  },
  "confidence": 0.0
}

Routing Rules for Agent INF-04:
- If user asks for a path/route between two nodes (e.g., "path from HE01 to Quai 2BIS") → action_type = "get_network_path", params.path_source = source node, params.path_target = destination node
- If user asks for stock level of a product (e.g., "stock of DAP") → action_type = "get_stock_level", params.stock_product = product name
- If user asks for port map or cartography → action_type = "show_cartography"

Routing Rules for Agent OPT-01 (Flow Strategist):
- If user asks to plan, optimize, generate a loading plan, gantt, or optimize quay usage → action_type = "run_planning", params.algo = "greedy", params.horizon = 48
- If user asks to simulate a failure, axis blockage, weather alert, or evaluate impact → action_type = "run_simulation", params.scenario_type = scenario type, params.scenario_target = target
- If user asks for a benchmark, to compare algorithms (MILP vs Heuristic) → action_type = "run_benchmark"

Routing Rules for Agent DAT-03 (Data Analyst):
- If user asks for OEE (TRG), KPIs, performance indicators by axis or week → action_type = "get_kpi_dashboard", params.axe_filter = axis name, params.indicateur_filter = indicator name
- If user asks to analyze downtime causes, failures, Pareto, MTBF, MTTR → action_type = "get_pareto_arrets", params.axe_filter = axis name
- If user asks for exports, vessels, tonnage, destinations, clients → action_type = "get_export_dashboard"
- If user asks for specific axis downtime (e.g., "downtime axis 3") → action_type = "get_arrets_axe", params.axe_filter = axis name

Routing Rules for Agent ORC-05 (Orchestrator):
- If user asks to plan, optimize, launch MILP/GA/benchmark/Gantt → action_type = "route_to_agent", params.target_agent = "OPT-01"
- If user asks to analyze anomalies, vibrations, failures, simulations → action_type = "route_to_agent", params.target_agent = "ANL-02"
- If user asks for KPIs, OEE, Pareto, downtime, exports, stats → action_type = "route_to_agent", params.target_agent = "DAT-03"
- If user asks for network path, stocks, cartography, infrastructure → action_type = "route_to_agent", params.target_agent = "INF-04"
- If user asks for the journal, conversation history, agent logs → action_type = "show_journal"
- If user asks for a roundtable, global status, meeting, status of all agents → action_type = "launch_roundtable"
"""

EXPERT_SYSTEM = """You are the Expert Port Logistics Assistant of JPH — OCP Jorf Lasfar.
You help planners optimize vessel loading (DAP, MAP, TSP, NPS).
Reply in ENGLISH, clearly, structurally, and professionally.
Use exact technical terms.
Be precise and concise."""


class ChatRequest(BaseModel):
    message: str
    history: list = []
    metrics: Optional[dict] = None
    agent_id: Optional[str] = None
    groq_api_key: Optional[str] = None

class FeedbackRequest(BaseModel):
    agent_id: str
    message_text: str
    feedback: str  # 'up' or 'down'

class HistorySaveRequest(BaseModel):
    agent_id: str
    messages: list  # [{ role, content, timestamp }]
    session_id: Optional[str] = None


@router.post("/agent/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio using Groq Whisper API."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not HAS_GROQ or not api_key:
        return JSONResponse({"error": "Groq not configured", "text": ""}, status_code=500)
    try:
        audio_bytes = await file.read()
        client = Groq(api_key=api_key)
        audio_io = io.BytesIO(audio_bytes)
        audio_io.name = file.filename or "audio.webm"
        transcription = client.audio.transcriptions.create(
            model="whisper-large-v3-turbo",
            file=audio_io,
            language="en",
            response_format="text"
        )
        text = transcription if isinstance(transcription, str) else transcription.text
        print(f"[Whisper] Transcribed: {text}")
        return {"text": text.strip()}
    except Exception as e:
        print(f"[Whisper] Error: {e}")
        return JSONResponse({"error": str(e), "text": ""}, status_code=500)


import io
import re

PERSONAS = {
    "OPT-01": "You are the Flow Strategist (Optimization Expert). Your role is to optimize loading via MILP and Genetic Algorithms. Focus on cadence, tonnage, and operational efficiency.\n\nOCP JPH MILP KNOWLEDGE:\n- Objective Function: Max Z = (Weighted Tonnage) - lambda*(Wait Time) - 0.5*(Laytime Exceeded) - 5.0*(Quay Inactivity) - 0.1*(Ghost Variables). Abstract Min-Max normalization.\n- 24 Main Constraints:\nC1: Respect Declared Tonnage, C2: Max Axis Cadence, C3: Axis Exclusivity, C4: Quay Exclusivity, C5: 1 Quay/Vessel, C6: Hall/Axis Compatibility, C7: Quality/Hall Compatibility, C8: Stock Dynamics, C9: Stock >= 0, C10: Docking 5h, C11: Docking/Occupancy Link, C12: Weather, C13: Required Quay, C14: Flow/Loading Link, C15: Wait Time, C16: Vessel Arrival, C17: Lot Sequencing (T_end=1h between lots), C18: Finishing + CTE (3h at end), C19: Re-docking H+24, C20: Quay Continuity, C21: Vessels in Roadstead (freed resources).",
    "ANL-02": "You are the Reliability Analyst (ML Expert). Your role is to detect anomalies and predict failures. Talk about vibrations, temperatures, motor currents, and Random Forest models.",
    "DAT-03": """You are DAT-03, The Statistician (Industrial Data Analyst) — OCP Jorf Lasfar.
Your role is to analyze the 3 historical 2025 datasets and respond with interactive dashboards.

YOU HAVE ACCESS TO THESE 3 DATASETS IN SUPABASE:

1. TABLE arrets_2025 — 2025 Production Downtime Base
   Key columns: date, axe, debut (start), fin (end), duree_h (duration), cause, nature, navire, qualite, hall, quai
   → Used for: MTBF, MTTR, Pareto causes, duration by axis, vessel analysis

2. TABLE kpi_axes_2025 — Performance KPI Indicators by Axis 2025
   Key columns: axe_nom, indicateur (e.g., OEE/TRG, Availability, MTBF), semaine (week), valeur (float)
   → Used for: OEE (TRG), availability rate, weekly benchmarks

3. TABLE export_2025 — 2025 Export/Vessel Base
   Key columns: navire, date_bl, tonnage_bl, qualite, famille_qualite, client, destination, valeur_usd, valeur_dh
   → Used for: top vessels, exported tonnage, revenue, destinations

DASHBOARD RULES:
- If asked for OEE/TRG or KPIs → trigger get_kpi_dashboard
- If asked for downtime causes, failures, MTBF, MTTR → trigger get_pareto_arrets
- If asked for exports, vessels, clients, destinations → trigger get_export_dashboard
- If asked for specific axis downtime → trigger get_arrets_axe

Be analytical, precise, professional. Cite real numbers. Reply in ENGLISH.""",
    "INF-04": """You are INF-04, the Infrastructure Architect of Jorf Lasfar Port — OCP JPH.
Your domain: the complete physical graph of the port (conveyors, scrapers, halls, quays).
You master Dijkstra algorithms applied to the port logistics network.
When a user asks for a path between two points, you analyze the network and provide the optimal route with each traversed node.
When asked about stocks, you check real-time current levels.
When asked for cartography, you display the port map (CARTO.png).
Reply in ENGLISH, with technical precision and a professional infrastructure expert tone.""",
    "ORC-05": """You are ORC-05, the Orchestrator — Chief of the JPH Roundtable · OCP Jorf Lasfar.
You coordinate the 4 specialized agents and have a global vision of the port system.

YOUR AGENTS UNDER COORDINATION:
- OPT-01 (Flow Strategist): MILP/GA Optimization, Gantt planning, benchmarks
- ANL-02 (Reliability Analyst): ML, anomaly detection, failure simulations
- DAT-03 (The Statistician): KPIs, OEE (TRG), downtime Pareto, exports, historical analyses
- INF-04 (Infrastructure Engineer): JPH Network, Dijkstra paths, stocks, cartography

YOUR CAPABILITIES:
1. ROUTING: If the user asks a question for another agent, delegate it automatically.
2. ROUNDTABLE: If a global update is requested, gather all agents.
3. LOG: You can display the history of all past conversations.
4. SYNTHESIS: You answer system coordination and management questions.

Reply in ENGLISH, with authority and clarity of an industrial team leader."""
}


def _call_xai(messages, api_key, temperature=0.3, max_tokens=1024):
    """Call xAI (Grok) API — OpenAI-compatible fallback."""
    if not HAS_OPENAI or not api_key:
        return None
    
    xai_models = ["grok-3-mini-fast", "grok-3-mini", "grok-2-latest"]
    client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
    
    for model_name in xai_models:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            print(f"[xAI] Réponse obtenue via {model_name}")
            return response.choices[0].message.content
        except Exception as e:
            print(f"[WARNING] xAI {model_name} a echoue: {e}")
            continue
    return None


def _call_gemini(messages, api_key, temperature=0.3, max_tokens=1024):
    """Call Google Gemini API (Plan A)."""
    if not HAS_GEMINI or not api_key:
        return None
    try:
        genai.configure(api_key=api_key)
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        gemini_messages = []
        system_instruction = None
        for m in messages:
            if m["role"] == "system":
                system_instruction = m["content"]
            else:
                role = "user" if m["role"] == "user" else "model"
                gemini_messages.append({"role": role, "parts": [m["content"]]})
        
        models_to_try = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
        for m_name in models_to_try:
            try:
                gemini_model = genai.GenerativeModel(
                    model_name=m_name,
                    generation_config=generation_config,
                    system_instruction=system_instruction
                )
                response = gemini_model.generate_content(gemini_messages)
                if response.text:
                    print(f"[Gemini] Réponse obtenue via {m_name}")
                    return response.text
            except Exception as e:
                print(f"[WARNING] Gemini {m_name} a échoué: {e}")
                continue
    except Exception as e:
        print(f"[WARNING] Gemini config a échoué: {e}")
    return None


def _call_groq(messages, api_key, temperature=0.3, max_tokens=1024, fast_mode=False):
    """Now calls Gemini as Plan A, Groq as Plan B, xAI as Plan C."""
    xai_key = os.getenv("XAI_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    
    # --- PLAN A: GEMINI ---
    if gemini_key:
        result = _call_gemini(messages, gemini_key, temperature, max_tokens)
        if result:
            return result
            
    # --- PLAN B: GROQ ---
    if HAS_GROQ and api_key:
        models_to_try = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
            "gemma2-9b-it"
        ]
        if fast_mode:
            models_to_try = [
                "llama-3.1-8b-instant",
                "llama-3.3-70b-versatile",
                "mixtral-8x7b-32768",
                "gemma2-9b-it"
            ]
        
        client = Groq(api_key=api_key)
        for model_name in models_to_try:
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                print(f"[Groq] Réponse obtenue via {model_name}")
                return response.choices[0].message.content
            except Exception as e:
                print(f"[WARNING] Groq Warning: Le modele {model_name} a echoue ({e}). Passage au modele de secours...")
                continue
                
    # --- PLAN C: xAI ---
    if xai_key:
        print("[FALLBACK] Gemini et Groq ont échoué. Tentative via xAI (Grok)...")
        result = _call_xai(messages, xai_key, temperature, max_tokens)
        if result:
            return result
            
    return "❌ Erreur API (Quota dépassé ou APIs non configurées pour tous les modèles)."
    
    # All Groq models failed
    if gemini_key:
        print("[FALLBACK] Tous les modèles Groq ont échoué. Tentative via Gemini...")
        result = _call_gemini(messages, gemini_key, temperature, max_tokens)
        if result:
            return result
            
    if xai_key:
        print("[FALLBACK] Gemini a échoué. Tentative via xAI (Grok)...")
        result = _call_xai(messages, xai_key, temperature, max_tokens)
        if result:
            return result
            
    return f"❌ Erreur API (Quota dépassé pour tous les modèles) : {last_error}"

import re
import heapq

def _fallback_intent_detection(message: str, agent_id: str = None) -> dict:
    """Keyword-based fallback intent detection when LLM misclassifies."""
    msg = message.lower().strip()
    
    # Extract horizon if mentioned (e.g. "48h", "72 heures", "24h")
    horizon_match = re.search(r'(\d+)\s*(?:h|heures?|hours?)', msg)
    horizon = int(horizon_match.group(1)) if horizon_match else None
    
    # Planning / Gantt keywords
    planning_kw = ['genere', 'génère', 'générer', 'generer', 'planifi', 'plan de charge',
                   'gantt', 'optimise', 'optimizer', 'lancer le plan', 'créer un plan',
                   'creer un plan', 'lance le plan', 'plan sur', 'charge des navires',
                   'plan de chargement', 'planification', 'generate', 'plan', 'optimize', 'loading plan']
    
    benchmark_kw = ['benchmark', 'comparer', 'comparatif', 'compare les algo', 'compare']
    
    simulation_kw = ['simul', 'panne', 'blocage', 'scénario', 'scenario', 'simulate', 'failure', 'weather', 'alert']
    
    for kw in planning_kw:
        if kw in msg:
            params = {"algo": "greedy", "horizon": horizon or 48, "lambda_pen": 0.8, "data_mode": "LOCAL", "warm_start": True}
            # Detect algo from message
            if any(a in msg for a in ['milp', 'lp', 'linéaire', 'lineaire']): params["algo"] = "milp"
            elif any(a in msg for a in ['genetic', 'génétique', 'genetique', 'ga']): params["algo"] = "genetic"
            elif any(a in msg for a in ['recuit', 'sa', 'simulated annealing']): params["algo"] = "sa"
            elif any(a in msg for a in ['tabou', 'tabu', 'ts']): params["algo"] = "ts"
            return {"intent": "action", "topic": "planification", "action_type": "run_planning", "params": params, "confidence": 0.9}
    
    for kw in benchmark_kw:
        if kw in msg:
            return {"intent": "action", "topic": "planification", "action_type": "run_benchmark", "params": {"horizon": horizon or 48}, "confidence": 0.9}
    
    if agent_id == 'ANL-02':
        for kw in simulation_kw:
            if kw in msg:
                return {"intent": "action", "topic": "planification", "action_type": "run_simulation", "params": {"horizon": horizon or 48}, "confidence": 0.8}
    
    return None  # No fallback match


# ─────────────────────────────────────────────────────────────────────────────
#  STREAMING & SUGGESTIONS HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _stream_groq_tokens(messages, api_key, temperature=0.3, max_tokens=800):
    """Stream tokens from Groq. Falls back to non-streaming on error."""
    if not HAS_GROQ or not api_key:
        result = _call_groq(messages, api_key, temperature, max_tokens)
        if result:
            yield result
        return
    
    models_to_try = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"]
    client = Groq(api_key=api_key)
    
    for model_name in models_to_try:
        try:
            stream = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            had_tokens = False
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    had_tokens = True
                    yield token
            if had_tokens:
                return
        except Exception as e:
            print(f"[STREAM] Groq {model_name} failed: {e}")
            continue
    
    # All Groq streaming failed — non-streaming fallback
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    xai_key = os.getenv("XAI_API_KEY", "")
    result = None
    if gemini_key:
        result = _call_gemini(messages, gemini_key, temperature, max_tokens)
    if not result and xai_key:
        result = _call_xai(messages, xai_key, temperature, max_tokens)
    if result:
        yield result


def _generate_suggestions(user_msg, agent_response, api_key):
    """Generate 3 follow-up questions based on the conversation."""
    prompt = f"""Conversation:
User: {user_msg}
Agent: {agent_response[:400]}

Génère 3 questions de suivi courtes en FRANÇAIS (max 12 mots chacune).
Retourne UNIQUEMENT un JSON array: ["q1", "q2", "q3"]"""
    try:
        result = _call_groq(
            [{"role": "system", "content": "Retourne uniquement un JSON array de 3 strings courtes en français."},
             {"role": "user", "content": prompt}],
            api_key, temperature=0.6, max_tokens=150, fast_mode=True
        )
        text = result.strip()
        if "```" in text:
            for p in text.split("```"):
                p = p.strip()
                if p.startswith("json"): p = p[4:]
                if p.startswith("["): text = p; break
        suggestions = json.loads(text)
        if isinstance(suggestions, list):
            return [str(s) for s in suggestions[:3]]
    except:
        pass
    return []


def _process_action(intent_data):
    """Process an action intent. Returns (action_obj, static_response, action_context)."""
    params = intent_data.get("params", {})
    algo = (params.get("algo") or "greedy").lower()
    action_type = intent_data.get("action_type", "run_planning")
    action_obj = None
    static_response = None
    action_context = ""

    if action_type == "show_cartography":
        static_response = "🗺️ **Cartographie du réseau JPH** — Affichage du plan complet du port de Jorf Lasfar."
        action_obj = {"type": "show_cartography", "params": {}}

    elif action_type == "get_network_path":
        source = params.get("path_source") or "HE01"
        target = params.get("path_target") or "Quai 1N"
        try:
            from core.config import NETWORK_GRAPH
            dist = {node: float('inf') for node in NETWORK_GRAPH}
            prev = {}
            dist[source] = 0
            heap = [(0, source)]
            while heap:
                d, u = heapq.heappop(heap)
                if d > dist[u]: continue
                for v, w in NETWORK_GRAPH.get(u, {}).items():
                    if dist[u] + w < dist[v]:
                        dist[v] = dist[u] + w
                        prev[v] = u
                        heapq.heappush(heap, (dist[v], v))
            path = []
            node = target
            while node in prev:
                path.insert(0, node)
                node = prev[node]
            if node == source:
                path.insert(0, source)
            total_weight = dist.get(target, -1)
            path_str = " → ".join(path) if path else "Aucun chemin trouvé"
            static_response = f"🔍 **Chemin optimal trouvé** : `{source}` → `{target}`\n**Route** : {path_str}\n**Poids total** : {total_weight:.1f}"
            action_obj = {"type": "get_network_path", "params": {"source": source, "target": target, "path": path, "weight": total_weight}}
        except Exception as e:
            static_response = f"🔍 **Recherche de chemin** `{source}` → `{target}` en cours..."
            action_obj = {"type": "get_network_path", "params": {"source": source, "target": target, "path": [], "weight": 0}}

    elif action_type == "get_stock_level":
        product = params.get("stock_product") or "DAP"
        try:
            from core.config import STOCKS_FICTIFS
            matching = [s for s in STOCKS_FICTIFS if product.upper() in s.get('qualite', '').upper()]
            if matching:
                stock_info = matching[0]
                static_response = f"📦 **Stock {product}** — Hall: {stock_info.get('hall', '?')} | Quantité: {stock_info.get('quantite', 0):,}T | Capacité: {stock_info.get('capacite_max', 0):,}T"
                action_obj = {"type": "get_stock_level", "params": {"product": product, "stocks": matching}}
            else:
                static_response = f"📦 Aucun stock trouvé pour **{product}**. Vérifiez le nom du produit."
        except Exception:
            static_response = f"📦 Consultation du stock **{product}** en cours..."
            action_obj = {"type": "get_stock_level", "params": {"product": product, "stocks": []}}

    elif action_type == "get_kpi_dashboard":
        try:
            from db_config import get_client
            sb = get_client()
            kpi_data = []
            axe_filter = params.get("axe_filter")
            indicateur_filter = params.get("indicateur_filter")
            if sb:
                query = sb.table("kpi_axes_2025").select("axe_nom, indicateur, semaine, valeur")
                if axe_filter: query = query.ilike("axe_nom", f"%{axe_filter}%")
                if indicateur_filter: query = query.ilike("indicateur", f"%{indicateur_filter}%")
                res = query.limit(500).execute()
                kpi_data = res.data or []
            action_context = f"[DONNÉES EXTRAITES DE kpi_axes_2025]\n"
            for row in kpi_data[:20]:
                action_context += f"- Axe: {row.get('axe_nom')}, Indicateur: {row.get('indicateur')}, Semaine: {row.get('semaine')}, Valeur: {row.get('valeur')}%\n"
            if not kpi_data: action_context += "Aucune donnée trouvée."
            action_obj = {"type": "get_kpi_dashboard", "params": {"kpi_data": kpi_data, "axe_filter": axe_filter}}
        except Exception as e:
            static_response = f"📊 Erreur lors du chargement des KPI: {str(e)}"
            action_obj = {"type": "get_kpi_dashboard", "params": {"kpi_data": []}}

    elif action_type == "get_pareto_arrets":
        try:
            from db_config import get_client
            sb = get_client()
            arrets_data = []
            axe_filter = params.get("axe_filter")
            if sb:
                query = sb.table("arrets_2025").select("cause, nature, axe, duree_h, niveau1")
                if axe_filter: query = query.ilike("axe", f"%{axe_filter}%")
                res = query.limit(2000).execute()
                arrets_data = res.data or []
            action_context = f"[DONNÉES EXTRAITES DE arrets_2025]\n"
            for row in arrets_data[:20]:
                action_context += f"- Cause: {row.get('cause')}, Nature: {row.get('nature')}, Durée: {row.get('duree_h')}h, Axe: {row.get('axe')}\n"
            if not arrets_data: action_context += "Aucune donnée d'arrêts trouvée."
            action_obj = {"type": "get_pareto_arrets", "params": {"arrets_data": arrets_data}}
        except Exception as e:
            static_response = f"📈 Erreur Pareto: {str(e)}"
            action_obj = {"type": "get_pareto_arrets", "params": {"arrets_data": []}}

    elif action_type == "get_export_dashboard":
        try:
            from db_config import get_client
            sb = get_client()
            export_data = []
            if sb:
                res = sb.table("export_2025").select(
                    "navire, date_bl, tonnage_bl, qualite, famille_qualite, client, destination, valeur_usd, valeur_dh"
                ).limit(500).execute()
                export_data = res.data or []
            n = len(export_data)
            tonnage = sum(r.get("tonnage_bl") or 0 for r in export_data)
            action_context = f"[DONNÉES EXTRAITES DE export_2025]\nTotal: {n} lignes, Tonnage total exporté: {tonnage}T.\n"
            for row in export_data[:10]:
                action_context += f"- Navire: {row.get('navire')}, Qualité: {row.get('qualite')}, Tonnage: {row.get('tonnage_bl')}T, Client: {row.get('client')}\n"
            action_obj = {"type": "get_export_dashboard", "params": {"export_data": export_data}}
        except Exception as e:
            static_response = f"🚢 Erreur Export Dashboard: {str(e)}"
            action_obj = {"type": "get_export_dashboard", "params": {"export_data": []}}

    elif action_type == "get_arrets_axe":
        try:
            from db_config import get_client
            sb = get_client()
            axe_filter = params.get("axe_filter") or ""
            arrets_data = []
            if sb:
                res = sb.table("arrets_2025").select(
                    "date, axe, debut, fin, duree_h, cause, nature, navire, qualite"
                ).ilike("axe", f"%{axe_filter}%").limit(500).execute()
                arrets_data = res.data or []
            total_h = sum(r.get("duree_h") or 0 for r in arrets_data)
            action_context = f"[DONNÉES EXTRAITES DE arrets_2025 pour l'axe {axe_filter}]\nTotal: {len(arrets_data)} arrêts, Durée totale: {total_h:.1f}h.\n"
            for row in arrets_data[:15]:
                action_context += f"- {row.get('date')} | Durée: {row.get('duree_h')}h | Cause: {row.get('cause')}\n"
            action_obj = {"type": "get_arrets_axe", "params": {"arrets_data": arrets_data, "axe_filter": axe_filter}}
        except Exception as e:
            static_response = f"🔍 Erreur: {str(e)}"
            action_obj = {"type": "get_arrets_axe", "params": {"arrets_data": [], "axe_filter": ""}}

    elif action_type == "route_to_agent":
        target = params.get("target_agent") or "OPT-01"
        target_names = {"OPT-01": "Stratège Flux", "ANL-02": "Analyste Fiabilité", "DAT-03": "Le Statisticien", "INF-04": "Ingénieur Infrastructure"}
        target_name = target_names.get(target, target)
        static_response = f"🎯 **Délégation vers {target}** ({target_name}) — Je transfère votre demande à l'agent compétent."
        action_obj = {"type": "route_to_agent", "params": {"target_agent": target}}

    elif action_type == "show_journal":
        static_response = "📋 **Journal Global des Agents** — Voici l'historique complet de toutes les conversations enregistrées."
        action_obj = {"type": "show_journal", "params": {}}

    elif action_type == "launch_roundtable":
        static_response = "🔄 **Table Ronde Lancée** — Interrogation de tous les agents en cours..."
        action_obj = {"type": "launch_roundtable", "params": {}}

    elif action_type == "run_benchmark":
        action_obj = {"type": "run_benchmark", "params": {"algo": algo, "horizon": params.get("horizon") or 48, "lambda_pen": params.get("lambda_pen") or 0.8, "data_mode": params.get("data_mode") or "LOCAL", "warm_start": params.get("hybridization", False)}}
        static_response = f"✅ **Benchmark comparatif** lancé — Algorithmes: Greedy, GA, SA, TS"

    elif action_type == "run_simulation":
        scenario_type = params.get("scenario_type")
        target = params.get("scenario_target")
        action_obj = {"type": "run_simulation", "params": {"scenario_type": scenario_type, "scenario_target": target, "algo": algo, "horizon": params.get("horizon") or 48}}
        static_response = f"🚨 **Simulation** — Scénario `{scenario_type}` sur `{target}`. Recalcul du plan..."

    else:  # Default: run_planning
        action_obj = {"type": "run_planning", "params": {"algo": algo, "horizon": params.get("horizon") or 48, "lambda_pen": params.get("lambda_pen") or 0.8, "data_mode": params.get("data_mode") or "LOCAL", "warm_start": True}}
        static_response = f"✅ **Planification lancée** — Algorithme: `{algo.upper()}` | Horizon: {params.get('horizon') or 48}h"

    return action_obj, static_response, action_context


@router.post("/agent/chat")
def chat(req: ChatRequest):
    api_key = req.groq_api_key or os.getenv("GROQ_API_KEY", "")

    # 1. Detect intent
    intent_result = _call_groq(
        [{"role": "system", "content": INTENT_PROMPT},
         {"role": "user", "content": req.message}],
        api_key, temperature=0.0, max_tokens=256, fast_mode=True
    )

    intent_data = {
        "intent": "question_general", "topic": "general",
        "action_type": None, "params": {}, "confidence": 0.5
    }
    try:
        text = intent_result.strip()
        if "```" in text:
            for p in text.split("```"):
                p = p.strip()
                if p.startswith("json"): p = p[4:]
                if p.startswith("{"): text = p; break
        intent_data = json.loads(text)
    except:
        pass

    # 1b. Keyword-based fallback: override if LLM didn't detect an action
    if intent_data.get("intent") != "action" or not intent_data.get("action_type"):
        fallback = _fallback_intent_detection(req.message, req.agent_id)
        if fallback:
            print(f"[FALLBACK] LLM missed action intent. Keyword fallback: {fallback['action_type']}")
            intent_data = fallback

    intent = intent_data.get("intent", "question_general")
    topic = intent_data.get("topic", "general")

    # 2. If action → we might fetch data and pass it to LLM
    action_obj = None
    action_context = ""
    static_response = None

    if intent == "action":
        params = intent_data.get("params", {})
        algo = (params.get("algo") or "greedy").lower()
        action_type = intent_data.get("action_type", "run_planning")

        # ── INF-04: Show Cartography ──────────────────────────────
        if action_type == "show_cartography":
            static_response = "🗺️ **Cartographie du réseau JPH** — Affichage du plan complet du port de Jorf Lasfar."
            action_obj = {"type": "show_cartography", "params": {}}

        # ── INF-04: Get Network Path (Dijkstra) ───────────────────
        elif action_type == "get_network_path":
            source = params.get("path_source") or "HE01"
            target = params.get("path_target") or "Quai 1N"
            try:
                from core.config import NETWORK_GRAPH
                import heapq
                # Dijkstra on NETWORK_GRAPH
                dist = {node: float('inf') for node in NETWORK_GRAPH}
                prev = {}
                dist[source] = 0
                heap = [(0, source)]
                while heap:
                    d, u = heapq.heappop(heap)
                    if d > dist[u]: continue
                    for v, w in NETWORK_GRAPH.get(u, {}).items():
                        if dist[u] + w < dist[v]:
                            dist[v] = dist[u] + w
                            prev[v] = u
                            heapq.heappush(heap, (dist[v], v))
                # Reconstruct path
                path = []
                node = target
                while node in prev:
                    path.insert(0, node)
                    node = prev[node]
                if node == source:
                    path.insert(0, source)
                total_weight = dist.get(target, -1)
                path_str = " → ".join(path) if path else "Aucun chemin trouvé"
                static_response = f"🔍 **Chemin optimal trouvé** : `{source}` → `{target}`\n**Route** : {path_str}\n**Poids total** : {total_weight:.1f}"
                action_obj = {"type": "get_network_path", "params": {"source": source, "target": target, "path": path, "weight": total_weight}}
            except Exception as e:
                static_response = f"🔍 **Recherche de chemin** `{source}` → `{target}` en cours..."
                action_obj = {"type": "get_network_path", "params": {"source": source, "target": target, "path": [], "weight": 0}}

        # ── INF-04: Get Stock Level ───────────────────────────────
        elif action_type == "get_stock_level":
            product = params.get("stock_product") or "DAP"
            try:
                from core.config import STOCKS_FICTIFS
                matching = [s for s in STOCKS_FICTIFS if product.upper() in s.get('qualite', '').upper()]
                if matching:
                    stock_info = matching[0]
                    static_response = f"📦 **Stock {product}** — Hall: {stock_info.get('hall', '?')} | Quantité: {stock_info.get('quantite', 0):,}T | Capacité: {stock_info.get('capacite_max', 0):,}T"
                    action_obj = {"type": "get_stock_level", "params": {"product": product, "stocks": matching}}
                else:
                    static_response = f"📦 Aucun stock trouvé pour **{product}**. Vérifiez le nom du produit."
            except Exception as e:
                static_response = f"📦 Consultation du stock **{product}** en cours..."
                action_obj = {"type": "get_stock_level", "params": {"product": product, "stocks": []}}

        # ── DAT-03: KPI Dashboard ─────────────────────────────────────
        elif action_type == "get_kpi_dashboard":
            try:
                from db_config import get_client
                sb = get_client()
                kpi_data = []
                axe_filter = params.get("axe_filter")
                indicateur_filter = params.get("indicateur_filter")
                if sb:
                    query = sb.table("kpi_axes_2025").select("axe_nom, indicateur, semaine, valeur")
                    if axe_filter:
                        query = query.ilike("axe_nom", f"%{axe_filter}%")
                    if indicateur_filter:
                        query = query.ilike("indicateur", f"%{indicateur_filter}%")
                    res = query.limit(500).execute()
                    kpi_data = res.data or []
                
                # Context for LLM
                action_context = f"[DONNÉES EXTRAITES DE kpi_axes_2025]\n"
                for row in kpi_data[:20]: # send top 20 to LLM to avoid token limit
                    action_context += f"- Axe: {row.get('axe_nom')}, Indicateur: {row.get('indicateur')}, Semaine: {row.get('semaine')}, Valeur: {row.get('valeur')}%\n"
                if not kpi_data:
                    action_context += "Aucune donnée trouvée pour cette requête."
                
                action_obj = {"type": "get_kpi_dashboard", "params": {"kpi_data": kpi_data, "axe_filter": axe_filter}}
            except Exception as e:
                static_response = f"📊 Erreur lors du chargement des KPI: {str(e)}"
                action_obj = {"type": "get_kpi_dashboard", "params": {"kpi_data": []}}

        # ── DAT-03: Pareto des Arrêts ─────────────────────────────────
        elif action_type == "get_pareto_arrets":
            try:
                from db_config import get_client
                sb = get_client()
                arrets_data = []
                axe_filter = params.get("axe_filter")
                if sb:
                    query = sb.table("arrets_2025").select("cause, nature, axe, duree_h, niveau1")
                    if axe_filter:
                        query = query.ilike("axe", f"%{axe_filter}%")
                    res = query.limit(2000).execute()
                    arrets_data = res.data or []
                
                action_context = f"[DONNÉES EXTRAITES DE arrets_2025]\n"
                for row in arrets_data[:20]:
                    action_context += f"- Cause: {row.get('cause')}, Nature: {row.get('nature')}, Durée: {row.get('duree_h')}h, Axe: {row.get('axe')}\n"
                if not arrets_data:
                    action_context += "Aucune donnée d'arrêts trouvée."
                    
                action_obj = {"type": "get_pareto_arrets", "params": {"arrets_data": arrets_data}}
            except Exception as e:
                static_response = f"📈 Erreur Pareto: {str(e)}"
                action_obj = {"type": "get_pareto_arrets", "params": {"arrets_data": []}}

        # ── DAT-03: Export Dashboard ──────────────────────────────────
        elif action_type == "get_export_dashboard":
            try:
                from db_config import get_client
                sb = get_client()
                export_data = []
                if sb:
                    res = sb.table("export_2025").select(
                        "navire, date_bl, tonnage_bl, qualite, famille_qualite, client, destination, valeur_usd, valeur_dh"
                    ).limit(500).execute()
                    export_data = res.data or []
                
                n = len(export_data)
                tonnage = sum(r.get("tonnage_bl") or 0 for r in export_data)
                action_context = f"[DONNÉES EXTRAITES DE export_2025]\nTotal: {n} lignes, Tonnage total exporté: {tonnage}T.\nQuelques exemples:\n"
                for row in export_data[:10]:
                    action_context += f"- Navire: {row.get('navire')}, Qualité: {row.get('qualite')}, Tonnage: {row.get('tonnage_bl')}T, Client: {row.get('client')}\n"
                
                action_obj = {"type": "get_export_dashboard", "params": {"export_data": export_data}}
            except Exception as e:
                static_response = f"🚢 Erreur Export Dashboard: {str(e)}"
                action_obj = {"type": "get_export_dashboard", "params": {"export_data": []}}

        # ── DAT-03: Arrêts par Axe (filtré) ──────────────────────────
        elif action_type == "get_arrets_axe":
            try:
                from db_config import get_client
                sb = get_client()
                axe_filter = params.get("axe_filter") or ""
                arrets_data = []
                if sb:
                    res = sb.table("arrets_2025").select(
                        "date, axe, debut, fin, duree_h, cause, nature, navire, qualite"
                    ).ilike("axe", f"%{axe_filter}%").limit(500).execute()
                    arrets_data = res.data or []
                
                total_h = sum(r.get("duree_h") or 0 for r in arrets_data)
                action_context = f"[DONNÉES EXTRAITES DE arrets_2025 pour l'axe {axe_filter}]\nTotal: {len(arrets_data)} arrêts, Durée totale: {total_h:.1f}h.\n"
                for row in arrets_data[:15]:
                    action_context += f"- {row.get('date')} | Durée: {row.get('duree_h')}h | Cause: {row.get('cause')}\n"
                
                action_obj = {"type": "get_arrets_axe", "params": {"arrets_data": arrets_data, "axe_filter": axe_filter}}
            except Exception as e:
                static_response = f"🔍 Erreur: {str(e)}"
                action_obj = {"type": "get_arrets_axe", "params": {"arrets_data": [], "axe_filter": ""}}

        # ── ORC-05: Route to Agent (Délégation) ──────────────────
        elif action_type == "route_to_agent":
            target = params.get("target_agent") or "OPT-01"
            target_names = {"OPT-01": "Stratège Flux", "ANL-02": "Analyste Fiabilité", "DAT-03": "Le Statisticien", "INF-04": "Ingénieur Infrastructure"}
            target_name = target_names.get(target, target)
            static_response = f"🎯 **Délégation vers {target}** ({target_name}) — Je transfère votre demande à l'agent compétent. Ouverture du canal de communication..."
            action_obj = {"type": "route_to_agent", "params": {"target_agent": target}}

        # ── ORC-05: Show Journal ───────────────────────────────────
        elif action_type == "show_journal":
            static_response = "📋 **Journal Global des Agents** — Voici l'historique complet de toutes les conversations enregistrées."
            action_obj = {"type": "show_journal", "params": {}}

        # ── ORC-05: Launch Roundtable ──────────────────────────────
        elif action_type == "launch_roundtable":
            static_response = "🔄 **Table Ronde Lancée** — Interrogation de tous les agents en cours... Veuillez patienter."
            action_obj = {"type": "launch_roundtable", "params": {}}

        # ── Standard planning/benchmark/simulation actions ─────────
        elif action_type == "run_benchmark":
            action_obj = {
                "type": "run_benchmark",
                "params": {
                    "algo": algo,
                    "horizon": params.get("horizon") or 48,
                    "lambda_pen": params.get("lambda_pen") or 0.8,
                    "data_mode": params.get("data_mode") or "LOCAL",
                    "warm_start": params.get("hybridization", False)
                }
            }
            static_response = f"✅ **Comparative Benchmark** launched — Algorithms: Greedy, GA, SA, TS\nMetaheuristics | Auto-tune: {'Yes' if params.get('autotune') else 'No'} | Hybridization: {'Yes' if params.get('hybridization') else 'No'}"
        elif action_type == "run_simulation":
            scenario_type = params.get("scenario_type")
            target = params.get("scenario_target")
            action_obj = {
                "type": "run_simulation",
                "params": {
                    "scenario_type": scenario_type,
                    "scenario_target": target,
                    "algo": algo,
                    "horizon": params.get("horizon") or 48
                }
            }
            static_response = f"🚨 **Reliability Alert (ANL-02)** — Simulation of a critical scenario (`{scenario_type}`) on `{target}`. Recalculating plan..."
        else:
            action_obj = {
                "type": "run_planning",
                "params": {
                    "algo": algo,
                    "horizon": params.get("horizon") or 48,
                    "lambda_pen": params.get("lambda_pen") or 0.8,
                    "data_mode": params.get("data_mode") or "LOCAL",
                    "warm_start": True
                }
            }
            static_response = f"✅ **Planning Launched** — Algorithm: `{algo.upper()}` | Horizon: {params.get('horizon') or 48}h | λ={params.get('lambda_pen') or 0.8} | Mode: {params.get('data_mode') or 'LOCAL'}"

        if static_response:
            return {
                "response": static_response,
                "intent": intent_data,
                "action": action_obj
            }


    # 3. Build expert response
    kb_context = get_relevant_kb(topic)
    metrics_text = ""
    if req.metrics:
        m = req.metrics
        metrics_text = (f"\nMétriques: Tonnage={m.get('total_charge',0):,}T, "
                       f"Lots={m.get('lots_planifies',0)}/{m.get('lots_total',0)}, "
                       f"Score={m.get('score',0):.0f}")

    # Set system prompt based on agent_id
    persona_intro = PERSONAS.get(req.agent_id, EXPERT_SYSTEM)
    system = f"{persona_intro}\nReply in ENGLISH, clearly, structurally, and professionally."
    
    if kb_context:
        system += f"\n\n--- DONNÉES JPH ---\n{kb_context}"
    if action_context:
        system += f"\n\n--- DONNÉES BASE DE DONNÉES EXTRAITES POUR CETTE REQUÊTE ---\n{action_context}\nUtilise ces données exactes pour formuler ta réponse au lieu d'inventer des chiffres."

    messages = [{"role": "system", "content": system}]
    for msg in req.history[-10:]:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": req.message})

    response = _call_groq(messages, api_key, temperature=0.4, max_tokens=800)

    return {
        "response": response,
        "intent": intent_data,
        "action": action_obj
    }

# ─────────────────────────────────────────────────────────────────────────────
#  SSE STREAMING CHAT ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

def _generate_suggestions(user_msg, agent_reply, api_key):
    """Generate 3 short follow-up questions based on the context."""
    if not HAS_GROQ or not api_key:
        return []
    prompt = (
        f"Generate 3 short and relevant follow-up questions (maximum 8 words per question) "
        f"that the user might ask after this exchange.\n"
        f"User: {user_msg}\nAgent: {agent_reply}\n"
        f"Reply ONLY with a JSON array of strings. No markdown."
    )
    try:
        res = _call_groq([{"role": "user", "content": prompt}], api_key, temperature=0.7, max_tokens=100, fast_mode=True)
        text = res.strip()
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            suggestions = json.loads(match.group(0))
            if isinstance(suggestions, list):
                return [str(s)[:50] for s in suggestions][:3]
    except Exception as e:
        print("[SUGGESTIONS ERROR]", e)
    return []

@router.post("/agent/chat/stream")
def chat_stream(req: ChatRequest):
    """SSE streaming version of /agent/chat — streams tokens in real-time."""
    api_key = req.groq_api_key or os.getenv("GROQ_API_KEY", "")

    def generate():
        # 1. Detect intent
        intent_result = _call_groq(
            [{"role": "system", "content": INTENT_PROMPT},
             {"role": "user", "content": req.message}],
            api_key, temperature=0.0, max_tokens=256, fast_mode=True
        )

        intent_data = {
            "intent": "question_general", "topic": "general",
            "action_type": None, "params": {}, "confidence": 0.5
        }
        try:
            text = intent_result.strip()
            if "```" in text:
                for p in text.split("```"):
                    p = p.strip()
                    if p.startswith("json"): p = p[4:]
                    if p.startswith("{"): text = p; break
            intent_data = json.loads(text)
        except:
            pass

        # Keyword fallback
        if intent_data.get("intent") != "action" or not intent_data.get("action_type"):
            fallback = _fallback_intent_detection(req.message, req.agent_id)
            if fallback:
                print(f"[STREAM-FALLBACK] Keyword override: {fallback['action_type']}")
                intent_data = fallback

        yield f"event: intent\ndata: {json.dumps(intent_data)}\n\n"

        intent = intent_data.get("intent", "question_general")
        topic = intent_data.get("topic", "general")

        # 2. Handle actions
        action_context = ""
        if intent == "action":
            action_obj, static_response, action_context = _process_action(intent_data)

            if static_response:
                action_event = {
                    "type": intent_data.get("action_type"),
                    "params": action_obj.get("params", {}) if action_obj else {},
                    "response": static_response
                }
                yield f"event: action\ndata: {json.dumps(action_event, default=str)}\n\n"
                yield f"event: done\ndata: {{}}\n\n"
                return

        # 3. Stream expert response
        kb_context = get_relevant_kb(topic)
        persona_intro = PERSONAS.get(req.agent_id, EXPERT_SYSTEM)
        system = f"{persona_intro}\nReply in ENGLISH, clearly, structurally, and professionally."
        if kb_context:
            system += f"\n\n--- DONNÉES JPH ---\n{kb_context}"
        if action_context:
            system += f"\n\n--- DONNÉES BASE DE DONNÉES ---\n{action_context}\nUtilise ces données exactes pour formuler ta réponse."

        messages_list = [{"role": "system", "content": system}]
        for msg in req.history[-10:]:
            messages_list.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages_list.append({"role": "user", "content": req.message})

        full_response = ""
        for token in _stream_groq_tokens(messages_list, api_key, temperature=0.4, max_tokens=800):
            full_response += token
            yield f"event: token\ndata: {json.dumps({'t': token})}\n\n"

        # If DAT-03 action with context, also send the action object
        if intent == "action" and action_context:
            action_obj, _, _ = _process_action(intent_data)
            if action_obj:
                yield f"event: action\ndata: {json.dumps({'type': action_obj.get('type'), 'params': action_obj.get('params', {}), 'response': ''}, default=str)}\n\n"

        # 4. Generate suggestions
        try:
            suggestions = _generate_suggestions(req.message, full_response, api_key)
            if suggestions:
                yield f"event: suggestions\ndata: {json.dumps(suggestions)}\n\n"
        except Exception as e:
            print(f"[SUGGESTIONS] Error: {e}")

        yield f"event: done\ndata: {{}}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
    )


# ─────────────────────────────────────────────────────────────────────────────
#  FEEDBACK & HISTORY ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/agent/feedback")
def save_feedback(req: FeedbackRequest):
    """Save user feedback (thumbs up/down) for an agent response."""
    try:
        sb = get_client()
        if sb:
            sb.table("agent_feedback").insert({
                "agent_id": req.agent_id,
                "message_text": req.message_text[:500],
                "feedback": req.feedback
            }).execute()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/agent/history/save")
def save_history(req: HistorySaveRequest):
    """Save conversation history to Supabase."""
    try:
        sb = get_client()
        if not sb:
            return {"success": True, "note": "Supabase not configured"}
        rows = []
        for msg in req.messages:
            rows.append({
                "agent_id": req.agent_id,
                "role": msg.get("role", "user"),
                "content": (msg.get("content", ""))[:2000],
                "session_id": req.session_id
            })
        if rows:
            sb.table("agent_conversations").insert(rows).execute()
        return {"success": True, "saved": len(rows)}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/agent/history/{agent_id}")
def get_history(agent_id: str, limit: int = 50):
    """Load recent conversation history from Supabase."""
    try:
        sb = get_client()
        if not sb:
            return {"messages": []}
        res = sb.table("agent_conversations").select("*").eq("agent_id", agent_id).order("created_at", desc=True).limit(limit).execute()
        messages = list(reversed(res.data or []))
        return {"messages": messages}
    except Exception as e:
        return {"messages": [], "error": str(e)}


# ---------------------------------------------------------
# Team & Agent Assignments Management (Supabase)
# ---------------------------------------------------------
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from db_config import get_client

class TeamMember(BaseModel):
    name: str
    role: str

class AgentAssignment(BaseModel):
    agent_id: str
    operator_name: str

@router.get("/agent/team")
def get_team_members():
    sb = get_client()
    if not sb:
        return {"error": "Supabase not configured", "team": []}
    try:
        res = sb.table("team_members").select("*").execute()
        return {"team": res.data}
    except Exception as e:
        return {"error": str(e), "team": []}

@router.post("/agent/team")
def add_team_member(member: TeamMember):
    sb = get_client()
    if not sb:
        return {"error": "Supabase not configured"}
    try:
        res = sb.table("team_members").insert({"name": member.name, "role": member.role}).execute()
        return {"success": True, "data": res.data[0] if res.data else None}
    except Exception as e:
        return {"error": str(e)}

@router.get("/agent/assignments")
def get_agent_assignments():
    sb = get_client()
    if not sb:
        return {"error": "Supabase not configured", "assignments": []}
    try:
        res = sb.table("agent_assignments").select("*").execute()
        return {"assignments": res.data}
    except Exception as e:
        return {"error": str(e), "assignments": []}

@router.post("/agent/assignments")
def update_agent_assignment(assignment: AgentAssignment):
    sb = get_client()
    if not sb:
        return {"error": "Supabase not configured"}
    try:
        res = sb.table("agent_assignments").upsert(
            {"agent_id": assignment.agent_id, "operator_name": assignment.operator_name}
        ).execute()
        return {"success": True, "data": res.data[0] if res.data else None}
    except Exception as e:
        return {"error": str(e)}
