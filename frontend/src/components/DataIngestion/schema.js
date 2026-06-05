import { z } from 'zod';

export const NaviresSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  arrivee: z.number({ coerce: true }),
  priorite: z.number({ coerce: true }),
  laytime: z.number({ coerce: true }).optional().nullable(),
  demurrage_rate: z.number({ coerce: true }).optional().nullable(),
});

export const LotsSchema = z.object({
  navire_nom: z.string().min(1, "Nom du navire requis"),
  qualite: z.string().min(1, "Qualité requise"),
  td: z.number({ coerce: true }),
  ordre_lot: z.number({ coerce: true }).optional().nullable(),
});

export const StocksSchema = z.object({
  hall: z.string().min(1, "Hall requis"),
  qualite: z.string().min(1, "Qualité requise"),
  quantite: z.number({ coerce: true }),
});

export const ArretsSchema = z.object({
  equipement_nom: z.string().min(1, "Equipement requis"),
  type_anomalie: z.string().min(1, "Type d'anomalie requis"),
  gravite: z.string().min(1, "Gravité requise"),
  probabilite: z.number({ coerce: true }).optional().nullable(),
});

export const MeteoSchema = z.object({
  datetime: z.string().min(1, "Date requise"),
  temp: z.number({ coerce: true }),
  vent_kmh: z.number({ coerce: true }),
  pluie_mm: z.number({ coerce: true }),
  description: z.string().optional().nullable(),
});

export const HistoriqueArretsSchema = z.object({
  date: z.string().min(1, "Date requise"),
  axe: z.string().min(1, "Axe requis"),
  debut: z.string().min(1, "Début requis"),
});

export const KpiHebdoSchema = z.object({
  semaine: z.number({ coerce: true }),
  axe_nom: z.string().min(1, "Axe requis"),
  trg: z.number({ coerce: true }),
});


export const ENTITIES = [
  {
    id: 'navires',
    name: 'Navires Input',
    tbl: 'navires',
    schema: NaviresSchema,
    fields: [
      { n: 'nom', t: 'TEXT', r: true },
      { n: 'arrivee', t: 'INT', r: true },
      { n: 'priorite', t: 'INT', r: true },
      { n: 'laytime', t: 'NUMERIC', r: false },
      { n: 'demurrage_rate', t: 'NUMERIC', r: false }
    ],
    tpl: [['nom', 'arrivee', 'priorite', 'laytime', 'demurrage_rate'], ['SE NICKY', 0, 1, 48, 1200]]
  },
  {
    id: 'lots',
    name: 'Lots Input',
    tbl: 'lots',
    schema: LotsSchema,
    fields: [
      { n: 'navire_nom', t: 'TEXT', r: true },
      { n: 'qualite', t: 'TEXT', r: true },
      { n: 'td', t: 'NUMERIC', r: true },
      { n: 'ordre_lot', t: 'INT', r: false }
    ],
    tpl: [['navire_nom', 'qualite', 'td', 'ordre_lot'], ['SE NICKY', 'DAP SPECIAL DARK', 25080, 1]]
  },
  {
    id: 'stocks',
    name: 'Stocks Input',
    tbl: 'stocks',
    schema: StocksSchema,
    fields: [
      { n: 'hall', t: 'TEXT', r: true },
      { n: 'qualite', t: 'TEXT', r: true },
      { n: 'quantite', t: 'NUMERIC', r: true }
    ],
    tpl: [['hall', 'qualite', 'quantite'], ['JFC1HE05', 'MAP 11-52 SPC', 20000]]
  },
  {
    id: 'arrets',
    name: 'Arrêts Input',
    tbl: 'anomalies_historique',
    schema: ArretsSchema,
    fields: [
      { n: 'equipement_nom', t: 'TEXT', r: true },
      { n: 'type_anomalie', t: 'TEXT', r: true },
      { n: 'gravite', t: 'TEXT', r: true },
      { n: 'probabilite', t: 'NUMERIC', r: false }
    ],
    tpl: [['equipement_nom', 'type_anomalie', 'gravite', 'probabilite'], ['Axe1', 'Vibration anormale', 'MODEREE', 0.85]]
  },
  {
    id: 'meteo',
    name: 'Météo (API)',
    tbl: 'meteo_forecast',
    schema: MeteoSchema,
    fields: [
      { n: 'datetime', t: 'TEXT', r: true },
      { n: 'temp', t: 'NUMERIC', r: true },
      { n: 'vent_kmh', t: 'NUMERIC', r: true },
      { n: 'pluie_mm', t: 'NUMERIC', r: true },
      { n: 'description', t: 'TEXT', r: false }
    ],
    tpl: [['datetime', 'temp', 'vent_kmh', 'pluie_mm', 'description'], ['2026-05-23 10:00:00', 22.5, 15.2, 0.0, 'Ensoleillé']]
  },
  {
    id: 'historique_arrets',
    name: 'Historique Arrêts 2025 (Excel)',
    tbl: 'historique_arrets_2025',
    schema: HistoriqueArretsSchema,
    fields: [
      { n: 'date', t: 'TEXT', r: true },
      { n: 'axe', t: 'TEXT', r: true },
      { n: 'debut', t: 'TEXT', r: true }
    ],
    tpl: [['Date', 'Axe', 'Début'], ['2025-01-01', 'Axe1', '07:00:00']],
    upload_url: '/api/ingest/upload_historique',
    isExcel: true
  },
  {
    id: 'kpi_hebdo',
    name: 'KPI Hebdo 2025 (Excel)',
    tbl: 'kpi_hebdo_axes',
    schema: KpiHebdoSchema,
    fields: [
      { n: 'semaine', t: 'INT', r: true },
      { n: 'axe', t: 'TEXT', r: true },
      { n: 'trg', t: 'NUMERIC', r: true }
    ],
    tpl: [['Semaine', 'Axe', 'TRG'], [1, 'Axe1', 65.4]],
    upload_url: '/api/ingest/upload_kpi',
    isExcel: true
  }
];

export const KNOWN_HALLS = [
  "JFC1HE05", "JFC1HE06", "JFC2HE05", "JFC2HE06", "JFC3HE05", "JFC3HE06",
  "JFC4HE05", "JFC4HE06", "JFC5-3010", "JFC5-309", "HE03-107F",
  "18A", "18B", "18C", "HE01", "HE01Bis", "HE02", "HE02Bis", 
  "HE03", "HE03Bis", "HE04", "HE04Bis", "HE05", "HE06"
];

export const KNOWN_QUALITES = [
  "DAP EURO LOW CD", "DAP SPECIAL DARK", "DAP SPECIAL", "DAP SPC", "DAP STANDARD",
  "DAP TANZANIE", "DAP BANGLADESH", "MAP 11-52 SPC", "MAP 10-50 SPC",
  "MAP 11 52 Special Low Cd", "TSP CIV", "TSP LOW CD", "TSP SPECIAL JORF",
  "TSP Bangladesh", "NPS 13-37-15S", "NPS 12 45 5S IZN", "NPS 15 15 15 Low Cd"
];

export const generateTemplate = (entityId) => {
  const entity = ENTITIES.find(e => e.id === entityId);
  if (!entity) return null;
  const header = entity.tpl[0].join(',');
  const row = entity.tpl[1].join(',');
  return new Blob([`${header}\n${row}`], { type: 'text/csv' });
};
