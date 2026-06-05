// ── Real data extracted from MODELE_ML files ──────────────────────────────

export const MODEL_RESULTS = [
  { model:'RandomForest', type:'Supervisé', precision:0.9362, recall:1.0000, f1:0.9670, accuracy:0.9818, aucRoc:0.9935, aucPr:0.9802, tp:88, fp:6, tn:235, fn:0, score:0.9803, best:true },
  { model:'XGBoost',      type:'Supervisé', precision:0.9451, recall:0.9773, f1:0.9609, accuracy:0.9787, aucRoc:0.9951, aucPr:0.9831, tp:86, fp:5, tn:236, fn:2, score:0.9797, best:false },
  { model:'SVM',          type:'Supervisé', precision:0.9255, recall:0.9886, f1:0.9560, accuracy:0.9757, aucRoc:0.9942, aucPr:0.9807, tp:87, fp:7, tn:234, fn:1, score:0.9770, best:false },
  { model:'LightGBM',     type:'Supervisé', precision:0.9444, recall:0.9659, f1:0.9551, accuracy:0.9757, aucRoc:0.9944, aucPr:0.9804, tp:85, fp:5, tn:236, fn:3, score:0.9766, best:false },
  { model:'KNN',          type:'Supervisé', precision:0.8842, recall:0.9545, f1:0.9180, accuracy:0.9544, aucRoc:0.9921, aucPr:0.9698, tp:84, fp:11, tn:230, fn:4, score:0.9600, best:false },
  { model:'IsolationForest', type:'Non-Supervisé', precision:0.3209, recall:0.9773, f1:0.4831, accuracy:0.4407, aucRoc:0.7761, aucPr:0.6305, tp:86, fp:182, tn:59, fn:2, score:0.6299, best:false },
  { model:'Baseline',     type:'Référence',  precision:0.0000, recall:0.0000, f1:0.0000, accuracy:0.7325, aucRoc:0.5000, aucPr:0.2675, tp:0,  fp:0, tn:241, fn:88, score:0.2558, best:false },
];

// Pre-computed mean |SHAP| per feature from shap_values.csv (330 samples)
export const SHAP_IMPORTANCE = [
  { feature:'ratio_arret_anomalie',       importance:0.198, group:'A' },
  { feature:'duree_depuis_last_anomalie', importance:0.132, group:'C' },
  { feature:'taux_disponibilite',         importance:0.055, group:'A' },
  { feature:'duree_max_h',               importance:0.054, group:'A' },
  { feature:'roll_7j_nb_anomalie',       importance:0.034, group:'B' },
  { feature:'duree_totale_h',            importance:0.044, group:'A' },
  { feature:'nb_arrets_total',           importance:0.013, group:'A' },
  { feature:'heure_cos',                 importance:0.012, group:'D' },
  { feature:'duree_depuis_last_arret',   importance:0.012, group:'C' },
  { feature:'roll_3j_duree',             importance:0.015, group:'B' },
  { feature:'roll_7j_duree',             importance:0.009, group:'B' },
  { feature:'roll_3j_nb_arrets',         importance:0.007, group:'B' },
  { feature:'mois_sin',                  importance:0.007, group:'D' },
  { feature:'roll_7j_nb_arrets',         importance:0.004, group:'B' },
  { feature:'pente_arrets_3j',           importance:0.002, group:'B' },
  { feature:'cumul_arrets_7j',           importance:0.002, group:'C' },
  { feature:'axe_encoded',              importance:0.002, group:'E' },
  { feature:'heure_sin',                importance:0.001, group:'D' },
  { feature:'mois_cos',                 importance:0.001, group:'D' },
  { feature:'est_weekend',              importance:0.001, group:'D' },
].sort((a,b)=>b.importance-a.importance);

export const MODEL_CONFIG = {
  best_model: 'RandomForest',
  f1_test: 0.967, recall_test: 1.0, auc_roc_test: 0.9935, auc_pr_test: 0.9802, fn_test: 0,
  trained_date: '2026-04-17 22:13',
  features: ['nb_arrets_total','duree_totale_h','duree_max_h','taux_disponibilite',
    'ratio_arret_anomalie','roll_3j_nb_arrets','roll_7j_nb_arrets','roll_3j_duree',
    'roll_7j_duree','roll_7j_nb_anomalie','pente_arrets_3j','duree_depuis_last_arret',
    'duree_depuis_last_anomalie','cumul_arrets_7j','heure_sin','heure_cos',
    'mois_sin','mois_cos','est_weekend','axe_encoded'],
};

export const DATASET_INFO = {
  periode: '01/01/2025 → 31/12/2025',
  axes: [1,2,3,4,5,6],
  total_lignes: 2190,
  n_features: 20,
  normal: { count:1484, pct:67.8 },
  anomalie: { count:706, pct:32.2 },
  anomalie_types: [
    { type:'Défaut électrique', count:643 },
    { type:'Épuisement de stock', count:613 },
    { type:'Défaut mécanique', count:134 },
    { type:'Rupture de bande', count:24 },
  ],
  chi2: { stat:7.525, ddl:3, p:0.0569, sig:false },
};

export const FEATURE_GROUPS = [
  { label:'A — Performance Opérationnelle', color:'#d4ff00',
    features:['nb_arrets_total','duree_totale_h','duree_max_h','taux_disponibilite','ratio_arret_anomalie'],
    desc:"Niveau d'efficacité et « fatigue » brute de l'axe sur la journée. Chute de disponibilité → précurseur d'anomalie." },
  { label:'B — Historique Court-Terme (Rolling)', color:'#3b82f6',
    features:['roll_3j_nb_arrets','roll_7j_nb_arrets','roll_3j_duree','roll_7j_duree','roll_7j_nb_anomalie','pente_arrets_3j'],
    desc:'Évolution temporelle sur 3 et 7 jours. La « pente » détecte une dégradation continue (trend).' },
  { label:'C — Mémoire des Incidents', color:'#f59e0b',
    features:['duree_depuis_last_arret','duree_depuis_last_anomalie','cumul_arrets_7j'],
    desc:"Carnet de santé de l'axe. Longue période sans panne = usure statistique croissante." },
  { label:'D — Cyclique & Temporel', color:'#8b5cf6',
    features:['heure_sin','heure_cos','mois_sin','mois_cos','est_weekend'],
    desc:'Décomposition sin/cos pour encoder les cycles horaires et mensuels (23h ≈ 1h du matin).' },
  { label:'E — Singularité de l\'Axe', color:'#06b6d4',
    features:['axe_encoded'],
    desc:"Chaque axe a son âge et sa propre mécanique. Encode physiquement le quai concerné." },
];

export const PIPELINE_STEPS = [
  { n:'01', title:'Chargement & Intégrité', icon:'I/O', color:'#d4ff00',
    desc:"Lecture du dataset, vérification des valeurs manquantes (NaN). 2 190 lignes × 34 colonnes brutes → 20 features." },
  { n:'02', title:'Split Temporel 70/15/15', icon:'SPL', color:'#3b82f6',
    desc:"Séparation stricte chronologique : Entraînement Jan–Sep | Validation Oct | Test Nov–Déc. Aucun mélange aléatoire." },
  { n:'03', title:'Équilibrage SMOTE', icon:'BAL', color:'#f59e0b',
    desc:"Génération synthétique de jours d'anomalie (32.2%) pour équilibrer le dataset et éviter le biais 'tout Sain'." },
  { n:'04', title:'Entraînement Multi-Modèle', icon:'FIT', color:'#8b5cf6',
    desc:"6 modèles en compétition (RF, XGB, SVM, LGBM, KNN, IsolationForest) via TimeSeriesSplit à 5 folds." },
  { n:'05', title:'Sélection McNemar + F1', icon:'SEL', color:'#06b6d4',
    desc:"Critère : F1-Score + Recall max. Faux Négatif = panne non détectée → coût fatal. Test McNemar valide la victoire." },
  { n:'06', title:'Interprétabilité SHAP', icon:'XAI', color:'#a78bfa',
    desc:"Chaque prédiction est expliquée feature par feature. L'opérateur sait POURQUOI l'axe est classé en anomalie." },
];
