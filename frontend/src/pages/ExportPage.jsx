import { api } from '../api/client';

export default function ExportPage({ data }) {
  const { all_lots = [], metrics = {} } = data || {};

  const downloadCSV = async () => {
    try {
      const blob = await api.exportCSV({ all_lots, metrics });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Planning_OCP_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export error: ' + e.message);
    }
  };

  const sched = all_lots.filter(s => s.scheduled);
  const total = sched.reduce((s, l) => s + (l.td_charged || 0), 0);

  return (
    <div className="page-content">
      <h2 style={{ fontSize: 16, color: '#fbbf24', marginBottom: 16 }}>EXPORT // DATA_OUTPUT</h2>
      {all_lots.length > 0 ? (
        <>
          <div style={{ background: '#0A2A0A', border: '1px solid #1e4a1e', borderRadius: 6, padding: 14, marginBottom: 16, color: '#34d399', fontSize: 12 }}>
            ✅ {sched.length} lots — {total.toLocaleString()} T loaded
          </div>
          <button className="btn-primary" style={{ maxWidth: 300, marginBottom: 16 }} onClick={downloadCSV}>
            📥 DOWNLOAD_CSV
          </button>
          <table className="data-table">
            <thead><tr><th>VESSEL</th><th>QUAI</th><th>GRADE</th><th>TD</th><th>LOADED</th><th>AXIS</th><th>CRANE</th><th>HALL</th><th>STATUS</th></tr></thead>
            <tbody>
              {all_lots.map((s, i) => (
                <tr key={i}>
                  <td>{s.navire}</td><td>{s.quai}</td><td style={{ fontSize: 9 }}>{s.qualite}</td>
                  <td>{s.td?.toLocaleString()}</td>
                  <td style={{ color: s.scheduled ? '#34d399' : '#ef4444' }}>{(s.td_charged || 0).toLocaleString()}</td>
                  <td>{s.axe || '—'}</td><td>{s.grue || '—'}</td><td>{s.hall || '—'}</td>
                  <td style={{ color: s.scheduled ? '#00ff41' : '#ef4444' }}>{s.scheduled ? 'OK' : s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div style={{ color: '#6b7280', padding: 40, textAlign: 'center' }}>Generate a plan first.</div>
      )}
    </div>
  );
}
