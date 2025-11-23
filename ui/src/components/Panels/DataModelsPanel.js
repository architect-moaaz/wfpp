import React, { useState, useEffect } from 'react';
import { Database, Plus, Network, List, CheckSquare, Square, Trash2 } from 'lucide-react';
import ERDiagram from '../DataModels/ERDiagram';
import DataModelsList from '../DataModels/DataModelsList';
import DataModelEditor from '../DataModels/DataModelEditor';
import { useWorkflow } from '../../context/WorkflowContext';
import './PanelStyles.css';
import './DataModelsPanel.css';

const DataModelsPanel = () => {
  const { dataModels: contextDataModels, currentApplication } = useWorkflow();
  const [dataModels, setDataModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('diagram'); // 'diagram', 'list', 'editor'
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedModelIds, setSelectedModelIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Update data models whenever context data models change
  useEffect(() => {
    if (contextDataModels && contextDataModels.length > 0) {
      setDataModels(contextDataModels);
      setLoading(false);
    } else if (currentApplication) {
      // If there's an application but no data models, show empty state
      setDataModels([]);
      setLoading(false);
    } else {
      // No application selected, show empty state
      setDataModels([]);
      setLoading(false);
    }
  }, [contextDataModels, currentApplication]);

  const handleCreateNew = () => {
    setSelectedModel(null);
    setView('editor');
  };

  const handleEditModel = (model) => {
    setSelectedModel(model);
    setView('editor');
  };

  const handleCloseEditor = () => {
    setView('diagram');
    setSelectedModel(null);
    // No need to fetch - context will auto-update
  };

  const handleToggleSelect = (modelId) => {
    setSelectedModelIds(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedModelIds.length === dataModels.length) {
      setSelectedModelIds([]);
    } else {
      setSelectedModelIds(dataModels.map(m => m.id));
    }
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedModelIds([]);
  };

  const handleDelete = async (modelId) => {
    if (!window.confirm('Are you sure you want to delete this data model?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/datamodels/${modelId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Context will auto-refresh when application is reloaded
      }
    } catch (error) {
      console.error('Failed to delete data model:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedModelIds.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedModelIds.length} data model${selectedModelIds.length > 1 ? 's' : ''}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete all selected models
      const deletePromises = selectedModelIds.map(modelId =>
        fetch(`http://localhost:5000/api/datamodels/${modelId}`, {
          method: 'DELETE'
        })
      );

      await Promise.all(deletePromises);

      // Clear selection and exit selection mode
      setSelectedModelIds([]);
      setSelectionMode(false);
      // Context will auto-refresh when application is reloaded
    } catch (error) {
      console.error('Failed to delete data models:', error);
    }
  };

  if (view === 'editor') {
    return <DataModelEditor model={selectedModel} onClose={handleCloseEditor} />;
  }

  return (
    <div className="data-models-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Database size={24} />
          <div>
            <h2>Data Models</h2>
            <p>Define data structures and relationships for workflows</p>
          </div>
          {dataModels.length > 0 && !selectionMode && (
            <span className="models-count">({dataModels.length})</span>
          )}
        </div>
        <div className="header-actions">
          {selectionMode ? (
            <>
              <span className="selection-count">
                {selectedModelIds.length} selected
              </span>
              <button
                className="btn-secondary"
                onClick={handleSelectAll}
                title={selectedModelIds.length === dataModels.length ? 'Deselect All' : 'Select All'}
              >
                {selectedModelIds.length === dataModels.length ? (
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
                disabled={selectedModelIds.length === 0}
              >
                <Trash2 size={18} />
                Delete ({selectedModelIds.length})
              </button>
              <button className="btn-secondary" onClick={handleExitSelectionMode}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <div className="view-toggle">
                <button
                  className={`toggle-btn ${view === 'diagram' ? 'active' : ''}`}
                  onClick={() => setView('diagram')}
                  title="ER Diagram View"
                >
                  <Network size={18} />
                  Diagram
                </button>
                <button
                  className={`toggle-btn ${view === 'list' ? 'active' : ''}`}
                  onClick={() => setView('list')}
                  title="List View"
                >
                  <List size={18} />
                  List
                </button>
              </div>
              {dataModels.length > 0 && view === 'list' && (
                <button className="btn-secondary" onClick={handleEnterSelectionMode}>
                  <CheckSquare size={18} />
                  Select
                </button>
              )}
              <button className="primary-btn" onClick={handleCreateNew}>
                <Plus size={16} />
                Create Model
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="panel-loading">Loading data models...</div>
      ) : dataModels.length === 0 ? (
        <div className="panel-empty">
          <Database size={64} style={{ opacity: 0.3 }} />
          <h3>No Data Models Yet</h3>
          <p>Data models are automatically generated when you create workflows.</p>
          <button className="primary-btn" onClick={handleCreateNew}>
            <Plus size={18} />
            Create Data Model Manually
          </button>
        </div>
      ) : (
        <div className="panel-content">
          {view === 'diagram' ? (
            <ERDiagram dataModels={dataModels} onEditModel={handleEditModel} />
          ) : (
            <DataModelsList
              dataModels={dataModels}
              onEditModel={handleEditModel}
              onDeleteModel={handleDelete}
              selectionMode={selectionMode}
              selectedModelIds={selectedModelIds}
              onToggleSelect={handleToggleSelect}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DataModelsPanel;
