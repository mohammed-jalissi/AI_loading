import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import logoImg from '../../assets/logo.png';

export default function Sidebar({ params, setParams, onGenerate, loading, themeMode }) {
  const [meteoSummary, setMeteoSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    const ws = api.connectLogs((msg) => {
      setLogs(prev => [...prev.slice(-49), msg]); // Keep last 50 logs max
    });
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    api.getCurrentWeather().then(setMeteoSummary).catch(() => {});
  }, []);

  const isLight = themeMode === 'light';
  const greenColor = isLight ? '#1a6b3a' : '#00ff41';
  const blueColor = isLight ? '#2b6cb0' : '#0ea5e9';
  const borderColor = isLight ? '#cbd5e1' : '#1e293b';

  return (
    <div className="sidebar">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', marginTop: '14px' }}>
        <img 
          src={logoImg} 
          alt="AI Loading Planner" 
          style={{ 
            width: '100%', 
            maxWidth: '260px',
            height: 'auto', 
            display: 'block',
            filter: isLight ? 'brightness(0)' : 'none' // Make logo dark in light mode
          }} 
        />
      </div>

      <div 
        className="sidebar-status" 
        style={{ cursor: 'pointer', border: params.dataMode === 'REAL' ? `1px solid ${blueColor}` : `1px solid ${borderColor}` }}
        onClick={() => setParams(p => ({ ...p, dataMode: p.dataMode === 'LOCAL' ? 'REAL' : 'LOCAL' }))}
      >
        <div className="dot" style={{ backgroundColor: params.dataMode === 'REAL' ? blueColor : greenColor, boxShadow: `0 0 8px ${params.dataMode === 'REAL' ? blueColor : greenColor}` }}></div>
        <span style={{ color: params.dataMode === 'REAL' ? blueColor : 'inherit' }}>{params.dataMode === 'REAL' ? 'REAL_MODE (SUPABASE)' : 'LOCAL_MODE (MOCK)'}</span>
        <span style={{ marginLeft: 'auto', color: params.dataMode === 'REAL' ? blueColor : greenColor }}>OK</span>
      </div>

      {/* Parameters */}
      <div className="sidebar-section-label">▸ PARAMETERS</div>

      <label style={{ fontSize: 10, color: isLight ? '#1a1a1a' : '#6b7280', marginBottom: 2, fontWeight: isLight ? 600 : 400 }}>DATE_PLAN</label>
      <input type="date" className="kinetic-input" style={{ marginBottom: 8 }}
        value={params.date} onChange={e => setParams(p => ({ ...p, date: e.target.value }))} />

      <div className="slider-row">
        <span className="slider-label">HORIZON_HRS</span>
        <span className="slider-value">{params.horizon}</span>
      </div>
      <input type="range" className="kinetic-slider" min={24} max={72} step={12}
        value={params.horizon}
        onChange={e => setParams(p => ({ ...p, horizon: +e.target.value }))} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: isLight ? '#1a1a1a' : '#6b7280', marginBottom: 8, fontWeight: isLight ? 600 : 400 }}>
        <span>24</span><span>72</span>
      </div>

      <div className="slider-row">
        <span className="slider-label">LAMBDA_WAIT_PEN</span>
        <span className="slider-value">{params.lambda.toFixed(2)}</span>
      </div>
      <input type="range" className="kinetic-slider" min={0} max={3} step={0.1}
        value={params.lambda}
        onChange={e => setParams(p => ({ ...p, lambda: +e.target.value }))} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: isLight ? '#1a1a1a' : '#6b7280', marginBottom: 8, fontWeight: isLight ? 600 : 400 }}>
        <span>0.00</span><span>3.00</span>
      </div>

      {/* Meteo */}
      <div className="sidebar-section-label">▸ WEATHER_FEED</div>
      <label style={{ fontSize: 10, color: isLight ? '#1a1a1a' : '#6b7280', marginBottom: 2, fontWeight: isLight ? 600 : 400 }}>SOURCE</label>
      <select className="kinetic-select" style={{ marginBottom: 6 }}
        value={params.meteoSource}
        onChange={e => setParams(p => ({ ...p, meteoSource: e.target.value }))}>
        <option value="api">⚡ OPENWEATHER_API</option>
        <option value="favorable">FAVORABLE (100%)</option>
        <option value="perturbe">PERTURBÉ (80%)</option>
        <option value="tempete">TEMPÊTE (60%)</option>
      </select>
      {meteoSummary && meteoSummary.temp && (
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: isLight ? '#1a1a1a' : '#6b7280', marginBottom: 8, padding: '4px 0', fontWeight: isLight ? 600 : 400 }}>
          <span>TEMP<br /><b style={{ color: isLight ? '#333' : '#9ca3af' }}>{meteoSummary.temp}°</b></span>
          <span>WIND<br /><b style={{ color: isLight ? '#333' : '#9ca3af' }}>{meteoSummary.wind_kmh}km/h</b></span>
          <span>RAIN<br /><b style={{ color: isLight ? '#333' : '#9ca3af' }}>{meteoSummary.rain_mm}mm</b></span>
        </div>
      )}

      {/* ML Health */}
      <div className="sidebar-section-label">▸ EQUIP_HEALTH_ML</div>
      <select className="kinetic-select" style={{ marginBottom: 8 }}
        value={params.forceAnomaly}
        onChange={e => setParams(p => ({ ...p, forceAnomaly: e.target.value }))}>
        <option value="">ANOMALY_DETAILS</option>
        <option value="TB1">FORCE :: TB1</option>
        <option value="TB2">FORCE :: TB2</option>
        <option value="Axe1">FORCE :: Axe1</option>
      </select>

      {/* Vessels */}
      <div className="sidebar-section-label">▸ VESSELS</div>
      <label className="radio-option" style={{ fontSize: 10, marginBottom: 6 }}>
        <input type="checkbox" checked={params.editVessels}
          onChange={e => setParams(p => ({ ...p, editVessels: e.target.checked }))}
          style={{ accentColor: greenColor }} />
        <span>EDIT_VESSELS_LOTS</span>
      </label>

      {/* Algorithm */}
      <div className="sidebar-section-label">▸ OPTIMIZATION_CORE</div>
      <div style={{ fontSize: 10, color: isLight ? '#1a1a1a' : '#6b7280', marginBottom: 4, fontWeight: isLight ? 600 : 400 }}>ALGORITHM</div>
      <div className="radio-group">
        <label className={`radio-option ${params.algo === 'greedy' ? 'active' : ''}`}
          onClick={() => setParams(p => ({ ...p, algo: 'greedy' }))}>
          <div className="radio-dot" />
          GREEDY :: FAST
        </label>
        <label className={`radio-option ${params.algo === 'genetique' ? 'active' : ''}`}
          onClick={() => setParams(p => ({ ...p, algo: 'genetique' }))}>
          <div className="radio-dot" />
          GENETIC :: META
        </label>
        <label className={`radio-option ${params.algo === 'sa' ? 'active' : ''}`}
          onClick={() => setParams(p => ({ ...p, algo: 'sa' }))}>
          <div className="radio-dot" />
          SA :: ANNEALING
        </label>
        <label className={`radio-option ${params.algo === 'ts' ? 'active' : ''}`}
          onClick={() => setParams(p => ({ ...p, algo: 'ts' }))}>
          <div className="radio-dot" />
          TS :: TABU_SEARCH
        </label>
        <label className={`radio-option ${params.algo === 'milp' ? 'active' : ''}`}
          onClick={() => setParams(p => ({ ...p, algo: 'milp' }))}>
          <div className="radio-dot" />
          MILP :: OPTIMAL
        </label>
      </div>

      {params.algo === 'genetique' && (
        <div style={{ marginTop: 8 }}>
          <div className="slider-row">
            <span className="slider-label" style={{ fontSize: 9 }}>POP_SIZE</span>
            <span className="slider-value" style={{ fontSize: 10 }}>{params.popSize}</span>
          </div>
          <input type="range" className="kinetic-slider" min={10} max={100} step={10}
            value={params.popSize}
            onChange={e => setParams(p => ({ ...p, popSize: +e.target.value }))} />
          <div className="slider-row" style={{ marginTop: 4 }}>
            <span className="slider-label" style={{ fontSize: 9 }}>N_GEN</span>
            <span className="slider-value" style={{ fontSize: 10 }}>{params.nGen}</span>
          </div>
          <input type="range" className="kinetic-slider" min={5} max={50} step={5}
            value={params.nGen}
            onChange={e => setParams(p => ({ ...p, nGen: +e.target.value }))} />
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn-primary" onClick={() => {
          setLogs([]);
          onGenerate();
        }} disabled={loading}>
          {loading ? '⏳ COMPUTING...' : '⚡ GENERATE_PLAN →'}
        </button>

        {/* Mini Terminal Logs */}
        <div style={{ 
          background: isLight ? 'rgba(255,255,255,0.7)' : '#0a0e14', 
          border: isLight ? '1px solid rgba(0,0,0,0.1)' : '1px solid #1e293b', 
          borderRadius: 4, 
          padding: 8, 
          height: 200, 
          overflowY: 'auto',
          fontSize: 9,
          fontFamily: 'monospace',
          color: isLight ? '#1a1a1a' : '#00ff41',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          boxShadow: isLight ? 'inset 0 1px 3px rgba(0,0,0,0.1)' : 'none'
        }}>
          <div style={{ color: isLight ? '#4a5568' : '#6b7280', marginBottom: 4, fontWeight: isLight ? 700 : 400 }}>SYSTEM_LOGS :: CONNECTED</div>
          {logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
