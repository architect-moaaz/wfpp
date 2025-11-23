import React, { useState } from 'react';
import './PropertiesPanel.css';
import { useWorkflow } from '../../context/WorkflowContext';
import { useNotification } from '../../context/NotificationContext';
import { X, ExternalLink, Plus, GitBranch, Trash2 } from 'lucide-react';
import DataModelViewer from '../DataModels/DataModelViewer';

const PropertiesPanel = () => {
  const {
    selectedNode,
    setPropertiesPanelOpen,
    currentWorkflow,
    updateNodeData,
    mappedRules,
    dataModels,
    connectedForms,
    deleteNode,
    setSelectedNode
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
