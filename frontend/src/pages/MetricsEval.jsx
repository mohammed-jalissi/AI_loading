import { useState, useMemo, useEffect, useRef } from 'react';
import MetricCard from '../components/MetricCard';
import { api } from '../api/client';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ZAxis, Legend, Cell } from 'recharts';

/* ── Hybridization Info Modal ─────────────────────────────────────────── */
function HybridModal({ onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const ROW = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 };
  const CELL = (active) => ({
    padding: '14px 16px',
    background: '#141414',
    border: `1px solid ${active ? '#d4ff00' : '#2a2a2a'}`,
    borderRadius: 4
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div ref={ref} style={{
        background: '#0f0f0f',
        border: '1px solid #2a2a2a',
        borderRadius: 4, padding: '26px 28px', maxWidth: 540, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
        fontFamily: "var(--font-mono)"
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #2a2a2a', paddingBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#d4ff00', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>TECHNICAL DOCUMENTATION</div>
            <h3 style={{ margin: 0, color: '#f0f0f0', fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Hybridization — Warm-Start Greedy
            </h3>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid #2a2a2a', color: '#a3a3a3',
            borderRadius: 4, padding: '5px 12px', cursor: 'pointer', fontSize: 10,
            textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#d4ff00'; e.currentTarget.style.color = '#d4ff00'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#a3a3a3'; }}
          >Close</button>
        </div>

        <div style={{ fontSize: 11, color: '#a3a3a3', lineHeight: 1.75 }}>
          {/* Definition */}
          <p style={{ margin: '0 0 16px', color: '#a3a3a3' }}>
            Hybridization (<em>warm-start</em>) initializes search metaheuristics (GA, SA, TS) with a <strong style={{ color: '#d4ff00', fontWeight: 700 }}>high-quality greedy solution</strong> instead of random configurations. This seeds the solver closer to the optimum, driving fast convergence.
          </p>

          {/* Steps */}
          <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: '#d4ff00', fontWeight: 700, letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' }}>Workflow — 3 Steps</div>
            {[
              ['01', 'Greedy Scheduler', 'Prioritizes vessels and assigns docks instantly to create a valid baseline.'],
              ['02', 'Injection', 'Injects the baseline planning into the initial metaheuristic state (population or seed).'],
              ['03', 'Guided Search', 'Explores promising zones around the seed to refine the schedule and eliminate delay.'],
            ].map(([num, title, desc]) => (
              <div key={num} style={{ display: 'flex', gap: 14, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ color: '#d4ff00', fontFamily: 'var(--font-mono)', fontSize: 11, minWidth: 20, paddingTop: 1, fontWeight: 700 }}>{num}</span>
                <div>
                  <span style={{ color: '#f0f0f0', fontWeight: 700, fontSize: 11 }}>{title} &mdash; </span>
                  <span style={{ color: '#a3a3a3', fontSize: 11 }}>{desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div style={ROW}>
            <div style={CELL(true)}>
              <div style={{ color: '#d4ff00', fontWeight: 700, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>With Hybridization</div>
              <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10, color: '#a3a3a3', lineHeight: 1.8 }}>
                <li>30% to 60% faster convergence</li>
                <li>Higher overall plan quality</li>
                <li>Fewer iterations required</li>
                <li>Ideal for live operations</li>
              </ul>
            </div>
            <div style={CELL(false)}>
              <div style={{ color: '#6b6b6b', fontWeight: 700, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Without Hybridization</div>
              <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10, color: '#6b6b6b', lineHeight: 1.8 }}>
                <li>Fully random starting seeds</li>
                <li>Broader initial exploration</li>
                <li>Risk of slow/stalled convergence</li>
                <li>Baseline comparison reference</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 9, color: '#6b6b6b', textAlign: 'center' }}>
            Toggle WARM-START in the benchmark panel to enable/disable.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MetricsEval({ data, onApplyPlan }) {
  const { metrics = {} } = data || {};
  const pt = metrics.poste_totals || {};
  const fh = metrics.fitness_history || [];

  const [benchmarkResults, setBenchmarkResults] = useState(() => {
    try {
      const saved = localStorage.getItem('benchmarkResults');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkStatus, setBenchmarkStatus] = useState('');
  const [includeMilp, setIncludeMilp] = useState(false);
  const [warmStart, setWarmStart] = useState(true);
  const [showHybridModal, setShowHybridModal] = useState(false);
  const [autotuningAlgo, setAutotuningAlgo] = useState(null);
  const [autotuneResult, setAutotuneResult] = useState(null);
  const handleAutotune = async (algo) => {
    setAutotuningAlgo(algo);
    try {
      let naviresObj = null;
      try { naviresObj = await api.getVessels(); } catch (e) {}
      const naviresList = naviresObj ? (naviresObj.custom && naviresObj.custom.length > 0 ? naviresObj.custom : naviresObj.default) : undefined;
      const res = await api.runBenchmarkAutotune({ algo, horizon: globalParams.horizon, navires: naviresList });
      if (algo === 'genetic') setGaParams({ n_gen: res.best_params.n_gen || 30, pop_size: res.best_params.pop_size || 20 });
      else if (algo === 'sa') setSaParams({ iter: res.best_params.iter || 600, temp: res.best_params.temp || 1000 });
      else if (algo === 'ts') setTsParams({ iter: res.best_params.iter || 100, tabu_size: res.best_params.tabu_size || 10 });
      setAutotuneResult({ type: 'success', algo: algo.toUpperCase(), score: res.best_score.toFixed(3) });
      setTimeout(() => setAutotuneResult(null), 5000);
    } catch(e) {
      console.error(e);
      setAutotuneResult({ type: 'error', message: 'Autotune failed. Check logs.' });
      setTimeout(() => setAutotuneResult(null), 5000);
    }
    setAutotuningAlgo(null);
  };

  const [aiReco, setAiReco] = useState(null);
  const fetchAiRecommendation = async () => {
    try {
      let naviresObj = null;
      try { naviresObj = await api.getVessels(); } catch (e) {}
      const naviresList = naviresObj ? (naviresObj.custom && naviresObj.custom.length > 0 ? naviresObj.custom : naviresObj.default) : undefined;
      const res = await api.getBenchmarkRecommendation({ horizon: globalParams.horizon, navires: naviresList });
      setAiReco(res);
    } catch (e) {
      console.error(e);
    }
  };


  const [globalParams, setGlobalParams] = useState({ horizon: 48 });
  const [gaParams, setGaParams] = useState({ n_gen: 30, pop_size: 20 });
  const [saParams, setSaParams] = useState({ iter: 600, temp: 1000 });
  const [tsParams, setTsParams] = useState({ iter: 100, tabu_size: 10 });

  const runScientificBenchmark = async () => {
    setBenchmarking(true);
    setBenchmarkResults([]);
    setBenchmarkStatus('Fetching current vessels...');
    
    try {
      let naviresObj = null;
      try {
        naviresObj = await api.getVessels();
      } catch (e) {
        console.warn('Could not fetch actual vessels, falling back to dummy data', e);
      }
      const naviresList = naviresObj ? (naviresObj.custom && naviresObj.custom.length > 0 ? naviresObj.custom : naviresObj.default) : undefined;
      
      const hybridTag = warmStart ? ' [WS]' : '';
      const algosToRun = [
        { id: 'greedy', label: 'Greedy Scheduler' },
        { id: 'genetic', label: `Genetic Algorithm${hybridTag}` },
        { id: 'sa', label: `Simulated Annealing${hybridTag}` },
        { id: 'ts', label: `Tabu Search${hybridTag}` },
      ];
      if (includeMilp) {
        algosToRun.push({ id: 'milp', label: 'MILP (Optimal - Lent)' });
      }
      
      const newResults = [];
      setBenchmarkStatus('Exécution en parallèle de tous les algorithmes...');
      
      const promises = algosToRun.map(a => {
        return api.runSingleBenchmark({
          algo: a.id,
          horizon: parseInt(globalParams.horizon),
          lambda_pen: 0.8,
          n_gen: parseInt(gaParams.n_gen),
          pop_size: parseInt(gaParams.pop_size),
          sa_iter: parseInt(saParams.iter),
          sa_temp: parseFloat(saParams.temp),
          ts_iter: parseInt(tsParams.iter),
          ts_tabu_size: parseInt(tsParams.tabu_size),
          warm_start: warmStart,
          navires: naviresList
        }).then(res => {
          const resData = { ...res.metrics, all_lots: res.all_lots };
          newResults.push(resData);
          const sortedResults = [...newResults].sort((a,b) => b.score - a.score);
          setBenchmarkResults(sortedResults);
          localStorage.setItem('benchmarkResults', JSON.stringify(sortedResults));
          return { status: 'fulfilled', data: resData };
        }).catch(err => {
          console.error(`Erreur pour ${a.label}:`, err);
          return { status: 'rejected', error: err, algo: a.label };
        });
      });

      const results = await Promise.all(promises);
      const failedAlgos = results.filter(r => r.status === 'rejected').map(r => r.algo);
      
      if (failedAlgos.length > 0) {
        setBenchmarkStatus(`Terminé. Échecs: ${failedAlgos.join(', ')}`);
      } else {
        setBenchmarkStatus('Benchmark completed successfully.');
      }
    } catch (e) {
      console.error('Benchmark error:', e);
      alert('Error running benchmark: ' + e.message);
      setBenchmarkStatus('Erreur lors du benchmark.');
    }
    setBenchmarking(false);
  };

  const radarData = useMemo(() => {
    if (!benchmarkResults || benchmarkResults.length === 0) return [];
    
    const getBest = (key, minimize) => minimize ? Math.min(...benchmarkResults.map(r => r[key] || 0)) : Math.max(...benchmarkResults.map(r => r[key] || 0));
    const getWorst = (key, minimize) => minimize ? Math.max(...benchmarkResults.map(r => r[key] || 0)) : Math.min(...benchmarkResults.map(r => r[key] || 0));
    
    const normalize = (val, key, minimize) => {
        const best = getBest(key, minimize);
        const worst = getWorst(key, minimize);
        if (best === worst) return 100;
        if (minimize) {
            return Math.max(0, ((worst - val) / (worst - best)) * 100);
        } else {
            return Math.max(0, ((val - worst) / (best - worst)) * 100);
        }
    };

    const metricsDef = [
        { key: 'score', label: 'Global Score', minimize: false },
        { key: 'taux', label: 'Fill Rate', minimize: false },
        { key: 'total_charge', label: 'Tonnage', minimize: false },
        { key: 'avg_wait_per_vessel', label: 'Wait (Inv)', minimize: true },
        { key: 'navires_termines', label: 'Vessels', minimize: false },
        { key: 'quay_occupancy', label: 'Quay Occ (Inv)', minimize: true },
        { key: 'risk_normalized', label: 'Low Risk', minimize: true },
    ];

    return metricsDef.map(m => {
        const row = { metric: m.label };
        benchmarkResults.forEach(r => {
            row[r.algo_name] = normalize(r[m.key] || 0, m.key, m.minimize);
        });
        return row;
    });
  }, [benchmarkResults]);

  const paretoData = useMemo(() => {
    if (!benchmarkResults) return [];
    return benchmarkResults.map(r => ({
      name: r.algo_name,
      x: r.cpu_time,
      y: r.total_charge,
      z: r.score || 100
    }));
  }, [benchmarkResults]);

  const paretoFrontier = useMemo(() => {
    if (!paretoData || paretoData.length === 0) return [];
    const sorted = [...paretoData].sort((a, b) => {
      if (a.x === b.x) return b.y - a.y;
      return a.x - b.x;
    });
    const frontier = [];
    let currentMaxY = -Infinity;
    for (const point of sorted) {
      if (point.y > currentMaxY) {
        frontier.push(point);
        currentMaxY = point.y;
      }
    }
    return frontier;
  }, [paretoData]);

  const aiRecommendation = useMemo(() => {
    if (!benchmarkResults || benchmarkResults.length === 0) return null;
    const sorted = [...benchmarkResults].sort((a, b) => (b.score || 0) - (a.score || 0));
    const best = sorted[0];
    const milp = benchmarkResults.find(r => r.algo_id === 'milp');
    
    if (milp && best.algo_id !== 'milp' && milp.score > 0) {
      const gap = (((milp.score - best.score) / milp.score) * 100).toFixed(2);
      return `L'IA recommande l'algorithme ${best.algo_name}. Il trouve une solution à seulement ${gap}% de l'optimum mathématique (MILP), mais en ${best.cpu_time}s au lieu de ${milp.cpu_time}s.`;
    }
    return `L'IA recommande l'algorithme ${best.algo_name} avec le meilleur score global de ${(best.score || 0).toFixed(3)} obtenu en ${best.cpu_time}s.`;
  }, [benchmarkResults]);

  const handleApply = (result) => {
    if (onApplyPlan && result.all_lots) {
      onApplyPlan(result.algo_id, { metrics: result, all_lots: result.all_lots });
    }
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#f87171'];

  const maxTonnage = benchmarkResults ? Math.max(...benchmarkResults.map(r => r.total_charge || 0)) : 0;
  const maxScore = benchmarkResults ? Math.max(...benchmarkResults.map(r => r.score || 0)) : 0;
  const maxFillRate = benchmarkResults ? Math.max(...benchmarkResults.map(r => r.taux || 0)) : 0;
  const minWait = benchmarkResults ? Math.min(...benchmarkResults.map(r => r.avg_wait_per_vessel || Infinity)) : Infinity;
  const minRisk = benchmarkResults ? Math.min(...benchmarkResults.map(r => r.risk_normalized || Infinity)) : Infinity;
  const minCpu = benchmarkResults ? Math.min(...benchmarkResults.map(r => r.cpu_time || Infinity)) : Infinity;

  const getWinnerStyle = (isWinner) => isWinner ? { color: '#d4ff00', fontWeight: 700 } : {};

  return (
    <div className="page-content" style={{ paddingBottom: 60 }}>
      {showHybridModal && <HybridModal onClose={() => setShowHybridModal(false)} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <h2 style={{ fontSize: 11, color: '#a3a3a3', margin: 0, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>Metrics Eval &mdash; Scientific Benchmark</h2>
            {/* Warm-start toggle (professional) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, padding: '5px 12px' }}>
              <span style={{ fontSize: 9, color: '#a3a3a3', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>WARM-START</span>
              <button
                onClick={() => setWarmStart(v => !v)}
                disabled={benchmarking}
                title={warmStart ? 'Disable warm-start greedy' : 'Enable warm-start greedy'}
                style={{
                  width: 34, height: 16, borderRadius: 8, border: 'none',
                  cursor: benchmarking ? 'not-allowed' : 'pointer',
                  background: warmStart ? '#d4ff00' : '#2a2a2a',
                  position: 'relative', transition: 'background 0.25s', flexShrink: 0
                }}
              >
                <span style={{
                  position: 'absolute', top: 2, left: warmStart ? 18 : 2,
                  width: 12, height: 12, borderRadius: '50%',
                  background: warmStart ? '#0f0f0f' : '#6b6b6b',
                  transition: 'left 0.25s', display: 'block'
                }} />
              </button>
              <span style={{ fontSize: 9, color: warmStart ? '#d4ff00' : '#6b6b6b', fontWeight: 700, minWidth: 26 }}>
                {warmStart ? 'ON' : 'OFF'}
              </span>
              <button
                onClick={() => setShowHybridModal(true)}
                title="Documentation — Hybridization warm-start"
                style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'transparent', border: '1px solid #2a2a2a',
                  color: '#6b6b6b', fontSize: 9, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', fontFamily: 'var(--font-mono)', lineHeight: 1
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#d4ff00'; e.currentTarget.style.color = '#d4ff00'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#6b6b6b'; }}
              >?</button>
            </div>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: 16, 
            background: '#141414',
            padding: '14px 18px', 
            borderRadius: 4, 
            border: '1px solid #2a2a2a',
            flexWrap: 'wrap' 
          }}>
            {/* Global Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 16, borderRight: '1px solid #2a2a2a' }}>
              <span style={{ fontSize: 9, color: '#a3a3a3', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Global Config</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>Horizon (h)</span>
                  <input type="number" value={globalParams.horizon} onChange={e => setGlobalParams({...globalParams, horizon: e.target.value})} style={{ width: 64, background: '#080808', border: '1px solid #222', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>
                    {/* GA Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 16, borderRight: '1px solid #2a2a2a' }}>
              <span style={{ fontSize: 9, color: '#d4ff00', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Genetic Algorithm</span>
              <div style={{ marginTop: 6 }}>
                <button onClick={() => handleAutotune('genetic')} disabled={autotuningAlgo === 'genetic'} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#a3a3a3', fontSize: 9, padding: '3px 7px', borderRadius: 3, cursor: 'pointer', letterSpacing: 0.5 }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#d4ff00'; e.currentTarget.style.color = '#d4ff00'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#a3a3a3'; }}>
                  {autotuningAlgo === 'genetic' ? 'Tuning...' : 'Auto-Tune'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>Pop Size</span>
                  <input type="number" value={gaParams.pop_size} onChange={e => setGaParams({...gaParams, pop_size: e.target.value})} style={{ width: 64, background: '#080808', border: '1px solid #222', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>Generations</span>
                  <input type="number" value={gaParams.n_gen} onChange={e => setGaParams({...gaParams, n_gen: e.target.value})} style={{ width: 64, background: '#080808', border: '1px solid #222', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>

            {/* SA Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 16, borderRight: '1px solid #2a2a2a' }}>
              <span style={{ fontSize: 9, color: '#d4ff00', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Simulated Annealing</span>
              <div style={{ marginTop: 6 }}>
                <button onClick={() => handleAutotune('sa')} disabled={autotuningAlgo === 'sa'} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#a3a3a3', fontSize: 9, padding: '3px 7px', borderRadius: 3, cursor: 'pointer', letterSpacing: 0.5 }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#d4ff00'; e.currentTarget.style.color = '#d4ff00'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#a3a3a3'; }}>
                  {autotuningAlgo === 'sa' ? 'Tuning...' : 'Auto-Tune'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>Iterations</span>
                  <input type="number" value={saParams.iter} onChange={e => setSaParams({...saParams, iter: e.target.value})} style={{ width: 64, background: '#080808', border: '1px solid #222', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>Init Temp</span>
                  <input type="number" value={saParams.temp} onChange={e => setSaParams({...saParams, temp: e.target.value})} style={{ width: 64, background: '#080808', border: '1px solid #222', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>

            {/* TS Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 9, color: '#d4ff00', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Tabu Search</span>
              <div style={{ marginTop: 6 }}>
                <button onClick={() => handleAutotune('ts')} disabled={autotuningAlgo === 'ts'} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#a3a3a3', fontSize: 9, padding: '3px 7px', borderRadius: 3, cursor: 'pointer', letterSpacing: 0.5 }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#d4ff00'; e.currentTarget.style.color = '#d4ff00'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#a3a3a3'; }}>
                  {autotuningAlgo === 'ts' ? 'Tuning...' : 'Auto-Tune'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>Iterations</span>
                  <input type="number" value={tsParams.iter} onChange={e => setTsParams({...tsParams, iter: e.target.value})} style={{ width: 64, background: '#080808', border: '1px solid #222', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>Tabu Size</span>
                  <input type="number" value={tsParams.tabu_size} onChange={e => setTsParams({...tsParams, tabu_size: e.target.value})} style={{ width: 64, background: '#080808', border: '1px solid #222', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>
          </div>
          {autotuneResult && (
            <div style={{ marginTop: 16, padding: '10px 16px', background: autotuneResult.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderLeft: `4px solid ${autotuneResult.type === 'success' ? '#34d399' : '#ef4444'}`, borderRadius: '0 4px 4px 0', color: '#e2e8f0', fontSize: 13, display: 'flex', alignItems: 'center' }}>
              {autotuneResult.type === 'success' ? (
                <span>Auto-tune complete for <strong>{autotuneResult.algo}</strong>. Optimal score found: <strong style={{ color: '#34d399' }}>{autotuneResult.score}</strong>. Parameters updated automatically.</span>
              ) : (
                <span style={{ color: '#ef4444' }}>{autotuneResult.message}</span>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 30 }}>
          {/* Warm-start status indicator */}
          <div style={{
            marginBottom: 14, padding: '7px 12px',
            background: '#141414',
            border: '1px solid #2a2a2a',
            borderLeft: `3px solid ${warmStart ? '#d4ff00' : '#6b6b6b'}`,
            borderRadius: 4, fontSize: 10,
            color: warmStart ? '#d4ff00' : '#6b6b6b',
            maxWidth: 220, textAlign: 'right', lineHeight: 1.6,
            fontFamily: 'var(--font-mono)'
          }}>
            {warmStart
              ? <><span style={{ color: '#d4ff00', fontWeight: 700 }}>Warm-Start active</span><br />GA / SA / TS seeded with the greedy solution.</>
              : <><span style={{ color: '#6b6b6b', fontWeight: 700 }}>Pure random seed</span><br />Unguided exploration of the solution space.</>
            }
          </div>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input 
              type="checkbox" 
              id="include-milp" 
              checked={includeMilp} 
              onChange={e => setIncludeMilp(e.target.checked)} 
              disabled={benchmarking}
            />
            <label htmlFor="include-milp" style={{ fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
              Inclure MILP (Baseline optimale lente, ~60s)
            </label>
          </div>
          <div style={{ marginBottom: 12, fontSize: 11, color: '#94a3b8' }}>
            <span title="Score = (Tonnage * 10) - (Avg Wait * 5) - (Risk * 2). Higher is better." style={{ cursor: 'help', borderBottom: '1px dotted #94a3b8' }}>Score Explainability (?)</span>
          </div>
          <button 
            className="btn-primary" 
            onClick={runScientificBenchmark} 
            disabled={benchmarking}
            style={{
              padding: '9px 22px', fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
              textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
              background: benchmarking ? '#1a1a1a' : '#d4ff00',
              color: benchmarking ? '#6b6b6b' : '#0f0f0f',
              border: `1px solid ${benchmarking ? '#2a2a2a' : '#d4ff00'}`,
              borderRadius: 4, cursor: benchmarking ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s'
            }}
            onMouseOver={e => { if (!benchmarking) { e.currentTarget.style.background = '#e5ff4d'; e.currentTarget.style.borderColor = '#e5ff4d'; }}}
            onMouseOut={e => { if (!benchmarking) { e.currentTarget.style.background = '#d4ff00'; e.currentTarget.style.borderColor = '#d4ff00'; }}}
          >
            {benchmarking ? 'Executing...' : 'Run Benchmark'}
          </button>
          {benchmarkStatus && (
            <div style={{ marginTop: 8, fontSize: 10, color: '#a3a3a3', fontFamily: 'var(--font-mono)', letterSpacing: 0.3 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: benchmarking ? '#d4ff00' : '#2a2a2a', marginRight: 6, verticalAlign: 'middle' }}></span>
              {benchmarkStatus}
            </div>
          )}
        </div>
      </div>
 
      <div className="metrics-row">
        <MetricCard label="ALGORITHM" value={metrics.algo_used || 'N/A'} />
        <MetricCard label="CPU_TIME" value={`${(metrics.cpu_time || 0).toFixed(3)}s`} />
        <MetricCard label="SCORE" value={(metrics.score || 0).toFixed(3)} />
        <MetricCard label="FILL_RATE" value={`${(metrics.taux || 0).toFixed(1)}%`} />
      </div>
 
      {benchmarkResults && benchmarkResults.length > 0 && (
        <div className="benchmark-section" style={{ marginTop: 24, padding: 20, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ width: 3, height: 16, background: '#d4ff00', borderRadius: 2 }} />
            <h3 style={{ fontSize: 11, color: '#a3a3a3', margin: 0, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Performance Dashboard</h3>
          </div>
          
          <div style={{ marginBottom: 20, padding: '14px 16px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 9, color: '#6b6b6b', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>System Recommendation</div>
              {aiReco ? (
                <div style={{ color: '#a3a3a3', fontSize: 12 }}>
                  <strong style={{ color: '#d4ff00' }}>{aiReco.recommended_algo.toUpperCase()}</strong> &mdash; {aiReco.reason} (Complexity: {aiReco.complexity_score})
                </div>
              ) : (
                <div style={{ color: '#6b6b6b', fontSize: 12 }}>Run the analyzer to get an algorithm recommendation based on current port conditions.</div>
              )}
              {aiRecommendation && <div style={{ marginTop: 6, color: '#d4ff00', fontSize: 11 }}><em>Post-benchmark:</em> {aiRecommendation}</div>}
            </div>
            <button
              onClick={fetchAiRecommendation}
              style={{
                padding: '7px 14px', fontSize: 10, background: 'transparent',
                border: '1px solid #2a2a2a', color: '#a3a3a3', cursor: 'pointer',
                borderRadius: 4, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#d4ff00'; e.currentTarget.style.color = '#d4ff00'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#a3a3a3'; }}
            >Analyze Conditions</button>
          </div>
          
          <div style={{ overflowX: 'auto', marginBottom: 30 }}>
            <table className="data-table" style={{ width: '100%', fontSize: 13, borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#050505', padding: '12px 8px', borderRadius: '4px 0 0 4px', width: 80 }}>RANK</th>
                  <th style={{ background: '#050505', padding: '12px 8px' }}>ALGORITHM</th>
                  <th style={{ background: '#050505', padding: '12px 8px' }}>SCORE</th>
                  <th style={{ background: '#050505', padding: '12px 8px' }}>EFFICIENCY (SCORE/S)</th>
                  <th style={{ background: '#050505', padding: '12px 8px' }}>FILL RATE (%)</th>
                  <th style={{ background: '#050505', padding: '12px 8px' }}>TONNAGE (T)</th>
                  <th style={{ background: '#050505', padding: '12px 8px' }}>AVG WAIT (H)</th>
                  <th style={{ background: '#050505', padding: '12px 8px' }}>VESSELS COMPLETED</th>
                  <th style={{ background: '#050505', padding: '12px 8px' }}>QUAY OCCUPANCY</th>
                  <th style={{ background: '#050505', padding: '12px 8px' }}>ML RISK</th>
                  <th style={{ background: '#050505', padding: '12px 8px' }}>CPU TIME (S)</th>
                  <th style={{ background: '#050505', padding: '12px 8px', borderRadius: '0 4px 4px 0', width: 140 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {benchmarkResults.map((r, i) => {
                  const isFirst = i === 0;
                  const isSecond = i === 1;
                  const isThird = i === 2;
                  
                  const efficiency = r.cpu_time > 0 ? (r.score / r.cpu_time).toFixed(1) : '—';
                  const maxEfficiency = benchmarkResults ? Math.max(...benchmarkResults.map(res => res.cpu_time > 0 ? res.score / res.cpu_time : -Infinity)) : 0;
                  const isEffWinner = r.cpu_time > 0 && (r.score / r.cpu_time) === maxEfficiency;

                  let rankSymbol = `${i + 1}`;
                  let rowBackground = 'rgba(10, 10, 10, 0.4)';
                  let borderStyle = '1px solid #1a1a1a';
                  let glowStyle = {};

                  if (isFirst) {
                    rankSymbol = '01';
                    rowBackground = 'rgba(212, 255, 0, 0.04)';
                    borderStyle = '1px solid rgba(212, 255, 0, 0.25)';
                    glowStyle = {};
                  } else if (isSecond) {
                    rankSymbol = '02';
                    rowBackground = 'rgba(255, 255, 255, 0.02)';
                    borderStyle = '1px solid #2a2a2a';
                  } else if (isThird) {
                    rankSymbol = '03';
                    rowBackground = 'rgba(255, 255, 255, 0.01)';
                    borderStyle = '1px solid #2a2a2a';
                  }

                  return (
                    <tr 
                      key={i} 
                      style={{ 
                        background: rowBackground, 
                        border: borderStyle,
                        transition: 'all 0.2s', 
                        transform: 'scale(1)',
                        ':hover': { background: '#111', transform: 'scale(1.01)' },
                        ...glowStyle
                      }}
                      title={`Planification ${r.algo_name} (${(r.score || 0).toFixed(3)})`}
                    >
                      <td style={{ 
                        fontWeight: 600, 
                        color: isFirst ? '#d4ff00' : '#6b6b6b', 
                        padding: '10px 8px', 
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        textAlign: 'center'
                      }}>
                        {rankSymbol}
                      </td>
                      <td style={{ fontWeight: 'bold', color: COLORS[i % COLORS.length], padding: '12px 8px' }}>
                        {r.algo_name}
                      </td>
                      <td style={{ ...getWinnerStyle(r.score === maxScore), padding: '12px 8px' }}>{(r.score || 0).toFixed(3)}</td>
                      <td style={{ ...getWinnerStyle(isEffWinner), padding: '12px 8px', fontFamily: 'monospace' }}>
                        {efficiency} pts/s
                      </td>
                      <td style={{ ...getWinnerStyle(r.taux === maxFillRate), padding: '12px 8px' }}>{(r.taux || 0).toFixed(1)}%</td>
                      <td style={{ ...getWinnerStyle(r.total_charge === maxTonnage), padding: '12px 8px' }}>{(r.total_charge || 0).toLocaleString()}</td>
                      <td style={{ ...getWinnerStyle(r.avg_wait_per_vessel === minWait), padding: '12px 8px' }}>{r.avg_wait_per_vessel}h</td>
                      <td style={{ padding: '12px 8px' }}>{r.navires_termines} / {r.navires_total_count}</td>
                      <td style={{ padding: '12px 8px' }}>{r.quay_occupancy}%</td>
                      <td style={{ ...getWinnerStyle(r.risk_normalized === minRisk), padding: '12px 8px' }}>{r.risk_normalized}</td>
                      <td style={{ ...getWinnerStyle(r.cpu_time === minCpu), padding: '12px 8px' }}>{r.cpu_time}s</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApply(r);
                          }}
                          style={{
                            background: isFirst ? '#d4ff00' : 'transparent',
                            color: isFirst ? '#0f0f0f' : '#a3a3a3',
                            border: `1px solid ${isFirst ? '#d4ff00' : '#2a2a2a'}`,
                            padding: '5px 10px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: 0.8,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontFamily: 'var(--font-mono)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = '#e5ff4d';
                            if (isFirst) {
                              e.currentTarget.style.background = '#e5ff4d';
                            } else {
                              e.currentTarget.style.color = '#d4ff00';
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = isFirst ? '#d4ff00' : '#2a2a2a';
                            if (isFirst) {
                              e.currentTarget.style.background = '#d4ff00';
                            } else {
                              e.currentTarget.style.color = '#a3a3a3';
                            }
                          }}
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Chart 1: Radar Chart (Performance Surface) */}
            <div style={{ background: '#141414', padding: 16, borderRadius: 4, border: '1px solid #2a2a2a', height: 400, display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4, textTransform: 'uppercase', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Global Performance Radar</h4>
              <p style={{ fontSize: 9, color: '#6b6b6b', textAlign: 'center', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>Normalized Scores (100 = Best in class)</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#2a2a2a" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6b6b6b', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                    <RechartsTooltip contentStyle={{ background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#f0f0f0', fontFamily: 'var(--font-mono)' }} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10, fontFamily: 'var(--font-mono)' }} />
                    {benchmarkResults.map((r, i) => (
                      <Radar key={r.algo_id} name={r.algo_name} dataKey={r.algo_name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Pareto Frontier Scatter Plot */}
            <div style={{ background: '#141414', padding: 16, borderRadius: 4, border: '1px solid #2a2a2a', height: 400, display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: 11, color: '#a3a3a3', marginBottom: 4, textTransform: 'uppercase', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>Pareto Frontier</h4>
              <p style={{ fontSize: 9, color: '#6b6b6b', textAlign: 'center', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>Trade-off: CPU Time vs Tonnage (Click dot to apply - mockup)</p>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis type="number" dataKey="x" name="CPU Time" unit="s" stroke="#6b6b6b" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9 }} label={{ value: 'CPU Time (s)', position: 'insideBottomRight', offset: -10, fill: '#a3a3a3', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                    <YAxis type="number" dataKey="y" name="Tonnage" unit="T" stroke="#6b6b6b" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9 }} domain={['auto', 'auto']} label={{ value: 'Tonnage', angle: -90, position: 'insideLeft', fill: '#a3a3a3', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                    <ZAxis type="number" dataKey="z" range={[100, 500]} name="Score" />
                    <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#0f0f0f', border: '1px solid #2a2a2a', color: '#f0f0f0', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                    <Scatter data={paretoFrontier} line={{ stroke: '#d4ff00', strokeWidth: 1.5, strokeDasharray: '5 5' }} shape={() => null} isAnimationActive={false} />
                    {paretoData.map((entry, index) => (
                      <Scatter 
                        key={index} 
                        name={entry.name} 
                        data={[entry]} 
                        fill={COLORS[index % COLORS.length]} 
                        onClick={() => {
                          const fullResult = benchmarkResults.find(r => r.algo_name === entry.name);
                          if(fullResult) handleApply(fullResult);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Cell fill={COLORS[index % COLORS.length]} />
                      </Scatter>
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {fh.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 10, color: '#a3a3a3', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1.5 }}>GA_CONVERGENCE</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 4, padding: '8px 8px 4px' }}>
            {fh.map((v, i) => {
              const max = Math.max(...fh);
              const min = Math.min(...fh);
              const range = max - min || 1;
              const pct = ((v - min) / range) * 100;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ height: `${pct}%`, background: '#d4ff00', borderRadius: '1px 1px 0 0', minHeight: 2 }}
                       title={`Gen ${i+1}: ${v.toFixed(0)}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail table */}
      {(data?.all_lots || []).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 10, color: '#a3a3a3', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: 1.5 }}>LOT_DETAIL</h3>
          <table className="data-table">
            <thead><tr><th>VESSEL</th><th>QUAI</th><th>GRADE</th><th>TD</th><th>LOADED</th><th>AXIS</th><th>STATUS</th></tr></thead>
            <tbody>
              {(data?.all_lots || []).map((s, i) => (
                <tr key={i}>
                  <td>{s.navire}</td><td>{s.quai}</td><td style={{ fontSize: 10 }}>{s.qualite}</td>
                  <td>{(s.td || 0).toLocaleString()}</td>
                  <td style={{ color: s.scheduled ? '#d4ff00' : '#ef4444' }}>{(s.td_charged || 0).toLocaleString()}</td>
                  <td>{s.axe || '—'}</td>
                  <td style={{ color: s.scheduled ? '#d4ff00' : '#ef4444' }}>{s.scheduled ? 'OK' : s.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
