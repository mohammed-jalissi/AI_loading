# ===============================
# 1. IMPORT LIBRARIES
# ===============================
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import seaborn as sns
from scipy.stats import shapiro, f_oneway

sns.set(style="whitegrid")
plt.rcParams['figure.figsize'] = (10, 6)
plt.rcParams['axes.titlesize'] = 13
plt.rcParams['axes.labelsize'] = 11

import os
desktop = os.path.join(os.path.expanduser("~"), "Desktop")
file_path = os.path.join(desktop, "export_data.xlsx")

# ===============================
# 2. LOAD DATA
# ===============================
df_raw = pd.read_excel(file_path)

df_raw.columns = (
    df_raw.columns
    .str.replace(r'[\n\r\t]+', ' ', regex=True)
    .str.strip()
)

print("=== COLONNES DISPONIBLES ===")
for c in df_raw.columns:
    print(repr(c))

# ===============================
# 3. CONVERSION NUMERIQUE ROBUSTE
# ===============================

def convert_numeric(series):
    if series.dtype == object:
        series = (series.astype(str)
                  .str.replace(r'\s+', '', regex=True)
                  .str.replace(',', '.', regex=False)
                  .str.replace(r'[^\d.\-]', '', regex=True))
    return pd.to_numeric(series, errors='coerce')

cols_numeric_targets = [
    "Attente en Rade (jr) accostage-NOR",
    "Séjour à Quai app-accostage",
    "Accostage - arrivée",
    "Remise ordre-Pose passerelle",
    "Cadence Moyenne réalisé T/J",
    "cadence contractuelle"
]

col_map = {}
for target in cols_numeric_targets:
    matches = [c for c in df_raw.columns
               if target.lower().strip() in c.lower().strip()]
    if matches:
        col_map[target] = matches[0]
    else:
        print(f"⚠️  Colonne introuvable : {repr(target)}")

df_raw = df_raw.rename(columns={v: k for k, v in col_map.items()})

for col in cols_numeric_targets:
    if col in df_raw.columns:
        df_raw[col] = convert_numeric(df_raw[col])

# ===============================
# 4. SUPPRESSION LIGNES VIDES
# ===============================

if "Navires" in df_raw.columns:
    df_raw = df_raw[df_raw["Navires"].notna()]
    df_raw = df_raw[df_raw["Navires"].astype(str).str.strip().str.lower() != "nan"]
    df_raw = df_raw[df_raw["Navires"].astype(str).str.strip() != ""]

print(f"\n✅ Lignes avec nom navire : {len(df_raw)}")

# ===============================
# 5. DIAGNOSTIC DES COLONNES CLES
# ===============================
# On affiche les percentiles pour comprendre la vraie distribution
print("\n=== DIAGNOSTIC DES VALEURS (percentiles) ===")
for col in cols_numeric_targets:
    if col in df_raw.columns:
        d = df_raw[col].dropna()
        if len(d) > 0:
            p = np.percentile(d, [1, 5, 25, 50, 75, 95, 99])
            print(f"\n  {col}")
            print(f"    n={len(d)}  min={d.min():.3f}  max={d.max():.3f}")
            print(f"    P1={p[0]:.3f} P5={p[1]:.3f} P25={p[2]:.3f} "
                  f"P50={p[3]:.3f} P75={p[4]:.3f} P95={p[5]:.3f} P99={p[6]:.3f}")

# ===============================
# 6. GESTION DES QUAIS VALIDES
# ===============================

QUAIS_VALIDES = {'1N', '2N', '1TER', '2TER', '1BIS', '2BIS'}

def extraire_quais_valides(valeur):
    if pd.isna(valeur):
        return []
    parts = [q.strip().upper() for q in str(valeur).split('/')]
    valides = [q for q in parts if q in QUAIS_VALIDES]
    return list(dict.fromkeys(valides))

col_quai = None
for candidate in ['Quai', 'Quai ', 'QUAI']:
    if candidate in df_raw.columns:
        col_quai = candidate
        break
if col_quai is None:
    matches = [c for c in df_raw.columns if 'quai' in c.lower()]
    if matches:
        col_quai = matches[0]

print(f"\nColonne quai : {repr(col_quai)}")
df_raw['Quais_liste'] = (df_raw[col_quai].apply(extraire_quais_valides)
                          if col_quai else [[] for _ in range(len(df_raw))])

# ===============================
# 7. FILTRAGE INTELLIGENT PAR PERCENTILES
# ===============================
# On utilise les percentiles pour définir des seuils automatiques
# au lieu de seuils fixes qui peuvent être mal calibrés

def calculer_seuils(series, p_bas=1, p_haut=99):
    """
    Calcule les seuils bas/haut basés sur les percentiles.
    Retourne (seuil_bas, seuil_haut).
    """
    d = series.dropna()
    if len(d) == 0:
        return None, None
    # Forcer seuil bas à 0 minimum (temps négatif = impossible)
    seuil_bas = max(0, np.percentile(d, p_bas))
    seuil_haut = np.percentile(d, p_haut)
    return seuil_bas, seuil_haut

# Calculer seuils dynamiques sur les données avec quai valide
df_avec_quai = df_raw[df_raw['Quais_liste'].map(len) > 0].copy()

seuils = {}
print("\n=== SEUILS CALCULÉS AUTOMATIQUEMENT (P1-P99) ===")
for col in ["Attente en Rade (jr) accostage-NOR",
            "Séjour à Quai app-accostage",
            "Accostage - arrivée",
            "Remise ordre-Pose passerelle"]:
    if col in df_avec_quai.columns:
        bas, haut = calculer_seuils(df_avec_quai[col])
        seuils[col] = (bas, haut)
        print(f"  {col}: [{bas:.3f} → {haut:.3f}]")

# Filtrage avec seuils dynamiques + garde essentielle
df_valid = df_raw[
    (df_raw['Quais_liste'].map(len) > 0) &
    df_raw["Attente en Rade (jr) accostage-NOR"].notna() &
    df_raw["Séjour à Quai app-accostage"].notna()
].copy()

n_avant = len(df_valid)

for col, (bas, haut) in seuils.items():
    if col in df_valid.columns and bas is not None:
        avant = len(df_valid)
        df_valid = df_valid[
            df_valid[col].isna() |
            ((df_valid[col] >= bas) & (df_valid[col] <= haut))
        ]
        apres = len(df_valid)
        if avant != apres:
            print(f"  {col}: supprimé {avant - apres} outliers")

n_apres = len(df_valid)
print(f"\n✅ Après filtrage : {n_apres} lignes valides  "
      f"(supprimé {n_avant - n_apres} outliers)")

if n_apres == 0:
    raise SystemExit("❌ Toujours 0 lignes après filtrage — vérifiez le diagnostic ci-dessus.")

# Quai principal
df_valid['Quai_principal'] = df_valid['Quais_liste'].map(lambda x: x[0])

print("\n=== DISTRIBUTION DES QUAIS ===")
print(df_valid['Quai_principal'].value_counts())

# ===============================
# 8. PREPARATION FINALE
# ===============================

ORDER_QUAIS = [q for q in ['1N', '2N', '1TER', '2TER', '1BIS', '2BIS']
               if q in df_valid['Quai_principal'].values]

palette_quai = dict(zip(ORDER_QUAIS,
                        sns.color_palette("Set2", len(ORDER_QUAIS))))

df_exploded = df_valid.explode('Quais_liste').rename(
    columns={'Quais_liste': 'Quai_analyse'})
df_exploded = df_exploded[df_exploded['Quai_analyse'].isin(QUAIS_VALIDES)]

print("\n=== DISTRIBUTION EXPLODED (une ligne par quai) ===")
print(df_exploded['Quai_analyse'].value_counts())

times_cols = [c for c in [
    "Attente en Rade (jr) accostage-NOR",
    "Séjour à Quai app-accostage",
    "Accostage - arrivée",
    "Remise ordre-Pose passerelle"
] if c in df_valid.columns and df_valid[c].notna().sum() >= 3]

# ===============================
# 9. DISTRIBUTION DES TEMPS
# ===============================

for col in times_cols:
    data = df_valid[col].dropna()

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle(f"Distribution — {col}", fontsize=13, fontweight='bold')

    sns.histplot(data, bins=20, kde=True, ax=axes[0], color='steelblue')
    axes[0].set_xlabel("Jours")
    axes[0].set_ylabel("Nombre de navires")
    axes[0].set_title("Histogramme + KDE")

    sns.boxplot(x=data, ax=axes[1], color='lightsteelblue',
                flierprops=dict(marker='o', markerfacecolor='tomato', markersize=6))
    axes[1].set_xlabel("Jours")
    axes[1].set_title("Boxplot (outliers en rouge)")

    q1, q3 = data.quantile(0.25), data.quantile(0.75)
    stats_txt = (f"n={len(data)}\n"
                 f"médiane = {data.median():.2f} j\n"
                 f"moyenne = {data.mean():.2f} j\n"
                 f"σ = {data.std():.2f}\n"
                 f"Q1={q1:.2f}  Q3={q3:.2f}\n"
                 f"min={data.min():.2f}  max={data.max():.2f}")
    axes[1].text(0.98, 0.95, stats_txt, transform=axes[1].transAxes,
                 fontsize=9, va='top', ha='right',
                 bbox=dict(boxstyle='round,pad=0.4', facecolor='white', alpha=0.8))

    plt.tight_layout()
    plt.show()

# ===============================
# 10. CADENCE REALISEE VS CONTRACTUELLE
# ===============================

col_real = "Cadence Moyenne réalisé T/J"
col_cont = "cadence contractuelle"

if col_real in df_valid.columns and col_cont in df_valid.columns:
    data_sc = df_valid[[col_cont, col_real, 'Quai_principal']].dropna()
    # Filtrer cadences aberrantes (doit être > 0)
    data_sc = data_sc[(data_sc[col_cont] > 0) & (data_sc[col_real] > 0)]

    if len(data_sc) > 0:
        plt.figure(figsize=(10, 7))
        sns.scatterplot(
            x=col_cont, y=col_real,
            hue='Quai_principal', hue_order=ORDER_QUAIS,
            data=data_sc, palette=palette_quai,
            s=90, alpha=0.8
        )
        lim_max = max(data_sc[col_cont].max(), data_sc[col_real].max()) * 1.05
        plt.plot([0, lim_max], [0, lim_max], 'r--', lw=1.5, label="Parité parfaite")
        plt.xlim(0, lim_max)
        plt.ylim(0, lim_max)
        plt.title("Cadence réalisée vs contractuelle par quai")
        plt.xlabel("Cadence contractuelle (T/J)")
        plt.ylabel("Cadence réalisée (T/J)")
        plt.legend(title="Quai principal", bbox_to_anchor=(1.02, 1), loc='upper left')
        plt.tight_layout()
        plt.show()

# ===============================
# 11. ANALYSE DES RETARDS
# ===============================

retard_rate = np.nan
if col_real in df_valid.columns and col_cont in df_valid.columns:
    mask_r = (df_valid[col_real].notna() & df_valid[col_cont].notna() &
              (df_valid[col_real] > 0) & (df_valid[col_cont] > 0))
    df_retard = df_valid[mask_r].copy()
    df_retard['Retard'] = df_retard[col_real] < df_retard[col_cont]

    if len(df_retard) > 0:
        retard_rate = df_retard['Retard'].mean() * 100
        print(f"\nTaux de retard global : {retard_rate:.1f}%  (n={len(df_retard)})")

        retard_quai = (
            df_retard.groupby('Quai_principal')['Retard']
            .mean().reindex(ORDER_QUAIS).dropna() * 100
        )

        fig, axes = plt.subplots(1, 2, figsize=(13, 5))
        fig.suptitle("Respect des cadences contractuelles", fontsize=13, fontweight='bold')

        counts = df_retard['Retard'].value_counts().sort_index()
        labels_pie = {False: "Respect", True: "Retard"}
        colors_pie = {False: "#4CAF50", True: "#F44336"}
        axes[0].pie(counts,
                    labels=[labels_pie[k] for k in counts.index],
                    autopct='%1.1f%%',
                    colors=[colors_pie[k] for k in counts.index],
                    startangle=90)
        axes[0].set_title(f"Global (n={len(df_retard)})")

        if len(retard_quai) > 0:
            bar_colors = ['#F44336' if v > 50 else '#4CAF50'
                          for v in retard_quai.values]
            retard_quai.plot(kind='bar', ax=axes[1], color=bar_colors,
                             edgecolor='white', width=0.6)
            axes[1].set_title("Taux de retard par quai (%)")
            axes[1].set_ylabel("% navires en retard")
            axes[1].set_ylim(0, 110)
            axes[1].axhline(50, color='gray', linestyle='--', lw=1, alpha=0.6)
            axes[1].set_xticklabels(retard_quai.index, rotation=30)
            for i, v in enumerate(retard_quai.values):
                axes[1].text(i, v + 2, f"{v:.0f}%", ha='center',
                             fontsize=10, fontweight='bold')
        else:
            axes[1].text(0.5, 0.5, "Données insuffisantes",
                         ha='center', va='center', transform=axes[1].transAxes)

        plt.tight_layout()
        plt.show()

# ===============================
# 12. TEST SHAPIRO-WILK
# ===============================

print("\n===== TEST SHAPIRO-WILK =====")
for col in times_cols:
    data = df_valid[col].dropna()
    if len(data) >= 3:
        stat, p = shapiro(data)
        verdict = "normale ✅" if p > 0.05 else "NON normale ❌"
        print(f"\n  {col}")
        print(f"    n={len(data)}  Stat={stat:.4f}  p={p:.4f}  → {verdict}")

# ===============================
# 13. BOXPLOT PAR QUAI
# ===============================

col_sejour = "Séjour à Quai app-accostage"

if col_sejour in df_exploded.columns and len(ORDER_QUAIS) > 0:
    data_box = df_exploded[['Quai_analyse', col_sejour]].dropna()
    data_box = data_box[data_box['Quai_analyse'].isin(ORDER_QUAIS)]

    if len(data_box) > 0:
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))
        fig.suptitle("Séjour à Quai par quai", fontsize=13, fontweight='bold')

        for ax, scale, title in zip(
            axes, ['linear', 'log'],
            ['Échelle linéaire', 'Échelle logarithmique']
        ):
            sns.boxplot(
                x='Quai_analyse', y=col_sejour,
                data=data_box, order=ORDER_QUAIS,
                palette=palette_quai,
                flierprops=dict(marker='o', markerfacecolor='tomato',
                                markersize=5),
                ax=ax
            )
            if scale == 'log':
                # Log seulement si toutes les valeurs sont > 0
                if data_box[col_sejour].min() > 0:
                    ax.set_yscale('log')
                    ax.yaxis.set_major_formatter(ticker.ScalarFormatter())
            ax.set_title(title)
            ax.set_xlabel("Quai")
            ax.set_ylabel("Jours" if scale == 'linear' else "Jours (log)")
            ax.tick_params(axis='x', rotation=30)
            for i, quai in enumerate(ORDER_QUAIS):
                n = data_box[data_box['Quai_analyse'] == quai][col_sejour].count()
                if n > 0:
                    ax.text(i, ax.get_ylim()[0], f"n={n}",
                            ha='center', va='bottom', fontsize=8, color='gray')

        plt.tight_layout()
        plt.show()

# ===============================
# 14. ANOVA ENTRE QUAIS
# ===============================

print("\n===== TEST ANOVA =====")
if col_sejour in df_exploded.columns:
    groups_anova = [
        grp[col_sejour].dropna()
        for _, grp in df_exploded.groupby('Quai_analyse')
        if len(grp[col_sejour].dropna()) >= 2
    ]
    if len(groups_anova) >= 2:
        stat_f, p_anova = f_oneway(*groups_anova)
        print(f"  F={stat_f:.4f}  p={p_anova:.4f}")
        print("  → Différence significative ✅" if p_anova < 0.05
              else "  → Pas de différence significative ❌")
    else:
        print("  Pas assez de groupes")

# ===============================
# 15. PERFORMANCE MOYENNE PAR QUAI
# ===============================

if col_sejour in df_exploded.columns and len(ORDER_QUAIS) > 0:
    quai_perf = (
        df_exploded[df_exploded['Quai_analyse'].isin(ORDER_QUAIS)]
        .groupby('Quai_analyse')[col_sejour]
        .agg(n='count', moyenne='mean', mediane='median', ecart_type='std')
        .reindex(ORDER_QUAIS)
        .dropna(subset=['moyenne'])
    )

    print("\n===== PERFORMANCE PAR QUAI =====")
    print(quai_perf.round(2))

    if len(quai_perf) > 0:
        colors_bar = [palette_quai.get(q, 'steelblue') for q in quai_perf.index]

        fig, axes = plt.subplots(1, 2, figsize=(14, 5))
        fig.suptitle("Séjour moyen et médian par quai",
                     fontsize=13, fontweight='bold')

        for ax, col_stat, titre in zip(
            axes,
            ['moyenne', 'mediane'],
            ['Moyenne du séjour à quai (jours)',
             'Médiane du séjour à quai (jours)']
        ):
            bars = ax.bar(quai_perf.index, quai_perf[col_stat],
                          color=colors_bar, edgecolor='white', width=0.6)
            ax.set_title(titre)
            ax.set_ylabel("Jours")
            ax.set_xlabel("Quai")
            ax.tick_params(axis='x', rotation=30)
            for bar, (idx, row) in zip(bars, quai_perf.iterrows()):
                ax.text(bar.get_x() + bar.get_width() / 2,
                        bar.get_height() + 0.05,
                        f"{row[col_stat]:.1f}j\n(n={int(row['n'])})",
                        ha='center', fontsize=9)

        plt.tight_layout()
        plt.show()

# ===============================
# 16. ATTENTE EN RADE PAR QUAI
# ===============================

col_rade = "Attente en Rade (jr) accostage-NOR"

if col_rade in df_exploded.columns and len(ORDER_QUAIS) > 0:
    data_rade = df_exploded[
        df_exploded['Quai_analyse'].isin(ORDER_QUAIS)
    ][['Quai_analyse', col_rade]].dropna()

    quais_ok = [q for q in ORDER_QUAIS
                if len(data_rade[data_rade['Quai_analyse'] == q]) >= 5]

    if len(quais_ok) >= 2:
        plt.figure(figsize=(10, 6))
        sns.violinplot(
            x='Quai_analyse', y=col_rade,
            data=data_rade[data_rade['Quai_analyse'].isin(quais_ok)],
            order=quais_ok, palette=palette_quai,
            inner='box', cut=0
        )
        plt.title("Distribution de l'attente en rade par quai")
        plt.xlabel("Quai")
        plt.ylabel("Jours d'attente")
        plt.xticks(rotation=30)
        plt.tight_layout()
        plt.show()
    elif len(data_rade) > 0:
        plt.figure(figsize=(10, 6))
        sns.boxplot(
            x='Quai_analyse', y=col_rade,
            data=data_rade, order=ORDER_QUAIS,
            palette=palette_quai,
            flierprops=dict(marker='o', markerfacecolor='tomato', markersize=5)
        )
        plt.title("Attente en rade par quai")
        plt.xlabel("Quai")
        plt.ylabel("Jours")
        plt.xticks(rotation=30)
        plt.tight_layout()
        plt.show()

# ===============================
# 17. RESUME FINAL
# ===============================

print("\n" + "=" * 55)
print("         RESUME FINAL DE L'ANALYSE")
print("=" * 55)
print(f"  Total lignes brutes lues          : {len(df_raw)}")
print(f"  Lignes avec quai valide + données : {len(df_valid)}")
print(f"  Quais analysés                    : {', '.join(ORDER_QUAIS)}")
if not np.isnan(retard_rate):
    print(f"  Taux de retard global             : {retard_rate:.1f}%")
if 'Date BL' in df_valid.columns:
    dates = pd.to_datetime(df_valid['Date BL'], errors='coerce').dropna()
    if len(dates) > 0:
        print(f"  Période couverte                  : "
              f"{dates.min().date()} → {dates.max().date()}")
print("=" * 55)