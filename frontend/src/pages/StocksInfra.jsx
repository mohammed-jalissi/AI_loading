import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function StocksInfra({ dataMode = 'LOCAL' }) {
  const [stocks, setStocks] = useState(null);
  const [axes, setAxes] = useState(null);
  const [pathResult, setPathResult] = useState(null);
  const [pathSource, setPathSource] = useState('JFO');
  const [pathTarget, setPathTarget] = useState('Quai 1N');
  
  // States for manual replenishment
  const [addHall, setAddHall] = useState('JFC1HE05');
  const [addQual, setAddQual] = useState('DAP STANDARD');
  const [addQty, setAddQty] = useState(5000);

  useEffect(() => {
    api.getStocks(dataMode).then(setStocks);
    api.getAxes().then(setAxes);
  }, [dataMode]);

  const findPath = async () => {
    try {
      const res = await api.getNetworkPath(pathSource, pathTarget);
      setPathResult(res);
    } catch { setPathResult({ found: false, error: 'Erreur réseau' }); }
  };

  const handleAddStock = async () => {
    try {
      await api.addStock({ hall: addHall, qualite: addQual, quantite: parseInt(addQty) });
      const newStocks = await api.getStocks();
      setStocks(newStocks);
    } catch (e) {
      alert('Erreur lors de l\'ajout du stock : ' + e.message);
    }
  };

  const HALL_COLORS = {
    JFO: '#8b5cf6', JFD: '#6366f1', JFT: '#ec4899', JFQ: '#f97316', JFF: '#14b8a6',
    '107E': '#06b6d4', '107D': '#3b82f6', '107F': '#6366f1',
    HE01: '#34d399', HE02: '#10b981', HE03: '#f59e0b', HE04: '#ef4444',
    HE05: '#8b5cf6', HE06: '#6366f1', '18A': '#ec4899', '18B': '#f97316', '18C': '#14b8a6',
  };

  return (
    <div className="page-content">
      <h2 style={{ fontSize: 16, color: 'var(--accent-yellow)', marginBottom: 16 }}>STOCKS_INFRA // INFRASTRUCTURE_MAP</h2>

      {/* Manual Stock Replenishment */}
      <h3 style={{ fontSize: 13, color: 'var(--accent-blue)', marginBottom: 10 }}>MANUAL_REPLENISHMENT</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--bg-card)', padding: 12, borderRadius: 6, border: '1px solid var(--border)', alignItems: 'center' }}>
        <input className="kinetic-input" style={{ maxWidth: 150 }} value={addHall} onChange={e => setAddHall(e.target.value)} placeholder="Hall (ex: JFC1HE05)" />
        <input className="kinetic-input" style={{ maxWidth: 180 }} value={addQual} onChange={e => setAddQual(e.target.value)} placeholder="Qualité (ex: DAP STANDARD)" />
        <input className="kinetic-input" type="number" style={{ maxWidth: 120 }} value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="Quantité (T)" />
        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={handleAddStock}>+ ADD STOCK</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 24 }}>
        {stocks && Object.entries(stocks).map(([hall, products]) => {
          const total = Object.values(products).reduce((s, v) => s + v, 0);
          return (
            <div key={hall} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: HALL_COLORS[hall] || 'var(--text-secondary)' }}>{hall}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{total.toLocaleString()} T</span>
              </div>
              {Object.entries(products).map(([qual, qty]) => (
                <div key={qual} style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-secondary)', marginBottom: 2 }}>
                    <span>{qual}</span><span>{qty.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-primary)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.min(qty / 500, 100)}%`, background: HALL_COLORS[hall] || 'var(--text-muted)', borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Axes Status */}
      <h3 style={{ fontSize: 13, color: 'var(--accent-yellow)', marginBottom: 10 }}>CONVEYOR_AXES</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 24 }}>
        {axes && Object.entries(axes).map(([axe, info]) => (
          <div key={axe} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 4 }}>{axe}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>CADENCE: {info.cadence} T/h</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{info.halls?.join(', ')}</div>
          </div>
        ))}
      </div>

      {/* Network Path */}
      <h3 style={{ fontSize: 13, color: 'var(--accent-yellow)', marginBottom: 10 }}>JPH_NETWORK_PATH</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="kinetic-input" style={{ maxWidth: 150 }} value={pathSource}
          onChange={e => setPathSource(e.target.value)} placeholder="Source" />
        <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>→</span>
        <input className="kinetic-input" style={{ maxWidth: 150 }} value={pathTarget}
          onChange={e => setPathTarget(e.target.value)} placeholder="Target" />
        <button className="btn-secondary" style={{ maxWidth: 120 }} onClick={findPath}>FIND_PATH</button>
      </div>

      {pathResult && (
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: 12 }}>
          {pathResult.found ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {(pathResult.nodes_detail || []).map((node, i) => {
                  const catColors = {
                    'Scraper/Hall': '#8b5cf6', 'Conveyor': '#334155', 'Screening': '#d97706',
                    'Gantry crane': '#2563eb', 'Quai': '#059669',
                  };
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        background: catColors[node.category] || '#475569', color: '#fff',
                        padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600
                      }}>{node.name}</span>
                      {i < (pathResult.nodes_detail || []).length - 1 && <span style={{ color: '#475569' }}>→</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                BOTTLENECK: {pathResult.bottleneck_capacity || '—'} T/h | EDGES: {pathResult.path?.length - 1 || 0}
              </div>
            </>
          ) : (
            <span style={{ color: '#ef4444', fontSize: 11 }}>PATH_NOT_FOUND</span>
          )}
        </div>
      )}
    </div>
  );
}
