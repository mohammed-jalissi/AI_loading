import { useIngestionStore } from './store';

export default function ExecutionLog() {
  const { logs, nodesData, supabaseStatus, syncHistory } = useIngestionStore();
  
  const loadedCount = Object.values(nodesData).filter(n => n.status === 'loaded').length;

  return (
    <div className="din-log">
      <div className="din-log-head">
        <span className="din-log-title">Execution Log</span>
        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
          {supabaseStatus === 'connected' && <span className="din-log-tag ok">SB: OK</span>}
          {supabaseStatus === 'offline' && <span className="din-log-tag err">SB: OFF</span>}
          <div className={`din-log-dot ${loadedCount > 0 ? 'ok' : 'idle'}`} />
        </div>
      </div>
      <div className="din-log-entries">
        {syncHistory && syncHistory.length > 0 && (
           <div className="din-log-entry" style={{background: '#1a1a2e', borderColor: '#2a2a4e'}}>
             <div className="din-log-entry-head" style={{marginBottom: '4px'}}>
               <span className="din-log-tag info">SYNC HISTORY</span>
             </div>
             {syncHistory.map((sh, idx) => (
                <div key={idx} style={{fontSize: '9px', color: '#a1a1aa', marginTop: '2px'}}>
                  <span style={{color: '#60a5fa'}}>[{new Date(sh.date).toLocaleTimeString()}]</span> {sh.entity}: {sh.status === 'ok' ? `${sh.rows} rows` : 'Failed'}
                </div>
             ))}
           </div>
        )}
        {logs.map((l, i) => (
          <div key={i} className="din-log-entry">
            <div className="din-log-entry-head">
              <span className={`din-log-tag ${l.type}`}>
                {l.type === 'ok' ? 'LOAD_OK' : l.type === 'err' ? 'ERROR' : 'INFO'}
              </span>
              <span className="din-log-time">{l.time}</span>
            </div>
            <div className="din-log-msg">{l.msg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
