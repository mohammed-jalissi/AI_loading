import { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import EntityNode    from './nodes/EntityNode';
import ActionNode    from './nodes/ActionNode';
import TransformNode from './nodes/TransformNode';
import { useIngestionStore } from './store';

const nodeTypes = {
  entityNode:    EntityNode,
  actionNode:    ActionNode,
  transformNode: TransformNode,
};

const initialNodes = [
  { id: 'navires', type: 'entityNode',  position: { x: 40,  y: 60  }, data: { id: 'navires' } },
  { id: 'lots',    type: 'entityNode',  position: { x: 40,  y: 200 }, data: { id: 'lots'    } },
  { id: 'stocks',  type: 'entityNode',  position: { x: 40,  y: 340 }, data: { id: 'stocks'  } },
  { id: 'arrets',  type: 'entityNode',  position: { x: 40,  y: 480 }, data: { id: 'arrets'  } },
  { id: 'mapper',  type: 'actionNode',  position: { x: 340, y: 100 }, data: { id: 'mapper'  } },
  { id: 'valid',   type: 'actionNode',  position: { x: 340, y: 320 }, data: { id: 'valid'   } },
  { id: 'sync',    type: 'actionNode',  position: { x: 620, y: 210 }, data: { id: 'sync'    } },
];

const initialEdges = [
  { id: 'e-nav-map',   source: 'navires', target: 'mapper', animated: true },
  { id: 'e-lot-map',   source: 'lots',    target: 'mapper', animated: true },
  { id: 'e-stk-map',   source: 'stocks',  target: 'mapper', animated: true },
  { id: 'e-art-map',   source: 'arrets',  target: 'mapper', animated: true },
  { id: 'e-map-val',   source: 'mapper',  target: 'valid',  animated: true },
  { id: 'e-val-sync',  source: 'valid',   target: 'sync',   animated: true },
];

/* ───────── status-badge styles ───────── */
const badge = (color) => ({
  display: 'inline-block',
  width: 8, height: 8,
  borderRadius: '50%',
  background: color,
  marginRight: 5,
  boxShadow: `0 0 6px ${color}`,
});

export default function CanvasArea() {
  const wrapperRef = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [rfInstance, setRfInstance] = useState(null);

  const { isSyncing, supabaseStatus, syncProgress } = useIngestionStore();

  /* connect two nodes */
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  /* drag-over → allow drop */
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  /* drop a node from the sidebar */
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (!rfInstance) return;

      const bounds = wrapperRef.current.getBoundingClientRect();
      const raw    = e.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      const { type, id } = JSON.parse(raw);

      /* allow multiple transform nodes by giving them a unique suffix */
      const uniqueId = ['join', 'filter', 'aggregate'].includes(id)
        ? `${id}_${Date.now()}`
        : id;

      if (!['join', 'filter', 'aggregate'].includes(id) && nodes.find(n => n.id === id)) return;

      const position = rfInstance.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      setNodes((nds) => nds.concat({ id: uniqueId, type, position, data: { id } }));
    },
    [rfInstance, nodes, setNodes],
  );

  /* pulse edges while syncing */
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: {
          stroke:      isSyncing ? '#2563eb' : '#3f3f46',
          strokeWidth: isSyncing ? 2 : 1,
        },
      })),
    );
  }, [isSyncing, setEdges]);

  /* ── Supabase status color ── */
  const sbColor =
    supabaseStatus === 'connected' ? '#10b981' :
    supabaseStatus === 'offline'   ? '#ef4444' : '#f59e0b';

  return (
    <div
      className="din-nodes-area"
      ref={wrapperRef}
      style={{ height: '100%', width: '100%', background: '#0a0a0b', position: 'relative' }}
    >
      {/* ── top HUD bar ── */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', alignItems: 'center', gap: 16,
        background: '#18181b', border: '1px solid #27272a',
        borderRadius: 8, padding: '6px 16px', fontSize: 11,
      }}>
        {/* Supabase status */}
        <span>
          <span style={badge(sbColor)} />
          <span style={{ color: '#a1a1aa' }}>Supabase:</span>{' '}
          <span style={{ color: sbColor, fontWeight: 600, textTransform: 'capitalize' }}>
            {supabaseStatus}
          </span>
        </span>

        {/* Progress bar (only while syncing) */}
        {isSyncing && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#a1a1aa' }}>Syncing…</span>
            <span style={{
              width: 100, height: 6, background: '#27272a', borderRadius: 3, overflow: 'hidden',
            }}>
              <span style={{
                display: 'block', height: '100%', borderRadius: 3,
                width: `${syncProgress}%`, background: '#2563eb',
                transition: 'width 0.3s ease',
              }} />
            </span>
            <span style={{ color: '#2563eb', fontWeight: 700 }}>{Math.round(syncProgress)}%</span>
          </span>
        )}

      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        deleteKeyCode="Delete"
      >
        <Background color="#27272a" gap={20} size={1} />
        <Controls style={{ background: '#18181b', border: '1px solid #3f3f46' }} />

      </ReactFlow>
    </div>
  );
}
