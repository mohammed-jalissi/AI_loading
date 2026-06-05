import asyncio
import json
from typing import List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

    async def broadcast_json(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                pass

    def broadcast_sync(self, message: str):
        """Helper to broadcast from a synchronous thread"""
        try:
            loop = asyncio.get_running_loop()
            asyncio.run_coroutine_threadsafe(self.broadcast(message), loop)
        except RuntimeError:
            pass # No running event loop

manager = ConnectionManager()
