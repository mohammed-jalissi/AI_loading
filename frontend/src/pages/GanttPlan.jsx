import React, { useState, useRef, useCallback } from 'react';
import MetricCard from '../components/MetricCard';
import MeteoBar from '../components/MeteoBar';
import GanttChart from '../components/GanttChart';
import ModernGantt from '../components/ModernGantt';
import MLAdvisor from '../components/MLAdvisor';
import SystemClock from '../components/SystemClock';
import WeeklyWeather from '../components/WeeklyWeather';

export default function GanttPlan({ data, meteo, weeklyMeteo, healthData, params }) {
  const [innerTab, setInnerTab] = useState('carto');
  const [viewMode, setViewMode] = useState('classic');
  const [expandedRade, setExpandedRade] = useState(null);
  const [cartoFullscreen, setCartoFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgPosRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - imgPosRef.current.x, y: e.clientY - imgPosRef.current.y };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || zoom <= 1) return;
    const next = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
    imgPosRef.current = next;
    setImgPos({ ...next });
  }, [zoom]);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(0.5, z - e.deltaY * 0.001)));
  }, []);

  const resetView = () => {
    imgPosRef.current = { x: 0, y: 0 };
    setImgPos({ x: 0, y: 0 });
    setZoom(1);
  };

  const { all_lots = [], metrics = {} } = data || {};
  const pt = metrics.poste_totals || {};
  const horizon = params?.horizon || 48;
  const date = params?.date || new Date().toISOString().slice(0, 10);

  const days = [];
  for (let d = 0; d < Math.ceil(horizon / 24); d++) {
    const s = d * 24;
    const end = Math.min((d + 1) * 24, horizon);
    const hrs = [];
    for (let h = s; h < end; h++) hrs.push(h);
    const dayDate = new Date(date);
    dayDate.setDate(dayDate.getDate() + d);
    days.push({ hours: hrs, label: dayDate.toLocaleDateString('en-US', { weekday: 'short', month: '2-digit', day: '2-digit', year: 'numeric' }).toUpperCase() });
  }

  const QUAI_ORDER = { '1N': 0, '1BIS': 1, '1TER': 2, '2N': 3, '2BIS': 4, '2TER': 5 };
  const ganttLots = all_lots.filter(l => l.scheduled && l.quai !== '—');
  const sortedLots = [...ganttLots].sort((a, b) => {
    const qa = QUAI_ORDER[a.quai] ?? 99;
    const qb = QUAI_ORDER[b.quai] ?? 99;
    if (qa !== qb) return qa - qb;
    return (a.h_arr || 0) - (b.h_arr || 0);
  });

  const tabBtn = (active) => ({
    padding: '8px 20px',
    fontSize: 10, fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: '1.5px',
    cursor: 'pointer', border: 'none',
    borderBottom: active ? '2px solid var(--accent-yellow)' : '2px solid transparent',
    background: 'transparent',
    color: active ? 'var(--accent-yellow)' : 'var(--text-muted)',
    transition: 'all 0.15s',
  });

  const btnS = {
    background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)',
    padding: '4px 10px', borderRadius: '4px', cursor: 'pointer',
    fontSize: '9px', fontFamily: 'monospace', letterSpacing: '1px', fontWeight: '700',
  };

  const zoomBtn = {
    background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--accent-yellow)',
    width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer',
    fontSize: '16px', fontWeight: '700', display: 'flex',
    alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="header-banner">
        <div className="scan-label">VOID_WATCH // ACTIVE_SCAN</div>
        <h1>AI_LOADING_PLANNER</h1>
        <SystemClock />
      </div>

      {/* Inner Tab Bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)', marginBottom: 0,
      }}>
        <button style={tabBtn(innerTab === 'carto')} onClick={() => setInnerTab('carto')}>
          🗺&nbsp; CARTOGRAPHIE
        </button>
        <button style={tabBtn(innerTab === 'gantt')} onClick={() => setInnerTab('gantt')}>
          📊&nbsp; GANTT_PLAN
        </button>

        {/* Right-side controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '12px' }}>
          {innerTab === 'carto' && (
            <>
              <button onClick={resetView} style={btnS}>RESET VIEW</button>
              <button onClick={() => setCartoFullscreen(f => !f)} style={btnS}>
                {cartoFullscreen ? '⊠ EXIT' : '⊞ FULLSCREEN'}
              </button>
              <span style={{ color: 'var(--accent-yellow)', fontSize: '9px', fontFamily: 'monospace', fontWeight: '700' }}>
                {(zoom * 100).toFixed(0)}%
              </span>
            </>
          )}
          {innerTab === 'gantt' && all_lots.length > 0 && (
            <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px' }}>
              {[{ key: 'classic', label: '// CLASSIQUE' }, { key: 'modern', label: '// CONTINU' }].map(({ key, label }) => (
                <button key={key} onClick={() => setViewMode(key)} style={{
                  background: viewMode === key ? 'var(--accent-yellow)' : 'transparent',
                  color: viewMode === key ? '#000' : 'var(--text-muted)',
                  border: 'none', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', fontWeight: '700',
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ CARTO TAB ═══ */}
      {innerTab === 'carto' && (
        <div
          style={{
            position: cartoFullscreen ? 'fixed' : 'relative',
            inset: cartoFullscreen ? 0 : 'auto',
            zIndex: cartoFullscreen ? 9999 : 1,
            width: cartoFullscreen ? '100vw' : '100%',
            height: cartoFullscreen ? '100vh' : 'auto',
            minHeight: cartoFullscreen ? '100vh' : '600px',
            aspectRatio: cartoFullscreen ? 'auto' : 'unset',
            background: 'var(--bg-primary)', overflow: 'hidden',
            cursor: zoom > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Grid */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'linear-gradient(rgba(212,255,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(212,255,0,0.02) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

          {/* Corner brackets */}
          {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
            <div key={v+h} style={{
              position: 'absolute', [v]: 10, [h]: 10, width: 24, height: 24, pointerEvents: 'none',
              [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]: '2px solid #d4ff00',
              [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]: '2px solid #d4ff00',
            }} />
          ))}

          {/* Label badge */}
          <div style={{
            position: 'absolute', top: 14, left: 14, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'rgba(0,0,0,0.8)', border: '1px solid #2a2a2a',
            padding: '6px 14px', borderRadius: '4px',
          }}>
            <div style={{
              background: 'var(--accent-yellow)', color: '#0a0a0a', fontWeight: '900',
              fontSize: '9px', letterSpacing: '1.5px', padding: '2px 7px', borderRadius: '2px'
            }}>OCP · JPH</div>
            <span style={{ fontWeight: '800', fontSize: '11px', letterSpacing: '2px', color: '#e2e8f0' }}>
              CARTOGRAPHIE RÉSEAU CONVOYEURS
            </span>
            <span style={{ fontSize: '9px', color: '#6b7280' }}>// Jorf Lasfar — Axe Engrais</span>
          </div>

          {/* Map image */}
          <img
            src="/CARTO.png"
            alt="Cartographie JPH"
            draggable={false}
            style={{
              transform: `translate(${imgPos.x}px, ${imgPos.y}px) scale(${zoom})`,
              transition: 'transform 0.04s',
              width: zoom === 1 ? '100%' : 'auto',
              maxWidth: zoom === 1 ? '100%' : 'none',
              height: 'auto',
              userSelect: 'none',
              filter: 'brightness(1.0) contrast(1.06) saturate(1.12)',
            }}
          />

          {/* Zoom HUD */}
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center',
            background: 'rgba(0,0,0,0.65)', border: '1px solid #2a2a2a',
            padding: '8px', borderRadius: '6px',
          }}>
            <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} style={zoomBtn}>+</button>
            <div style={{ color: 'var(--accent-yellow)', fontSize: '9px', fontFamily: 'monospace', fontWeight: '700' }}>
              {(zoom * 100).toFixed(0)}%
            </div>
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} style={zoomBtn}>−</button>
          </div>

          {/* Hint */}
          <div style={{
            position: 'absolute', bottom: 16, left: 14,
            background: 'rgba(0,0,0,0.65)', border: '1px solid #2a2a2a',
            padding: '4px 10px', borderRadius: '4px',
            fontSize: '9px', color: '#4b5563', fontFamily: 'monospace', letterSpacing: '1px', pointerEvents: 'none',
          }}>
            DRAG TO PAN · SCROLL TO ZOOM
          </div>

          {cartoFullscreen && (
            <button onClick={() => setCartoFullscreen(false)} style={{
              position: 'absolute', top: 14, right: 14,
              background: '#ff4444', color: '#fff', border: 'none',
              padding: '6px 16px', borderRadius: '4px', cursor: 'pointer',
              fontSize: '11px', fontWeight: '700', fontFamily: 'monospace',
            }}>✕ CLOSE</button>
          )}
        </div>
      )}

      {/* ═══ GANTT TAB ═══ */}
      {innerTab === 'gantt' && (
        <div style={{ paddingTop: '16px' }}>
          {/* KPI row */}
          <div className="metrics-row">
            <MetricCard label="TONS_LOADED" value={(metrics.total_charge || 0).toLocaleString()} unit="T" />
            <MetricCard label="LOTS_PLANNED" value={`${metrics.lots_planifies || 0}/${metrics.lots_total || 0}`} />
            <MetricCard label="VESSELS" value={String(metrics.navires_total || 0)} />
            <MetricCard label="RATE" value={`${(metrics.taux || 0).toFixed(0)}%`}
              variant={(metrics.taux || 0) < 70 ? 'danger' : undefined} />
            <MetricCard label="WAIT_TIME" value={`${metrics.total_attente || 0}h`}
              variant={(metrics.total_attente || 0) > 50 ? 'warning' : undefined} />
            <MetricCard label="SCORE" value={(metrics.score || 0).toFixed(3)} />
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8 }}>
            <div className="metrics-row" style={{ maxWidth: 500, flex: 1 }}>
              <MetricCard label="POSTE_P1" value={(pt.P1 || 0).toLocaleString()} unit="T" />
              <MetricCard label="POSTE_P2" value={(pt.P2 || 0).toLocaleString()} unit="T" />
              <MetricCard label="POSTE_P3" value={(pt.P3 || 0).toLocaleString()} unit="T" />
            </div>
            <div className="metrics-row" style={{ maxWidth: 250, flex: 1 }}>
              <MetricCard label="LAYTIME_DÉPASSÉ" value={`${metrics.total_demurrage_hours || 0}h`}
                variant={(metrics.total_demurrage_hours || 0) > 0 ? 'warning' : undefined} />
            </div>
          </div>

          <MeteoBar vector={meteo || []} horizon={horizon} />

          {/* Gantt */}
          {all_lots.length > 0 ? (
            viewMode === 'modern' ? (
              <ModernGantt lots={sortedLots} horizon={horizon} />
            ) : (
              days.map((day, di) => {
                const dayRadeLots = all_lots.filter(l =>
                  day.hours.some(h => l.timeline && l.timeline[h] &&
                    (l.timeline[h].status === 'RADE' || l.timeline[h].status === 'RADE_HIDDEN'))
                );
                const dayRadeVessels = [...new Set(dayRadeLots.map(l => l.navire))];

                return (
                  <div key={di} style={{ marginBottom: '24px' }}>
                    <div className="gantt-day-header">
                      <span className="icon">📅</span>
                      DAY_{String(di + 1).padStart(2, '0')} :: {day.label}
                    </div>
                    <GanttChart lots={sortedLots} hours={day.hours} posteTotals={pt} />

                    {dayRadeVessels.length > 0 && (
                      <div style={{
                        marginTop: '8px', padding: '10px 14px', background: 'var(--bg-card)',
                        border: '1px solid var(--border)', borderRadius: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: 'var(--accent-orange)', fontWeight: 'bold', fontSize: '12px' }}>
                            ⚓ NAVIRES EN RADE (ATTENTE) :
                          </span>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {dayRadeVessels.map(vName => {
                              const isExp = expandedRade === `${di}-${vName}`;
                              return (
                                <button key={vName}
                                  onClick={() => setExpandedRade(isExp ? null : `${di}-${vName}`)}
                                  style={{
                                    background: isExp ? 'var(--accent-yellow)' : 'var(--bg-secondary)',
                                    color: isExp ? '#000' : 'var(--text-primary)',
                                    border: '1px solid var(--border)', borderRadius: '4px',
                                    padding: '2px 8px', fontSize: '11px', cursor: 'pointer',
                                    fontWeight: isExp ? 'bold' : 'normal', transition: 'all 0.2s'
                                  }}>
                                  {vName} {isExp ? '▼' : '▶'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {dayRadeVessels.map(vName => {
                          if (expandedRade !== `${di}-${vName}`) return null;
                          const vLots = dayRadeLots.filter(l => l.navire === vName);
                          const exLots = vLots.filter(l => l.stock_warn || l.quai === '—');
                          return (
                            <div key={`d-${vName}`} style={{
                              marginTop: '12px', padding: '10px', background: 'var(--bg-secondary)',
                              borderLeft: '3px solid var(--accent-orange)', borderRadius: '0 4px 4px 0',
                              fontSize: '11px', color: 'var(--text-secondary)'
                            }}>
                              <div style={{ color: 'var(--accent-orange)', fontWeight: 'bold', marginBottom: '6px' }}>
                                Cause de mise en rade pour {vName} :
                              </div>
                              {exLots.length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: '16px' }}>
                                  {exLots.map((l, i) => {
                                    const charged = Object.values(l.timeline || {}).reduce((sum, h) => sum + (h.gain || 0), 0);
                                    return (
                                      <li key={i} style={{ marginBottom: '4px' }}>
                                        <strong>Stock épuisé :</strong> Lot <strong>{l.qualite}</strong> —
                                        Demandé: {l.td} T | Bloqué après: {charged} T.
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <div>En attente de ressources opérationnelles ou météo défavorable.</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              ⚡ Hit GENERATE_PLAN to start optimization
            </div>
          )}

          {healthData && <MLAdvisor healthData={healthData} />}
          {weeklyMeteo && weeklyMeteo.length > 0 && <WeeklyWeather forecasts={weeklyMeteo} />}
        </div>
      )}
    </div>
  );
}
