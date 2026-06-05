import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Define styles for an academic and professional look
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Times-Roman',
    backgroundColor: '#ffffff',
  },
  header: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'right',
    marginBottom: 20,
    borderBottom: '1px solid #eeeeee',
    paddingBottom: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4b5563',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 10,
    borderBottom: '1px solid #d1d5db',
    paddingBottom: 4,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 10,
    marginBottom: 5,
  },
  text: {
    fontSize: 11,
    lineHeight: 1.5,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'justify',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    width: 15,
    fontSize: 11,
    color: '#374151',
  },
  listContent: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
    color: '#374151',
    textAlign: 'justify',
  },
  mathBox: {
    backgroundColor: '#f3f4f6',
    padding: 15,
    borderRadius: 4,
    marginVertical: 10,
    borderLeft: '4px solid #3b82f6',
  },
  mathText: {
    fontFamily: 'Times-Roman',
    fontSize: 13,
    textAlign: 'center',
    color: '#111827',
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 10,
    marginBottom: 10,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '20%',
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderBottomColor: '#000',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f9fafb',
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColDescHeader: {
    width: '80%',
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderBottomColor: '#000',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f9fafb',
  },
  tableColDesc: {
    width: '80%',
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCellHeader: {
    margin: 5,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableCell: {
    margin: 5,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '1px solid #eeeeee',
    paddingTop: 5,
  }
});

const constraints = [
  { id: 'C1', title: 'Unicité Quai', desc: 'Garantit qu\'un poste d\'accostage ne reçoit qu\'un seul navire à la fois pour éviter les collisions physiques.' },
  { id: 'C2', title: 'Capacité Axe', desc: 'Le flux horaire (T/h) est bridé par la cadence nominale du convoyeur (ex: 900T/h pour TB1).' },
  { id: 'C3', title: 'Disponibilité Axe', desc: 'Un axe est verrouillé jusqu\'à la fin complète du lot pour éviter les mélanges de produits.' },
  { id: 'C4', title: 'Disponibilité Quai', desc: 'Le quai n\'est libéré qu\'après les procédures administratives et physiques (CTE/FC).' },
  { id: 'C5', title: 'Respect Arrivée', desc: 'L\'heure d\'accostage (tau_acc) doit être supérieure ou égale à l\'ETA (Estimated Time of Arrival).' },
  { id: 'C6', title: 'Horizon Temporel', desc: 'Tous les événements de planification sont contraints dans l\'intervalle discret [0, T].' },
  { id: 'C7', title: 'Compatibilité Qualité-Hall', desc: 'Mapping strict entre le type de produit (DAP, MAP, TSP) et les cellules de stockage.' },
  { id: 'C8', title: 'Bilan Matière', desc: 'L\'inventaire du Hall est décrémenté dynamiquement en fonction du tonnage extrait (f_t).' },
  { id: 'C9', title: 'Non-Négativité Stock', desc: 'Le niveau de stock physique ne peut jamais être inférieur à zéro.' },
  { id: 'C10', title: 'Priorité Relative', desc: 'Pondération des variables de décision selon l\'importance du navire (P1 > P2 > P3).' },
  { id: 'C11', title: 'Séquencement Lots', desc: 'Les lots d\'un même navire doivent être chargés l\'un après l\'autre sans chevauchement.' },
  { id: 'C12', title: 'Sécurité Environnementale', desc: 'Pénalisation lourde des chargements en période de fort risque météorologique.' },
  { id: 'C13', title: 'Tirant d\'Eau', desc: 'Le tonnage cumulé par lot ne peut excéder la capacité déclarée.' },
  { id: 'C14', title: 'Continuité Chargement', desc: 'L\'algorithme favorise un flux continu pour minimiser les arrêts/redémarrages coûteux.' },
  { id: 'C15', title: 'Unicité Hall par Lot', desc: 'Pendant un lot donné, le système interdit le changement de hall source.' },
  { id: 'C16', title: 'Unicité Axe par Lot', desc: 'Un lot est acheminé par une route unique (un seul axe à la fois).' },
  { id: 'C17', title: 'Finition Inter-lots', desc: 'Pause incompressible de 1h entre deux lots pour le repli et la mise en place.' },
  { id: 'C18', title: 'CTE + FC', desc: 'Fenêtre de 2h après le dernier lot pour le Contrôle Technique et les Formalités de Congé.' },
  { id: 'C19', title: 'Déhalage Nocturne', desc: 'Fenêtre d\'accostage restreinte à [00h-06h] pour les navires de fort tonnage.' },
  { id: 'C20', title: 'Continuité Quai', desc: 'Le navire occupe physiquement le quai de son accostage jusqu\'à sa libération finale.' },
];

export const MilpPdfDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>AI Loading Planner - Jorf Phosphate Hub</Text>
      
      <Text style={styles.title}>Modélisation Mathématique MILP</Text>
      <Text style={styles.subtitle}>Spécifications du Système de Planification Portuaire</Text>
      
      {/* 1. Topologie Physique Modélisée */}
      <Text style={styles.sectionTitle}>1. Topologie Physique Modélisée (JPH)</Text>
      <Text style={styles.text}>
        L'environnement de chargement est modélisé sous la forme d'un réseau bipartite reliant les ressources de stockage (Halls) aux points de demande (Navires à Quai), via un réseau complexe de convoyeurs (Axes U) et de portiques (Axes P).
      </Text>
      
      <Text style={styles.subSectionTitle}>Axes U (Convoyeurs Principaux)</Text>
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.listContent}>Axe 1, Axe 2 (500 T/h) : Dédiés aux Halls JLN (HE01-06, 18A-C).</Text>
      </View>
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.listContent}>Axe 3 (900 T/h) : Dédié aux Halls JLN (HE01-06, 18A-C).</Text>
      </View>
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.listContent}>TB1, TB2, TB3 (900 T/h) : Dédiés aux Halls JLS (JFO, JFD, JFT, JFQ, JFF, 107E, 107D, 107F).</Text>
      </View>

      <Text style={styles.subSectionTitle}>Axes P & Quais</Text>
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.listContent}>Quai 1N : Alimenté par les portiques G1, G2.</Text>
      </View>
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.listContent}>Quais 1Bis, 1Ter : Alimentés par les portiques G3, G4.</Text>
      </View>
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.listContent}>Quais 2N, 2Bis, 2Ter : Alimentés par les grues GH14, GH13, GH4, GH3.</Text>
      </View>

      {/* 2. Variables de Décision */}
      <Text style={styles.sectionTitle}>2. Variables de Décision</Text>
      <Text style={styles.text}>
        Le modèle repose sur des variables binaires et continues pour orchestrer les affectations spatiales et temporelles.
      </Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Variable</Text></View>
          <View style={styles.tableColDescHeader}><Text style={styles.tableCellHeader}>Description</Text></View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}><Text style={styles.tableCell}>x(i, j, t) ∈ {'{0,1}'}</Text></View>
          <View style={styles.tableColDesc}><Text style={styles.tableCell}>Vaut 1 si le navire i accoste au quai j à l'instant t, 0 sinon.</Text></View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}><Text style={styles.tableCell}>y(i, l, a, h, t) ∈ {'{0,1}'}</Text></View>
          <View style={styles.tableColDesc}><Text style={styles.tableCell}>Vaut 1 si le lot l du navire i utilise l'axe a depuis le hall h à l'instant t.</Text></View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}><Text style={styles.tableCell}>z(i, l, t) ∈ {'{0,1}'}</Text></View>
          <View style={styles.tableColDesc}><Text style={styles.tableCell}>Vaut 1 si le chargement physique du lot l du navire i est actif à t.</Text></View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}><Text style={styles.tableCell}>f(i, l, a, h, t) ≥ 0</Text></View>
          <View style={styles.tableColDesc}><Text style={styles.tableCell}>Quantité continue (Tonnes) chargée pour le lot l du navire i via l'axe a depuis le hall h à l'instant t.</Text></View>
        </View>
        <View style={styles.tableRow}>
          <View style={styles.tableCol}><Text style={styles.tableCell}>S(h, t) ≥ 0</Text></View>
          <View style={styles.tableColDesc}><Text style={styles.tableCell}>Niveau de stock physique du hall h à l'instant t.</Text></View>
        </View>
      </View>

      {/* 3. Fonction Objectif */}
      <Text style={styles.sectionTitle}>3. Fonction Objectif (Z)</Text>
      <Text style={styles.text}>
        L'objectif global est de maximiser la productivité pondérée tout en pénalisant drastiquement les retards et l'exposition aux risques (météorologiques et pannes machines).
      </Text>
      <View style={styles.mathBox}>
        <Text style={styles.mathText}>
          Max(Z) = Σ(w_i × T_i) − λ × Σ(Attente_i) − γ × Σ(RisqueML) − ρ × Σ(RisqueMeteo) − 0.5 × Σ(Accostages)
        </Text>
      </View>
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.listContent}><Text style={{fontWeight: 'bold'}}>Productivité (w_i × T_i) :</Text> Maximisation du tonnage chargé pondéré par la priorité commerciale du navire.</Text>
      </View>
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.listContent}><Text style={{fontWeight: 'bold'}}>Pénalité d'Attente (λ) :</Text> Minimisation du temps de rade et des temps morts entre les lots.</Text>
      </View>
      <View style={styles.listItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.listContent}><Text style={{fontWeight: 'bold'}}>Résilience ML (γ, ρ) :</Text> Intégration probabiliste minimisant l'usage d'axes à forte probabilité de panne ou de créneaux avec vents forts.</Text>
      </View>
      
      <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
        `Page ${pageNumber} / ${totalPages}`
      )} fixed />
    </Page>

    {/* Constraints Page */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>AI Loading Planner - Jorf Phosphate Hub</Text>
      <Text style={styles.sectionTitle}>4. Inventaire des Contraintes du Modèle</Text>
      <Text style={styles.text}>
        Afin de garantir la faisabilité opérationnelle du planning généré, le modèle respecte rigoureusement l'ensemble des contraintes suivantes :
      </Text>
      
      <View style={{ marginTop: 10 }}>
        {constraints.map((c, index) => (
          <View key={index} style={{ marginBottom: 8, flexDirection: 'row' }}>
            <Text style={{ width: 35, fontSize: 11, fontWeight: 'bold', color: '#1f2937' }}>{c.id}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#374151', marginBottom: 2 }}>{c.title}</Text>
              <Text style={{ fontSize: 10, color: '#4b5563', lineHeight: 1.4, textAlign: 'justify' }}>{c.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
        `Page ${pageNumber} / ${totalPages}`
      )} fixed />
    </Page>
  </Document>
);
