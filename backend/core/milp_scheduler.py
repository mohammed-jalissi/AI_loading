import pulp
import sys
import os

parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from milp_model import build_milp_model
from core.config import (
    QUAIS, ALL_AXES, PORTIQUES, AXES_P, QUAI_POSTE, QUALITE_HALLS,
    STOCKS_FICTIFS, T_ACC_PREP, T_FINITION, T_CTE_FC,
    T_REACCOSTAGE
)
from core.ws_manager import manager

def run_milp(navires, T=48, lambda_pen=0.8, meteo=None, stocks_init=None, axes_health=None, quais_availability=None):
    if stocks_init is None:
        stocks_init = STOCKS_FICTIFS
    if meteo is None:
        meteo = [1.0]*T

    manager.broadcast_sync("> [MILP] Construction du modèle (Génération des contraintes C1-C24)...")

    # 1. Build the true model
    model_data = build_milp_model(
        navires=navires,
        T=T,
        lambda_pen=lambda_pen,
        meteo=meteo,
        stocks_init=stocks_init,
        add_stock_dynamics=True,
        add_lot_sequencing=True,
        add_reaccostage=True,
        add_continuity=True,
        use_variable_reduction=True,
        axes_health=axes_health,
        quais_availability=quais_availability
    )
    
    prob = model_data["prob"]
    x = model_data["x"]
    y = model_data["y"]
    z = model_data["z"]
    f = model_data["f"]
    
    manager.broadcast_sync("> [MILP] Modèle construit. Lancement du solveur CBC (Max 30s, Gap 8%)...")
    # 2. Solve the problem
    prob.solve(pulp.PULP_CBC_CMD(msg=False, timeLimit=30, gapRel=0.08))
    
    status_str = pulp.LpStatus[prob.status]
    manager.broadcast_sync(f"> [MILP] Résolution terminée. Statut: {status_str}")
    manager.broadcast_sync("> [MILP] Reconstruction du planning à partir des variables...")
    all_lots = []
    
    # Extract extra variables
    sigma_deb = model_data.get("sigma_deb", {})
    sigma_fin = model_data.get("sigma_fin", {})
    shift_in = model_data.get("shift_in", {})
    shift_out = model_data.get("shift_out", {})
    tau_acc = model_data.get("tau_acc", {})
    tau_debut = model_data.get("tau_debut", {})
    
    # 3. Parse variables to reconstruct the timeline
    for nav in navires:
        nom = nav["nom"]
        prio = nav.get("priorite", 2)
        arr = int(nav.get("arrivee", 0))
        laytime = nav.get("laytime", 40)
        dem_rate = nav.get("demurrage_rate", 1000)
        
        # Timing results from MILP
        h_acc = int(pulp.value(tau_acc[nom])) if nom in tau_acc and pulp.value(tau_acc[nom]) is not None else arr
        h_deb = int(pulp.value(tau_debut[nom])) if nom in tau_debut and pulp.value(tau_debut[nom]) is not None else h_acc + T_ACC_PREP
        
        # Timeline strictly derived from solver variables
        vessel_timeline = {}
        for t in range(T):
            vessel_timeline[t] = {"status": "IDLE", "val": 0, "cumul": 0, "quai": "—"}
            
            # Check docking status
            for q in QUAIS:
                if (nom, q, t) in x and pulp.value(x[(nom, q, t)]) > 0.5:
                    vessel_timeline[t]["quai"] = q
                    vessel_timeline[t]["status"] = "ATTENTE_AXE"
                    
                    # Check for Reaccostage (Only on Entry 0->1)
                    if (nom, q, t) in shift_in and pulp.value(shift_in[(nom, q, t)]) > 0.5:
                        vessel_timeline[t]["status"] = "REACCOSTAGE"
                    elif t > 0 and (nom, q, t-1) in shift_in and pulp.value(shift_in[(nom, q, t-1)]) > 0.5:
                        vessel_timeline[t]["status"] = "REACCOSTAGE"

            # Specific phases
            if vessel_timeline[t]["quai"] != "—":
                if t < h_deb and t >= h_acc:
                    vessel_timeline[t]["status"] = "ACC_PREP"
                elif t < h_acc and t >= arr:
                    vessel_timeline[t]["status"] = "ATTENTE_QUAI"
                
                # Check for "Stock épuisé" (At quai but no flux and not in prep/shift)
                is_loading = False
                if (nom, t) in z and pulp.value(z[(nom, t)]) > 0.5:
                    is_loading = True
                
                if not is_loading and vessel_timeline[t]["status"] in ["ATTENTE_AXE", "IDLE"] and t >= h_deb:
                    vessel_timeline[t]["status"] = "STOCK_EPUISE"
            elif t >= arr:
                vessel_timeline[t]["status"] = "RADE"

        # Parse lots and flux
        lots_info = []
        for li, lot in enumerate(nav["lots"]):
            qualite = lot["qualite"]
            td = lot["td"]
            td_charged = 0
            
            axe_sel = "—"
            hall_sel = "—"
            
            s_deb = int(pulp.value(sigma_deb.get((nom, li), 0))) if (nom, li) in sigma_deb and pulp.value(sigma_deb[(nom, li)]) is not None else 0
            s_fin = int(pulp.value(sigma_fin.get((nom, li), 0))) if (nom, li) in sigma_fin and pulp.value(sigma_fin[(nom, li)]) is not None else 0
            
            unique_ah = set((k[2], k[3]) for k in model_data["y"].keys() if k[0] == nom and k[1] == li)
            for (a, h) in unique_ah:
                for t in range(T):
                    key_y = (nom, li, a, h, t)
                    if key_y in model_data["y"]:
                        val_y = pulp.value(model_data["y"][key_y])
                        if val_y and val_y > 0.5:
                            axe_sel = a
                            hall_sel = h
                            val_f = pulp.value(f[(nom, li, a, h, t)])
                            td_charged += val_f
                            
                            vessel_timeline[t]["status"] = "CHARGEMENT"
                            vessel_timeline[t]["val"] = int(val_f)
                            vessel_timeline[t]["cumul"] = int(td_charged)

            # Finishing phase for this lot
            for t in range(s_fin, min(s_fin + T_FINITION, T)):
                if vessel_timeline[t]["status"] not in ["CHARGEMENT", "RADE"]:
                    vessel_timeline[t]["status"] = "FINITION"

            # Reconstruct lot metrics
            load_times = [t for t in range(T) if vessel_timeline[t]["status"] == "CHARGEMENT" and vessel_timeline[t].get("val", 0) > 0]
            h_load_start = min(load_times) if load_times else s_deb
            h_load_end = max(load_times) + 1 if load_times else s_fin
            
            quai_for_lot = "—"
            if load_times:
                quai_for_lot = vessel_timeline[load_times[0]]["quai"]
            elif s_deb < T:
                quai_for_lot = vessel_timeline[s_deb]["quai"]

            # Unique physical resource mapping per dock to prevent overlap
            axe_p_map = {
                "1N": "G1",
                "1BIS": "G3",
                "1TER": "G4",
                "2N": "GH4",
                "2BIS": "GH14",
                "2TER": "GH13"
            }
            portique_map = {
                "1N": "PK1",
                "1BIS": "P3",
                "1TER": "P4",
                "2N": "CH3",
                "2BIS": "P01",
                "2TER": "P02"
            }

            formatted_axe = axe_sel.replace("Axe", "Axe ") if "Axe" in axe_sel and " " not in axe_sel else axe_sel
            
            lot_data = {
                "navire": nom, "quai": quai_for_lot, "qualite": qualite, "td": td, "td_charged": int(td_charged),
                "lot_idx": li, "is_last": (li == len(nav["lots"]) - 1), "scheduled": (td_charged > 0),
                "status": "OK" if td_charged > 0 else "RADE", "reason": "" if td_charged > 0 else "Non planifié",
                "axe": formatted_axe, "hall": hall_sel, 
                "axe_p": axe_p_map.get(quai_for_lot, "—"),
                "portique": portique_map.get(quai_for_lot, "—"),
                "cadence": ALL_AXES.get(axe_sel, {}).get("cadence", 0),
                "poste": QUAI_POSTE.get(quai_for_lot, "—"),
                "priorite": prio,
                "h_arr": arr, "h_load_start": h_load_start, "h_load_end": h_load_end,
                "timeline": vessel_timeline, 
                "laytime": laytime, "demurrage_rate": dem_rate,
                "h_dep": h_load_end,
                "wait_quai": max(0, h_acc - arr), "wait_axe": max(0, h_deb - h_acc - T_ACC_PREP)
            }
            all_lots.append(lot_data)
            lots_info.append(lot_data)

        # Final phase: CTE & FC
        last_l_idx = len(nav["lots"]) - 1
        s_fin_last = int(pulp.value(sigma_fin.get((nom, last_l_idx), 0))) if (nom, last_l_idx) in sigma_fin and pulp.value(sigma_fin[(nom, last_l_idx)]) is not None else 0
        if s_fin_last > 0:
            h_cte_start = min(s_fin_last + T_FINITION, T)
            h_cte_end = min(h_cte_start + T_CTE_FC, T)
            for t in range(h_cte_start, h_cte_end):
                if vessel_timeline[t]["status"] != "RADE":
                    vessel_timeline[t]["status"] = "CTE_FC"
            
            h_dep_final = h_cte_end
            for l_info in lots_info:
                l_info["h_dep"] = h_dep_final

    sched_lots = [s for s in all_lots if s["scheduled"]]
    
    # Metrics calculation
    vessels_results = {}
    for s in all_lots:
        v = s["navire"]
        if v not in vessels_results:
            vessels_results[v] = {"h_dep": 0, "laytime": s["laytime"], "dem_rate": s["demurrage_rate"], "h_arr": s["h_arr"]}
        vessels_results[v]["h_dep"] = max(vessels_results[v]["h_dep"], s["h_dep"])

    for s in all_lots:
        vr = vessels_results[s["navire"]]
        s["h_dep"] = vr["h_dep"]
        s["demurrage_hours"] = max(0, (s["h_dep"] - s["h_arr"]) - s["laytime"])
        s["demurrage_cost"] = s["demurrage_hours"] * s["demurrage_rate"]

    obj_val = pulp.value(prob.objective) if prob.status == 1 else 0
    total_risk_milp = 0.0
    if axes_health:
        for s in sched_lots:
            axe = s.get("axe", "").replace(" ", "")
            if axe in axes_health:
                total_risk_milp += axes_health[axe].get("probability", 0)

    best_bound = getattr(prob, "bestBound", None)
    if best_bound is not None and obj_val and abs(obj_val) > 1e-6:
        mip_gap_pct = round(abs(best_bound - obj_val) / abs(obj_val) * 100, 2)
    else:
        mip_gap_pct = 0.0
    milp_status = pulp.LpStatus[prob.status]

    from collections import defaultdict
    poste_totals = defaultdict(int)
    for s in sched_lots:
        poste_totals[s.get("poste", "—")] += s.get("td_charged", 0)

    metrics = {
        "total_charge": sum(s["td_charged"] for s in sched_lots),
        "total_attente": sum(s["wait_quai"] + s["wait_axe"] for s in all_lots),
        "total_risk": round(total_risk_milp, 4),
        "lots_planifies": len(sched_lots), "lots_total": len(all_lots),
        "navires_total": len(navires),
        "taux": len(sched_lots) / max(len(all_lots), 1) * 100,
        "score": obj_val,
        "poste_totals": dict(poste_totals),
        "stocks_restants": stocks_init,
        "mip_gap_pct": mip_gap_pct,
        "milp_status": milp_status,
        "total_demurrage_cost": sum(v["demurrage_cost"] for v in [all_lots[i] for i in range(len(all_lots)) if all_lots[i]["is_last"]]),
        "total_demurrage_hours": sum(v["demurrage_hours"] for v in [all_lots[i] for i in range(len(all_lots)) if all_lots[i]["is_last"]]),
    }

    return all_lots, metrics
