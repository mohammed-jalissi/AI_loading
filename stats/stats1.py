"""
========================================================================
CHAPITRE 2.1 — Analyse Descriptive des Opérations de Chargement (2025)
Projet : AI Loading Planner — JPH / OCP Group
========================================================================
"""

import warnings
warnings.filterwarnings("ignore")

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import seaborn as sns
from scipy import stats
from scipy.stats import skew, kurtosis, shapiro, norm
import matplotlib.gridspec as gridspec
from matplotlib.lines import Line2D

os.makedirs("figures", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

OCP_PALETTE = {
    "primary"   : "#003F7D",
    "secondary" : "#0077C8",
    "accent"    : "#00A651",
    "highlight" : "#F7941D",
    "neutral"   : "#6C757D",
    "light"     : "#EBF3FA",
    "dark"      : "#1A1A2E",
    "white"     : "#FFFFFF",
    "grid"      : "#DEE2E6",
}

QUALITE_COLORS = {
    "MAP" : "#003F7D",
    "DAP" : "#0077C8",
    "TSP" : "#00A651",
    "NPS" : "#F7941D",
}

REGION_COLORS = {
    "AMERIQUE"        : "#003F7D",
    "AMERIQUE LATINE" : "#0077C8",
    "EUROPE"          : "#00A651",
    "ASIE"            : "#F7941D",
    "AFRIQUE"         : "#E74C3C",
    "OCEANIE"         : "#9B59B6",
}

plt.rcParams.update({
    "figure.facecolor"  : "white",
    "axes.facecolor"    : "#FAFBFC",
    "axes.edgecolor"    : "#CED4DA",
    "axes.linewidth"    : 0.8,
    "axes.grid"         : True,
    "grid.color"        : OCP_PALETTE["grid"],
    "grid.linewidth"    : 0.5,
    "grid.alpha"        : 0.7,
    "font.family"       : "DejaVu Sans",
    "font.size"         : 10,
    "axes.titlesize"    : 13,
    "axes.titleweight"  : "bold",
    "axes.labelsize"    : 11,
    "xtick.labelsize"   : 9,
    "ytick.labelsize"   : 9,
    "legend.fontsize"   : 9,
    "legend.framealpha" : 0.9,
    "savefig.dpi"       : 300,
    "savefig.bbox"      : "tight",
    "savefig.facecolor" : "white",
})

FIGSIZE_SINGLE = (10, 6)
FIGSIZE_DOUBLE = (16, 6)
FIGSIZE_LARGE  = (16, 10)


# ─────────────────────────────────────────────
# 1. CHARGEMENT ET NETTOYAGE
# ─────────────────────────────────────────────
def load_and_clean(filepath: str = r"C:\Users\LENOVO\Desktop\export_data.xlsx") -> pd.DataFrame:

    df = pd.read_excel(filepath, engine="openpyxl")
    print("✅ Fichier chargé")

    df.columns = df.columns.str.strip()
    df.columns = df.columns.str.replace("\n", " ")
    df.columns = df.columns.str.replace("  ", " ")

    print("\n📌 Colonnes détectées :")
    for col in df.columns:
        print(f"  '{col}'")

    # ── Mapping EXACT en priorité, puis fallback keyword ──
    def find_col_exact(candidates):
        """Cherche la première colonne dont le nom nettoyé correspond exactement."""
        for c in candidates:
            for col in df.columns:
                if col.strip().upper() == c.strip().upper():
                    return col
        return None

    def find_col_keyword(keyword, exclude=None):
        """Fallback : cherche un mot-clé dans le nom de colonne."""
        exclude = exclude or []
        for col in df.columns:
            col_up = col.upper()
            if keyword.upper() in col_up and not any(e.upper() in col_up for e in exclude):
                return col
        return None

    # Mapping précis colonne par colonne
    col_date         = find_col_exact(["Date BL", "DATE BL", "date bl"])
    col_tonnage_bl   = find_col_exact(["Tonnage B/L", "TONNAGE B/L", "tonnage b/l"])
    col_tonnage_tot  = find_col_exact(["Tonnage total b/l", "Tonnage total  b/l",
                                        "TONNAGE TOTAL B/L"])  or find_col_keyword("total")
    col_qualite      = find_col_exact(["Qualité", "QUALITE", "Qualite", "qualité"])
    col_region       = find_col_exact(["REGION", "Region", "région", "Région"])
    col_destination  = find_col_exact(["DESTINATION", "Destination", "destination"])
    col_cadence_real = find_col_exact(["Cadence Moyenne réalisé T/J",
                                        "Cadence Moyenne realise T/J",
                                        "Performance réalisée"]) or \
                       find_col_keyword("cadence", exclude=["contractuelle"])
    col_cadence_cont = find_col_exact(["cadence contractuelle",
                                        "Cadence contractuelle"]) or \
                       find_col_keyword("contractuelle")

    col_map = {
        "date_bl"               : col_date,
        "tonnage_bl"            : col_tonnage_bl,
        "tonnage_total"         : col_tonnage_tot,
        "qualite"               : col_qualite,
        "region"                : col_region,
        "destination"           : col_destination,
        "cadence_realisee"      : col_cadence_real,
        "cadence_contractuelle" : col_cadence_cont,
    }

    print("\n✅ Mapping colonnes :")
    for k, v in col_map.items():
        print(f"  {k:30s} -> {v}")

    # Renommer
    rename_map = {v: k for k, v in col_map.items() if v and v in df.columns}
    df.rename(columns=rename_map, inplace=True)

    # Conversions
    df["date_bl"]    = pd.to_datetime(df["date_bl"], errors="coerce")
    df["tonnage_bl"] = pd.to_numeric(
        df["tonnage_bl"].astype(str).str.replace(" ", "").str.replace(",", "."),
        errors="coerce"
    )

    for col in ["tonnage_total", "cadence_realisee", "cadence_contractuelle"]:
        if col in df.columns:
            df[col] = pd.to_numeric(
                df[col].astype(str).str.replace(" ", "").str.replace(",", "."),
                errors="coerce"
            )

    # Si tonnage_total absent, utiliser tonnage_bl
    if "tonnage_total" not in df.columns or df["tonnage_total"].isna().all():
        df["tonnage_total"] = df["tonnage_bl"]
        print("⚠️  tonnage_total absent — utilisation de tonnage_bl")

    df.dropna(subset=["date_bl", "tonnage_bl"], inplace=True)

    if "qualite" in df.columns:
        df["qualite"] = df["qualite"].astype(str).str.strip().str.upper()
        df = df[df["qualite"].notna() & (df["qualite"] != "NAN") & (df["qualite"] != "")]

    if "region" in df.columns:
        df["region"] = df["region"].astype(str).str.strip().str.upper()

    if "destination" in df.columns:
        df["destination"] = df["destination"].astype(str).str.strip().str.upper()

    df["mois"]  = df["date_bl"].dt.month
    df["annee"] = df["date_bl"].dt.year

    print(f"\n✅ Données prêtes : {len(df)} lignes")
    print(f"   Qualités trouvées : {sorted(df['qualite'].unique()) if 'qualite' in df.columns else 'N/A'}")
    print(f"   Régions trouvées  : {sorted(df['region'].unique()) if 'region' in df.columns else 'N/A'}")
    return df


# ─────────────────────────────────────────────
# 2. STATISTIQUES DESCRIPTIVES
# ─────────────────────────────────────────────
def compute_statistics(df: pd.DataFrame) -> pd.DataFrame:

    def stats_for(series: pd.Series, label: str) -> dict:
        s = series.dropna()
        if len(s) < 3:
            return {"Indicateur": label, "N": len(s)}
        stat, p_sw = shapiro(s) if len(s) <= 5000 else (np.nan, np.nan)
        return {
            "Indicateur"      : label,
            "N"               : len(s),
            "Somme (t)"       : round(s.sum(), 0),
            "Moyenne"         : round(s.mean(), 2),
            "Médiane"         : round(s.median(), 2),
            "Écart-type"      : round(s.std(), 2),
            "CV (%)"          : round(s.std() / s.mean() * 100, 1) if s.mean() != 0 else np.nan,
            "Min"             : round(s.min(), 2),
            "Max"             : round(s.max(), 2),
            "Q1"              : round(s.quantile(0.25), 2),
            "Q3"              : round(s.quantile(0.75), 2),
            "IQR"             : round(s.quantile(0.75) - s.quantile(0.25), 2),
            "Skewness"        : round(skew(s), 3),
            "Kurtosis (exc.)" : round(kurtosis(s), 3),
            "Shapiro-Wilk p"  : round(p_sw, 4) if not np.isnan(p_sw) else np.nan,
            "Normalité"       : "Oui" if (not np.isnan(p_sw) and p_sw > 0.05) else "Non",
        }

    rows = [stats_for(df["tonnage_bl"], "Tonnage B/L (t) — Global")]

    if "cadence_realisee" in df.columns:
        rows.append(stats_for(df["cadence_realisee"], "Cadence réalisée (t/j) — Global"))

    if "qualite" in df.columns:
        for q in sorted(df["qualite"].dropna().unique()):
            sub = df[df["qualite"] == q]
            rows.append(stats_for(sub["tonnage_bl"], f"Tonnage B/L — {q}"))
            if "cadence_realisee" in df.columns:
                rows.append(stats_for(sub["cadence_realisee"], f"Cadence réalisée — {q}"))

    stats_df = pd.DataFrame(rows)
    stats_df.to_csv("outputs/statistiques_descriptives_2_1.csv", index=False, encoding="utf-8-sig")
    print("📊 Statistiques sauvegardées → outputs/statistiques_descriptives_2_1.csv")
    return stats_df


# ─────────────────────────────────────────────
# 3. FIGURE 2.1-A : DISTRIBUTION TONNAGES B/L
# ─────────────────────────────────────────────
def fig_distribution_tonnage(df: pd.DataFrame):

    data = df["tonnage_bl"].dropna()
    mu, sigma = data.mean(), data.std()
    sk, kurt_ = skew(data), kurtosis(data)

    fig, axes = plt.subplots(1, 2, figsize=FIGSIZE_DOUBLE)
    fig.suptitle("Figure 2.1-A — Distribution des Tonnages B/L (2025)",
                 fontsize=14, fontweight="bold", y=1.02, color=OCP_PALETTE["primary"])

    # Panneau gauche : histogramme + KDE
    ax = axes[0]
    n_bins = min(30, int(np.sqrt(len(data))))
    ax.hist(data / 1000, bins=n_bins, density=True,
            color=OCP_PALETTE["secondary"], alpha=0.75,
            edgecolor="white", linewidth=0.6, label="Fréquences observées")

    kde_x = np.linspace(data.min(), data.max(), 500) / 1000
    kde_y = stats.gaussian_kde(data / 1000)(kde_x)
    ax.plot(kde_x, kde_y, color=OCP_PALETTE["primary"], lw=2.5, label="KDE empirique")

    norm_y = norm.pdf(kde_x, mu / 1000, sigma / 1000)
    ax.plot(kde_x, norm_y, color=OCP_PALETTE["highlight"],
            lw=2, ls="--", label="Loi normale théorique")

    ax.axvline(mu / 1000, color=OCP_PALETTE["accent"], lw=1.8, ls="-",
               label=f"Moyenne = {mu/1000:.1f} kt")
    ax.axvline(data.median() / 1000, color="crimson", lw=1.8, ls=":",
               label=f"Médiane = {data.median()/1000:.1f} kt")

    ax.set_xlabel("Tonnage B/L (kt)", labelpad=8)
    ax.set_ylabel("Densité de probabilité", labelpad=8)
    ax.set_title("Histogramme & KDE", fontsize=11)
    ax.legend(fontsize=8)

    textstr = (f"N = {len(data)}\n"
               f"μ = {mu/1000:.1f} kt\n"
               f"σ = {sigma/1000:.1f} kt\n"
               f"Skewness = {sk:.2f}\n"
               f"Kurtosis = {kurt_:.2f}")
    props = dict(boxstyle="round,pad=0.5", facecolor=OCP_PALETTE["light"],
                 edgecolor=OCP_PALETTE["secondary"], alpha=0.9)
    ax.text(0.97, 0.97, textstr, transform=ax.transAxes,
            fontsize=8.5, va="top", ha="right", bbox=props)

    # Panneau droit : boxplot par qualité
    ax2 = axes[1]
    qualites  = [q for q in ["MAP", "DAP", "TSP", "NPS"] if q in df["qualite"].values]
    if not qualites:
        qualites = sorted(df["qualite"].dropna().unique())
    data_by_q = [df[df["qualite"] == q]["tonnage_bl"].dropna() / 1000 for q in qualites]
    colors_q  = [QUALITE_COLORS.get(q, OCP_PALETTE["secondary"]) for q in qualites]

    if data_by_q:
        bp = ax2.boxplot(data_by_q, patch_artist=True, notch=False,
                         medianprops=dict(color="white", linewidth=2.5),
                         whiskerprops=dict(linewidth=1.5),
                         capprops=dict(linewidth=1.5),
                         flierprops=dict(marker="o", markersize=4, alpha=0.5))
        for patch, color in zip(bp["boxes"], colors_q):
            patch.set_facecolor(color)
            patch.set_alpha(0.85)
        ax2.set_xticklabels(qualites, fontsize=9, rotation=15)
        for i, (d_q, q) in enumerate(zip(data_by_q, qualites), start=1):
            if len(d_q) > 0:
                ax2.scatter(i, d_q.mean(), marker="D", s=50,
                            color="white", edgecolor=OCP_PALETTE["dark"], zorder=5)
                ax2.text(i, d_q.mean() + 0.5, f"{d_q.mean():.1f}",
                         ha="center", va="bottom", fontsize=8)

    ax2.set_xlabel("Qualité de produit", labelpad=8)
    ax2.set_ylabel("Tonnage B/L (kt)", labelpad=8)
    ax2.set_title("Boxplot par Qualité", fontsize=11)

    plt.tight_layout()
    plt.savefig("figures/fig_2_1_A_distribution_tonnage.png")
    plt.close()
    print("✅ Figure 2.1-A sauvegardée")


# ─────────────────────────────────────────────
# 4. FIGURE 2.1-B : RÉPARTITION PAR QUALITÉ
# ─────────────────────────────────────────────
def fig_repartition_qualite(df: pd.DataFrame):

    qualite_agg = (df.groupby("qualite")["tonnage_total"]
                     .agg(["sum", "count"])
                     .rename(columns={"sum": "tonnage", "count": "escales"})
                     .sort_values("tonnage", ascending=False))

    # Filtrer les lignes vides / NAN
    qualite_agg = qualite_agg[qualite_agg["tonnage"] > 0]

    colors = [QUALITE_COLORS.get(q, OCP_PALETTE["secondary"]) for q in qualite_agg.index]
    total  = qualite_agg["tonnage"].sum()
    pcts   = qualite_agg["tonnage"] / total * 100

    fig, axes = plt.subplots(1, 2, figsize=FIGSIZE_DOUBLE)
    fig.suptitle("Figure 2.1-B — Répartition par Qualité de Produit (2025)",
                 fontsize=14, fontweight="bold", color=OCP_PALETTE["primary"])

    # Pie chart
    ax1 = axes[0]
    wedges, texts, autotexts = ax1.pie(
        qualite_agg["tonnage"], labels=None, colors=colors,
        autopct="%1.1f%%", pctdistance=0.75, startangle=90,
        wedgeprops=dict(linewidth=2, edgecolor="white"),
        explode=[0.04] * len(qualite_agg),
    )
    for at in autotexts:
        at.set_fontsize(9)
        at.set_fontweight("bold")
        at.set_color("white")

    legend_labels = [
        f"{q}  —  {pcts[q]:.1f}%  ({qualite_agg.loc[q,'tonnage']/1e6:.2f} Mt)"
        for q in qualite_agg.index
    ]
    ax1.legend(wedges, legend_labels, loc="lower center",
               bbox_to_anchor=(0.5, -0.15), ncol=2, fontsize=8, framealpha=0.9)
    ax1.set_title(f"Répartition tonnage\nTotal : {total/1e6:.2f} Mt", fontsize=11)

    # Bar chart horizontal
    ax2 = axes[1]
    bars = ax2.barh(qualite_agg.index, qualite_agg["tonnage"] / 1e6,
                    color=colors, edgecolor="white", linewidth=0.8, height=0.6)
    for bar, (q, row) in zip(bars, qualite_agg.iterrows()):
        w = bar.get_width()
        ax2.text(w + total / 1e6 * 0.01,
                 bar.get_y() + bar.get_height() / 2,
                 f"{w:.2f} Mt  ({row['escales']} escales)",
                 va="center", ha="left", fontsize=9)

    ax2.set_xlabel("Tonnage exporté (Mt)", labelpad=8)
    ax2.set_title("Volume exporté par qualité", fontsize=11)
    ax2.set_xlim(0, qualite_agg["tonnage"].max() / 1e6 * 1.35)
    ax2.invert_yaxis()
    ax2.grid(axis="x", alpha=0.5)
    ax2.set_axisbelow(True)

    plt.tight_layout()
    plt.savefig("figures/fig_2_1_B_repartition_qualite.png")
    plt.close()
    print("✅ Figure 2.1-B sauvegardée")


# ─────────────────────────────────────────────
# 5. FIGURE 2.1-C : RÉPARTITION PAR RÉGION
# ─────────────────────────────────────────────
def fig_repartition_region(df: pd.DataFrame):

    # ── Pivot région × qualité ──
    pivot = (df.groupby(["region", "qualite"])["tonnage_total"]
               .sum()
               .unstack(fill_value=0) / 1e6)

    # Garder uniquement les colonnes non nulles
    pivot = pivot.loc[:, (pivot > 0).any(axis=0)]
    pivot = pivot.loc[(pivot > 0).any(axis=1), :]

    if pivot.empty:
        print("⚠️  Pivot région×qualité vide — Figure 2.1-C ignorée")
        return

    fig = plt.figure(figsize=FIGSIZE_LARGE)
    gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.45, wspace=0.4)
    fig.suptitle("Figure 2.1-C — Répartition par Région & Destination (2025)",
                 fontsize=14, fontweight="bold", color=OCP_PALETTE["primary"])

    # Heatmap
    ax1 = fig.add_subplot(gs[0, :])
    cmap = sns.light_palette(OCP_PALETTE["secondary"], as_cmap=True)
    sns.heatmap(pivot, annot=True, fmt=".2f", cmap=cmap,
                linewidths=0.5, linecolor="white",
                cbar_kws={"label": "Tonnage (Mt)", "shrink": 0.8},
                ax=ax1)
    ax1.set_title("Heatmap : Tonnage (Mt) par Région × Qualité", fontsize=11)
    ax1.set_xlabel("Qualité", labelpad=8)
    ax1.set_ylabel("Région", labelpad=8)
    ax1.tick_params(axis="x", rotation=0)
    ax1.tick_params(axis="y", rotation=0)

    # Pie chart régions
    ax2 = fig.add_subplot(gs[1, 0])
    region_agg = (df.groupby("region")["tonnage_total"]
                    .sum()
                    .sort_values(ascending=False))
    region_agg = region_agg[region_agg > 0]
    col_reg = [REGION_COLORS.get(r, OCP_PALETTE["neutral"]) for r in region_agg.index]

    wedges, texts, autos = ax2.pie(
        region_agg, labels=None, colors=col_reg,
        autopct="%1.1f%%", pctdistance=0.78, startangle=120,
        wedgeprops=dict(linewidth=2, edgecolor="white"),
        explode=[0.03] * len(region_agg),
    )
    for at in autos:
        at.set_fontsize(9)
        at.set_fontweight("bold")
        at.set_color("white")
    ax2.legend(wedges, region_agg.index, loc="lower center",
               bbox_to_anchor=(0.5, -0.2), ncol=2, fontsize=8)
    ax2.set_title("Part de chaque région\ndans le tonnage total", fontsize=10)

    # Top 10 destinations
    ax3 = fig.add_subplot(gs[1, 1])
    dest_agg = (df.groupby("destination")["tonnage_total"]
                  .sum()
                  .sort_values(ascending=False)
                  .head(10))
    bars = ax3.barh(dest_agg.index[::-1], dest_agg.values[::-1] / 1e6,
                    color=OCP_PALETTE["secondary"], edgecolor="white", height=0.6)
    for bar in bars:
        w = bar.get_width()
        ax3.text(w + dest_agg.max() / 1e6 * 0.01,
                 bar.get_y() + bar.get_height() / 2,
                 f"{w:.2f} Mt", va="center", ha="left", fontsize=8.5)
    ax3.set_xlabel("Tonnage exporté (Mt)", labelpad=8)
    ax3.set_title("Top 10 destinations", fontsize=10)
    ax3.set_xlim(0, dest_agg.max() / 1e6 * 1.3)
    ax3.grid(axis="x", alpha=0.5)
    ax3.set_axisbelow(True)

    plt.savefig("figures/fig_2_1_C_repartition_region.png")
    plt.close()
    print("✅ Figure 2.1-C sauvegardée")


# ─────────────────────────────────────────────
# 6. FIGURE 2.1-D : ÉVOLUTION MENSUELLE
# ─────────────────────────────────────────────
def fig_evolution_mensuelle(df: pd.DataFrame):

    monthly = (df.groupby(["mois", "qualite"])["tonnage_total"]
                 .sum()
                 .unstack(fill_value=0) / 1e3)

    qualites      = [q for q in ["MAP", "DAP", "TSP", "NPS"] if q in monthly.columns]
    if not qualites:
        qualites = list(monthly.columns)
    monthly       = monthly[qualites]
    mois_labels   = [f"M{m:02d}" for m in monthly.index]
    total_monthly = monthly.sum(axis=1)

    fig, ax = plt.subplots(figsize=(14, 6))
    fig.suptitle("Figure 2.1-D — Évolution Mensuelle du Tonnage Exporté (2025)",
                 fontsize=14, fontweight="bold", color=OCP_PALETTE["primary"])

    bottom = np.zeros(len(monthly))
    for q in qualites:
        color = QUALITE_COLORS.get(q, OCP_PALETTE["secondary"])
        ax.bar(range(len(monthly)), monthly[q], bottom=bottom,
               color=color, label=q, edgecolor="white", linewidth=0.6, width=0.7)
        bottom += monthly[q].values

    ax2 = ax.twinx()
    ax2.plot(range(len(monthly)), total_monthly.values,
             color=OCP_PALETTE["highlight"], lw=2.5, marker="o",
             markersize=6, label="Total mensuel (kt)", zorder=5)
    ax2.set_ylabel("Total mensuel (kt)", color=OCP_PALETTE["highlight"], labelpad=8)
    ax2.tick_params(axis="y", colors=OCP_PALETTE["highlight"])

    for i, val in enumerate(total_monthly):
        ax2.text(i, val + total_monthly.max() * 0.02,
                 f"{val:.0f}kt", ha="center", va="bottom",
                 fontsize=7.5, color=OCP_PALETTE["highlight"], fontweight="bold")

    ax.set_xticks(range(len(monthly)))
    ax.set_xticklabels(mois_labels, rotation=0)
    ax.set_xlabel("Mois (2025)", labelpad=8)
    ax.set_ylabel("Tonnage par qualité (kt)", labelpad=8)
    ax.legend(loc="upper left", fontsize=9)

    mean_val = total_monthly.mean()
    ax2.axhline(mean_val, color=OCP_PALETTE["neutral"], lw=1.5, ls="--", alpha=0.7)
    ax2.legend(loc="upper right", fontsize=9)

    plt.tight_layout()
    plt.savefig("figures/fig_2_1_D_evolution_mensuelle.png")
    plt.close()
    print("✅ Figure 2.1-D sauvegardée")


# ─────────────────────────────────────────────
# 7. FIGURE 2.1-E : CADENCE RÉALISÉE VS CONTRACTUELLE
# ─────────────────────────────────────────────
def fig_cadence_comparison(df: pd.DataFrame):

    if "cadence_realisee" not in df.columns or "cadence_contractuelle" not in df.columns:
        print("⚠️  Colonnes cadence manquantes — Figure 2.1-E ignorée")
        return

    sub = df[["qualite", "cadence_realisee", "cadence_contractuelle"]].dropna()
    if sub.empty:
        print("⚠️  Données cadence vides — Figure 2.1-E ignorée")
        return

    sub = sub.copy()
    sub["perf"] = sub["cadence_realisee"] / sub["cadence_contractuelle"] * 100

    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle("Figure 2.1-E — Cadence Réalisée vs Contractuelle par Qualité (2025)",
                 fontsize=14, fontweight="bold", color=OCP_PALETTE["primary"])

    qualites = sorted(sub["qualite"].unique())
    colors   = [QUALITE_COLORS.get(q, OCP_PALETTE["secondary"]) for q in qualites]

    # Scatter
    ax = axes[0]
    for q, c in zip(qualites, colors):
        s_ = sub[sub["qualite"] == q]
        ax.scatter(s_["cadence_contractuelle"], s_["cadence_realisee"],
                   color=c, alpha=0.65, s=60, label=q,
                   edgecolors="white", linewidths=0.5)
    lims = [sub[["cadence_realisee", "cadence_contractuelle"]].min().min(),
            sub[["cadence_realisee", "cadence_contractuelle"]].max().max()]
    ax.plot(lims, lims, color=OCP_PALETTE["highlight"], lw=1.5, ls="--",
            label="Égalité réalisée = contractuelle")
    ax.set_xlabel("Cadence contractuelle (t/j)", labelpad=8)
    ax.set_ylabel("Cadence réalisée (t/j)", labelpad=8)
    ax.set_title("Réalisée vs Contractuelle", fontsize=11)
    ax.legend(fontsize=8)

    # Boxplot performance
    ax2 = axes[1]
    data_perf = [sub[sub["qualite"] == q]["perf"].dropna() for q in qualites]
    bp = ax2.boxplot(data_perf, patch_artist=True, notch=False,
                     medianprops=dict(color="white", lw=2.5))
    for patch, c in zip(bp["boxes"], colors):
        patch.set_facecolor(c)
        patch.set_alpha(0.85)
    ax2.axhline(100, color=OCP_PALETTE["highlight"], lw=2, ls="--", label="Objectif 100%")
    ax2.set_xticklabels(qualites, rotation=15, fontsize=9)
    ax2.set_ylabel("Performance réalisée / contractuelle (%)", labelpad=8)
    ax2.set_title("Distribution de la Performance (%)", fontsize=11)
    ax2.legend(fontsize=8)

    # Bar chart performance moyenne
    ax3 = axes[2]
    mean_perf  = sub.groupby("qualite")["perf"].mean().reindex(qualites)
    bar_colors = [OCP_PALETTE["accent"] if v >= 100 else OCP_PALETTE["highlight"]
                  for v in mean_perf]
    bars = ax3.bar(qualites, mean_perf, color=bar_colors, edgecolor="white", width=0.6)
    for bar, val in zip(bars, mean_perf):
        ax3.text(bar.get_x() + bar.get_width() / 2, val + 0.5,
                 f"{val:.1f}%", ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax3.axhline(100, color=OCP_PALETTE["primary"], lw=2, ls="--",
                label="Seuil contractuel (100%)")
    ax3.set_ylabel("Performance moyenne (%)", labelpad=8)
    ax3.set_title("Performance Moyenne par Qualité", fontsize=11)

    legend_patches = [
        mpatches.Patch(color=OCP_PALETTE["accent"],    label="≥ 100% (conforme)"),
        mpatches.Patch(color=OCP_PALETTE["highlight"], label="< 100% (sous-performance)"),
    ]
    ax3.legend(handles=legend_patches, fontsize=8)

    plt.tight_layout()
    plt.savefig("figures/fig_2_1_E_cadence_comparison.png")
    plt.close()
    print("✅ Figure 2.1-E sauvegardée")


# ─────────────────────────────────────────────
# 8. TABLEAU RÉCAPITULATIF
# ─────────────────────────────────────────────
def tableau_recapitulatif(df: pd.DataFrame) -> pd.DataFrame:

    grp = df.groupby("qualite")

    recap = pd.DataFrame({
        "Nb escales"         : grp["tonnage_bl"].count(),
        "Tonnage total (Mt)" : grp["tonnage_total"].sum() / 1e6,
        "Part (%)"           : grp["tonnage_total"].sum() / df["tonnage_total"].sum() * 100,
        "Tonnage moyen (t)"  : grp["tonnage_bl"].mean(),
        "Tonnage médian (t)" : grp["tonnage_bl"].median(),
        "Écart-type (t)"     : grp["tonnage_bl"].std(),
        "Skewness"           : grp["tonnage_bl"].apply(lambda x: skew(x.dropna())),
        "Kurtosis"           : grp["tonnage_bl"].apply(lambda x: kurtosis(x.dropna())),
    })

    if "cadence_realisee" in df.columns:
        recap["Cadence moy. réal. (t/j)"] = grp["cadence_realisee"].mean()
    if "cadence_contractuelle" in df.columns:
        recap["Cadence moy. cont. (t/j)"] = grp["cadence_contractuelle"].mean()
        recap["Performance (%)"] = (grp["cadence_realisee"].mean() /
                                    grp["cadence_contractuelle"].mean() * 100)

    recap = recap.round(2).sort_values("Tonnage total (Mt)", ascending=False)
    recap.to_csv("outputs/tableau_recapitulatif_qualite.csv", encoding="utf-8-sig")

    print("📋 Tableau récapitulatif :")
    print(recap.to_string())
    return recap


# ─────────────────────────────────────────────
# 9. FIGURE 2.1-F : VIOLIN PLOT
# ─────────────────────────────────────────────
def fig_violin_tonnage(df: pd.DataFrame):

    fig, ax = plt.subplots(figsize=(10, 6))
    fig.suptitle("Figure 2.1-F — Distribution Détaillée du Tonnage par Qualité (Violin Plot)",
                 fontsize=13, fontweight="bold", color=OCP_PALETTE["primary"])

    qualites = [q for q in ["MAP", "DAP", "TSP", "NPS"] if q in df["qualite"].values]
    if not qualites:
        qualites = sorted(df["qualite"].dropna().unique())

    data_q = [df[df["qualite"] == q]["tonnage_bl"].dropna() / 1000 for q in qualites]
    data_q = [(d, q) for d, q in zip(data_q, qualites) if len(d) >= 2]

    if not data_q:
        print("⚠️  Données insuffisantes pour violin plot")
        return

    qualites_ok = [q for _, q in data_q]
    data_ok     = [d for d, _ in data_q]

    parts = ax.violinplot(data_ok, positions=range(len(qualites_ok)),
                          showmeans=True, showmedians=True,
                          showextrema=True, widths=0.7)

    for pc, q in zip(parts["bodies"], qualites_ok):
        pc.set_facecolor(QUALITE_COLORS.get(q, OCP_PALETTE["secondary"]))
        pc.set_alpha(0.75)
        pc.set_edgecolor(OCP_PALETTE["dark"])
        pc.set_linewidth(1.2)

    parts["cmeans"].set_edgecolor(OCP_PALETTE["highlight"])
    parts["cmeans"].set_linewidth(2.5)
    parts["cmedians"].set_edgecolor("white")
    parts["cmedians"].set_linewidth(2)

    for i, (d, q) in enumerate(zip(data_ok, qualites_ok)):
        jitter = np.random.uniform(-0.08, 0.08, size=len(d))
        ax.scatter(i + jitter, d, alpha=0.3, s=15,
                   color=QUALITE_COLORS.get(q, OCP_PALETTE["secondary"]),
                   edgecolors="none", zorder=2)

    ax.set_xticks(range(len(qualites_ok)))
    ax.set_xticklabels(qualites_ok, fontsize=12)
    ax.set_ylabel("Tonnage B/L (kt)", labelpad=8)
    ax.set_xlabel("Qualité de produit", labelpad=8)

    legend_elements = [
        Line2D([0], [0], color=OCP_PALETTE["highlight"], lw=2.5, label="Moyenne"),
        Line2D([0], [0], color="white",                  lw=2.0, label="Médiane"),
    ]
    ax.legend(handles=legend_elements, fontsize=9)

    plt.tight_layout()
    plt.savefig("figures/fig_2_1_F_violin_tonnage.png")
    plt.close()
    print("✅ Figure 2.1-F sauvegardée")


# ─────────────────────────────────────────────
# 10. PIPELINE PRINCIPAL
# ─────────────────────────────────────────────
def run_analysis(filepath: str = r"C:\Users\LENOVO\Desktop\export_data.xlsx"):

    print("\n" + "="*65)
    print("  ANALYSE DESCRIPTIVE — SECTION 2.1")
    print("  JPH / OCP Group — AI Loading Planner")
    print("="*65 + "\n")

    df       = load_and_clean(filepath)
    stats_df = compute_statistics(df)

    fig_distribution_tonnage(df)
    fig_repartition_qualite(df)
    fig_repartition_region(df)
    fig_evolution_mensuelle(df)
    fig_cadence_comparison(df)
    fig_violin_tonnage(df)

    recap = tableau_recapitulatif(df)

    print("\n" + "="*65)
    print("  ✅ ANALYSE TERMINÉE")
    print(f"  📁 Figures  → figures/  ({len(os.listdir('figures'))} fichiers)")
    print(f"  📁 Tableaux → outputs/ ({len(os.listdir('outputs'))} fichiers)")
    print("="*65 + "\n")

    return df, stats_df, recap


if __name__ == "__main__":
    df, stats_df, recap = run_analysis(r"C:\Users\LENOVO\Desktop\export_data.xlsx")