"""
main.py — FastAPI entry point for AI Loading Planner Backend
"""
import sys
import os

# Add parent directory to path so we can import existing modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from core.ws_manager import manager

from routes.planning import router as planning_router
from routes.meteo import router as meteo_router
from routes.ml_health import router as ml_router
from routes.agent import router as agent_router
from routes.infra import router as infra_router
from routes.vessels import router as vessels_router
from routes.export import router as export_router
from routes.ingestion import router as ingestion_router
from routes.dat03_feed import router as dat03_router
app = FastAPI(
    title="AI Loading Planner — OCP Jorf Lasfar",
    version="4.1",
    description="Backend API for port loading optimization"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(planning_router, prefix="/api", tags=["Planning"])
app.include_router(meteo_router,    prefix="/api", tags=["Meteo"])
app.include_router(ml_router,       prefix="/api", tags=["ML Health"])
app.include_router(agent_router,    prefix="/api", tags=["Agent IA"])
app.include_router(infra_router,    prefix="/api", tags=["Infrastructure"])
app.include_router(vessels_router,  prefix="/api", tags=["Vessels"])
app.include_router(export_router,   prefix="/api", tags=["Export"])
app.include_router(ingestion_router, prefix="/api", tags=["Ingestion"])
app.include_router(dat03_router,    prefix="/api", tags=["DAT-03 Analytics"])

@app.get("/")
def root():
    return {"status": "online", "app": "AI Loading Planner", "version": "4.1"}

@app.websocket("/api/ws/logs")
async def websocket_logs_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
