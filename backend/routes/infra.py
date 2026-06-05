"""
infra.py — Infrastructure routes (stocks, axes, quais, network)
"""
from fastapi import APIRouter, Query
from typing import Optional
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.config import (
    QUAIS, ALL_AXES, PORTIQUES, AXES_P, QUAI_POSTE, QUALITES, QUALITE_HALLS,
    STOCKS_FICTIFS, HALLS_JLS, HALLS_JLN, CELL_STYLES
)
import jph_network

router = APIRouter()


@router.get("/infra/config")
def get_config():
    return {
        "quais": QUAIS,
        "axes": {k: {"cadence": v["cadence"], "halls": v["halls"]} for k, v in ALL_AXES.items()},
        "portiques": PORTIQUES,
        "axes_p": AXES_P,
        "quai_poste": QUAI_POSTE,
        "qualites": QUALITES,
        "qualite_halls": QUALITE_HALLS,
        "halls_jls": HALLS_JLS,
        "halls_jln": HALLS_JLN,
        "cell_styles": CELL_STYLES,
    }


from pydantic import BaseModel

class AddStockRequest(BaseModel):
    hall: str
    qualite: str
    quantite: int

@router.get("/infra/stocks")
def get_stocks(data_mode: str = "LOCAL"):
    if data_mode == "REAL":
        from routes.planning import get_real_data
        _, stocks = get_real_data()
        return stocks
    return STOCKS_FICTIFS

@router.post("/infra/stocks/add")
def add_stock(req: AddStockRequest):
    if req.hall in STOCKS_FICTIFS:
        if req.qualite in STOCKS_FICTIFS[req.hall]:
            STOCKS_FICTIFS[req.hall][req.qualite] += req.quantite
        else:
            STOCKS_FICTIFS[req.hall][req.qualite] = req.quantite
    else:
        STOCKS_FICTIFS[req.hall] = {req.qualite: req.quantite}
    return {"status": "success", "new_total": STOCKS_FICTIFS[req.hall][req.qualite]}


@router.get("/infra/axes")
def get_axes():
    return {k: {"cadence": v["cadence"], "halls": v["halls"]} for k, v in ALL_AXES.items()}


@router.get("/infra/network/path")
def get_network_path(source: str = Query(...), target: str = Query(...)):
    result = jph_network.find_optimal_path(source, target)
    if result["found"]:
        nodes_with_categories = []
        for node in result["path"]:
            nodes_with_categories.append({
                "name": node,
                "category": jph_network.get_node_category(node)
            })
        result["nodes_detail"] = nodes_with_categories
    return result
