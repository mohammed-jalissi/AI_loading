import pandas as pd
import os

JPH_FILE_PATH = os.path.join(os.path.dirname(__file__), '../../JPH_Analyse_20260516_1832.xlsx')

# Cache
_jph_data = None

def get_jph_financial_data():
    """
    Lit le fichier Excel JPH et extrait les métriques financières par navire.
    Retourne un dictionnaire: { "NOM_NAVIRE": {"TGB": float, "PU": float} }
    """
    global _jph_data
    if _jph_data is not None:
        return _jph_data

    _jph_data = {}
    
    if not os.path.exists(JPH_FILE_PATH):
        # Fallback silencieux si le fichier n'est pas présent
        print(f"Warning: Fichier JPH introuvable à {JPH_FILE_PATH}")
        return _jph_data

    try:
        # Lire le fichier (sheet 0, l'entête est à la ligne 1 qui correspond à header=1 dans pandas)
        df = pd.read_excel(JPH_FILE_PATH, sheet_name=0, header=1)
        
        # Nettoyer les noms de colonnes
        df.columns = df.columns.str.strip()
        
        # Identifier les colonnes
        col_navire = "Navire"
        col_tgb = "TGB ($/j)"
        col_pu = "PU ($)"
        
        # Vérifier si les colonnes existent
        if col_navire in df.columns and col_tgb in df.columns and col_pu in df.columns:
            for _, row in df.iterrows():
                navire = str(row[col_navire]).strip().upper()
                tgb = float(row[col_tgb]) if pd.notna(row[col_tgb]) else 15000.0
                pu = float(row[col_pu]) if pd.notna(row[col_pu]) else 500.0
                
                # S'il y a plusieurs lots (plusieurs lignes pour un même navire), on prend la moyenne du PU
                if navire in _jph_data:
                    _jph_data[navire]["PU"] = (_jph_data[navire]["PU"] + pu) / 2.0
                    _jph_data[navire]["TGB"] = max(_jph_data[navire]["TGB"], tgb) # On garde le TGB max
                else:
                    _jph_data[navire] = {"TGB": tgb, "PU": pu}
    except Exception as e:
        print(f"Erreur lors de la lecture du fichier JPH : {e}")

    return _jph_data

def enrich_vessel_with_financials(navire_dict):
    """
    Enrichit un dictionnaire navire avec les données financières réelles du fichier JPH.
    Si le navire n'est pas trouvé, applique des valeurs par défaut.
    """
    data = get_jph_financial_data()
    nom = navire_dict.get("nom", "").strip().upper()
    
    # Valeurs par défaut si le navire n'est pas dans l'excel
    default_tgb = 15000.0  # 15k$ par jour
    default_pu = 500.0     # 500$ par tonne
    
    if nom in data:
        navire_dict["demurrage_rate"] = data[nom]["TGB"]
        navire_dict["PU"] = data[nom]["PU"]
    else:
        navire_dict["demurrage_rate"] = navire_dict.get("demurrage_rate", default_tgb)
        navire_dict["PU"] = default_pu
        
    return navire_dict
