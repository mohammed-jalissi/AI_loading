const API_BASE = 'http://localhost:8000/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  const res = await fetch(url, config);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const api = {
  // WebSockets
  connectLogs: (onMessage) => {
    const ws = new WebSocket('ws://localhost:8000/api/ws/logs');
    ws.onmessage = (event) => onMessage(event.data);
    return ws;
  },

  // Planning (timeout 3min pour MILP)
  generatePlan: (data) =>
    request('/plan', { method: 'POST', body: JSON.stringify(data), signal: AbortSignal.timeout(180000) }),

  // Benchmark
  runBenchmark: (data) =>
    request('/benchmark', { method: 'POST', body: JSON.stringify(data) }),
  runSingleBenchmark: (data) =>
    request('/benchmark/single', { method: 'POST', body: JSON.stringify(data) }),
  getBenchmarkRecommendation: (data) =>
    request('/benchmark/recommend', { method: 'POST', body: JSON.stringify(data) }),
  runBenchmarkAutotune: (data) =>
    request('/benchmark/autotune', { method: 'POST', body: JSON.stringify(data) }),


  // Meteo
  getMeteo: (source = 'favorable', horizon = 48) =>
    request(`/meteo?source=${source}&horizon=${horizon}`),
  getCurrentWeather: () => request('/meteo/current'),
  getWeeklyWeather: () => request('/meteo/weekly'),

  // ML Health
  getMLHealth: (forceAnomalyOn = '', dataMode = 'LOCAL') =>
    request(`/ml/health?data_mode=${dataMode}${forceAnomalyOn ? `&force_anomaly_on=${forceAnomalyOn}` : ''}`),
  submitMLFeedback: (axe, feedback_type, probability) =>
    request('/ml/feedback', {
      method: 'POST',
      body: JSON.stringify({ axe, feedback_type, probability }),
    }),

  // Agent
  chat: (data) =>
    request('/agent/chat', { method: 'POST', body: JSON.stringify(data) }),
  getTeamMembers: () => request('/agent/team'),
  addTeamMember: (member) => request('/agent/team', { method: 'POST', body: JSON.stringify(member) }),
  getAgentAssignments: () => request('/agent/assignments'),
  updateAgentAssignment: (assignment) => request('/agent/assignments', { method: 'POST', body: JSON.stringify(assignment) }),

  // Infrastructure
  getConfig: () => request('/infra/config'),
  getStocks: (dataMode = 'LOCAL') => request(`/infra/stocks?data_mode=${dataMode}`),
  addStock: (data) => request('/infra/stocks/add', { method: 'POST', body: JSON.stringify(data) }),
  getAxes: () => request('/infra/axes'),
  getNetworkPath: (source, target) =>
    request(`/infra/network/path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`),

  // Vessels
  getVessels: (dataMode = 'LOCAL') => request(`/vessels?data_mode=${dataMode}`),
  addVessel: (vessel) =>
    request('/vessels', { method: 'POST', body: JSON.stringify(vessel) }),
  clearCustomVessels: () =>
    request('/vessels/custom', { method: 'DELETE' }),

  // Data Ingestion
  ingestData: (entityId, data) =>
    request(`/ingest/${entityId}`, { method: 'POST', body: JSON.stringify(data) }),
  checkSupabaseStatus: () => request('/ingest/status'),
  executeSQL: (query) => request('/sql/execute', { method: 'POST', body: JSON.stringify({ query }) }),
  getSyncHistory: () => request('/ingest/history'),
  addSyncHistory: (entry) => request('/ingest/history', { method: 'POST', body: JSON.stringify(entry) }),
  setSchedule: (entity, frequency) =>
    request('/ingest/schedule', { method: 'POST', body: JSON.stringify({ entity, frequency, active: true }) }),
  getSchedules: () => request('/ingest/schedule'),
  // Export
  // Export
  exportCSV: async (data) => {
    const res = await fetch(`${API_BASE}/export/csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.blob();
  },

  // Streaming Chat (SSE)
  chatStream: (data, options = {}) =>
    fetch(`${API_BASE}/agent/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      ...options,
    }),

  // Feedback
  sendFeedback: (data) =>
    request('/agent/feedback', { method: 'POST', body: JSON.stringify(data) }),

  // History
  saveHistory: (data) =>
    request('/agent/history/save', { method: 'POST', body: JSON.stringify(data) }),
  loadHistory: (agentId) =>
    request(`/agent/history/${agentId}`),
};
