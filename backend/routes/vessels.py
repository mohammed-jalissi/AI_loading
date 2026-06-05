"""
vessels.py — Vessel CRUD routes
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from core.config import NAVIRES_FICTIFS

router = APIRouter()

# In-memory store for custom vessels (session-like)
_custom_vessels = []


class VesselLot(BaseModel):
    qualite: str
    td: int


class VesselCreate(BaseModel):
    nom: str
    arrivee: int = 0
    priorite: int = 2
    laytime: float = 40.0
    demurrage_rate: float = 1000.0
    lots: list[VesselLot]


@router.get("/vessels")
def list_vessels(data_mode: str = "LOCAL"):
    if data_mode == "REAL":
        from routes.planning import get_real_data
        navires, _ = get_real_data()
        return {"default": navires, "custom": _custom_vessels}
    return {"default": NAVIRES_FICTIFS, "custom": _custom_vessels}


@router.post("/vessels")
def add_vessel(vessel: VesselCreate):
    entry = vessel.model_dump()
    entry["lots"] = [lot.model_dump() for lot in vessel.lots]
    _custom_vessels.append(entry)
    return {"status": "ok", "vessel": entry, "total_custom": len(_custom_vessels)}


@router.delete("/vessels/custom")
def clear_custom():
    _custom_vessels.clear()
    return {"status": "cleared"}
