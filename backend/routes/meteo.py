"""
meteo.py — Meteo API routes
"""
from fastapi import APIRouter, Query
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from meteo_api import (get_forecast_48h, forecast_to_meteo_vector,
                       get_meteo_summary, get_demo_meteo_vector, get_current_weather)

router = APIRouter()


@router.get("/meteo")
def get_meteo(source: str = Query("favorable"), horizon: int = Query(48)):
    if source == "api":
        forecasts = get_forecast_48h()
        if forecasts:
            vector = forecast_to_meteo_vector(forecasts, horizon)
            summary = get_meteo_summary(forecasts)
            return {"vector": vector, "summary": summary, "source": "api"}
        else:
            return {"vector": [1]*horizon, "summary": {"status":"Indisponible"}, "source": "fallback"}
    elif source == "perturbe":
        return {"vector": get_demo_meteo_vector("perturbe", horizon), "summary": {"status":"Perturbé"}, "source": "demo"}
    elif source == "tempete":
        return {"vector": get_demo_meteo_vector("tempete", horizon), "summary": {"status":"Tempête"}, "source": "demo"}
    else:
        return {"vector": [1]*horizon, "summary": {"status":"Favorable"}, "source": "demo"}


@router.get("/meteo/current")
def current_weather():
    data = get_current_weather()
    if data:
        main = data.get("main", {})
        wind = data.get("wind", {})
        return {
            "temp": main.get("temp"),
            "wind_kmh": round(wind.get("speed", 0) * 3.6, 1),
            "rain_mm": data.get("rain", {}).get("1h", 0),
            "description": data.get("weather", [{}])[0].get("description", ""),
        }
    return {"temp": None, "wind_kmh": None, "rain_mm": 0, "description": "Indisponible"}
@router.get("/meteo/weekly")
def get_meteo_weekly():
    from meteo_api import get_forecast_weekly
    forecasts = get_forecast_weekly()
    return {"forecasts": forecasts}
