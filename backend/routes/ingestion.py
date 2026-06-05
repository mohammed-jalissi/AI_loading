"""
ingestion.py — Routes pour l'ingestion de données en masse vers Supabase (Mode REAL)
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import hashlib
import sys
import os

# Ajout du dossier parent au path pour importer db_config si besoin
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
try:
    from db_config import get_client
except ImportError:
    get_client = None

router = APIRouter()

class NavireIngest(BaseModel):
    nom: str
    arrivee: int = 0
    priorite: int = 2
    laytime: float = 40.0
    demurrage_rate: float = 1000.0

class LotIngest(BaseModel):
    navire_nom: str
    qualite: str
    td: float
    ordre_lot: int = 1

class StockIngest(BaseModel):
    hall: str
    qualite: str
    quantite: float

class ArretIngest(BaseModel):
    equipement_nom: str
    type_anomalie: str
    gravite: str
    probabilite: float = 0.99

@router.post("/ingest/navires")
def ingest_navires(navires: List[NavireIngest]):
    sb = get_client() if get_client else None
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    data_to_insert = []
    # On génère une date d'arrivée basique car on utilise surtout l'heure relative
    from datetime import datetime, timezone
    now_str = datetime.now(timezone.utc).isoformat()
    
    for n in navires:
        data_to_insert.append({
            "nom": n.nom,
            "date_arrivee": now_str,
            "heure_arrivee_relative": n.arrivee,
            "priorite": n.priorite,
            "laytime": n.laytime,
            "demurrage_rate": n.demurrage_rate
        })
    
    # Upsert based on name
    res = sb.table("navires").upsert(data_to_insert, on_conflict="nom").execute()
    return {"status": "ok", "inserted": len(res.data) if res.data else 0}


@router.post("/ingest/lots")
def ingest_lots(lots: List[LotIngest]):
    sb = get_client() if get_client else None
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    # Need to map navire_nom to navire_id
    navires_res = sb.table("navires").select("id, nom").execute()
    if not navires_res.data:
        raise HTTPException(status_code=400, detail="No vessels found in database. Ingest vessels first.")
        
    navire_map = {n["nom"]: n["id"] for n in navires_res.data}
    
    data_to_insert = []
    for lot in lots:
        nid = navire_map.get(lot.navire_nom)
        if not nid:
            continue # Skip lots for unknown vessels
            
        data_to_insert.append({
            "navire_id": nid,
            "qualite": lot.qualite,
            "tonnage_declare": lot.td,
            "ordre_lot": lot.ordre_lot
        })
        
    if not data_to_insert:
        return {"status": "error", "message": "No matching vessels found for lots"}
        
    # First clear existing lots to avoid duplicates for the same vessel if we re-ingest
    navire_ids_to_clear = list(set([d["navire_id"] for d in data_to_insert]))
    sb.table("lots").delete().in_("navire_id", navire_ids_to_clear).execute()
    
    res = sb.table("lots").insert(data_to_insert).execute()
    return {"status": "ok", "inserted": len(res.data) if res.data else 0}


@router.post("/ingest/stocks")
def ingest_stocks(stocks: List[StockIngest]):
    sb = get_client() if get_client else None
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
        
    data_to_insert = []
    from datetime import datetime, timezone
    now_str = datetime.now(timezone.utc).isoformat()
    
    for s in stocks:
        data_to_insert.append({
            "hall": s.hall,
            "qualite": s.qualite,
            "quantite": s.quantite,
            "date_mise_a_jour": now_str
        })
        
    res = sb.table("stocks").upsert(data_to_insert, on_conflict="hall,qualite").execute()
    return {"status": "ok", "inserted": len(res.data) if res.data else 0}


@router.post("/ingest/arrets")
def ingest_arrets(arrets: List[ArretIngest]):
    sb = get_client() if get_client else None
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
        
    data_to_insert = []
    from datetime import datetime, timezone
    now_str = datetime.now(timezone.utc).isoformat()
    
    for a in arrets:
        data_to_insert.append({
            "equipement_nom": a.equipement_nom,
            "type_anomalie": a.type_anomalie,
            "probabilite": a.probabilite,
            "gravite": a.gravite,
            "date_detection": now_str
        })
        
    res = sb.table("anomalies_historique").insert(data_to_insert).execute()
    return {"status": "ok", "inserted": len(res.data) if res.data else 0}


# ─── Upload Excel Historique 2025 ──────────────────────────────────────────

@router.post("/ingest/upload_historique")
async def upload_historique(file: UploadFile = File(...)):
    sb = get_client() if get_client else None
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    try:
        # Lire Excel avec Pandas
        contents = await file.read()
        df = pd.read_excel(contents, engine='openpyxl')
        
        # 1. Nettoyage : Supprimer les colonnes 100% vides
        df.dropna(how='all', axis=1, inplace=True)
        
        # 2. Nettoyage : Supprimer les lignes où 'Date' ou 'Axe' est vide
        # Adapter les noms de colonnes selon le fichier réel (Date, Axe, Début)
        date_col = next((col for col in df.columns if 'date' in col.lower()), None)
        axe_col = next((col for col in df.columns if 'axe' in col.lower()), None)
        debut_col = next((col for col in df.columns if 'début' in col.lower() or 'debut' in col.lower()), None)
        
        if not (date_col and axe_col and debut_col):
            raise HTTPException(status_code=400, detail="Colonnes obligatoires manquantes (Date, Axe, Début)")
            
        df.dropna(subset=[date_col, axe_col, debut_col], inplace=True)
        
        # 3. Remplacer les NaN restants par None pour le JSON Supabase
        df = df.where(pd.notnull(df), None)
        
        data_to_upsert = []
        for _, row in df.iterrows():
            # Création d'un Hash unique anti-doublon: Date + Axe + Début
            date_val = str(row[date_col]).strip()
            axe_val = str(row[axe_col]).strip()
            debut_val = str(row[debut_col]).strip()
            
            hash_str = f"{date_val}_{axe_val}_{debut_val}".encode('utf-8')
            hash_id = hashlib.md5(hash_str).hexdigest()
            
            data_to_upsert.append({
                "hash_id": hash_id,
                "date": date_val,
                "poste": row.get('Poste', None),
                "hall": row.get('Hall', None),
                "axe": axe_val,
                "debut": debut_val,
                "fin": row.get('Fin', None),
                "duree_h": row.get('Durée h', 0.0),
                "cause": row.get('Cause', None),
                "nature": row.get('Nature', None),
                "navire": row.get('Navire', None),
                "qualite": row.get('Qualité', None),
                "quai": row.get('Quai', None)
            })
            
        # 4. Upsert dans Supabase (on_conflict sur hash_id)
        # Note: La table doit exister avec hash_id comme clé UNIQUE.
        res = sb.table("historique_arrets_2025").upsert(data_to_upsert, on_conflict="hash_id").execute()
        inserted_count = len(res.data) if res.data else 0
        
        return {
            "status": "ok", 
            "message": f"{inserted_count} lignes traitées avec succès (anti-doublons actif).",
            "lignes_recues": len(df),
            "colonnes_nettoyees": len(df.columns)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de traitement: {str(e)}")

@router.post("/ingest/upload_kpi")
async def upload_kpi(file: UploadFile = File(...)):
    sb = get_client() if get_client else None
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
    
    try:
        contents = await file.read()
        df = pd.read_excel(contents, engine='openpyxl')
        df.dropna(how='all', axis=1, inplace=True)
        
        semaine_col = next((col for col in df.columns if 'semaine' in col.lower()), None)
        axe_col = next((col for col in df.columns if 'axe' in col.lower()), None)
        
        if not (semaine_col and axe_col):
            raise HTTPException(status_code=400, detail="Colonnes manquantes (Semaine, Axe)")
            
        df.dropna(subset=[semaine_col, axe_col], inplace=True)
        df = df.where(pd.notnull(df), None)
        
        data_to_upsert = []
        for _, row in df.iterrows():
            semaine_val = str(row[semaine_col]).strip()
            axe_val = str(row[axe_col]).strip()
            
            hash_str = f"S{semaine_val}_{axe_val}".encode('utf-8')
            hash_id = hashlib.md5(hash_str).hexdigest()
            
            data_to_upsert.append({
                "hash_id": hash_id,
                "semaine": int(float(semaine_val)),
                "axe_nom": axe_val,
                "trg": row.get('TRG(%)', 0.0),
                "mtbf": row.get('MTBF', 0.0),
                "mttr": row.get('MTTR(h)', 0.0),
                "taux_disponibilite": row.get('Taux de disponibilité (%)', 0.0)
            })
            
        res = sb.table("kpi_hebdo_axes").upsert(data_to_upsert, on_conflict="hash_id").execute()
        return {"status": "ok", "message": f"{len(res.data) if res.data else 0} KPI traités."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# In-memory sync history
sync_history_db = []

@router.get("/ingest/status")
def check_status():
    sb = get_client() if get_client else None
    if not sb:
        return {"status": "offline", "message": "Supabase client not configured"}
    try:
        # Test connection
        sb.table("navires").select("id").limit(1).execute()
        return {"status": "connected"}
    except Exception as e:
        return {"status": "offline", "message": str(e)}

class SqlQuery(BaseModel):
    query: str

@router.post("/sql/execute")
def execute_sql(sql: SqlQuery):
    # As raw SQL is not directly supported by PostgREST without an RPC,
    # we'll provide a placeholder implementation that tries to parse basic SELECTs
    # or falls back to an error asking to use Supabase Studio.
    sb = get_client() if get_client else None
    if not sb:
        raise HTTPException(status_code=500, detail="Supabase client not configured")
        
    q = sql.query.strip().lower()
    if q.startswith("select") and "from" in q:
        parts = q.split("from")
        if len(parts) > 1:
            table_name = parts[1].strip().split(" ")[0].strip(";")
            try:
                res = sb.table(table_name).select("*").limit(10).execute()
                return {"status": "success", "data": res.data}
            except Exception as e:
                return {"status": "error", "message": f"Table '{table_name}' query failed: {str(e)}"}
                
    return {"status": "error", "message": "Only basic 'SELECT * FROM table' queries are supported via this API. Use Supabase Studio for complex queries."}

# ─── Sync History ───────────────────────────────────────────────────────────

@router.get("/ingest/history")
def get_history():
    """Return the last 50 sync history entries with aggregate health metrics."""
    total  = len(sync_history_db)
    ok     = sum(1 for e in sync_history_db if e.get("status") == "success")
    rate   = round((ok / total) * 100) if total else 100
    return {
        "history": sync_history_db,
        "health": {
            "successRate":    rate,
            "totalRuns":      total,
            "successfulRuns": ok,
        }
    }

@router.post("/ingest/history")
def add_history(entry: dict):
    from datetime import datetime, timezone
    entry["timestamp"] = datetime.now(timezone.utc).isoformat()
    sync_history_db.insert(0, entry)
    if len(sync_history_db) > 50:
        sync_history_db.pop()
    return {"status": "ok"}


# ─── CRON Scheduling ─────────────────────────────────────────────────────────

# In-memory schedule store (extend to a DB table in production)
schedule_db: list[dict] = []

class ScheduleConfig(BaseModel):
    entity:    str
    frequency: str          # e.g. "Every 1 Hour", "Daily at Midnight"
    active:    bool = True

@router.post("/ingest/schedule")
def set_schedule(cfg: ScheduleConfig):
    """Register or update a cron schedule for an entity."""
    from datetime import datetime, timezone
    # Remove existing schedule for the same entity
    global schedule_db
    schedule_db = [s for s in schedule_db if s.get("entity") != cfg.entity]
    entry = {
        "entity":    cfg.entity,
        "frequency": cfg.frequency,
        "active":    cfg.active,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    schedule_db.append(entry)
    return {"status": "scheduled", "schedule": entry}

@router.get("/ingest/schedule")
def get_schedules():
    """List all active schedules."""
    return {"schedules": schedule_db}


# ─── Meteo Proxy ─────────────────────────────────────────────────────────────

@router.get("/ingest/meteo")
def get_meteo():
    try:
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        from meteo_api import get_forecast_48h
        forecasts = get_forecast_48h()
        if not forecasts:
            return {"status": "error", "message": "Could not fetch meteo"}
        rows = [
            {
                "datetime":    f["datetime"].strftime("%Y-%m-%d %H:%M:%S"),
                "temp":        f["temp"],
                "vent_kmh":    f["vent_kmh"],
                "pluie_mm":    f["pluie_mm"],
                "description": f["description"],
            }
            for f in forecasts
        ]
        return {"status": "ok", "data": rows}
    except Exception as e:
        return {"status": "error", "message": str(e)}
