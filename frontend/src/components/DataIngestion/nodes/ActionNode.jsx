import { Handle, Position } from '@xyflow/react';
import { useIngestionStore } from '../store';

export default function ActionNode({ id, data }) {
  const { nodesData, selectedNode, setSelectedNode, isSyncing, syncProgress, crossValErrors, syncHistory } = useIngestionStore();
  const isSelected = selectedNode === id;
  
  const loadedCount = Object.values(nodesData).filter(n => n.status === 'loaded').length;
  const totalRows = Object.values(nodesData).reduce((s, n) => s + (n.rows?.length || 0), 0);

  const isActive = loadedCount > 0;

  let color = '#27272a';
  let title = '';
  let icon = '';
  let info1 = '';
  let info2 = '';

  if (id === 'mapper') {
    color = '#f59e0b'; title = 'Data Mapper'; icon = '🔀';
    info1 = `Rules: ${isActive ? loadedCount + ' Active' : 'Idle'}`;
    info2 = `Errors: 0`;
  } else if (id === 'valid') {
    color = '#10b981'; title = 'Validation'; icon = '✅';
    info1 = `Rows: ${totalRows || '—'}`;
    info2 = `Cross-Val Errors: ${crossValErrors?.length || 0}`;
  } else if (id === 'sync') {
    color = '#2563eb'; title = 'Supabase Sync'; icon = '☁️';
    info1 = `Tables: ${isActive ? loadedCount + ' targets' : 'Idle'}`;
    info2 = `Syncs: ${syncHistory?.length || 0} history`;
  }

  return (
    <div 
      className={`din-node ${isSelected ? 'sel' : ''}`}
      onClick={() => setSelectedNode(id)}
      style={{
        background: '#161618',
        border: `1px solid ${isSelected ? color : '#27272a'}`,
        borderRadius: '6px',
        width: '180px',
        color: '#d4d4d8',
        fontSize: '11px',
        boxShadow: isSelected ? `0 0 10px ${color}33` : 'none'
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: isActive ? '#2563eb' : '#27272a', border: 'none' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid #27272a', background: `${color}12`, borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
        <div style={{ color: color, marginRight: '6px' }}>{icon}</div>
        <div style={{ fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ padding: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: '#71717a' }}>{info1.split(':')[0]}:</span>
          <span style={{ color: isActive ? color : '#d4d4d8' }}>{info1.split(':')[1]}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#71717a' }}>{info2.split(':')[0]}:</span>
          <span>{info2.split(':')[1]}</span>
        </div>
        
        {id === 'sync' && isActive && (
          <div style={{ marginTop: '8px' }}>
            {isSyncing && (
              <div style={{ width: '100%', height: '4px', background: '#27272a', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${syncProgress}%`, height: '100%', background: '#2563eb', transition: 'width 0.3s' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {id !== 'sync' && (
        <Handle type="source" position={Position.Right} style={{ background: isActive ? '#10b981' : '#27272a', border: 'none' }} />
      )}
    </div>
  );
}
