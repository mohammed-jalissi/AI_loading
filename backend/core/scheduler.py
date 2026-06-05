"""
scheduler.py — Greedy & Genetic Algorithm schedulers
Uses 6 logical axes (axe_free) for equipment tracking, not physical nodes.
"""
import random
import copy
import math
from collections import defaultdict
from .config import (
    QUAIS, ALL_AXES, AXES_P, PORTIQUES, QUAI_POSTE, QUALITE_HALLS,
    STOCKS_FICTIFS, T_ACC_PREP, T_FINITION, T_CTE_FC,
    T_REACCOSTAGE, GAMMA_PEN_ML_FACTOR
)


from .ws_manager import manager


def find_combos(qualite, stocks, axes_health=None):
    """
    Find all valid (axe, hall, cadence, stock) combos for a given qualité.
    Filters by QUALITE_HALLS compatibility and available stock.
    """
    halls_ok = QUALITE_HALLS.get(qualite, [])
    combos = []
    for hall in halls_ok:
        stock = stocks.get(hall, {}).get(qualite, 0)
        if stock <= 0:
            continue
        for axe, info in ALL_AXES.items():
            if hall in info["halls"]:
                cadence = info["cadence"]
                # ML health impact: reduce cadence if anomaly detected
                if axes_health and axe in axes_health:
                    res = axes_health[axe]
                    if res.get('is_anomaly'):
                        cadence = cadence * 0.5
                    elif res.get('probability', 0) > 0.3:
                        cadence = cadence * 0.8
                combos.append({"axe": axe, "hall": hall,
                               "cadence": cadence, "stock": stock})
    combos.sort(key=lambda c: (-c["cadence"], -c["stock"]))
    return combos


def _build_lot(nom, quai, qual, td, td_ch, li, is_last, scheduled, status, reason,
               axe, hall, cadence, arr, h_acc_start, h_acc_end,
               h_load_start, h_load_end, h_fin_end, h_cte_end,
               wait_quai, wait_axe, stock_warn, poste, prio, w_i, tl,
               laytime, dem_rate):
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
    return {
        "navire": nom, "quai": quai, "qualite": qual, "td": td, "td_charged": td_ch,
        "lot_idx": li, "is_last": is_last, "scheduled": scheduled,
        "status": status, "reason": reason, "axe": axe, "hall": hall,
        "axe_p": axe_p_map.get(quai, "—"),
        "portique": portique_map.get(quai, "—"),
        "grue": portique_map.get(quai, "—"),
        "cadence": cadence,
        "h_arr": arr, "h_acc_start": h_acc_start, "h_acc_end": h_acc_end,
        "h_load_start": h_load_start, "h_load_end": h_load_end,
        "h_fin_end": h_fin_end, "h_cte_end": h_cte_end,
        "wait_quai": wait_quai, "wait_axe": wait_axe,
        "stock_warn": stock_warn, "poste": poste,
        "priorite": prio, "w_i": w_i, "timeline": tl,
        "laytime": laytime,
        "demurrage_rate": dem_rate,
        "h_dep": h_cte_end, # Departure time (valid for last lot)
        "demurrage_hours": 0, "demurrage_cost": 0,
        "path": []
    }


def run_scheduler(navires, T=48, lambda_pen=0.8, meteo=None, stocks_init=None,
                  pre_sorted_navires=None, axes_health=None, weather_alerts=None, quality_shortages=None, progress=1.0):
    """
    Greedy scheduler using 6 logical axes (TB1-3, Axe1-3) for resource tracking.
    """
    if meteo is None:
        meteo = [1] * T
    if stocks_init is None:
        stocks_init = STOCKS_FICTIFS

    axe_p_map = {
        "1N": "G1", "1BIS": "G3", "1TER": "G4",
        "2N": "GH4", "2BIS": "GH14", "2TER": "GH13"
    }
    portique_map = {
        "1N": "PK1", "1BIS": "P3", "1TER": "P4",
        "2N": "CH3", "2BIS": "P01", "2TER": "P02"
    }
    
    stocks = {h: dict(s) for h, s in stocks_init.items()}
    quai_free = {q: 0 for q in QUAIS}
    axe_free = {a: 0 for a in ALL_AXES}
    grue_free = {g: 0 for g in portique_map.values()}
    axe_p_free = {ap: 0 for ap in axe_p_map.values()}

    priority_weights = {1: 3.0, 2: 2.0, 3: 1.0}

    if pre_sorted_navires:
        sorted_navires = pre_sorted_navires
    else:
        sorted_navires = sorted(
            navires,
            key=lambda n: (n["priorite"], n["arrivee"], -sum(l["td"] for l in n["lots"]))
        )

    all_lots = []
    total_attente = 0

    for nav in sorted_navires:
        nom = nav["nom"]
        arr = int(nav["arrivee"])
        prio = nav["priorite"]
        w_i = priority_weights.get(prio, 1.0)

        # ── Quai selection (1 vessel per quai) ──
        quai_sel = None
        best_avail = T + 999
        for q in QUAIS:
            grue_avail = grue_free.get(portique_map.get(q, ""), 0)
            avail_raw = max(arr, quai_free[q], grue_avail)
            
            # Apply weather alerts (prevent docking/ops during heavy swell)
            if weather_alerts:
                for wa in weather_alerts:
                    if wa.get("target") == q:
                        w_start = int(wa.get("start", 0))
                        w_end = w_start + int(wa.get("duration", 0))
                        # If the operation overlaps with the bad weather window, wait until it passes
                        if avail_raw < w_end and avail_raw + T_ACC_PREP > w_start:
                            avail_raw = max(avail_raw, w_end)

            # Plus de restriction nocturne, on prend l'heure brute
            avail_adj = avail_raw
            if avail_adj + T_ACC_PREP + T_FINITION + T_CTE_FC < T:
                if avail_adj < best_avail:
                    quai_sel, best_avail = q, avail_adj

        # ── No quai available → RADE ──
        if quai_sel is None:
            for li, lot in enumerate(nav["lots"]):
                tl = {h: ({"status": "RADE", "val": 0, "cumul": 0} if h >= arr
                          else {"status": "IDLE", "val": 0, "cumul": 0})
                      for h in range(T)}
                all_lots.append(_build_lot(
                    nom, "—", lot["qualite"], lot["td"], 0, li,
                    (li == len(nav["lots"]) - 1), False, "RADE",
                    "Tous les quais sont occupés (1 navire/quai)",
                    "—", "—", 0, arr, arr, arr, arr, arr, arr, arr,
                    0, 0, False, "—", prio, w_i, tl,
                    nav.get("laytime", 40), nav.get("demurrage_rate", 1000)))
            continue

        wait_quai = max(0, best_avail - arr)
        total_attente += wait_quai

        h_acc_start = best_avail
        h_acc_end   = h_acc_start + T_ACC_PREP

        if h_acc_end >= T:
            continue

        base_tl = {}
        for h in range(T):
            if h < arr:
                base_tl[h] = {"status": "IDLE", "val": 0, "cumul": 0}
            elif h < h_acc_start:
                base_tl[h] = {"status": "ATTENTE_QUAI", "val": 0, "cumul": 0}
            elif h < h_acc_end:
                base_tl[h] = {"status": "ACC_PREP", "val": 0, "cumul": 0}
            else:
                base_tl[h] = {"status": "IDLE", "val": 0, "cumul": 0}

        h_vessel_start = h_acc_end
        vessel_active_axes = {h: 0 for h in range(T)}
        max_load_end = h_vessel_start
        lots_to_append = []

        # ── CORRECTIF SÉQUENCEMENT : chaque lot commence après la fin du lot précédent ──
        # Un navire ne peut charger qu'une cale à la fois (stabilité + 1 grue / 1 convoyeur).
        # h_next_lot_start est mis à jour après chaque lot = fin_lot + T_FINITION inter-lot.
        h_next_lot_start = h_vessel_start

        for li, lot in enumerate(nav["lots"]):
            lot_tl = {h: dict(base_tl[h]) for h in range(T)}
            qual = lot["qualite"]
            td = lot["td"]
            is_last = (li == len(nav["lots"]) - 1)

            # Le lot démarre au plus tôt à h_next_lot_start (fin du lot précédent + finition)
            h_lot_earliest = h_next_lot_start

            combos = find_combos(qual, stocks, axes_health=axes_health)

            if not combos:
                epuise_h = h_lot_earliest
                for h in range(epuise_h, T): lot_tl[h] = {"status": "EPUISEMENT", "val": 0, "cumul": 0}
                lots_to_append.append(_build_lot(
                    nom, quai_sel, qual, td, 0, li, is_last,
                    False, "EPUISEMENT", "Stock épuisé",
                    "—", "—", 0, arr, h_acc_start, h_acc_end,
                    h_lot_earliest, epuise_h, h_lot_earliest, h_lot_earliest,
                    wait_quai, 0, True, QUAI_POSTE.get(quai_sel, "—"),
                    prio, w_i, lot_tl, nav.get("laytime", 40), nav.get("demurrage_rate", 1000)))
                # Lot vide : pas de décalage, le suivant peut démarrer immédiatement
                continue

            axe_sel = hall_sel = None
            cadence = 0
            best_start_cand = T + 999

            for combo in combos:
                a = combo["axe"]
                af = axe_free[a]
                apf = axe_p_free.get(axe_p_map.get(quai_sel, ""), 0)
                # Le candidat doit respecter : disponibilité de l'axe, de l'axe P, et fin du lot précédent
                start_cand = max(h_lot_earliest, af, apf)

                needed_tail = T_FINITION + T_CTE_FC
                if start_cand + needed_tail < T and start_cand < best_start_cand:
                    best_start_cand = start_cand
                    axe_sel = a
                    hall_sel = combo["hall"]
                    cadence = combo["cadence"]

            if axe_sel is None:
                for h in range(h_lot_earliest, T): lot_tl[h] = {"status": "RADE", "val": 0, "cumul": 0}
                lots_to_append.append(_build_lot(
                    nom, "—", qual, td, 0, li, is_last,
                    False, "RADE", "Aucun axe disponible dans l'horizon",
                    "—", "—", 0, arr, h_acc_start, h_acc_end,
                    h_lot_earliest, h_lot_earliest, h_lot_earliest, h_lot_earliest,
                    wait_quai, 0, False, "—", prio, w_i, lot_tl,
                    nav.get("laytime", 40), nav.get("demurrage_rate", 1000)))
                continue

            wait_axe = max(0, best_start_cand - h_lot_earliest)
            total_attente += wait_axe
            h_load_start = best_start_cand

            # Afficher l'attente inter-lot sur la timeline
            for h in range(h_lot_earliest, min(h_load_start, T)):
                lot_tl[h] = {"status": "ATTENTE_AXE", "val": 0, "cumul": 0}

            stock_dispo = stocks.get(hall_sel, {}).get(qual, 0)
            td_possible = min(td, stock_dispo)
            stock_warn = td_possible < td * 0.95

            h = h_load_start
            cumul = 0
            while cumul < td_possible and h < T:
                # 1. Quality shortage check
                is_shortage = False
                if quality_shortages:
                    for qs in quality_shortages:
                        if qs.get("target") == qual:
                            q_start = int(qs.get("start", 0))
                            q_end = q_start + int(qs.get("duration", 0))
                            if q_start <= h < q_end:
                                is_shortage = True
                                break
                
                if is_shortage:
                    lot_tl[h] = {"status": "EN_ATTENTE", "val": int(cumul), "cumul": int(cumul)}
                    h += 1
                    continue

                # 2. Meteo factor
                meteo_factor = float(meteo[h]) if h < len(meteo) else 1.0
                if meteo_factor <= 0.0:
                    lot_tl[h] = {"status": "EN_ATTENTE", "val": int(cumul), "cumul": int(cumul)}
                    h += 1
                    continue

                vessel_active_axes[h] = vessel_active_axes.get(h, 0) + 1
                effective_cadence = cadence * meteo_factor
                gain = min(effective_cadence, td_possible - cumul)
                lot_tl[h] = {"status": "CHARGEMENT", "val": int(cumul), "cumul": int(cumul + gain), "gain": int(gain)}
                cumul += gain
                h += 1

            h_load_end = h
            is_exhausted = td_possible < td

            if is_exhausted:
                h_epuisement_end = min(h_load_end + 1, T)
                for fh in range(h_load_end, h_epuisement_end):
                    lot_tl[fh] = {"status": "STOCK_EPUISE", "val": int(cumul), "cumul": int(cumul)}
                for ah in range(h_epuisement_end, T):
                    lot_tl[ah] = {"status": "RADE", "val": int(cumul), "cumul": int(cumul)}
                axe_free[axe_sel] = h_load_end
                if quai_sel in axe_p_map:
                    axe_p_free[axe_p_map[quai_sel]] = h_load_end
                max_load_end = max(max_load_end, h_epuisement_end)
                # Lot épuisé : le prochain lot peut démarrer après + finition inter-lot
                h_next_lot_start = h_epuisement_end + T_FINITION
            else:
                axe_free[axe_sel] = h_load_end
                if quai_sel in axe_p_map:
                    axe_p_free[axe_p_map[quai_sel]] = h_load_end
                max_load_end = max(max_load_end, h_load_end)
                # ── CORRECTIF CLEF : le prochain lot démarre après la fin de ce lot + finition ──
                h_next_lot_start = h_load_end + T_FINITION

            if hall_sel in stocks and qual in stocks[hall_sel]:
                stocks[hall_sel][qual] = max(0, stocks[hall_sel][qual] - int(td_possible))

            lots_to_append.append(_build_lot(
                nom, quai_sel, qual, td, int(td_possible), li, is_last,
                True, "OK", "", axe_sel, hall_sel, cadence, arr,
                h_acc_start, h_acc_end, h_load_start, h_load_end,
                h_load_end, h_load_end, wait_quai, wait_axe, stock_warn,
                QUAI_POSTE.get(quai_sel, "—"), prio, w_i, lot_tl,
                nav.get("laytime", 40), nav.get("demurrage_rate", 1000)))

        # --- Finition Globale ---
        # Détecter si le navire complet est "épuisé" (au moins un lot incomplet)
        is_vessel_exhausted = any(lot_res["td_charged"] < lot_res["td"] for lot_res in lots_to_append if lot_res["scheduled"])
        
        # Le dernier lot termine sa finition à :
        h_vessel_ready_for_cte = min(max_load_end + T_FINITION, T)
        
        if is_vessel_exhausted:
            h_global_cte = h_vessel_ready_for_cte  # Pas de CTE, le navire quitte le quai immédiatement
            end_of_day = min(((h_global_cte // 24) + 1) * 24, T)
            status_until_eod = "RADE"
            status_after_eod = "RADE_HIDDEN"
        else:
            h_global_cte = min(h_vessel_ready_for_cte + T_CTE_FC, T)
            end_of_day = min(((h_global_cte // 24) + 1) * 24, T)
            status_until_eod = "ACHEVE"
            status_after_eod = "LIBRE"
        
        # Override the timeline of all scheduled lots of this vessel
        for lot_res in lots_to_append:
            if lot_res["scheduled"]:
                if lot_res["td_charged"] < lot_res["td"]:
                    lot_h_end_load = min(lot_res["h_load_end"] + 1, T)
                else:
                    lot_h_end_load = lot_res["h_load_end"]
                
                lot_h_fin_end = min(lot_h_end_load + T_FINITION, T)
                
                # 1. FINITION individuelle du lot juste après son chargement
                for fh in range(lot_h_end_load, lot_h_fin_end):
                    st = lot_res["timeline"][fh]["status"]
                    if st not in ["STOCK_EPUISE", "EPUISEMENT"]:
                        lot_res["timeline"][fh] = {"status": "FINITION", "val": lot_res["td_charged"], "cumul": lot_res["td_charged"]}

                # 2. Combler le trou entre sa finition et le début du CTE_FC global du navire
                for h in range(lot_h_fin_end, h_vessel_ready_for_cte):
                    st = lot_res["timeline"][h]["status"]
                    if st not in ["STOCK_EPUISE", "EPUISEMENT"]:
                        lot_res["timeline"][h] = {"status": "EN_ATTENTE", "val": lot_res["td_charged"], "cumul": lot_res["td_charged"]}

                # 3. Appliquer le CTE_FC (documents) pour le navire entier (si pas épuisé)
                if not is_vessel_exhausted:
                    for ch in range(h_vessel_ready_for_cte, h_global_cte):
                        lot_res["timeline"][ch] = {"status": "CTE_FC", "val": lot_res["td_charged"], "cumul": lot_res["td_charged"]}
                
                # 4. Appliquer le statut post-départ (ACHEVE ou RADE) jusqu'à la fin de journée
                for ah in range(h_global_cte, end_of_day):
                    lot_res["timeline"][ah] = {"status": status_until_eod, "val": lot_res["td_charged"], "cumul": lot_res["td_charged"]}
                
                # 5. Appliquer le statut invisible (LIBRE ou RADE_HIDDEN) pour le lendemain
                for ah in range(end_of_day, T):
                    lot_res["timeline"][ah] = {"status": status_after_eod, "val": lot_res["td_charged"], "cumul": lot_res["td_charged"]}
                
                lot_res["h_fin_end"] = lot_h_fin_end
                lot_res["h_cte_end"] = h_global_cte
                
            all_lots.append(lot_res)

        quai_free[quai_sel] = h_global_cte
        if quai_sel in portique_map:
            grue_free[portique_map[quai_sel]] = h_global_cte
        
        # Post-process this vessel's lots to set real h_dep and calculate demurrage
        v_h_dep = h_global_cte
        v_laytime = nav.get("laytime", 40)
        v_dem_rate = nav.get("demurrage_rate", 1000)
        v_dem_hours = max(0, (v_h_dep - arr) - v_laytime)
        v_dem_cost = v_dem_hours * v_dem_rate
        
        for lot_res in all_lots:
            if lot_res["navire"] == nom:
                lot_res["h_dep"] = v_h_dep
                lot_res["demurrage_hours"] = v_dem_hours
                lot_res["demurrage_cost"] = v_dem_cost

    sched_lots = [s for s in all_lots if s.get("scheduled")]
    total_charge = sum(s["td_charged"] for s in sched_lots)
    poste_totals = defaultdict(int)
    for s in sched_lots:
        poste_totals[s["poste"]] += s["td_charged"]

    # Reliability risk
    total_risk = 0
    if axes_health:
        for s in sched_lots:
            axe = s.get("axe")
            if axe and axe in axes_health:
                total_risk += axes_health[axe].get("probability", 0)

    # ── Évaluation Normalisée (Optimisée pour le Gradient) ──
    max_weighted_tonnage = sum(s["w_i"] * s["td"] for s in all_lots) or 1.0
    
    # Amélioration 2 : Réduction du pire cas pour augmenter la sensibilité de l'algorithme (Gradient)
    max_wait_realiste = len(navires) * (T / 2.0) or 1.0  
    max_risk = len(sched_lots) or 1
    
    norm_tonnage = sum(s["w_i"] * s["td_charged"] for s in sched_lots) / max_weighted_tonnage
    
    # Attente linéaire
    norm_wait = total_attente / max_wait_realiste
    
    # Pénalité Linéaire pour le dépassement du Laytime (Idem MILP)
    total_demurrage_hours = sum(s["demurrage_hours"] for s in all_lots if s["is_last"])
    norm_demurrage = total_demurrage_hours / max_wait_realiste
    
    norm_risk = total_risk / max_risk

    # Amélioration 3 : Dynamisation des Poids (Adaptive Fitness)
    W_TONNAGE   = 3.0 - 1.0 * progress         # Start at 3.0, end at 2.0
    W_WAIT      = 0.1 + (lambda_pen - 0.1) * progress # Start at 0.1, end at lambda_pen
    W_DEMURRAGE = 0.1 + (0.5 - 0.1) * progress # Start at 0.1, end at 0.5
    W_RISK      = 0.5                 

    obj_val = (W_TONNAGE * norm_tonnage) - (W_WAIT * norm_wait) - (W_DEMURRAGE * norm_demurrage) - (W_RISK * norm_risk)
    
    total_demurrage_cost = sum(s["demurrage_cost"] for s in all_lots if s["is_last"])

    total_requested = sum(s["td"] for s in all_lots)
    metrics = {
        "total_charge": total_charge,
        "total_attente": total_attente,
        "total_risk": round(total_risk, 4),
        "lots_planifies": len(sched_lots),
        "lots_total": len(all_lots),
        "navires_total": len(navires),
        "taux": (total_charge / max(total_requested, 1)) * 100,
        "score": obj_val,
        "poste_totals": dict(poste_totals),
        "stocks_restants": stocks,
        "total_demurrage_cost": total_demurrage_cost,
        "total_demurrage_hours": sum(s["demurrage_hours"] for s in all_lots if s["is_last"]),
    }
    return all_lots, metrics


def run_genetic_algorithm(navires, n_gen=20, pop_size=20, T=48,
                          lambda_pen=0.8, meteo=None, stocks_init=None,
                          axes_health=None, weather_alerts=None, quality_shortages=None, warm_start=True):
    """
    Algorithme Génétique Multi-Objectif (Pareto).
    Optimise : 1. Productivité, 2. Coût (Attente), 3. Fiabilité (Risque).
    """
    n_nav = len(navires)
    pop = [list(range(n_nav)) for _ in range(pop_size)]
    for ind in pop:
        random.shuffle(ind)
        
    # Warm-Start: Inject Greedy sequence as the first individual
    if warm_start:
        greedy_ind = sorted(range(n_nav), key=lambda i: (navires[i]["priorite"], int(navires[i].get("arrivee", 0)), -sum(l["td"] for l in navires[i].get("lots", []))))
        if pop:
            pop[0] = greedy_ind

    def dominates(fit1, fit2):
        not_worse = all(f1 >= f2 for f1, f2 in zip(fit1, fit2))
        better = any(f1 > f2 for f1, f2 in zip(fit1, fit2))
        return not_worse and better

    best_res = (None, None)
    fitness_history = []

    manager.broadcast_sync(f"> [GA] Démarrage (Pop={pop_size}, Gen={n_gen}, WarmStart={warm_start})...")

    for gen in range(n_gen):
        if gen % 5 == 0:
            manager.broadcast_sync(f"> [GA] Génération {gen}/{n_gen} en cours...")
        evaluated = []
        for ind in pop:
            pre_sorted = [navires[i] for i in ind]
            res_lots, res_metrics = run_scheduler(
                navires, T=T, lambda_pen=lambda_pen, meteo=meteo,
                stocks_init=stocks_init, pre_sorted_navires=pre_sorted,
                axes_health=axes_health, weather_alerts=weather_alerts, quality_shortages=quality_shortages, progress=gen / max(1, n_gen - 1)
            )
            fitness = (
                res_metrics["total_charge"],
                -res_metrics["total_attente"],
                -res_metrics["total_risk"]
            )
            evaluated.append({"ind": ind, "fitness": fitness, "res": (res_lots, res_metrics)})

        # Fix #6 : Pareto ranking avec Crowding Distance (style NSGA-II)
        # Étape 1 : déterminer le rang de dominance
        for target in evaluated:
            dom_count = sum(1 for other in evaluated if dominates(other["fitness"], target["fitness"]))
            target["dom_count"] = dom_count

        # Étape 2 : crowding distance par objectif pour diversifier le front
        for obj_idx in range(3):
            evaluated.sort(key=lambda x: x["fitness"][obj_idx])
            f_min = evaluated[0]["fitness"][obj_idx]
            f_max = evaluated[-1]["fitness"][obj_idx]
            f_range = max(f_max - f_min, 1e-9)
            evaluated[0]["crowd"] = evaluated[0].get("crowd", 0) + 1e9
            evaluated[-1]["crowd"] = evaluated[-1].get("crowd", 0) + 1e9
            for k in range(1, len(evaluated) - 1):
                dist = (evaluated[k+1]["fitness"][obj_idx] - evaluated[k-1]["fitness"][obj_idx]) / f_range
                evaluated[k]["crowd"] = evaluated[k].get("crowd", 0) + dist

        # Tri NSGA-II : rang d'abord, puis crowding distance (plus grand = meilleur)
        evaluated.sort(key=lambda x: (x["dom_count"], -x.get("crowd", 0)))
        for e in evaluated:
            e["crowd"] = 0  # reset pour la prochaine génération

        best_of_gen = evaluated[0]
        best_res = best_of_gen["res"]
        fitness_history.append(best_of_gen["fitness"][0])

        # Tournament selection (avec crowding distance comme bris d'égalité)
        new_pop = []
        
        # Élitisme : On conserve les 2 meilleurs individus intacts
        n_elite = min(2, pop_size)
        for i in range(n_elite):
            new_pop.append(copy.deepcopy(evaluated[i]["ind"]))
            
        for _ in range(pop_size - n_elite):
            c1, c2 = random.sample(evaluated, 2)
            if c1["dom_count"] < c2["dom_count"]:
                winner = c1
            elif c2["dom_count"] < c1["dom_count"]:
                winner = c2
            else:  # même rang → préférer le plus isolé (crowding distance plus grande)
                winner = c1 if c1.get("crowd", 0) >= c2.get("crowd", 0) else c2
            new_pop.append(copy.deepcopy(winner["ind"]))

        # Crossover (Order Crossover OX) - uniquement sur la partie non-élite
        for i in range(n_elite, pop_size - 1, 2):
            if random.random() < 0.7:
                p1, p2 = new_pop[i], new_pop[i + 1]
                idx1, idx2 = sorted(random.sample(range(n_nav), 2))

                def ox_fill(p, d, s1, s2):
                    c = [None] * n_nav
                    c[s1:s2 + 1] = p[s1:s2 + 1]
                    f, dp = (s2 + 1) % n_nav, (s2 + 1) % n_nav
                    while None in c:
                        if d[dp] not in c:
                            c[f] = d[dp]
                            f = (f + 1) % n_nav
                        dp = (dp + 1) % n_nav
                    return c

                new_pop[i] = ox_fill(p1, p2, idx1, idx2)
                new_pop[i + 1] = ox_fill(p2, p1, idx1, idx2)

        # Mutation - uniquement sur la partie non-élite
        for i in range(n_elite, pop_size):
            r = random.random()
            if r < 0.2 and n_nav >= 2:
                # Swap mutation
                idx1, idx2 = random.sample(range(n_nav), 2)
                new_pop[i][idx1], new_pop[i][idx2] = new_pop[i][idx2], new_pop[i][idx1]
            elif r < 0.35 and n_nav >= 3:
                # Fix #2 : Inversion mutation — inverse un sous-segment aléatoire
                # Permet de sortir des minima locaux que le swap seul ne peut pas atteindre
                idx1, idx2 = sorted(random.sample(range(n_nav), 2))
                new_pop[i][idx1:idx2 + 1] = new_pop[i][idx1:idx2 + 1][::-1]

        pop = new_pop

    return best_res[0], best_res[1], fitness_history


def run_simulated_annealing(navires, max_iter=100, init_temp=1000, cooling_rate=0.95, T=48, lambda_pen=0.8, meteo=None, stocks_init=None, axes_health=None, weather_alerts=None, quality_shortages=None, warm_start=True):
    """
    Algorithme du Recuit Simulé (Simulated Annealing) pour optimiser l'ordre des navires.
    """
    if not navires:
        return [], {}, []

    n_nav = len(navires)
    # Warm-Start: Initialize with Greedy sequence
    if warm_start:
        current_ind = sorted(range(n_nav), key=lambda i: (navires[i]["priorite"], int(navires[i].get("arrivee", 0)), -sum(l["td"] for l in navires[i].get("lots", []))))
    else:
        current_ind = list(range(n_nav))
        random.shuffle(current_ind)
    
    def get_fitness(ind, current_step):
        pre_sorted = [navires[i] for i in ind]
        _, metrics = run_scheduler(navires, T=T, lambda_pen=lambda_pen, meteo=meteo, stocks_init=stocks_init, pre_sorted_navires=pre_sorted, axes_health=axes_health, weather_alerts=weather_alerts, quality_shortages=quality_shortages, progress=current_step / max(1, max_iter - 1))
        return metrics["score"]
        
    current_fit = get_fitness(current_ind, 0)
    best_ind = list(current_ind)
    best_fit = current_fit
    
    temp = init_temp
    fitness_history = []
    
    manager.broadcast_sync(f"> [SA] Démarrage Recuit Simulé (Iter={max_iter}, T0={init_temp}, WarmStart={warm_start})...")

    for step in range(max_iter):
        if step > 0 and step % (max_iter // 5) == 0:
            manager.broadcast_sync(f"> [SA] Itération {step}/{max_iter}. Température = {temp:.1f}")
        neighbor = list(current_ind)
        if n_nav >= 2:
            if random.random() < 0.5:
                idx1, idx2 = random.sample(range(n_nav), 2)
                neighbor[idx1], neighbor[idx2] = neighbor[idx2], neighbor[idx1]
            else:
                idx_pop = random.randrange(n_nav)
                job = neighbor.pop(idx_pop)
                idx_ins = random.randrange(n_nav)
                neighbor.insert(idx_ins, job)
        
        neighbor_fit = get_fitness(neighbor, step)
        
        if neighbor_fit > current_fit or random.random() < math.exp((neighbor_fit - current_fit) / temp):
            current_ind = neighbor
            current_fit = neighbor_fit
            
            if current_fit > best_fit:
                best_fit = current_fit
                best_ind = list(current_ind)
                
        temp *= cooling_rate
        fitness_history.append(best_fit)
        
    pre_sorted = [navires[i] for i in best_ind]
    best_lots, best_metrics = run_scheduler(navires, T=T, lambda_pen=lambda_pen, meteo=meteo, stocks_init=stocks_init, pre_sorted_navires=pre_sorted, axes_health=axes_health, weather_alerts=weather_alerts, quality_shortages=quality_shortages)
    return best_lots, best_metrics, fitness_history


def run_tabu_search(navires, max_iter=50, tabu_size=10, n_neighbors=5, T=48, lambda_pen=0.8, meteo=None, stocks_init=None, axes_health=None, weather_alerts=None, quality_shortages=None, warm_start=True):
    """
    Recherche Tabou (Tabu Search) pour optimiser l'ordre des navires.
    """
    if not navires:
        return [], {}, []

    n_nav = len(navires)
    # Warm-Start: Initialize with Greedy sequence
    if warm_start:
        current_ind = sorted(range(n_nav), key=lambda i: (navires[i]["priorite"], int(navires[i].get("arrivee", 0)), -sum(l["td"] for l in navires[i].get("lots", []))))
    else:
        current_ind = list(range(n_nav))
        random.shuffle(current_ind)
    
    def get_fitness_res(ind, current_step):
        pre_sorted = [navires[i] for i in ind]
        lots, metrics = run_scheduler(navires, T=T, lambda_pen=lambda_pen, meteo=meteo, stocks_init=stocks_init, pre_sorted_navires=pre_sorted, axes_health=axes_health, weather_alerts=weather_alerts, quality_shortages=quality_shortages, progress=current_step / max(1, max_iter - 1))
        return metrics["score"], lots, metrics

    current_fit, current_lots, current_metrics = get_fitness_res(current_ind, 0)
    best_ind = list(current_ind)
    best_fit = current_fit
    best_lots, best_metrics = current_lots, current_metrics
    
    tabu_list = []
    fitness_history = []
    
    manager.broadcast_sync(f"> [TS] Démarrage Recherche Tabou (Iter={max_iter}, Size={tabu_size}, WarmStart={warm_start})...")

    for step in range(max_iter):
        if step > 0 and step % (max_iter // 5) == 0:
            manager.broadcast_sync(f"> [TS] Itération {step}/{max_iter}. Meilleur fitness = {best_fit:.1f}")

        if n_nav < 2:
            fitness_history.append(best_fit)
            continue

        # Générer les voisins
        neighbors = []
        for _ in range(n_neighbors):
            neighbor = list(current_ind)
            if random.random() < 0.5:
                idx1, idx2 = random.sample(range(n_nav), 2)
                if idx1 > idx2: idx1, idx2 = idx2, idx1
                neighbor[idx1], neighbor[idx2] = neighbor[idx2], neighbor[idx1]
                move = ('swap', idx1, idx2)
            else:
                idx_pop = random.randrange(n_nav)
                job = neighbor.pop(idx_pop)
                idx_ins = random.randrange(n_nav)
                neighbor.insert(idx_ins, job)
                move = ('insert', job, idx_ins)
            neighbors.append((neighbor, move))

        # Fix #9 : Évaluer TOUS les voisins d'abord, classer ensuite
        # Évite la stagnation quand tous les moves sont tabous
        all_evaluated_neighbors = []
        for neighbor, move in neighbors:
            fit, n_lots, n_metrics = get_fitness_res(neighbor, step)
            is_tabu = move in tabu_list
            aspirated = is_tabu and fit > best_fit  # Critère d'aspiration
            all_evaluated_neighbors.append({
                "neighbor": neighbor, "move": move,
                "fit": fit, "lots": n_lots, "metrics": n_metrics,
                "is_tabu": is_tabu, "aspirated": aspirated
            })

        # Sélectionner : non-tabou prioritaire, ou aspiré, ou fallback meilleur tabou
        candidates = [e for e in all_evaluated_neighbors if not e["is_tabu"] or e["aspirated"]]
        if not candidates:
            # Diversification : tous les moves sont tabous → prendre le moins mauvais
            candidates = all_evaluated_neighbors
            manager.broadcast_sync(f"> [TS] Itération {step} : diversification forcée (tous voisins tabous)")

        best_eval = max(candidates, key=lambda e: e["fit"]) if candidates else None

        if best_eval is not None:
            current_ind = best_eval["neighbor"]
            current_fit = best_eval["fit"]

            tabu_list.append(best_eval["move"])
            if len(tabu_list) > tabu_size:
                tabu_list.pop(0)

            if current_fit > best_fit:
                best_fit = current_fit
                best_ind = list(current_ind)
                best_lots = best_eval["lots"]
                best_metrics = best_eval["metrics"]

        fitness_history.append(best_fit)
        
    return best_lots, best_metrics, fitness_history

