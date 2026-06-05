# ===============================
# 1. IMPORT LIBRARIES
# ===============================
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

sns.set(style="whitegrid")
plt.rcParams['figure.figsize'] = (10, 6)

# ===============================
# 2. LOAD DATA
# ===============================
file_path = r"C:\Users\LENOVO\Desktop\export_data.xlsx"

df = pd.read_excel(file_path, engine='openpyxl')

print("✅ Fichier chargé")

# ===============================
# 3. CLEAN COLUMN NAMES
# ===============================
df.columns = df.columns.str.strip()
df.columns = df.columns.str.replace('\n', ' ')
df.columns = df.columns.str.replace('  ', ' ')

print("\n📌 Colonnes trouvées :")
for col in df.columns:
    print(f"'{col}'")

# ===============================
# 4. AUTO DETECT COLUMN NAMES
# ===============================
def find_column(name):
    for col in df.columns:
        if name.lower() in col.lower():
            return col
    return None

col_tonnage     = find_column("tonnage")
col_cadence     = find_column("cadence")
col_date        = find_column("date")
col_region      = find_column("region")
col_destination = find_column("dest")

# ✅ CORRECTION : utiliser 'Famille de qualité' au lieu de 'Qualité'
col_qualite = find_column("famille de qualité")
if col_qualite is None:
    col_qualite = find_column("famille de qualite")   # fallback sans accent
if col_qualite is None:
    col_qualite = find_column("famille")              # fallback générique

print("\n✅ Colonnes utilisées :")
print("Tonnage     :", col_tonnage)
print("Cadence     :", col_cadence)
print("Date        :", col_date)
print("Qualité     :", col_qualite)   # affichera 'Famille de qualité'
print("Region      :", col_region)
print("Destination :", col_destination)

# ===============================
# 5. DATA CLEANING
# ===============================
df[col_tonnage] = df[col_tonnage].astype(str).str.replace(" ", "")
df[col_tonnage] = pd.to_numeric(df[col_tonnage], errors='coerce')

df[col_cadence] = pd.to_numeric(df[col_cadence], errors='coerce')

df[col_date] = pd.to_datetime(df[col_date], errors='coerce')

df['Mois'] = df[col_date].dt.month

df = df.dropna(subset=[col_tonnage])

# Nettoyage colonne qualité
df[col_qualite] = df[col_qualite].astype(str).str.strip().str.upper()
df = df[~df[col_qualite].isin(["NAN", "", "NONE"])]

print("\n✅ Nettoyage terminé")
print(f"   Familles de qualité trouvées : {sorted(df[col_qualite].unique())}")

# ===============================
# 6. STATS
# ===============================
print("\n===== STAT TONNAGE =====")
print(df[col_tonnage].describe())

# ===============================
# 7. GRAPHS
# ===============================
plt.figure()
sns.histplot(df[col_tonnage], bins=30, kde=True)
plt.title("Distribution des tonnages")
plt.tight_layout()
plt.show()

plt.figure()
sns.boxplot(x=df[col_tonnage])
plt.title("Boxplot tonnage")
plt.tight_layout()
plt.show()

# ===============================
# 8. PAR FAMILLE DE QUALITÉ
# ===============================
plt.figure()
df.groupby(col_qualite)[col_tonnage].sum().sort_values().plot(kind='barh', color='steelblue')
plt.title("Tonnage par famille de qualité")
plt.xlabel("Tonnage (t)")
plt.tight_layout()
plt.show()

# ===============================
# 9. PAR REGION
# ===============================
plt.figure()
df.groupby(col_region)[col_tonnage].sum().sort_values().plot(kind='barh', color='seagreen')
plt.title("Tonnage par région")
plt.xlabel("Tonnage (t)")
plt.tight_layout()
plt.show()

# ===============================
# 10. DESTINATIONS
# ===============================
plt.figure()
df.groupby(col_destination)[col_tonnage].sum().nlargest(10).plot(kind='bar', color='coral')
plt.title("Top 10 destinations")
plt.xlabel("Destination")
plt.ylabel("Tonnage (t)")
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.show()

# ===============================
# 11. EVOLUTION MENSUELLE
# ===============================
monthly = df.groupby('Mois')[col_tonnage].sum()

plt.figure()
monthly.plot(marker='o', color='navy')
plt.title("Evolution mensuelle du tonnage")
plt.xlabel("Mois")
plt.ylabel("Tonnage (t)")
plt.grid()
plt.tight_layout()
plt.show()

# ===============================
# 12. SAVE
# ===============================
summary = df[col_tonnage].describe()
summary.to_excel("resume.xlsx")

print("\n✅ Analyse terminée et sauvegardée")