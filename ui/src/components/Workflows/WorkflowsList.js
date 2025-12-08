import React, { useState, useEffect } from 'react';
import { GitBranch, Plus, Trash2, Edit, Calendar, CheckSquare, Square, Play, Eye, Copy } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import WorkflowCanvas from '../Canvas/WorkflowCanvas';
import WorkflowTestRunner from '../TestRun/WorkflowTestRunner';
import '../Forms/FormsList.css';
import './WorkflowsList.css';

const WorkflowsList = () => {
  const {
    currentApplication,
    currentWorkflow,
    setCurrentWorkflow,
    setActiveSidebar
  } = useWorkflow();

  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkflowIds, setSelectedWorkflowIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Update workflows from current application
  useEffect(() => {
    if (currentApplication?.resources?.workflows) {
      setWorkflows(currentApplication.resources.workflows);
      setLoading(false);
    } else {
      setWorkflows([]);
      setLoading(false);
    }
  }, [currentApplication]);

  const handleWorkflowClick = (workflow, e) => {
    if (selectionMode || e?.target?.closest('.form-checkbox')) {
      handleToggleSelect(workflow.id);
      return;
    }
    // Open in workflow editor
    handleEditWorkflow(workflow);
  };

  const handleEditWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setIsEditMode(true);
    setShowEditor(true);
    setCurrentWorkflow(workflow);
  };

  const handlePreviewWorkflow = (workflow, e) => {
    e.stopPropagation();
    setSelectedWorkflow(workflow);
    setIsEditMode(false);
    setShowEditor(true);
  };

  const handleTestRun = (workflow, e) => {
    e.stopPropagation();
    setSelectedWorkflow(workflow);
    setShowTestRunner(true);
  };

  const handleCreateNew = async () => {
    const timestamp = Date.now();
    const newWorkflow = {
      id: `workflow_${timestamp}`,
      name: `New Workflow ${workflows.length + 1}`,
      description: '',
      nodes: [
        {
          id: 'start_1',
          type: 'startProcess',
          position: { x: 250, y: 50 },
          data: { label: 'Start', trigger: 'user_action' }
        },
        {
          id: 'end_1',
          type: 'endEvent',
          position: { x: 250, y: 300 },
          data: { label: 'End' }
        }
      ],
      edges: [],
      triggers: [{ type: 'user_action' }],
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(
        `http://localhost:5000/api/applications/${currentApplication.id}/workflows`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newWorkflow)
        }
      );

      if (response.ok) {
        setCurrentWorkflow(newWorkflow);
        setActiveSidebar('workflows');
      }
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleDuplicate = async (workflow, e) => {
    e.stopPropagation();
    const timestamp = Date.now();
    const duplicatedWorkflow = {
      ...workflow,
      id: `workflow_${timestamp}`,
      name: `${workflow.name} (Copy)`,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(
        `http://localhost:5000/api/applications/${currentApplication.id}/workflows`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(duplicatedWorkflow)
        }
      );

      if (response.ok) {
        // Refresh will happen via context
      }
    } catch (error) {
      console.error('Failed to duplicate workflow:', error);
    }
  };

  const handleToggleSelect = (workflowId) => {
    setSelectedWorkflowIds(prev => {
      if (prev.includes(workflowId)) {
        return prev.filter(id => id !== workflowId);
      } else {
        return [...prev, workflowId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedWorkflowIds.length === workflows.length) {
      setSelectedWorkflowIds([]);
    } else {
      setSelectedWorkflowIds(workflows.map(w => w.id));
    }
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedWorkflowIds([]);
  };

  const handleDelete = async (workflowId, e) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/applications/${currentApplication.id}/workflows/${workflowId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // Context will auto-refresh
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedWorkflowIds.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedWorkflowIds.length} workflow${selectedWorkflowIds.length > 1 ? 's' : ''}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const deletePromises = selectedWorkflowIds.map(workflowId =>
        fetch(
          `http://localhost:5000/api/applications/${currentApplication.id}/workflows/${workflowId}`,
          { method: 'DELETE' }
        )
      );

      await Promise.all(deletePromises);
      setSelectedWorkflowIds([]);
      setSelectionMode(false);
    } catch (error) {
      console.error('Failed to delete workflows:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getTriggerType = (workflow) => {
    const triggers = workflow.triggers || [{ type: 'user_action' }];
    const type = triggers[0]?.type;
    if (type === 'event') return 'Event';
    if (type === 'schedule') return 'Scheduled';
    if (type === 'direct_call') return 'Sub-workflow';
    return 'Manual';
  };

  const getNodeCount = (workflow) => {
    return workflow.nodes?.length || 0;
  };

  if (showEditor && selectedWorkflow) {
    return (
      <div className="workflow-preview-container">
        <div className="preview-header">
          <h2>{isEditMode ? 'Edit' : 'Preview'}: {selectedWorkflow.name}</h2>
          <div className="preview-actions">
            {!isEditMode && (
              <button
                className="btn-icon"
                onClick={() => setIsEditMode(true)}
                title="Edit"
              >
                <Edit size={16} />
              </button>
            )}
            <button
              className="btn-icon btn-test"
              onClick={() => {
                setShowEditor(false);
                setIsEditMode(false);
                setSelectedWorkflow(selectedWorkflow);
                setShowTestRunner(true);
              }}
              title="Test Run"
            >
              <Play size={16} />
            </button>
            <button
              className="btn-icon btn-delete"
              onClick={() => {
                setShowEditor(false);
                setIsEditMode(false);
                setSelectedWorkflow(null);
              }}
              title="Close"
            >
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>x</span>
            </button>
          </div>
        </div>
        <div className="preview-canvas">
          <WorkflowCanvas key={selectedWorkflow.id} readOnly={!isEditMode} initialWorkflow={selectedWorkflow} />
        </div>
      </div>
    );
  }

  if (showTestRunner && selectedWorkflow) {
    return (
      <WorkflowTestRunner
        key={selectedWorkflow.id}
        workflow={selectedWorkflow}
        onClose={() => {
          setShowTestRunner(false);
          setSelectedWorkflow(null);
        }}
      />
    );
  }

  return (
    <div className="forms-list-container">
      <div className="forms-header">
        <div className="forms-title">
          <GitBranch size={24} />
          <h1>Workflows</h1>
          {workflows.length > 0 && !selectionMode && (
            <span className="forms-count">({workflows.length})</span>
          )}
        </div>
        <div className="forms-header-actions">
          {selectionMode ? (
            <>
              <span className="selection-count">
                {selectedWorkflowIds.length} selected
              </span>
              <button
                className="btn-secondary"
                onClick={handleSelectAll}
                title={selectedWorkflowIds.length === workflows.length ? 'Deselect All' : 'Select All'}
              >
                {selectedWorkflowIds.length === workflows.length ? (
                  <>
                    <Square size={18} />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare size={18} />
                    Select All
                  </>
                )}
              </button>
              <button
                className="btn-delete-selected"
                onClick={handleDeleteSelected}
                disabled={selectedWorkflowIds.length === 0}
              >
                <Trash2 size={18} />
                Delete ({selectedWorkflowIds.length})
              </button>
              <button className="btn-secondary" onClick={handleExitSelectionMode}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {workflows.length > 0 && (
                <button className="btn-secondary" onClick={handleEnterSelectionMode}>
                  <CheckSquare size={18} />
                  Select
                </button>
              )}
              <button className="btn-create-form" onClick={handleCreateNew}>
                <Plus size={18} />
                Create Workflow
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="forms-loading">Loading workflows...</div>
      ) : workflows.length === 0 ? (
        <div className="forms-empty">
          <GitBranch size={64} style={{ opacity: 0.3 }} />
          <h2>No Workflows Yet</h2>
          <p>Create your first workflow to automate business processes.</p>
          <button className="btn-create-form" onClick={handleCreateNew}>
            <Plus size={18} />
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="forms-grid">
          {workflows.map((workflow) => {
            const isSelected = selectedWorkflowIds.includes(workflow.id);
            return (
              <div
                key={workflow.id}
                className={`form-card ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
                onClick={(e) => handleWorkflowClick(workflow, e)}
              >
                <div className="form-card-header">
                  {selectionMode && (
                    <div
                      className="form-checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(workflow.id);
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="checkbox-icon checked" />
                      ) : (
                        <Square size={20} className="checkbox-icon" />
                      )}
                    </div>
                  )}
                  <GitBranch size={20} />
                  {!selectionMode && (
                    <div className="form-card-actions">
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); handleEditWorkflow(workflow); }}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => handlePreviewWorkflow(workflow, e)}
                        title="Preview"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => handleDuplicate(workflow, e)}
                        title="Duplicate"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={(e) => handleDelete(workflow.id, e)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="form-card-title">{workflow.name}</h3>
                {workflow.description && (
                  <p className="form-card-description">{workflow.description}</p>
                )}

                <div className="form-card-meta">
                  <div className="meta-item">
                    <span className="meta-label">Nodes:</span>
                    <span className="meta-value">{getNodeCount(workflow)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Trigger:</span>
                    <span className="meta-value">{getTriggerType(workflow)}</span>
                  </div>
                </div>

                <div className="form-card-footer">
                  <div className="footer-item">
                    <Calendar size={14} />
                    <span>{formatDate(workflow.createdAt)}</span>
                  </div>
                  <div className="footer-item">
                    <span className="version-badge">v{workflow.version || '1.0'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkflowsList;
