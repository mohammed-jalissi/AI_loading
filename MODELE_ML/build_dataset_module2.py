"""
========================================================================
MODULE 2 — CONSTRUCTION DU DATASET D'ENTRAÎNEMENT
Détection d'Anomalies — AI Loading Planner | JPH / OCP Group
========================================================================
Description :
    Ce script reconstruit, depuis la base arrêts 2025 (Stops_ocp.xlsx),
    un dataset structuré en séries temporelles (granularité jour × axe)
    prêt pour l'entraînement de modèles de détection d'anomalies.

Étapes :
    1. Chargement & nettoyage de la base arrêts
    2. Classification des anomalies (labellisation 0/1 + type)
    3. Reconstruction des séries temporelles (jour × axe)
    4. Feature Engineering (14 variables explicatives)
    5. Analyse du déséquilibre des classes
    6. Export du dataset final (CSV + Excel)
    7. Rapport statistique complet (JSON + TXT)

Sortie :
    outputs/
    ├── dataset_module2_final.csv          ← dataset ML prêt à l'emploi
    ├── dataset_module2_final.xlsx         ← version Excel annotée
    ├── dataset_anomalies_only.csv         ← arrêts anomalies isolés
    ├── rapport_dataset_module2.txt        ← rapport statistique complet
    └── figures/                           ← visualisations diagnostiques

Auteur : [Votre Nom] | JPH OCP Group | 2025
========================================================================
"""

# ─────────────────────────────────────────────────────────
# 0. IMPORTS & CONFIGURATION
# ─────────────────────────────────────────────────────────
import warnings
warnings.filterwarnings("ignore")

import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
from scipy.stats import chi2_contingency
from collections import defaultdict
from datetime import datetime, timedelta, time

# ── Chemins ──────────────────────────────────────────────
FILE_PATH = r"C:\Users\LENOVO\Desktop\Stops_ocp.xlsx"
os.makedirs("outputs", exist_ok=True)
os.makedirs("outputs/figures", exist_ok=True)

# ── Palette OCP ──────────────────────────────────────────
COLORS = {
    "normal"    : "#0077C8",
    "anomalie"  : "#E74C3C",
    "warning"   : "#F7941D",
    "ok"        : "#00A651",
    "primary"   : "#003F7D",
    "light"     : "#EBF3FA",
    "grid"      : "#DEE2E6",
}

ANOMALY_TYPE_COLORS = {
    "epuisement_stock" : "#E74C3C",
    "rupture_bande"    : "#C0392B",
    "defaut_electrique": "#E67E22",
    "defaut_mecanique" : "#8E44AD",
    "normal"           : "#0077C8",
}

plt.rcParams.update({
    "figure.facecolor" : "white",
    "axes.facecolor"   : "#FAFBFC",
    "axes.grid"        : True,
    "grid.color"       : COLORS["grid"],
    "grid.linewidth"   : 0.5,
    "font.size"        : 10,
    "axes.titlesize"   : 12,
    "axes.titleweight" : "bold",
    "savefig.dpi"      : 300,
    "savefig.bbox"     : "tight",
})


# ─────────────────────────────────────────────────────────
# 1. CHARGEMENT & NETTOYAGE
# ─────────────────────────────────────────────────────────
def load_and_clean(filepath: str) -> pd.DataFrame:
    """
    Charge la base arrêts et applique le nettoyage complet.

    Colonnes sources :
        Date, Poste, Hall, Axe (RCx/TBx), Début, Fin,
        Durée h:mm, Durée h, Cause, Nature,
        Navire, Sous-qualité, Qualité, Quai,
        Niveau1, Niveau2, Niveau3, Day, Week, Month
    """
    print("─" * 65)
    print("  ÉTAPE 1 — Chargement et nettoyage des données")
    print("─" * 65)

    df = pd.read_excel(filepath, sheet_name="Stops_ocp")
    n_raw = len(df)
    print(f"  ► Lignes brutes chargées : {n_raw:,}")

    # ── Renommage des colonnes ────────────────────────────
    df.rename(columns={
        "Axe (RCx/TBx)" : "axe",
        "Durée h"        : "duree_h",
        "Durée h:mm"     : "duree_hm",
        "Sous-qualité"   : "sous_qualite",
        "Niveau1"        : "niveau1",
        "Niveau2"        : "niveau2",
        "Niveau3"        : "niveau3",
    }, inplace=True)

    # ── Typage & nettoyage colonnes texte ─────────────────
    for col in ["Cause", "Nature", "Qualité", "Hall",
                "Navire", "sous_qualite", "Quai",
                "niveau1", "niveau2", "niveau3"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    # Normalisation Qualité (corriger casses mixtes)
    qualite_map = {
        "map": "MAP", "dap": "DAP", "tsp": "TSP",
        "nps": "NPS", "npk": "NPK", "dao": "DAP",
        "dpa": "DAP", "mar": "MAP", "nok": "NPK",
        "nnp": "NPS", " ts": "TSP",
    }
    df["Qualité"] = df["Qualité"].apply(
        lambda x: qualite_map.get(x.lower(), x.upper()) if isinstance(x, str) else x
    )
    df["Qualité"] = df["Qualité"].replace(
        {"ASP": "MAP", "CIV": "NPK", "AP": "DAP",
         "NP": "NPS", "MAR": "MAP", "TNP": "NPK"}
    )

    # Normalisation Nature (casses)
    nature_map = {"par le bord": "Par le bord", "ms": "MS",
                  "mes": "MES", "mp": "MP", "es": "ES",
                  "mauvais temps": "Mauvais temps", "qualité": "Qualité"}
    df["Nature"] = df["Nature"].apply(
        lambda x: nature_map.get(x.lower(), x) if isinstance(x, str) else x
    )

    # ── Reconstruction datetime complet ───────────────────
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

    def time_to_timedelta(t):
        """Convertit time/datetime/timedelta → timedelta depuis minuit."""
        if isinstance(t, time):
            return timedelta(hours=t.hour, minutes=t.minute, seconds=t.second)
        elif isinstance(t, datetime):
            return timedelta(hours=t.hour, minutes=t.minute, seconds=t.second)
        elif isinstance(t, timedelta):
            return t
        return pd.NaT

    df["debut_td"]  = df["Début"].apply(time_to_timedelta)
    df["fin_td"]    = df["Fin"].apply(time_to_timedelta)
    df["datetime_debut"] = df["Date"] + df["debut_td"].apply(
        lambda x: x if pd.notna(x) else timedelta(0)
    )
    df["heure_debut"] = df["debut_td"].apply(
        lambda x: x.seconds / 3600 if pd.notna(x) else np.nan
    )

    # ── Variables temporelles ─────────────────────────────
    df["annee"]     = df["Date"].dt.year
    df["mois"]      = df["Date"].dt.month
    df["semaine"]   = df["Date"].dt.isocalendar().week.astype(int)
    df["jour_sem"]  = df["Date"].dt.dayofweek          # 0=Lun, 6=Dim
    df["jour_annee"]= df["Date"].dt.dayofyear
    df["heure_sin"] = np.sin(2 * np.pi * df["heure_debut"] / 24)
    df["heure_cos"] = np.cos(2 * np.pi * df["heure_debut"] / 24)

    # ── Nettoyage duree_h ─────────────────────────────────
    df["duree_h"] = pd.to_numeric(df["duree_h"], errors="coerce")
    df.loc[df["duree_h"] < 0,    "duree_h"] = np.nan
    df.loc[df["duree_h"] > 30,   "duree_h"] = np.nan   # outliers aberrants
    df["duree_h"].fillna(df["duree_h"].median(), inplace=True)

    # ── Suppression des lignes sans date ──────────────────
    df.dropna(subset=["Date", "axe"], inplace=True)
    df = df[df["annee"] == 2025].copy()

    n_clean = len(df)
    print(f"  ► Lignes après nettoyage  : {n_clean:,} "
          f"(supprimé {n_raw - n_clean} lignes invalides)")
    print(f"  ► Période               : {df['Date'].min().date()} → {df['Date'].max().date()}")
    print(f"  ► Axes concernés        : {sorted(df['axe'].unique())}")
    print(f"  ► Qualités              : {sorted(df['Qualité'].unique())}")
    return df


# ─────────────────────────────────────────────────────────
# 2. LABELLISATION DES ANOMALIES
# ─────────────────────────────────────────────────────────
def label_anomalies(df: pd.DataFrame) -> pd.DataFrame:
    """
    Labellise chaque arrêt selon la taxonomie d'anomalies JPH :

    Label (colonne 'anomalie') :
        0 = arrêt normal (planifié, opérationnel, météo, qualité)
        1 = anomalie (épuisement stock, rupture bande, défaut équipement)

    Colonne 'type_anomalie' :
        'normal'            → arrêts planifiés / opérationnels
        'epuisement_stock'  → stock insuffisant avant fin chargement
        'rupture_bande'     → rupture physique d'un convoyeur (bande)
        'defaut_electrique' → défaut électrique / animation / capteur
        'defaut_mecanique'  → surchauffe, vibration, blocage mécanique

    Justification opérationnelle :
        - Les arrêts "Par le bord", "CTE", "Changement de cale",
          "Mauvais temps", "Arrêt INTERTEK", "ES", "MS" etc. sont
          des arrêts PLANIFIÉS ou CONTEXTUELS → label 0
        - L'épuisement de stock est une anomalie de gestion de flux
          → impacte directement la cadence → label 1
        - Les ruptures de bande sont des pannes critiques immédiates
          → label 1 (classe critique)
        - Les défauts électriques/mécaniques sont des pannes équipement
          → label 1
    """
    print("\n" + "─" * 65)
    print("  ÉTAPE 2 — Labellisation des anomalies")
    print("─" * 65)

    cause_low = df["Cause"].str.lower().fillna("")

    # ── Règles de détection ───────────────────────────────

    # Anomalie 1 : Épuisement de stock
    mask_epuisement = cause_low.str.contains(
        r"epuisement|épuisement|epuisement de stock|epuisement stok|"
        r"epuisement stock|stock épuisé|stock epuise",
        regex=True
    )

    # Anomalie 2 : Rupture de bande convoyeur
    mask_rupture = cause_low.str.contains(
        r"rupture bande|rupture cv|rupture tapis|dechirure|déchirure",
        regex=True
    )

    # Anomalie 3 : Défaut électrique / supervision
    mask_defaut_elec = cause_low.str.contains(
        r"défaut électrique|defaut electrique|défaut animation|"
        r"défaut translation|défaut capteur|defaut superviseur|"
        r"défaut superviseur|défaut détection|defaut detection|"
        r"défaut alimentation|defaut alimentation|coupure électrique|"
        r"court circuit|défaut moteur|defaut moteur|défaut variateur",
        regex=True
    )

    # Anomalie 4 : Défaut mécanique (surchauffe, vibration, blocage)
    mask_defaut_mec = cause_low.str.contains(
        r"surchauffe|vibration|échauffement|echauffement|"
        r"blocage|coincement|bourrage|brûlure|brulure|"
        r"dégradation|degradation mécanique",
        regex=True
    )

    # ── Agrégation des masques ────────────────────────────
    df = df.copy()
    df["anomalie"] = 0
    df["type_anomalie"] = "normal"

    # Ordre d'application (priorité décroissante)
    df.loc[mask_defaut_mec,  "anomalie"] = 1
    df.loc[mask_defaut_mec,  "type_anomalie"] = "defaut_mecanique"

    df.loc[mask_defaut_elec, "anomalie"] = 1
    df.loc[mask_defaut_elec, "type_anomalie"] = "defaut_electrique"

    df.loc[mask_rupture,     "anomalie"] = 1
    df.loc[mask_rupture,     "type_anomalie"] = "rupture_bande"

    df.loc[mask_epuisement,  "anomalie"] = 1
    df.loc[mask_epuisement,  "type_anomalie"] = "epuisement_stock"

    # ── Colonne gravité ───────────────────────────────────
    # Pondération selon impact opérationnel JPH
    gravite_map = {
        "normal"           : 0,
        "epuisement_stock" : 2,   # impact moyen : stoppable par ré-affectation
        "defaut_electrique": 3,   # impact fort  : nécessite intervention technique
        "rupture_bande"    : 4,   # impact critique : arrêt total de l'axe
        "defaut_mecanique" : 4,   # impact critique : risque sécurité
    }
    df["gravite"] = df["type_anomalie"].map(gravite_map)

    # ── Colonne arrêt_critique (durée × gravité) ─────────
    df["arret_critique"] = ((df["anomalie"] == 1) & (df["duree_h"] > 1)).astype(int)

    # ── Rapport de labellisation ──────────────────────────
    counts = df.groupby(["type_anomalie", "anomalie"]).size()
    print("\n  Distribution des labels :")
    print(f"  {'Type':30s}  {'N':>6}  {'% total':>8}")
    print("  " + "-" * 50)
    for typ, count in df["type_anomalie"].value_counts().items():
        pct = count / len(df) * 100
        print(f"  {typ:30s}  {count:>6,}  {pct:>7.2f}%")
    print("  " + "─" * 50)
    n_anom = df["anomalie"].sum()
    n_norm = (df["anomalie"] == 0).sum()
    ratio  = n_norm / n_anom if n_anom > 0 else np.inf
    print(f"  {'TOTAL anomalies (label=1)':30s}  {n_anom:>6,}  "
          f"{n_anom/len(df)*100:>7.2f}%")
    print(f"  {'TOTAL normaux   (label=0)':30s}  {n_norm:>6,}  "
          f"{n_norm/len(df)*100:>7.2f}%")
    print(f"\n  ► Ratio normal/anomalie : {ratio:.1f}:1  "
          f"→ déséquilibre {'fort' if ratio > 10 else 'modéré'} "
          f"{'→ SMOTE recommandé' if ratio > 10 else ''}")

    return df


# ─────────────────────────────────────────────────────────
# 3. RECONSTRUCTION SÉRIES TEMPORELLES (GRANULARITÉ JOUR×AXE)
# ─────────────────────────────────────────────────────────
def build_time_series(df: pd.DataFrame) -> pd.DataFrame:
    """
    Reconstruit une série temporelle continue (grille complète jour × axe)
    avec agrégation des arrêts et features calculées.

    Granularité : 1 ligne = 1 jour × 1 axe
    Couverture  : 1er janvier 2025 → 31 décembre 2025
    Axes        : 1, 2, 3, 4, 5, 6

    Variables agrégées :
        - nb_arrets_total      : nombre total d'arrêts dans la journée
        - nb_arrets_anomalie   : arrêts de type anomalie (label=1)
        - duree_totale_h       : durée cumulée de tous les arrêts (h)
        - duree_anomalie_h     : durée cumulée des arrêts anomalie (h)
        - duree_max_h          : durée du plus long arrêt de la journée
        - nb_epuisement        : arrêts épuisement stock
        - nb_rupture           : arrêts rupture bande
        - nb_defaut_elec       : arrêts défaut électrique
        - nb_defaut_mec        : arrêts défaut mécanique
        - label                : 1 si ≥1 anomalie critique dans la journée
    """
    print("\n" + "─" * 65)
    print("  ÉTAPE 3 — Reconstruction des séries temporelles (Jour × Axe)")
    print("─" * 65)

    axes = [1, 2, 3, 4, 5, 6]
    dates = pd.date_range("2025-01-01", "2025-12-31", freq="D")
    grid  = pd.MultiIndex.from_product([dates, axes], names=["Date", "axe"])
    ts    = pd.DataFrame(index=grid).reset_index()
    ts["mois"]       = ts["Date"].dt.month
    ts["jour_sem"]   = ts["Date"].dt.dayofweek
    ts["jour_annee"] = ts["Date"].dt.dayofyear
    ts["semaine"]    = ts["Date"].dt.isocalendar().week.astype(int)
    ts["heure_sin"]  = 0.0   # sera rempli avec heure moyenne des arrêts
    ts["heure_cos"]  = 1.0

    # ── Agrégation des arrêts par jour × axe ─────────────
    def safe_agg(x, func):
        return func(x) if len(x) > 0 else 0.0

    agg = df.groupby(["Date", "axe"]).agg(
        nb_arrets_total     =("duree_h",       "count"),
        duree_totale_h      =("duree_h",       "sum"),
        duree_max_h         =("duree_h",       "max"),
        duree_moy_h         =("duree_h",       "mean"),
        nb_arrets_anomalie  =("anomalie",      "sum"),
        duree_anomalie_h    =("duree_h",       lambda x: x[df.loc[x.index, "anomalie"] == 1].sum()),
        nb_epuisement       =("type_anomalie", lambda x: (x == "epuisement_stock").sum()),
        nb_rupture          =("type_anomalie", lambda x: (x == "rupture_bande").sum()),
        nb_defaut_elec      =("type_anomalie", lambda x: (x == "defaut_electrique").sum()),
        nb_defaut_mec       =("type_anomalie", lambda x: (x == "defaut_mecanique").sum()),
        gravite_max         =("gravite",       "max"),
        nb_arrets_critiques =("arret_critique","sum"),
        heure_debut_moy     =("heure_debut",   "mean"),
        nb_natures_uniques  =("Nature",        "nunique"),
        nb_causes_uniques   =("Cause",         "nunique"),
    ).reset_index()

    # ── Merge sur la grille complète ──────────────────────
    ts = ts.merge(agg, on=["Date", "axe"], how="left")

    # Remplissage des journées sans arrêt → zéro
    fill_cols = ["nb_arrets_total", "duree_totale_h", "duree_max_h",
                 "duree_moy_h", "nb_arrets_anomalie", "duree_anomalie_h",
                 "nb_epuisement", "nb_rupture", "nb_defaut_elec",
                 "nb_defaut_mec", "gravite_max", "nb_arrets_critiques",
                 "nb_natures_uniques", "nb_causes_uniques"]
    ts[fill_cols] = ts[fill_cols].fillna(0)
    ts["heure_debut_moy"] = ts["heure_debut_moy"].fillna(12.0)

    # ── Heure sin/cos basée sur heure moyenne des arrêts ─
    ts["heure_sin"] = np.sin(2 * np.pi * ts["heure_debut_moy"] / 24)
    ts["heure_cos"] = np.cos(2 * np.pi * ts["heure_debut_moy"] / 24)

    # ── Label journalier ──────────────────────────────────
    # 1 si la journée contient au moins 1 anomalie ET durée > seuil
    ts["label"] = ((ts["nb_arrets_anomalie"] >= 1) &
                   (ts["duree_anomalie_h"] > 0.5)).astype(int)

    print(f"  ► Grille complète        : {len(ts):,} lignes (365 jours × 6 axes)")
    print(f"  ► Journées avec arrêts   : {(ts['nb_arrets_total'] > 0).sum():,}")
    print(f"  ► Journées sans arrêt    : {(ts['nb_arrets_total'] == 0).sum():,}")
    print(f"  ► Journées anomalie (1)  : {ts['label'].sum():,}  "
          f"({ts['label'].mean()*100:.1f}%)")
    print(f"  ► Journées normales (0)  : {(ts['label']==0).sum():,}  "
          f"({(ts['label']==0).mean()*100:.1f}%)")

    return ts


# ─────────────────────────────────────────────────────────
# 4. FEATURE ENGINEERING — 20 VARIABLES EXPLICATIVES
# ─────────────────────────────────────────────────────────
def feature_engineering(ts: pd.DataFrame, df_raw: pd.DataFrame) -> pd.DataFrame:
    """
    Construit les 20 features explicatives pour le modèle de détection.

    Variables construites :
    ┌─────────────────────────────────────────────────────┐
    │ GROUPE A — Performance opérationnelle               │
    │   F1  : nb_arrets_total      (brut)                 │
    │   F2  : duree_totale_h       (brut)                 │
    │   F3  : duree_max_h          (brut)                 │
    │   F4  : taux_disponibilite   = 1 - duree/24         │
    │   F5  : ratio_arret_anomalie = nb_anom / nb_total   │
    │                                                     │
    │ GROUPE B — Rolling window (contexte historique)     │
    │   F6  : roll_3j_nb_arrets    (moyenne glissante 3j) │
    │   F7  : roll_7j_nb_arrets    (moyenne glissante 7j) │
    │   F8  : roll_3j_duree        (moyenne glissante 3j) │
    │   F9  : roll_7j_duree        (moyenne glissante 7j) │
    │   F10 : roll_7j_nb_anomalie  (somme glissante 7j)   │
    │   F11 : pente_arrets_3j      (tendance lineaire)    │
    │                                                     │
    │ GROUPE C — Mémoire des incidents                    │
    │   F12 : duree_depuis_last_arret  (jours)            │
    │   F13 : duree_depuis_last_anomalie (jours)          │
    │   F14 : cumul_arrets_7j                             │
    │                                                     │
    │ GROUPE D — Temporel / cyclique                      │
    │   F15 : heure_sin            (cyclique 24h)         │
    │   F16 : heure_cos            (cyclique 24h)         │
    │   F17 : mois_sin             (cyclique 12 mois)     │
    │   F18 : mois_cos             (cyclique 12 mois)     │
    │   F19 : est_weekend          (0/1)                  │
    │                                                     │
    │ GROUPE E — Contexte axe                             │
    │   F20 : axe_encoded          (identité de l'axe)    │
    └─────────────────────────────────────────────────────┘
    """
    print("\n" + "─" * 65)
    print("  ÉTAPE 4 — Feature Engineering (20 variables)")
    print("─" * 65)

    ts = ts.sort_values(["axe", "Date"]).copy()

    for axe_id in sorted(ts["axe"].unique()):
        mask = ts["axe"] == axe_id
        sub  = ts.loc[mask].copy()

        # ── F4 : Taux de disponibilité ────────────────────
        ts.loc[mask, "taux_disponibilite"] = (
            1 - (sub["duree_totale_h"] / 24).clip(0, 1)
        )

        # ── F5 : Ratio arrêts anomalie ────────────────────
        ts.loc[mask, "ratio_arret_anomalie"] = np.where(
            sub["nb_arrets_total"] > 0,
            sub["nb_arrets_anomalie"] / sub["nb_arrets_total"],
            0
        )

        # ── F6–F11 : Rolling windows ──────────────────────
        ts.loc[mask, "roll_3j_nb_arrets"] = (
            sub["nb_arrets_total"].rolling(3, min_periods=1).mean()
        )
        ts.loc[mask, "roll_7j_nb_arrets"] = (
            sub["nb_arrets_total"].rolling(7, min_periods=1).mean()
        )
        ts.loc[mask, "roll_3j_duree"] = (
            sub["duree_totale_h"].rolling(3, min_periods=1).mean()
        )
        ts.loc[mask, "roll_7j_duree"] = (
            sub["duree_totale_h"].rolling(7, min_periods=1).mean()
        )
        ts.loc[mask, "roll_7j_nb_anomalie"] = (
            sub["nb_arrets_anomalie"].rolling(7, min_periods=1).sum()
        )

        # ── F11 : Pente linéaire 3j du nb d'arrêts ───────
        def slope_3(x):
            if len(x) < 2:
                return 0.0
            y = np.array(x)
            t = np.arange(len(y))
            try:
                return np.polyfit(t, y, 1)[0]
            except Exception:
                return 0.0

        ts.loc[mask, "pente_arrets_3j"] = (
            sub["nb_arrets_total"].rolling(3, min_periods=2).apply(slope_3, raw=True)
        )

        # ── F12 : Jours depuis dernier arrêt ─────────────
        arr_days = sub["nb_arrets_total"].values
        jours_depuis_arret = np.zeros(len(sub))
        last = 0
        for i, v in enumerate(arr_days):
            if v > 0:
                last = 0
            else:
                last += 1
            jours_depuis_arret[i] = last
        ts.loc[mask, "duree_depuis_last_arret"] = jours_depuis_arret

        # ── F13 : Jours depuis dernière anomalie ──────────
        anom_days = sub["nb_arrets_anomalie"].values
        jours_depuis_anom = np.zeros(len(sub))
        last = 0
        for i, v in enumerate(anom_days):
            if v > 0:
                last = 0
            else:
                last += 1
            jours_depuis_anom[i] = last
        ts.loc[mask, "duree_depuis_last_anomalie"] = jours_depuis_anom

        # ── F14 : Cumul d'arrêts sur 7 jours ─────────────
        ts.loc[mask, "cumul_arrets_7j"] = (
            sub["nb_arrets_total"].rolling(7, min_periods=1).sum()
        )

    # ── F17–F18 : Cyclique mensuel ────────────────────────
    ts["mois_sin"] = np.sin(2 * np.pi * ts["mois"] / 12)
    ts["mois_cos"] = np.cos(2 * np.pi * ts["mois"] / 12)

    # ── F19 : Weekend ─────────────────────────────────────
    ts["est_weekend"] = (ts["jour_sem"] >= 5).astype(int)

    # ── F20 : Encodage axe ────────────────────────────────
    ts["axe_encoded"] = ts["axe"].astype(int)

    # ── Remplissage NaN résiduels ─────────────────────────
    feature_cols = [
        "nb_arrets_total", "duree_totale_h", "duree_max_h",
        "taux_disponibilite", "ratio_arret_anomalie",
        "roll_3j_nb_arrets", "roll_7j_nb_arrets",
        "roll_3j_duree", "roll_7j_duree", "roll_7j_nb_anomalie",
        "pente_arrets_3j", "duree_depuis_last_arret",
        "duree_depuis_last_anomalie", "cumul_arrets_7j",
        "heure_sin", "heure_cos", "mois_sin", "mois_cos",
        "est_weekend", "axe_encoded",
    ]
    for col in feature_cols:
        if col in ts.columns:
            ts[col] = ts[col].fillna(0)

    print("  ► Features construites :")
    groups = {
        "A — Performance opérationnelle (F1–F5)"   : ["nb_arrets_total","duree_totale_h","duree_max_h","taux_disponibilite","ratio_arret_anomalie"],
        "B — Rolling windows (F6–F11)"             : ["roll_3j_nb_arrets","roll_7j_nb_arrets","roll_3j_duree","roll_7j_duree","roll_7j_nb_anomalie","pente_arrets_3j"],
        "C — Mémoire incidents (F12–F14)"          : ["duree_depuis_last_arret","duree_depuis_last_anomalie","cumul_arrets_7j"],
        "D — Cyclique temporel (F15–F19)"          : ["heure_sin","heure_cos","mois_sin","mois_cos","est_weekend"],
        "E — Contexte axe (F20)"                   : ["axe_encoded"],
    }
    for grp, cols in groups.items():
        present = [c for c in cols if c in ts.columns]
        print(f"     {grp} : {len(present)} features")

    return ts, feature_cols


# ─────────────────────────────────────────────────────────
# 5. ANALYSE DU DÉSÉQUILIBRE & TEST χ²
# ─────────────────────────────────────────────────────────
def analyse_desequilibre(ts: pd.DataFrame, df_raw: pd.DataFrame) -> dict:
    """
    Analyse du déséquilibre des classes et tests statistiques.
    """
    print("\n" + "─" * 65)
    print("  ÉTAPE 5 — Analyse du déséquilibre & Tests statistiques")
    print("─" * 65)

    rapport = {}

    # ── Déséquilibre global ───────────────────────────────
    n_total = len(ts)
    n_anom  = ts["label"].sum()
    n_norm  = n_total - n_anom
    ratio   = n_norm / n_anom if n_anom > 0 else np.inf

    rapport["desequilibre"] = {
        "n_total"          : int(n_total),
        "n_anomalie"       : int(n_anom),
        "n_normal"         : int(n_norm),
        "pct_anomalie"     : round(n_anom / n_total * 100, 2),
        "ratio_normal_anom": round(ratio, 1),
        "recommandation"   : "SMOTE" if ratio > 5 else "class_weight",
    }

    print(f"\n  Déséquilibre des classes :")
    print(f"     Normal    (0) : {n_norm:,}  ({n_norm/n_total*100:.1f}%)")
    print(f"     Anomalie  (1) : {n_anom:,}  ({n_anom/n_total*100:.1f}%)")
    print(f"     Ratio N/A     : {ratio:.1f}:1")
    print(f"     Recommandation: {rapport['desequilibre']['recommandation']}")

    # ── Déséquilibre par axe ──────────────────────────────
    print("\n  Déséquilibre par axe :")
    print(f"  {'Axe':>5}  {'N total':>8}  {'N anomalie':>10}  {'% anom':>7}")
    print("  " + "─" * 38)
    axe_stats = {}
    for ax in sorted(ts["axe"].unique()):
        sub   = ts[ts["axe"] == ax]
        n_a   = sub["label"].sum()
        n_t   = len(sub)
        axe_stats[int(ax)] = {"n_total": int(n_t), "n_anomalie": int(n_a),
                              "pct": round(n_a/n_t*100, 1)}
        print(f"  {'TB'+str(ax) if ax<=3 else 'Axe'+str(ax-3):>5}  "
              f"{n_t:>8,}  {n_a:>10,}  {n_a/n_t*100:>6.1f}%")
    rapport["par_axe"] = axe_stats

    # ── Test χ² : anomalies dépendent-elles de l'heure ? ─
    print("\n  Test χ² : dépendance anomalie × tranche horaire")
    df_raw_copy = df_raw.copy()
    df_raw_copy["tranche_h"] = pd.cut(
        df_raw_copy["heure_debut"].fillna(12),
        bins=[0, 6, 12, 18, 24],
        labels=["Nuit (0-6h)", "Matin (6-12h)",
                "Après-midi (12-18h)", "Soir (18-24h)"]
    )
    ct = pd.crosstab(df_raw_copy["tranche_h"], df_raw_copy["anomalie"])
    if ct.shape[1] == 2 and ct.shape[0] >= 2:
        chi2, p_val, dof, expected = chi2_contingency(ct)
        print(f"     χ² = {chi2:.2f}  |  ddl = {dof}  |  p-value = {p_val:.4f}")
        interpretation = ("significatif (α=5%)" if p_val < 0.05
                          else "non significatif (α=5%)")
        print(f"     Résultat : {interpretation}")
        print("     → L'heure de la journée "
              + ("influence" if p_val < 0.05 else "n'influence pas")
              + " significativement la survenue d'anomalies.")
        rapport["chi2_heure"] = {
            "chi2": round(chi2, 3), "p_value": round(p_val, 4),
            "dof": dof, "significatif": bool(p_val < 0.05)
        }

    # ── Distribution temporelle des anomalies ─────────────
    rapport["distribution_mensuelle"] = (
        ts.groupby("mois")["label"].agg(["sum", "count"])
        .rename(columns={"sum": "n_anomalie", "count": "n_total"})
        .assign(pct=lambda x: (x["n_anomalie"]/x["n_total"]*100).round(1))
        .to_dict()
    )

    return rapport


# ─────────────────────────────────────────────────────────
# 6. VISUALISATIONS DIAGNOSTIQUES
# ─────────────────────────────────────────────────────────
def generate_figures(ts: pd.DataFrame, df_raw: pd.DataFrame):
    """Génère les 4 figures diagnostiques du dataset."""
    print("\n" + "─" * 65)
    print("  ÉTAPE 6 — Génération des figures diagnostiques")
    print("─" * 65)

    # ── Figure A : Déséquilibre des classes ───────────────
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    fig.suptitle("Figure 5.1-A — Analyse du Déséquilibre des Classes (Dataset Module 2)",
                 fontsize=13, fontweight="bold", color=COLORS["primary"])

    # Pie global
    ax = axes[0]
    sizes = [ts["label"].sum(), (ts["label"]==0).sum()]
    cols  = [COLORS["anomalie"], COLORS["normal"]]
    wedges, texts, autos = ax.pie(
        sizes, labels=None, colors=cols, autopct="%1.1f%%",
        pctdistance=0.75, startangle=90,
        wedgeprops=dict(linewidth=2, edgecolor="white"), explode=[0.05, 0]
    )
    for at in autos:
        at.set_fontsize(11); at.set_fontweight("bold"); at.set_color("white")
    ax.legend(wedges, [f"Anomalie (1) = {sizes[0]:,}", f"Normal  (0) = {sizes[1]:,}"],
              loc="lower center", bbox_to_anchor=(0.5, -0.12), fontsize=9)
    ax.set_title("Déséquilibre global\n(Jour × Axe)", fontsize=11)

    # Par axe
    ax2 = axes[1]
    axe_df = ts.groupby("axe")["label"].agg(["sum", "count"]).reset_index()
    axe_df["pct"] = axe_df["sum"] / axe_df["count"] * 100
    axe_labels = [f"TB{a}" if a <= 3 else f"RC{a-3}" for a in axe_df["axe"]]
    bars = ax2.bar(axe_labels, axe_df["pct"],
                   color=[COLORS["anomalie"] if p > 15 else COLORS["warning"]
                          for p in axe_df["pct"]],
                   edgecolor="white", width=0.6)
    for bar, pct, n in zip(bars, axe_df["pct"], axe_df["sum"]):
        ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
                 f"{pct:.1f}%\n({n})", ha="center", va="bottom", fontsize=9)
    ax2.set_ylabel("% journées anomalie", labelpad=8)
    ax2.set_title("% anomalie par axe", fontsize=11)
    ax2.set_ylim(0, axe_df["pct"].max() * 1.3)

    # Distribution mensuelle
    ax3 = axes[2]
    monthly = ts.groupby("mois")["label"].agg(["sum", "count"]).reset_index()
    monthly["pct"] = monthly["sum"] / monthly["count"] * 100
    mois_labels = ["Jan","Fév","Mar","Avr","Mai","Jun",
                   "Jul","Aoû","Sep","Oct","Nov","Déc"]
    ax3.bar(range(1, 13), monthly.set_index("mois")["pct"].reindex(range(1,13), fill_value=0),
            color=COLORS["warning"], edgecolor="white", width=0.7)
    ax3.set_xticks(range(1, 13))
    ax3.set_xticklabels([mois_labels[m-1] for m in range(1, 13)], rotation=45, ha="right")
    ax3.set_ylabel("% journées anomalie", labelpad=8)
    ax3.set_title("Saisonnalité des anomalies", fontsize=11)
    ax3.axhline(ts["label"].mean()*100, color=COLORS["anomalie"],
                lw=2, ls="--", label=f"Moyenne = {ts['label'].mean()*100:.1f}%")
    ax3.legend(fontsize=8)

    plt.tight_layout()
    plt.savefig("outputs/figures/fig_5_1_A_desequilibre_classes.png")
    plt.close()
    print("  ✅ Figure 5.1-A sauvegardée")

    # ── Figure B : Distribution des types d'anomalies (base arrêts) ──
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle("Figure 5.1-B — Distribution des Arrêts par Type d'Anomalie",
                 fontsize=13, fontweight="bold", color=COLORS["primary"])

    type_counts = df_raw["type_anomalie"].value_counts()
    colors_bar  = [ANOMALY_TYPE_COLORS.get(t, "#666") for t in type_counts.index]
    axes[0].barh(type_counts.index, type_counts.values, color=colors_bar,
                 edgecolor="white", height=0.6)
    for i, (v, t) in enumerate(zip(type_counts.values, type_counts.index)):
        axes[0].text(v + 5, i, f"{v:,} ({v/len(df_raw)*100:.1f}%)",
                     va="center", ha="left", fontsize=9)
    axes[0].set_xlabel("Nombre d'arrêts", labelpad=8)
    axes[0].set_title("Fréquence par type d'anomalie", fontsize=11)
    axes[0].invert_yaxis()

    # Durée cumulée par type
    type_duree = df_raw.groupby("type_anomalie")["duree_h"].sum().sort_values(ascending=False)
    colors_dur  = [ANOMALY_TYPE_COLORS.get(t, "#666") for t in type_duree.index]
    axes[1].barh(type_duree.index, type_duree.values, color=colors_dur,
                 edgecolor="white", height=0.6)
    for i, v in enumerate(type_duree.values):
        axes[1].text(v + 1, i, f"{v:.0f} h", va="center", ha="left", fontsize=9)
    axes[1].set_xlabel("Durée cumulée (heures)", labelpad=8)
    axes[1].set_title("Durée cumulée par type", fontsize=11)
    axes[1].invert_yaxis()

    plt.tight_layout()
    plt.savefig("outputs/figures/fig_5_1_B_types_anomalies.png")
    plt.close()
    print("  ✅ Figure 5.1-B sauvegardée")

    # ── Figure C : Séries temporelles des features ────────
    fig, axes = plt.subplots(3, 1, figsize=(16, 12), sharex=True)
    fig.suptitle("Figure 5.1-C — Séries Temporelles des Features Clés (Axe 1)",
                 fontsize=13, fontweight="bold", color=COLORS["primary"])

    ax1_data = ts[ts["axe"] == 1].set_index("Date").sort_index()
    dates_plot = ax1_data.index

    # Panneau 1 : nb arrêts + rolling 7j
    axes[0].bar(dates_plot, ax1_data["nb_arrets_total"], alpha=0.4,
                color=COLORS["normal"], label="Nb arrêts/jour")
    axes[0].plot(dates_plot, ax1_data["roll_7j_nb_arrets"],
                 color=COLORS["primary"], lw=2, label="Moyenne 7j")
    # Marquer les anomalies
    anom_dates = ax1_data[ax1_data["label"] == 1].index
    axes[0].scatter(anom_dates, ax1_data.loc[anom_dates, "nb_arrets_total"],
                    color=COLORS["anomalie"], s=40, zorder=5, label="Jour anomalie")
    axes[0].set_ylabel("Nb arrêts", labelpad=6)
    axes[0].legend(fontsize=8, loc="upper right")
    axes[0].set_title("Nombre d'arrêts journaliers — Axe 1", fontsize=10)

    # Panneau 2 : durée totale + taux disponibilité
    ax_twin = axes[1].twinx()
    axes[1].bar(dates_plot, ax1_data["duree_totale_h"], alpha=0.4,
                color=COLORS["warning"], label="Durée totale (h)")
    ax_twin.plot(dates_plot, ax1_data["taux_disponibilite"] * 100,
                 color=COLORS["ok"], lw=2, label="Taux dispo (%)")
    ax_twin.axhline(90, color="grey", lw=1, ls="--", alpha=0.6, label="Seuil 90%")
    axes[1].set_ylabel("Durée arrêts (h)", labelpad=6)
    ax_twin.set_ylabel("Taux dispo (%)", color=COLORS["ok"], labelpad=6)
    axes[1].legend(fontsize=8, loc="upper left")
    ax_twin.legend(fontsize=8, loc="upper right")
    axes[1].set_title("Durée arrêts & Taux de disponibilité — Axe 1", fontsize=10)

    # Panneau 3 : features mémoire
    axes[2].plot(dates_plot, ax1_data["roll_7j_nb_anomalie"],
                 color=COLORS["anomalie"], lw=2, label="Σ anomalies 7j glissants")
    axes[2].plot(dates_plot, ax1_data["duree_depuis_last_anomalie"],
                 color=COLORS["primary"], lw=1.5, ls="--", label="Jours depuis dernière anomalie")
    axes[2].set_ylabel("Valeur feature", labelpad=6)
    axes[2].legend(fontsize=8)
    axes[2].set_title("Features de mémoire d'incidents — Axe 1", fontsize=10)
    axes[2].set_xlabel("Date (2025)", labelpad=8)

    plt.tight_layout()
    plt.savefig("outputs/figures/fig_5_1_C_series_temporelles.png")
    plt.close()
    print("  ✅ Figure 5.1-C sauvegardée")

    # ── Figure D : Matrice de corrélation des features ────
    fig, ax = plt.subplots(figsize=(14, 11))
    fig.suptitle("Figure 5.1-D — Matrice de Corrélation des Features (Dataset ML)",
                 fontsize=13, fontweight="bold", color=COLORS["primary"])

    feature_cols = [
        "nb_arrets_total", "duree_totale_h", "duree_max_h",
        "taux_disponibilite", "ratio_arret_anomalie",
        "roll_3j_nb_arrets", "roll_7j_nb_arrets",
        "roll_3j_duree", "roll_7j_duree", "roll_7j_nb_anomalie",
        "pente_arrets_3j", "duree_depuis_last_arret",
        "duree_depuis_last_anomalie", "cumul_arrets_7j",
        "heure_sin", "heure_cos", "mois_sin", "mois_cos",
        "est_weekend", "axe_encoded", "label"
    ]
    present = [c for c in feature_cols if c in ts.columns]
    corr = ts[present].corr()

    mask = np.triu(np.ones_like(corr, dtype=bool))
    sns.heatmap(corr, mask=mask, annot=True, fmt=".2f",
                cmap=sns.diverging_palette(230, 20, as_cmap=True),
                center=0, square=True, linewidths=0.5,
                cbar_kws={"shrink": 0.8, "label": "Corrélation de Pearson"},
                ax=ax, annot_kws={"size": 7})
    ax.set_title("Corrélations entre features et label d'anomalie",
                 fontsize=11, pad=12)
    ax.tick_params(axis="x", rotation=45)
    ax.tick_params(axis="y", rotation=0)

    plt.tight_layout()
    plt.savefig("outputs/figures/fig_5_1_D_correlation_features.png")
    plt.close()
    print("  ✅ Figure 5.1-D sauvegardée")


# ─────────────────────────────────────────────────────────
# 7. EXPORT DU DATASET FINAL
# ─────────────────────────────────────────────────────────
def export_dataset(ts: pd.DataFrame, df_raw: pd.DataFrame,
                   feature_cols: list, rapport: dict):
    """
    Exporte le dataset final et génère le rapport statistique complet.
    """
    print("\n" + "─" * 65)
    print("  ÉTAPE 7 — Export du dataset final")
    print("─" * 65)

    # ── Colonnes du dataset ML final ─────────────────────
    id_cols = ["Date", "axe", "mois", "jour_sem", "semaine"]
    target  = ["label"]
    meta    = ["nb_arrets_anomalie", "duree_anomalie_h",
               "nb_epuisement", "nb_rupture",
               "nb_defaut_elec", "nb_defaut_mec",
               "gravite_max", "nb_arrets_critiques"]

    all_cols = id_cols + [c for c in feature_cols if c in ts.columns] + meta + target
    all_cols = [c for c in dict.fromkeys(all_cols) if c in ts.columns]

    dataset_final = ts[all_cols].copy()
    dataset_final = dataset_final.sort_values(["axe", "Date"]).reset_index(drop=True)

    # ── Export CSV ────────────────────────────────────────
    dataset_final.to_csv("outputs/dataset_module2_final.csv",
                         index=False, encoding="utf-8-sig")

    # ── Export Excel avec mise en forme ───────────────────
    with pd.ExcelWriter("outputs/dataset_module2_final.xlsx",
                        engine="openpyxl") as writer:
        dataset_final.to_excel(writer, sheet_name="Dataset_ML", index=False)
        df_raw[df_raw["anomalie"] == 1].to_excel(
            writer, sheet_name="Arrets_Anomalies", index=False)
        df_raw.to_excel(writer, sheet_name="Arrets_Bruts", index=False)

    # ── Export anomalies seulement ────────────────────────
    df_anom = dataset_final[dataset_final["label"] == 1]
    df_anom.to_csv("outputs/dataset_anomalies_only.csv",
                   index=False, encoding="utf-8-sig")

    # ── Rapport statistique TXT ───────────────────────────
    rapport["dataset_final"] = {
        "n_lignes"   : len(dataset_final),
        "n_features" : len(feature_cols),
        "n_anomalie" : int(dataset_final["label"].sum()),
        "n_normal"   : int((dataset_final["label"] == 0).sum()),
        "colonnes"   : all_cols,
    }

    with open("outputs/rapport_dataset_module2.txt", "w", encoding="utf-8") as f:
        f.write("=" * 70 + "\n")
        f.write("  RAPPORT — DATASET D'ENTRAÎNEMENT MODULE 2\n")
        f.write("  Détection d'Anomalies | AI Loading Planner | JPH OCP\n")
        f.write("  Généré le : " + datetime.now().strftime("%d/%m/%Y %H:%M") + "\n")
        f.write("=" * 70 + "\n\n")

        f.write("1. INFORMATIONS GÉNÉRALES\n")
        f.write("─" * 40 + "\n")
        f.write(f"   Granularité        : 1 ligne = 1 jour × 1 axe\n")
        f.write(f"   Période couverte   : 01/01/2025 → 31/12/2025\n")
        f.write(f"   Axes inclus        : 1, 2, 3, 4, 5, 6\n")
        f.write(f"   Lignes totales     : {rapport['dataset_final']['n_lignes']:,}\n")
        f.write(f"   Nombre de features : {rapport['dataset_final']['n_features']}\n\n")

        f.write("2. DISTRIBUTION DES LABELS\n")
        f.write("─" * 40 + "\n")
        d = rapport["desequilibre"]
        f.write(f"   Label 0 (Normal)   : {d['n_normal']:,}  ({100-d['pct_anomalie']:.1f}%)\n")
        f.write(f"   Label 1 (Anomalie) : {d['n_anomalie']:,}  ({d['pct_anomalie']:.1f}%)\n")
        f.write(f"   Ratio N/A          : {d['ratio_normal_anom']:.1f}:1\n")
        f.write(f"   Recommandation     : {d['recommandation']}\n\n")

        f.write("3. TYPES D'ANOMALIES (base arrêts bruts)\n")
        f.write("─" * 40 + "\n")
        f.write(f"   Épuisement de stock  : {rapport.get('n_epuisement', 'N/A')}\n")
        f.write(f"   Rupture de bande     : {rapport.get('n_rupture', 'N/A')}\n")
        f.write(f"   Défaut électrique    : {rapport.get('n_defaut_elec', 'N/A')}\n")
        f.write(f"   Défaut mécanique     : {rapport.get('n_defaut_mec', 'N/A')}\n\n")

        if "chi2_heure" in rapport:
            f.write("4. TEST χ² : ANOMALIE × HEURE\n")
            f.write("─" * 40 + "\n")
            chi = rapport["chi2_heure"]
            f.write(f"   χ² = {chi['chi2']}  |  ddl = {chi['dof']}  |  p = {chi['p_value']}\n")
            f.write(f"   Résultat : {'Significatif' if chi['significatif'] else 'Non significatif'} (α=5%)\n\n")

        f.write("5. LISTE DES COLONNES DU DATASET\n")
        f.write("─" * 40 + "\n")
        for i, col in enumerate(rapport["dataset_final"]["colonnes"], 1):
            f.write(f"   {i:02d}. {col}\n")

        f.write("\n" + "=" * 70 + "\n")
        f.write("  FIN DU RAPPORT\n")
        f.write("=" * 70 + "\n")

    print(f"\n  📁 Fichiers exportés dans outputs/ :")
    print(f"     ✅ dataset_module2_final.csv          ({len(dataset_final):,} lignes, "
          f"{len(all_cols)} colonnes)")
    print(f"     ✅ dataset_module2_final.xlsx         (3 feuilles)")
    print(f"     ✅ dataset_anomalies_only.csv         ({len(df_anom):,} lignes anomalie)")
    print(f"     ✅ rapport_dataset_module2.txt")
    print(f"     ✅ figures/ (4 figures PNG 300 dpi)")

    return dataset_final


# ─────────────────────────────────────────────────────────
# 8. PIPELINE PRINCIPAL
# ─────────────────────────────────────────────────────────
def run_pipeline(filepath: str = FILE_PATH):
    """
    Lance l'intégralité du pipeline de construction du dataset Module 2.
    """
    print("\n" + "=" * 65)
    print("  MODULE 2 — CONSTRUCTION DU DATASET D'ENTRAÎNEMENT")
    print("  Détection d'Anomalies | AI Loading Planner | JPH OCP")
    print("=" * 65)

    # Étape 1 : Chargement & nettoyage
    df = load_and_clean(filepath)

    # Étape 2 : Labellisation
    df = label_anomalies(df)

    # Enrichir le rapport avec les comptages bruts
    rapport_base = {
        "n_epuisement" : int((df["type_anomalie"] == "epuisement_stock").sum()),
        "n_rupture"    : int((df["type_anomalie"] == "rupture_bande").sum()),
        "n_defaut_elec": int((df["type_anomalie"] == "defaut_electrique").sum()),
        "n_defaut_mec" : int((df["type_anomalie"] == "defaut_mecanique").sum()),
    }

    # Étape 3 : Reconstruction séries temporelles
    ts = build_time_series(df)

    # Étape 4 : Feature engineering
    ts, feature_cols = feature_engineering(ts, df)

    # Étape 5 : Analyse déséquilibre
    rapport = analyse_desequilibre(ts, df)
    rapport.update(rapport_base)

    # Étape 6 : Figures
    generate_figures(ts, df)

    # Étape 7 : Export
    dataset_final = export_dataset(ts, df, feature_cols, rapport)

    print("\n" + "=" * 65)
    print("  ✅ PIPELINE TERMINÉ AVEC SUCCÈS")
    print("=" * 65 + "\n")

    # Aperçu final
    print("  APERÇU DU DATASET FINAL (5 premières lignes) :")
    print(dataset_final.head().to_string())
    print(f"\n  Shape : {dataset_final.shape}")
    print(f"  Label distribution : {dataset_final['label'].value_counts().to_dict()}")

    return dataset_final, df


# ─────────────────────────────────────────────────────────
# POINT D'ENTRÉE
# ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    dataset, df_raw = run_pipeline(FILE_PATH)
