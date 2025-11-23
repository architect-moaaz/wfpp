import React, { useState } from 'react';
import { X, Table, Edit3 } from 'lucide-react';
import DataModelEditor from './DataModelEditor';
import './DataModelViewer.css';

const DataModelViewer = ({ model, onClose }) => {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'editor'

  const renderTableView = () => {
    return (
      <div className="data-model-table-view">
        <div className="model-header-info">
          <h2>{model.displayName || model.name}</h2>
          <p className="model-description">{model.description}</p>
        </div>

        <div className="fields-table-container">
          <table className="fields-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Type</th>
                <th>Required</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {model.fields && model.fields.length > 0 ? (
                model.fields.map((field, index) => (
                  <tr key={index}>
                    <td className="field-name">{field.name}</td>
                    <td className="field-type">
                      <span className="type-badge">{field.type}</span>
                    </td>
                    <td className="field-required">
                      {field.required ? (
                        <span className="badge badge-required">Yes</span>
                      ) : (
                        <span className="badge badge-optional">No</span>
                      )}
                    </td>
                    <td className="field-description">{field.description || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-state">
                    No fields defined
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {model.relationships && model.relationships.length > 0 && (
          <div className="relationships-section">
            <h3>Relationships</h3>
            <div className="relationships-list">
              {model.relationships.map((rel, index) => (
                <div key={index} className="relationship-item">
                  <div className="relationship-type">{rel.type}</div>
                  <div className="relationship-target">{rel.targetModel || rel.target}</div>
                  {rel.foreignKey && (
                    <div className="relationship-fk">FK: {rel.foreignKey}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="data-model-viewer">
      <div className="viewer-header">
        <div className="viewer-title">
          <h2>Data Model</h2>
        </div>
        <div className="viewer-tabs">
          <button
            className={`tab-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            <Table size={18} />
            Table View
          </button>
          <button
            className={`tab-btn ${viewMode === 'editor' ? 'active' : ''}`}
            onClick={() => setViewMode('editor')}
          >
            <Edit3 size={18} />
            Editor
          </button>
        </div>
        <button className="viewer-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="viewer-content">
        {viewMode === 'table' ? renderTableView() : <DataModelEditor model={model} onClose={onClose} />}
      </div>
    </div>
  );
};

export default DataModelViewer;
