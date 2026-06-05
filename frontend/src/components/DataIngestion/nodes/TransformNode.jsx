import { Handle, Position } from '@xyflow/react';
import { useIngestionStore } from '../store';

const TRANSFORM_CONFIG = {
  join: {
    label: 'Join',
    icon: '🔗',
    color: '#a855f7',
    border: '#a855f750',
    bg: '#a855f710',
    description: 'Merge two sources',
  },
  filter: {
    label: 'Filter',
    icon: '🔽',
    color: '#f59e0b',
    border: '#f59e0b50',
    bg: '#f59e0b10',
    description: 'Filter rows by condition',
  },
  aggregate: {
    label: 'Aggregate',
    icon: '∑',
    color: '#0ea5e9',
    border: '#0ea5e950',
    bg: '#0ea5e910',
    description: 'Group & summarize data',
  },
};

export default function TransformNode({ data, selected }) {
  const { setSelectedNode, selectedNode } = useIngestionStore();
  const cfg = TRANSFORM_CONFIG[data.id] || TRANSFORM_CONFIG.filter;
  const isActive = selectedNode === data.id;

  return (
    <div
      onClick={() => setSelectedNode(data.id)}
      style={{
        background: cfg.bg,
        border: `2px solid ${isActive || selected ? cfg.color : cfg.border}`,
        borderRadius: '10px',
        padding: '12px 16px',
        minWidth: '140px',
        cursor: 'pointer',
        boxShadow: isActive ? `0 0 16px ${cfg.color}40` : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'all 0.2s ease',
        userSelect: 'none',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: cfg.color, border: 'none', width: 10, height: 10 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '18px' }}>{cfg.icon}</span>
        <div>
          <div style={{ color: cfg.color, fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em' }}>
            {cfg.label.toUpperCase()}
          </div>
          <div style={{ color: '#71717a', fontSize: '10px' }}>{cfg.description}</div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: cfg.color, border: 'none', width: 10, height: 10 }}
      />
    </div>
  );
}
