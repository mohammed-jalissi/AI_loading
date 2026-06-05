import React from 'react';

const S = {
  page: {
    width: '210mm',
    padding: '20mm 22mm',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: '11px',
    lineHeight: '1.4',
    boxSizing: 'border-box',
  },
  headerWrap: {
    borderBottom: '2px solid #1e3a5f',
    paddingBottom: '15px',
    marginBottom: '20px',
    position: 'relative',
  },
  logo: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '45px',
    height: '45px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    borderRadius: '2px'
  },
  headerContent: {
    textAlign: 'right',
  },
  mainTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1e3a5f',
    textTransform: 'uppercase',
    margin: '0 0 5px 0',
    letterSpacing: '1px'
  },
  subtitle: {
    fontSize: '10px',
    fontStyle: 'italic',
    color: '#475569',
    margin: 0
  },
  ocpLine: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#1e3a5f',
    margin: '4px 0 0 0'
  },
  metaLine: {
    textAlign: 'center',
    fontSize: '9px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    margin: '20px 0',
    letterSpacing: '1px'
  },
  keywords: {
    fontSize: '9px',
    margin: '15px 0',
    color: '#334155'
  },
  abstractBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    padding: '12px 15px',
    margin: '15px 0',
    fontSize: '10px',
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: '1.6'
  },
  h2: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#1e3a5f',
    backgroundColor: '#f1f5f9',
    borderLeft: '4px solid #1e3a5f',
    padding: '5px 12px',
    margin: '25px 0 15px 0',
  },
  p: {
    fontSize: '11px',
    marginBottom: '10px',
    textAlign: 'justify'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '10px',
    margin: '15px 0'
  },
  th: {
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    padding: '8px 10px',
    textAlign: 'left',
    textTransform: 'uppercase',
    fontSize: '9px',
    border: '1px solid #1e3a5f'
  },
  td: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    verticalAlign: 'top'
  },
  tdMono: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    color: '#2563eb',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  formulaBox: {
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    padding: '20px',
    textAlign: 'center',
    margin: '20px 0',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#0f172a'
  },
  constraintItem: {
    width: '48%',
    display: 'inline-block',
    verticalAlign: 'top',
    marginBottom: '20px',
    pageBreakInside: 'avoid'
  },
  cTitle: {
    fontWeight: 'bold',
    fontSize: '11px',
    color: '#1f2937',
    marginBottom: '4px'
  },
  cFormula: {
    color: '#1e40af',
    fontSize: '11px',
    fontFamily: 'serif',
    marginBottom: '6px'
  },
  cConcept: {
    fontSize: '10px',
    color: '#374151',
    margin: '2px 0'
  },
  cApp: {
    fontSize: '9.5px',
    fontStyle: 'italic',
    color: '#64748b'
  }
};

export const AcademicMilpDocument = React.forwardRef((props, ref) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const constraints = [
    { id: 'C1', title: 'Intégrité du Tonnage', formula: 'Σ_{a,h,t} f_{i,l,a,h,t} ≤ TD_{i,l} · r_{i,l}', concept: 'Assure que le volume total chargé pour chaque lot est strictement borné par la demande contractuelle (Tonnage Déclaré).', app: 'Interdiction de sur-chargement au-delà du nominal.' },
    { id: 'C2', title: 'Capacité de Flux (Axe)', formula: 'f_{i,l,a,h,t} ≤ C_{a} · Δt · y_{i,l,a,h,t}', concept: 'Contraint le débit massique instantané à la capacité physique maximale de l\'axe de convoyage sélectionné.', app: 'TB1 limité à 900 T/h par design mécanique.' },
    { id: 'C3', title: 'Exclusivité Temporelle (Axe)', formula: 'Σ_{i,l,h} y_{i,l,a,h,t} ≤ 1', concept: 'Modélisation disjonctive empêchant l\'allocation d\'un même axe à plusieurs vecteurs de chargement simultanément.', app: 'Prévention de la contamination croisée des produits.' },
    { id: 'C4', title: 'Exclusivité Spatiale (Quai)', formula: 'Σ_{i} x_{i,q,t} ≤ 1', concept: 'Un poste d\'accostage ne peut physiquement héberger qu\'une seule unité navale à l\'instant t.', app: 'Sécurité nautique élémentaire.' },
    { id: 'C5', title: 'Disponibilité Actifs (ML)', formula: 'y_{i,l,a,h,t} ≤ Disp_{a,t}', concept: 'Intègre les prédictions de maintenance prédictive (ML) pour bloquer les équipements en état de défaillance imminente.', app: 'Arrêt préventif si vibration anormale détectée.' },
    { id: 'C6', title: 'Fenêtre d\'Accostage (Bollards)', formula: 'x_{i,q,t} ≤ Disp_{q,t}', concept: 'Le quai doit être administrativement et physiquement ouvert aux opérations.', app: 'Fermeture pour maintenance de la défense de quai.' },
    { id: 'C7', title: 'Respect Strict de l\'ETA', formula: 'Acc_{i} ≥ ETA_{i}', concept: 'Interdiction d\'accostage virtuel avant l\'arrivée physique du navire dans la zone de pilotage.', app: 'ETA 14:00 -> Accostage impossible à 12:00.' },
    { id: 'C8', title: 'Borne de l\'Horizon de Planification', formula: 't ∈ [0, T]', concept: 'Toutes les variables de décision sont définies sur un ensemble temporel fini (T = 48h).', app: 'Optimisation sur le cycle opérationnel standard.' },
    { id: 'C9', title: 'Compatibilité Qualité-Hall', formula: 'y_{i,l,a,h,t} = 0 if K(l) ∉ H(h)', concept: 'Mapping topologique strict entre la nature chimique du produit et son lieu de stockage.', app: 'DAP uniquement dans les halls JFC1/JFC2.' },
    { id: 'C10', title: 'Dynamique d\'Inventaire', formula: 's_{h,k,t+1} = s_{h,k,t} - Σ_{i,l,a} f_{i,l,a,h,t}', concept: 'Équation de bilan de masse assurant la conservation du flux entre le stock et le navire.', app: 'Chaque tonne chargée réduit le stock hall en temps réel.' },
    { id: 'C11', title: 'Non-Négativité des Stocks', formula: 's_{h,k,t} ≥ 0', concept: 'Condition de faisabilité interdisant l\'extraction de matière d\'un hall vide.', app: 'Arrêt de chargement si rupture de stock.' },
    { id: 'C12', title: 'Priorisation Multi-Critères', formula: 'Max Σ w_{i} · f_{i}', concept: 'Pondération de l\'utilité globale selon la hiérarchie commerciale des navires.', app: 'Navire Priorité 1 favorisé sur Navire Priorité 3.' },
    { id: 'C13', title: 'Séquencement des Cales (Lots)', formula: 'τ_{l} + Δt ≤ τ_{l+1}', concept: 'Ordonnancement séquentiel obligatoire des cales pour garantir l\'assiette du navire.', app: 'Cale 1 terminée avant ouverture Cale 2.' },
    { id: 'C14', title: 'Sécurité Météorologique (Vent)', formula: 'y_{i,l,a,h,t} = 0 if V_{vent} > θ_{v}', concept: 'Inhibition du chargement si la vitesse du vent dépasse le seuil critique de sécurité.', app: 'Retrait du bras de chargement si V > 15m/s.' },
    { id: 'C15', title: 'Contrainte de Houle', formula: 'x_{i,q,t} = 0 if H_{houle} > θ_{h}', concept: 'Interdiction de maintien à quai en cas de conditions maritimes extrêmes.', app: 'Mise en rade préventive (Safe Berth).' },
    { id: 'C16', title: 'Continuité Opérationnelle', formula: 'Min Σ |y_{t} - y_{t-1}|', concept: 'Minimisation des cycles de démarrage/arrêt pour préserver la durée de vie des moteurs.', app: 'Réduction de la fatigue mécanique.' },
    { id: 'C17', title: 'Invariance de la Source', formula: 'Σ_{h} y_{i,l,a,h,t} ≤ 1', concept: 'Interdiction de changer de hall source durant le chargement d\'un même lot.', app: 'Garantie de l\'homogénéité du produit.' },
    { id: 'C18', title: 'Unicité de l\'Axe', formula: 'Σ_{a} y_{i,l,a,h,t} ≤ 1', concept: 'Un lot est assigné à un unique chemin critique de convoyage.', app: 'Optimisation de la configuration réseau.' },
    { id: 'C19', title: 'Délai de Finition technique', formula: 'Δt_{fin} ≥ 1h', concept: 'Allocation d\'un temps mort pour le repli des équipements et le nettoyage.', app: 'Passage entre deux cales distinctes.' },
    { id: 'C20', title: 'Procédures CTE + FC', formula: 'Δt_{admin} ≥ 2h', concept: 'Temps obligatoire pour le calcul du tirant d\'eau et les formalités de douane.', app: 'Finalisation post-chargement avant départ.' },
    { id: 'C21', title: 'Restriction de Mouvement Nocturne', formula: 'Mouv_{vessel} = 0 if t ∈ [20h, 06h]', concept: 'Certaines manœuvres de déhalage sont interdites de nuit pour les navires de fort tonnage.', app: 'Sécurité pilotage portuaire.' },
    { id: 'C22', title: 'Occupation Continue du Quai', formula: 'x_{i,q,t} ≥ y_{i,l,a,h,t}', concept: 'Un navire doit être physiquement à quai pour pouvoir activer un flux de chargement.', app: 'Lien logique entre position et opération.' },
    { id: 'C23', title: 'Préparation Administrative (5h)', formula: 'Acc_{i} + 5h ≤ Début_{load}', concept: 'Délai incompressible pour l\'inspection des cales et la mise en place du bras.', app: 'Mise en service post-accostage.' },
    { id: 'C24', title: 'Dépassement de Laytime', formula: 'S_dep_i = max(0, τ_fin_i − α_i − Laytime_i)', concept: 'Calcul de la durée de dépassement du temps de chargement contractuel (laytime). Cette variable est pénalisée dans la fonction objectif comme contrainte temporelle opérationnelle.', app: 'Pénalité de score si le navire dépasse son laytime contractuel.' },
    { id: 'C25', title: 'Exclusivité des Portiques', formula: 'Σ_{i,q} (z_{i,t} + x_{i,q,t} - 1) ≤ 1', concept: 'Pour chaque portique physique partagé entre plusieurs quais, au plus un navire peut charger à travers ce portique à chaque période.', app: 'Un seul navire sur le portique partagé P3 entre 1BIS et 1TER.' },
    { id: 'C26', title: 'Solidarité d\'Épuisement', formula: 'τ_{fin,i} ≥ σ_{fin,l} + T_{finition} + T_{cte} · (1 - V_{exhausted,i})', concept: 'Si au moins une cale ne peut être remplie (stock épuisé), le navire entier est contraint d\'aller en rade. Il est alors exempté de la procédure de douane (CTE_FC) au quai.', app: 'Libération anticipée du quai de 2h si le navire est incomplet.' },
  ];

  return (
    <div ref={ref} style={S.page}>
      
      {/* HEADER SECTION */}
      <div style={S.headerWrap}>
        <div style={S.logo}>JPH</div>
        <div style={S.headerContent}>
          <h1 style={S.mainTitle}>MODÉLISATION INTÉGRÉE & OPTIMISATION</h1>
          <p style={S.subtitle}>Dynamic Integrated Scheduling Problem (DISP) | BAP - QCAP - MRCSP</p>
          <p style={S.ocpLine}>OCP Jorf Lasfar - Jorf Phosphate Hub (JPH)</p>
        </div>
      </div>

      <div style={S.metaLine}>
        RAPPORT TECHNIQUE DE HAUTE PRÉCISION | JPH-DISP-2024 | {dateStr.toUpperCase()} À {timeStr}
      </div>

      <div style={S.keywords}>
        <strong>Mots-clés :</strong> Integrated Scheduling (DISP), Berth Allocation (BAP), Resource Scheduling (MRCSP), QCAP-Conveyors, MILP.
      </div>

      <div style={S.abstractBox}>
        <strong>Résumé Scientifique :</strong> Ce document expose la modélisation intégrée du terminal JPH sous forme de <strong>Modèle de Planification Multi-Critères</strong>. Le problème traité synchronise l'allocation des quais (BAP), l'affectation des capacités de convoyage et l'ordonnancement multi-modes des stocks (MRCSP) sous un formalisme MILP. L'objectif est la maximisation d'un <strong>score normalisé Min-Max</strong> intégrant la priorité commerciale des navires, les temps d'attente, le dépassement du laytime contractuel (contrainte temporelle), ainsi que les risques opérationnels (ML, Météo). Aucune hypothèse financière approximative n'est introduite dans le modèle.
      </div>

      {/* SECTION 1 */}
      <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
        <h2 style={S.h2}>1. Classification et Architecture du Problème</h2>
        <p style={S.p}>
          Le problème est défini comme une architecture hybride intégrée. Il opère une fusion mathématique de trois domaines critiques sous un objectif de <strong>scalarisation par score normalisé</strong> :
        </p>
        <ul style={{ paddingLeft: '20px', fontSize: '10px', lineHeight: '1.6', color: '#334155', marginBottom: '15px' }}>
          <li><strong>BAP (Berth Allocation Problem) :</strong> Gestion spatio-temporelle de l'accostage des navires sur 6 postes.</li>
          <li><strong>QCAP-Conveyor Adaptation :</strong> Allocation dynamique des axes de convoyage.</li>
          <li><strong>MRCSP (Multi-Mode Resource-Constrained) :</strong> Optimisation du couplage <i>Hall-Qualité-Axe</i>.</li>
        </ul>
        <p style={S.p}>
          L'originalité du modèle réside dans sa capacité à intégrer simultanément des contraintes opérationnelles (séquencement, exclusivité des ressources) et des signaux dynamiques (météo, anomalies ML) dans une formulation MILP compacte dont la fonction objectif est un score multi-critères normalisé.
        </p>
      </div>

      {/* SECTION 2 */}
      {/* ... (Unchanged) ... */}

      {/* SECTION 4 */}
      <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
        <h2 style={S.h2}>4. Formulation de la Fonction Objectif (Score Normalisé Min-Max)</h2>
        <div style={S.formulaBox}>
          max Z = w₁·T̄ − w₂·W̄ − w₃·D̄ − w₄·Ī − w₅·Ḡ
        </div>
        <p style={{ ...S.p, fontSize: '10.5px', color: '#475569' }}>
          La structure de l'objectif est une <strong>scalarisation pondérée multi-critères à score normalisé (Min-Max)</strong>. Chaque terme est normalisé dans [0,1] par rapport à son maximum théorique, garantissant la comparabilité des composantes sans recourir à des paramètres financiers approximatifs. Les composantes sont : tonnage pondéré par priorité (T̄), attente cumulée (W̄), dépassement laytime (D̄), inactivité à quai (Ī) et variables binaires fantômes (Ḡ).
        </p>
      </div>

      {/* SECTION 5 */}
      <div style={{ pageBreakInside: 'avoid', marginBottom: '20px' }}>
        <h2 style={S.h2}>5. Hypothèses Fondamentales de Modélisation</h2>
        <div style={{ fontSize: '10.5px', lineHeight: '1.7' }}>
          {[
            { h: 'H1 - Discrétisation Temporelle Finie', d: 'Le continuum temporel est discrétisé en intervalles réguliers Δt = 1 heure.' },
            { h: 'H2 - Ressources Disjonctives et Incompressibles', d: 'Les postes d\'accostage et les axes sont des ressources non-partageables.' },
            { h: 'H3 - Stationnarité des Cadences Opérationnelles', d: 'Le flux de chargement est supposé constant et borné par la capacité nominale.' },
            { h: 'H4 - Intégrité Qualitative et Stabilité du Flux', d: 'Pour chaque lot, le couplage (Hall, Axe) est invariant.' },
            { h: 'H5 - Linéarisation des Risques Stochastiques', d: 'Incertitudes climatiques intégrées via des pénalités linéaires pondérées.' }
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <strong>• {item.h} :</strong> {item.d}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6 */}
      <h2 style={S.h2}>6. Catalogue des Contraintes Systèmes (C1 – C26)</h2>
      <div style={{ width: '100%' }}>
        {constraints.map((c, i) => (
          <div key={i} style={{ ...S.constraintItem, marginRight: i % 2 === 0 ? '4%' : '0' }}>
            <div style={S.cTitle}>{c.id} : {c.title}</div>
            <div style={S.cFormula}>{c.formula}</div>
            <div style={S.cConcept}>
              <strong>Concept : </strong>{c.concept}
            </div>
            <div style={S.cApp}>
              <em>Application : {c.app}</em>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', fontSize: '9px', color: '#64748b' }}>
        © {now.getFullYear()} OCP Group - JPH | IA Loading Planner v4.0
      </div>

    </div>
  );
});
