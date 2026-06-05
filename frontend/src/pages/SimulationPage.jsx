import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import GanttChart from '../components/GanttChart';

const S = {
  page: { padding: '24px', overflowY: 'auto', height: '100%', color: 'var(--text-primary)' },
  banner: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  bannerBadge: { fontSize: '10px', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', fontWeight: 700 },
  bannerTitle: { fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', textTransform: 'uppercase', marginBottom: '8px' },
  bannerDesc: { fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '600px' },
  grid: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' },
  panel: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column' },
  panelTitle: { fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  inputGroup: { marginBottom: '12px' },
  label: { display: 'block', fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', fontWeight: 600 },
  select: { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit' },
  input: { width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', fontFamily: 'inherit' },
  btn: { width: '100%', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', transition: 'all 0.2s' },
  btnSecondary: { width: '100%', background: 'transparent', color: '#8b5cf6', border: '1px dashed #8b5cf6', padding: '8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '12px' },
  metricCard: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px', flex: 1 },
  metricValue: { fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' },
  metricLabel: { fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' },
  placeholderBox: { background: 'var(--bg-primary)', border: '1px dashed var(--border)', borderRadius: '6px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px', flexDirection: 'column', gap: '12px' },
  eventCard: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '12px', marginBottom: '8px', position: 'relative' },
  removeBtn: { position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }
};

export default function SimulationPage({ baseData, params, meteo, healthData, onApplyPlan }) {
  const [loading, setLoading] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [vessels, setVessels] = useState([]);
  
  // Scenario Builder Events
  const [events, setEvents] = useState([]);
  
  // Results
  const [simData, setSimData] = useState(null);

  useEffect(() => {
    async function fetchVessels() {
      try {
        const res = await api.getVessels(params?.dataMode || 'LOCAL');
        setVessels([...(res.default || []), ...(res.custom || [])]);
      } catch (err) {
        console.error("Failed to fetch vessels", err);
      }
    }
    fetchVessels();
  }, [params?.dataMode]);

  const addEvent = (type) => {
    if (type === 'VESSEL_DELAY') {
      setEvents([...events, { id: Date.now(), type, target: vessels[0]?.nom || '', delay: 10 }]);
    } else if (type === 'AXIS_BREAKDOWN') {
      setEvents([...events, { id: Date.now(), type, target: 'Axe1' }]);
    } else if (type === 'WEATHER_ALERT') {
      setEvents([...events, { id: Date.now(), type, target: '2N', start: 0, duration: 6 }]);
    } else if (type === 'QUALITY_SHORTAGE') {
      setEvents([...events, { id: Date.now(), type, target: 'DAP STANDARD', start: 0, duration: 12 }]);
    }
  };

  const removeEvent = (id) => setEvents(events.filter(e => e.id !== id));
  
  const updateEvent = (id, field, value) => {
    setEvents(events.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleSimulate = async () => {
    if (events.length === 0) return alert("Veuillez ajouter au moins un événement au scénario.");
    setLoading(true);
    setSimulated(false);
    
    try {
      // 1. Clone state
      const clonedVessels = JSON.parse(JSON.stringify(vessels));
      let clonedHealth = healthData?.axes ? JSON.parse(JSON.stringify(healthData.axes)) : {};

      // 2. Apply Events
      events.forEach(ev => {
        if (ev.type === 'VESSEL_DELAY') {
          const target = clonedVessels.find(v => v.nom === ev.target);
          if (target) target.arrivee += Number(ev.delay);
        } else if (ev.type === 'AXIS_BREAKDOWN') {
          clonedHealth[ev.target] = { probability: 1.0, is_anomaly: 1, insight: "SIMULATED BREAKDOWN INJECTION" };
        }
      });

      const weatherAlerts = events.filter(e => e.type === 'WEATHER_ALERT').map(e => ({ target: e.target, start: Number(e.start), duration: Number(e.duration) }));
      const qualityShortages = events.filter(e => e.type === 'QUALITY_SHORTAGE').map(e => ({ target: e.target, start: Number(e.start), duration: Number(e.duration) }));

      // 3. Call backend benchmark
      const req = {
        algo: 'greedy', 
        horizon: params?.horizon || 48,
        lambda_pen: params?.lambda || 0.8,
        meteo: meteo,
        navires: clonedVessels,
        data_mode: params?.dataMode || 'LOCAL',
        axes_health: clonedHealth,
        weather_alerts: weatherAlerts.length > 0 ? weatherAlerts : null,
        quality_shortages: qualityShortages.length > 0 ? qualityShortages : null
      };

      const res = await api.runSingleBenchmark(req);
      setSimData(res);
      setSimulated(true);

    } catch (err) {
      console.error("Simulation failed:", err);
      alert("Erreur lors de la simulation : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to compute Demurrage Financial Impact
  // Formula: total demurrage = sum(wait_time_of_vessel * vessel_demurrage_rate)
  // Since we don't have per-vessel exact wait time in metrics right now without complex parsing of all_lots,
  // we will estimate: wait_diff * avg_demurrage_rate or just map the vessels.
  const computeFinancialImpact = (lotsData, originalVessels) => {
    let cost = 0;
    // Map vessel name to demurrage rate
    const rates = {};
    originalVessels.forEach(v => rates[v.nom] = v.demurrage_rate || 1000);
    
    if (lotsData) {
      lotsData.forEach(lot => {
        if (lot.scheduled && lot.attente > 0) {
           const rate = rates[lot.navire] || 1000;
           // The backend lot.attente is total wait time for that lot.
           cost += (lot.attente * rate);
        }
      });
    }
    return cost;
  };

  const baseMetrics = baseData?.metrics || {};
  const simMetrics = simData?.metrics || {};

  const baseCost = baseData ? computeFinancialImpact(baseData.all_lots, vessels) : 0;
  const simCost = simData ? computeFinancialImpact(simData.all_lots, vessels) : 0;
  
  const deltaWait = (simMetrics.total_attente || 0) - (baseMetrics.total_attente || 0);
  const deltaCongestion = (simMetrics.quay_occupancy || 0) - (baseMetrics.quay_occupancy || 0);
  const deltaCost = simCost - baseCost;

  const formatDelta = (val, suffix='', prefix='') => {
    if (val > 0) return `+${prefix}${val.toLocaleString()}${suffix}`;
    if (val < 0) return `${prefix}${val.toLocaleString()}${suffix}`;
    return `0${suffix}`;
  };

  return (
    <div style={S.page}>
      <div style={S.banner}>
        <div>
          <div style={S.bannerBadge}>MODULE 06 · DIGITAL TWIN</div>
          <div style={S.bannerTitle}>SCENARIO BUILDER & FINANCIAL IMPACT</div>
          <div style={S.bannerDesc}>
            Créez des scénarios complexes multi-variables (retards navires + pannes d'infrastructure).
            Évaluez l'impact financier (Surestaries) et visualisez le nouveau plan (Ghost Layers). 
            Si le scénario correspond à la réalité, promouvez-le en tant que plan officiel.
          </div>
        </div>
        <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', padding: '12px 16px', borderRadius: '6px', textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#8b5cf6', letterSpacing: '1px', marginBottom: '4px', fontWeight: 700 }}>SIM-06 STATUS</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>IDLE / READY</div>
        </div>
      </div>

      {/* Scenario Builder (Full Width) */}
      <div style={{...S.panel, marginBottom: '24px'}}>
        <div style={{...S.panelTitle, display: 'flex', justifyContent: 'space-between'}}>
          <div><span style={{ color: '#8b5cf6' }}>⚡</span> SCENARIO BUILDER</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{...S.btnSecondary, marginTop: 0}} onClick={() => addEvent('VESSEL_DELAY')}>+ VESSEL DELAY</button>
            <button style={{...S.btnSecondary, marginTop: 0}} onClick={() => addEvent('AXIS_BREAKDOWN')}>+ AXIS DOWN</button>
            <button style={{...S.btnSecondary, marginTop: 0}} onClick={() => addEvent('WEATHER_ALERT')}>+ WEATHER</button>
            <button style={{...S.btnSecondary, marginTop: 0}} onClick={() => addEvent('QUALITY_SHORTAGE')}>+ SHORTAGE</button>
          </div>
        </div>

        {events.length === 0 && (
           <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px dashed var(--border)' }}>
             Aucun événement. Ajoutez une perturbation à l'aide des boutons ci-dessus.
           </div>
        )}
        
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
          {events.map((ev, i) => (
            <div key={ev.id} style={{...S.eventCard, minWidth: '280px', flexShrink: 0, marginBottom: 0}}>
              <button style={S.removeBtn} onClick={() => removeEvent(ev.id)}>×</button>
              <div style={{ fontSize: '9px', color: '#8b5cf6', fontWeight: 700, marginBottom: '8px' }}>EVENT {i+1} : {ev.type}</div>
              
              {ev.type === 'VESSEL_DELAY' && (
                <>
                  <select style={{...S.select, marginBottom: '8px'}} value={ev.target} onChange={e => updateEvent(ev.id, 'target', e.target.value)}>
                    {vessels.map(v => <option key={v.nom} value={v.nom}>{v.nom} (Arr: H+{v.arrivee})</option>)}
                  </select>
                  <input type="number" style={S.input} value={ev.delay} onChange={e => updateEvent(ev.id, 'delay', e.target.value)} placeholder="Retard (H)" />
                </>
              )}
              {ev.type === 'AXIS_BREAKDOWN' && (
                <select style={S.select} value={ev.target} onChange={e => updateEvent(ev.id, 'target', e.target.value)}>
                  <optgroup label="Axes Logiques (Généraux)">
                    <option value="Axe1">Axe 1 (Main JLN)</option>
                    <option value="Axe2">Axe 2 (Secours JLN)</option>
                  </optgroup>
                  <optgroup label="Convoyeurs">
                    <option value="TB1">TB1</option>
                    <option value="TB2">TB2</option>
                  </optgroup>
                </select>
              )}
              {ev.type === 'WEATHER_ALERT' && (
                <>
                  <select style={{...S.select, marginBottom: '8px'}} value={ev.target} onChange={e => updateEvent(ev.id, 'target', e.target.value)}>
                    <option value="1N">Quai 1N</option>
                    <option value="1BIS">Quai 1BIS</option>
                    <option value="1TER">Quai 1TER</option>
                    <option value="2N">Quai 2N</option>
                    <option value="2BIS">Quai 2BIS</option>
                    <option value="2TER">Quai 2TER</option>
                  </select>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="number" style={S.input} value={ev.start} onChange={e => updateEvent(ev.id, 'start', e.target.value)} placeholder="Début (H)" />
                    <input type="number" style={S.input} value={ev.duration} onChange={e => updateEvent(ev.id, 'duration', e.target.value)} placeholder="Durée (H)" />
                  </div>
                </>
              )}
              {ev.type === 'QUALITY_SHORTAGE' && (
                <>
                  <select style={{...S.select, marginBottom: '8px'}} value={ev.target} onChange={e => updateEvent(ev.id, 'target', e.target.value)}>
                    <option value="DAP STANDARD">DAP STANDARD</option>
                    <option value="DAP SPECIAL">DAP SPECIAL</option>
                  </select>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="number" style={S.input} value={ev.start} onChange={e => updateEvent(ev.id, 'start', e.target.value)} placeholder="Début (H)" />
                    <input type="number" style={S.input} value={ev.duration} onChange={e => updateEvent(ev.id, 'duration', e.target.value)} placeholder="Durée (H)" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <button style={{...S.btn, opacity: loading ? 0.7 : 1, width: 'auto', alignSelf: 'flex-start', padding: '10px 24px'}} onClick={handleSimulate} disabled={loading}>
          {loading ? 'SIMULATING...' : 'RUN SIMULATION'}
        </button>
      </div>

      {/* Impact Analysis (Full Width) */}
      <div style={{...S.panel, marginBottom: '24px'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{...S.panelTitle, marginBottom: 0}}>
            <span style={{ color: '#8b5cf6' }}>📊</span> IMPACT ANALYSIS
          </div>
          {baseData && (
             <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
               Baseline: {baseMetrics.algo_used || 'N/A'} (Score: {baseMetrics.score?.toFixed(1)})
             </div>
          )}
        </div>

        {!simulated && !loading ? (
          <div style={{...S.placeholderBox, height: '100px'}}>
            <span>Run simulation to see financial and operational impact.</span>
          </div>
        ) : loading ? (
          <div style={{...S.placeholderBox, height: '100px'}}>
            <div style={{ color: '#8b5cf6', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>Calculating impact...</div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{...S.metricCard, borderLeft: `3px solid ${deltaCost > 0 ? '#ef4444' : '#34d399'}`}}>
              <div style={S.metricValue}>${simCost.toLocaleString()}</div>
              <div style={S.metricLabel}>Total Demurrage <span style={{color: deltaCost > 0 ? '#ef4444' : '#34d399', fontWeight: 'bold'}}>{formatDelta(deltaCost, '', '$')}</span></div>
            </div>
            <div style={{...S.metricCard, borderLeft: `3px solid ${deltaWait > 0 ? '#ef4444' : '#34d399'}`}}>
              <div style={S.metricValue}>{simMetrics.total_attente}h</div>
              <div style={S.metricLabel}>Total Waiting <span style={{color: deltaWait > 0 ? '#ef4444' : '#34d399', fontWeight: 'bold'}}>{formatDelta(deltaWait, 'h')}</span></div>
            </div>
            <div style={{...S.metricCard, borderLeft: `3px solid ${deltaCongestion > 0 ? '#ef4444' : '#34d399'}`}}>
              <div style={S.metricValue}>{(simMetrics.quay_occupancy || 0).toFixed(1)}%</div>
              <div style={S.metricLabel}>Congestion <span style={{color: deltaCongestion > 0 ? '#ef4444' : '#34d399', fontWeight: 'bold'}}>{formatDelta(deltaCongestion, '%')}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Simulated Gantt Preview (Full Width) */}
      {(simulated || loading) && (
        <div style={S.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
             <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
               SIMULATED GANTT PREVIEW (GHOST LAYERS)
             </div>
             {onApplyPlan && simulated && (
                <button 
                  onClick={() => onApplyPlan('simulation', simData)}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', letterSpacing: '1px' }}
                >
                  ⚠ PROMOTE TO LIVE PLAN
                </button>
             )}
          </div>
          
          {loading ? (
            <div style={S.placeholderBox}>
              <div style={{ color: '#8b5cf6', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>Generating Gantt...</div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', overflowX: 'auto' }}>
              <GanttChart 
                lots={simData?.all_lots || []} 
                baseLots={baseData?.all_lots || []}
                hours={Array.from({length: params?.horizon || 48}, (_, i) => i)} 
                posteTotals={simMetrics.poste_totals || {}} 
                viewMode="classique" 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
