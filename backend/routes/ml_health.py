"""
ml_health.py — ML anomaly detection routes
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from ml_anomalies import (
    get_current_axes_health, get_axe_insight, get_ml_status,
    get_risk_history, get_action_plan, generate_mock_features, predict_anomaly
)

router = APIRouter()

from datetime import datetime, timezone


class FeedbackPayload(BaseModel):
    axe: str
    feedback_type: str   # "validated" | "false_alarm"
    probability: float
    timestamp: Optional[str] = None


def get_real_axes_health():
    from db_config import get_client
    sb = get_client()
    if not sb:
        return get_current_axes_health(), {}

    res = sb.table("anomalies_historique").select("*").execute()
    data = res.data or []

    health_status = {}
    features_map = {}
    axes = ["Axe1", "Axe2", "Axe3", "TB1", "TB2", "TB3"]
    now = datetime.now(timezone.utc)

    for axe in axes:
        axe_data = [d for d in data if d.get("equipement_nom") == axe]
        nb_arrets = len(axe_data)

        feats = __import__('ml_anomalies').generate_mock_features(axe, force_anomaly=False)

        if nb_arrets > 0:
            arrets_3j = [d for d in axe_data if (now - datetime.fromisoformat(d["date_detection"].replace("Z", "+00:00"))).days <= 3]
            arrets_7j = [d for d in axe_data if (now - datetime.fromisoformat(d["date_detection"].replace("Z", "+00:00"))).days <= 7]

            last_date_str = max(d["date_detection"] for d in axe_data)
            last_date = datetime.fromisoformat(last_date_str.replace("Z", "+00:00"))

            feats["nb_arrets_total"] = nb_arrets
            feats["roll_3j_nb_arrets"] = len(arrets_3j)
            feats["roll_7j_nb_arrets"] = len(arrets_7j)
            feats["duree_depuis_last_anomalie"] = (now - last_date).total_seconds() / 3600
            feats["cumul_arrets_7j"] = len(arrets_7j) * 2
            feats["taux_disponibilite"] = max(0.4, 1.0 - (len(arrets_7j) * 0.05))

            if len(arrets_3j) > 2:
                feats["pente_arrets_3j"] = 2.0

        res_pred = __import__('ml_anomalies').predict_anomaly(feats)
        health_status[axe] = res_pred
        features_map[axe] = feats

    return health_status, features_map


@router.get("/ml/health")
def get_health(data_mode: str = "LOCAL", force_anomaly_on: Optional[str] = Query(None)):
    force_list = force_anomaly_on.split(",") if force_anomaly_on else []

    features_map = {}
    if data_mode == "REAL":
        health, features_map = get_real_axes_health()
    else:
        axes = ["Axe1", "Axe2", "Axe3", "TB1", "TB2", "TB3"]
        health = {}
        for axe in axes:
            is_bad = bool(force_list and axe in force_list)
            feats = generate_mock_features(axe, force_anomaly=is_bad)
            features_map[axe] = feats
            health[axe] = predict_anomaly(feats)

    result = {}
    for axe, res in health.items():
        feats = features_map.get(axe)
        prob = res.get("probability", 0)
        result[axe] = {
            **res,
            "insight": get_axe_insight(axe, res, feats),
            "risk_history": get_risk_history(axe, prob),
        }

    anomalies = [a for a, r in health.items() if r.get("is_anomaly")]
    return {
        "axes": result,
        "summary": {
            "total_axes": len(health),
            "active_anomalies": len(anomalies),
            "status": "OPTIMAL" if not anomalies else "ALERT",
            "model_loaded": get_ml_status(),
            "action_plan": get_action_plan(health),
        }
    }


@router.post("/ml/feedback")
def submit_feedback(payload: FeedbackPayload):
    """Human-in-the-loop: Enregistre le retour opérateur (validé / fausse alerte)."""
    try:
        from db_config import get_client
        sb = get_client()
        ts = payload.timestamp or datetime.now(timezone.utc).isoformat()

        if sb:
            sb.table("ml_feedback").insert({
                "axe": payload.axe,
                "feedback_type": payload.feedback_type,
                "probability": payload.probability,
                "created_at": ts,
            }).execute()

        return {
            "status": "ok",
            "message": f"Feedback '{payload.feedback_type}' enregistré pour {payload.axe}.",
            "timestamp": ts,
        }
    except Exception as e:
        # Non-blocking: retourne quand même un succès côté UI
        return {"status": "ok", "message": f"Feedback reçu (DB non disponible: {str(e)})"}
