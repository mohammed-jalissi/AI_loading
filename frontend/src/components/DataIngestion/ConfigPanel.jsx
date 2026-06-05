import { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useIngestionStore } from './store';
import { ENTITIES, generateTemplate } from './schema';
import { api } from '../../api/client';

export default function ConfigPanel() {
  const [cfgTab, setCfgTab] = useState('file');
  const [sql, setSql] = useState('');
  const [sqlResult, setSqlResult] = useState(null);
  const [drag, setDrag] = useState(false);
  const [cronFreq, setCronFreq] = useState('Every 1 Hour');
  const fref = useRef(null);
  
  const { 
    selectedNode, nodesData, parseData, clearNode, mapColumn, syncData, 
    isSyncing, addLog, addAlert, dataProfile, crossValErrors, syncEntityProgress,
    autoFixData, healthStats, alerts, setSchedule
  } = useIngestionStore();
  
  const entity = ENTITIES.find(e => e.id === selectedNode);
  const nodeState = nodesData[selectedNode];

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    
    // Direct backend upload for special entities (like Historique 2025)
    if (entity && entity.upload_url) {
        addLog('info', `Uploading ${file.name} to backend for processing...`);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`http://localhost:8000${entity.upload_url}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.status === 'ok') {
                addLog('ok', data.message);
                parseData(selectedNode, [], file.name); // Just to update UI state
            } else {
                addLog('err', data.detail || data.message || 'Upload failed');
            }
        } catch(e) {
            addLog('err', e.message);
        }
        return;
    }

    if (ext === 'csv' || ext === 'txt') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true, dynamicTyping: true,
        complete: r => parseData(selectedNode, r.data, file.name)
      });
    } else if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        parseData(selectedNode, data, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      addLog('err', 'Unsupported file format');
    }
  };

  const handleDownloadTemplate = () => {
    const blob = generateTemplate(selectedNode);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${selectedNode}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExecuteSQL = async () => {
    try {
      const res = await api.executeSQL(sql);
      if (res.status === 'success') {
        setSqlResult(JSON.stringify(res.data, null, 2));
        addLog('ok', `SQL executed successfully. Returned ${res.data.length} rows.`);
      } else {
        setSqlResult(`Error: ${res.message}`);
        addLog('err', res.message);
      }
    } catch (e) {
      setSqlResult(`Exception: ${e.message}`);
      addLog('err', e.message);
    }
  };

  // Mapper, Valid, Sync Panels
  if (['mapper', 'valid', 'sync'].includes(selectedNode)) {
    return (
      <div className="din-config">
        <div className="din-cfg-input" style={{ width: '100%', padding: '20px', overflowY: 'auto' }}>
          {selectedNode === 'mapper' && (
            <div>
              <h3 style={{ color: '#d4d4d8', fontSize: '14px', marginBottom: '16px' }}>Dynamic Data Mapper (Fuzzy Match enabled)</h3>
              {Object.entries(nodesData).filter(([_, n]) => n.status === 'mapping_req').length === 0 ? (
                <div style={{ color: '#8a8a8a', fontSize: '12px' }}>No manual mapping required. All nodes are schema-compliant.</div>
              ) : (
                Object.entries(nodesData).filter(([_, n]) => n.status === 'mapping_req').map(([eid, n]) => (
                  <div key={eid} style={{ marginBottom: '12px', background: '#161618', padding: '16px', borderRadius: '6px', border: '1px solid #f59e0b50' }}>
                    <div style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '12px', fontWeight: 600 }}>{eid.toUpperCase()} - Missing Columns</div>
                    {n.missing.map(m => (
                      <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ width: '120px', color: '#a1a1aa', fontSize: '11px' }}>{m}</span>
                        <span style={{ color: '#3f3f46' }}>←</span>
                        <select 
                          style={{ background: '#27272a', color: '#fff', border: '1px solid #3f3f46', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', outline: 'none' }}
                          onChange={e => mapColumn(eid, m, e.target.value)} defaultValue=""
                        >
                          <option value="" disabled>Select source column...</option>
                          {n.fileKeys.map(fk => <option key={fk} value={fk}>{fk}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
          
          {selectedNode === 'valid' && (
            <div>
              <h3 style={{ color: '#10b981', fontSize: '14px', marginBottom: '16px' }}>Schema Validation (Zod) & Cross-Validation</h3>
              
              {/* Cross-Validation Warnings */}
              {crossValErrors && crossValErrors.length > 0 && (
                <div style={{ marginBottom: '16px', padding: '12px', background: '#f59e0b10', border: '1px solid #f59e0b50', borderRadius: '6px' }}>
                  <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Cross-Entity Referential Warnings</div>
                  <ul style={{ fontSize: '11px', color: '#fcd34d', margin: 0, paddingLeft: '16px' }}>
                    {crossValErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              <p style={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '12px' }}>Rows failing validation are excluded from sync.</p>
              {Object.entries(nodesData).map(([eid, n]) => {
                if (n.errors && n.errors.length > 0) {
                  return (
                    <div key={eid} style={{ marginBottom: '12px', padding: '12px', background: '#ef444410', border: '1px solid #ef444450', borderRadius: '6px' }}>
                      <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>{eid.toUpperCase()} - Errors</div>
                      <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '11px', color: '#f87171' }}>
                        {n.errors.map((err, i) => <div key={i}>{err}</div>)}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
          
          {selectedNode === 'sync' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <h3 style={{ color: '#2563eb', fontSize: '16px', marginBottom: '16px' }}>Supabase Synchronization</h3>
              
              {/* Progress Bars */}
              <div style={{ width: '100%', maxWidth: '400px', marginBottom: '24px' }}>
                {ENTITIES.map(e => {
                  const s = syncEntityProgress[e.id];
                  if (!s && nodesData[e.id].status !== 'loaded') return null;
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px' }}>
                      <div style={{ width: '60px', color: '#a1a1aa', textTransform: 'capitalize' }}>{e.id}</div>
                      <div style={{ flex: 1, height: '8px', background: '#27272a', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: s === 'success' ? '100%' : (s === 'syncing' ? '50%' : (s === 'error' ? '100%' : '0%')),
                          background: s === 'success' ? '#10b981' : (s === 'error' ? '#ef4444' : (s === 'syncing' ? '#3b82f6' : '#52525b')),
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{ width: '20px', textAlign: 'center' }}>
                        {s === 'success' ? '✅' : (s === 'error' ? '❌' : (s === 'syncing' ? '⏳' : '⬜'))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '24px', textAlign: 'center', maxWidth: '400px' }}>
                Push validated data from the ETL pipeline to the Supabase operational database.
              </p>
              <button 
                onClick={syncData} 
                disabled={isSyncing}
                style={{
                  background: isSyncing ? '#3b82f650' : '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', 
                  borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: isSyncing ? 'not-allowed' : 'pointer'
                }}
              >
                {isSyncing ? 'SYNCING IN PROGRESS...' : '▶ RUN PRODUCTION SYNC'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!entity) return null;

  return (
    <div className="din-config">
      {/* Schema definition */}
      <div className="din-cfg-schema" style={{ width: '300px', padding: '16px', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ color: '#fff', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{entity.name} Schema</span>
          <button onClick={handleDownloadTemplate} style={{ background: '#27272a', color: '#0ea5e9', border: '1px solid #0ea5e950', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}>Download Template</button>
        </div>
        <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#a1a1aa', borderBottom: '1px solid #3f3f46' }}>
              <th style={{ paddingBottom: '6px' }}>Field</th>
              <th style={{ paddingBottom: '6px' }}>Type</th>
              <th style={{ paddingBottom: '6px', textAlign: 'center' }}>Req</th>
            </tr>
          </thead>
          <tbody>
            {entity.fields.map(f => (
              <tr key={f.n} style={{ borderBottom: '1px solid #27272a' }}>
                <td style={{ padding: '6px 0', color: '#0ea5e9', fontFamily: 'monospace' }}>{f.n}</td>
                <td style={{ padding: '6px 0', color: '#d4d4d8' }}>{f.t}</td>
                <td style={{ padding: '6px 0', textAlign: 'center', color: f.r ? '#10b981' : '#52525b' }}>●</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Data Profiling Panel */}
        {dataProfile[selectedNode] && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #3f3f46', paddingTop: '12px' }}>
            <div style={{ color: '#d4d4d8', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Data Profiling</div>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {Object.entries(dataProfile[selectedNode]).map(([col, stats]) => (
                <div key={col} style={{ marginBottom: '8px', fontSize: '10px', background: '#18181b', padding: '6px', borderRadius: '4px' }}>
                  <div style={{ color: '#0ea5e9', fontWeight: 600 }}>{col}</div>
                  <div style={{ color: '#a1a1aa' }}>Unique: {stats.unique} | Missing: {stats.missing}</div>
                  {stats.isNumeric && <div style={{ color: '#a1a1aa' }}>Min: {stats.min} | Max: {stats.max} | Mean: {stats.mean}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Input area */}
      <div className="din-cfg-input" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #27272a', paddingBottom: '12px', marginBottom: '16px' }}>
          {['file', 'preview', 'health', 'sql', 'schedule'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setCfgTab(tab)}
              style={{ 
                background: 'transparent', border: 'none', color: cfgTab === tab ? '#fff' : '#71717a',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: '4px 8px'
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {cfgTab === 'file' && (
            nodeState.status === 'loaded' || nodeState.status === 'mapping_req' || nodeState.status === 'error' ? (
              <div style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', padding: '16px', textAlign: 'center' }}>
                <div style={{ color: '#fff', fontSize: '13px', marginBottom: '4px' }}>{nodeState.fname} loaded</div>
                <div style={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '16px' }}>{nodeState.rows.length} rows parsed</div>
                <button 
                  onClick={() => clearNode(selectedNode)}
                  style={{ background: '#3f3f46', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                >
                  Clear Data
                </button>
              </div>
            ) : (
              <div 
                onDragOver={e => { e.preventDefault(); setDrag(true); }} 
                onDragLeave={() => setDrag(false)} 
                onDrop={handleFileDrop}
                onClick={() => fref.current?.click()}
                style={{ 
                  border: `2px dashed ${drag ? '#0ea5e9' : '#3f3f46'}`, background: drag ? '#0ea5e910' : '#18181b',
                  borderRadius: '6px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                }}
              >
                <input ref={fref} type="file" accept=".csv,.xlsx,.xls" hidden onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📁</div>
                <div style={{ color: '#d4d4d8', fontSize: '12px' }}>Drop file or <strong>browse</strong></div>
              </div>
            )
          )}

          {cfgTab === 'preview' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#a1a1aa', fontSize: '12px' }}>
                  {nodeState.rows.length} rows loaded.
                </div>
                {nodeState.rows.length > 0 && (
                  <button 
                    onClick={() => autoFixData(selectedNode)}
                    style={{ background: '#27272a', color: '#10b981', border: '1px solid #10b98150', borderRadius: '4px', padding: '6px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ✨ Auto-Fix Issues
                  </button>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'auto', border: '1px solid #3f3f46', borderRadius: '6px', background: '#18181b' }}>
                {nodeState.rows.length === 0 ? (
                  <div style={{ color: '#71717a', fontSize: '12px', textAlign: 'center', padding: '24px' }}>No data available for preview. Upload a file first.</div>
                ) : (
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#27272a' }}>
                      <tr>
                        <th style={{ padding: '8px', color: '#a1a1aa', borderBottom: '1px solid #3f3f46' }}>#</th>
                        {Object.keys(nodeState.rows[0]).map(k => (
                          <th key={k} style={{ padding: '8px', color: '#d4d4d8', borderBottom: '1px solid #3f3f46' }}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {nodeState.rows.slice(0, 100).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #27272a' }}>
                          <td style={{ padding: '6px 8px', color: '#71717a' }}>{idx + 1}</td>
                          {Object.entries(row).map(([k, v], i) => {
                            // Highlight outliers based on simplistic logic if profile exists
                            let isOutlier = false;
                            const prof = dataProfile[selectedNode]?.[k];
                            if (prof?.mean && typeof v === 'number' && v > (prof.mean * 3)) isOutlier = true;
                            
                            return (
                              <td key={i} style={{ padding: '6px 8px', color: isOutlier ? '#ef4444' : '#a1a1aa', fontWeight: isOutlier ? 600 : 'normal' }}>
                                {String(v)}
                                {isOutlier && <span title="Potential outlier detected" style={{marginLeft:'4px'}}>⚠️</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {cfgTab === 'health' && (
            <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
              <h3 style={{ color: '#d4d4d8', fontSize: '14px', marginBottom: '16px' }}>Pipeline Health Dashboard</h3>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <div style={{ flex: 1, background: '#18181b', border: '1px solid #3f3f46', padding: '16px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '8px' }}>Success Rate</div>
                  <div style={{ color: healthStats.successRate >= 90 ? '#10b981' : '#ef4444', fontSize: '24px', fontWeight: 700 }}>
                    {healthStats.successRate}%
                  </div>
                </div>
                <div style={{ flex: 1, background: '#18181b', border: '1px solid #3f3f46', padding: '16px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '8px' }}>Rows Processed</div>
                  <div style={{ color: '#0ea5e9', fontSize: '24px', fontWeight: 700 }}>
                    {healthStats.rowsProcessed}
                  </div>
                </div>
                <div style={{ flex: 1, background: '#18181b', border: '1px solid #3f3f46', padding: '16px', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '8px' }}>Last Run</div>
                  <div style={{ color: '#d4d4d8', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>
                    {healthStats.lastRun || 'Never'}
                  </div>
                </div>
              </div>

              <h4 style={{ color: '#d4d4d8', fontSize: '13px', marginBottom: '12px' }}>Recent Alerts</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {alerts.length === 0 ? (
                  <div style={{ color: '#71717a', fontSize: '12px' }}>No recent alerts.</div>
                ) : (
                  alerts.map(a => (
                    <div key={a.id} style={{ padding: '12px', borderRadius: '6px', background: a.type === 'error' ? '#ef444410' : (a.type === 'success' ? '#10b98110' : '#3b82f610'), border: `1px solid ${a.type === 'error' ? '#ef444450' : (a.type === 'success' ? '#10b98150' : '#3b82f650')}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: a.type === 'error' ? '#ef4444' : (a.type === 'success' ? '#10b981' : '#3b82f6'), fontSize: '12px', fontWeight: 600 }}>{a.title}</span>
                        <span style={{ color: '#a1a1aa', fontSize: '10px' }}>{a.time}</span>
                      </div>
                      <div style={{ color: '#d4d4d8', fontSize: '11px' }}>{a.msg}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {cfgTab === 'sql' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '8px' }}>Only read-only SELECT queries are supported via this API.</div>
              <textarea 
                value={sql} onChange={e => setSql(e.target.value)} 
                placeholder={`SELECT * FROM ${entity.tbl} LIMIT 10;`} spellCheck={false}
                style={{ flex: 1, maxHeight: '100px', background: '#18181b', border: '1px solid #3f3f46', borderRadius: '4px', padding: '12px', color: '#0ea5e9', fontFamily: 'monospace', fontSize: '12px', resize: 'none', outline: 'none', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button 
                  disabled={!sql.trim()} 
                  onClick={handleExecuteSQL}
                  style={{ background: '#0ea5e9', color: '#000', border: 'none', padding: '6px 16px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Execute SQL
                </button>
              </div>
              <div style={{ flex: 1, background: '#18181b', border: '1px solid #3f3f46', borderRadius: '4px', padding: '12px', overflow: 'auto', color: '#d4d4d8', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {sqlResult || 'Query results will appear here...'}
              </div>
            </div>
          )}

          {cfgTab === 'schedule' && (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ color: '#d4d4d8', fontSize: '14px', fontWeight: 600 }}>Webhook &amp; API Sync</div>
              <div>
                <label style={{ display: 'block', color: '#a1a1aa', fontSize: '11px', marginBottom: '4px' }}>POST URL (Auto-generated)</label>
                <input
                  type="text" readOnly
                  value={`http://localhost:8000/api/ingest/${selectedNode}`}
                  style={{ width: '100%', padding: '8px', background: '#18181b', border: '1px solid #3f3f46', color: '#0ea5e9', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>
              <div style={{ borderTop: '1px solid #27272a', margin: '4px 0' }} />
              <div style={{ color: '#d4d4d8', fontSize: '14px', fontWeight: 600 }}>Automated Scheduling (CRON)</div>
              <div style={{ color: '#a1a1aa', fontSize: '11px' }}>Schedule automatic data ingestion from external systems.</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={cronFreq}
                  onChange={e => setCronFreq(e.target.value)}
                  style={{ flex: 1, padding: '8px', background: '#18181b', border: '1px solid #3f3f46', color: '#d4d4d8', borderRadius: '4px', fontSize: '12px' }}
                >
                  <option>Every 1 Hour</option>
                  <option>Every 6 Hours</option>
                  <option>Daily at Midnight</option>
                  <option>Weekly on Sunday</option>
                </select>
                <button
                  onClick={() => setSchedule(selectedNode, cronFreq)}
                  style={{ background: '#27272a', color: '#10b981', border: '1px solid #10b98150', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  ✅ Schedule Sync
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
