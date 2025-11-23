import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Edit, Calendar, CheckSquare, Square } from 'lucide-react';
import FormBuilder from '../FormBuilder/FormBuilder';
import { useWorkflow } from '../../context/WorkflowContext';
import './FormsList.css';

const FormsList = () => {
  const { connectedForms, currentApplication } = useWorkflow();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedFormIds, setSelectedFormIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Update forms whenever connectedForms changes
  useEffect(() => {
    if (connectedForms && connectedForms.length > 0) {
      setForms(connectedForms);
      setLoading(false);
    } else if (currentApplication) {
      // If there's an application but no forms, show empty state
      setForms([]);
      setLoading(false);
    } else {
      // No application selected, show empty state
      setForms([]);
      setLoading(false);
    }
  }, [connectedForms, currentApplication]);

  const handleFormClick = (form, e) => {
    // If in selection mode or clicking checkbox, toggle selection
    if (selectionMode || e?.target?.closest('.form-checkbox')) {
      handleToggleSelect(form.id);
      return;
    }

    // Otherwise open editor
    setSelectedForm(form);
    setShowEditor(true);
  };

  const handleCreateNew = () => {
    setSelectedForm({
      name: '',
      title: '',
      description: '',
      fields: []
    });
    setShowEditor(true);
  };

  const handleToggleSelect = (formId) => {
    setSelectedFormIds(prev => {
      if (prev.includes(formId)) {
        return prev.filter(id => id !== formId);
      } else {
        return [...prev, formId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedFormIds.length === forms.length) {
      setSelectedFormIds([]);
    } else {
      setSelectedFormIds(forms.map(f => f.id));
    }
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedFormIds([]);
  };

  const handleDelete = async (formId, e) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this form?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/forms/${formId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Context will auto-refresh when application is reloaded
      }
    } catch (error) {
      console.error('Failed to delete form:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFormIds.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedFormIds.length} form${selectedFormIds.length > 1 ? 's' : ''}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete all selected forms
      const deletePromises = selectedFormIds.map(formId =>
        fetch(`http://localhost:5000/api/forms/${formId}`, {
          method: 'DELETE'
        })
      );

      await Promise.all(deletePromises);

      // Clear selection and exit selection mode
      setSelectedFormIds([]);
      setSelectionMode(false);
      // Context will auto-refresh when application is reloaded
    } catch (error) {
      console.error('Failed to delete forms:', error);
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setSelectedForm(null);
    // Context will auto-refresh when application is reloaded
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (showEditor) {
    return <FormBuilder initialForm={selectedForm} formId={selectedForm?.id} onClose={handleEditorClose} />;
  }

  return (
    <div className="forms-list-container">
      <div className="forms-header">
        <div className="forms-title">
          <FileText size={24} />
          <h1>Forms</h1>
          {forms.length > 0 && !selectionMode && (
            <span className="forms-count">({forms.length})</span>
          )}
        </div>
        <div className="forms-header-actions">
          {selectionMode ? (
            <>
              <span className="selection-count">
                {selectedFormIds.length} selected
              </span>
              <button
                className="btn-secondary"
                onClick={handleSelectAll}
                title={selectedFormIds.length === forms.length ? 'Deselect All' : 'Select All'}
              >
                {selectedFormIds.length === forms.length ? (
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
                disabled={selectedFormIds.length === 0}
              >
                <Trash2 size={18} />
                Delete ({selectedFormIds.length})
              </button>
              <button className="btn-secondary" onClick={handleExitSelectionMode}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {forms.length > 0 && (
                <button className="btn-secondary" onClick={handleEnterSelectionMode}>
                  <CheckSquare size={18} />
                  Select
                </button>
              )}
              <button className="btn-create-form" onClick={handleCreateNew}>
                <Plus size={18} />
                Create Form
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="forms-loading">Loading forms...</div>
      ) : forms.length === 0 ? (
        <div className="forms-empty">
          <FileText size={64} style={{ opacity: 0.3 }} />
          <h2>No Forms Yet</h2>
          <p>Forms are automatically generated when you create workflows with start events or user tasks.</p>
          <button className="btn-create-form" onClick={handleCreateNew}>
            <Plus size={18} />
            Create Form Manually
          </button>
        </div>
      ) : (
        <div className="forms-grid">
          {forms.map((form) => {
            const isSelected = selectedFormIds.includes(form.id);
            return (
              <div
                key={form.id}
                className={`form-card ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
                onClick={(e) => handleFormClick(form, e)}
              >
                <div className="form-card-header">
                  {selectionMode && (
                    <div
                      className="form-checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(form.id);
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="checkbox-icon checked" />
                      ) : (
                        <Square size={20} className="checkbox-icon" />
                      )}
                    </div>
                  )}
                  <FileText size={20} />
                  {!selectionMode && (
                    <div className="form-card-actions">
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFormClick(form);
                        }}
                        title="Edit Form"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={(e) => handleDelete(form.id, e)}
                        title="Delete Form"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

              <h3 className="form-card-title">{form.title || form.name}</h3>
              <p className="form-card-description">{form.description}</p>

              <div className="form-card-meta">
                <div className="meta-item">
                  <span className="meta-label">Fields:</span>
                  <span className="meta-value">{form.fields?.length || 0}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Type:</span>
                  <span className="meta-value">{form.nodeType || 'custom'}</span>
                </div>
              </div>

              {form.workflowId && (
                <div className="form-card-workflow">
                  <span className="workflow-badge">Workflow: {form.workflowId}</span>
                </div>
              )}

              <div className="form-card-footer">
                <div className="footer-item">
                  <Calendar size={14} />
                  <span>{formatDate(form.createdAt)}</span>
                </div>
                <div className="footer-item">
                  <span className="version-badge">v{form.version || '1.0'}</span>
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

export default FormsList;
