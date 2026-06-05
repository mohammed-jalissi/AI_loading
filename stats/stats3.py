# Section 2.3 — Figures individuelles haute qualité pour mémoire PFE
# Chaque figure sauvegardée séparément — design professionnel OCP

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.ticker import PercentFormatter, FuncFormatter
from matplotlib.gridspec import GridSpec
from scipy.stats import chi2_contingency
import matplotlib.patheffects as pe
import warnings
warnings.filterwarnings('ignore')

# ══════════════════════════════════════════════════════════════════
# CONFIG GLOBALE
# ══════════════════════════════════════════════════════════════════
FILE_STOPS = r"C:\Users\LENOVO\Desktop\stops_dataset.xlsx"
FILE_KPI   = r"C:\Users\LENOVO\Desktop\kpi_axes.xlsx"

OUT = r"C:\Users\LENOVO\Desktop\PFE_Figures\\"
import os; os.makedirs(OUT, exist_ok=True)

AXE_LABELS = {1:"Axe 1\n(RC1)", 2:"Axe 2\n(RC2)", 3:"Axe 3\n(RC3)",
              4:"Axe 4\n(TB1)", 5:"Axe 5\n(TB2)", 6:"Axe 6\n(TB3)"}
AXE_SHORT  = {1:"RC1", 2:"RC2", 3:"RC3", 4:"TB1", 5:"TB2", 6:"TB3"}
KPI_SHEETS = {1:"kpi_axe1",2:"kpi_axe2",3:"kpi_axe3",
              4:"kpi_axe4",5:"kpi_axe5",6:"kpi_axe6"}
axlabels   = [AXE_LABELS[i] for i in range(1,7)]
PALETTE    = ["#E07B54","#5C6BC0","#1976D2","#2E9E6B","#C07B1A","#8E3A6A"]
PALETTE_LIGHT = ["#F5C4B0","#C5CAE9","#BBDEFB","#A8D5BE","#F0D4A0","#D4A8C7"]

# ── Style global matplotlib ──────────────────────────────────────
plt.rcParams.update({
    'font.family'       : 'DejaVu Sans',
    'font.size'         : 10,
    'axes.titlesize'    : 12,
    'axes.titleweight'  : 'bold',
    'axes.titlepad'     : 14,
    'axes.labelsize'    : 10,
    'axes.labelweight'  : 'bold',
    'axes.spines.top'   : False,
    'axes.spines.right' : False,
    'axes.grid'         : True,
    'axes.grid.axis'    : 'y',
    'grid.alpha'        : 0.25,
    'grid.linestyle'    : '--',
    'grid.linewidth'    : 0.6,
    'xtick.labelsize'   : 9,
    'ytick.labelsize'   : 9,
    'legend.fontsize'   : 9,
    'legend.framealpha' : 0.85,
    'legend.edgecolor'  : '#cccccc',
    'figure.dpi'        : 150,
    'savefig.dpi'       : 300,
    'savefig.bbox'      : 'tight',
    'savefig.facecolor' : 'white',
})

# TITLE_KWARGS : utilisé pour ax.set_title() — inclut 'pad'
TITLE_KWARGS = dict(fontsize=13, fontweight='bold', color='#1a1a2e', pad=16)
# SUPTITLE_KWARGS : utilisé pour fig.suptitle() — sans 'pad' (non supporté)
SUPTITLE_KWARGS = dict(fontsize=13, fontweight='bold', color='#1a1a2e')

SUB_KWARGS   = dict(fontsize=9,  color='#555577', style='italic')

def add_source(fig, text="Source : Base arrêts OCP JPH 2025 · Analyse PFE"):
    fig.text(0.99, 0.01, text, ha='right', va='bottom',
             fontsize=7.5, color='#aaaaaa', style='italic')

def section_badge(ax, text, color="#1976D2"):
    ax.text(0.0, 1.06, text, transform=ax.transAxes,
            fontsize=7.5, color='white', fontweight='bold',
            bbox=dict(boxstyle='round,pad=0.3', facecolor=color,
                      edgecolor='none', alpha=0.85))

# ══════════════════════════════════════════════════════════════════
# CHARGEMENT DONNÉES
# ══════════════════════════════════════════════════════════════════
df = pd.read_excel(FILE_STOPS, engine="openpyxl")
df.columns = df.columns.str.strip()
df["Axe"]     = pd.to_numeric(df["Axe (RCx/TBx)"], errors="coerce")
df["Durée_h"] = pd.to_numeric(df["Durée h"], errors="coerce")
df["Nature"]  = df["Nature"].fillna("Inconnu").str.strip()
df["Date"]    = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
df["Mois"]    = df["Date"].dt.month
df["Semaine"] = df["Date"].dt.isocalendar().week.astype(int)
df = df.dropna(subset=["Axe","Durée_h","Date"])
df["Axe"] = df["Axe"].astype(int)
df = df[df["Axe"].isin([1,2,3,4,5,6])]

heures_ouv = (df.Date.max() - df.Date.min()).days / 7 * 168

stats = df.groupby("Axe").agg(
    nb_arrets  = ("Durée_h","count"),
    sum_duree  = ("Durée_h","sum"),
    mean_duree = ("Durée_h","mean"),
    std_duree  = ("Durée_h","std"),
    p90        = ("Durée_h", lambda x: np.percentile(x,90)),
).reset_index()
n = stats["nb_arrets"]
stats["IC_low"]   = (stats["mean_duree"] - 1.96*stats["std_duree"]/np.sqrt(n)).clip(lower=0)
stats["IC_high"]  = stats["mean_duree"] + 1.96*stats["std_duree"]/np.sqrt(n)
stats["Label"]    = stats["Axe"].map(AXE_SHORT)
stats["MTTR"]     = stats["mean_duree"]
stats["MTBF"]     = (heures_ouv - stats["sum_duree"]) / stats["nb_arrets"]
stats["Dispo"]    = ((heures_ouv - stats["sum_duree"]) / heures_ouv * 100).clip(0,100)

ROW_MAP = {"Dispo":"Taux de disponibilit","Planif":"Taux de planification",
           "Perf":"Taux de performance","Panne":"Taux de panne"}

def get_ytd(axe_num, pattern):
    try:
        raw = pd.read_excel(FILE_KPI, sheet_name=KPI_SHEETS[axe_num], header=None)
        mask = raw.iloc[:,0].astype(str).str.strip().str.contains(
            pattern, case=False, na=False)
        if not raw[mask].empty:
            val = pd.to_numeric(raw[mask].iloc[0,2], errors="coerce")
            return val*100 if (not np.isnan(val) and val<=1.5) else val
    except: pass
    return np.nan

def get_weekly(axe_num, pattern):
    try:
        raw  = pd.read_excel(FILE_KPI, sheet_name=KPI_SHEETS[axe_num], header=None)
        wks  = pd.to_numeric(raw.iloc[0,3:].values, errors="coerce")
        mask = raw.iloc[:,0].astype(str).str.strip().str.contains(
            pattern, case=False, na=False)
        if raw[mask].empty: return np.array([]),np.array([])
        vals = pd.to_numeric(raw[mask].iloc[0,3:].values, errors="coerce")
        nv   = vals[~np.isnan(vals)]
        if len(nv)>0 and nv.max()<=1.5: vals = vals*100
        ok = (wks>=1)&(wks<=52)
        return wks[ok], vals[ok]
    except: return np.array([]),np.array([])

df_ytd = pd.DataFrame([
    {"Axe":i,"Label":AXE_SHORT[i],
     **{k:get_ytd(i,p) for k,p in ROW_MAP.items()}}
    for i in range(1,7)
])
df_ytd = df_ytd.merge(stats[["Axe","nb_arrets","sum_duree","MTTR","MTBF","Dispo","IC_low","IC_high"]], on="Axe")
df_ytd["Dispo_plot"] = df_ytd["Dispo_x"].fillna(df_ytd["Dispo_y"])

pareto     = df.groupby("Nature")["Durée_h"].sum().sort_values(ascending=False)
pareto_cum = pareto.cumsum() / pareto.sum() * 100
top_nat    = df["Nature"].value_counts().head(8).index
ctable     = pd.crosstab(df[df["Nature"].isin(top_nat)]["Nature"],
                          df[df["Nature"].isin(top_nat)]["Axe"])
chi2_val, pval, dof, _ = chi2_contingency(ctable)
heatmap    = df.groupby(["Mois","Axe"])["Durée_h"].sum().unstack(fill_value=0)

print("✓ Données chargées")

# ╔══════════════════════════════════════════════════════════════════╗
# ║  FIG A — FRÉQUENCE & IMPACT DES ARRÊTS PAR AXE                 ║
# ╚══════════════════════════════════════════════════════════════════╝
fig, axes = plt.subplots(1, 2, figsize=(14, 6))
fig.patch.set_facecolor('white')
fig.suptitle("Fréquence et impact temporel des arrêts par axe — 2025",
             **SUPTITLE_KWARGS, x=0.5, y=1.02)

# Nb arrêts
ax = axes[0]
bars = ax.bar(axlabels, stats["nb_arrets"], color=PALETTE,
              edgecolor='white', linewidth=1.2, zorder=3, width=0.62)
ax.bar_label(bars, fmt='%d', fontsize=9.5, padding=4, fontweight='bold',
             color='#1a1a2e')
ax.set_title("Nombre d'arrêts par axe", **dict(TITLE_KWARGS, fontsize=11))
ax.set_ylabel("Nombre d'arrêts")
ax.set_ylim(0, stats["nb_arrets"].max()*1.22)
section_badge(ax, "Fig. A1")
# valeur max annotation
idx_max = stats["nb_arrets"].idxmax()
ax.annotate(f"Max : {stats.loc[idx_max,'Label']}",
            xy=(idx_max, stats.loc[idx_max,"nb_arrets"]),
            xytext=(idx_max+0.5, stats.loc[idx_max,"nb_arrets"]*0.85),
            arrowprops=dict(arrowstyle='->', color='#E07B54', lw=1.5),
            fontsize=8.5, color='#E07B54', fontweight='bold')

# Heures perdues
ax = axes[1]
bars = ax.bar(axlabels, stats["sum_duree"], color=PALETTE,
              edgecolor='white', linewidth=1.2, zorder=3, width=0.62, alpha=0.9)
ax.bar_label(bars, fmt='%.0f h', fontsize=9.5, padding=4, fontweight='bold',
             color='#1a1a2e')
ax.set_title("Heures d'arrêt cumulées par axe", **dict(TITLE_KWARGS, fontsize=11))
ax.set_ylabel("Durée totale (heures)")
ax.set_ylim(0, stats["sum_duree"].max()*1.22)
section_badge(ax, "Fig. A2", color="#2E9E6B")

fig.tight_layout(pad=2.5)
add_source(fig)
fig.savefig(OUT + "FigA_frequence_impact_arrets.png")
print("✓ FigA")
plt.show(); plt.close()

# ╔══════════════════════════════════════════════════════════════════╗
# ║  FIG B — DISPONIBILITÉ PAR AXE vs CIBLES OCP                   ║
# ╚══════════════════════════════════════════════════════════════════╝
fig, ax = plt.subplots(figsize=(11, 6.5))
fig.patch.set_facecolor('white')

dispo_vals = df_ytd["Dispo_plot"].values
colors_d   = ["#D32F2F" if v<70 else "#E07B54" if v<80
               else "#FFA726" if v<90 else "#2E9E6B"
               for v in dispo_vals]

bars = ax.bar(axlabels, dispo_vals, color=colors_d,
              edgecolor='white', linewidth=1.3, zorder=3, width=0.6)
ax.bar_label(bars, fmt="%.1f%%", fontsize=10, padding=5,
             fontweight='bold', color='#1a1a2e')

# Lignes de référence
ax.axhline(90, color="#1B5E20", ls="--", lw=1.8, zorder=4, label="Cible OCP 90%")
ax.axhline(80, color="#E07B54", ls=":",  lw=1.8, zorder=4, label="Seuil critique 80%")
ax.fill_between([-0.5, 5.5], 90, 100, alpha=0.05, color="#1B5E20", zorder=0)
ax.fill_between([-0.5, 5.5],  0,  80, alpha=0.05, color="#D32F2F", zorder=0)

# Légende couleurs
patches = [
    mpatches.Patch(color="#D32F2F", label="Critique < 70%"),
    mpatches.Patch(color="#E07B54", label="Insuffisant 70–80%"),
    mpatches.Patch(color="#FFA726", label="Acceptable 80–90%"),
    mpatches.Patch(color="#2E9E6B", label="Conforme ≥ 90%"),
]
l1 = ax.legend(handles=patches, loc='lower right', fontsize=8.5,
               title="Niveau de performance", title_fontsize=9)
ax.add_artist(l1)
ax.legend(loc='upper right', fontsize=9)

ax.set_title("Taux de disponibilité par axe — YTD 2025\n(vs cibles OCP)",
             **TITLE_KWARGS)
ax.set_ylabel("Taux de disponibilité (%)")
ax.set_ylim(0, 115)
ax.set_xlim(-0.5, 5.5)
section_badge(ax, "Fig. B — Section 2.3")

fig.tight_layout(pad=2.5)
add_source(fig)
fig.savefig(OUT + "FigB_disponibilite_axes.png")
print("✓ FigB")
plt.show(); plt.close()

# ╔══════════════════════════════════════════════════════════════════╗
# ║  FIG C — DÉCOMPOSITION TRG (DISPO × PLANIF × PERF)             ║
# ╚══════════════════════════════════════════════════════════════════╝
fig, ax = plt.subplots(figsize=(13, 6.5))
fig.patch.set_facecolor('white')

x = np.arange(6); w = 0.26
b1 = ax.bar(x-w, df_ytd["Dispo_plot"],  w, label="Disponibilité",
            color="#1976D2", edgecolor='white', lw=1.2, alpha=0.88, zorder=3)
b2 = ax.bar(x,   df_ytd["Planif"],      w, label="Planification",
            color="#2E9E6B", edgecolor='white', lw=1.2, alpha=0.88, zorder=3)
b3 = ax.bar(x+w, df_ytd["Perf"],        w, label="Performance",
            color="#C07B1A", edgecolor='white', lw=1.2, alpha=0.88, zorder=3)

for bars in [b1, b2, b3]:
    ax.bar_label(bars, fmt="%.0f%%", fontsize=7.5, padding=2, color='#2a2a2a')

ax.axhline(90, color='#1B5E20', ls='--', lw=1.5, alpha=0.6, label="Cible 90%")
ax.set_xticks(x); ax.set_xticklabels(axlabels, fontsize=9.5)
ax.set_ylabel("(%)"); ax.set_ylim(0, 120)
ax.set_title("Décomposition TRG par axe : Disponibilité · Planification · Performance\n"
             "YTD 2025", **TITLE_KWARGS)
ax.legend(ncol=4, fontsize=9, loc='upper right')
section_badge(ax, "Fig. C — Section 2.3", color="#C07B1A")

fig.tight_layout(pad=2.5)
add_source(fig)
fig.savefig(OUT + "FigC_decomposition_TRG.png")
print("✓ FigC")
plt.show(); plt.close()

# ╔══════════════════════════════════════════════════════════════════╗
# ║  FIG D — MTTR + MTBF AVEC IC 95%                               ║
# ╚══════════════════════════════════════════════════════════════════╝
fig, axes = plt.subplots(1, 2, figsize=(14, 6))
fig.patch.set_facecolor('white')
fig.suptitle("MTTR et MTBF calculés par axe (base arrêts bruts 2025)",
             **SUPTITLE_KWARGS, x=0.5, y=1.02)

# MTTR
ax = axes[0]
bars = ax.bar(axlabels, stats["MTTR"], color=PALETTE,
              edgecolor='white', lw=1.2, zorder=3, width=0.6)
ax.errorbar(range(6), stats["MTTR"],
            yerr=[stats["MTTR"]-stats["IC_low"], stats["IC_high"]-stats["MTTR"]],
            fmt='none', color='#333333', capsize=6, lw=1.8, zorder=5,
            label="IC 95%")
ax.bar_label(bars, fmt="%.2f h", fontsize=9, padding=3, fontweight='bold')
ax.set_title("MTTR — Durée moyenne de réparation\n[Mean Time To Repair]",
             **dict(TITLE_KWARGS, fontsize=10.5))
ax.set_ylabel("MTTR (heures)")
ax.set_ylim(0, stats["MTTR"].max()*1.35)
ax.legend(fontsize=9)
section_badge(ax, "Fig. D1")

# MTBF
ax = axes[1]
bars = ax.bar(axlabels, stats["MTBF"], color=PALETTE,
              edgecolor='white', lw=1.2, zorder=3, width=0.6, alpha=0.85)
ax.bar_label(bars, fmt="%.1f h", fontsize=9, padding=3, fontweight='bold')
ax.set_title("MTBF — Temps moyen entre pannes\n[Mean Time Between Failures]",
             **dict(TITLE_KWARGS, fontsize=10.5))
ax.set_ylabel("MTBF (heures)")
ax.set_ylim(0, stats["MTBF"].max()*1.22)
section_badge(ax, "Fig. D2", color="#2E9E6B")

fig.tight_layout(pad=2.5)
add_source(fig)
fig.savefig(OUT + "FigD_MTTR_MTBF.png")
print("✓ FigD")
plt.show(); plt.close()

# ╔══════════════════════════════════════════════════════════════════╗
# ║  FIG E — PARETO DES CAUSES D'ARRÊT                             ║
# ╚══════════════════════════════════════════════════════════════════╝
fig, ax = plt.subplots(figsize=(13, 6.5))
fig.patch.set_facecolor('white')

top15  = pareto.head(15)
cum15  = pareto_cum.head(15)
idx80  = int((cum15 <= 80).sum())

colors_p = ["#E07B54" if i<=idx80 else "#C8C8C8" for i in range(len(top15))]
bars = ax.bar(range(len(top15)), top15.values, color=colors_p,
              edgecolor='white', lw=1.0, zorder=3, width=0.7)

# Étiquettes %
pcts = top15.values / pareto.sum() * 100
ax.bar_label(bars, labels=[f"{p:.1f}%" for p in pcts],
             fontsize=7.5, padding=3, color='#2a2a2a', fontweight='bold')

ax2 = ax.twinx()
ax2.plot(range(len(top15)), cum15.values, color="#1976D2",
         marker="o", markersize=5.5, lw=2.2, zorder=5, label="% cumulé")
ax2.axhline(80, color="#2E9E6B", ls="--", lw=1.5, alpha=0.8, label="Seuil 80%")
ax2.fill_between(range(len(top15)), 0, cum15.values, alpha=0.06, color="#1976D2")
ax2.set_ylabel("Cumul (%)", color="#1976D2", fontsize=10, fontweight='bold')
ax2.set_ylim(0, 108); ax2.yaxis.set_major_formatter(PercentFormatter())
ax2.legend(loc='center right', fontsize=9)

# Zone 80%
ax.axvspan(-0.5, idx80+0.5, alpha=0.04, color='#E07B54', zorder=0)
ax.text(idx80/2, ax.get_ylim()[1]*0.92 if ax.get_ylim()[1]>0 else 100,
        f"↑ {idx80+1} causes\n= 80% du temps perdu",
        ha='center', fontsize=8, color='#E07B54', fontweight='bold',
        bbox=dict(boxstyle='round,pad=0.3', facecolor='white',
                  edgecolor='#E07B54', alpha=0.8))

ax.set_xticks(range(len(top15)))
ax.set_xticklabels(top15.index, rotation=35, ha='right', fontsize=8.5)
ax.set_ylabel("Durée totale d'arrêt (heures)", fontsize=10, fontweight='bold')
ax.set_title("Analyse Pareto des causes d'arrêt — Durée cumulée 2025\n"
             "(Loi 80/20 : identification des causes prioritaires)",
             **TITLE_KWARGS)
section_badge(ax, "Fig. E — Section 2.3", color="#E07B54")

fig.tight_layout(pad=2.5)
add_source(fig)
fig.savefig(OUT + "FigE_pareto_causes.png")
print("✓ FigE")
plt.show(); plt.close()

# ╔══════════════════════════════════════════════════════════════════╗
# ║  FIG F — DISTRIBUTION DURÉES D'ARRÊT (BOXPLOTS)                ║
# ╚══════════════════════════════════════════════════════════════════╝
fig, ax = plt.subplots(figsize=(12, 6.5))
fig.patch.set_facecolor('white')

data_box = [df[df["Axe"]==i]["Durée_h"].dropna().values for i in range(1,7)]
bp = ax.boxplot(data_box, patch_artist=True, notch=False, widths=0.55,
                medianprops=dict(color='#1a1a2e', linewidth=2.5),
                flierprops=dict(marker='o', markersize=2.8,
                                alpha=0.35, markerfacecolor='gray'),
                whiskerprops=dict(lw=1.5, color='#555555'),
                capprops=dict(lw=1.8, color='#555555'))
for patch, col, lcol in zip(bp["boxes"], PALETTE, PALETTE_LIGHT):
    patch.set_facecolor(col); patch.set_alpha(0.72)

# Moyennes
means = [np.mean(d) for d in data_box]
ax.plot(range(1,7), means, 'D', color='#1a1a2e', markersize=7,
        zorder=6, label='Moyenne', markeredgecolor='white', markeredgewidth=1)

# Annotations médiane + moyenne
for i, (d, m) in enumerate(zip(data_box, means)):
    med = np.median(d)
    ax.text(i+1, med+0.12, f"Méd:\n{med:.2f}h",
            ha='center', fontsize=7, color='#1a1a2e', fontweight='bold',
            va='bottom', linespacing=1.2)
    ax.text(i+1, ax.get_ylim()[0] if ax.get_ylim()[0]>0 else 0.1,
            f"Moy:{m:.2f}h", ha='center', fontsize=7,
            color=PALETTE[i], va='bottom', fontweight='bold')

ax.set_xticklabels([AXE_LABELS[i].replace("\n"," ") for i in range(1,7)], fontsize=9.5)
ax.set_ylabel("Durée d'arrêt (heures)")
ax.set_title("Distribution statistique des durées d'arrêt par axe\n"
             "(médiane, IQR, valeurs extrêmes)", **TITLE_KWARGS)
ax.legend(fontsize=9, loc='upper right')
section_badge(ax, "Fig. F — Section 2.3", color="#5C6BC0")

# Table stats sous le graphe
row_labels = ["N", "Méd(h)", "Moy(h)", "P90(h)"]
cell_data  = [[str(int(stats.loc[stats.Axe==i,"nb_arrets"].values[0])),
               f"{np.median(data_box[i-1]):.2f}",
               f"{np.mean(data_box[i-1]):.2f}",
               f"{np.percentile(data_box[i-1],90):.2f}"]
              for i in range(1,7)]
tbl = ax.table(cellText=list(map(list, zip(*cell_data))),
               rowLabels=row_labels,
               colLabels=[AXE_SHORT[i] for i in range(1,7)],
               cellLoc='center', loc='bottom', bbox=[0, -0.35, 1, 0.28])
tbl.auto_set_font_size(False); tbl.set_fontsize(8)
for (r,c), cell in tbl.get_celld().items():
    cell.set_edgecolor('#dddddd')
    if r==0: cell.set_facecolor('#E3F2FD'); cell.set_text_props(fontweight='bold')
    elif c==-1: cell.set_facecolor('#F5F5F5'); cell.set_text_props(fontweight='bold')
plt.subplots_adjust(bottom=0.3)

fig.tight_layout(pad=2.5)
add_source(fig)
fig.savefig(OUT + "FigF_boxplot_distributions.png")
print("✓ FigF")
plt.show(); plt.close()

# ╔══════════════════════════════════════════════════════════════════╗
# ║  FIG G — TEST χ² HEATMAP CONTINGENCE                           ║
# ╚══════════════════════════════════════════════════════════════════╝
fig, ax = plt.subplots(figsize=(11, 7))
fig.patch.set_facecolor('white')

cont_pct = ctable.div(ctable.sum(axis=1), axis=0) * 100
im = ax.imshow(cont_pct.values, cmap="Blues", aspect="auto", vmin=0, vmax=35)

cbar = plt.colorbar(im, ax=ax, shrink=0.85, pad=0.02)
cbar.set_label("% de la cause attribuée à l'axe", fontsize=9, fontweight='bold')

ax.set_xticks(range(len(ctable.columns)))
ax.set_xticklabels([AXE_SHORT[c] for c in ctable.columns],
                   fontsize=10.5, fontweight='bold')
ax.set_yticks(range(len(ctable.index)))
ax.set_yticklabels(ctable.index, fontsize=10)
ax.set_xlabel("Axe de convoyage", fontsize=10, fontweight='bold', labelpad=10)
ax.set_ylabel("Nature de l'arrêt", fontsize=10, fontweight='bold', labelpad=10)
ax.grid(False)

for i in range(cont_pct.shape[0]):
    for j in range(cont_pct.shape[1]):
        v = cont_pct.values[i,j]
        txt_col = 'white' if v>22 else '#1a1a2e'
        weight  = 'bold'  if v>25 else 'normal'
        ax.text(j, i, f"{v:.0f}%", ha='center', va='center',
                fontsize=9, color=txt_col, fontweight=weight)

sig_str = "★ Dépendance significative (p < 0.05)" if pval<0.05 \
          else "Pas de dépendance significative"
ax.set_title(f"Test χ² d'indépendance — Contingence Nature × Axe\n"
             f"χ² = {chi2_val:.1f}  |  p-value = {pval:.4f}  |  ddl = {dof}  |  {sig_str}",
             **TITLE_KWARGS)
section_badge(ax, "Fig. G — Section 2.3", color="#5C6BC0")

fig.tight_layout(pad=2.5)
add_source(fig)
fig.savefig(OUT + "FigG_chi2_contingence.png")
print("✓ FigG")
plt.show(); plt.close()

# ╔══════════════════════════════════════════════════════════════════╗
# ║  FIG H — HEATMAP MENSUELLE mois × axe                          ║
# ╚══════════════════════════════════════════════════════════════════╝
fig, ax = plt.subplots(figsize=(14, 6))
fig.patch.set_facecolor('white')

im2 = ax.imshow(heatmap.T.values, cmap="YlOrRd", aspect="auto")
cbar = plt.colorbar(im2, ax=ax, shrink=0.9, pad=0.02)
cbar.set_label("Heures d'arrêt perdues", fontsize=9, fontweight='bold')

ax.set_xticks(range(len(heatmap.index)))
ax.set_xticklabels([f"M{m}" for m in heatmap.index], fontsize=10)
ax.set_yticks(range(len(heatmap.columns)))
ax.set_yticklabels([AXE_LABELS[c].replace("\n"," ")
                    for c in heatmap.columns], fontsize=10)
ax.set_xlabel("Mois (2025)", fontsize=10, fontweight='bold', labelpad=10)
ax.grid(False)

maxv = heatmap.values.max()
for i in range(heatmap.shape[1]):
    for j in range(heatmap.shape[0]):
        v = heatmap.T.values[i,j]
        if v > 0:
            tcol   = 'white' if v>maxv*0.6 else '#1a1a2e'
            weight = 'bold' if v>maxv*0.5 else 'normal'
            ax.text(j, i, f"{v:.0f}", ha='center', va='center',
                    fontsize=8, color=tcol, fontweight=weight)

ax.set_title("Intensité des arrêts : Heures perdues par mois et par axe — 2025\n"
             "(détection des pics saisonniers)", **TITLE_KWARGS)
section_badge(ax, "Fig. H — Section 2.3", color="#C07B1A")

fig.tight_layout(pad=2.5)
add_source(fig)
fig.savefig(OUT + "FigH_heatmap_mois_axe.png")
print("✓ FigH")
plt.show(); plt.close()

# ╔══════════════════════════════════════════════════════════════════╗
# ║  FIG I — NATURE DES ARRÊTS PAR MOIS (barres empilées)          ║
# ╚══════════════════════════════════════════════════════════════════╝
fig, ax = plt.subplots(figsize=(14, 6.5))
fig.patch.set_facecolor('white')

top_nat7   = df["Nature"].value_counts().head(7).index
monthly_nat= (df[df["Nature"].isin(top_nat7)]
              .groupby(["Mois","Nature"])["Durée_h"].sum()
              .unstack(fill_value=0))
colors_nat = ["#E07B54","#5C6BC0","#1976D2","#2E9E6B",
              "#C07B1A","#8E3A6A","#607D8B"][:len(monthly_nat.columns)]
monthly_nat.plot(kind="bar", stacked=True, ax=ax, color=colors_nat,
                 edgecolor="white", linewidth=0.6, width=0.72, zorder=3)

totals = monthly_nat.sum(axis=1)
ax2r   = ax.twinx()
ax2r.plot(range(len(totals)), totals.values, 'k--o',
          lw=2, markersize=5, label="Total mensuel", alpha=0.65, zorder=5)
ax2r.fill_between(range(len(totals)), 0, totals.values,
                  alpha=0.04, color='black')
ax2r.set_ylabel("Total (h)", fontsize=10, fontweight='bold')
ax2r.legend(fontsize=9, loc='upper left')

ax.set_xlabel("Mois", fontsize=10, fontweight='bold', labelpad=8)
ax.set_ylabel("Durée totale d'arrêt (heures)", fontsize=10, fontweight='bold')
ax.set_xticklabels([f"M{m}" for m in monthly_nat.index], rotation=0, fontsize=9.5)
ax.set_title("Répartition mensuelle des arrêts par nature (Top 7) — 2025\n"
             "(identification des mois critiques et causes dominantes)",
             **TITLE_KWARGS)
ax.legend(title="Nature d'arrêt", fontsize=8.5, title_fontsize=9,
          bbox_to_anchor=(1.08, 1), loc='upper left')
ax.grid(axis='y', alpha=0.25, zorder=0)
ax.spines[["top","right"]].set_visible(False)
section_badge(ax, "Fig. I — Section 2.3", color="#8E3A6A")

fig.tight_layout(pad=2.5)
add_source(fig)
fig.savefig(OUT + "FigI_nature_arrets_mois.png")
print("✓ FigI")
plt.show(); plt.close()

# ══════════════════════════════════════════════════════════════════
# RÉCAPITULATIF
# ══════════════════════════════════════════════════════════════════
print("\n" + "═"*65)
print("  SECTION 2.3 — 9 FIGURES SAUVEGARDÉES DANS :")
print(f"  {OUT}")
print("═"*65)
print("  FigA — Fréquence & impact des arrêts par axe")
print("  FigB — Disponibilité par axe vs cibles OCP")
print("  FigC — Décomposition TRG")
print("  FigD — MTTR & MTBF avec IC 95%")
print("  FigE — Pareto des causes d'arrêt")
print("  FigF — Boxplots distribution durées")
print("  FigG — Test χ² contingence Nature × Axe")
print("  FigH — Heatmap mensuelle mois × axe")
print("  FigI — Nature arrêts par mois empilées")
print("═"*65)
print(f"\nTest χ² : χ²={chi2_val:.2f}  p={pval:.4f}  ddl={dof}")
print("→", "✓ Dépendance significative" if pval<0.05 else "Non significatif")