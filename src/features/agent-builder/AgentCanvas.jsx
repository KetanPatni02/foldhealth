import '@xyflow/react/dist/style.css';

import { NodePanel } from './NodePanel';
import { ConfigurePanel } from './ConfigurePanel';
import { AnalyticsPanel } from './AnalyticsPanel';
import { ConversationNode, StartNode, EndNode } from './nodes/ConversationNode';
import { useAgentCanvas } from './useAgentCanvas';
import { AgentCanvasToolbar } from './AgentCanvasToolbar';
import { AgentCanvasFlowArea } from './AgentCanvasFlowArea';
import { AgentCanvasRightPanel } from './AgentCanvasRightPanel';
import { AgentCanvasCloseDialog } from './AgentCanvasCloseDialog';
import styles from './AgentCanvas.module.css';

const nodeTypes = {
  conversationNode: ConversationNode,
  startNode: StartNode,
  endNode: EndNode,
};

export function AgentCanvas() {
  const canvas = useAgentCanvas();
  if (!canvas.builderAgent) return null;

  const {
    builderAgent,
    builderFlow,
    builderFlowLoading,
    builderVersions,
    autoSaveStatus,
    nodes,
    edges,
    activeTab,
    setActiveTab,
    rightTab,
    setRightTab,
    canvasMode,
    setCanvasMode,
    saving,
    showVersions,
    setShowVersions,
    panelWidth,
    isResizing,
    zoomLevel,
    showCloseDialog,
    setShowCloseDialog,
    reactFlowWrapper,
    reactFlowInstance,
    wrappedOnNodesChange,
    wrappedOnEdgesChange,
    handleNodeDragStart,
    onConnect,
    onNodeClick,
    onPaneClick,
    onInit,
    onMoveEnd,
    onDragOver,
    onDrop,
    handleResizeStart,
    handleSave,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    handleCloseBuilder,
    handleSaveVersion,
    handleAutoArrange,
    applyFlowUpdate,
    selectedNode,
    showNodeSettings,
    handleDeleteNode,
    closeBuilder,
    hasUnsavedChanges,
    setBuilderSelectedNode,
  } = canvas;

  return (
    <div className={styles.canvas}>
      <AgentCanvasToolbar
        agentName={builderAgent.name}
        autoSaveStatus={autoSaveStatus}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        saving={saving}
        onSave={handleSave}
        onClose={handleCloseBuilder}
      />

      {activeTab === 'Configure' ? (
        <ConfigurePanel agent={builderAgent} onSave={handleSave} />
      ) : activeTab === 'Analytics' ? (
        <AnalyticsPanel agent={builderAgent} />
      ) : (
        <div className={styles.body}>
          <NodePanel />
          <AgentCanvasFlowArea
            nodeTypes={nodeTypes}
            nodes={nodes}
            edges={edges}
            builderFlowLoading={builderFlowLoading}
            builderFlow={builderFlow}
            builderVersions={builderVersions}
            canvasMode={canvasMode}
            setCanvasMode={setCanvasMode}
            zoomLevel={zoomLevel}
            showVersions={showVersions}
            setShowVersions={setShowVersions}
            reactFlowWrapper={reactFlowWrapper}
            reactFlowInstance={reactFlowInstance}
            wrappedOnNodesChange={wrappedOnNodesChange}
            wrappedOnEdgesChange={wrappedOnEdgesChange}
            handleNodeDragStart={handleNodeDragStart}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={onInit}
            onMoveEnd={onMoveEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            handleAutoArrange={handleAutoArrange}
            handleSaveVersion={handleSaveVersion}
          />
          <AgentCanvasRightPanel
            panelWidth={panelWidth}
            isResizing={isResizing}
            handleResizeStart={handleResizeStart}
            showNodeSettings={showNodeSettings}
            selectedNode={selectedNode}
            nodes={nodes}
            edges={edges}
            rightTab={rightTab}
            setRightTab={setRightTab}
            onSaveNode={handleSave}
            onCloseNodeSettings={() => setBuilderSelectedNode(null)}
            onDeleteNode={handleDeleteNode}
            applyFlowUpdate={applyFlowUpdate}
            agentName={builderAgent.name}
            hasUnsavedChanges={hasUnsavedChanges}
            handleSave={handleSave}
          />
        </div>
      )}

      <AgentCanvasCloseDialog
        open={showCloseDialog}
        onOpenChange={setShowCloseDialog}
        onDiscard={() => { setShowCloseDialog(false); closeBuilder(); }}
        onSaveAndClose={async () => { setShowCloseDialog(false); await handleSave(); closeBuilder(); }}
      />
    </div>
  );
}
