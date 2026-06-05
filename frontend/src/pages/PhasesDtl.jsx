import { useState } from 'react';

const PHASE_COLORS = {
  ACC_PREP: '#FFD700', ATTENTE_QUAI: '#FFDEAD', ATTENTE_AXE: '#FFFFE0',
  REACCOSTAGE: '#FFD700', CHARGEMENT: '#90EE90', FINITION: '#FF8C00',
  CTE_FC: '#4169E1', ACHEVE: '#D0D0FF', RADE: '#FFB6C1',
  EPUISEMENT: '#FFA07A', EN_ATTENTE: '#FFFACD',
};

const PHASE_NAMES = {
  ACC_PREP: '⚓ Accostage', ATTENTE_QUAI: '⏳ Att. quai', ATTENTE_AXE: '⏳ Att. axe',
  REACCOSTAGE: '🔄 Ré-accos.', CHARGEMENT: '🟩 Chargement', FINITION: '🔶 Finition',
  CTE_FC: '✅ CTE/FC', ACHEVE: '🏁 Achevé', RADE: '↩ Rade',
  EPUISEMENT: '⚠️ Stock', EN_ATTENTE: '⏸ Météo',
};

export default function PhasesDtl({ data }) {
  const { all_lots = [] } = data || {};
  const [expanded, setExpanded] = useState({});

  const vesselNames = [...new Set(all_lots.map(s => s.navire))].sort();

  const toggle = (name) => setExpanded(e => ({ ...e, [name]: !e[name] }));

  return (
    <div className="page-content">
      <h2 style={{ fontSize: 16, color: '#fbbf24', marginBottom: 16 }}>PHASES_DTL // SEQUENCE_BY_VESSEL</h2>

      {vesselNames.map(navName => {
        const lots = all_lots.filter(s => s.navire === navName);
        const nOk = lots.filter(s => s.scheduled).length;
        const icon = nOk === lots.length ? '✅' : nOk > 0 ? '⚠️' : '❌';
        const tdTot = lots.reduce((s, l) => s + l.td, 0);
        const isOpen = expanded[navName] !== false && nOk > 0;

        return (
          <div key={navName} className="expander">
            <div className="expander-header" onClick={() => toggle(navName)}>
              <span>{icon} {navName} | QUAI {lots[0]?.quai || '—'} | {lots.length} lot(s) | {tdTot.toLocaleString()} T</span>
              <span style={{ color: '#6b7280' }}>{isOpen ? '▾' : '▸'}</span>
            </div>
            {isOpen && (
              <div className="expander-content">
                {lots.map((s, si) => {
                  // Extract phase spans
                  const tl = s.timeline || {};
                  const phases = [];
                  let curPh = null, phStart = 0;
                  const keys = Object.keys(tl).map(Number).sort((a, b) => a - b);
                  keys.forEach(h => {
                    const ph = tl[String(h)]?.status || 'IDLE';
                    if (ph !== curPh) {
                      if (curPh && curPh !== 'IDLE') phases.push({ ph: curPh, start: phStart, end: h });
                      curPh = ph;
                      phStart = h;
                    }
                  });
                  if (curPh && curPh !== 'IDLE') phases.push({ ph: curPh, start: phStart, end: keys[keys.length - 1] + 1 });

                  return (
                    <div key={si} style={{ marginBottom: 12 }}>
                      <div style={{ background: '#0A1A28', borderRadius: 6, padding: '6px 10px', marginBottom: 4 }}>
                        <b style={{ color: '#e2e8f0' }}>Lot {s.lot_idx + 1}: {s.qualite}</b> — {s.td.toLocaleString()} T →{' '}
                        <span style={{ color: '#34D399', fontWeight: 700 }}>{(s.td_charged || 0).toLocaleString()} T</span>
                      </div>
                      {s.scheduled && (
                        <>
                          <div className="phase-flow">
                            {phases.map((p, pi) => (
                              <div key={pi}>
                                <div className="phase-chip" style={{ background: PHASE_COLORS[p.ph] || '#333', color: '#111' }}>
                                  <div>{PHASE_NAMES[p.ph] || p.ph}</div>
                                  <div className="phase-time">T={p.start}→{p.end} ({p.end - p.start}h)</div>
                                </div>
                                {pi < phases.length - 1 && <span style={{ color: '#475569', margin: '0 2px' }}>→</span>}
                              </div>
                            ))}
                          </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                              {/* JPH Network Path Visualizer */}
                              <div style={{ display: 'flex', alignItems: 'center', background: '#0F172A', padding: '8px 12px', borderRadius: 6, border: '1px solid #1E293B', width: '100%' }}>
                                <div style={{ color: '#94A3B8', fontSize: 10, marginRight: 16, fontWeight: 600, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>ROUTAGE<br/>JPH NETWORK</div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', flex: 1 }}>
                                  {(() => {
                                    // 18A, 18B, 18C sont JLN
                                    // HExx sont JLN SAUF si préfixé par JFC
                                    const isJLN = s.hall && (
                                      s.hall.startsWith('18') || 
                                      (s.hall.includes('HE') && !s.hall.includes('JFC')) || 
                                      s.hall.includes('JLN')
                                    );
                                  const numU = s.axe ? s.axe.replace(/\D/g, '') || '1' : '1';
                                  const numP = s.axe_p ? s.axe_p.replace(/\D/g, '') || '1' : '1';
                                  
                                  let nodes = [];
                                  if (isJLN) {
                                    // Gérer les scrapers spécifiques pour 18A/B/C
                                    let scraperVal = `RA${numU}`;
                                    if (s.hall === '18A') scraperVal = 'RAA';
                                    if (s.hall === '18B') scraperVal = 'RAB';
                                    if (s.hall === '18C') scraperVal = 'RAC';

                                    nodes = [
                                      { type: 'Hall (JLN)', val: s.hall, color: '#3B82F6' },
                                      { type: 'Scraper', val: scraperVal, color: '#8B5CF6' },
                                      { type: 'Convoyeur', val: `RB${numU}`, color: '#8B5CF6' },
                                      { type: 'Crible', val: `Crible ${numP}`, color: '#EC4899' },
                                      { type: 'Conv. Port', val: `RC${numP}`, color: '#EC4899' },
                                      { type: 'Galerie', val: `G${numP}`, color: '#EC4899' },
                                      { type: 'Tapis', val: `H${numP}`, color: '#EC4899' },
                                      { type: 'Portique', val: s.portique, color: '#F59E0B' },
                                      { type: 'Quai', val: s.quai, color: '#10B981' }
                                    ];
                                  } else {
                                    // Gérer les scrapers spécifiques pour JFC ou Nouveaux Halls
                                    let primaryConv = `A${numU}`;
                                    if (s.hall === 'JFC1HE05' || s.hall === 'JFC1HE06') primaryConv = `C1P1`;
                                    if (s.hall === 'JFC3HE05' || s.hall === 'JFC3HE06') primaryConv = `C2P2`;
                                    if (s.hall === 'JFC5-309' || s.hall === 'JFC5-3010') primaryConv = `TC${numU}`;

                                    nodes = [
                                      { type: 'Hall (JLS)', val: s.hall || 'JFC', color: '#3B82F6' },
                                      { type: 'Conv. Primaire', val: primaryConv, color: '#8B5CF6' },
                                      { type: 'Conv. Second.', val: `B${numU}`, color: '#8B5CF6' },
                                      { type: 'Tapis Base', val: `TB${numP}`, color: '#EC4899' },
                                      { type: 'Tapis Dir.', val: `TD${numP}`, color: '#EC4899' },
                                      { type: 'Tapis Élev.', val: `TE${numP}`, color: '#EC4899' },
                                      { type: 'Galerie', val: `G${numP}`, color: '#EC4899' },
                                      { type: 'Tapis', val: `H${numP}`, color: '#EC4899' },
                                      { type: 'Portique', val: s.portique, color: '#F59E0B' },
                                      { type: 'Quai', val: s.quai, color: '#10B981' }
                                    ];
                                  }

                                  return nodes.map((node, i, arr) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                                      <div style={{ background: '#1E293B', border: `1px solid ${node.color}50`, borderRadius: 4, padding: '4px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                                        <span style={{ fontSize: 7, color: '#94A3B8', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{node.type}</span>
                                        <span style={{ fontSize: 10, color: node.color, fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap' }}>{node.val || '—'}</span>
                                      </div>
                                      {i < arr.length - 1 && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 3px', minWidth: 10 }}>
                                          <line x1="5" y1="12" x2="19" y2="12"></line>
                                          <polyline points="12 5 19 12 12 19"></polyline>
                                        </svg>
                                      )}
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%' }}>
                              {[
                                ['Cadence', `${s.cadence} t/h`],
                                ['Attente Quai', `${s.wait_quai || 0}h`],
                                ['Attente Axe', `${s.wait_axe || 0}h`],
                                ['Pénalités Estimées', `${s.penalite || 0} $`]
                              ].map(([k, v]) => (
                                <div key={k} style={{ background: '#111827', border: '1px solid #1e293b', borderRadius: 4, padding: '4px 12px', fontSize: 10, display: 'flex', flexDirection: 'column', minWidth: 100 }}>
                                  <div style={{ color: '#6b7280', fontSize: 8, marginBottom: 2 }}>{k}</div>
                                  <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {all_lots.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
          No planning data. Generate a plan first.
        </div>
      )}
    </div>
  );
}
