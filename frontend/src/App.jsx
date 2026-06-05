import { useState, useCallback, useMemo } from 'react';
import './index.css';
import { api } from './api/client';
import UltraDashboard from './pages/UltraDashboard';

import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import GanttPlan from './pages/GanttPlan';
import PhasesDtl from './pages/PhasesDtl';
import StocksInfra from './pages/StocksInfra';
import VesselInput from './pages/VesselInput';
import MetricsEval from './pages/MetricsEval';
import MilpModel from './pages/MilpModel';
import ExportPage from './pages/ExportPage';
import AIAssistant from './pages/AIAssistant';
import MLPredictionPage from './pages/MLPredictionPage';
import TopologyPage from './pages/TopologyPage';
import DataIngestion from './pages/DataIngestion';
import SimulationPage from './pages/SimulationPage';
import Dat03Feed from './pages/Dat03Feed';

const TABS = [
  { id: 'gantt', label: 'GANTT_PLAN' },
  { id: 'phases', label: 'PHASES_DTL' },
  { id: 'stocks', label: 'STOCKS_INFRA' },
  { id: 'vessels', label: 'VESSEL_INPUT' },
  { id: 'datafeed', label: 'DATA_FEED' },
  { id: 'metrics', label: 'METRICS_EVAL' },
  { id: 'milp', label: 'MILP_MODEL' },
  { id: 'export', label: 'EXPORT' },
  { id: 'mlpredict', label: 'ML_PREDICT' },
  { id: 'topology', label: 'TOPOLOGY' },
  { id: 'simulation', label: 'SIMULATION' },
  { id: 'dat03', label: 'DAT-03 ANALYTICS' },
  { id: 'agent', label: 'AI_ASSIST' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('gantt');
  const [mode, setMode] = useState('standard'); // 'standard' or 'ultra'
  const [themeMode, setThemeMode] = useState('dark'); // Default to dark mode
  const [themeColor, setThemeColor] = useState('#d4ff00'); // default yellow
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [meteo, setMeteo] = useState([]);
  const [weeklyMeteo, setWeeklyMeteo] = useState([]);
  const [healthData, setHealthData] = useState(null);

  const toggleTheme = useCallback(() => {
    setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const [params, setParams] = useState({
    date: new Date().toISOString().slice(0, 10),
    horizon: 48,
    lambda: 0.80,
    meteoSource: 'api',
    forceAnomaly: '',
    editVessels: false,
    algo: 'greedy',
    dataMode: 'LOCAL',
    popSize: 20,
    nGen: 20,
    saIter: 500,
    saTemp: 1000,
    tsIter: 100,
    tsTabuSize: 10,
  });

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch meteo
      const meteoRes = await api.getMeteo(params.meteoSource, params.horizon);
      setMeteo(meteoRes.vector || []);

      // 2. Fetch ML health
      const healthRes = await api.getMLHealth(params.forceAnomaly);
      setHealthData(healthRes);

      // 2b. Fetch weekly weather
      const weeklyRes = await api.getWeeklyWeather();
      setWeeklyMeteo(weeklyRes.forecasts || []);

      const planRes = await api.generatePlan({
        algo: params.algo,
        horizon: params.horizon,
        lambda_pen: params.lambda,
        meteo: meteoRes.vector,
        data_mode: params.dataMode,
        n_gen: params.nGen,
        pop_size: params.popSize,
        sa_iter: params.saIter,
        sa_temp: params.saTemp,
        ts_iter: params.tsIter,
        ts_tabu_size: params.tsTabuSize,
        axes_health: healthRes?.axes || null,
      });

      setData(planRes);
      setActiveTab('gantt');
    } catch (e) {
      console.error('Plan generation error:', e);
      alert('Error generating plan: ' + e.message);
    }
    setLoading(false);
  }, [params]);

  const handleApplyPlan = useCallback((algoId, benchmarkData) => {
    // Inject the benchmark data directly into global state and switch to Gantt
    setData(benchmarkData);
    setParams(prev => ({ ...prev, algo: algoId }));
    setActiveTab('gantt');
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case 'gantt': return <GanttPlan data={data} meteo={meteo} weeklyMeteo={weeklyMeteo} healthData={healthData} params={params} />;
      case 'phases': return <PhasesDtl data={data} />;
      case 'stocks': return <StocksInfra dataMode={params.dataMode} />;
      case 'vessels': return <VesselInput dataMode={params.dataMode} />;
      case 'datafeed': return <DataIngestion />;
      case 'metrics': return <MetricsEval data={data} onApplyPlan={handleApplyPlan} />;
      case 'milp': return <MilpModel />;
      case 'export': return <ExportPage data={data} />;
      case 'agent': return <AIAssistant data={data} />;
      case 'mlpredict': return <MLPredictionPage />;
      case 'topology': return <TopologyPage />;
      case 'simulation': return <SimulationPage baseData={data} params={params} meteo={meteo} healthData={healthData} onApplyPlan={handleApplyPlan} />;
      case 'dat03': return <Dat03Feed />;
      default: return <GanttPlan data={data} meteo={meteo} weeklyMeteo={weeklyMeteo} healthData={healthData} params={params} />;
    }
  };

  // Dynamic styles for custom theme color
  const customStyles = themeColor ? {
    '--accent-yellow': themeColor,
    '--gantt-acc': themeColor,
    '--btn-primary-bg': themeColor,
    '--btn-primary-border': `color-mix(in srgb, ${themeColor} 70%, black)`,
    ...(themeMode === 'light' ? {
      '--bg-sidebar': themeColor,
      '--sidebar-grad-start': `color-mix(in srgb, ${themeColor} 80%, black)`,
      '--sidebar-grad-end': themeColor,
      '--sidebar-border': `color-mix(in srgb, ${themeColor} 70%, black)`,
    } : {})
  } : undefined;

  return (
    <div className="app-layout" data-theme={themeMode} style={customStyles}>
      {mode !== 'ultra' && activeTab !== 'datafeed' && activeTab !== 'dat03' && (
        <Sidebar 
          params={params} 
          setParams={setParams} 
          onGenerate={handleGenerate} 
          loading={loading} 
          themeMode={themeMode}
        />
      )}
      <div className="main-content">
        {mode !== 'ultra' && (
          <TopBar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            tabs={TABS} 
            mode={mode} 
            setMode={setMode}
            themeMode={themeMode}
            toggleTheme={toggleTheme}
            themeColor={themeColor}
            setThemeColor={setThemeColor}
          />
        )}
        {mode === 'ultra' ? <UltraDashboard onExit={() => setMode('standard')} /> : renderPage()}
      </div>
    </div>
  );
}
