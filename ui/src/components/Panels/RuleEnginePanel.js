import React, { useState, useEffect } from 'react';
import './PanelStyles.css';
import { GitBranch, Plus, Trash2, Edit3 } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import RuleEditor from '../RuleEngine/RuleEditor';

const RuleEnginePanel = () => {
  const { currentApplication, dataModels } = useWorkflow();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => {
    if (currentApplication?.id) {
      loadRules();
    }
  }, [currentApplication]);

  const loadRules = async () => {
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
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowEditor(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setShowEditor(true);
  };

  const handleSaveRule = async (ruleData) => {
    try {
      const url = editingRule?.id
        ? `http://localhost:5000/api/rules/${editingRule.id}`
        : 'http://localhost:5000/api/rules';

      const method = editingRule?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ruleData)
      });

      const data = await response.json();

      if (data.success) {
        setShowEditor(false);
        setEditingRule(null);
        loadRules();
      } else {
        throw new Error(data.error || 'Failed to save rule');
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      throw error;
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/rules/${ruleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        loadRules();
      } else {
        alert('Failed to delete rule: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule');
    }
  };

  const filteredRules = rules.filter(rule =>
    rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="panel-container">
      <div className="panel-header">
        <div className="panel-title">
          <GitBranch size={24} />
          <div>
            <h2>Rule Engine</h2>
            <p>Create and manage business rules and validation logic</p>
          </div>
        </div>
        <button className="primary-btn" onClick={handleCreateRule}>
          <Plus size={16} />
          Create New Rule
        </button>
      </div>

      <div className="panel-content">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-state">Loading rules...</div>
        ) : filteredRules.length === 0 ? (
          <div className="empty-state">
            <p>{searchTerm ? 'No rules found matching your search' : 'No rules created yet. Click "Create New Rule" to get started.'}</p>
          </div>
        ) : (
          <div className="items-grid">
            {filteredRules.map(rule => (
              <div key={rule.id} className="item-card">
                <div className="item-header">
                  <div className="item-icon rule-icon">
                    <GitBranch size={18} />
                  </div>
                  <span className="item-badge">{rule.type}</span>
                  {!rule.is_active && (
                    <span className="item-badge inactive">Inactive</span>
                  )}
                </div>
                <h3 className="item-title">{rule.name}</h3>
                <p className="item-description">{rule.description || 'No description'}</p>
                <div className="rule-meta">
                  <span className="rule-priority">Priority: {rule.priority}</span>
                  <span className="rule-conditions">
                    {rule.conditions?.all?.length || rule.conditions?.any?.length || 0} conditions
                  </span>
                  <span className="rule-actions">
                    {rule.actions?.actions?.length || 0} actions
                  </span>
                </div>
                <div className="item-actions">
                  <button
                    className="action-btn"
                    onClick={() => handleEditRule(rule)}
                    title="Edit rule"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                  <button
                    className="action-btn danger"
                    onClick={() => handleDeleteRule(rule.id)}
                    title="Delete rule"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditor && (
        <RuleEditor
          rule={editingRule}
          onSave={handleSaveRule}
          onCancel={() => {
            setShowEditor(false);
            setEditingRule(null);
          }}
          applicationId={currentApplication?.id}
          dataModels={dataModels}
        />
      )}
    </div>
  );
};

export default RuleEnginePanel;
