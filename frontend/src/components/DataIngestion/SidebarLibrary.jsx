import { useRef } from 'react';
import { ENTITIES } from './schema';
import { useIngestionStore } from './store';

const TRANSFORM_NODES = [
  { id: 'join', label: 'Join', icon: '🔗', desc: 'Merge sources' },
  { id: 'filter', label: 'Filter', icon: '🔽', desc: 'Filter rows' },
  { id: 'aggregate', label: 'Aggregate', icon: '∑', desc: 'Group data' },
];

export default function SidebarLibrary({ showLib }) {
  const { selectedNode, setSelectedNode, exportPipeline, importPipeline } = useIngestionStore();
  const importRef = useRef(null);

  const onDragStart = (event, nodeType, id) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, id }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={`din-lib ${showLib ? '' : 'hidden'}`}>
      <div className="din-lib-title">Node Library</div>
      <div className="din-lib-sub">Drag to canvas</div>
      
      <div className="din-lib-sep">Entities (Sources)</div>
      {ENTITIES.map(e => (
        <div 
          key={e.id} 
          className={`din-lib-item ${selectedNode === e.id ? 'act' : ''}`} 
          onClick={() => setSelectedNode(e.id)}
          onDragStart={(event) => onDragStart(event, 'entityNode', e.id)}
          draggable
        >
          <div className="din-lib-ico">📦</div>
          <span className="din-lib-name">{e.name.replace(' Input', '')}</span>
        </div>
      ))}
      
      <div className="din-lib-sep">Transforms & Actions</div>
      <div 
        className={`din-lib-item ${selectedNode === 'mapper' ? 'act' : ''}`}
        onClick={() => setSelectedNode('mapper')}
        onDragStart={(event) => onDragStart(event, 'actionNode', 'mapper')}
        draggable
      >
        <div className="din-lib-ico">🔀</div>
        <span className="din-lib-name">Data Mapper</span>
      </div>
      
      <div 
        className={`din-lib-item ${selectedNode === 'valid' ? 'act' : ''}`}
        onClick={() => setSelectedNode('valid')}
        onDragStart={(event) => onDragStart(event, 'actionNode', 'valid')}
        draggable
      >
        <div className="din-lib-ico">✅</div>
        <span className="din-lib-name">Validation</span>
      </div>
      
      <div 
        className={`din-lib-item ${selectedNode === 'sync' ? 'act' : ''}`}
        onClick={() => setSelectedNode('sync')}
        onDragStart={(event) => onDragStart(event, 'actionNode', 'sync')}
        draggable
      >
        <div className="din-lib-ico">☁️</div>
        <span className="din-lib-name">Supabase Sync</span>
      </div>
      <div className="din-lib-sep">Transformations</div>
      {TRANSFORM_NODES.map(t => (
        <div
          key={t.id}
          className={`din-lib-item ${selectedNode === t.id ? 'act' : ''}`}
          onClick={() => setSelectedNode(t.id)}
          onDragStart={(event) => onDragStart(event, 'transformNode', t.id)}
          draggable
          title={t.desc}
        >
          <div className="din-lib-ico">{t.icon}</div>
          <span className="din-lib-name">{t.label}</span>
        </div>
      ))}

      <div className="din-lib-sep">Pipeline</div>
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={exportPipeline}
          style={{
            width: '100%', padding: '7px', background: '#1e293b', color: '#0ea5e9',
            border: '1px solid #0ea5e940', borderRadius: '5px', fontSize: '11px',
            fontWeight: 600, cursor: 'pointer', textAlign: 'center',
          }}
        >
          ⬇ Export Pipeline
        </button>
        <button
          onClick={() => importRef.current?.click()}
          style={{
            width: '100%', padding: '7px', background: '#1e293b', color: '#a855f7',
            border: '1px solid #a855f740', borderRadius: '5px', fontSize: '11px',
            fontWeight: 600, cursor: 'pointer', textAlign: 'center',
          }}
        >
          ⬆ Import Pipeline
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json"
          hidden
          onChange={e => { if (e.target.files[0]) importPipeline(e.target.files[0]); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}
