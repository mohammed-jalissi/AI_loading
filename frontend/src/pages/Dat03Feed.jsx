/**
 * Dat03Feed.jsx — Section dédiée à l'ingestion des datasets analytiques DAT-03
 * 3 workflows: Base Arrêts 2025 | KPI Axes 2025 | Base Export 2025
 * Supabase upsert + anti-doublons + nettoyage Pandas côté backend
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import './Dat03Feed.css';

const API = 'http://localhost:8000/api';

// ── Définition des 3 datasets ───────────────────────────────────────────────
const DATASETS = [
  {
    id: 'arrets',
    icon: '🔧',
    title: 'Base des Arrêts 2025',
    table: 'arrets_2025',
    endpoint: '/dat03/upload_arrets',
    statKey: 'arrets',
    color: '#14b8a6',
    description: 'Historique complet des arrêts de production par axe',
    accept: '.xlsx,.xls',
    schema: [
      { col: 'date', type: 'DATE', req: true },
      { col: 'poste', type: 'INT', req: false },
      { col: 'hall', type: 'TEXT', req: false },
      { col: 'axe', type: 'TEXT', req: true },
      { col: 'début', type: 'TIME', req: true },
      { col: 'fin', type: 'TIME', req: false },
      { col: 'durée h:mm', type: 'TEXT', req: false },
      { col: 'durée', type: 'FLOAT', req: false },
      { col: 'cause', type: 'TEXT', req: false },
      { col: 'nature', type: 'TEXT', req: false },
      { col: 'navire', type: 'TEXT', req: false },
      { col: 'sous-qualité', type: 'TEXT', req: false },
      { col: 'qualité', type: 'TEXT', req: false },
      { col: 'quai', type: 'TEXT', req: false },
      { col: 'niveau1/2/3', type: 'TEXT', req: false },
      { col: 'day/week/month', type: 'INT', req: false },
    ],
    hashKey: 'Date + Axe + Début + Fin',
  },
  {
    id: 'trg',
    icon: '📊',
    title: 'TRG par axe 2025',
    table: 'trg_axes_2025',
    endpoint: '/dat03/upload_trg_axes',
    statKey: 'trg',
    color: '#0ea5e9',
    description: 'TRG hebdomadaire par axe et tonnage total chargé',
    accept: '.xlsx,.xls',
    schema: [
      { col: 'Date', type: 'DATE', req: true },
      { col: 'Semaine', type: 'INT', req: true },
      { col: 'Axe 1 à 6', type: 'FLOAT', req: false },
      { col: 'TOTAL Chargé', type: 'FLOAT', req: false },
    ],
    hashKey: 'Date + Semaine',
  },
  {
    id: 'export',
    icon: '🚢',
    title: 'Base Export 2025',
    table: 'export_2025',
    endpoint: '/dat03/upload_export',
    statKey: 'export',
    color: '#a78bfa',
    description: 'Données de chargement et d\'export des navires 2025',
    accept: '.xlsx,.xls',
    schema: [
      { col: 'Navires', type: 'TEXT', req: true },
      { col: 'Date BL', type: 'DATE', req: true },
      { col: 'Tonnage B/L', type: 'FLOAT', req: false },
      { col: 'Tonnage total bl', type: 'FLOAT', req: false },
      { col: 'Facturation', type: 'TEXT', req: false },
      { col: 'Famille de qualité', type: 'TEXT', req: false },
      { col: 'Qualité', type: 'TEXT', req: false },
      { col: 'Incoterm', type: 'TEXT', req: false },
      { col: 'P/U S', type: 'FLOAT', req: false },
      { col: 'VALEUR $', type: 'FLOAT', req: false },
      { col: 'REGION / DESTINATION', type: 'TEXT', req: false },
      { col: 'LOA / Type navire', type: 'TEXT', req: false },
      { col: 'Quai', type: 'TEXT', req: false },
    ],
    hashKey: 'Navire + Date BL + Qualité + Tonnage',
  },
];

// ── Composant DatasetCard ───────────────────────────────────────────────────
function DatasetCard({ dataset, dbCount, onRefresh }) {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [state, setState] = useState('idle'); // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const fileRef = useRef(null);
  const logEndRef = useRef(null);

  const addLog = useCallback((type, text) => {
    setLogs(prev => [...prev, { type, text, ts: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      addLog('err', `Format non supporté: .${ext}. Veuillez fournir un fichier Excel (.xlsx)`);
      return;
    }
    setFile(f);
    setLogs([]);
    setResult(null);
    setState('idle');
    addLog('info', `Fichier sélectionné: ${f.name} (${(f.size / 1024).toFixed(1)} Ko)`);
  };

  const handleUpload = async () => {
    if (!file) return;
    setState('uploading');
    setProgress(10);
    addLog('info', `Démarrage de l'ingestion pour "${dataset.title}"…`);
    addLog('info', 'Envoi vers le serveur FastAPI…');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setProgress(30);
      addLog('info', 'Lecture Excel & nettoyage Pandas (colonnes vides filtrées)…');

      const res = await fetch(`${API}${dataset.endpoint}`, {
        method: 'POST',
        body: formData,
      });

      setProgress(75);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Erreur serveur');
      }

      setProgress(100);
      setState('done');
      setResult(data);

      addLog('ok', data.message || 'Ingestion réussie');
      if (data.colonnes_detectees) {
        const cols = Object.keys(data.colonnes_detectees).length;
        addLog('info', `${cols} colonnes détectées automatiquement`);
      }
      if (data.skipped > 0) {
        addLog('warn', `${data.skipped} lignes ignorées (champs obligatoires vides)`);
      }
      if (data.axes_traites) {
        addLog('info', `Axes traités: ${data.axes_traites.join(', ')}`);
      }
      addLog('ok', `✓ Anti-doublons actif — clé: ${dataset.hashKey}`);

      onRefresh();
    } catch (e) {
      setProgress(100);
      setState('error');
      addLog('err', e.message);
    }
  };

  const reset = () => {
    setFile(null);
    setLogs([]);
    setResult(null);
    setState('idle');
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const progressColor = state === 'done' ? 'done' : state === 'error' ? 'error' : '';
  const cardClass = `dat03-card ${state === 'uploading' ? 'uploading' : ''} ${state === 'done' ? 'done' : ''} ${state === 'error' ? 'error-state' : ''}`;

  return (
    <div className={cardClass}>
      {/* Header */}
      <div className="dat03-card-header">
        <span className="dat03-card-icon">{dataset.icon}</span>
        <div className="dat03-card-meta">
          <div className="dat03-card-title">{dataset.title}</div>
          <div className="dat03-card-table" style={{ color: dataset.color }}>
            supabase → {dataset.table}
          </div>
          <div style={{ fontSize: 9, color: '#334155', marginTop: 3 }}>{dataset.description}</div>
        </div>
        <div className="dat03-count">
          <div className="dat03-count-value" style={{ color: dataset.color }}>
            {dbCount?.toLocaleString() ?? '—'}
          </div>
          <div className="dat03-count-label">en base</div>
        </div>
      </div>

      {/* Schema toggle */}
      <button className="dat03-schema-toggle" onClick={() => setSchemaOpen(p => !p)}>
        <span style={{ color: dataset.color }}>⊞</span>
        {schemaOpen ? '▴' : '▾'} COLONNES ATTENDUES ({dataset.schema.length})
      </button>
      <div className={`dat03-schema ${schemaOpen ? 'open' : ''}`}>
        <table className="dat03-schema-table">
          <thead>
            <tr><th>Colonne</th><th>Type</th><th>Obligatoire</th></tr>
          </thead>
          <tbody>
            {dataset.schema.map((s, i) => (
              <tr key={i}>
                <td style={{ color: dataset.color }}>{s.col}</td>
                <td>{s.type}</td>
                <td style={{ color: s.req ? '#4ade80' : '#334155' }}>{s.req ? '●' : '○'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload zone */}
      {state !== 'done' && (
        <div
          className={`dat03-upload-zone ${drag ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept={dataset.accept}
            hidden
            onChange={e => handleFile(e.target.files[0])}
          />
          <div className="dat03-upload-icon">{file ? '📄' : '⬆'}</div>
          {file ? (
            <>
              <div className="dat03-upload-text" style={{ color: '#4ade80' }}>{file.name}</div>
              <div className="dat03-upload-hint">{(file.size / 1024).toFixed(1)} Ko · Prêt pour l'ingestion</div>
            </>
          ) : (
            <>
              <div className="dat03-upload-text">Déposez votre fichier Excel ici</div>
              <div className="dat03-upload-hint">ou cliquez pour parcourir · {dataset.accept}</div>
            </>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {(state === 'uploading' || state === 'done' || state === 'error') && (
        <div className="dat03-progress-wrap">
          <div className="dat03-progress-bar-track">
            <div
              className={`dat03-progress-bar-fill ${progressColor}`}
              style={{ width: `${progress}%`, background: state === 'done' ? undefined : state === 'error' ? undefined : `linear-gradient(90deg, ${dataset.color}90, ${dataset.color})` }}
            />
          </div>
          <div className="dat03-progress-label">
            {state === 'uploading' && '⟳ Traitement en cours…'}
            {state === 'done' && `✓ Terminé — ${result?.inserted ?? 0} lignes insérées`}
            {state === 'error' && '✗ Erreur d\'ingestion'}
          </div>
        </div>
      )}

      {/* Anti-doublon badge */}
      <div className="dat03-doublon-badge" style={{ borderColor: `${dataset.color}30`, background: `${dataset.color}08`, color: dataset.color }}>
        <span>🔒</span>
        <span>Anti-doublon actif — Clé composite: <strong>{dataset.hashKey}</strong></span>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="dat03-log-panel">
          {logs.map((l, i) => (
            <div key={i} className={`dat03-log-entry ${l.type}`}>
              <span className="dat03-log-tag">
                {l.type === 'ok' ? 'OK' : l.type === 'err' ? 'ERR' : l.type === 'warn' ? 'WRN' : 'INF'}
              </span>
              <span className="dat03-log-text">[{l.ts}] {l.text}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}

      {/* Result Stats */}
      {result && state === 'done' && (
        <div className="dat03-result-stats">
          <div className="dat03-result-stat">
            <div className="dat03-result-stat-val green">{result.inserted?.toLocaleString() ?? 0}</div>
            <div className="dat03-result-stat-label">Insérés</div>
          </div>
          <div className="dat03-result-stat">
            <div className="dat03-result-stat-val blue">{result.total_lignes?.toLocaleString() ?? result.total_records?.toLocaleString() ?? 0}</div>
            <div className="dat03-result-stat-label">Total</div>
          </div>
          <div className="dat03-result-stat">
            <div className="dat03-result-stat-val orange">{result.skipped?.toLocaleString() ?? 0}</div>
            <div className="dat03-result-stat-label">Ignorés</div>
          </div>
        </div>
      )}

      {/* KPI axes traités */}
      {result?.axes_traites && (
        <div style={{ margin: '0 18px 10px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {result.axes_traites.map(a => (
            <span key={a} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: '#0ea5e920', border: '1px solid #0ea5e940', color: '#38bdf8' }}>{a}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <button
        className="dat03-upload-btn primary"
        onClick={state === 'done' ? reset : handleUpload}
        disabled={!file && state === 'idle'}
        style={{ '--card-color': dataset.color }}
      >
        {state === 'uploading' && <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Ingestion en cours…</>}
        {state === 'idle' && <><span>▶</span> Lancer l'ingestion</>}
        {state === 'done' && <><span>↺</span> Nouveau fichier</>}
        {state === 'error' && <><span>↺</span> Réessayer</>}
      </button>
    </div>
  );
}

// ── Page principale Dat03Feed ───────────────────────────────────────────────
export default function Dat03Feed() {
  const [stats, setStats] = useState({ arrets: 0, trg: 0, export: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [supaConnected, setSupaConnected] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/dat03/stats`);
      const data = await res.json();
      setStats(data);
      setSupaConnected(!data.error);
    } catch {
      setSupaConnected(false);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const totalRows = (stats.arrets ?? 0) + (stats.trg ?? 0) + (stats.export ?? 0);

  return (
    <div className="dat03-page">
      {/* ── Header ── */}
      <div className="dat03-header">
        <div className="dat03-title-group">
          <div className="dat03-agent-badge">
            <span className="dat03-agent-id">DAT-03</span>
            <span className="dat03-agent-status">
              <span className="dat03-status-dot" />
              {supaConnected === null ? 'INIT…' : supaConnected ? 'CONNECTÉ' : 'OFFLINE'}
            </span>
          </div>
          <div>
            <div className="dat03-title">Analytics Data Feed</div>
            <div className="dat03-subtitle">Pipeline d'ingestion des datasets historiques 2025 — OCP Jorf Lasfar</div>
          </div>
        </div>

        {/* Stats globales */}
        <div className="dat03-stats-bar">
          <div className="dat03-stat-pill">
            <div className="dat03-stat-value">{statsLoading ? '…' : totalRows.toLocaleString()}</div>
            <div className="dat03-stat-label">Total lignes</div>
          </div>
          <div className="dat03-stat-divider" />
          <div className="dat03-stat-pill">
            <div className="dat03-stat-value" style={{ color: '#14b8a6' }}>{statsLoading ? '…' : stats.arrets.toLocaleString()}</div>
            <div className="dat03-stat-label">Arrêts</div>
          </div>
          <div className="dat03-stat-divider" />
          <div className="dat03-stat-pill">
            <div className="dat03-stat-value" style={{ color: '#0ea5e9' }}>{statsLoading ? '…' : stats.trg.toLocaleString()}</div>
            <div className="dat03-stat-label">TRG</div>
          </div>
          <div className="dat03-stat-divider" />
          <div className="dat03-stat-pill">
            <div className="dat03-stat-value" style={{ color: '#a78bfa' }}>{statsLoading ? '…' : stats.export.toLocaleString()}</div>
            <div className="dat03-stat-label">Exports</div>
          </div>
          <div className="dat03-stat-divider" />
          <button
            onClick={fetchStats}
            style={{ background: 'transparent', border: '1px solid #1e3a4a', borderRadius: 6, padding: '4px 10px', color: '#475569', fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}
            title="Rafraîchir les statistiques"
          >
            ↺
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="dat03-body">
        {/* Supabase status */}
        {supaConnected === false && (
          <div style={{ marginBottom: 20, padding: '10px 16px', background: '#1a0a0a', border: '1px solid #ef444440', borderRadius: 8, fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>⚠</span>
            <span>Connexion Supabase indisponible. Vérifiez la configuration du backend (<code>db_config.py</code>).</span>
          </div>
        )}

        <div className="dat03-section-label">
          Workflows d'ingestion — 3 datasets indépendants
        </div>

        {/* Workflow Cards */}
        <div className="dat03-workflow-grid">
          {DATASETS.map((dataset) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              dbCount={stats[dataset.statKey]}
              onRefresh={fetchStats}
            />
          ))}
        </div>

        {/* Info Banner */}
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #0a1628, #051a18)',
          border: '1px solid #14b8a620',
          borderRadius: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24
        }}>
          <div>
            <div style={{ fontSize: 9, color: '#14b8a6', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>🔒 Anti-doublons</div>
            <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
              Chaque fichier est identifié par une <strong style={{ color: '#94a3b8' }}>clé composite MD5</strong> unique. 
              Si une ligne existe déjà, elle est ignorée. Aucun doublon possible.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#0ea5e9', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>🧹 Nettoyage Pandas</div>
            <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
              Les colonnes et lignes <strong style={{ color: '#94a3b8' }}>100% vides</strong> sont automatiquement supprimées. 
              Les valeurs NaN sont remplacées par NULL.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#a78bfa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>🤖 DAT-03</div>
            <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
              Une fois les données en base, l'agent <strong style={{ color: '#94a3b8' }}>DAT-03</strong> peut accéder à ces tables 
              pour générer des dashboards TRG, Pareto des arrêts et analyses d'export.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
