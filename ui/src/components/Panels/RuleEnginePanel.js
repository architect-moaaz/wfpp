import React from 'react';
import './PanelStyles.css';
import { GitBranch, Plus, ExternalLink } from 'lucide-react';

const RuleEnginePanel = () => {
  const rules = [
    { id: 1, name: 'Email Format Validation', type: 'Validation', description: 'Validates email format using regex pattern' },
    { id: 2, name: 'Phone Number Validation', type: 'Validation', description: 'Checks phone number format and country code' },
    { id: 3, name: 'Credit Score Evaluation', type: 'Decision', description: 'Evaluates customer credit worthiness' }
  ];

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
        <button className="primary-btn">
          <Plus size={16} />
          Create New Rule
        </button>
      </div>

      <div className="panel-content">
        <div className="search-bar">
          <input type="text" placeholder="Search rules..." />
        </div>

        <div className="items-grid">
          {rules.map(rule => (
            <div key={rule.id} className="item-card">
              <div className="item-header">
                <div className="item-icon rule-icon">
                  <GitBranch size={18} />
                </div>
                <span className="item-badge">{rule.type}</span>
              </div>
              <h3 className="item-title">{rule.name}</h3>
              <p className="item-description">{rule.description}</p>
              <div className="item-actions">
                <button className="action-btn">Edit</button>
                <button className="action-btn">
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RuleEnginePanel;
