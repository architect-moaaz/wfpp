import React, { useState } from 'react';
import {
  Workflow, Plus, ChevronDown, ChevronRight, Play, Pause,
  GitBranch, Settings, Trash2, Copy, MoreVertical
} from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import './WorkflowSelector.css';

const WorkflowSelector = () => {
  const {
    currentApplication,
    currentWorkflow,
    setCurrentWorkflow,
    setCurrentApplication
  } = useWorkflow();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  // Get workflows from current application
  const workflows = currentApplication?.resources?.workflows || [];

  // Separate main workflows and sub-workflows
  const mainWorkflows = workflows.filter(wf => !wf.isSubWorkflow);
  const subWorkflows = workflows.filter(wf => wf.isSubWorkflow);

  const handleSelectWorkflow = (workflow) => {
    console.log('[WorkflowSelector] Selecting workflow:', workflow.name);
    setCurrentWorkflow(workflow);
  };

  const handleAddWorkflow = async (isSubWorkflow = false) => {
    const newWorkflow = {
      id: `workflow_${Date.now()}`,
      name: isSubWorkflow ? 'New Sub Workflow' : 'New Workflow',
      description: '',
      isSubWorkflow,
      triggers: isSubWorkflow ? [{ type: 'direct_call' }] : [{ type: 'user_action' }],
      events: { emits: [], listensTo: [] },
      nodes: [
        {
          id: 'start_1',
          type: 'startProcess',
          position: { x: 250, y: 50 },
          data: { label: 'Start' }
        },
        {
          id: 'end_1',
          type: 'endEvent',
          position: { x: 250, y: 300 },
          data: { label: 'End' }
        }
      ],
      edges: []
    };

    // Add to application resources
    const updatedWorkflows = [...workflows, newWorkflow];
    const updatedApplication = {
      ...currentApplication,
      resources: {
        ...currentApplication?.resources,
        workflows: updatedWorkflows
      }
    };

    setCurrentApplication(updatedApplication);
    setCurrentWorkflow(newWorkflow);
    setShowAddMenu(false);
  };

  const handleDuplicateWorkflow = (workflow) => {
    const duplicatedWorkflow = {
      ...workflow,
      id: `workflow_${Date.now()}`,
      name: `${workflow.name} (Copy)`,
      nodes: workflow.nodes.map(node => ({
        ...node,
        id: `${node.id}_copy_${Date.now()}`
      })),
      edges: workflow.edges?.map(edge => ({
        ...edge,
        id: `${edge.id}_copy_${Date.now()}`
      })) || []
    };

    const updatedWorkflows = [...workflows, duplicatedWorkflow];
    const updatedApplication = {
      ...currentApplication,
      resources: {
        ...currentApplication?.resources,
        workflows: updatedWorkflows
      }
    };

    setCurrentApplication(updatedApplication);
    setCurrentWorkflow(duplicatedWorkflow);
    setContextMenu(null);
  };

  const handleDeleteWorkflow = (workflow) => {
    if (workflows.length <= 1) {
      alert('Cannot delete the last workflow');
      return;
    }

    const updatedWorkflows = workflows.filter(wf => wf.id !== workflow.id);
    const updatedApplication = {
      ...currentApplication,
      resources: {
        ...currentApplication?.resources,
        workflows: updatedWorkflows
      }
    };

    setCurrentApplication(updatedApplication);

    // Select another workflow if we deleted the current one
    if (currentWorkflow?.id === workflow.id) {
      setCurrentWorkflow(updatedWorkflows[0]);
    }

    setContextMenu(null);
  };

  const handleContextMenu = (e, workflow) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      workflow
    });
  };

  const getTriggerIcon = (workflow) => {
    const trigger = workflow.triggers?.[0];
    if (!trigger) return <Play size={12} />;

    switch (trigger.type) {
      case 'event':
        return <GitBranch size={12} />;
      case 'schedule':
        return <Pause size={12} />;
      case 'direct_call':
        return <Workflow size={12} />;
      default:
        return <Play size={12} />;
    }
  };

  const renderWorkflowItem = (workflow, isSubWorkflow = false) => {
    const isSelected = currentWorkflow?.id === workflow.id;

    return (
      <div
        key={workflow.id}
        className={`workflow-item ${isSelected ? 'selected' : ''} ${isSubWorkflow ? 'sub-workflow' : ''}`}
        onClick={() => handleSelectWorkflow(workflow)}
        onContextMenu={(e) => handleContextMenu(e, workflow)}
      >
        <div className="workflow-item-icon">
          {getTriggerIcon(workflow)}
        </div>
        <div className="workflow-item-info">
          <div className="workflow-item-name">{workflow.name}</div>
          <div className="workflow-item-meta">
            {workflow.nodes?.length || 0} nodes
            {workflow.events?.emits?.length > 0 && (
              <span className="event-badge emit">
                {workflow.events.emits.length} emit
              </span>
            )}
            {workflow.events?.listensTo?.length > 0 && (
              <span className="event-badge listen">
                {workflow.events.listensTo.length} listen
              </span>
            )}
          </div>
        </div>
        <button
          className="workflow-item-menu"
          onClick={(e) => handleContextMenu(e, workflow)}
        >
          <MoreVertical size={14} />
        </button>
      </div>
    );
  };

  if (!currentApplication) {
    return (
      <div className="workflow-selector empty">
        <Workflow size={24} />
        <p>No application selected</p>
      </div>
    );
  }

  return (
    <div className="workflow-selector">
      <div className="workflow-selector-header" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Workflow size={16} />
        <span>Workflows ({workflows.length})</span>
        <button
          className="add-workflow-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowAddMenu(!showAddMenu);
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {showAddMenu && (
        <div className="add-workflow-menu">
          <button onClick={() => handleAddWorkflow(false)}>
            <Play size={14} />
            <span>Main Workflow</span>
          </button>
          <button onClick={() => handleAddWorkflow(true)}>
            <Workflow size={14} />
            <span>Sub Workflow</span>
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="workflow-list">
          {mainWorkflows.length > 0 && (
            <div className="workflow-group">
              <div className="workflow-group-header">Main Workflows</div>
              {mainWorkflows.map(wf => renderWorkflowItem(wf, false))}
            </div>
          )}

          {subWorkflows.length > 0 && (
            <div className="workflow-group">
              <div className="workflow-group-header">Sub Workflows</div>
              {subWorkflows.map(wf => renderWorkflowItem(wf, true))}
            </div>
          )}

          {workflows.length === 0 && (
            <div className="no-workflows">
              <p>No workflows yet</p>
              <button onClick={() => handleAddWorkflow(false)}>
                <Plus size={14} />
                Create Workflow
              </button>
            </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="context-menu-overlay"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="workflow-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button onClick={() => handleDuplicateWorkflow(contextMenu.workflow)}>
              <Copy size={14} />
              <span>Duplicate</span>
            </button>
            <button onClick={() => {
              // Open properties panel for workflow settings
              setContextMenu(null);
            }}>
              <Settings size={14} />
              <span>Settings</span>
            </button>
            <button
              className="delete-btn"
              onClick={() => handleDeleteWorkflow(contextMenu.workflow)}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkflowSelector;
