import React from 'react';
import { Database, Edit, Trash2, ArrowRight, CheckSquare, Square } from 'lucide-react';
import './DataModelsList.css';

const DataModelsList = ({
  dataModels,
  onEditModel,
  onDeleteModel,
  selectionMode = false,
  selectedModelIds = [],
  onToggleSelect
}) => {

  const handleCardClick = (model, e) => {
    // If in selection mode or clicking checkbox, toggle selection
    if (selectionMode || e?.target?.closest('.model-checkbox')) {
      onToggleSelect(model.id);
      return;
    }

    // Otherwise open editor
    onEditModel(model);
  };

  return (
    <div className="data-models-list">
      {dataModels.map(model => {
        const isSelected = selectedModelIds.includes(model.id);
        return (
          <div
            key={model.id}
            className={`model-card ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
            onClick={(e) => handleCardClick(model, e)}
          >
            <div className="model-card-header">
              {selectionMode && (
                <div
                  className="model-checkbox"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(model.id);
                  }}
                >
                  {isSelected ? (
                    <CheckSquare size={20} className="checkbox-icon checked" />
                  ) : (
                    <Square size={20} className="checkbox-icon" />
                  )}
                </div>
              )}
              <div className="model-icon">
                <Database size={20} />
              </div>
              <div className="model-info">
                <h3 className="model-title">{model.displayName || model.name}</h3>
                <p className="model-description">{model.description}</p>
              </div>
              {!selectionMode && (
                <div className="model-actions">
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditModel(model);
                    }}
                    title="Edit Model"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteModel(model.id);
                    }}
                    title="Delete Model"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

          <div className="model-card-body">
            <div className="fields-section">
              <h4 className="section-title">Fields ({model.fields.length})</h4>
              <div className="fields-grid">
                {model.fields.slice(0, 6).map((field, idx) => (
                  <div key={idx} className="field-item">
                    <span className={`field-badge ${field.primaryKey ? 'primary' : ''} ${field.foreignKey ? 'foreign' : ''}`}>
                      {field.primaryKey ? '🔑' : field.foreignKey ? '🔗' : ''}
                      {field.name}
                    </span>
                    <span className="field-type-badge">{field.type}</span>
                  </div>
                ))}
                {model.fields.length > 6 && (
                  <div className="field-item-more">
                    +{model.fields.length - 6} more fields
                  </div>
                )}
              </div>
            </div>

            {model.relationships && model.relationships.length > 0 && (
              <div className="relationships-section">
                <h4 className="section-title">Relationships ({model.relationships.length})</h4>
                <div className="relationships-list">
                  {model.relationships.map((rel, idx) => (
                    <div key={idx} className="relationship-item">
                      <span className="rel-source">{model.name}</span>
                      <ArrowRight size={14} className="rel-arrow" />
                      <span className="rel-target">{rel.targetModel || rel.target}</span>
                      <span className="rel-type-badge">{rel.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="model-card-footer">
            <div className="footer-meta">
              <span className="meta-item">Version: {model.version || '1.0'}</span>
              {model.workflowId && (
                <span className="meta-item">Workflow: {model.workflowId}</span>
              )}
            </div>
          </div>
        </div>
      );
    })}
    </div>
  );
};

export default DataModelsList;
