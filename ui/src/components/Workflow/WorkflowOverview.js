import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Workflow, Play, GitBranch, Clock, Zap, ArrowRight,
  X, Maximize2, Minimize2, RefreshCw
} from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import './WorkflowOverview.css';

// Custom node for workflow representation
const WorkflowOverviewNode = ({ data, selected }) => {
  const isSubWorkflow = data.isSubWorkflow;
  const triggerIcon = useMemo(() => {
    const trigger = data.triggers?.[0];
    if (!trigger) return <Play size={14} />;
    switch (trigger.type) {
      case 'event': return <GitBranch size={14} />;
      case 'schedule': return <Clock size={14} />;
      case 'direct_call': return <Workflow size={14} />;
      default: return <Play size={14} />;
    }
  }, [data.triggers]);

  return (
    <div className={`overview-workflow-node ${selected ? 'selected' : ''} ${isSubWorkflow ? 'sub-workflow' : 'main-workflow'}`}>
      <div className="overview-node-header">
        <span className="trigger-icon">{triggerIcon}</span>
        <span className="node-name">{data.label}</span>
      </div>
      <div className="overview-node-stats">
        <span>{data.nodeCount} nodes</span>
        {data.emitsCount > 0 && (
          <span className="emit-badge">{data.emitsCount} emit</span>
        )}
        {data.listensCount > 0 && (
          <span className="listen-badge">{data.listensCount} listen</span>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  workflowOverview: WorkflowOverviewNode
};

const WorkflowOverview = ({ isModal = false, onClose }) => {
  const { currentApplication, setCurrentWorkflow, currentWorkflow } = useWorkflow();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get workflows and connections from application
  const workflows = currentApplication?.resources?.workflows || [];
  const workflowConnections = currentApplication?.resources?.workflowConnections || [];

  // Build nodes and edges for the overview diagram
  const { overviewNodes, overviewEdges } = useMemo(() => {
    const nodes = [];
    const edges = [];

    // Position workflows in a grid/hierarchy
    const mainWorkflows = workflows.filter(wf => !wf.isSubWorkflow);
    const subWorkflows = workflows.filter(wf => wf.isSubWorkflow);

    // Position main workflows horizontally
    mainWorkflows.forEach((wf, index) => {
      nodes.push({
        id: wf.id,
        type: 'workflowOverview',
        position: { x: 100 + (index * 300), y: 100 },
        data: {
          label: wf.name,
          isSubWorkflow: false,
          triggers: wf.triggers,
          nodeCount: wf.nodes?.length || 0,
          emitsCount: wf.events?.emits?.length || 0,
          listensCount: wf.events?.listensTo?.length || 0,
          workflowId: wf.id
        }
      });
    });

    // Position sub-workflows below main workflows
    subWorkflows.forEach((wf, index) => {
      nodes.push({
        id: wf.id,
        type: 'workflowOverview',
        position: { x: 150 + (index * 280), y: 280 },
        data: {
          label: wf.name,
          isSubWorkflow: true,
          triggers: wf.triggers,
          nodeCount: wf.nodes?.length || 0,
          emitsCount: wf.events?.emits?.length || 0,
          listensCount: wf.events?.listensTo?.length || 0,
          workflowId: wf.id
        }
      });
    });

    // Create edges from connections
    workflowConnections.forEach((conn, index) => {
      const sourceWf = workflows.find(wf => wf.name === conn.source || wf.id === conn.source);
      const targetWf = workflows.find(wf => wf.name === conn.target || wf.id === conn.target);

      if (sourceWf && targetWf) {
        edges.push({
          id: `conn_${index}`,
          source: sourceWf.id,
          target: targetWf.id,
          type: 'smoothstep',
          animated: conn.via === 'event',
          label: conn.via === 'event' ? conn.event : 'call',
          labelStyle: { fontSize: 10, fill: '#6b7280' },
          style: {
            stroke: conn.via === 'event' ? '#10b981' : '#8b5cf6',
            strokeWidth: 2
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: conn.via === 'event' ? '#10b981' : '#8b5cf6'
          }
        });
      }
    });

    // Also infer connections from events
    workflows.forEach(sourceWf => {
      const emits = sourceWf.events?.emits || [];
      emits.forEach(eventName => {
        workflows.forEach(targetWf => {
          if (targetWf.id === sourceWf.id) return;
          const listensTo = targetWf.events?.listensTo || [];
          if (listensTo.includes(eventName)) {
            // Check if edge already exists
            const exists = edges.some(e =>
              e.source === sourceWf.id && e.target === targetWf.id && e.label === eventName
            );
            if (!exists) {
              edges.push({
                id: `event_${sourceWf.id}_${targetWf.id}_${eventName}`,
                source: sourceWf.id,
                target: targetWf.id,
                type: 'smoothstep',
                animated: true,
                label: eventName,
                labelStyle: { fontSize: 10, fill: '#6b7280' },
                style: { stroke: '#10b981', strokeWidth: 2 },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: '#10b981'
                }
              });
            }
          }
        });
      });
    });

    return { overviewNodes: nodes, overviewEdges: edges };
  }, [workflows, workflowConnections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(overviewNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(overviewEdges);

  const handleNodeClick = useCallback((event, node) => {
    const workflow = workflows.find(wf => wf.id === node.data.workflowId);
    if (workflow) {
      setCurrentWorkflow(workflow);
      if (onClose) onClose();
    }
  }, [workflows, setCurrentWorkflow, onClose]);

  const handleRefresh = useCallback(() => {
    setNodes(overviewNodes);
    setEdges(overviewEdges);
  }, [overviewNodes, overviewEdges, setNodes, setEdges]);

  if (workflows.length === 0) {
    return (
      <div className={`workflow-overview-container ${isModal ? 'modal' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
        <div className="overview-empty">
          <Workflow size={48} />
          <h3>No Workflows</h3>
          <p>Create workflows to see the overview diagram</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`workflow-overview-container ${isModal ? 'modal' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="overview-header">
        <div className="overview-title">
          <Workflow size={18} />
          <h3>Workflow Overview</h3>
          <span className="workflow-count">{workflows.length} workflows</span>
        </div>
        <div className="overview-actions">
          <button onClick={handleRefresh} title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          {onClose && (
            <button onClick={onClose} className="close-btn">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="overview-legend">
        <div className="legend-item">
          <div className="legend-color main" />
          <span>Main Workflow</span>
        </div>
        <div className="legend-item">
          <div className="legend-color sub" />
          <span>Sub Workflow</span>
        </div>
        <div className="legend-item">
          <div className="legend-line event" />
          <span>Event Connection</span>
        </div>
        <div className="legend-item">
          <div className="legend-line direct" />
          <span>Direct Call</span>
        </div>
      </div>

      <div className="overview-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls />
          <MiniMap
            nodeColor={(node) => node.data.isSubWorkflow ? '#a855f7' : '#3b82f6'}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>

      <div className="overview-stats">
        <div className="stat-item">
          <span className="stat-value">{workflows.filter(w => !w.isSubWorkflow).length}</span>
          <span className="stat-label">Main</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{workflows.filter(w => w.isSubWorkflow).length}</span>
          <span className="stat-label">Sub</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{overviewEdges.length}</span>
          <span className="stat-label">Connections</span>
        </div>
      </div>
    </div>
  );
};

export default WorkflowOverview;
