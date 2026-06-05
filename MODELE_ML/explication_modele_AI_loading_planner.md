# Documentation du Modèle de Détection d'Anomalies (Module 2)
## Pour le Projet "AI Loading Planner" - OCP Jorf Lasfar

### 1. Quel est l'Objectif de ce Modèle ?
L'objectif central de ce modèle est de **prédire et détecter les anomalies** (pannes majeures, dérives de fonctionnement, arrêts critiques) sur les axes de chargement du port. 

Dans le cadre du projet global **"AI Loading Planner"**, l'objectif n'est plus seulement de planifier mathématiquement des navires sur des axes, mais d'avoir une approche **proactive**. Le modèle permet d'anticiper si un axe physique risque de tomber ou non en panne au moment où on compte y charger le phosphate, et ce, avant même que la panne n'ait lieu.

---

### 2. Explication Simple des Caractéristiques (Features) et de leur Utilité
Le modèle ingère 20 variables, réparties en 5 grandes familles logiques pour analyser la santé de la machine :

*   **Groupe A : Performance Opérationnelle** (Ex: `nb_arrets_total`, `duree_totale_h`, `taux_disponibilite`)
    *   *Utilité :* Permet au modèle de comprendre le niveau d'efficacité et la "fatigue" brute subie par l'axe sur une journée donnée. Une chute soudaine du taux de disponibilité ou un pic du ratio des arrêts sur une journée est précurseur d'un problème plus grave.
*   **Groupe B : Historique Court-Terme (Rolling Windows)** (Ex: `roll_3j_nb_arrets`, `pente_arrets_3j`)
    *   *Utilité :* Représente l'évolution temporelle. Une panne survient rarement sans crier gare ; elle est souvent précédée de nombreux "micro-arrêts" les jours précédents. Ces "fenêtres de 3 et 7 jours" et le calcul de la "pente" alertent le modèle sur la dégradation continue (trend) d'un axe.
*   **Groupe C : Mémoire des incidents** (Ex: `duree_depuis_last_anomalie`, `cumul_arrets_7j`)
    *   *Utilité :* Se comporte comme le carnet de santé de l'axe. Les équipements ont souvent un temps moyen entre deux pannes cycliques. Savoir que la dernière vraie panne remonte à très longtemps indique une augmentation statistique globale de "l'usure", rendant la probabilité de panne imminente plus élevée.
*   **Groupe D : Cyclique & Temporel** (Ex: `heure_sin`, `heure_cos`, `est_weekend`)
    *   *Utilité :* Permet de prendre en compte le contexte du temps et la fatigue humaine et matérielle. La décomposition Sinus/Cosinus, très prisée en IA, permet de faire comprendre à la machine la notion de cycle, par exemple que 23h et 1h du matin sont deux heures extrêmement proches chronologiquement parlant, malgré la différence des chiffres.
*   **Groupe E : Singularité de l'Axe** (`axe_encoded`)
    *   *Utilité :* Spécifie physiquement où se trouve le travail. Chaque axe a son âge et sa propre mécanique.

---

### 3. Le Pipeline d'Apprentissage (Étape par Étape)
Voici le parcours des données, de leur chargement jusqu'à la création de l'IA (tel que défini dans le fichier `model.py`) :

1.  **Chargement & Vérification Intégrité :** On lit les données, s'assure qu'il n'y ait pas de trou cognitif (Valeurs Manquantes/NaN).
2.  **Séparation Strictement Temporelle (70% / 15% / 15%) :** C'est une obligation académique et industrielle. On n'a pas le droit de mélanger les données aléatoirement. L'IA s'entraîne sur Janvier-Septembre, cale ses paramètres sur Octobre, et passe son test final sans l'aide du professeur sur Novembre-Décembre. On ne lit jamais l'avenir pour prédire le passé.
3.  **Équilibrage Artificiel (SMOTE) :** Fort heureusement, notre dataset possède plus de jours "Sains" (67.8%) que de jours avec "Anomalies" (32.2%). L'inconvénient est qu'un modèle aura tendance à tout déclarer "Sain". SMOTE fabrique artificiellement des jours en pannes supplémentaires durant de l'entraînement pour que le modèle reconnaisse parfaitement leurs empreintes.
4.  **Entraînement multi-Modèle et Cross-Validation :** Le système lance une bataille entre divers types d'IAs :
    *   *Non supervisé (Isolation Forest)* : Il cherche simplement les points isolés qui ne s'emboîtent pas dans le fonctionnement normal d'un port.
    *   *Supervisés (Random Forest, XGBoost, SVM...)* : Intelligences complexes. On les entraîne par "TimeSeriesSplit", en coupant le temps en 5 sous-phases pour s'assurer que l'IA fonctionne au printemps autant qu'en été.
5.  **Test McNemar & Sélection Guidée au F1-Score :** On ne choisit pas le modèle juste pour avoir le meilleur score global. On le choisit pour son score **"F1" et son "Recall"**. Dans l'OCP, un *Faux Positif* (Fausse alerte) coûte un léger délai sur un plan. Mais un *Faux Négatif* (Le modèle dit "Tout va bien" alors qu'une courroie casse en plein chargement) est fatal. On privilégie donc un modèle qui ne manque jamais une alerte. Le test de test de McNemar vérifie que la victoire entre les modèles n'est pas due à de la chance.
6.  **Interprétabilité (Explainer SHAP) :** Pour un opérateur du port, se faire dire juste "Axe en Panne" est frustrant. SHAP retourne la boîte noire de l'IA pour l'expliciter : *"Je prédis une panne à 85% CAR le taux de disponibilité a décliné drastiquement et que la pente des arrêts sur 3j est anormalement haute"*.

---

### 4. Comment Intégrer et Lier ça dans le Projet "AI LOADING PLANNER"
La finalité est de fusionner l'IA avec le module de planification (le planificateur/Gantt vu précédemment).

**Où impliquer le modèle lors de son démarrage (Dans Streamlit / Python) :**
*   L'IA, à la fin de `model.py`, exporte le cerveau sous forme de fichier : `best_model_XXX.pkl` et `scaler.pkl`.
*   Le "Planner" importe ce `.pkl` en Python au lancement du serveur et le garde en mémoire vive.

**Le Workflow Pratique (Comment l'application tourne) :**
1.  **Actualisation des Signaux :** Chaque jour (ou à chaque re-planification), le tableau de bord Streamlit rassemble les dernières métriques en direct du module SCADA/GMAO de Jorf Lasfar (derniers temps de panne, pannes des 7 derniers jours).
2.  **Passage par le Scaler puis par l'IA :** Les données d'aujourd'hui sont transformées via le `scaler.pkl` et envoyées au `best_model_XXX.pkl`, qui crache une probabilité pour demain :  `[Axe 1: 5%, Axe 2: 12%, Axe 3: 88%, ...]`. 
3.  **Implémentation dans la Programmation MILP (Ou l'heuristique de l'interface Gantt) :**
    *   *Scénario Vert (Sûr) :* Axe 1 (5% de risque). Le Plannificateur Automatique (module mathématique d'allocation) va attribuer sans crainte les gros navires (CapeSize, Panamax) sur l'Axe 1 pour un fort rendement continu.
    *   *Scénario Rouge (Alerte d'Anomalie) :* Axe 3 (88% de risque de panne). Le système va déclencher deux mécanismes : 
        *   **(A)** Le Planner **refusera** l'allocation sur l'Axe 3 ou bien proposera de **créer automatiquement un "Marge de Sécurité Opérationnelle (Safety Buffer)"** autour de l'axe sur le diagramme de Gantt afin d'encaisser le choc si elle s'arrête.
        *   **(B)** Il affichera un pop-up d'alerte rouge sur le coté de l'interface. Grâce à SHAP, il listera à l'ingénieur à l'écran : "Forte probabilité de panne due aux micro-arrêts d'hier". L'opérateur peut alors ordonner une maintenance ciblée de l'axe, remplaçant la surprise coûteuse par un arrêt planifié.

**En Résumé pour votre PFE :** Votre planificateur de port n'est plus "aveugle". Il alloue les navires non plus seulement sur une base de rapidité théorique, mais il inclut une météo d'éventuelles pannes basée sur le Machine Learning de ce Module 2. C’est la définition d’un **Port Connecté et Intelligent**.
