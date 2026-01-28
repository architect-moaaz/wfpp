import React, { useState, useEffect, useCallback } from 'react';
import './PropertiesPanel.css';
import { useWorkflow } from '../../context/WorkflowContext';
import { useNotification } from '../../context/NotificationContext';
import { X, ExternalLink, Plus, GitBranch, Trash2, Workflow, Zap, Clock, Play, Link, Globe, Check, FileText, Database, BookOpen, Variable, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import DataModelViewer from '../DataModels/DataModelViewer';

// Variable types for input variables
const VARIABLE_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'date', label: 'Date' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'List' }
];

/**
 * Generate an API endpoint from a workflow name
 * Converts "My Workflow Name" -> "/api/trigger/my-workflow-name"
 */
const generateApiEndpoint = (workflowName) => {
  if (!workflowName) return '/api/trigger/workflow';

  const slug = workflowName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Remove consecutive hyphens
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens

  return `/api/trigger/${slug || 'workflow'}`;
};

const PropertiesPanel = () => {
  const {
    selectedNode,
    setPropertiesPanelOpen,
    currentWorkflow,
    currentApplication,
    updateNodeData,
    updateWorkflow,
    mappedRules,
    dataModels,
    connectedForms,
    deleteNode,
    setSelectedNode,
    setActiveTab,
    setActiveSidebar
  } = useWorkflow();

  const { confirm, notify } = useNotification();
  const [showDataModelModal, setShowDataModelModal] = useState(false);
  const [selectedDataModel, setSelectedDataModel] = useState(null);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showAddDataModelModal, setShowAddDataModelModal] = useState(false);
  const [showLinkFormModal, setShowLinkFormModal] = useState(false);
  const [expandedVariable, setExpandedVariable] = useState(null);
  const [urlValidationError, setUrlValidationError] = useState(null);
  const [conditionValidationError, setConditionValidationError] = useState(null);

  // URL validation helper
  const validateUrl = (urlString) => {
    if (!urlString || urlString.trim() === '') {
      return null; // Empty is valid (optional field)
    }

    // Allow template variables in URL
    const urlWithoutVars = urlString.replace(/\{[^}]+\}/g, 'placeholder');

    try {
      // Check if it starts with http:// or https://
      if (!urlWithoutVars.match(/^https?:\/\//i)) {
        return 'URL must start with http:// or https://';
      }

      new URL(urlWithoutVars);
      return null; // Valid
    } catch {
      return 'Invalid URL format';
    }
  };

  // Condition validation helper
  const validateCondition = (condition) => {
    if (!condition || condition.trim() === '') {
      return null; // Empty is valid
    }

    const trimmed = condition.trim();

    // Valid operators
    const operators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<', '&&', '||'];

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of trimmed) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) return 'Unbalanced parentheses';
    }
    if (parenCount !== 0) return 'Unbalanced parentheses';

    // Check for at least one comparison or logical operator
    const hasOperator = operators.some(op => trimmed.includes(op));
    if (!hasOperator && trimmed.length > 0) {
      // Allow simple variable names like "isApproved"
      if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(trimmed)) {
        return null; // Valid boolean variable reference
      }
      return 'Expression should contain a comparison operator (>, <, ==, !=, >=, <=)';
    }

    // Check for common syntax errors
    if (/[=]{3,}/.test(trimmed)) return 'Invalid operator: use === for strict equality';
    if (/[&]{3,}/.test(trimmed)) return 'Invalid operator: use && for logical AND';
    if (/[|]{3,}/.test(trimmed)) return 'Invalid operator: use || for logical OR';

    return null; // Valid
  };

  // Identity management state for task assignment
  const [identityUsers, setIdentityUsers] = useState([]);
  const [identityRoles, setIdentityRoles] = useState([]);
  const [identityGroups, setIdentityGroups] = useState([]);
  const [identityPositions, setIdentityPositions] = useState([]);
  const [identityLoading, setIdentityLoading] = useState(false);

  // Fetch identity data for task assignment
  const fetchIdentityData = useCallback(async () => {
    try {
      setIdentityLoading(true);

      // Get organization ID from application or fetch the first available org
      let orgId = currentApplication?.organizationId;

      const API_BASE = 'http://localhost:5000';

      if (!orgId) {
        // Fetch organizations to get the first available one
        const orgsRes = await fetch(`${API_BASE}/api/identity/organizations`);
        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          const orgs = orgsData.organizations || orgsData || [];
          if (orgs.length > 0) {
            orgId = orgs[0].id;
          }
        }
      }

      if (!orgId) {
        console.warn('No organization found for identity data');
        setIdentityLoading(false);
        return;
      }

      const [usersRes, rolesRes, groupsRes, positionsRes] = await Promise.all([
        fetch(`${API_BASE}/api/identity/users/org/${orgId}`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/identity/roles/org/${orgId}?flat=true`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/identity/groups/org/${orgId}`).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/identity/positions/org/${orgId}`).catch(() => ({ ok: false }))
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setIdentityUsers(data.users || []);
      }
      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setIdentityRoles(data || []);
      }
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setIdentityGroups(data || []);
      }
      if (positionsRes.ok) {
        const data = await positionsRes.json();
        setIdentityPositions(data || []);
      }
    } catch (error) {
      console.error('Error fetching identity data:', error);
    } finally {
      setIdentityLoading(false);
    }
  }, [currentApplication?.organizationId]);

  // Fetch identity data when a userTask is selected
  useEffect(() => {
    const node = currentWorkflow?.nodes?.find(n => n.id === selectedNode);
    if (node?.type === 'userTask') {
      fetchIdentityData();
    }
  }, [selectedNode, currentWorkflow?.nodes, fetchIdentityData]);

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

  // Handler: Open rule in Rule Engine panel
  const handleOpenRule = (ruleId) => {
    // Navigate to the Rules panel and select the rule
    setActiveTab('rules');
    setActiveSidebar('rule-engine');
    notify('Opening rule in Rule Engine...', 'info');
  };

  // Handler: Add Rule Modal
  const handleAddRule = () => {
    setShowAddRuleModal(true);
  };

  // Handler: Select rule from modal and add to node
  const handleSelectRule = (rule) => {
    const node = currentWorkflow.nodes.find(n => n.id === selectedNode);
    if (node) {
      const existingRules = node.data.rules || [];
      // Check if rule is already added
      if (existingRules.some(r => r.id === rule.id)) {
        notify('Rule is already mapped to this node', 'warning');
        return;
      }
      // Add rule to node
      updateNodeData(node.id, {
        rules: [...existingRules, { id: rule.id, name: rule.name }]
      });
      notify(`Rule "${rule.name}" added to node`, 'success');
    }
    setShowAddRuleModal(false);
  };

  // Handler: Add Data Model Modal
  const handleAddDataModel = () => {
    setShowAddDataModelModal(true);
  };

  // Handler: Select data model and link to node
  const handleSelectDataModel = (model) => {
    const node = currentWorkflow.nodes.find(n => n.id === selectedNode);
    if (node) {
      const existingModels = node.data.dataModels || [];
      // Check if model is already linked
      if (existingModels.some(m => m.id === model.id)) {
        notify('Data model is already linked to this node', 'warning');
        return;
      }
      // Add data model to node
      updateNodeData(node.id, {
        dataModels: [...existingModels, { id: model.id, name: model.name }]
      });
      notify(`Data model "${model.name}" linked to node`, 'success');
    }
    setShowAddDataModelModal(false);
  };

  // Handler: Link Form Modal
  const handleLinkForm = () => {
    setShowLinkFormModal(true);
  };

  // Handler: Select form and link to node
  const handleSelectForm = (form) => {
    console.log('[PropertiesPanel] handleSelectForm called:', {
      selectedNode,
      formId: form.id,
      formName: form.name || form.title,
      currentWorkflowNodes: currentWorkflow?.nodes?.map(n => ({ id: n.id, formId: n.data?.formId }))
    });
    const node = currentWorkflow.nodes.find(n => n.id === selectedNode);
    if (node) {
      console.log('[PropertiesPanel] Found node, updating:', node.id);
      // Update node with linked form
      updateNodeData(node.id, {
        formId: form.id,
        formName: form.name || form.title
      });
      notify(`Form "${form.name || form.title}" linked to node`, 'success');
    } else {
      console.log('[PropertiesPanel] Node not found for selectedNode:', selectedNode);
    }
    setShowLinkFormModal(false);
  };

  // Get available rules from the application
  const availableRules = currentApplication?.resources?.rules || [];

  // Input Variables handlers
  const handleAddVariable = () => {
    const inputVariables = currentWorkflow?.inputVariables || [];
    const newVariable = {
      id: `var_${Date.now()}`,
      name: '',
      type: 'string',
      required: false,
      defaultValue: '',
      description: ''
    };
    updateWorkflow({
      inputVariables: [...inputVariables, newVariable]
    });
    setExpandedVariable(newVariable.id);
  };

  const handleUpdateVariable = (variableId, updates) => {
    const inputVariables = currentWorkflow?.inputVariables || [];
    updateWorkflow({
      inputVariables: inputVariables.map(v =>
        v.id === variableId ? { ...v, ...updates } : v
      )
    });
  };

  const handleDeleteVariable = async (variableId) => {
    const confirmed = await confirm('Delete this input variable?', 'Delete Variable');
    if (confirmed) {
      const inputVariables = currentWorkflow?.inputVariables || [];
      updateWorkflow({
        inputVariables: inputVariables.filter(v => v.id !== variableId)
      });
      if (expandedVariable === variableId) {
        setExpandedVariable(null);
      }
    }
  };

  // Workflow Settings Panel (when no node selected)
  if (!selectedNode) {
    const inputVariables = currentWorkflow?.inputVariables || [];
    const startForm = currentWorkflow?.startForm;

    return (
      <div className="properties-panel">
        <div className="properties-header">
          <h3>Workflow Settings</h3>
          <button className="close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>
        <div className="properties-content">
          {/* Workflow Info */}
          <div className="property-section">
            <div className="section-title">
              <Settings size={16} style={{ marginRight: '8px' }} />
              {currentWorkflow?.name || 'Untitled Workflow'}
            </div>
            <div className="workflow-info-hint">
              Configure workflow-level settings and input variables
            </div>
          </div>

          {/* Input Variables */}
          <div className="property-section">
            <div className="section-header">
              <h4>
                <Variable size={16} style={{ marginRight: '6px' }} />
                Input Variables
              </h4>
            </div>
            <div className="input-variables-hint">
              Define required data for workflow execution
            </div>

            {inputVariables.length === 0 ? (
              <div className="no-variables">
                No input variables defined
              </div>
            ) : (
              <div className="variables-list">
                {inputVariables.map(variable => (
                  <div key={variable.id} className="variable-item">
                    <div
                      className="variable-header"
                      onClick={() => setExpandedVariable(
                        expandedVariable === variable.id ? null : variable.id
                      )}
                    >
                      <div className="variable-summary">
                        <span className={`variable-type-badge ${variable.type}`}>
                          {variable.type}
                        </span>
                        <span className="variable-name">
                          {variable.name || 'Unnamed'}
                        </span>
                        {variable.required && (
                          <span className="required-badge">Required</span>
                        )}
                      </div>
                      {expandedVariable === variable.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>

                    {expandedVariable === variable.id && (
                      <div className="variable-details">
                        <div className="variable-field">
                          <label>Variable Name</label>
                          <input
                            type="text"
                            value={variable.name}
                            onChange={(e) => handleUpdateVariable(variable.id, { name: e.target.value })}
                            placeholder="e.g., customerEmail"
                          />
                        </div>
                        <div className="variable-field">
                          <label>Type</label>
                          <select
                            value={variable.type}
                            onChange={(e) => handleUpdateVariable(variable.id, { type: e.target.value })}
                          >
                            {VARIABLE_TYPES.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="variable-field checkbox-field">
                          <label>
                            <input
                              type="checkbox"
                              checked={variable.required}
                              onChange={(e) => handleUpdateVariable(variable.id, { required: e.target.checked })}
                            />
                            Required
                          </label>
                        </div>
                        <div className="variable-field">
                          <label>Default Value</label>
                          <input
                            type="text"
                            value={variable.defaultValue || ''}
                            onChange={(e) => handleUpdateVariable(variable.id, { defaultValue: e.target.value })}
                            placeholder="Optional default"
                          />
                        </div>
                        <div className="variable-field">
                          <label>Description</label>
                          <input
                            type="text"
                            value={variable.description || ''}
                            onChange={(e) => handleUpdateVariable(variable.id, { description: e.target.value })}
                            placeholder="What is this variable for?"
                          />
                        </div>
                        <button
                          className="delete-variable-btn"
                          onClick={() => handleDeleteVariable(variable.id)}
                        >
                          <Trash2 size={14} />
                          Delete Variable
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button className="add-btn" onClick={handleAddVariable}>
              <Plus size={16} />
              Add Variable
            </button>
          </div>

          {/* Form Field Mapping (if start form linked) */}
          {startForm && inputVariables.length > 0 && (
            <div className="property-section">
              <div className="section-header">
                <h4>
                  <Link size={16} style={{ marginRight: '6px' }} />
                  Field Mapping
                </h4>
              </div>
              <div className="field-mapping-hint">
                Map form fields to workflow variables
              </div>
              <div className="field-mappings">
                {inputVariables.map(variable => {
                  const formFields = connectedForms.find(f => f.id === startForm.id)?.fields || [];
                  return (
                    <div key={variable.id} className="field-mapping-row">
                      <span className="mapping-variable">{variable.name || 'Unnamed'}</span>
                      <span className="mapping-arrow">←</span>
                      <select
                        value={variable.formFieldId || ''}
                        onChange={(e) => handleUpdateVariable(variable.id, { formFieldId: e.target.value })}
                        className="mapping-select"
                      >
                        <option value="">Select field...</option>
                        {formFields.map(field => (
                          <option key={field.id} value={field.id}>
                            {field.label || field.name || field.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    );
  }

  const node = currentWorkflow.nodes.find(n => n.id === selectedNode);

  console.log('[PropertiesPanel] Rendering node:', {
    selectedNode,
    nodeId: node?.id,
    formId: node?.data?.formId,
    formName: node?.data?.formName
  });

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
                    <button className="rule-link-btn" onClick={() => handleOpenRule(rule.id)}>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="add-btn" onClick={handleAddRule}>
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
          <button className="add-btn" onClick={handleAddDataModel}>
            <Plus size={16} />
            Add Data Model
          </button>
        </div>

        {/* Connected Form - show for start nodes or nodes with formId */}
        {(node.data.formId || ['startProcess', 'start', 'startEvent'].includes(node.type)) && (
          <div className="property-section">
            <div className="section-header">
              <h4>{['startProcess', 'start', 'startEvent'].includes(node.type) ? 'Start Form' : 'Connected Form'}</h4>
            </div>
            {node.data.formId ? (
              <>
                {(() => {
                  const linkedForm = connectedForms.find(f => f.id === node.data.formId);
                  if (linkedForm) {
                    return (
                      <div key={linkedForm.id} className="form-item">
                        <div className="form-header">
                          <span className="form-name">{linkedForm.name}</span>
                          <ExternalLink size={14} />
                        </div>
                        <div className="form-meta">
                          {linkedForm.fields?.length || 0} fields
                        </div>
                      </div>
                    );
                  } else if (node.data.formName) {
                    return (
                      <div className="form-item">
                        <div className="form-header">
                          <span className="form-name">{node.data.formName}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                <button className="add-btn" onClick={handleLinkForm}>
                  <Plus size={16} />
                  Change Form
                </button>
              </>
            ) : (
              <>
                <div className="no-form-hint">
                  Link a form to collect input data when the workflow starts
                </div>
                <button className="add-btn" onClick={handleLinkForm}>
                  <Plus size={16} />
                  Link Start Form
                </button>
              </>
            )}
          </div>
        )}

        {/* Variable Mapping - for nodes that read/write process variables */}
        {['scriptTask', 'userTask', 'serviceTask', 'restApi', 'dataProcess', 'decision', 'validation', 'businessRuleTask', 'llmTask', 'notification', 'subWorkflow'].includes(node.type) && (() => {
          // Collect all available variables from different sources
          const processVariables = (currentWorkflow?.inputVariables || []).map(v => ({
            name: v.name,
            type: v.type,
            source: 'process'
          }));

          return (
            <div className="property-section">
              <div className="section-header">
                <h4>
                  <Variable size={16} style={{ marginRight: '6px' }} />
                  Variable Mapping
                </h4>
              </div>
              <div className="variable-mapping-hint">
                Configure which variables this node reads and writes
              </div>

              {/* Input Variables (Read) */}
              <div className="variable-mapping-group">
                <label className="variable-mapping-label">Input Variables (Read)</label>
                <div className="variable-chips">
                  {(node.data.inputVariables || []).map((varName, idx) => (
                    <span key={idx} className="variable-chip input-var">
                      {varName}
                      <button
                        className="chip-remove"
                        onClick={() => {
                          const updated = (node.data.inputVariables || []).filter((_, i) => i !== idx);
                          updateNodeData(node.id, { inputVariables: updated });
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                {/* Accessor hints for input variables */}
                {(node.data.inputVariables || []).length > 0 && (
                  <div className="variable-accessor-hints">
                    <div className="accessor-label">Access in script:</div>
                    {(node.data.inputVariables || []).map((varName, idx) => (
                      <code key={idx} className="accessor-code">
                        processData.{varName.includes('.') ? varName.split('.').join('.') : varName}
                      </code>
                    ))}
                  </div>
                )}
                <select
                  className="variable-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const current = node.data.inputVariables || [];
                      if (!current.includes(e.target.value)) {
                        updateNodeData(node.id, { inputVariables: [...current, e.target.value] });
                      }
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">+ Add input variable...</option>
                  {processVariables.length > 0 && (
                    <optgroup label="Process Variables">
                      {processVariables
                        .filter(v => !(node.data.inputVariables || []).includes(v.name))
                        .map(v => (
                          <option key={`pv-${v.name}`} value={v.name}>{v.name} ({v.type})</option>
                        ))
                      }
                    </optgroup>
                  )}
                  {dataModels && dataModels.length > 0 && dataModels.map(model => (
                    <optgroup key={model.id} label={`${model.name} (Data Model)`}>
                      {(model.fields || model.attributes || [])
                        .filter(field => !(node.data.inputVariables || []).includes(`${model.name}.${field.name}`))
                        .map(field => (
                          <option key={`${model.id}-${field.name}`} value={`${model.name}.${field.name}`}>
                            {field.name} ({field.type})
                          </option>
                        ))
                      }
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Output Variables (Write) */}
              <div className="variable-mapping-group">
                <label className="variable-mapping-label">Output Variables (Write)</label>
                <div className="variable-chips">
                  {(node.data.outputVariables || []).map((varName, idx) => (
                    <span key={idx} className="variable-chip output-var">
                      {varName}
                      <button
                        className="chip-remove"
                        onClick={() => {
                          const updated = (node.data.outputVariables || []).filter((_, i) => i !== idx);
                          updateNodeData(node.id, { outputVariables: updated });
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                {/* Accessor hints for output variables */}
                {(node.data.outputVariables || []).length > 0 && (
                  <div className="variable-accessor-hints output-hints">
                    <div className="accessor-label">Return from script:</div>
                    <code className="accessor-code return-example">
                      {'return { '}
                      {(node.data.outputVariables || []).map((varName, idx) => {
                        const key = varName.includes('.') ? `"${varName}"` : varName;
                        return `${key}: value${idx > 0 ? '' : ''}`;
                      }).join(', ')}
                      {' }'}
                    </code>
                  </div>
                )}
                <select
                  className="variable-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const current = node.data.outputVariables || [];
                      if (!current.includes(e.target.value)) {
                        updateNodeData(node.id, { outputVariables: [...current, e.target.value] });
                      }
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">+ Add output variable...</option>
                  {processVariables.length > 0 && (
                    <optgroup label="Process Variables">
                      {processVariables
                        .filter(v => !(node.data.outputVariables || []).includes(v.name))
                        .map(v => (
                          <option key={`pv-${v.name}`} value={v.name}>{v.name} ({v.type})</option>
                        ))
                      }
                    </optgroup>
                  )}
                  {dataModels && dataModels.length > 0 && dataModels.map(model => (
                    <optgroup key={model.id} label={`${model.name} (Data Model)`}>
                      {(model.fields || model.attributes || [])
                        .filter(field => !(node.data.outputVariables || []).includes(`${model.name}.${field.name}`))
                        .map(field => (
                          <option key={`${model.id}-${field.name}`} value={`${model.name}.${field.name}`}>
                            {field.name} ({field.type})
                          </option>
                        ))
                      }
                    </optgroup>
                  ))}
                </select>
                <input
                  type="text"
                  className="new-variable-input"
                  placeholder="Or type new variable name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const varName = e.target.value.trim();
                      const current = node.data.outputVariables || [];
                      if (!current.includes(varName)) {
                        updateNodeData(node.id, { outputVariables: [...current, varName] });
                      }
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </div>
          );
        })()}

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
                    className={`config-input ${conditionValidationError ? 'input-error' : ''}`}
                    placeholder="e.g., creditScore >= 700"
                    value={node.data.condition || ''}
                    onChange={(e) => {
                      const newCondition = e.target.value;
                      updateNodeData(node.id, { condition: newCondition });
                      setConditionValidationError(validateCondition(newCondition));
                    }}
                    onBlur={(e) => {
                      setConditionValidationError(validateCondition(e.target.value));
                    }}
                  />
                  {conditionValidationError && (
                    <div className="validation-error">
                      {conditionValidationError}
                    </div>
                  )}
                  <div className="config-field-hint">
                    Expression to determine which branch to take (e.g., amount &gt; 1000, status === "approved")
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
                <label className="config-field-label">Assignment Type</label>
                <select
                  className="config-select"
                  value={node.data.assignmentType || 'unassigned'}
                  onChange={(e) => updateNodeData(node.id, {
                    assignmentType: e.target.value,
                    assignee: '',
                    assigneeRole: '',
                    assigneeGroup: '',
                    assigneePosition: '',
                    assigneeExpression: ''
                  })}
                >
                  <option value="unassigned">Unassigned (Any user can claim)</option>
                  <option value="user">Specific User</option>
                  <option value="role">Role</option>
                  <option value="group">Group</option>
                  <option value="position">Position</option>
                  <option value="userAndRole">User + Role (Both required)</option>
                  <option value="manager">Submitter's Manager</option>
                  <option value="departmentHead">Department Head</option>
                  <option value="expression">Dynamic (From Process Variable)</option>
                </select>
                <div className="config-field-hint">
                  How this task should be assigned when workflow runs
                </div>
              </div>

              {/* Specific User Assignment */}
              {(node.data.assignmentType === 'user' || node.data.assignmentType === 'userAndRole') && (
                <div className="config-field">
                  <label className="config-field-label">Assign to User</label>
                  {identityLoading ? (
                    <div className="config-loading">Loading users...</div>
                  ) : identityUsers.length > 0 ? (
                    <select
                      className="config-select"
                      value={node.data.assignee || ''}
                      onChange={(e) => updateNodeData(node.id, { assignee: e.target.value })}
                    >
                      <option value="">Select a user...</option>
                      {identityUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="config-input"
                      placeholder="user@example.com"
                      value={node.data.assignee || ''}
                      onChange={(e) => updateNodeData(node.id, { assignee: e.target.value })}
                    />
                  )}
                  <div className="config-field-hint">
                    The user who will be assigned this task
                  </div>
                </div>
              )}

              {/* Role Assignment */}
              {(node.data.assignmentType === 'role' || node.data.assignmentType === 'userAndRole') && (
                <div className="config-field">
                  <label className="config-field-label">Assign to Role</label>
                  {identityLoading ? (
                    <div className="config-loading">Loading roles...</div>
                  ) : identityRoles.length > 0 ? (
                    <select
                      className="config-select"
                      value={node.data.assigneeRole || ''}
                      onChange={(e) => updateNodeData(node.id, { assigneeRole: e.target.value })}
                    >
                      <option value="">Select a role...</option>
                      {identityRoles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.display_name || role.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="config-input"
                      placeholder="e.g., Manager, Approver, HR"
                      value={node.data.assigneeRole || ''}
                      onChange={(e) => updateNodeData(node.id, { assigneeRole: e.target.value })}
                    />
                  )}
                  <div className="config-field-hint">
                    {node.data.assignmentType === 'userAndRole'
                      ? 'User must also have this role to see the task'
                      : 'Any user with this role can complete the task'}
                  </div>
                </div>
              )}

              {/* Group Assignment */}
              {node.data.assignmentType === 'group' && (
                <div className="config-field">
                  <label className="config-field-label">Assign to Group</label>
                  {identityLoading ? (
                    <div className="config-loading">Loading groups...</div>
                  ) : identityGroups.length > 0 ? (
                    <select
                      className="config-select"
                      value={node.data.assigneeGroup || ''}
                      onChange={(e) => updateNodeData(node.id, { assigneeGroup: e.target.value })}
                    >
                      <option value="">Select a group...</option>
                      {identityGroups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.member_count || 0} members)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="config-input"
                      placeholder="e.g., Finance Team"
                      value={node.data.assigneeGroup || ''}
                      onChange={(e) => updateNodeData(node.id, { assigneeGroup: e.target.value })}
                    />
                  )}
                  <div className="config-field-hint">
                    Any member of this group can complete the task
                  </div>
                </div>
              )}

              {/* Position Assignment */}
              {node.data.assignmentType === 'position' && (
                <div className="config-field">
                  <label className="config-field-label">Assign to Position</label>
                  {identityLoading ? (
                    <div className="config-loading">Loading positions...</div>
                  ) : identityPositions.length > 0 ? (
                    <select
                      className="config-select"
                      value={node.data.assigneePosition || ''}
                      onChange={(e) => updateNodeData(node.id, { assigneePosition: e.target.value })}
                    >
                      <option value="">Select a position...</option>
                      {identityPositions.map(pos => (
                        <option key={pos.id} value={pos.id}>
                          {pos.title} {pos.user_name ? `(${pos.user_name})` : '(Vacant)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="config-input"
                      placeholder="e.g., Finance Director"
                      value={node.data.assigneePosition || ''}
                      onChange={(e) => updateNodeData(node.id, { assigneePosition: e.target.value })}
                    />
                  )}
                  <div className="config-field-hint">
                    Task assigned to whoever holds this position
                  </div>
                </div>
              )}

              {/* Manager Assignment Info */}
              {node.data.assignmentType === 'manager' && (
                <div className="config-field">
                  <div className="assignment-info-box">
                    <strong>Manager Assignment</strong>
                    <p>This task will be automatically assigned to the manager of the user who submitted/triggered the workflow.</p>
                    <code>Resolved from: processData.submittedBy's manager</code>
                  </div>
                </div>
              )}

              {/* Department Head Assignment Info */}
              {node.data.assignmentType === 'departmentHead' && (
                <div className="config-field">
                  <div className="assignment-info-box">
                    <strong>Department Head Assignment</strong>
                    <p>This task will be automatically assigned to the department head of the user who submitted/triggered the workflow.</p>
                    <code>Resolved from: processData.submittedBy's department head</code>
                  </div>
                </div>
              )}

              {/* Dynamic Expression Assignment */}
              {node.data.assignmentType === 'expression' && (
                <div className="config-field">
                  <label className="config-field-label">Assignment Expression</label>
                  <select
                    className="config-select"
                    value={node.data.assigneeExpression || ''}
                    onChange={(e) => updateNodeData(node.id, { assigneeExpression: e.target.value })}
                  >
                    <option value="">Select a process variable...</option>
                    {(currentWorkflow?.inputVariables || []).map(v => (
                      <option key={v.id} value={`processData.${v.name}`}>
                        {v.name} ({v.type})
                      </option>
                    ))}
                  </select>
                  <div className="config-field-hint">
                    Task will be assigned to the value of this variable at runtime
                  </div>
                  {node.data.assigneeExpression && (
                    <div className="expression-preview">
                      <code>Assigned to: {node.data.assigneeExpression}</code>
                    </div>
                  )}
                </div>
              )}

              {/* Candidate Groups (optional additional filter) */}
              {node.data.assignmentType && !['unassigned', 'manager', 'departmentHead'].includes(node.data.assignmentType) && (
                <div className="config-field">
                  <label className="config-field-label">Fallback Groups (Optional)</label>
                  {identityGroups.length > 0 ? (
                    <select
                      className="config-select"
                      value={node.data.candidateGroups || ''}
                      onChange={(e) => updateNodeData(node.id, { candidateGroups: e.target.value })}
                    >
                      <option value="">None</option>
                      {identityGroups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="config-input"
                      placeholder="e.g., Finance, Operations (comma separated)"
                      value={node.data.candidateGroups || ''}
                      onChange={(e) => updateNodeData(node.id, { candidateGroups: e.target.value })}
                    />
                  )}
                  <div className="config-field-hint">
                    Fallback group that can claim this task if primary assignee is unavailable
                  </div>
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
                  placeholder="Enter your prompt here. Use {variableName} for workflow variables..."
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
                  {"Prompt template with variable placeholders. Example: \"Analyze this feedback: {processData.feedback}\""}
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

        {/* REST API Configuration */}
        {node.type === 'restApi' && (
          <div className="property-section">
            <div className="section-header">
              <h4>
                <Globe size={16} style={{ marginRight: '6px' }} />
                REST API Configuration
              </h4>
            </div>

            <div className="gateway-config-section">
              <div className="config-field">
                <label className="config-field-label">HTTP Method</label>
                <select
                  className="config-select"
                  value={node.data.method || 'GET'}
                  onChange={(e) => updateNodeData(node.id, { method: e.target.value })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <div className="config-field-hint">
                  HTTP method for the API call
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">URL</label>
                <input
                  type="text"
                  className={`config-input ${urlValidationError ? 'input-error' : ''}`}
                  placeholder="https://api.example.com/endpoint"
                  value={node.data.url || ''}
                  onChange={(e) => {
                    const newUrl = e.target.value;
                    updateNodeData(node.id, { url: newUrl });
                    setUrlValidationError(validateUrl(newUrl));
                  }}
                  onBlur={(e) => {
                    setUrlValidationError(validateUrl(e.target.value));
                  }}
                />
                {urlValidationError && (
                  <div className="validation-error">
                    {urlValidationError}
                  </div>
                )}
                <div className="config-field-hint">
                  {"API endpoint URL. Use {variableName} for dynamic values."}
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Headers (JSON)</label>
                <textarea
                  className="config-input"
                  placeholder='{"Content-Type": "application/json", "Authorization": "Bearer {token}"}'
                  rows="3"
                  value={node.data.headers || ''}
                  onChange={(e) => updateNodeData(node.id, { headers: e.target.value })}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                />
                <div className="config-field-hint">
                  Request headers in JSON format
                </div>
              </div>

              {['POST', 'PUT', 'PATCH'].includes(node.data.method) && (
                <div className="config-field">
                  <label className="config-field-label">Request Body (JSON)</label>
                  <textarea
                    className="config-input"
                    placeholder='{"key": "value", "data": "{processData.field}"}'
                    rows="5"
                    value={node.data.body || ''}
                    onChange={(e) => updateNodeData(node.id, { body: e.target.value })}
                    style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                  <div className="config-field-hint">
                    {"Request body in JSON format. Use {processData.field} for workflow variables."}
                  </div>
                </div>
              )}

              <div className="config-field">
                <label className="config-field-label">Query Parameters (JSON)</label>
                <textarea
                  className="config-input"
                  placeholder='{"page": "1", "limit": "10", "filter": "{processData.filter}"}'
                  rows="2"
                  value={node.data.queryParams || ''}
                  onChange={(e) => updateNodeData(node.id, { queryParams: e.target.value })}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                />
                <div className="config-field-hint">
                  URL query parameters in JSON format
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Authentication</label>
                <select
                  className="config-select"
                  value={node.data.authType || 'none'}
                  onChange={(e) => updateNodeData(node.id, { authType: e.target.value })}
                >
                  <option value="none">No Authentication</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="basic">Basic Auth</option>
                  <option value="apiKey">API Key</option>
                </select>
              </div>

              {node.data.authType === 'bearer' && (
                <div className="config-field">
                  <label className="config-field-label">Bearer Token</label>
                  <input
                    type="text"
                    className="config-input"
                    placeholder="{processData.accessToken} or static token"
                    value={node.data.bearerToken || ''}
                    onChange={(e) => updateNodeData(node.id, { bearerToken: e.target.value })}
                  />
                </div>
              )}

              {node.data.authType === 'basic' && (
                <>
                  <div className="config-field">
                    <label className="config-field-label">Username</label>
                    <input
                      type="text"
                      className="config-input"
                      placeholder="username"
                      value={node.data.basicUsername || ''}
                      onChange={(e) => updateNodeData(node.id, { basicUsername: e.target.value })}
                    />
                  </div>
                  <div className="config-field">
                    <label className="config-field-label">Password</label>
                    <input
                      type="password"
                      className="config-input"
                      placeholder="password"
                      value={node.data.basicPassword || ''}
                      onChange={(e) => updateNodeData(node.id, { basicPassword: e.target.value })}
                    />
                  </div>
                </>
              )}

              {node.data.authType === 'apiKey' && (
                <>
                  <div className="config-field">
                    <label className="config-field-label">API Key Header Name</label>
                    <input
                      type="text"
                      className="config-input"
                      placeholder="X-API-Key"
                      value={node.data.apiKeyHeader || 'X-API-Key'}
                      onChange={(e) => updateNodeData(node.id, { apiKeyHeader: e.target.value })}
                    />
                  </div>
                  <div className="config-field">
                    <label className="config-field-label">API Key Value</label>
                    <input
                      type="text"
                      className="config-input"
                      placeholder="{processData.apiKey} or static key"
                      value={node.data.apiKeyValue || ''}
                      onChange={(e) => updateNodeData(node.id, { apiKeyValue: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="config-field">
                <label className="config-field-label">Timeout (ms)</label>
                <input
                  type="number"
                  className="config-input"
                  placeholder="30000"
                  min="1000"
                  max="300000"
                  value={node.data.timeout || 30000}
                  onChange={(e) => updateNodeData(node.id, { timeout: parseInt(e.target.value) })}
                />
                <div className="config-field-hint">
                  Request timeout in milliseconds (default: 30000)
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Output Variable</label>
                <input
                  type="text"
                  className="config-input"
                  placeholder="e.g., apiResponse, userData, orderDetails"
                  value={node.data.outputVariable || ''}
                  onChange={(e) => updateNodeData(node.id, { outputVariable: e.target.value })}
                />
                <div className="config-field-hint">
                  Name of variable to store API response in processData
                </div>
              </div>

              <div className="config-field">
                <label className="config-field-label">Map to Data Model</label>
                <select
                  className="config-select"
                  value={node.data.targetDataModel || ''}
                  onChange={(e) => updateNodeData(node.id, { targetDataModel: e.target.value })}
                >
                  <option value="">None (store raw response)</option>
                  {dataModels.map(dm => (
                    <option key={dm.id} value={dm.id}>{dm.name}</option>
                  ))}
                </select>
                <div className="config-field-hint">
                  Optionally map response to a data model structure
                </div>
              </div>

              {node.data.targetDataModel && (
                <div className="config-field">
                  <label className="config-field-label">Response Mapping (JSON Path)</label>
                  <textarea
                    className="config-input"
                    placeholder='{"name": "response.data.name", "email": "response.data.email"}'
                    rows="3"
                    value={node.data.responseMapping || ''}
                    onChange={(e) => updateNodeData(node.id, { responseMapping: e.target.value })}
                    style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                  />
                  <div className="config-field-hint">
                    Map API response fields to data model fields
                  </div>
                </div>
              )}

              <div className="config-field">
                <label className="config-field-label">Error Handling</label>
                <select
                  className="config-select"
                  value={node.data.errorHandling || 'fail'}
                  onChange={(e) => updateNodeData(node.id, { errorHandling: e.target.value })}
                >
                  <option value="fail">Fail workflow on error</option>
                  <option value="continue">Continue with null response</option>
                  <option value="retry">Retry (up to 3 times)</option>
                </select>
                <div className="config-field-hint">
                  How to handle API errors or timeouts
                </div>
              </div>

              {node.data.url && (
                <div className="rest-api-preview">
                  <div className="preview-header">
                    <span
                      className="method-badge"
                      style={{
                        backgroundColor: {
                          GET: '#22c55e',
                          POST: '#3b82f6',
                          PUT: '#f59e0b',
                          PATCH: '#8b5cf6',
                          DELETE: '#ef4444'
                        }[node.data.method || 'GET'],
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        marginRight: '8px'
                      }}
                    >
                      {node.data.method || 'GET'}
                    </span>
                    <span style={{ fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {node.data.url}
                    </span>
                  </div>
                </div>
              )}
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
                  <div className="endpoint-input-container" style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="config-input"
                      placeholder="/api/trigger/workflow-name"
                      value={node.data.apiEndpoint || generateApiEndpoint(currentWorkflow?.name)}
                      onChange={(e) => updateNodeData(node.id, { apiEndpoint: e.target.value })}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px' }}
                    />
                    <button
                      className="config-btn"
                      onClick={() => {
                        const endpoint = node.data.apiEndpoint || generateApiEndpoint(currentWorkflow?.name);
                        navigator.clipboard.writeText(endpoint);
                        notify('Endpoint copied to clipboard', 'success');
                      }}
                      title="Copy endpoint"
                      style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}
                    >
                      Copy
                    </button>
                    <button
                      className="config-btn"
                      onClick={() => {
                        const generated = generateApiEndpoint(currentWorkflow?.name);
                        updateNodeData(node.id, { apiEndpoint: generated });
                      }}
                      title="Regenerate endpoint"
                      style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}
                    >
                      Reset
                    </button>
                  </div>
                  <div className="config-field-hint">
                    POST to this endpoint to trigger the workflow. Customize or use the auto-generated path.
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

      {/* Add Rule Modal */}
      {showAddRuleModal && (
        <div className="modal-overlay" onClick={() => setShowAddRuleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><BookOpen size={18} /> Add Rule to Node</h3>
              <button className="close-btn" onClick={() => setShowAddRuleModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {availableRules.length === 0 ? (
                <div className="empty-state">
                  <BookOpen size={32} />
                  <p>No rules available</p>
                  <p className="hint">Create rules in the Rule Engine panel first</p>
                  <button
                    className="action-btn"
                    onClick={() => {
                      setShowAddRuleModal(false);
                      setActiveTab('rules');
                      setActiveSidebar('rule-engine');
                    }}
                  >
                    Go to Rule Engine
                  </button>
                </div>
              ) : (
                <div className="selection-list">
                  {availableRules.map(rule => (
                    <div
                      key={rule.id}
                      className="selection-item"
                      onClick={() => handleSelectRule(rule)}
                    >
                      <div className="selection-item-icon">
                        <BookOpen size={16} />
                      </div>
                      <div className="selection-item-info">
                        <div className="selection-item-name">{rule.name}</div>
                        <div className="selection-item-desc">{rule.description || 'No description'}</div>
                      </div>
                      <Check size={16} className="selection-item-check" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Data Model Modal */}
      {showAddDataModelModal && (
        <div className="modal-overlay" onClick={() => setShowAddDataModelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Database size={18} /> Link Data Model</h3>
              <button className="close-btn" onClick={() => setShowAddDataModelModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {dataModels.length === 0 ? (
                <div className="empty-state">
                  <Database size={32} />
                  <p>No data models available</p>
                  <p className="hint">Data models are generated with the application</p>
                </div>
              ) : (
                <div className="selection-list">
                  {dataModels.map(model => (
                    <div
                      key={model.id}
                      className="selection-item"
                      onClick={() => handleSelectDataModel(model)}
                    >
                      <div className="selection-item-icon">
                        <Database size={16} />
                      </div>
                      <div className="selection-item-info">
                        <div className="selection-item-name">{model.name}</div>
                        <div className="selection-item-desc">
                          {model.fields?.length || 0} fields
                        </div>
                      </div>
                      <Check size={16} className="selection-item-check" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link Form Modal */}
      {showLinkFormModal && (
        <div className="modal-overlay" onClick={() => setShowLinkFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FileText size={18} /> Link Form</h3>
              <button className="close-btn" onClick={() => setShowLinkFormModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {connectedForms.length === 0 ? (
                <div className="empty-state">
                  <FileText size={32} />
                  <p>No forms available</p>
                  <p className="hint">Create forms in the Form Builder first</p>
                  <button
                    className="action-btn"
                    onClick={() => {
                      setShowLinkFormModal(false);
                      setActiveTab('forms');
                      setActiveSidebar('form-builder');
                    }}
                  >
                    Go to Form Builder
                  </button>
                </div>
              ) : (
                <div className="selection-list">
                  {connectedForms.map(form => (
                    <div
                      key={form.id}
                      className="selection-item"
                      onClick={() => handleSelectForm(form)}
                    >
                      <div className="selection-item-icon">
                        <FileText size={16} />
                      </div>
                      <div className="selection-item-info">
                        <div className="selection-item-name">{form.name || form.title}</div>
                        <div className="selection-item-desc">
                          {form.fields?.length || 0} fields
                        </div>
                      </div>
                      <Check size={16} className="selection-item-check" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
