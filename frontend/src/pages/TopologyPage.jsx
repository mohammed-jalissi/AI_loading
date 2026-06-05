import { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function TopologyPage() {
  const [infra, setInfra] = useState(null);

  useEffect(() => {
    api.getConfig().then(setInfra).catch(err => console.error("Failed to load infra config:", err));
  }, []);

  if (!infra) return (
    <div className="page-content">
      <div className="kinetic-loading">
        <div className="spinner"></div>
        <span>RECONSTRUCTING_TOPOLOGY...</span>
      </div>
    </div>
  );

  return (
    <div className="page-content kinetic-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, color: '#fbbf24', margin: 0 }}>TOPOLOGY_RECONSTRUCTION // INFRA_LOGIC</h2>
          <p style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Formalized organizational structure for Jorf Lasfar Nord & Sud</p>
        </div>
        <div style={{ fontSize: 10, background: '#1e293b', padding: '4px 10px', borderRadius: 4, color: '#9ca3af', border: '1px solid #334155' }}>
          V4.0 // STABLE
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        
        {/* Left Column: Jorf Lasfar Nord (JLN) */}
        <div className="card-kinetic">
          <h3 style={{ fontSize: 14, color: '#fbbf24', marginBottom: 15, borderBottom: '1px solid #1e293b', paddingBottom: 5 }}>
            JORF_LASFAR_NORD (JLN)
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(infra.halls_jln || []).map(hall => (
              <div key={hall} className="topology-node hall-node">
                <span className="node-icon">🏢</span>
                {hall}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: '#6b7280', marginTop: 15, fontStyle: 'italic' }}>
            Hierarchy: entities → halls → scrapers → conveyor systems (Axe 1, 2, 3)
          </p>
        </div>

        {/* Right Column: Jorf Lasfar Sud (JLS) */}
        <div className="card-kinetic">
          <h3 style={{ fontSize: 14, color: '#fbbf24', marginBottom: 15, borderBottom: '1px solid #1e293b', paddingBottom: 5 }}>
            JORF_LASFAR_SUD (JLS)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {Object.entries(infra.halls_jls || {}).map(([entity, halls]) => (
              <div key={entity} className="topology-entity-card">
                <div className="entity-header">{entity}</div>
                <div className="entity-body">
                  {halls.map(h => (
                    <div key={h} className="entity-hall">
                      <span style={{ color: '#8b5cf6', marginRight: 4 }}>•</span>{h}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Width: Quai Topology Mapping */}
        <div className="card-kinetic" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: 14, color: '#fbbf24', marginBottom: 15, borderBottom: '1px solid #1e293b', paddingBottom: 5 }}>
            QUAI_MAPPING // AXE_P & PORTIQUES (RECEPTION_LOGIC)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
            {infra.quais.map(q => (
              <div key={q} className="quai-top-card">
                <div className="quai-id">{q}</div>
                
                <div className="quai-section">
                  <div className="section-label">AXE_P</div>
                  <div className="section-values">
                    {(infra.axes_p?.[q] || []).map(ap => (
                      <span key={ap} className="badge-axe-p">{ap}</span>
                    ))}
                  </div>
                </div>

                <div className="quai-section">
                  <div className="section-label">PORTIQUE</div>
                  <div className="section-values">
                    {(infra.portiques?.[q] || []).map(p => (
                      <span key={p} className="badge-portique">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Width: Conveyor Axes (U) */}
        <div className="card-kinetic" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: 14, color: '#fbbf24', marginBottom: 15, borderBottom: '1px solid #1e293b', paddingBottom: 5 }}>
            CONVEYOR_AXES (U) // REACHABILITY_MATRIX
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="topology-table">
              <thead>
                <tr>
                  <th>AXE_ID</th>
                  <th>NOMINAL_CADENCE</th>
                  <th>REACHABLE_HALLS</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(infra.axes || {}).map(([axe, info]) => (
                  <tr key={axe}>
                    <td className="axe-name">{axe}</td>
                    <td className="axe-cadence">{info.cadence} T/h</td>
                    <td className="axe-halls">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {info.halls.map(h => (
                          <span key={h} className="mini-hall-tag">{h}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .topology-node {
          background: #1e293b;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 11px;
          color: #e5e7eb;
          border: 1px solid #334155;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }
        .topology-node:hover {
          border-color: #fbbf24;
          background: #334155;
        }
        .node-icon { font-size: 12px; }
        
        .topology-entity-card {
          background: #111827;
          border-radius: 6px;
          border: 1px solid #1e293b;
          overflow: hidden;
        }
        .entity-header {
          background: #1e293b;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 700;
          color: #8b5cf6;
          border-bottom: 1px solid #1e293b;
        }
        .entity-body { padding: 8px; }
        .entity-hall { font-size: 10px; color: #9ca3af; margin-bottom: 2px; }
        
        .quai-top-card {
          background: #111827;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #1e293b;
          text-align: center;
          transition: transform 0.2s;
        }
        .quai-top-card:hover { transform: translateY(-2px); border-color: #3b82f6; }
        .quai-id { font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 12px; }
        
        .quai-section { margin-bottom: 12px; }
        .section-label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .section-values { display: flex; justifyContent: center; flex-wrap: wrap; gap: 4px; }
        
        .badge-axe-p { background: #1e3a8a; color: #93c5fd; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 600; }
        .badge-portique { background: #064e3b; color: #6ee7b7; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 600; }
        
        .topology-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .topology-table th { text-align: left; padding: 10px; color: #6b7280; font-size: 10px; text-transform: uppercase; }
        .topology-table td { padding: 10px; border-top: 1px solid #1e293b; vertical-align: middle; }
        .axe-name { color: #00ff41; font-weight: 700; font-size: 12px; }
        .axe-cadence { color: #9ca3af; font-size: 11px; }
        .mini-hall-tag { background: #1e293b; color: #9ca3af; padding: 1px 5px; border-radius: 3px; font-size: 9px; }
      `}} />
    </div>
  );
}
