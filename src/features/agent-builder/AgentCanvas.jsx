import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Toggle } from '../../components/Toggle/Toggle';
import {
  ReactFlow,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Icon } from '../../components/Icon/Icon';
import { CloseIcon } from '../../components/Icon/CloseIcon';
import { Button } from '../../components/Button/Button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { useAppStore } from '../../store/useAppStore';
import { NodePanel } from './NodePanel';
import { NodeSettings } from './NodeSettings';
import { ChatPanel } from './ChatPanel';
import { GlobalSettings } from './GlobalSettings';
import { ConfigurePanel } from './ConfigurePanel';
import { AnalyticsPanel } from './AnalyticsPanel';
import { ConversationNode, StartNode, EndNode } from './nodes/ConversationNode';
import styles from './AgentCanvas.module.css';

const nodeTypes = {
  conversationNode: ConversationNode,
  startNode: StartNode,
  endNode: EndNode,
};

const BUILDER_TABS = ['Workflow', 'Configure', 'Analytics'];

let nodeIdCounter = 100;
function getNextId() {
  return `n${++nodeIdCounter}`;
}

/* Inline icons for the canvas-mode toggle. Kept inline (not in the
   shared icon module) because they're tiny and only used here. The
   select cursor matches the Iconoir cursor-pointer the user requested
   so the cursor on the canvas and the toggle button stay visually in
   sync. */
function SelectCursorIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        d="M19.503 9.97c1.204.489 1.112 2.224-.137 2.583l-6.305 1.813l-2.88 5.895c-.571 1.168-2.296.957-2.569-.314L4.677 6.257A1.369 1.369 0 0 1 6.53 4.7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PanHandIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 13V5a1.5 1.5 0 1 1 3 0v6m0-1.5V4a1.5 1.5 0 1 1 3 0v7m0-1V5.5a1.5 1.5 0 1 1 3 0V13m0-2.5a1.5 1.5 0 1 1 3 0V15a6 6 0 0 1-6 6h-1.5a5 5 0 0 1-3.536-1.464l-3.864-3.864a1.5 1.5 0 1 1 2.121-2.122L8 15.5"
      />
    </svg>
  );
}

const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 480;
const DEFAULT_PANEL_WIDTH = 300;

export function AgentCanvas() {
  const builderAgent = useAppStore(s => s.builderAgent);
  const builderFlow = useAppStore(s => s.builderFlow);
  const builderFlowLoading = useAppStore(s => s.builderFlowLoading);
  const builderSelectedNode = useAppStore(s => s.builderSelectedNode);
  const builderVersions = useAppStore(s => s.builderVersions);
  const setBuilderSelectedNode = useAppStore(s => s.setBuilderSelectedNode);
  const closeBuilder = useAppStore(s => s.closeBuilder);
  const saveFlow = useAppStore(s => s.saveFlow);
  const createFlowVersion = useAppStore(s => s.createFlowVersion);
  const validateBuilderAgent = useAppStore(s => s.validateBuilderAgent);
  const bumpBuilderValidationAttempt = useAppStore(s => s.bumpBuilderValidationAttempt);
  const showToast = useAppStore(s => s.showToast);

  // Undo/redo history (local — applied via setNodes/setEdges).
  // `past` holds previous flow snapshots; `future` holds states unwound by undo.
  const [history, setHistory] = useState({ past: [], future: [] });
  const skipHistory = useRef(false);
  const HISTORY_LIMIT = 50;

  const captureHistory = useCallback((prevNodes, prevEdges) => {
    if (skipHistory.current) return;
    setHistory(h => ({
      past: [...h.past, { nodes: prevNodes, edges: prevEdges }].slice(-HISTORY_LIMIT),
      future: [],
    }));
  }, []);

  // Auto-save status indicator
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const autoSaveTimer = useRef(null);
  const lastSavedSnapshot = useRef('');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeTab, setActiveTab] = useState('Workflow');
  const [rightTab, setRightTab] = useState('Workflow Assistant');
  // Canvas interaction mode: 'select' (left-drag = lasso) or 'pan' (left-drag = pan).
  // Mirrors the Figma / Miro pattern. Persisted to sessionStorage so the
  // mode survives reloads while the user is iterating on a flow.
  const [canvasMode, setCanvasMode] = useState(() => sessionStorage.getItem('builderCanvasMode') || 'select');
  useEffect(() => { sessionStorage.setItem('builderCanvasMode', canvasMode); }, [canvasMode]);
  const [saving, setSaving] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const hasUnsavedChanges = useRef(false);
  const reactFlowWrapper = useRef(null);
  const reactFlowInstance = useRef(null);
  // Warn on browser refresh with unsaved changes
  useEffect(() => {
    const handler = (e) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Load flow data when it arrives
  useEffect(() => {
    if (builderFlow) {
      const flowNodes = (builderFlow.nodes || []).map(n => ({
        ...n,
        data: { ...n.data },
      }));
      setNodes(flowNodes);
      setEdges(builderFlow.edges || []);
      const maxId = flowNodes.reduce((max, n) => {
        const num = parseInt(n.id.replace(/\D/g, ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 100);
      nodeIdCounter = maxId;
    }
  }, [builderFlow?.id]);

  // Sync node data changes from store (e.g. transitions edited in NodeSettings) back to React Flow
  useEffect(() => {
    if (!builderFlow?.nodes) return;
    setNodes(prev => prev.map(n => {
      const storeNode = builderFlow.nodes.find(sn => sn.id === n.id);
      if (storeNode && storeNode.data !== n.data) {
        return { ...n, data: { ...storeNode.data } };
      }
      return n;
    }));
  }, [builderFlow?.nodes]);

  const onConnect = useCallback((params) => {
    captureHistory(nodes, edges);
    hasUnsavedChanges.current = true;
    setEdges(eds => addEdge({
      ...params,
      type: 'smoothstep',
      animated: false,
      style: { stroke: 'var(--neutral-150)', strokeWidth: 1.5 },
    }, eds));
  }, [setEdges, captureHistory, nodes, edges]);

  const wrappedOnNodesChange = useCallback((changes) => {
    if (changes.some(c => c.type === 'position' || c.type === 'remove' || c.type === 'add')) {
      hasUnsavedChanges.current = true;
    }
    onNodesChange(changes);
  }, [onNodesChange]);

  // Snapshot pre-drag state so a single Cmd+Z reverses an entire drag
  const handleNodeDragStart = useCallback(() => {
    captureHistory(nodes, edges);
  }, [captureHistory, nodes, edges]);

  const wrappedOnEdgesChange = useCallback((changes) => {
    if (changes.some(c => c.type === 'remove' || c.type === 'add')) {
      hasUnsavedChanges.current = true;
    }
    onEdgesChange(changes);
  }, [onEdgesChange]);

  const onNodeClick = useCallback((_, node) => {
    if (node.type === 'startNode') return;
    setBuilderSelectedNode(node.id);
    // Zoom and center on the clicked node
    reactFlowInstance.current?.fitView({
      nodes: [node],
      padding: 0.5,
      duration: 300,
    });
  }, [setBuilderSelectedNode]);

  const onPaneClick = useCallback(() => {
    setBuilderSelectedNode(null);
  }, [setBuilderSelectedNode]);

  const onInit = useCallback((instance) => {
    reactFlowInstance.current = instance;
    if (builderFlow?.viewport) {
      instance.setViewport(builderFlow.viewport);
    }
  }, [builderFlow?.viewport]);

  // Track zoom
  const onMoveEnd = useCallback((_, viewport) => {
    setZoomLevel(Math.round(viewport.zoom * 100));
  }, []);

  // Drag & Drop support
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/reactflow');
    if (!raw) return;
    const { nodeType, label } = JSON.parse(raw);
    const instance = reactFlowInstance.current;
    if (!instance) return;

    // screenToFlowPosition takes screen coords directly. The earlier
    // subtraction by wrapper bounds was a leftover from the older
    // `project()` API and double-offset the drop position. Center the
    // node on the cursor (default node width ~280px, height ~80px).
    const position = instance.screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    position.x -= 140;
    position.y -= 40;

    const isEnd = nodeType === 'end';
    const newNode = {
      id: getNextId(),
      type: isEnd ? 'endNode' : 'conversationNode',
      position,
      data: {
        label: label || 'New Node',
        prompt: '',
        nodeType: isEnd ? 'end' : nodeType,
        transitions: [],
        guardrails: '',
      },
    };

    captureHistory(nodes, edges);
    setNodes(nds => [...nds, newNode]);
  }, [setNodes, captureHistory, nodes, edges]);

  // ─── Delete selected nodes (Delete / Backspace) ───
  // Handles both: a single click-selected node (builderSelectedNode in
  // the store) and a rectangle multi-selection (React Flow marks each
  // dragged-over node with selected: true). Start nodes are protected.
  const onKeyDown = useCallback((e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    // Don't trigger when typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    const multiSelectedIds = nodes.filter(n => n.selected && n.type !== 'startNode').map(n => n.id);
    const ids = multiSelectedIds.length > 0
      ? multiSelectedIds
      : (builderSelectedNode && nodes.find(n => n.id === builderSelectedNode)?.type !== 'startNode'
          ? [builderSelectedNode]
          : []);
    if (ids.length === 0) return;

    captureHistory(nodes, edges);
    const idSet = new Set(ids);
    setNodes(nds => nds.filter(n => !idSet.has(n.id)));
    setEdges(eds => eds.filter(e => !idSet.has(e.source) && !idSet.has(e.target)));
    setBuilderSelectedNode(null);
    showToast(ids.length > 1 ? `${ids.length} nodes deleted` : 'Node deleted');
  }, [builderSelectedNode, nodes, edges, setNodes, setEdges, setBuilderSelectedNode, showToast, captureHistory]);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  // ─── Delete node handler (for button click) ───
  const handleDeleteNode = useCallback((nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node?.type === 'startNode') return;
    captureHistory(nodes, edges);
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setBuilderSelectedNode(null);
    showToast('Node deleted');
  }, [nodes, setNodes, setEdges, setBuilderSelectedNode, showToast]);

  // ─── Resizable panel ───
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (e) => {
      const diff = startX - e.clientX;
      const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidth + diff));
      setPanelWidth(newWidth);
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [panelWidth]);

  // Save
  // Explicit Save = bump version (+0.1). Validates required Global Settings
  // first; if invalid, surface the errors instead of silently failing.
  const handleSave = async () => {
    const { valid, errors } = validateBuilderAgent();
    if (!valid) {
      const first = Object.values(errors)[0];
      showToast(first || 'Please complete required fields in Global Settings');
      // Make sure the user can see/fix the errors: bring them to the
      // workflow tab and switch the right rail to Global Settings.
      setActiveTab('Workflow');
      setRightTab('Global Settings');
      // Tell GlobalSettings to surface inline errors immediately
      bumpBuilderValidationAttempt();
      return;
    }
    setSaving(true);
    const viewport = reactFlowInstance.current?.getViewport() || { x: 0, y: 0, zoom: 1 };
    const newVersion = await createFlowVersion(nodes, edges, viewport);
    hasUnsavedChanges.current = false;
    setSaving(false);
    if (newVersion) showToast(`Saved as v${newVersion}`);
  };

  // Auto-save: debounced silent saveFlow on flow changes. No toast, no
  // version bump — just keeps the draft on disk so a reload doesn't
  // lose work. Skipped while loading and while an explicit save is in
  // flight to avoid racing.
  useEffect(() => {
    if (!builderFlow || saving) return;
    const snapshot = JSON.stringify({ nodes, edges });
    if (snapshot === lastSavedSnapshot.current) return;
    clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus('idle');
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus('saving');
      const viewport = reactFlowInstance.current?.getViewport() || { x: 0, y: 0, zoom: 1 };
      await saveFlow(nodes, edges, viewport);
      lastSavedSnapshot.current = snapshot;
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 1500);
    }, 1500);
    return () => clearTimeout(autoSaveTimer.current);
  }, [nodes, edges, builderFlow, saving, saveFlow]);

  // Undo / Redo — pop from past/future and apply via setNodes/setEdges.
  // skipHistory prevents the resulting state change from re-recording.
  const handleUndo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      skipHistory.current = true;
      setNodes(prev.nodes);
      setEdges(prev.edges);
      requestAnimationFrame(() => { skipHistory.current = false; });
      return {
        past: h.past.slice(0, -1),
        future: [...h.future, { nodes, edges }],
      };
    });
  }, [nodes, edges, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h;
      const next = h.future[h.future.length - 1];
      skipHistory.current = true;
      setNodes(next.nodes);
      setEdges(next.edges);
      requestAnimationFrame(() => { skipHistory.current = false; });
      return {
        past: [...h.past, { nodes, edges }],
        future: h.future.slice(0, -1),
      };
    });
  }, [nodes, edges, setNodes, setEdges]);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Keyboard shortcuts:
  //   ⌘/Ctrl+Z       — undo
  //   ⌘/Ctrl+⇧+Z / Y — redo
  //   V              — switch to Select tool
  //   H              — switch to Hand (Pan) tool
  useEffect(() => {
    const onKey = (e) => {
      // Skip when user is typing in an input/textarea
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      const key = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (mod) {
        if (key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
        else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); handleRedo(); }
        return;
      }
      if (key === 'v') { e.preventDefault(); setCanvasMode('select'); }
      else if (key === 'h') { e.preventDefault(); setCanvasMode('pan'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

  // Close with unsaved changes check
  const handleCloseBuilder = useCallback(() => {
    if (hasUnsavedChanges.current) {
      setShowCloseDialog(true);
    } else {
      closeBuilder();
    }
  }, [closeBuilder]);

  // Save as new version
  const handleSaveVersion = async () => {
    setSaving(true);
    const viewport = reactFlowInstance.current?.getViewport() || { x: 0, y: 0, zoom: 1 };
    const ver = await createFlowVersion(nodes, edges, viewport);
    setSaving(false);
    showToast(`Version ${ver} created`);
    setShowVersions(false);
  };

  // ─── Auto-arrange nodes in execution order ───
  const handleAutoArrange = useCallback(() => {
    if (!nodes.length) return;
    captureHistory(nodes, edges);

    // Build adjacency list from edges
    const adj = {};
    const inDegree = {};
    nodes.forEach(n => { adj[n.id] = []; inDegree[n.id] = 0; });
    edges.forEach(e => {
      if (adj[e.source]) adj[e.source].push(e.target);
      if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    });

    // Topological sort (BFS / Kahn's algorithm)
    const queue = Object.keys(inDegree).filter(id => inDegree[id] === 0);
    const layers = [];
    const visited = new Set();
    while (queue.length) {
      const layerSize = queue.length;
      const layer = [];
      for (let i = 0; i < layerSize; i++) {
        const id = queue.shift();
        if (visited.has(id)) continue;
        visited.add(id);
        layer.push(id);
        for (const next of (adj[id] || [])) {
          inDegree[next]--;
          if (inDegree[next] <= 0 && !visited.has(next)) queue.push(next);
        }
      }
      if (layer.length) layers.push(layer);
    }
    // Add any unvisited nodes to last layer
    const unvisited = nodes.filter(n => !visited.has(n.id)).map(n => n.id);
    if (unvisited.length) layers.push(unvisited);

    // Position: horizontal layers, vertical spread within each layer
    const NODE_W = 260;
    const NODE_H = 180;
    const LAYER_GAP = 320;
    const NODE_GAP = 200;

    const newNodes = nodes.map(n => {
      let layerIdx = layers.findIndex(l => l.includes(n.id));
      if (layerIdx === -1) layerIdx = layers.length;
      const layerNodes = layers[layerIdx] || [n.id];
      const posInLayer = layerNodes.indexOf(n.id);
      const layerHeight = layerNodes.length * NODE_GAP;
      const startY = -(layerHeight / 2) + 300;

      return {
        ...n,
        position: {
          x: layerIdx * LAYER_GAP + 50,
          y: startY + posInLayer * NODE_GAP,
        },
      };
    });

    setNodes(newNodes);
    setTimeout(() => reactFlowInstance.current?.fitView({ padding: 0.3 }), 100);
    showToast('Nodes arranged in execution order');
  }, [nodes, edges, setNodes, showToast]);

  // Apply chat modification to nodes/edges
  const applyFlowUpdate = useCallback((newNodes, newEdges) => {
    captureHistory(nodes, edges);
    if (newNodes) setNodes(newNodes);
    if (newEdges) setEdges(newEdges);
    setTimeout(() => reactFlowInstance.current?.fitView({ padding: 0.3 }), 100);
  }, [setNodes, setEdges, captureHistory, nodes, edges]);

  // Selected node object
  const selectedNode = useMemo(() => {
    if (!builderSelectedNode) return null;
    return nodes.find(n => n.id === builderSelectedNode) || null;
  }, [builderSelectedNode, nodes]);

  const showNodeSettings = selectedNode && selectedNode.type !== 'startNode';

  if (!builderAgent) return null;

  return (
    <div className={styles.canvas}>
      {/* Top toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button variant="ghost" size="S" iconOnly leadingIcon="solar:arrow-left-linear" onClick={handleCloseBuilder} title="Back to Agents" />
          <span className={styles.agentName}>{builderAgent.name}</span>
          {autoSaveStatus !== 'idle' && (
            <span className={styles.autoSaveStatus}>
              {autoSaveStatus === 'saving' ? 'Saving…' : 'Auto-saved'}
            </span>
          )}
        </div>

        <div className={styles.toolbarCenter}>
          <Toggle items={BUILDER_TABS} active={activeTab} onChange={setActiveTab} />
        </div>

        <div className={styles.toolbarRight}>
          <button
            className={styles.iconBtn}
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (⌘Z)"
            aria-label="Undo"
          >
            <Icon name="solar:undo-left-linear" size={16} color={canUndo ? 'var(--neutral-400)' : 'var(--neutral-200)'} />
          </button>
          <button
            className={styles.iconBtn}
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z)"
            aria-label="Redo"
          >
            <Icon name="solar:undo-right-linear" size={16} color={canRedo ? 'var(--neutral-400)' : 'var(--neutral-200)'} />
          </button>
          <span className={styles.toolbarDivider} />
          <Button variant="secondary" size="L" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <span className={styles.toolbarDivider} />
          <Button variant="ghost" size="L" leadingIcon="solar:play-linear" disabled>
            Run Test
          </Button>
          <Button variant="ghost" size="L" disabled>
            Deploy Agent Now
          </Button>
          <button className={styles.toolbarCloseBtn} onClick={handleCloseBuilder} title="Close">
            <CloseIcon size={18} />
          </button>
        </div>
      </div>

      {/* Main content */}
      {activeTab === 'Configure' ? (
        <ConfigurePanel agent={builderAgent} onSave={handleSave} />
      ) : activeTab === 'Analytics' ? (
        <AnalyticsPanel agent={builderAgent} />
      ) : (
        <div className={styles.body}>
          <NodePanel />

          <div className={styles.flowArea} ref={reactFlowWrapper}>
            {builderFlowLoading ? (
              <div className={styles.loading}>
                <div className={styles.spinner} />
                <span>Loading workflow…</span>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={wrappedOnNodesChange}
                onEdgesChange={wrappedOnEdgesChange}
                onNodeDragStart={handleNodeDragStart}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onInit={onInit}
                onMoveEnd={onMoveEnd}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypes}
                deleteKeyCode={null}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  style: { stroke: 'var(--neutral-150)', strokeWidth: 1.5 },
                }}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.2}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                /* Canvas interaction mode toggle (bottom toolbar):
                   - 'select': left-drag draws a lasso, pan moves to middle/right mouse
                   - 'pan'   : left-drag pans the canvas, lasso disabled
                   Either way ⌘/Ctrl/Shift+click extends the selection. */
                selectionOnDrag={canvasMode === 'select'}
                selectionMode="partial"
                panOnDrag={canvasMode === 'select' ? [1, 2] : true}
                className={canvasMode === 'pan' ? styles.flowPanMode : styles.flowSelectMode}
                multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--neutral-100)" />
                <MiniMap
                  className={styles.minimap}
                  maskColor="rgba(26,6,71,.08)"
                  nodeColor={(n) => {
                    if (n.type === 'startNode') return 'var(--status-success)';
                    if (n.type === 'endNode') return 'var(--status-error)';
                    return 'var(--primary-300)';
                  }}
                  nodeStrokeWidth={3}
                  pannable
                  zoomable
                  position="bottom-left"
                  style={{ width: 160, height: 100, marginBottom: 44, marginLeft: 12 }}
                />

                {/* Bottom-left cluster — zoom-controls pill on the left,
                    Select/Pan toggle as its own pill on the right. */}
                <Panel position="bottom-left" className={styles.bottomLeftCluster}>
                  <div className={styles.zoomPanel}>
                  <button className={styles.zoomBtn} onClick={handleAutoArrange} title="Auto-arrange nodes">
                    <Icon name="solar:sort-horizontal-linear" size={14} />
                    Auto-arrange
                  </button>
                  <span className={styles.zoomDivider} />
                  <button className={styles.zoomBtn} onClick={() => reactFlowInstance.current?.fitView({ padding: 0.3 })}>
                    <Icon name="solar:full-screen-linear" size={14} />
                    Fit View
                  </button>
                  <span className={styles.zoomDivider} />
                  <button className={styles.zoomBtn} onClick={() => reactFlowInstance.current?.zoomOut()}>
                    <Icon name="solar:minus-circle-linear" size={14} />
                  </button>
                  <span className={styles.zoomLevel}>{zoomLevel}%</span>
                  <button className={styles.zoomBtn} onClick={() => reactFlowInstance.current?.zoomIn()}>
                    <Icon name="solar:add-circle-linear" size={14} />
                  </button>
                  </div>
                  <div className={styles.modeTogglePill} title="Tool (V / H)">
                    <Toggle
                      size="S"
                      active={canvasMode}
                      onChange={setCanvasMode}
                      items={[
                        { key: 'select', label: 'Select', icon: <SelectCursorIcon size={14} /> },
                        { key: 'pan', label: 'Pan', icon: <PanHandIcon size={14} /> },
                      ]}
                    />
                  </div>
                </Panel>

                <Panel position="bottom-right" className={styles.versionPanel}>
                  <div className={styles.versionWrap}>
                    <button className={styles.versionBtn} onClick={() => setShowVersions(!showVersions)}>
                      <Icon name="solar:history-linear" size={14} />
                      v{builderFlow?.version || '1.0'}
                    </button>
                    {showVersions && (
                      <div className={styles.versionDropdown}>
                        <div className={styles.versionDropdownHeader}>
                          <span>Versions</span>
                          <button className={styles.newVersionBtn} onClick={handleSaveVersion}>
                            + New Version
                          </button>
                        </div>
                        {builderVersions.map(v => (
                          <div
                            key={v.id}
                            className={`${styles.versionItem} ${v.is_current ? styles.versionItemActive : ''}`}
                            onClick={() => {
                              if (!v.is_current) {
                                useAppStore.getState().switchFlowVersion(v.id);
                                setShowVersions(false);
                              }
                            }}
                          >
                            <span>v{v.version}</span>
                            <span className={styles.versionDate}>
                              {new Date(v.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                            </span>
                            {v.is_current && <span className={styles.currentBadge}>Current</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Panel>
              </ReactFlow>
            )}
          </div>

          {/* Right panel: resize handle + settings or chat */}
          <div className={styles.rightPanelWrap} style={{ width: panelWidth }}>
            <div
              className={`${styles.resizeHandle} ${isResizing ? styles.resizeHandleActive : ''}`}
              onMouseDown={handleResizeStart}
            />
            {showNodeSettings ? (
              <NodeSettings
                node={selectedNode}
                allNodes={nodes}
                onSave={() => { hasUnsavedChanges.current = true; handleSave(); }}
                onClose={() => setBuilderSelectedNode(null)}
                onDelete={() => handleDeleteNode(selectedNode.id)}
              />
            ) : (
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div style={{ padding: '10px 12px 6px', borderBottom: '0.5px solid var(--neutral-150)', flexShrink: 0 }}>
                  <Toggle
                    items={['Workflow Assistant', 'Global Settings']}
                    active={rightTab}
                    onChange={setRightTab}
                    fullWidth
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {rightTab === 'Workflow Assistant' ? (
                    <ChatPanel
                      nodes={nodes}
                      edges={edges}
                      onApplyFlow={applyFlowUpdate}
                      agentName={builderAgent.name}
                    />
                  ) : (
                    <GlobalSettings />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unsaved changes confirmation dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-[360px] p-0 gap-0 overflow-hidden rounded-lg">
          <DialogTitle className="sr-only">Unsaved Changes</DialogTitle>
          <DialogDescription className="sr-only">You have unsaved changes. Choose to discard or save.</DialogDescription>
          <div style={{ padding: 16, borderBottom: '0.5px solid var(--neutral-150)' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-500)', marginBottom: 8 }}>
              Unsaved Changes
            </div>
            <div style={{ fontSize: 13, color: 'var(--neutral-300)', lineHeight: 1.5 }}>
              You have unsaved changes to this workflow. Would you like to save before leaving?
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: 12 }}>
            <Button variant="secondary" size="L" fullWidth style={{ flex: 1, minWidth: 0 }} onClick={() => { setShowCloseDialog(false); closeBuilder(); }}>
              Discard
            </Button>
            <Button variant="primary" size="L" fullWidth style={{ flex: 1, minWidth: 0 }} onClick={async () => { setShowCloseDialog(false); await handleSave(); closeBuilder(); }}>
              Save & Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
