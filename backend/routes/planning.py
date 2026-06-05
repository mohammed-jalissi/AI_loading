"""
planning.py — Routes for scheduling (Greedy, GA, MILP)
"""
import time
import asyncio
import concurrent.futures
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from core.ws_manager import manager
from core.scheduler import run_scheduler, run_genetic_algorithm, run_simulated_annealing, run_tabu_search
from core.milp_scheduler import run_milp
from core.config import NAVIRES_FICTIFS, STOCKS_FICTIFS, QUAIS, PHYSICAL_TO_LOGICAL_AXIS
import optuna
import logging
import copy

def translate_axes_health(axes_health: dict) -> dict:
    if not axes_health:
        return axes_health
    translated = {}
    for key, val in axes_health.items():
        if key in PHYSICAL_TO_LOGICAL_AXIS:
            for logical_axe in PHYSICAL_TO_LOGICAL_AXIS[key]:
                # If a logical axe is mapped by multiple broken physical conveyors, keep the worst probability
                if logical_axe in translated:
                    translated[logical_axe]["probability"] = max(translated[logical_axe].get("probability", 0), val.get("probability", 0))
                    translated[logical_axe]["is_anomaly"] = translated[logical_axe].get("is_anomaly", 0) or val.get("is_anomaly", 0)
                else:
                    translated[logical_axe] = dict(val)
        else:
            translated[key] = dict(val)
    return translated

optuna.logging.set_verbosity(optuna.logging.WARNING)
router = APIRouter()
process_pool = concurrent.futures.ProcessPoolExecutor(max_workers=4)

def get_real_data():
    try:
        from db_config import get_navires, get_all_stocks
        db_navires = get_navires()
        real_navires = []
        if db_navires:
            for n in db_navires:
                lots = sorted(n.get("lots", []), key=lambda x: x.get("ordre_lot", 1))
                formatted_lots = [{"qualite": l["qualite"], "td": l["tonnage_declare"]} for l in lots]
                real_navires.append({
                    "nom": n["nom"],
                    "arrivee": n.get("heure_arrivee_relative", 0),
                    "priorite": n.get("priorite", 2),
                    "laytime": float(n.get("laytime", 40.0) or 40.0),
                    "demurrage_rate": float(n.get("demurrage_rate", 1000.0) or 1000.0),
                    "lots": formatted_lots
                })
            
        db_stocks = get_all_stocks()
        real_stocks = {}
        if db_stocks:
            for s in db_stocks:
                h = s["hall"]
                q = s["qualite"]
                amt = s["quantite"]
                if h not in real_stocks:
                    real_stocks[h] = {}
                real_stocks[h][q] = float(amt or 0)
        return real_navires, real_stocks
    except Exception as e:
        print(f"Error fetching real data: {e}")
        return [], {}

router = APIRouter()
process_pool = concurrent.futures.ProcessPoolExecutor(max_workers=4)


class PlanRequest(BaseModel):
    algo: str = "greedy"
    horizon: int = 48
    lambda_pen: float = 0.8
    meteo: Optional[list] = None
    navires: Optional[list] = None
    data_mode: str = "LOCAL"
    # GA params
    n_gen: int = 20
    pop_size: int = 20
    # SA params
    sa_iter: int = 500
    sa_temp: float = 1000.0
    # TS params
    ts_iter: int = 100
    ts_tabu_size: int = 10
    # ML health
    axes_health: Optional[dict] = None
    weather_alerts: Optional[list] = None
    quality_shortages: Optional[list] = None
    # Hybridization / Seeding
    warm_start: bool = True


@router.post("/plan")
async def generate_plan(req: PlanRequest):
    if req.data_mode == "REAL":
        real_navires, stocks_init = get_real_data()
        navires = req.navires or real_navires
    else:
        navires = req.navires or NAVIRES_FICTIFS
        stocks_init = STOCKS_FICTIFS
        
    meteo = req.meteo or [1] * req.horizon
    t0 = time.time()

    await manager.broadcast(f"> [{req.algo.upper()}] Démarrage de l'optimisation...")

    translated_health = translate_axes_health(req.axes_health)

    if req.algo in ("milp", "lp"):
        all_lots, metrics = await asyncio.to_thread(
            run_milp,
            navires=navires,
            T=req.horizon,
            lambda_pen=req.lambda_pen,
            meteo=meteo,
            stocks_init=stocks_init,
            axes_health=translated_health
        )
        metrics["algo_used"] = "MILP (Optimal)"
        metrics["fitness_history"] = []
    elif req.algo in ("genetique", "genetic", "ga", "pareto_ga"):
        all_lots, metrics, fitness_history = await asyncio.to_thread(
            run_genetic_algorithm,
            navires=navires,
            n_gen=req.n_gen,
            pop_size=req.pop_size,
            T=req.horizon,
            lambda_pen=req.lambda_pen,
            meteo=meteo,
            stocks_init=stocks_init,
            axes_health=translated_health,
            weather_alerts=req.weather_alerts,
            quality_shortages=req.quality_shortages,
            warm_start=req.warm_start
        )
        metrics["algo_used"] = f"Pareto GA (pop={req.pop_size}, gen={req.n_gen}, hybrid={req.warm_start})"
        metrics["fitness_history"] = fitness_history
    elif req.algo in ("sa", "recuit", "simulated_annealing"):
        all_lots, metrics, fitness_history = await asyncio.to_thread(
            run_simulated_annealing,
            navires=navires,
            max_iter=req.sa_iter,
            init_temp=req.sa_temp,
            T=req.horizon,
            lambda_pen=req.lambda_pen,
            meteo=meteo,
            stocks_init=stocks_init,
            axes_health=translated_health,
            weather_alerts=req.weather_alerts,
            quality_shortages=req.quality_shortages,
            warm_start=req.warm_start
        )
        metrics["algo_used"] = f"Simulated Annealing (iter={req.sa_iter}, hybrid={req.warm_start})"
        metrics["fitness_history"] = fitness_history
    elif req.algo in ("ts", "tabou", "tabu", "tabu_search"):
        all_lots, metrics, fitness_history = await asyncio.to_thread(
            run_tabu_search,
            navires=navires,
            max_iter=req.ts_iter,
            tabu_size=req.ts_tabu_size,
            n_neighbors=5,
            T=req.horizon,
            lambda_pen=req.lambda_pen,
            meteo=meteo,
            stocks_init=stocks_init,
            axes_health=translated_health,
            weather_alerts=req.weather_alerts,
            quality_shortages=req.quality_shortages,
            warm_start=req.warm_start
        )
        metrics["algo_used"] = f"Tabu Search (iter={req.ts_iter}, size={req.ts_tabu_size}, hybrid={req.warm_start})"
        metrics["fitness_history"] = fitness_history
    else:
        all_lots, metrics = await asyncio.to_thread(
            run_scheduler,
            navires=navires,
            T=req.horizon,
            lambda_pen=req.lambda_pen,
            meteo=meteo,
            stocks_init=stocks_init,
            axes_health=translated_health,
            weather_alerts=req.weather_alerts,
            quality_shortages=req.quality_shortages
        )
        metrics["algo_used"] = "Greedy"
        metrics["fitness_history"] = []

    await manager.broadcast(f"> [{req.algo.upper()}] Résolution terminée avec succès.")

    metrics["cpu_time"] = round(time.time() - t0, 4)

    # Convert timeline keys from int to str for JSON
    for lot in all_lots:
        if "timeline" in lot:
            lot["timeline"] = {str(k): v for k, v in lot["timeline"].items()}

    return {"all_lots": all_lots, "metrics": metrics}


@router.post("/benchmark")
def run_scientific_benchmark(req: PlanRequest):
    if req.data_mode == "REAL":
        real_navires, stocks_init = get_real_data()
        navires = req.navires or real_navires
    else:
        navires = req.navires or NAVIRES_FICTIFS
        stocks_init = STOCKS_FICTIFS
        
    meteo = req.meteo or [1] * req.horizon
    results = []

    # Liste des algos à tester
    algos = [
        {"id": "greedy", "name": "Greedy"},
        {"id": "genetic", "name": "Genetic Algorithm"},
        {"id": "sa", "name": "Simulated Annealing"},
        {"id": "ts", "name": "Tabu Search"}
    ]

    for algo_info in algos:
        t0 = time.time()
        if algo_info["id"] == "greedy":
            all_lots, metrics = run_scheduler(navires, T=req.horizon, lambda_pen=req.lambda_pen, meteo=meteo, stocks_init=stocks_init, axes_health=translate_axes_health(req.axes_health), weather_alerts=req.weather_alerts, quality_shortages=req.quality_shortages)
            metrics["fitness_history"] = []
        elif algo_info["id"] == "genetic":
            all_lots, metrics, history = run_genetic_algorithm(navires, n_gen=30, pop_size=20, T=req.horizon, lambda_pen=req.lambda_pen, meteo=meteo, stocks_init=stocks_init, axes_health=translate_axes_health(req.axes_health), weather_alerts=req.weather_alerts, quality_shortages=req.quality_shortages, warm_start=req.warm_start)
            metrics["fitness_history"] = history
        elif algo_info["id"] == "sa":
            all_lots, metrics, history = run_simulated_annealing(
                navires, max_iter=req.sa_iter, init_temp=req.sa_temp,
                T=req.horizon, lambda_pen=req.lambda_pen, meteo=meteo,
                stocks_init=stocks_init, axes_health=translate_axes_health(req.axes_health),
                weather_alerts=req.weather_alerts, quality_shortages=req.quality_shortages,
                warm_start=req.warm_start
            )
            metrics["fitness_history"] = history
        elif algo_info["id"] == "ts":
            all_lots, metrics, history = run_tabu_search(
                navires, max_iter=req.ts_iter, tabu_size=req.ts_tabu_size,
                n_neighbors=10, T=req.horizon, lambda_pen=req.lambda_pen,
                meteo=meteo, stocks_init=stocks_init, axes_health=translate_axes_health(req.axes_health),
                weather_alerts=req.weather_alerts, quality_shortages=req.quality_shortages,
                warm_start=req.warm_start
            )
            metrics["fitness_history"] = history
        else:
            all_lots, metrics = [], {}
            metrics["fitness_history"] = []

        cpu_time = round(time.time() - t0, 4)
        metrics["cpu_time"] = cpu_time
        metrics["algo_name"] = algo_info["name"]
        metrics["algo_id"] = algo_info["id"]

        metrics = compute_scientific_kpis(all_lots, metrics, req.horizon)

        results.append(metrics)

    return {"results": results}


def compute_scientific_kpis(all_lots, metrics, horizon):
    sched_lots = [l for l in all_lots if l.get("scheduled")]

    # 1. Nombre de navires terminés (unique vessels fully loaded)
    vessel_lots = {}
    for l in all_lots:
        v = l["navire"]
        if v not in vessel_lots:
            vessel_lots[v] = {"total_td": 0, "total_charged": 0}
        vessel_lots[v]["total_td"] += l.get("td", 0)
        vessel_lots[v]["total_charged"] += l.get("td_charged", 0)

    navires_termines = sum(
        1 for v in vessel_lots.values()
        if v["total_td"] > 0 and v["total_charged"] >= v["total_td"] * 0.95
    )
    metrics["navires_termines"] = navires_termines
    metrics["navires_total_count"] = len(vessel_lots)

    # 2. Temps d'attente moyen (h) per vessel
    total_wait = metrics.get("total_attente", 0)
    n_vessels = max(len(vessel_lots), 1)
    metrics["avg_wait_per_vessel"] = round(total_wait / n_vessels, 2)

    # 3. Taux d'occupation des quais (%)
    total_busy_hours = 0
    for l in sched_lots:
        load_start = l.get("h_load_start", 0)
        cte_end = l.get("h_cte_end", 0)
        total_busy_hours += max(0, cte_end - load_start)
    
    n_quais_actual = len(QUAIS)
    quay_capacity = n_quais_actual * horizon
    metrics["quay_occupancy"] = round((total_busy_hours / max(quay_capacity, 1)) * 100, 1)

    # 4. Risque opérationnel normalisé (0-100)
    raw_risk = metrics.get("total_risk", 0)
    n_sched = max(len(sched_lots), 1)
    metrics["risk_normalized"] = round((raw_risk / n_sched) * 100, 2) if raw_risk > 0 else 0.0

    return metrics


@router.post("/benchmark/single")
async def run_single_benchmark(req: PlanRequest):
    if req.data_mode == "REAL":
        real_navires, stocks_init = get_real_data()
        navires = req.navires or real_navires
    else:
        navires = req.navires or NAVIRES_FICTIFS
        stocks_init = STOCKS_FICTIFS
        
    meteo = req.meteo or [1] * req.horizon
    t0 = time.time()
    loop = asyncio.get_running_loop()
    
    await manager.broadcast(f"> [BENCHMARK] Exécution du solveur {req.algo}...")

    if req.algo == "greedy":
        all_lots, metrics = await loop.run_in_executor(
            process_pool,
            run_scheduler,
            navires, req.horizon, req.lambda_pen, meteo, stocks_init, None, req.axes_health
        )
        metrics["fitness_history"] = []
        algo_name = "Greedy"
    elif req.algo == "genetic":
        all_lots, metrics, history = await loop.run_in_executor(
            process_pool,
            run_genetic_algorithm,
            navires, req.n_gen, req.pop_size, req.horizon, req.lambda_pen, meteo, stocks_init, req.axes_health, req.warm_start
        )
        metrics["fitness_history"] = history
        algo_name = "Genetic Algorithm"
    elif req.algo == "sa":
        all_lots, metrics, history = await loop.run_in_executor(
            process_pool,
            run_simulated_annealing,
            navires, req.sa_iter, req.sa_temp, 0.95, req.horizon, req.lambda_pen, meteo, stocks_init, req.axes_health, req.warm_start
        )
        metrics["fitness_history"] = history
        algo_name = "Simulated Annealing"
    elif req.algo == "ts":
        all_lots, metrics, history = await loop.run_in_executor(
            process_pool,
            run_tabu_search,
            navires, req.ts_iter, req.ts_tabu_size, 10, req.horizon, req.lambda_pen, meteo, stocks_init, req.axes_health, req.warm_start
        )
        metrics["fitness_history"] = history
        algo_name = "Tabu Search"
    else:
        return {"error": "Unknown algo"}
        
    cpu_time = round(time.time() - t0, 4)
    metrics["cpu_time"] = cpu_time
    metrics["algo_name"] = algo_name
    metrics["algo_id"] = req.algo
    
    metrics = compute_scientific_kpis(all_lots, metrics, req.horizon)
    
    # Return all_lots as well so the frontend can instantly switch to the Gantt view
    return {"metrics": metrics, "all_lots": all_lots}


class RecommendRequest(BaseModel):
    horizon: int = 48
    navires: Optional[list] = None
    meteo: Optional[list] = None
    axes_health: Optional[dict] = None
    data_mode: str = "LOCAL"

@router.post("/benchmark/recommend")
def predict_best_algorithm(req: RecommendRequest):
    if req.data_mode == "REAL":
        real_navires, _ = get_real_data()
        navires = req.navires or real_navires
    else:
        navires = req.navires or NAVIRES_FICTIFS
        
    meteo = req.meteo or [1] * req.horizon
    
    n_navires = len(navires)
    bad_weather_hours = sum(1 for m in meteo if float(m) < 0.5)
    has_anomalies = bool(req.axes_health and any(h.get('is_anomaly') for h in req.axes_health.values()))
    
    complexity = 0
    if n_navires > 5: complexity += 1
    if n_navires > 10: complexity += 2
    if bad_weather_hours > req.horizon * 0.2: complexity += 1
    if has_anomalies: complexity += 2
    
    if complexity <= 1:
        reco = "greedy"
        reason = "Complexité faible. L'algorithme Greedy fournit des résultats quasi-optimaux instantanément."
    elif complexity <= 3:
        reco = "ts"
        reason = "Complexité moyenne. Tabu Search équilibre parfaitement vitesse d'exécution et évitement des minima locaux."
    else:
        reco = "genetic"
        reason = "Complexité élevée (congestion, anomalies). Genetic Algorithm recommandé pour l'exploration profonde de l'espace d'états."
        
    return {"recommended_algo": reco, "reason": reason, "complexity_score": complexity}


class AutoTuneRequest(BaseModel):
    algo: str
    horizon: int = 48
    lambda_pen: float = 0.8
    navires: Optional[list] = None
    meteo: Optional[list] = None
    axes_health: Optional[dict] = None
    data_mode: str = "LOCAL"

def _run_optuna_study(algo, navires, horizon, lambda_pen, meteo, stocks_init, axes_health):
    def objective(trial):
        if algo == "genetic":
            n_gen = trial.suggest_int("n_gen", 10, 50, step=10)
            pop_size = trial.suggest_int("pop_size", 10, 30, step=10)
            _, metrics, _ = run_genetic_algorithm(
                navires, n_gen, pop_size, horizon, lambda_pen, meteo, stocks_init, axes_health
            )
        elif algo == "ts":
            iter_val = trial.suggest_int("iter", 50, 150, step=50)
            tabu_size = trial.suggest_int("tabu_size", 5, 20, step=5)
            _, metrics, _ = run_tabu_search(
                navires, iter_val, tabu_size, 5, horizon, lambda_pen, meteo, stocks_init, axes_health
            )
        elif algo == "sa":
            iter_val = trial.suggest_int("iter", 300, 1000, step=100)
            temp = trial.suggest_int("temp", 500, 1500, step=250)
            _, metrics, _ = run_simulated_annealing(
                navires, iter_val, temp, 0.95, horizon, lambda_pen, meteo, stocks_init, axes_health
            )
        else:
            return -9999
        return metrics["score"]
        
    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=10)
    return study.best_params, study.best_value


@router.post("/benchmark/autotune")
async def run_autotune(req: AutoTuneRequest):
    if req.data_mode == "REAL":
        real_navires, stocks_init = get_real_data()
        navires = req.navires or real_navires
    else:
        navires = req.navires or NAVIRES_FICTIFS
        stocks_init = STOCKS_FICTIFS
        
    meteo = req.meteo or [1] * req.horizon
    loop = asyncio.get_running_loop()
    
    try:
        best_params, best_score = await loop.run_in_executor(
            process_pool,
            _run_optuna_study,
            req.algo, navires, req.horizon, req.lambda_pen, meteo, stocks_init, req.axes_health
        )
        return {"best_params": best_params, "best_score": best_score}
    except Exception as e:
        print(f"Autotune Error: {e}")
        return {"best_params": {}, "best_score": -9999}

