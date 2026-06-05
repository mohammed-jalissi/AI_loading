import { Handle, Position } from '@xyflow/react';
import { useIngestionStore } from '../store';
import { ENTITIES } from '../schema';

export default function EntityNode({ id: nodeId, data }) {
  const { nodesData, selectedNode, setSelectedNode, dataProfile } = useIngestionStore();
  const entity = ENTITIES.find(e => e.id === data.id);
  const nodeState = nodesData[data.id];
  const hasProfile = !!dataProfile[data.id];

  const isSelected = selectedNode === data.id;

  return (
    <div 
      className={`din-node ${isSelected ? 'sel' : ''}`}
      onClick={() => setSelectedNode(data.id)}
      style={{
        background: '#161618',
        border: `1px solid ${isSelected ? '#0ea5e9' : '#27272a'}`,
        borderRadius: '6px',
        width: '220px',
        color: '#d4d4d8',
        fontSize: '11px',
        boxShadow: isSelected ? '0 0 10px rgba(14, 165, 233, 0.2)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid #27272a', background: '#1c1c1f', borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}>
        <div style={{ color: '#0ea5e9', marginRight: '6px', display: 'flex' }}>
          {/* Mock Icon, since we can't easily import the SVG here directly without creating a shared icons file, we'll just use a generic or emoji for now, or you can copy the SVGs to a shared file */}
          📦
        </div>
        <div style={{ fontWeight: 600 }}>{entity.name}</div>
        <div style={{ 
          marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%',
          background: nodeState.status === 'loaded' ? '#10b981' : nodeState.status === 'error' ? '#ef4444' : nodeState.status === 'mapping_req' ? '#f59e0b' : '#52525b'
        }} />
      </div>
      <div style={{ padding: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: '#71717a' }}>Status:</span>
          <span style={{ 
            color: nodeState.status === 'loaded' ? '#10b981' : nodeState.status === 'error' ? '#ef4444' : nodeState.status === 'mapping_req' ? '#f59e0b' : '#d4d4d8'
          }}>
            {nodeState.status === 'loaded' ? 'Loaded' : nodeState.status === 'error' ? 'Invalid' : nodeState.status === 'mapping_req' ? 'Mapping Req.' : 'Empty'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{nodeState.rows.length || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: '#71717a' }}>Profiled:</span>
          <span style={{ color: hasProfile ? '#0ea5e9' : '#52525b' }}>{hasProfile ? 'Yes' : 'No'}</span>
        </div>
      </div>
      
      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: nodeState.status === 'loaded' ? '#10b981' : '#27272a', width: '8px', height: '8px', border: 'none' }}
      />
    </div>
  );
}
