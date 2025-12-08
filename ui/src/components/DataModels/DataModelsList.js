import React from 'react';
import { Database, Edit, Trash2, Calendar, CheckSquare, Square } from 'lucide-react';
import '../Forms/FormsList.css';

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
    if (selectionMode || e?.target?.closest('.form-checkbox')) {
      onToggleSelect(model.id);
      return;
    }

    // Otherwise open editor
    onEditModel(model);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="forms-grid">
      {dataModels.map(model => {
        const isSelected = selectedModelIds.includes(model.id);
        return (
          <div
            key={model.id}
            className={`form-card ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
            onClick={(e) => handleCardClick(model, e)}
          >
            <div className="form-card-header">
              {selectionMode && (
                <div
                  className="form-checkbox"
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
              <Database size={20} />
              {!selectionMode && (
                <div className="form-card-actions">
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditModel(model);
                    }}
                    title="Edit Model"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="btn-icon btn-delete"
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

            <h3 className="form-card-title">{model.displayName || model.name}</h3>
            {model.description && (
              <p className="form-card-description">{model.description}</p>
            )}

            <div className="form-card-meta">
              <div className="meta-item">
                <span className="meta-label">Fields:</span>
                <span className="meta-value">{model.fields?.length || 0}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Relations:</span>
                <span className="meta-value">{model.relationships?.length || 0}</span>
              </div>
            </div>

            {model.workflowId && (
              <div className="form-card-workflow">
                <span className="workflow-badge">Workflow: {model.workflowId}</span>
              </div>
            )}

            <div className="form-card-footer">
              <div className="footer-item">
                <Calendar size={14} />
                <span>{formatDate(model.createdAt)}</span>
              </div>
              <div className="footer-item">
                <span className="version-badge">v{model.version || '1.0'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DataModelsList;
