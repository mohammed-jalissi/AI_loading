"""
config.py — Infrastructure constants extracted from streamlit_app.py
AI Loading Planner OCP Jorf Lasfar v4.0
"""

# ─────────────────────────────────────────────
#  QUAIS
# ─────────────────────────────────────────────
QUAIS = ["1N", "1BIS", "1TER", "2N", "2BIS", "2TER"]
MAX_VESSELS_PER_QUAI = 1

# ─────────────────────────────────────────────
#  AXES U — Convoyeurs (6 axes)
# ─────────────────────────────────────────────
AXES_U = {
    "TB1":  {"cadence": 900, "halls": ["JFC1HE05","JFC1HE06","JFC2HE05","JFC2HE06","JFC3HE05","JFC3HE06","JFC4HE05","JFC4HE06","JFC5-3010","JFC5-309","HE03-107F"]},
    "TB2":  {"cadence": 900, "halls": ["JFC1HE05","JFC1HE06","JFC2HE05","JFC2HE06","JFC3HE05","JFC3HE06","JFC4HE05","JFC4HE06","JFC5-3010","JFC5-309","HE03-107F"]},
    "TB3":  {"cadence": 900, "halls": ["JFC1HE05","JFC1HE06","JFC2HE05","JFC2HE06","JFC3HE05","JFC3HE06","JFC4HE05","JFC4HE06","JFC5-3010","JFC5-309","HE03-107F"]},
    "Axe1": {"cadence": 500, "halls": ["HE01","HE01Bis","HE02","HE02Bis","HE03","HE03Bis","HE04","HE04Bis","HE05","HE06","18A","18B","18C"]},
    "Axe2": {"cadence": 500, "halls": ["HE01","HE01Bis","HE02","HE02Bis","HE03","HE03Bis","HE04","HE04Bis","HE05","HE06","18A","18B","18C"]},
    "Axe3": {"cadence": 900, "halls": ["HE01","HE01Bis","HE02","HE02Bis","HE03","HE03Bis","HE04","HE04Bis","HE05","HE06","18A","18B","18C"]},
}
ALL_AXES = AXES_U

# ─────────────────────────────────────────────
#  PORTIQUES ET AXES P
# ─────────────────────────────────────────────
# Axe P is a sequence of conveyors giving to the dock and portiques
AXES_P = {
    "1N":   ["G1","G2"],
    "1BIS": ["G3","G4"],
    "1TER": ["G3","G4"],
    "2N":   ["GH14","GH13","GH4","GH3"],
    "2BIS": ["GH14","GH13","GH4","GH3"],
    "2TER": ["GH14","GH13","GH4","GH3"],
}

PORTIQUES = {
    "1N": ["PK1", "PK2"],
    "1S": ["PK1", "PK2"],
    "1BIS": ["P3", "P4"],
    "1TER": ["P3", "P4"],
    "2N": ["CH3"],
    "2S": ["CH3"],
    "2BIS": ["P01", "P02"],
    "2TER": ["P01", "P02"]
}

QUAI_POSTE = {
    "1N":"P1","1BIS":"P1","1TER":"P1",
    "2N":"P2","2BIS":"P2","2TER":"P3",
}

# ─────────────────────────────────────────────
#  HALLS
# ─────────────────────────────────────────────
HALLS_JLS = {
    "JFO": ["JFC1HE05", "JFC1HE06"],
    "JFD": ["JFC2HE05", "JFC2HE06"],
    "JFT": ["JFC3HE05", "JFC3HE06"],
    "JFQ": ["JFC4HE05", "JFC4HE06"],
    "JFF": ["JFC5-3010", "JFC5-309"],
    "107F": ["HE03-107F"]
}

HALLS_JLN = [
    "18A", "18B", "18C",
    "HE01", "HE01Bis",
    "HE02", "HE02Bis",
    "HE03", "HE03Bis",
    "HE04", "HE04Bis",
    "HE05", "HE06"
]

# ─────────────────────────────────────────────
#  QUALITES & COMPATIBILITÉS
# ─────────────────────────────────────────────
QUALITES = [
    "DAP EURO LOW CD","DAP SPECIAL DARK","DAP SPECIAL","DAP SPC","DAP STANDARD",
    "DAP TANZANIE","DAP BANGLADESH","MAP 11-52 SPC","MAP 10-50 SPC",
    "MAP 11 52 Special Low Cd","TSP CIV","TSP LOW CD","TSP SPECIAL JORF",
    "TSP Bangladesh","NPS 13-37-15S","NPS 12 45 5S IZN","NPS 15 15 15 Low Cd",
]

QUALITE_HALLS = {
    "DAP EURO LOW CD":          ["JFC1HE05","JFC1HE06","JFC2HE05","JFC2HE06","HE05","HE06"],
    "DAP SPECIAL DARK":         ["JFC1HE05","JFC1HE06","JFC2HE05","JFC2HE06","HE05","HE06","18B"],
    "DAP SPECIAL":              ["JFC2HE05","JFC2HE06","JFC4HE05","JFC4HE06","HE05","HE06"],
    "DAP SPC":                  ["JFC2HE05","JFC2HE06","JFC4HE05","JFC4HE06","HE05","HE06"],
    "DAP STANDARD":             ["JFC1HE05","JFC1HE06","JFC2HE05","JFC2HE06","HE05","HE06"],
    "DAP TANZANIE":             ["JFC1HE05","JFC1HE06","JFC2HE05","JFC2HE06","HE05","HE06"],
    "DAP BANGLADESH":           ["JFC1HE05","JFC1HE06","JFC2HE05","JFC2HE06","HE05","18B"],
    "MAP 11-52 SPC":            ["JFC1HE05","JFC1HE06","JFC4HE05","JFC4HE06","HE03","HE03Bis","HE04","HE04Bis","18A","18B"],
    "MAP 10-50 SPC":            ["JFC1HE05","JFC1HE06","JFC4HE05","JFC4HE06","HE03","HE03Bis","HE04","HE04Bis"],
    "MAP 11 52 Special Low Cd": ["JFC4HE05","JFC4HE06","HE03","HE03Bis","18A"],
    "TSP CIV":                  ["JFC5-3010","JFC5-309","HE03-107F","HE01","HE01Bis","HE02","HE02Bis"],
    "TSP LOW CD":               ["HE03-107F","HE01","HE01Bis","HE02","HE02Bis"],
    "TSP SPECIAL JORF":         ["JFC5-3010","JFC5-309","HE01","HE01Bis","HE02","HE02Bis","18A"],
    "TSP Bangladesh":           ["JFC5-3010","JFC5-309","HE01","HE01Bis","HE02","HE02Bis","18B"],
    "NPS 13-37-15S":            ["JFC3HE05","JFC3HE06","HE04","HE04Bis","18C"],
    "NPS 12 45 5S IZN":         ["JFC3HE05","JFC3HE06","HE04","HE04Bis","18C"],
    "NPS 15 15 15 Low Cd":      ["JFC3HE05","JFC3HE06","HE04","HE04Bis","18C"],
}

# ─────────────────────────────────────────────
#  TIMING CONSTANTS
# ─────────────────────────────────────────────
T_ACC_PREP    = 5
T_FINITION    = 1
T_CTE_FC      = 2
T_REACCOSTAGE = 2
H_DAY_BREAK   = 24
GAMMA_PEN_ML_FACTOR = 0.5  # Pénalité risque ML = 0.5 × tonnage_moyen_par_lot (auto-calibré)
DEFAULT_LAYTIME = 40
DEFAULT_DEMURRAGE_RATE = 1000

# ─────────────────────────────────────────────
#  STOCKS FICTIFS
# ─────────────────────────────────────────────
STOCKS_FICTIFS = {
    "JFC1HE05":  {"MAP 11-52 SPC":20000,"DAP EURO LOW CD":17500,"DAP TANZANIE":14000,"DAP SPECIAL DARK":15000,"DAP STANDARD":10000,"MAP 10-50 SPC":12500},
    "JFC1HE06":  {"MAP 11-52 SPC":20000,"DAP EURO LOW CD":17500,"DAP TANZANIE":14000,"DAP SPECIAL DARK":15000,"DAP STANDARD":10000,"MAP 10-50 SPC":12500},
    "JFC2HE05":  {"DAP EURO LOW CD":11000,"DAP SPC":7000,"DAP TANZANIE":6000,"DAP SPECIAL":9000,"DAP STANDARD":7500,"DAP BANGLADESH":4500},
    "JFC2HE06":  {"DAP EURO LOW CD":11000,"DAP SPC":7000,"DAP TANZANIE":6000,"DAP SPECIAL":9000,"DAP STANDARD":7500,"DAP BANGLADESH":4500, "TSP CIV":20000},
    "JFC3HE05":  {"NPS 13-37-15S":7500,"NPS 12 45 5S IZN":6000,"NPS 15 15 15 Low Cd":5000},
    "JFC3HE06":  {"NPS 13-37-15S":7500,"NPS 12 45 5S IZN":6000,"NPS 15 15 15 Low Cd":5000},
    "JFC4HE05":  {"MAP 11-52 SPC":16000,"DAP SPC":5500,"MAP 10-50 SPC":10000,"MAP 11 52 Special Low Cd":4000,"TSP SPECIAL JORF":7000},
    "JFC4HE06":  {"MAP 11-52 SPC":16000,"DAP SPC":5500,"MAP 10-50 SPC":10000,"MAP 11 52 Special Low Cd":4000,"TSP SPECIAL JORF":7000, "TSP CIV":18000,"TSP LOW CD":22000,"TSP Bangladesh":10000},
    "JFC5-3010": {"TSP CIV":12500,"TSP SPECIAL JORF":9000,"TSP Bangladesh":6000},
    "JFC5-309":  {"TSP CIV":12500,"TSP SPECIAL JORF":9000,"TSP Bangladesh":6000},
    "HE03-107F": {"TSP LOW CD":15000},
    "HE01":      {"TSP CIV":6000,"TSP SPECIAL JORF":4000,"TSP LOW CD":5000},
    "HE01Bis":   {"TSP CIV":6000,"TSP SPECIAL JORF":4000,"TSP LOW CD":5000},
    "HE02":      {"TSP CIV":5000,"TSP LOW CD":4500,"TSP Bangladesh":4000},
    "HE02Bis":   {"TSP CIV":5000,"TSP LOW CD":4500,"TSP Bangladesh":4000},
    "HE03":      {"MAP 11-52 SPC":11000,"MAP 10-50 SPC":9000,"MAP 11 52 Special Low Cd":3000},
    "HE03Bis":   {"MAP 11-52 SPC":11000,"MAP 10-50 SPC":9000,"MAP 11 52 Special Low Cd":3000},
    "HE04":      {"MAP 11-52 SPC":9000,"NPS 13-37-15S":5500,"NPS 12 45 5S IZN":4500},
    "HE04Bis":   {"MAP 11-52 SPC":9000,"NPS 13-37-15S":5500,"NPS 12 45 5S IZN":4500},
    "HE05":      {"DAP EURO LOW CD":28000,"DAP SPC":16000,"DAP SPECIAL DARK":20000,"DAP SPECIAL":14000},
    "HE06":      {"DAP EURO LOW CD":20000,"DAP SPC":12000,"DAP STANDARD":15000,"DAP TANZANIE":10000},
    "18A":       {"MAP 11-52 SPC":14000,"TSP SPECIAL JORF":9000,"MAP 11 52 Special Low Cd":5000},
    "18B":       {"MAP 10-50 SPC":12000,"DAP BANGLADESH":10000,"DAP SPECIAL DARK":8000},
    "18C":       {"NPS 13-37-15S":8000,"NPS 15 15 15 Low Cd":7000},
}

# ─────────────────────────────────────────────
#  NAVIRES FICTIFS (Demo Data)
# ─────────────────────────────────────────────
NAVIRES_FICTIFS = [
    {"nom":"SE NICKY",     "arrivee":0, "priorite":1, "laytime":48, "demurrage_rate":1200,
     "lots":[{"qualite":"DAP SPECIAL DARK","td":25080}]},
    {"nom":"CLIPPER KENT", "arrivee":2, "priorite":2, "laytime":36, "demurrage_rate":800,
     "lots":[{"qualite":"TSP Bangladesh","td":400},
             {"qualite":"TSP Bangladesh","td":24650}]},
    {"nom":"ULUSOY 9",     "arrivee":0, "priorite":2, "laytime":42, "demurrage_rate":1000,
     "lots":[{"qualite":"DAP SPECIAL","td":11000},
             {"qualite":"NPS 12 45 5S IZN","td":13800}]},
    {"nom":"ES CARE",      "arrivee":1, "priorite":2, "laytime":40, "demurrage_rate":900,
     "lots":[{"qualite":"DAP SPECIAL","td":7700},
             {"qualite":"MAP 11 52 Special Low Cd","td":12100}]},
    {"nom":"NS SHENZHEN",  "arrivee":0, "priorite":3, "laytime":60, "demurrage_rate":1500,
     "lots":[{"qualite":"TSP CIV","td":18991},
             {"qualite":"TSP CIV","td":14009},
             {"qualite":"DAP STANDARD","td":27500}]},
    {"nom":"ASL ARK",      "arrivee":4, "priorite":2, "laytime":36, "demurrage_rate":800,
     "lots":[{"qualite":"DAP SPECIAL","td":5000},
             {"qualite":"TSP SPECIAL JORF","td":24200}]},
    {"nom":"BELFORCE",     "arrivee":0, "priorite":1, "laytime":72, "demurrage_rate":2000,
     "lots":[{"qualite":"MAP 10-50 SPC","td":55000}]},
    {"nom":"NORDIC DALIAN","arrivee":6, "priorite":3, "laytime":48, "demurrage_rate":1100,
     "lots":[{"qualite":"DAP STANDARD","td":15000},
             {"qualite":"TSP CIV","td":1000}]},
    {"nom":"ATLANTA",      "arrivee":0, "priorite":2, "laytime":30, "demurrage_rate":700,
     "lots":[{"qualite":"DAP EURO LOW CD","td":7734},
             {"qualite":"DAP EURO LOW CD","td":3266}]},
    {"nom":"ARKLOW VILLA", "arrivee":3, "priorite":2, "laytime":24, "demurrage_rate":500,
     "lots":[{"qualite":"NPS 15 15 15 Low Cd","td":3000},
             {"qualite":"MAP 11 52 Special Low Cd","td":1000}]},
]

# ─────────────────────────────────────────────
#  CELL STYLES (for Gantt rendering)
# ─────────────────────────────────────────────
CELL_STYLES = {
    "IDLE":         {"bg":"#1A1F2E","color":"#3A4050","label":""},
    "ACC_PREP":     {"bg":"#FFD700","color":"#333333","label":"Accostage & prép."},
    "CHARGEMENT":   {"bg":"#90EE90","color":"#000000","label":"__VAL__"},
    "FINITION":     {"bg":"#FF8C00","color":"#FFFFFF","label":"Finition"},
    "CTE_FC":       {"bg":"#4169E1","color":"#FFFFFF","label":"CTE, FC & app."},
    "ATTENTE_AXE":  {"bg":"#FFFFE0","color":"#666600","label":"Att. axe"},
    "ATTENTE_QUAI": {"bg":"#FFDEAD","color":"#884400","label":"Att. quai"},
    "REACCOSTAGE":  {"bg":"#FFD700","color":"#333333","label":"Ré-accostage"},
    "QUAI_LIBRE":   {"bg":"#1E293B","color":"#475569","label":"Quai libre"},
    "ACHEVE":       {"bg":"#D0D0FF","color":"#4444AA","label":"Achevé"},
    "RADE":         {"bg":"#374151","color":"#94A3B8","label":"En rade"},
    "EN_ATTENTE":   {"bg":"#FFFACD","color":"#888800","label":"En attente"},
    "EPUISEMENT":   {"bg":"#FFA07A","color":"#AA2200","label":"Stock épuisé"},
}

# ─────────────────────────────────────────────
#  MAPPING CONVOYEURS PHYSIQUES -> AXES LOGIQUES
# ─────────────────────────────────────────────
PHYSICAL_TO_LOGICAL_AXIS = {
    # JLN (Nord) -> Axe1, Axe2, Axe3
    "RAA": ["Axe1"], "RA1": ["Axe1"], "RA4": ["Axe1"], "RB1": ["Axe1"], "Crible 1": ["Axe1"], "RC1": ["Axe1"],
    "RAB": ["Axe2"], "RA2": ["Axe2"], "RA5": ["Axe2"], "RB2": ["Axe2"], "Crible 2": ["Axe2"], "RC2": ["Axe2"],
    "RAC": ["Axe3"], "RA3": ["Axe3"], "RA6": ["Axe3"], "RB3": ["Axe3"], "Crible 3": ["Axe3"], "RC3": ["Axe3"],
    
    # JLS (Sud) -> TB1, TB2, TB3
    "A1": ["TB1"], "B1": ["TB1"], "C1P1": ["TB1"], "C1": ["TB1"], "TC1": ["TB1"], "TB1": ["TB1"], "TD1": ["TB1"], "TE1": ["TB1"],
    "A2": ["TB2"], "B2": ["TB2"], "C2P2": ["TB2"], "C2": ["TB2"], "TC2": ["TB2"], "TB2": ["TB2"], "TD2": ["TB2"], "TE2": ["TB2"],
    "A3": ["TB3"], "B3": ["TB3"], "TC3": ["TB3"], "TB3": ["TB3"], "TD3": ["TB3"], "TE3": ["TB3"],
    
    # Docks / Galeries (Impact croisé)
    "G1": ["Axe1", "TB1"], "G2": ["Axe2", "TB2"], "G3": ["Axe3", "TB3"], "G4": ["Axe3", "TB3"],
    "H1": ["Axe1", "TB1"], "H2": ["Axe2", "TB2"], "H3": ["Axe3", "TB3"], "H4": ["Axe3", "TB3"],
    "GH3": ["Axe1", "TB1"], "GH4": ["Axe2", "TB2"], "GH13": ["Axe3", "TB3"], "GH14": ["Axe3", "TB3"]
}

