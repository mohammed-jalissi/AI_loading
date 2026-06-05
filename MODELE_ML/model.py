"""
========================================================================
MODULE 2 — PIPELINE COMPLET D'ENTRAÎNEMENT & ÉVALUATION
Détection d'Anomalies | AI Loading Planner | JPH / OCP Group
========================================================================
Auteur  : [Votre Nom] | PFE 2025
Données : dataset_module2_final.csv (2190 lignes · 20 features · label 0/1)

PLAN DU SCRIPT :
    0. Configuration & Imports
    1. Chargement & Préparation
    2. Split Temporel (Train / Val / Test)
    3. Cross-Validation Temporelle (TimeSeriesSplit)
    4. Entraînement de 6 algorithmes
       ├── Phase 1 Non-supervisée  : Isolation Forest
       ├── Phase 2 Supervisée      : Random Forest, XGBoost,
       │                            LightGBM, SVM, KNN
       └── Baseline                : Dummy Classifier
    5. Évaluation complète (Precision, Recall, F1, AUC-ROC, AUC-PR)
    6. Test McNemar (comparaison statistique des meilleurs modèles)
    7. Sélection & Sauvegarde du meilleur modèle
    8. Interprétabilité SHAP
    9. Visualisations complètes (10 figures)
========================================================================
"""

# ─────────────────────────────────────────────────────────
# 0. IMPORTS & CONFIGURATION
# ─────────────────────────────────────────────────────────
import warnings
warnings.filterwarnings("ignore")

import os, time, json, joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns

# ── Scikit-learn ──────────────────────────────────────────
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.dummy import DummyClassifier
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import (TimeSeriesSplit, GridSearchCV,
                                     cross_val_predict)
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_auc_score, average_precision_score,
    precision_recall_curve, roc_curve,
    f1_score, precision_score, recall_score,
    ConfusionMatrixDisplay
)
from sklearn.inspection import permutation_importance
from statsmodels.stats.contingency_tables import mcnemar

# ── XGBoost & LightGBM ───────────────────────────────────
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

# ── SHAP ─────────────────────────────────────────────────
import shap

# ── Imbalanced-learn ─────────────────────────────────────
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

# ── Chemins ──────────────────────────────────────────────
DATA_PATH   = r"c:\Users\LENOVO\Downloads\files(1)\dataset_module2_final.csv"
OUTPUT_DIR  = r"c:\Users\LENOVO\Downloads\files(1)\module2_outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "figures"), exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "models"),  exist_ok=True)

# ── Palette OCP ──────────────────────────────────────────
OCP = {
    "primary"  : "#003F7D",
    "secondary": "#0077C8",
    "accent"   : "#00A651",
    "warning"  : "#F7941D",
    "danger"   : "#E74C3C",
    "light"    : "#EBF3FA",
    "dark"     : "#1A1A2E",
    "grid"     : "#DEE2E6",
}

MODEL_COLORS = {
    "IsolationForest" : "#8E44AD",
    "RandomForest"    : "#00A651",
    "XGBoost"         : "#E74C3C",
    "LightGBM"        : "#F7941D",
    "SVM"             : "#0077C8",
    "KNN"             : "#17A589",
    "Baseline"        : "#95A5A6",
}

plt.rcParams.update({
    "figure.facecolor" : "white",
    "axes.facecolor"   : "#FAFBFC",
    "axes.grid"        : True,
    "grid.color"       : OCP["grid"],
    "grid.linewidth"   : 0.5,
    "font.size"        : 10,
    "axes.titlesize"   : 12,
    "axes.titleweight" : "bold",
    "savefig.dpi"      : 300,
    "savefig.bbox"     : "tight",
    "savefig.facecolor": "white",
})

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

# ─────────────────────────────────────────────────────────
# FEATURES & TARGET
# ─────────────────────────────────────────────────────────
FEATURES = [
    # Groupe A — Performance opérationnelle
    "nb_arrets_total", "duree_totale_h", "duree_max_h",
    "taux_disponibilite", "ratio_arret_anomalie",
    # Groupe B — Rolling windows
    "roll_3j_nb_arrets", "roll_7j_nb_arrets",
    "roll_3j_duree", "roll_7j_duree",
    "roll_7j_nb_anomalie", "pente_arrets_3j",
    # Groupe C — Mémoire incidents
    "duree_depuis_last_arret", "duree_depuis_last_anomalie",
    "cumul_arrets_7j",
    # Groupe D — Cyclique temporel
    "heure_sin", "heure_cos", "mois_sin", "mois_cos",
    "est_weekend",
    # Groupe E — Contexte axe
    "axe_encoded",
]
TARGET = "label"

FEATURE_GROUPS = {
    "A — Performance"  : ["nb_arrets_total","duree_totale_h","duree_max_h","taux_disponibilite","ratio_arret_anomalie"],
    "B — Rolling"      : ["roll_3j_nb_arrets","roll_7j_nb_arrets","roll_3j_duree","roll_7j_duree","roll_7j_nb_anomalie","pente_arrets_3j"],
    "C — Mémoire"      : ["duree_depuis_last_arret","duree_depuis_last_anomalie","cumul_arrets_7j"],
    "D — Temporel"     : ["heure_sin","heure_cos","mois_sin","mois_cos","est_weekend"],
    "E — Axe"          : ["axe_encoded"],
}


# ═════════════════════════════════════════════════════════
# ÉTAPE 1 — CHARGEMENT & PRÉPARATION
# ═════════════════════════════════════════════════════════
def load_data(path: str) -> pd.DataFrame:
    print("\n" + "═"*65)
    print("  ÉTAPE 1 — Chargement & Préparation des données")
    print("═"*65)

    df = pd.read_csv(path, parse_dates=["Date"])
    df = df.sort_values(["axe", "Date"]).reset_index(drop=True)

    print(f"  ► Shape           : {df.shape}")
    print(f"  ► Période         : {df['Date'].min().date()} → {df['Date'].max().date()}")
    print(f"  ► Axes            : {sorted(df['axe'].unique())}")
    print(f"  ► Label 0 (normal)   : {(df[TARGET]==0).sum():,}  ({(df[TARGET]==0).mean()*100:.1f}%)")
    print(f"  ► Label 1 (anomalie) : {(df[TARGET]==1).sum():,}  ({(df[TARGET]==1).mean()*100:.1f}%)")
    print(f"  ► NaN dans features  : {df[FEATURES].isnull().sum().sum()}")

    # Vérification intégrité
    assert df[FEATURES].isnull().sum().sum() == 0, "Des NaN détectés dans les features !"
    assert df[TARGET].isin([0,1]).all(), "Label non binaire détecté !"
    print("  ► Vérifications intégrité : ✅ OK")

    return df


# ═════════════════════════════════════════════════════════
# ÉTAPE 2 — SPLIT TEMPOREL (Train 70% / Val 15% / Test 15%)
# ═════════════════════════════════════════════════════════
def temporal_split(df: pd.DataFrame):
    """
    Split temporel strict — JAMAIS de shuffle aléatoire.

    Justification académique :
        Les séries temporelles présentent une dépendance temporelle
        (autocorrélation). Un split aléatoire provoquerait du
        data leakage (le modèle verrait des données futures lors de
        l'entraînement), conduisant à des métriques artificiellement
        optimistes non représentatives du déploiement réel.

    Structure :
        ├── Train  : Jan → Sep 2025  (70%)  → entraînement + CV
        ├── Val    : Oct 2025        (15%)  → tuning hyperparamètres
        └── Test   : Nov → Déc 2025 (15%)  → évaluation finale
    """
    print("\n" + "═"*65)
    print("  ÉTAPE 2 — Split Temporel (70% / 15% / 15%)")
    print("═"*65)

    n       = len(df)
    i_train = int(n * 0.70)
    i_val   = int(n * 0.85)

    train = df.iloc[:i_train].copy()
    val   = df.iloc[i_train:i_val].copy()
    test  = df.iloc[i_val:].copy()

    X_train = train[FEATURES].values
    y_train = train[TARGET].values
    X_val   = val[FEATURES].values
    y_val   = val[TARGET].values
    X_test  = test[FEATURES].values
    y_test  = test[TARGET].values

    print(f"\n  {'Split':8s}  {'Lignes':>8}  {'Période':25s}  "
          f"{'% anomalie':>10}")
    print("  " + "─"*58)
    for name, subset in [("Train", train), ("Val", val), ("Test", test)]:
        pct = subset[TARGET].mean()*100
        period = f"{subset['Date'].min().date()} → {subset['Date'].max().date()}"
        print(f"  {name:8s}  {len(subset):>8,}  {period:25s}  {pct:>9.1f}%")

    # Scale pour SVM / KNN
    scaler  = RobustScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_val_sc   = scaler.transform(X_val)
    X_test_sc  = scaler.transform(X_test)

    # SMOTE sur train uniquement
    smote = SMOTE(random_state=RANDOM_STATE, k_neighbors=5)
    X_train_sm, y_train_sm = smote.fit_resample(X_train, y_train)
    X_train_sm_sc, _       = smote.fit_resample(X_train_sc, y_train)

    print(f"\n  ► SMOTE appliqué sur Train :")
    print(f"     Avant  : {len(X_train):,} lignes  "
          f"(0:{(y_train==0).sum()} / 1:{(y_train==1).sum()})")
    print(f"     Après  : {len(X_train_sm):,} lignes  "
          f"(0:{(y_train_sm==0).sum()} / 1:{(y_train_sm==1).sum()})")

    splits = {
        "raw"    : (X_train, y_train, X_val, y_val, X_test, y_test),
        "smote"  : (X_train_sm, y_train_sm, X_val, y_val, X_test, y_test),
        "scaled" : (X_train_sc, y_train, X_val_sc, y_val, X_test_sc, y_test),
        "sm_sc"  : (X_train_sm_sc, y_train_sm, X_val_sc, y_val, X_test_sc, y_test),
        "scaler" : scaler,
        "dates"  : {"train": train["Date"], "val": val["Date"], "test": test["Date"]},
    }
    return splits


# ═════════════════════════════════════════════════════════
# ÉTAPE 3 — CROSS-VALIDATION TEMPORELLE
# ═════════════════════════════════════════════════════════
def cross_validate_models(splits: dict) -> dict:
    """
    TimeSeriesSplit (5 folds) sur le jeu d'entraînement.

    Principe :
        Fold 1 : Train=[1-2 mois]  Val=[3ème mois]
        Fold 2 : Train=[1-3 mois]  Val=[4ème mois]
        ...
        Fold 5 : Train=[1-6 mois]  Val=[7ème mois]

    Métrique cible : F1-score (classe anomalie = 1)
        Car le contexte opérationnel JPH nécessite un équilibre
        précision/rappel — les faux négatifs (anomalies manquées)
        sont coûteux, les faux positifs perturbent la planification.
    """
    print("\n" + "═"*65)
    print("  ÉTAPE 3 — Cross-Validation Temporelle (TimeSeriesSplit n=5)")
    print("═"*65)

    X_train, y_train = splits["smote"][0], splits["smote"][1]
    X_train_sc, y_train_sm = splits["sm_sc"][0], splits["sm_sc"][1]

    tscv = TimeSeriesSplit(n_splits=5)

    # Modèles candidats pour la CV (supervisés uniquement)
    cv_models = {
        "RandomForest" : RandomForestClassifier(
            n_estimators=200, max_depth=10,
            class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1
        ),
        "XGBoost"      : XGBClassifier(
            n_estimators=300, max_depth=5, learning_rate=0.05,
            scale_pos_weight=2.1, subsample=0.8, colsample_bytree=0.8,
            random_state=RANDOM_STATE, eval_metric="logloss", verbosity=0
        ),
        "LightGBM"     : LGBMClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            scale_pos_weight=2.1, subsample=0.8,
            random_state=RANDOM_STATE, verbose=-1
        ),
        "SVM"          : SVC(
            kernel="rbf", C=1.0, gamma="scale",
            class_weight="balanced", probability=True,
            random_state=RANDOM_STATE
        ),
        "KNN"          : KNeighborsClassifier(
            n_neighbors=7, weights="distance", metric="euclidean", n_jobs=-1
        ),
        "Baseline"     : DummyClassifier(strategy="most_frequent"),
    }

    cv_results = {}
    print(f"\n  {'Modèle':16s}  {'F1 moy':>8}  {'F1 std':>8}  "
          f"{'AUC moy':>8}  {'AUC std':>8}  {'Temps':>8}")
    print("  " + "─"*68)

    for name, model in cv_models.items():
        t0 = time.time()
        # SVM et KNN utilisent les données scalées
        X_cv = X_train_sc if name in ("SVM", "KNN") else X_train
        y_cv = y_train_sm if name != "Baseline" else y_train_sm

        f1_scores, auc_scores = [], []
        for fold, (tr_idx, val_idx) in enumerate(tscv.split(X_cv)):
            Xtr, Xvl = X_cv[tr_idx], X_cv[val_idx]
            ytr, yvl = y_cv[tr_idx], y_cv[val_idx]

            model.fit(Xtr, ytr)
            y_pred  = model.predict(Xvl)
            y_proba = (model.predict_proba(Xvl)[:,1]
                       if hasattr(model, "predict_proba") else y_pred.astype(float))

            f1_scores.append(f1_score(yvl, y_pred, pos_label=1, zero_division=0))
            if len(np.unique(yvl)) > 1:
                auc_scores.append(roc_auc_score(yvl, y_proba))

        elapsed = time.time() - t0
        f1_m, f1_s   = np.mean(f1_scores), np.std(f1_scores)
        auc_m, auc_s = (np.mean(auc_scores), np.std(auc_scores)) if auc_scores else (0, 0)

        cv_results[name] = {
            "f1_folds"  : f1_scores,
            "auc_folds" : auc_scores,
            "f1_mean"   : round(f1_m, 4),
            "f1_std"    : round(f1_s, 4),
            "auc_mean"  : round(auc_m, 4),
            "auc_std"   : round(auc_s, 4),
            "time_s"    : round(elapsed, 2),
        }
        print(f"  {name:16s}  {f1_m:>8.4f}  {f1_s:>8.4f}  "
              f"{auc_m:>8.4f}  {auc_s:>8.4f}  {elapsed:>6.1f}s")

    return cv_results, cv_models


# ═════════════════════════════════════════════════════════
# ÉTAPE 4 — ENTRAÎNEMENT FINAL + ISOLATION FOREST
# ═════════════════════════════════════════════════════════
def train_all_models(splits: dict, cv_models: dict) -> dict:
    """
    Entraîne tous les modèles sur Train+Val (données combinées)
    et évalue sur le Test set (holdout).

    Isolation Forest → phase non supervisée :
        Entraîné sur les données normales uniquement (y=0),
        puis évalué sur l'ensemble du test set.
        Paramètre contamination = proportion d'anomalies = 0.322
    """
    print("\n" + "═"*65)
    print("  ÉTAPE 4 — Entraînement Final sur Train+Val | Test holdout")
    print("═"*65)

    X_train, y_train = splits["smote"][0], splits["smote"][1]
    X_val,   y_val   = splits["smote"][2], splits["smote"][3]
    X_test,  y_test  = splits["smote"][4], splits["smote"][5]
    X_train_sc       = splits["sm_sc"][0]
    X_val_sc         = splits["scaled"][2]
    X_test_sc        = splits["scaled"][4]
    scaler           = splits["scaler"]

    # Combiner Train + Val pour entraînement final
    X_trainval    = np.vstack([X_train, X_val])
    y_trainval    = np.concatenate([y_train, y_val])
    X_trainval_sc = np.vstack([X_train_sc, X_val_sc])

    trained = {}

    # ── Phase 1 : Isolation Forest (non supervisé) ────────
    print("\n  [Phase 1 — Non supervisé] Isolation Forest")
    iso = IsolationForest(
        n_estimators=300,
        contamination=0.322,          # = proportion anomalies dans dataset
        max_samples="auto",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    # Entraîné sur les observations normales du train uniquement
    X_normal = X_train[y_train == 0]
    iso.fit(X_normal)

    # Scores : -1=anomalie → converti en 0/1
    iso_pred_test  = iso.predict(X_test)
    iso_pred_test  = np.where(iso_pred_test == -1, 1, 0)
    iso_score_test = -iso.score_samples(X_test)  # score anomalie (↑ = + anormal)
    # Normalisation 0–1
    iso_score_test = (iso_score_test - iso_score_test.min()) / \
                     (iso_score_test.max() - iso_score_test.min() + 1e-9)

    trained["IsolationForest"] = {
        "model"  : iso,
        "y_pred" : iso_pred_test,
        "y_score": iso_score_test,
        "type"   : "unsupervised",
    }
    print(f"     Entraîné sur {len(X_normal):,} observations normales ✅")

    # ── Phase 2 : Modèles supervisés ──────────────────────
    print("\n  [Phase 2 — Supervisé]")
    supervised_names = ["RandomForest", "XGBoost", "LightGBM",
                        "SVM", "KNN", "Baseline"]

    for name in supervised_names:
        model = cv_models[name]
        t0    = time.time()
        X_tv  = X_trainval_sc if name in ("SVM", "KNN") else X_trainval
        X_te  = X_test_sc     if name in ("SVM", "KNN") else X_test

        model.fit(X_tv, y_trainval)
        y_pred  = model.predict(X_te)
        y_score = (model.predict_proba(X_te)[:,1]
                   if hasattr(model, "predict_proba") else y_pred.astype(float))

        trained[name] = {
            "model"  : model,
            "y_pred" : y_pred,
            "y_score": y_score,
            "type"   : "supervised",
            "time_s" : round(time.time() - t0, 2),
        }
        print(f"     {name:16s} → entraîné en {time.time()-t0:.1f}s ✅")

    trained["_y_test"]   = y_test
    trained["_X_test"]   = X_test
    trained["_X_test_sc"]= X_test_sc
    return trained


# ═════════════════════════════════════════════════════════
# ÉTAPE 5 — ÉVALUATION COMPLÈTE
# ═════════════════════════════════════════════════════════
def evaluate_all(trained: dict) -> pd.DataFrame:
    """
    Calcule pour chaque modèle :
        Precision, Recall, F1 (anomalie=1)
        Accuracy, AUC-ROC, AUC-PR (Average Precision)
        Confusion matrix components (TP, FP, TN, FN)
        Faux négatifs (anomalies manquées) — critique JPH
    """
    print("\n" + "═"*65)
    print("  ÉTAPE 5 — Évaluation Complète sur Test Set")
    print("═"*65)

    y_test = trained["_y_test"]
    rows   = []

    header = (f"\n  {'Modèle':16s}  {'Precision':>9}  {'Recall':>7}  "
              f"{'F1':>7}  {'AUC-ROC':>8}  {'AUC-PR':>7}  "
              f"{'FN (miss)':>10}  {'FP':>6}")
    print(header)
    print("  " + "─"*85)

    for name, info in trained.items():
        if name.startswith("_"):
            continue

        y_pred  = info["y_pred"]
        y_score = info["y_score"]

        prec  = precision_score(y_test, y_pred, pos_label=1, zero_division=0)
        rec   = recall_score(y_test, y_pred, pos_label=1, zero_division=0)
        f1    = f1_score(y_test, y_pred, pos_label=1, zero_division=0)

        try:
            auc_roc = roc_auc_score(y_test, y_score)
            auc_pr  = average_precision_score(y_test, y_score)
        except Exception:
            auc_roc = auc_pr = 0.0

        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel() if cm.shape == (2,2) else (0,0,0,0)
        acc = (tp + tn) / len(y_test)

        row = {
            "Modèle"    : name,
            "Type"      : info["type"],
            "Precision" : round(prec, 4),
            "Recall"    : round(rec, 4),
            "F1"        : round(f1, 4),
            "Accuracy"  : round(acc, 4),
            "AUC-ROC"   : round(auc_roc, 4),
            "AUC-PR"    : round(auc_pr, 4),
            "TP"        : int(tp),
            "FP"        : int(fp),
            "TN"        : int(tn),
            "FN"        : int(fn),
            "Score_Global": round((f1 + auc_roc + auc_pr) / 3, 4),
        }
        rows.append(row)

        # Indicateur qualitatif
        flag = "🏆" if f1 == max(r.get("F1", 0) for r in rows) else ""
        print(f"  {name:16s}  {prec:>9.4f}  {rec:>7.4f}  "
              f"{f1:>7.4f}  {auc_roc:>8.4f}  {auc_pr:>7.4f}  "
              f"{fn:>10}  {fp:>6}  {flag}")

    results_df = pd.DataFrame(rows).sort_values("F1", ascending=False)

    print("\n" + "─"*65)
    print("  CLASSEMENT FINAL (trié par F1-score) :")
    print("─"*65)
    for i, (_, r) in enumerate(results_df.iterrows(), 1):
        medal = ["🥇", "🥈", "🥉", "  4.","  5.","  6.","  7."][min(i-1,6)]
        print(f"  {medal} {r['Modèle']:16s}  F1={r['F1']:.4f}  "
              f"AUC-ROC={r['AUC-ROC']:.4f}  AUC-PR={r['AUC-PR']:.4f}  "
              f"FN={r['FN']}")

    # Sauvegarde
    results_df.to_csv(
        os.path.join(OUTPUT_DIR, "resultats_evaluation_modeles.csv"),
        index=False, encoding="utf-8-sig"
    )
    print(f"\n  ✅ Tableau sauvegardé → resultats_evaluation_modeles.csv")
    return results_df


# ═════════════════════════════════════════════════════════
# ÉTAPE 6 — TEST McNEMAR (comparaison statistique)
# ═════════════════════════════════════════════════════════
def mcnemar_test(trained: dict, results_df: pd.DataFrame):
    """
    Test McNemar : compare les erreurs de classification des deux
    meilleurs modèles supervisés.

    H0 : Les deux modèles font les mêmes erreurs (pas de différence)
    H1 : Les erreurs sont significativement différentes (α=5%)

    Interprétation :
        p < 0.05 → Le meilleur modèle est significativement supérieur
        p ≥ 0.05 → Pas de différence statistique significative
    """
    print("\n" + "═"*65)
    print("  ÉTAPE 6 — Test McNemar (Comparaison Statistique)")
    print("═"*65)

    y_test = trained["_y_test"]
    # Top 2 modèles supervisés
    top2 = results_df[results_df["Type"] == "supervised"].head(2)["Modèle"].tolist()

    if len(top2) < 2:
        print("  ⚠️ Pas assez de modèles supervisés pour le test McNemar")
        return {}

    m1_name, m2_name = top2[0], top2[1]
    pred1 = trained[m1_name]["y_pred"]
    pred2 = trained[m2_name]["y_pred"]

    # Table de contingence McNemar
    b = np.sum((pred1 != y_test) & (pred2 == y_test))  # M1 faux, M2 correct
    c = np.sum((pred1 == y_test) & (pred2 != y_test))  # M1 correct, M2 faux

    table  = [[np.sum((pred1==y_test)&(pred2==y_test)), c],
              [b, np.sum((pred1!=y_test)&(pred2!=y_test))]]

    result = mcnemar(table, exact=False, correction=True)
    p_val  = result.pvalue
    chi2   = result.statistic

    print(f"\n  Comparaison : {m1_name}  vs  {m2_name}")
    print(f"  ┌─────────────────────────────────────────┐")
    print(f"  │  χ² = {chi2:>8.4f}                          │")
    print(f"  │  p-value = {p_val:>8.4f}                      │")
    print(f"  │  b (M1 faux, M2 correct) = {b:>4}           │")
    print(f"  │  c (M1 correct, M2 faux) = {c:>4}           │")
    print(f"  └─────────────────────────────────────────┘")

    if p_val < 0.05:
        winner = m1_name if b < c else m2_name
        print(f"\n  ✅ Résultat SIGNIFICATIF (p={p_val:.4f} < 0.05, α=5%)")
        print(f"     → {winner} est statistiquement supérieur à l'autre modèle.")
    else:
        print(f"\n  ℹ️ Résultat NON significatif (p={p_val:.4f} ≥ 0.05)")
        print(f"     → Pas de différence statistique entre {m1_name} et {m2_name}.")
        print(f"       Le choix se fait sur d'autres critères (vitesse, interprétabilité).")

    return {
        "modele_1": m1_name, "modele_2": m2_name,
        "chi2": round(chi2, 4), "p_value": round(p_val, 4),
        "b": int(b), "c": int(c),
        "significatif": bool(p_val < 0.05),
    }


# ═════════════════════════════════════════════════════════
# ÉTAPE 7 — SÉLECTION & SAUVEGARDE DU MEILLEUR MODÈLE
# ═════════════════════════════════════════════════════════
def select_and_save_best(trained: dict, results_df: pd.DataFrame,
                         splits: dict) -> str:
    """
    Critères de sélection (par ordre de priorité) :
        1. F1-score (classe anomalie) — maximiser
        2. Recall   (minimiser les anomalies manquées = FN)
        3. AUC-ROC  (discriminabilité globale)

    Le modèle sélectionné est sauvegardé avec son scaler
    pour un déploiement direct dans l'interface Streamlit.
    """
    print("\n" + "═"*65)
    print("  ÉTAPE 7 — Sélection & Sauvegarde du Meilleur Modèle")
    print("═"*65)

    # Meilleur supervisé
    best_row  = results_df[results_df["Type"] == "supervised"].iloc[0]
    best_name = best_row["Modèle"]
    best_model= trained[best_name]["model"]
    scaler    = splits["scaler"]

    print(f"\n  🏆 Meilleur modèle sélectionné : {best_name}")
    print(f"     F1      = {best_row['F1']:.4f}")
    print(f"     Recall  = {best_row['Recall']:.4f}")
    print(f"     AUC-ROC = {best_row['AUC-ROC']:.4f}")
    print(f"     FN (anomalies manquées) = {best_row['FN']}")

    # Sauvegarde modèle + scaler + config
    model_path  = os.path.join(OUTPUT_DIR, "models", f"best_model_{best_name}.pkl")
    scaler_path = os.path.join(OUTPUT_DIR, "models", "scaler.pkl")
    config_path = os.path.join(OUTPUT_DIR, "models", "model_config.json")

    joblib.dump(best_model, model_path)
    joblib.dump(scaler, scaler_path)

    config = {
        "best_model"   : best_name,
        "features"     : FEATURES,
        "target"       : TARGET,
        "f1_test"      : best_row["F1"],
        "recall_test"  : best_row["Recall"],
        "auc_roc_test" : best_row["AUC-ROC"],
        "auc_pr_test"  : best_row["AUC-PR"],
        "fn_test"      : int(best_row["FN"]),
        "model_path"   : model_path,
        "scaler_path"  : scaler_path,
        "trained_date" : pd.Timestamp.now().strftime("%Y-%m-%d %H:%M"),
    }
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

    print(f"\n  ✅ Modèle sauvegardé  → models/best_model_{best_name}.pkl")
    print(f"  ✅ Scaler sauvegardé  → models/scaler.pkl")
    print(f"  ✅ Config sauvegardée → models/model_config.json")

    return best_name


# ═════════════════════════════════════════════════════════
# ÉTAPE 8 — INTERPRÉTABILITÉ SHAP
# ═════════════════════════════════════════════════════════
def compute_shap(trained: dict, best_name: str, splits: dict):
    """
    Analyse SHAP (SHapley Additive exPlanations) du meilleur modèle.

    SHAP permet de répondre à :
        "Quelles features contribuent le plus à la détection d'anomalies ?"
        "Pour cette alerte spécifique, quelle en est la cause principale ?"

    Utilisé dans la section 5.4 du rapport (interprétabilité XGBoost).
    """
    print("\n" + "═"*65)
    print(f"  ÉTAPE 8 — Interprétabilité SHAP ({best_name})")
    print("═"*65)

    if best_name in ("SVM", "KNN", "Baseline", "IsolationForest"):
        print(f"  ⚠️ SHAP TreeExplainer non disponible pour {best_name}")
        print(f"     Utilisation de KernelExplainer (approximatif)...")
        return None

    model  = trained[best_name]["model"]
    X_test = trained["_X_test"]
    X_df   = pd.DataFrame(X_test, columns=FEATURES)

    print("  Calcul des valeurs SHAP en cours...")
    explainer   = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_df)

    # Pour les classificateurs binaires, prendre la classe 1
    if isinstance(shap_values, list):
        sv = shap_values[1]
    elif hasattr(shap_values, "shape") and len(shap_values.shape) == 3:
        sv = shap_values[:, :, 1]
    else:
        sv = shap_values

    shap_df = pd.DataFrame(sv, columns=FEATURES)
    shap_df["label"] = trained["_y_test"]

    # Importance moyenne (|SHAP|)
    mean_abs_shap = pd.Series(
        np.abs(sv).mean(axis=0), index=FEATURES
    ).sort_values(ascending=False)

    print("\n  Top 10 features par importance SHAP :")
    print(f"  {'Rang':>5}  {'Feature':35s}  {'|SHAP| moyen':>12}")
    print("  " + "─"*57)
    for i, (feat, val) in enumerate(mean_abs_shap.head(10).items(), 1):
        bar = "█" * int(val / mean_abs_shap.max() * 20)
        print(f"  {i:>5}  {feat:35s}  {val:>12.4f}  {bar}")

    # Sauvegarde SHAP
    shap_path = os.path.join(OUTPUT_DIR, "shap_values.csv")
    shap_df.to_csv(shap_path, index=False, encoding="utf-8-sig")
    print(f"\n  ✅ Valeurs SHAP sauvegardées → shap_values.csv")

    return shap_values, mean_abs_shap, X_df


# ═════════════════════════════════════════════════════════
# ÉTAPE 9 — VISUALISATIONS COMPLÈTES (10 figures)
# ═════════════════════════════════════════════════════════
def generate_all_figures(trained, results_df, cv_results,
                         mcnemar_res, shap_data, splits):
    """Génère les 10 figures du rapport."""
    print("\n" + "═"*65)
    print("  ÉTAPE 9 — Génération des Figures (10 figures)")
    print("═"*65)

    y_test  = trained["_y_test"]
    fig_dir = os.path.join(OUTPUT_DIR, "figures")

    # ── Figure 1 : CV F1 scores par modèle ───────────────
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    fig.suptitle("Figure 5.3-A — Cross-Validation Temporelle (TimeSeriesSplit n=5)",
                 fontsize=13, fontweight="bold", color=OCP["primary"])

    sup_models = [m for m in cv_results if m != "Baseline"]
    f1_means   = [cv_results[m]["f1_mean"]  for m in sup_models]
    f1_stds    = [cv_results[m]["f1_std"]   for m in sup_models]
    auc_means  = [cv_results[m]["auc_mean"] for m in sup_models]
    colors     = [MODEL_COLORS.get(m, "#666") for m in sup_models]

    axes[0].bar(sup_models, f1_means, color=colors, edgecolor="white",
                width=0.6, yerr=f1_stds, capsize=5, error_kw={"linewidth":2})
    for i, (m, v, s) in enumerate(zip(sup_models, f1_means, f1_stds)):
        axes[0].text(i, v + s + 0.005, f"{v:.3f}", ha="center",
                     fontsize=9, fontweight="bold")
    axes[0].set_ylabel("F1-Score (classe anomalie=1)", labelpad=8)
    axes[0].set_title("F1-Score moyen ± std par fold", fontsize=11)
    axes[0].set_xticklabels(sup_models, rotation=20, ha="right")
    axes[0].axhline(cv_results["Baseline"]["f1_mean"], color="grey",
                    lw=2, ls="--", alpha=0.7, label="Baseline")
    axes[0].legend(fontsize=9)

    # Boxplot des folds
    f1_all = [cv_results[m]["f1_folds"] for m in sup_models]
    bp = axes[1].boxplot(f1_all, patch_artist=True, notch=False,
                         medianprops=dict(color="white", lw=2.5))
    for patch, c in zip(bp["boxes"], colors):
        patch.set_facecolor(c); patch.set_alpha(0.8)
    axes[1].set_xticklabels(sup_models, rotation=20, ha="right")
    axes[1].set_ylabel("F1-Score par fold", labelpad=8)
    axes[1].set_title("Distribution F1 sur les 5 folds", fontsize=11)

    plt.tight_layout()
    plt.savefig(os.path.join(fig_dir, "fig_5_3_A_cross_validation.png"))
    plt.close()
    print("  ✅ Fig 5.3-A — Cross-Validation")

    # ── Figure 2 : Comparaison métriques finales ──────────
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle("Figure 5.4-A — Comparaison des Métriques sur le Test Set",
                 fontsize=13, fontweight="bold", color=OCP["primary"])

    models_sorted = results_df["Modèle"].tolist()
    colors_sorted = [MODEL_COLORS.get(m, "#666") for m in models_sorted]

    for ax, metric, title in zip(
        axes,
        ["F1", "AUC-ROC", "AUC-PR"],
        ["F1-Score (anomalie=1)", "AUC-ROC", "AUC-PR (Average Precision)"]
    ):
        vals = results_df[metric].values
        bars = ax.barh(models_sorted[::-1], vals[::-1],
                       color=colors_sorted[::-1],
                       edgecolor="white", height=0.6)
        for bar, v in zip(bars, vals[::-1]):
            ax.text(v + 0.005, bar.get_y() + bar.get_height()/2,
                    f"{v:.4f}", va="center", ha="left", fontsize=9)
        ax.set_xlim(0, 1.1)
        ax.set_xlabel(title, labelpad=8)
        ax.set_title(title, fontsize=11)
        ax.axvline(0.5, color="grey", lw=1, ls="--", alpha=0.5)

    plt.tight_layout()
    plt.savefig(os.path.join(fig_dir, "fig_5_4_A_metriques_comparaison.png"))
    plt.close()
    print("  ✅ Fig 5.4-A — Comparaison métriques")

    # ── Figure 3 : Matrices de confusion ─────────────────
    sup_names = [m for m in trained if not m.startswith("_")]
    n_models  = len(sup_names)
    ncols     = 4
    nrows     = int(np.ceil(n_models / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=(ncols*4, nrows*4))
    axes_flat = axes.flatten() if hasattr(axes, "flatten") else [axes]
    fig.suptitle("Figure 5.4-B — Matrices de Confusion — Tous les Modèles",
                 fontsize=13, fontweight="bold", color=OCP["primary"])

    for i, name in enumerate(sup_names):
        ax = axes_flat[i]
        y_pred = trained[name]["y_pred"]
        cm     = confusion_matrix(y_test, y_pred)
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                    xticklabels=["Normal","Anomalie"],
                    yticklabels=["Normal","Anomalie"],
                    ax=ax, cbar=False, linewidths=1)
        f1 = f1_score(y_test, y_pred, pos_label=1, zero_division=0)
        ax.set_title(f"{name}\nF1={f1:.4f}", fontsize=10)
        ax.set_xlabel("Prédit", labelpad=4)
        ax.set_ylabel("Réel", labelpad=4)

    for j in range(i+1, len(axes_flat)):
        axes_flat[j].set_visible(False)

    plt.tight_layout()
    plt.savefig(os.path.join(fig_dir, "fig_5_4_B_matrices_confusion.png"))
    plt.close()
    print("  ✅ Fig 5.4-B — Matrices de confusion")

    # ── Figure 4 : Courbes ROC ────────────────────────────
    fig, axes = plt.subplots(1, 2, figsize=(16, 7))
    fig.suptitle("Figure 5.4-C — Courbes ROC et Precision-Recall",
                 fontsize=13, fontweight="bold", color=OCP["primary"])

    for name in sup_names:
        y_score = trained[name]["y_score"]
        color   = MODEL_COLORS.get(name, "#666")
        try:
            fpr, tpr, _ = roc_curve(y_test, y_score)
            auc = roc_auc_score(y_test, y_score)
            axes[0].plot(fpr, tpr, lw=2, color=color,
                         label=f"{name} (AUC={auc:.3f})")

            prec, rec, _ = precision_recall_curve(y_test, y_score)
            ap = average_precision_score(y_test, y_score)
            axes[1].plot(rec, prec, lw=2, color=color,
                         label=f"{name} (AP={ap:.3f})")
        except Exception:
            continue

    axes[0].plot([0,1],[0,1], "k--", lw=1, alpha=0.5, label="Aléatoire")
    axes[0].set_xlabel("Taux Faux Positifs (FPR)", labelpad=8)
    axes[0].set_ylabel("Taux Vrais Positifs (TPR)", labelpad=8)
    axes[0].set_title("Courbes ROC", fontsize=11)
    axes[0].legend(fontsize=8, loc="lower right")

    baseline_ap = y_test.mean()
    axes[1].axhline(baseline_ap, color="grey", lw=1.5, ls="--",
                    label=f"Baseline ({baseline_ap:.2f})")
    axes[1].set_xlabel("Recall", labelpad=8)
    axes[1].set_ylabel("Precision", labelpad=8)
    axes[1].set_title("Courbes Precision-Recall", fontsize=11)
    axes[1].legend(fontsize=8, loc="upper right")

    plt.tight_layout()
    plt.savefig(os.path.join(fig_dir, "fig_5_4_C_roc_pr_curves.png"))
    plt.close()
    print("  ✅ Fig 5.4-C — Courbes ROC & PR")

    # ── Figure 5 : Seuil optimal F1 (meilleur modèle) ────
    best_name  = results_df[results_df["Type"]=="supervised"].iloc[0]["Modèle"]
    y_score_bm = trained[best_name]["y_score"]

    thresholds = np.linspace(0, 1, 200)
    f1s, precs, recs = [], [], []
    for t in thresholds:
        y_t = (y_score_bm >= t).astype(int)
        f1s.append(f1_score(y_test, y_t, pos_label=1, zero_division=0))
        precs.append(precision_score(y_test, y_t, pos_label=1, zero_division=0))
        recs.append(recall_score(y_test, y_t, pos_label=1, zero_division=0))

    opt_idx = np.argmax(f1s)
    opt_thr = thresholds[opt_idx]

    fig, ax = plt.subplots(figsize=(12, 6))
    fig.suptitle(f"Figure 5.4-D — Optimisation du Seuil de Décision ({best_name})",
                 fontsize=13, fontweight="bold", color=OCP["primary"])

    ax.plot(thresholds, f1s,   color=OCP["danger"],   lw=2.5, label="F1-Score")
    ax.plot(thresholds, precs, color=OCP["secondary"], lw=2,   label="Precision", ls="--")
    ax.plot(thresholds, recs,  color=OCP["accent"],    lw=2,   label="Recall",    ls="-.")
    ax.axvline(opt_thr, color=OCP["warning"], lw=2.5, ls="--",
               label=f"Seuil optimal = {opt_thr:.3f} (F1={f1s[opt_idx]:.4f})")
    ax.axvline(0.5, color="grey", lw=1.5, ls=":", alpha=0.7, label="Seuil par défaut 0.5")

    ax.set_xlabel("Seuil de décision", labelpad=8)
    ax.set_ylabel("Valeur de la métrique", labelpad=8)
    ax.set_title(f"F1, Precision, Recall en fonction du seuil — {best_name}")
    ax.legend(fontsize=9)

    # Annotation seuils alertes
    ax.axvspan(0.6, 0.8, alpha=0.08, color=OCP["warning"], label="Zone ORANGE")
    ax.axvspan(0.8, 1.0, alpha=0.08, color=OCP["danger"],  label="Zone ROUGE")
    ax.text(0.7, 0.05, "⚠️ ORANGE", ha="center", fontsize=9, color=OCP["warning"])
    ax.text(0.9, 0.05, "🔴 ROUGE",  ha="center", fontsize=9, color=OCP["danger"])

    plt.tight_layout()
    plt.savefig(os.path.join(fig_dir, "fig_5_4_D_seuil_optimal.png"))
    plt.close()
    print("  ✅ Fig 5.4-D — Seuil optimal")

    # ── Figure 6 : SHAP Summary Plot ─────────────────────
    if shap_data is not None:
        shap_values, mean_abs_shap, X_df = shap_data
        if isinstance(shap_values, list):
            sv = shap_values[1]
        elif hasattr(shap_values, "shape") and len(shap_values.shape) == 3:
            sv = shap_values[:, :, 1]
        else:
            sv = shap_values

        fig, axes = plt.subplots(1, 2, figsize=(18, 7))
        fig.suptitle(f"Figure 5.4-E — Interprétabilité SHAP ({best_name})",
                     fontsize=13, fontweight="bold", color=OCP["primary"])

        # Bar plot importance moyenne
        ax = axes[0]
        top10 = mean_abs_shap.head(10)
        colors_shap = [OCP["danger"] if v > top10.mean() else OCP["secondary"]
                       for v in top10.values]
        ax.barh(top10.index[::-1], top10.values[::-1],
                color=colors_shap[::-1], edgecolor="white", height=0.6)
        for i, (feat, val) in enumerate(zip(top10.index[::-1], top10.values[::-1])):
            ax.text(val + 0.001, i, f"{val:.4f}", va="center", ha="left", fontsize=9)
        ax.set_xlabel("|SHAP value| moyen (impact sur la décision)", labelpad=8)
        ax.set_title("Top 10 features — Importance SHAP globale", fontsize=11)

        # Beeswarm-like scatter
        ax2 = axes[1]
        top5_feats = mean_abs_shap.head(5).index.tolist()
        for i, feat in enumerate(top5_feats[::-1]):
            feat_idx = FEATURES.index(feat)
            shap_col = sv[:, feat_idx]
            feat_val = X_df[feat].values
            # Normaliser feature pour couleur
            norm_val = (feat_val - feat_val.min()) / (np.ptp(feat_val) + 1e-9)
            sc = ax2.scatter(shap_col, [i]*len(shap_col),
                             c=norm_val, cmap="RdBu_r",
                             alpha=0.4, s=15)
        ax2.set_yticks(range(5))
        ax2.set_yticklabels(top5_feats[::-1], fontsize=10)
        ax2.axvline(0, color="grey", lw=1, ls="--")
        ax2.set_xlabel("Valeur SHAP (→ vers anomalie 1, ← vers normal 0)", labelpad=8)
        ax2.set_title("Distribution SHAP — Top 5 features", fontsize=11)
        plt.colorbar(sc, ax=ax2, label="Valeur de la feature (normalisée)")

        plt.tight_layout()
        plt.savefig(os.path.join(fig_dir, "fig_5_4_E_shap.png"))
        plt.close()
        print("  ✅ Fig 5.4-E — SHAP Interprétabilité")

    # ── Figure 7 : Tableau de bord récapitulatif ──────────
    fig = plt.figure(figsize=(18, 10))
    fig.suptitle("Figure 5.4-F — Tableau de Bord de Sélection du Modèle — JPH AI Anomaly Detector",
                 fontsize=14, fontweight="bold", color=OCP["primary"])

    gs = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.4)

    # Radar chart des métriques du meilleur modèle
    ax_radar = fig.add_subplot(gs[0, 0], polar=True)
    best_row  = results_df[results_df["Type"]=="supervised"].iloc[0]
    categories= ["Precision", "Recall", "F1", "AUC-ROC", "AUC-PR"]
    values    = [best_row[c] for c in categories] + [best_row["Precision"]]
    N         = len(categories)
    angles    = [n / float(N) * 2 * np.pi for n in range(N)] + [0]
    ax_radar.plot(angles, values, color=OCP["danger"], lw=2)
    ax_radar.fill(angles, values, color=OCP["danger"], alpha=0.25)
    ax_radar.set_xticks(angles[:-1])
    ax_radar.set_xticklabels(categories, fontsize=9)
    ax_radar.set_title(f"Profil {best_row['Modèle']}", fontsize=10, pad=15)
    ax_radar.set_ylim(0, 1)

    # Tableau comparatif
    ax_table = fig.add_subplot(gs[0, 1:])
    ax_table.axis("off")
    table_data = results_df[["Modèle","F1","Recall","AUC-ROC","AUC-PR","FN","FP"]].values
    col_labels = ["Modèle","F1","Recall","AUC-ROC","AUC-PR","FN","FP"]
    tbl = ax_table.table(
        cellText=[[str(v) for v in row] for row in table_data],
        colLabels=col_labels, loc="center", cellLoc="center"
    )
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(9)
    tbl.scale(1.2, 1.8)
    # Colorier la meilleure ligne
    for j in range(len(col_labels)):
        tbl[(1, j)].set_facecolor(OCP["light"])
        tbl[(1, j)].set_text_props(fontweight="bold", color=OCP["primary"])
    ax_table.set_title("Tableau comparatif — Test set", fontsize=11,
                        fontweight="bold", color=OCP["primary"])

    # Distribution FN par modèle
    ax_fn = fig.add_subplot(gs[1, 0])
    fn_vals = results_df[results_df["Type"]=="supervised"]["FN"].values
    fn_models = results_df[results_df["Type"]=="supervised"]["Modèle"].values
    fn_colors = [MODEL_COLORS.get(m, "#666") for m in fn_models]
    ax_fn.bar(fn_models, fn_vals, color=fn_colors, edgecolor="white", width=0.6)
    ax_fn.set_ylabel("Faux Négatifs (anomalies manquées)", labelpad=8)
    ax_fn.set_title("FN : anomalies manquées par modèle\n(↓ = meilleur)", fontsize=10)
    ax_fn.set_xticklabels(fn_models, rotation=25, ha="right")

    # Performance score global
    ax_score = fig.add_subplot(gs[1, 1])
    sg_vals   = results_df["Score_Global"].values
    sg_colors = [MODEL_COLORS.get(m, "#666") for m in results_df["Modèle"]]
    ax_score.barh(results_df["Modèle"][::-1], sg_vals[::-1],
                  color=sg_colors[::-1], edgecolor="white", height=0.6)
    for bar, v in zip(ax_score.patches, sg_vals[::-1]):
        ax_score.text(v + 0.005, bar.get_y() + bar.get_height()/2,
                      f"{v:.4f}", va="center", ha="left", fontsize=9)
    ax_score.axvline(0.5, color="grey", lw=1.5, ls="--", alpha=0.5)
    ax_score.set_xlabel("Score global = (F1+AUC-ROC+AUC-PR)/3", labelpad=8)
    ax_score.set_title("Score de synthèse par modèle", fontsize=10)

    # McNemar résultat
    ax_mc = fig.add_subplot(gs[1, 2])
    ax_mc.axis("off")
    if mcnemar_res:
        mc_txt = (
            f"TEST McNEMAR\n\n"
            f"H0 : Les deux modèles font\nles mêmes erreurs\n\n"
            f"M1 : {mcnemar_res['modele_1']}\n"
            f"M2 : {mcnemar_res['modele_2']}\n\n"
            f"χ² = {mcnemar_res['chi2']}\n"
            f"p-value = {mcnemar_res['p_value']}\n\n"
            f"Résultat : {'✅ Significatif' if mcnemar_res['significatif'] else 'ℹ️ Non significatif'}\n"
            f"(α = 5%)"
        )
        props = dict(boxstyle="round,pad=0.8", facecolor=OCP["light"],
                     edgecolor=OCP["secondary"], alpha=0.9)
        ax_mc.text(0.5, 0.5, mc_txt, transform=ax_mc.transAxes,
                   fontsize=9, va="center", ha="center", bbox=props,
                   fontfamily="monospace")
    ax_mc.set_title("Comparaison Statistique", fontsize=10,
                    fontweight="bold", color=OCP["primary"])

    plt.savefig(os.path.join(fig_dir, "fig_5_4_F_dashboard_selection.png"))
    plt.close()
    print("  ✅ Fig 5.4-F — Dashboard sélection modèle")

    print(f"\n  📁 Toutes les figures sauvegardées dans : {fig_dir}/")


# ═════════════════════════════════════════════════════════
# PIPELINE PRINCIPAL
# ═════════════════════════════════════════════════════════
def run_full_pipeline(data_path: str = DATA_PATH):
    """Lance l'intégralité du pipeline ML."""
    t_start = time.time()

    print("\n" + "█"*65)
    print("  MODULE 2 — PIPELINE ML COMPLET — AI LOADING PLANNER JPH")
    print("  Détection d'Anomalies | OCP Group | PFE 2025")
    print("█"*65)

    # Étape 1 — Données
    df = load_data(data_path)

    # Étape 2 — Split temporel
    splits = temporal_split(df)

    # Étape 3 — Cross-validation
    cv_results, cv_models = cross_validate_models(splits)

    # Étape 4 — Entraînement final
    trained = train_all_models(splits, cv_models)

    # Étape 5 — Évaluation
    results_df = evaluate_all(trained)

    # Étape 6 — McNemar
    mcnemar_res = mcnemar_test(trained, results_df)

    # Étape 7 — Sélection & sauvegarde
    best_name = select_and_save_best(trained, results_df, splits)

    # Étape 8 — SHAP
    shap_data = compute_shap(trained, best_name, splits)

    # Étape 9 — Figures
    generate_all_figures(trained, results_df, cv_results,
                         mcnemar_res, shap_data, splits)

    # Résumé final
    elapsed = time.time() - t_start
    print("\n" + "█"*65)
    print("  ✅ PIPELINE TERMINÉ")
    print(f"  ⏱️  Durée totale : {elapsed:.1f} secondes")
    print(f"  🏆 Meilleur modèle : {best_name}")
    best_row = results_df[results_df["Modèle"]==best_name].iloc[0]
    print(f"     F1      = {best_row['F1']:.4f}")
    print(f"     Recall  = {best_row['Recall']:.4f}")
    print(f"     AUC-ROC = {best_row['AUC-ROC']:.4f}")
    print(f"  📁 Outputs dans : {OUTPUT_DIR}/")
    print("█"*65 + "\n")

    return trained, results_df, best_name


# ─────────────────────────────────────────────────────────
# POINT D'ENTRÉE
# ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    trained, results_df, best_name = run_full_pipeline(DATA_PATH)