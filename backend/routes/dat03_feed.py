"""
dat03_feed.py — Routes d'ingestion DAT-03: Arrêts, KPI Axes, Export 2025
Chaque endpoint gère: nettoyage Pandas, anti-doublon hash composite, upsert Supabase.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
import pandas as pd
import hashlib
import io
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

router = APIRouter()

try:
    from db_config import get_client
except Exception:
    get_client = None


# ─── Utils ─────────────────────────────────────────────────────────────────

def make_hash(*args) -> str:
    raw = "_".join(str(a).strip() for a in args if a is not None)
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    """Supprime colonnes et lignes 100% vides, remplace NaN par None."""
    df.dropna(how="all", axis=1, inplace=True)
    df.dropna(how="all", axis=0, inplace=True)
    df = df.where(pd.notnull(df), None)
    return df


def find_col(df: pd.DataFrame, *candidates) -> str | None:
    """Recherche flexible d'une colonne par nom partiel (insensible à la casse)."""
    for col in df.columns:
        col_str = str(col).lower().strip()
        for cand in candidates:
            if cand.lower().strip() in col_str:
                return col
    return None


def safe_str(val) -> str | None:
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    s = str(val).strip()
    return s if s not in ("", "nan", "None", "NaT") else None


def safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        s = str(val).replace(" ", "").replace(",", ".").replace("%", "").strip()
        if s in ("", "nan", "None", "NaT"):
            return None
        return float(s)
    except Exception:
        return None


def safe_int(val) -> int | None:
    f = safe_float(val)
    return int(f) if f is not None else None


def upsert_batch(sb, table: str, rows: list, conflict_col: str = "hash_id") -> int:
    """Upsert par batch de 500 lignes. Retourne le nombre total traité."""
    total = 0
    for i in range(0, len(rows), 500):
        batch = rows[i : i + 500]
        res = sb.table(table).upsert(batch, on_conflict=conflict_col).execute()
        total += len(res.data) if res.data else 0
    return total


# ═══════════════════════════════════════════════════════════════════════════
# 1. Upload — Base des Arrêts 2025
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/dat03/upload_arrets")
async def upload_arrets(file: UploadFile = File(...)):
    sb = get_client() if get_client else None
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase non configuré")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
        df = clean_df(df)

        # Détection flexible des colonnes
        col = {
            "date":         find_col(df, "date"),
            "poste":        find_col(df, "poste"),
            "hall":         find_col(df, "hall"),
            "axe":          find_col(df, "axe"),
            "debut":        find_col(df, "début", "debut"),
            "fin":          find_col(df, "fin"),
            "duree_hmm":    find_col(df, "h:mm"),
            "duree_h":      find_col(df, "durée ", "duree "),
            "cause":        find_col(df, "cause"),
            "nature":       find_col(df, "nature"),
            "navire":       find_col(df, "navire"),
            "sous_qualite": find_col(df, "sous-qualit", "sous_qualit", "sous qualit"),
            "qualite":      find_col(df, "qualité", "qualite"),
            "quai":         find_col(df, "quai"),
            "niveau1":      find_col(df, "niveau1", "niveau 1"),
            "niveau2":      find_col(df, "niveau2", "niveau 2"),
            "niveau3":      find_col(df, "niveau3", "niveau 3"),
            "day":          find_col(df, "day"),
            "week":         find_col(df, "week"),
            "month":        find_col(df, "month"),
        }

        # Vérifier colonnes obligatoires
        required = ["date", "axe", "debut"]
        missing = [k for k in required if not col.get(k)]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Colonnes obligatoires manquantes: {missing}. Colonnes trouvées: {list(df.columns)}"
            )

        # Filtrer les lignes sans clés principales
        key_cols = [col[k] for k in required if col.get(k)]
        df.dropna(subset=key_cols, inplace=True)

        rows = []
        skipped = 0

        for _, row in df.iterrows():
            def g(key):
                c = col.get(key)
                return safe_str(row.get(c)) if c else None

            date_val  = g("date") or ""
            axe_val   = g("axe") or ""
            debut_val = g("debut") or ""
            fin_val   = g("fin") or ""

            if not date_val or not axe_val:
                skipped += 1
                continue

            rows.append({
                "hash_id":      make_hash(date_val, axe_val, debut_val, fin_val),
                "date":         date_val[:10] if len(date_val) >= 10 else date_val,
                "poste":        safe_int(row.get(col["poste"])) if col.get("poste") else None,
                "hall":         g("hall"),
                "axe":          axe_val,
                "debut":        debut_val,
                "fin":          fin_val,
                "duree_hmm":    g("duree_hmm"),
                "duree_h":      safe_float(row.get(col["duree_h"])) if col.get("duree_h") else None,
                "cause":        g("cause"),
                "nature":       g("nature"),
                "navire":       g("navire"),
                "sous_qualite": g("sous_qualite"),
                "qualite":      g("qualite"),
                "quai":         g("quai"),
                "niveau1":      g("niveau1"),
                "niveau2":      g("niveau2"),
                "niveau3":      g("niveau3"),
                "day":          safe_int(row.get(col["day"])) if col.get("day") else None,
                "week":         safe_int(row.get(col["week"])) if col.get("week") else None,
                "month":        safe_int(row.get(col["month"])) if col.get("month") else None,
            })

        if not rows:
            return {"status": "ok", "message": "Aucune ligne valide trouvée", "inserted": 0, "skipped": skipped}

        inserted = upsert_batch(sb, "arrets_2025", rows)

        return {
            "status": "ok",
            "message": f"{inserted} arrêts insérés / mis à jour (anti-doublons actif)",
            "total_lignes": len(df),
            "inserted": inserted,
            "skipped": skipped,
            "colonnes_detectees": {k: v for k, v in col.items() if v},
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur traitement arrêts: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════
# 2. Upload — KPI Axes 2025 (multi-feuilles)
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/dat03/upload_kpi_axes")
async def upload_kpi_axes(file: UploadFile = File(...)):
    sb = get_client() if get_client else None
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase non configuré")

    try:
        contents = await file.read()
        xl = pd.ExcelFile(io.BytesIO(contents), engine="openpyxl")

        # Indicateurs de section à ignorer (headers visuels Excel, pas des KPI)
        SECTION_HEADERS = {"objectif trimestriel", "semaine", ""}

        rows = []
        sheets_processed = []
        sheets_skipped = []

        for sheet_name in xl.sheet_names:
            df = xl.parse(sheet_name, header=0)
            df.dropna(how="all", axis=1, inplace=True)
            df.dropna(how="all", axis=0, inplace=True)

            if df.empty or len(df.columns) < 2:
                sheets_skipped.append(str(sheet_name))
                continue

            axe_nom = str(sheet_name).strip()
            sheets_processed.append(axe_nom)

            # Col A = nom indicateur, reste = colonnes semaines (Réalisé 2023, YTD, 1..52)
            ind_col      = df.columns[0]
            semaine_cols = df.columns[1:]

            for _, row in df.iterrows():
                indicateur = safe_str(row.get(ind_col))
                if not indicateur:
                    continue
                if indicateur.lower().strip() in SECTION_HEADERS:
                    continue

                for sem_col in semaine_cols:
                    sem_str = str(sem_col).strip()
                    val     = row.get(sem_col)

                    if val is None or (isinstance(val, float) and pd.isna(val)):
                        continue

                    val_float = safe_float(val)
                    if val_float is None:
                        continue

                    rows.append({
                        "hash_id":    make_hash(axe_nom, indicateur, sem_str),
                        "axe_nom":    axe_nom,
                        "indicateur": indicateur,
                        "semaine":    sem_str,
                        "valeur":     val_float,
                    })

        if not rows:
            return {"status": "ok", "message": "Aucune donnée KPI valide", "inserted": 0, "axes_traites": sheets_processed}

        inserted = upsert_batch(sb, "kpi_axes_2025", rows)

        return {
            "status": "ok",
            "message": f"{inserted} enregistrements KPI insérés / mis à jour",
            "axes_traites": sheets_processed,
            "axes_ignores": sheets_skipped,
            "inserted": inserted,
            "total_records": len(rows),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur traitement KPI Axes: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════
# 3. Upload — Base Export 2025
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/dat03/upload_export")
async def upload_export(file: UploadFile = File(...)):
    sb = get_client() if get_client else None
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase non configuré")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
        df = clean_df(df)

        col = {
            "navire":              find_col(df, "navire", "navires"),
            "date_bl":             find_col(df, "date bl", "date_bl"),
            "tonnage_bl":          find_col(df, "tonnage b/l", "tonnage_bl"),
            "tonnage_total_bl":    find_col(df, "tonnage total"),
            "facturation":         find_col(df, "facturation"),
            "nb_qualites":         find_col(df, "nombre de qualit", "nb_qualit"),
            "famille_qualite":     find_col(df, "famille de qualit", "famille qualit"),
            "qualite":             find_col(df, "qualité", "qualite"),
            "incoterm":            find_col(df, "incoterm"),
            "prix_unitaire_usd":   find_col(df, "p/u s", "p u s", "prix unitaire"),
            "valeur_usd":          find_col(df, "valeur $", "valeur_usd"),
            "region":              find_col(df, "region", "région"),
            "destination":         find_col(df, "destination"),
            "sur_veh":             find_col(df, "sur veh", "sur_veh"),
            "surveillant_interne": find_col(df, "surveillant"),
            "loa":                 find_col(df, "loa"),
            "type_navire":         find_col(df, "type"),
            "categorie_navire":    find_col(df, "catégo", "catego", "catégorie"),
            "quai":                find_col(df, "quai"),
        }

        required = ["navire", "date_bl"]
        missing = [k for k in required if not col.get(k)]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Colonnes obligatoires manquantes: {missing}. Colonnes trouvées: {list(df.columns)}"
            )

        key_cols = [col[k] for k in required if col.get(k)]
        df.dropna(subset=key_cols, inplace=True)

        rows = []
        skipped = 0

        for _, row in df.iterrows():
            def g(key):
                c = col.get(key)
                return safe_str(row.get(c)) if c else None

            def f(key):
                c = col.get(key)
                return safe_float(row.get(c)) if c else None

            navire_val  = g("navire") or ""
            date_bl_val = g("date_bl") or ""
            qualite_val = g("qualite") or ""
            tonnage_val = str(f("tonnage_bl") or "")

            if not navire_val or not date_bl_val:
                skipped += 1
                continue

            rows.append({
                "hash_id":             make_hash(navire_val, date_bl_val, qualite_val, tonnage_val),
                "navire":              navire_val,
                "date_bl":             date_bl_val[:10] if len(date_bl_val) >= 10 else date_bl_val,
                "tonnage_bl":          f("tonnage_bl"),
                "tonnage_total_bl":    f("tonnage_total_bl"),
                "facturation":         g("facturation"),
                "nb_qualites":         safe_int(row.get(col["nb_qualites"])) if col.get("nb_qualites") else None,
                "famille_qualite":     g("famille_qualite"),
                "qualite":             qualite_val,
                "incoterm":            g("incoterm"),
                "prix_unitaire_usd":   f("prix_unitaire_usd"),
                "valeur_usd":          f("valeur_usd"),
                "region":              g("region"),
                "destination":         g("destination"),
                "sur_veh":             g("sur_veh"),
                "surveillant_interne": g("surveillant_interne"),
                "loa":                 f("loa"),
                "type_navire":         g("type_navire"),
                "categorie_navire":    g("categorie_navire"),
                "quai":                g("quai"),
            })

        if not rows:
            return {"status": "ok", "message": "Aucune ligne valide", "inserted": 0, "skipped": skipped}

        inserted = upsert_batch(sb, "export_2025", rows)

        return {
            "status": "ok",
            "message": f"{inserted} exports insérés / mis à jour (anti-doublons actif)",
            "total_lignes": len(df),
            "inserted": inserted,
            "skipped": skipped,
            "colonnes_detectees": {k: v for k, v in col.items() if v},
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur traitement export: {str(e)}")


# ═══════════════════════════════════════════════════════════════════════════
# 4. Stats Dashboard — comptage des lignes dans chaque table
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/dat03/stats")
async def get_dat03_stats():
    sb = get_client() if get_client else None
    if not sb:
        return {"arrets": 0, "kpi": 0, "export": 0, "error": "Supabase non configuré"}
    try:
        r_arrets = sb.table("arrets_2025").select("id", count="exact").execute()
        r_kpi    = sb.table("kpi_axes_2025").select("id", count="exact").execute()
        r_export = sb.table("export_2025").select("id", count="exact").execute()
        return {
            "arrets": r_arrets.count or 0,
            "kpi":    r_kpi.count or 0,
            "export": r_export.count or 0,
        }
    except Exception as e:
        return {"arrets": 0, "kpi": 0, "export": 0, "error": str(e)}
