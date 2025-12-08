import React, { useState } from 'react';
import './PropertiesPanel.css';
import { useWorkflow } from '../../context/WorkflowContext';
import { useNotification } from '../../context/NotificationContext';
import { X, ExternalLink, Plus, GitBranch, Trash2, Workflow, Zap, Clock, Play, Link } from 'lucide-react';
import DataModelViewer from '../DataModels/DataModelViewer';

const PropertiesPanel = () => {
  const {
    selectedNode,
    setPropertiesPanelOpen,
    currentWorkflow,
    currentApplication,
    updateNodeData,
    mappedRules,
    dataModels,
    connectedForms,
    deleteNode,
    setSelectedNode,
    updateCurrentWorkflow
  } = useWorkflow();

  const { confirm } = useNotification();
  const [showDataModelModal, setShowDataModelModal] = useState(false);
  const [selectedDataModel, setSelectedDataModel] = useState(null);

  const handleClose = () => {
    setPropertiesPanelOpen(false);
  };

  const handleDelete = async () => {
    if (selectedNode) {
      const confirmed = await confirm('Are you sure you want to delete this node?', 'Delete Node');
      if (confirmed) {
        deleteNode(selectedNode);
        setSelectedNode(null);
        setPropertiesPanelOpen(false);
      }
    }
  };

  const handleOpenDataModel = (model) => {
    setSelectedDataModel(model);
    setShowDataModelModal(true);
  };

  const handleCloseDataModel = () => {
    setShowDataModelModal(false);
    setSelectedDataModel(null);
  };

  if (!selectedNode) {
    return (
      <div className="properties-panel">
        <div className="properties-header">
          <h3>Properties</h3>
          <button className="close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>
        <div className="properties-content">
          <div className="empty-state">
            <p>Select a workflow element to view its properties</p>
          </div>
        </div>
      </div>
    );
  }

  const node = currentWorkflow.nodes.find(n => n.id === selectedNode);

  if (!node) {
    return null;
  }

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <h3>Properties</h3>
        <button className="close-btn" onClick={handleClose}>
          <X size={18} />
        </button>
      </div>

      <div className="properties-content">
        {/* Node Info */}
        <div className="property-section">
          <div className="section-title">
            {node.data.label}
            <span className="section-badge">{node.type === 'validation' ? 'Rule Engine Step' : node.type}</span>
          </div>
          <button className="delete-node-btn" onClick={handleDelete}>
            <Trash2 size={16} />
            Delete Node
          </button>
        </div>

        {/* Mapped Rules */}
        {node.data.rules && (
          <div className="property-section">
            <div className="section-header">
              <h4>Mapped Rules</h4>
            </div>
            <div className="rules-list">
              {node.data.rules.map(rule => {
                const ruleDetails = mappedRules.find(r => r.id === rule.id);
                return (
                  <div key={rule.id} className="rule-item">
                    <div className="rule-info">
                      <div className="rule-name">{ruleDetails?.name}</div>
                      <div className="rule-description">{ruleDetails?.description}</div>
                    </div>
                    <button className="rule-link-btn">
                      <ExternalLink size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="add-btn">
              <Plus size={16} />
              Add Rule
            </button>
          </div>
        )}

        {/* Data Mapping */}
        <div className="property-section">
          <div className="section-header">
            <h4>Data Mapping</h4>
          </div>
          {dataModels.map(model => (
            <div
              key={model.id}
              className="data-model-item"
              style={{ cursor: 'pointer' }}
              onClick={() => handleOpenDataModel(model)}
            >
              <div className="data-model-header">
                <span className="data-model-name">{model.name}</span>
                <ExternalLink size={14} />
              </div>
              <div className="data-model-description">{model.description}</div>
            </div>
          ))}
          <button className="add-btn">
            <Plus size={16} />
            Add Data Model
          </button>
        </div>

        {/* Connected Forms */}
        {node.data.formName && (
          <div className="property-section">
            <div className="section-header">
              <h4>Connected Forms</h4>
            </div>
            {connectedForms.map(form => (
              <div key={form.id} className="form-item">
                <div className="form-header">
                  <span className="form-name">{form.name}</span>
                  <ExternalLink size={14} />
                </div>
                <div className="form-meta">
                  Input • Saved 8 ago
                </div>
              </div>
            ))}
            <button className="add-btn">
              <Plus size={16} />
              Link Form
            </button>
          </div>
        )}

        {/* Trigger Info */}
        {node.data.trigger && (
          <div className="property-section">
            <div className="section-header">
              <h4>Trigger</h4>
            </div>
            <div className="trigger-info">
              <div className="trigger-type">{node.data.trigger}</div>
              {node.data.formName && (
                <div className="trigger-form">Form: {node.data.formName}</div>
              )}
            </div>
          </div>
        )}

        {/* Gateway Configuration */}
        {node.type === 'decision' && (
          <div className="property-section">
            <div className="section-header">
              <h4>
                <GitBranch size={16} style={{ marginRight: '6px' }} />
                Gateway Configuration
              </h4>
            </div>

            <div className="gateway-config-section">
              <div className="config-field">
                <label className="config-field-label">Gateway Type</label>
                <select
                  className="config-select"
                  value={node.data.gatewayType || 'exclusive'}
                  onChange={(e) => updateNodeData(node.id, { gatewayType: e.target.value })}
                >
                  <option value="exclusive">Exclusive (XOR)</option>
                  <option value="parallel">Parallel (AND)</option>
                </select>
                <div className="config-field-hint">
                  {node.data.gatewayType === 'parallel'
                    ? 'All branches execute simultaneously'
                    : 'Only one branch executes based on conditions'}
                </div>
              </div>

              {node.data.gatewayType === 'exclusive' && (
                <div className="config-field">
                  <label className="config-field-label">Condition Expression</label>
                  <input
                    type="text"
                    className="config-input"
                    placeholder="e.g., creditScore >= 700"
                    value={node.data.condition || ''}
                    onChange={(e) => updateNodeData(node.id, { condition: e.target.value })}
                  />
                  <div className="config-field-hint">
                    Expression to determine which branch to take
                  </div>
                </div>
              )}

              {node.data.gatewayType === 'parallel' && (
                <div className="config-field">
                  <label className="config-field-label">Number of Branches</label>
                  <input
                    type="number"
                    className="config-input"
                    placeholder="e.g., 3"
                    min="2"
                    value={node.data.branches || 2}
                    onChange={(e) => updateNodeData(node.id, { branches: e.target.value })}
                  />
                  <div className="config-field-hint">
                    All branches will execute in parallel
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Task Configuration */}
        {node.type === 'userTask' && (
          <div className="property-section">
            <div className="section-header">
              <h4>User Task Configuration</h4>
            </div>

            <div className="gateway-config-section">
              <div className="config-field">
                <label className="config-field-label">Task Name</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="e.g., Review Application"
                  value={node.data.taskName || ''}
                  onChange={(e) => updateNodeData(node.id, { taskName: e.target.value })}
                />
                <div className="config-field-hint">
                  Name of the task to be displayed to the user
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Assigned To</label>
                <select
                  className="config-select"
                  value={node.data.assignedTo || 'unassigned'}
                  onChange={(e) => updateNodeData(node.id, { assignedTo: e.target.value })}
                >
                  <option value="unassigned">Unassigned</option>
                  <option value="user">Specific User</option>
                  <option value="group">User Group</option>
                  <option value="role">Role</option>
                </select>
                <div className="config-field-hint">
                  Who should complete this task
                </div>
              </div>

              {node.data.assignedTo && node.data.assignedTo !== 'unassigned' && (
                <div className="config-field">
                  <label className="config-field-label">
                    {node.data.assignedTo === 'user' ? 'User Email' :
                     node.data.assignedTo === 'group' ? 'Group Name' : 'Role Name'}
                  </label>
                  <input
                    type="text"
                    className="config-input"
                    placeholder={
                      node.data.assignedTo === 'user' ? 'user@example.com' :
                      node.data.assignedTo === 'group' ? 'e.g., Sales Team' :
                      'e.g., Manager'
                    }
                    value={node.data.assignee || ''}
                    onChange={(e) => updateNodeData(node.id, { assignee: e.target.value })}
                  />
                </div>
              )}

              <div className="config-field">
                <label className="config-field-label">Priority</label>
                <select
                  className="config-select"
                  value={node.data.priority || 'medium'}
                  onChange={(e) => updateNodeData(node.id, { priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <div className="config-field-hint">
                  Priority level for this task
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Due Date (Days)</label>
                <input
                  type="number"
                  className="config-input"
                  placeholder="e.g., 5"
                  min="1"
                  value={node.data.dueDays || ''}
                  onChange={(e) => updateNodeData(node.id, { dueDays: e.target.value })}
                />
                <div className="config-field-hint">
                  Number of days to complete this task
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Task Instructions</label>
                <textarea
                  className="config-input"
                  placeholder="Instructions for completing this task..."
                  rows="3"
                  value={node.data.instructions || ''}
                  onChange={(e) => updateNodeData(node.id, { instructions: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
                <div className="config-field-hint">
                  Detailed instructions for the user
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Script Task Configuration */}
        {node.type === 'scriptTask' && (
          <div className="property-section">
            <div className="section-header">
              <h4>Script Task Configuration</h4>
            </div>

            <div className="gateway-config-section">
              <div className="config-field">
                <label className="config-field-label">Script Type</label>
                <select
                  className="config-select"
                  value={node.data.scriptType || 'JavaScript'}
                  onChange={(e) => updateNodeData(node.id, { scriptType: e.target.value })}
                >
                  <option value="JavaScript">JavaScript</option>
                  <option value="Python">Python</option>
                  <option value="Groovy">Groovy</option>
                </select>
                <div className="config-field-hint">
                  Programming language for the script
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Script Code</label>
                <textarea
                  className="config-input script-editor"
                  placeholder="Enter your script code here..."
                  rows="10"
                  value={node.data.script || ''}
                  onChange={(e) => updateNodeData(node.id, { script: e.target.value })}
                  style={{
                    resize: 'vertical',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                  }}
                />
                <div className="config-field-hint">
                  Script to execute. Use 'processData' to access/modify workflow data.
                </div>
              </div>

              {node.data.script && (
                <div className="config-field">
                  <div className="script-preview">
                    <div className="script-preview-header">Script Preview</div>
                    <pre className="script-preview-code">{node.data.script}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LLM Task Configuration */}
        {node.type === 'llmTask' && (
          <div className="property-section">
            <div className="section-header">
              <h4>LLM Task Configuration</h4>
            </div>

            <div className="gateway-config-section">
              <div className="config-field">
                <label className="config-field-label">Model</label>
                <select
                  className="config-select"
                  value={node.data.model || 'claude-sonnet-4-5-20250929'}
                  onChange={(e) => updateNodeData(node.id, { model: e.target.value })}
                >
                  <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Recommended)</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fast)</option>
                  <option value="claude-opus-4-5-20250514">Claude Opus 4 (Most Capable)</option>
                </select>
                <div className="config-field-hint">
                  Which LLM model to use for this task
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Prompt Template</label>
                <textarea
                  className="config-input script-editor"
                  placeholder="Enter your prompt here. Use ${'{variableName}'} for workflow variables..."
                  rows="8"
                  value={node.data.prompt || ''}
                  onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
                  style={{
                    resize: 'vertical',
                    fontFamily: 'system-ui',
                    fontSize: '13px'
                  }}
                />
                <div className="config-field-hint">
                  Prompt template with variable placeholders. Example: "Analyze this feedback: ${'{processData.feedback}'}"
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Temperature</label>
                <input
                  type="number"
                  className="config-input"
                  placeholder="0.7"
                  min="0"
                  max="1"
                  step="0.1"
                  value={node.data.temperature !== undefined ? node.data.temperature : 0.7}
                  onChange={(e) => updateNodeData(node.id, { temperature: parseFloat(e.target.value) })}
                />
                <div className="config-field-hint">
                  Response creativity (0 = deterministic, 1 = very creative)
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Max Tokens</label>
                <input
                  type="number"
                  className="config-input"
                  placeholder="1000"
                  min="100"
                  max="8000"
                  step="100"
                  value={node.data.maxTokens || 1000}
                  onChange={(e) => updateNodeData(node.id, { maxTokens: parseInt(e.target.value) })}
                />
                <div className="config-field-hint">
                  Maximum length of response
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Output Variable</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="e.g., llmResult, sentiment, extractedData"
                  value={node.data.outputVariable || ''}
                  onChange={(e) => updateNodeData(node.id, { outputVariable: e.target.value })}
                />
                <div className="config-field-hint">
                  Name of variable to store LLM response in processData
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SubWorkflow Configuration */}
        {node.type === 'subWorkflow' && (
          <div className="property-section">
            <div className="section-header">
              <h4>
                <Workflow size={16} style={{ marginRight: '6px' }} />
                Sub Workflow Configuration
              </h4>
            </div>

            <div className="gateway-config-section">
              <div className="config-field">
                <label className="config-field-label">Target Workflow</label>
                <select
                  className="config-select"
                  value={node.data.targetWorkflow || ''}
                  onChange={(e) => updateNodeData(node.id, { targetWorkflow: e.target.value })}
                >
                  <option value="">Select workflow...</option>
                  {(currentApplication?.resources?.workflows || [])
                    .filter(wf => wf.id !== currentWorkflow?.id && wf.name !== currentWorkflow?.name)
                    .map(wf => (
                      <option key={wf.id} value={wf.name}>{wf.name}</option>
                    ))
                  }
                </select>
                <div className="config-field-hint">
                  The workflow to execute as a sub-process
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Execution Mode</label>
                <div className="toggle-buttons">
                  <button
                    className={`toggle-btn ${!node.data.async ? 'active' : ''}`}
                    onClick={() => updateNodeData(node.id, { async: false })}
                  >
                    <Play size={14} />
                    Synchronous
                  </button>
                  <button
                    className={`toggle-btn ${node.data.async ? 'active' : ''}`}
                    onClick={() => updateNodeData(node.id, { async: true })}
                  >
                    <Clock size={14} />
                    Async
                  </button>
                </div>
                <div className="config-field-hint">
                  {node.data.async
                    ? 'Async: Parent workflow continues immediately'
                    : 'Sync: Parent waits for sub-workflow to complete'}
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Input Mapping</label>
                <textarea
                  className="config-input"
                  placeholder="e.g., customerId: processData.customer.id"
                  rows="3"
                  value={node.data.inputMapping || ''}
                  onChange={(e) => updateNodeData(node.id, { inputMapping: e.target.value })}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                />
                <div className="config-field-hint">
                  Map parent variables to sub-workflow inputs (one per line)
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Output Mapping</label>
                <textarea
                  className="config-input"
                  placeholder="e.g., result: subWorkflowOutput.status"
                  rows="3"
                  value={node.data.outputMapping || ''}
                  onChange={(e) => updateNodeData(node.id, { outputMapping: e.target.value })}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                />
                <div className="config-field-hint">
                  Map sub-workflow outputs back to parent variables
                </div>
              </div>

              {node.data.targetWorkflow && (
                <div className="subworkflow-preview">
                  <div className="preview-header">
                    <Link size={14} />
                    <span>Links to: <strong>{node.data.targetWorkflow}</strong></span>
                  </div>
                  <div className="preview-mode">
                    {node.data.async ? (
                      <span className="mode-tag async"><Clock size={12} /> Async</span>
                    ) : (
                      <span className="mode-tag sync"><Play size={12} /> Synchronous</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workflow Triggers (shown when Start Event is selected) */}
        {node.type === 'startProcess' && (
          <div className="property-section">
            <div className="section-header">
              <h4>
                <Zap size={16} style={{ marginRight: '6px' }} />
                Workflow Triggers
              </h4>
            </div>

            <div className="gateway-config-section">
              <div className="config-field">
                <label className="config-field-label">Trigger Type</label>
                <select
                  className="config-select"
                  value={node.data.triggerType || 'user_action'}
                  onChange={(e) => updateNodeData(node.id, { triggerType: e.target.value })}
                >
                  <option value="user_action">User Action</option>
                  <option value="event">Event</option>
                  <option value="schedule">Schedule</option>
                  <option value="api">API Call</option>
                  <option value="direct_call">Direct Call (Sub-workflow)</option>
                </select>
                <div className="config-field-hint">
                  How this workflow is triggered
                </div>
              </div>

              {node.data.triggerType === 'event' && (
                <div className="config-field">
                  <label className="config-field-label">Listen to Event</label>
                  <input
                    type="text"
                    className="config-input"
                    placeholder="e.g., order.completed, user.registered"
                    value={node.data.listenToEvent || ''}
                    onChange={(e) => updateNodeData(node.id, { listenToEvent: e.target.value })}
                  />
                  <div className="config-field-hint">
                    Event name that triggers this workflow
                  </div>
                </div>
              )}

              {node.data.triggerType === 'schedule' && (
                <div className="config-field">
                  <label className="config-field-label">CRON Expression</label>
                  <input
                    type="text"
                    className="config-input"
                    placeholder="e.g., 0 9 * * 1-5 (9am weekdays)"
                    value={node.data.cronExpression || ''}
                    onChange={(e) => updateNodeData(node.id, { cronExpression: e.target.value })}
                  />
                  <div className="config-field-hint">
                    Schedule pattern in CRON format
                  </div>
                </div>
              )}

              {node.data.triggerType === 'api' && (
                <div className="config-field">
                  <label className="config-field-label">API Endpoint</label>
                  <input
                    type="text"
                    className="config-input"
                    placeholder="/api/trigger/workflow-name"
                    value={node.data.apiEndpoint || ''}
                    onChange={(e) => updateNodeData(node.id, { apiEndpoint: e.target.value })}
                    disabled
                  />
                  <div className="config-field-hint">
                    Auto-generated endpoint for this workflow
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event Emitting (shown for End Event) */}
        {node.type === 'endEvent' && (
          <div className="property-section">
            <div className="section-header">
              <h4>
                <Zap size={16} style={{ marginRight: '6px' }} />
                Event Emitting
              </h4>
            </div>

            <div className="gateway-config-section">
              <div className="config-field">
                <label className="config-field-label">Emit Event on Completion</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="e.g., order.processed, review.completed"
                  value={node.data.emitEvent || ''}
                  onChange={(e) => updateNodeData(node.id, { emitEvent: e.target.value })}
                />
                <div className="config-field-hint">
                  Event to emit when workflow completes (triggers listening workflows)
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Include Data</label>
                <textarea
                  className="config-input"
                  placeholder="e.g., orderId: processData.order.id"
                  rows="3"
                  value={node.data.eventData || ''}
                  onChange={(e) => updateNodeData(node.id, { eventData: e.target.value })}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                />
                <div className="config-field-hint">
                  Data to include in the emitted event (one mapping per line)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Model Viewer Modal */}
      {showDataModelModal && selectedDataModel && (
        <div className="modal-overlay" onClick={handleCloseDataModel}>
          <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
            <DataModelViewer model={selectedDataModel} onClose={handleCloseDataModel} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
