import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit, Calendar, CheckSquare, Square, Eye, Copy, Zap } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import RuleEditor from '../RuleEngine/RuleEditor';
import '../Forms/FormsList.css';
import './RuleEnginePanel.css';

const RuleEnginePanel = () => {
  const { currentApplication, dataModels } = useWorkflow();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRuleIds, setSelectedRuleIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadRules = useCallback(async () => {
    if (!currentApplication?.id) return;

    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/rules/application/${currentApplication.id}`
      );
      const data = await response.json();

      if (data.success) {
        setRules(data.rules || []);
      } else {
        console.error('Failed to load rules:', data.error);
      }
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  }, [currentApplication?.id]);

  // Update rules from current application
  useEffect(() => {
    if (currentApplication?.resources?.rules) {
      setRules(currentApplication.resources.rules);
      setLoading(false);
    } else if (currentApplication?.id) {
      loadRules();
    } else {
      setRules([]);
      setLoading(false);
    }
  }, [currentApplication, loadRules]);

  const handleRuleClick = (rule, e) => {
    if (selectionMode || e?.target?.closest('.form-checkbox')) {
      handleToggleSelect(rule.id);
      return;
    }
    // Open in rule editor
    handleEditRule(rule);
  };

  const handleEditRule = (rule) => {
    setSelectedRule(rule);
    setIsEditMode(true);
    setShowEditor(true);
  };

  const handlePreviewRule = (rule, e) => {
    e.stopPropagation();
    setSelectedRule(rule);
    setIsEditMode(false);
    setShowEditor(true);
  };

  const handleCreateNew = () => {
    setSelectedRule(null);
    setIsEditMode(true);
    setShowEditor(true);
  };

  const handleDuplicate = async (rule, e) => {
    e.stopPropagation();
    const timestamp = Date.now();
    const duplicatedRule = {
      ...rule,
      id: `rule_${timestamp}`,
      name: `${rule.name} (Copy)`,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch('http://localhost:5000/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...duplicatedRule,
          applicationId: currentApplication.id
        })
      });

      if (response.ok) {
        loadRules();
      }
    } catch (error) {
      console.error('Failed to duplicate rule:', error);
    }
  };

  const handleSaveRule = async (ruleData) => {
    try {
      const url = selectedRule?.id
        ? `http://localhost:5000/api/rules/${selectedRule.id}`
        : 'http://localhost:5000/api/rules';

      const method = selectedRule?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ruleData,
          applicationId: currentApplication.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowEditor(false);
        setSelectedRule(null);
        loadRules();
      } else {
        throw new Error(data.error || 'Failed to save rule');
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      throw error;
    }
  };

  const handleToggleSelect = (ruleId) => {
    setSelectedRuleIds(prev => {
      if (prev.includes(ruleId)) {
        return prev.filter(id => id !== ruleId);
      } else {
        return [...prev, ruleId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedRuleIds.length === rules.length) {
      setSelectedRuleIds([]);
    } else {
      setSelectedRuleIds(rules.map(r => r.id));
    }
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedRuleIds([]);
  };

  const handleDelete = async (ruleId, e) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/rules/${ruleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadRules();
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRuleIds.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedRuleIds.length} rule${selectedRuleIds.length > 1 ? 's' : ''}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const deletePromises = selectedRuleIds.map(ruleId =>
        fetch(`http://localhost:5000/api/rules/${ruleId}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      setSelectedRuleIds([]);
      setSelectionMode(false);
      loadRules();
    } catch (error) {
      console.error('Failed to delete rules:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getRuleType = (rule) => {
    const type = rule.type || 'validation';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getConditionCount = (rule) => {
    return rule.conditions?.all?.length || rule.conditions?.any?.length || 0;
  };

  const getActionCount = (rule) => {
    return rule.actions?.actions?.length || rule.actions?.length || 0;
  };

  if (showEditor) {
    return (
      <div className="rule-preview-container">
        <div className="preview-header">
          <h2>{isEditMode ? (selectedRule ? 'Edit Rule' : 'Create Rule') : 'Preview'}: {selectedRule?.name || 'New Rule'}</h2>
          <div className="preview-actions">
            {!isEditMode && selectedRule && (
              <button
                className="btn-icon"
                onClick={() => setIsEditMode(true)}
                title="Edit"
              >
                <Edit size={16} />
              </button>
            )}
            <button
              className="btn-icon btn-delete"
              onClick={() => {
                setShowEditor(false);
                setIsEditMode(false);
                setSelectedRule(null);
              }}
              title="Close"
            >
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>x</span>
            </button>
          </div>
        </div>
        <div className="rule-editor-wrapper">
          <RuleEditor
            rule={selectedRule}
            onSave={handleSaveRule}
            onCancel={() => {
              setShowEditor(false);
              setSelectedRule(null);
            }}
            applicationId={currentApplication?.id}
            dataModels={dataModels}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="forms-list-container">
      <div className="forms-header">
        <div className="forms-title">
          <Zap size={24} />
          <h1>Business Rules</h1>
          {rules.length > 0 && !selectionMode && (
            <span className="forms-count">({rules.length})</span>
          )}
        </div>
        <div className="forms-header-actions">
          {selectionMode ? (
            <>
              <span className="selection-count">
                {selectedRuleIds.length} selected
              </span>
              <button
                className="btn-secondary"
                onClick={handleSelectAll}
                title={selectedRuleIds.length === rules.length ? 'Deselect All' : 'Select All'}
              >
                {selectedRuleIds.length === rules.length ? (
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
                disabled={selectedRuleIds.length === 0}
              >
                <Trash2 size={18} />
                Delete ({selectedRuleIds.length})
              </button>
              <button className="btn-secondary" onClick={handleExitSelectionMode}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {rules.length > 0 && (
                <button className="btn-secondary" onClick={handleEnterSelectionMode}>
                  <CheckSquare size={18} />
                  Select
                </button>
              )}
              <button className="btn-create-form" onClick={handleCreateNew}>
                <Plus size={18} />
                Create Rule
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="forms-loading">Loading rules...</div>
      ) : rules.length === 0 ? (
        <div className="forms-empty">
          <Zap size={64} style={{ opacity: 0.3 }} />
          <h2>No Business Rules Yet</h2>
          <p>Create your first business rule to add validation and automation logic.</p>
          <button className="btn-create-form" onClick={handleCreateNew}>
            <Plus size={18} />
            Create Rule
          </button>
        </div>
      ) : (
        <div className="forms-grid">
          {rules.map((rule) => {
            const isSelected = selectedRuleIds.includes(rule.id);
            return (
              <div
                key={rule.id}
                className={`form-card ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
                onClick={(e) => handleRuleClick(rule, e)}
              >
                <div className="form-card-header">
                  {selectionMode && (
                    <div
                      className="form-checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(rule.id);
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="checkbox-icon checked" />
                      ) : (
                        <Square size={20} className="checkbox-icon" />
                      )}
                    </div>
                  )}
                  <Zap size={20} />
                  {!selectionMode && (
                    <div className="form-card-actions">
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); handleEditRule(rule); }}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => handlePreviewRule(rule, e)}
                        title="Preview"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => handleDuplicate(rule, e)}
                        title="Duplicate"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={(e) => handleDelete(rule.id, e)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="form-card-title">{rule.name}</h3>
                {rule.description && (
                  <p className="form-card-description">{rule.description}</p>
                )}

                <div className="form-card-meta">
                  <div className="meta-item">
                    <span className="meta-label">Type:</span>
                    <span className="meta-value">{getRuleType(rule)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Conditions:</span>
                    <span className="meta-value">{getConditionCount(rule)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Actions:</span>
                    <span className="meta-value">{getActionCount(rule)}</span>
                  </div>
                </div>

                <div className="form-card-footer">
                  <div className="footer-item">
                    <Calendar size={14} />
                    <span>{formatDate(rule.createdAt || rule.created_at)}</span>
                  </div>
                  <div className="footer-item">
                    <span className={`status-badge ${rule.is_active !== false ? 'active' : 'inactive'}`}>
                      {rule.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
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

export default RuleEnginePanel;
