import React, { useState, useEffect } from 'react';
import { Layout, Trash2, CheckSquare, Square, Monitor, Smartphone, Globe, Edit2, X, Palette, Network, ExternalLink, Calendar } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import '../Forms/FormsList.css';
import './PagesList.css';

const PagesList = ({ onDesignPage, onViewFlow }) => {
  const { connectedPages, currentApplication, currentWorkflow } = useWorkflow();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPageIds, setSelectedPageIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Update pages whenever connectedPages or currentWorkflow changes
  useEffect(() => {
    if (connectedPages && connectedPages.length > 0) {
      // Filter pages by current workflow if a workflow is selected
      let filteredPages = connectedPages;
      if (currentWorkflow && currentWorkflow.id) {
        // Show pages that belong to this workflow OR don't have a workflowId (legacy data)
        filteredPages = connectedPages.filter(page =>
          !page.workflowId || page.workflowId === currentWorkflow.id
        );
        console.log('[PagesList] Filtering pages by workflow:', currentWorkflow.id, 'Found:', filteredPages.length);
      }
      setPages(filteredPages);
      setLoading(false);
    } else if (currentApplication) {
      // If there's an application but no pages, show empty state
      setPages([]);
      setLoading(false);
    } else {
      // No application selected, show empty state
      setPages([]);
      setLoading(false);
    }
  }, [connectedPages, currentApplication, currentWorkflow]);

  const handlePageClick = (page, e) => {
    // If in selection mode or clicking checkbox, toggle selection
    if (selectionMode || e?.target?.closest('.form-checkbox')) {
      handleToggleSelect(page.id);
      return;
    }
    // Otherwise open design page
    onDesignPage(page.id);
  };

  const handleToggleSelect = (pageId) => {
    setSelectedPageIds(prev => {
      if (prev.includes(pageId)) {
        return prev.filter(id => id !== pageId);
      } else {
        return [...prev, pageId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPageIds.length === pages.length) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(pages.map(p => p.id));
    }
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPageIds([]);
  };

  const handleDelete = async (pageId, e) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this page?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/pages/${pageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Context will auto-refresh when application is reloaded
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPageIds.length === 0) return;

    const confirmMessage = `Are you sure you want to delete ${selectedPageIds.length} page${selectedPageIds.length > 1 ? 's' : ''}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete all selected pages
      const deletePromises = selectedPageIds.map(pageId =>
        fetch(`http://localhost:5000/api/pages/${pageId}`, {
          method: 'DELETE'
        })
      );

      await Promise.all(deletePromises);

      // Clear selection and exit selection mode
      setSelectedPageIds([]);
      setSelectionMode(false);
      // Context will auto-refresh when application is reloaded
    } catch (error) {
      console.error('Failed to delete pages:', error);
    }
  };

  const handleEdit = (page, e) => {
    e.stopPropagation();
    setEditingPage({ ...page });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPage) return;

    try {
      const response = await fetch(`http://localhost:5000/api/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingPage)
      });

      const data = await response.json();

      if (data.success) {
        setShowEditModal(false);
        setEditingPage(null);
        // Context will auto-refresh when application is reloaded
      }
    } catch (error) {
      console.error('Failed to update page:', error);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingPage(null);
  };

  const getPlatformLabel = (platform) => {
    if (platform === 'mobile') return 'Mobile';
    if (platform === 'web') return 'Web';
    return 'Both';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="forms-list-container">
      <div className="forms-header">
        <div className="forms-title">
          <Layout size={24} />
          <h1>Pages</h1>
          {pages.length > 0 && !selectionMode && (
            <span className="forms-count">({pages.length})</span>
          )}
        </div>
        <div className="forms-header-actions">
          {selectionMode ? (
            <>
              <span className="selection-count">
                {selectedPageIds.length} selected
              </span>
              <button
                className="btn-secondary"
                onClick={handleSelectAll}
                title={selectedPageIds.length === pages.length ? 'Deselect All' : 'Select All'}
              >
                {selectedPageIds.length === pages.length ? (
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
                disabled={selectedPageIds.length === 0}
              >
                <Trash2 size={18} />
                Delete ({selectedPageIds.length})
              </button>
              <button className="btn-secondary" onClick={handleExitSelectionMode}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {pages.length > 0 && (
                <>
                  <button className="btn-secondary" onClick={onViewFlow}>
                    <Network size={18} />
                    View Flow
                  </button>
                  <button className="btn-secondary" onClick={handleEnterSelectionMode}>
                    <CheckSquare size={18} />
                    Select
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="forms-loading">Loading pages...</div>
      ) : pages.length === 0 ? (
        <div className="forms-empty">
          <Layout size={64} style={{ opacity: 0.3 }} />
          <h2>No Pages Yet</h2>
          <p>Pages are automatically generated by the PageExpert when you create workflows with forms and data models.</p>
        </div>
      ) : (
        <div className="forms-grid">
          {pages.map((page) => {
            const isSelected = selectedPageIds.includes(page.id);
            return (
              <div
                key={page.id}
                className={`form-card ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
                onClick={(e) => handlePageClick(page, e)}
              >
                <div className="form-card-header">
                  {selectionMode && (
                    <div
                      className="form-checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(page.id);
                      }}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="checkbox-icon checked" />
                      ) : (
                        <Square size={20} className="checkbox-icon" />
                      )}
                    </div>
                  )}
                  <Layout size={20} />
                  {!selectionMode && (
                    <div className="form-card-actions">
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/preview.html?id=${page.id}`, '_blank');
                        }}
                        title="Preview"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDesignPage(page.id);
                        }}
                        title="Design"
                      >
                        <Palette size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => handleEdit(page, e)}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={(e) => handleDelete(page.id, e)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="form-card-title">{page.name}</h3>
                {page.route && (
                  <p className="form-card-description">{page.route}</p>
                )}

                <div className="form-card-meta">
                  <div className="meta-item">
                    <span className="meta-label">Type:</span>
                    <span className="meta-value">{page.type || 'page'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Platform:</span>
                    <span className="meta-value">{getPlatformLabel(page.platform)}</span>
                  </div>
                </div>

                {page.sections && page.sections.length > 0 && (
                  <div className="form-card-workflow">
                    <span className="workflow-badge">{page.sections.length} section{page.sections.length !== 1 ? 's' : ''}</span>
                  </div>
                )}

                <div className="form-card-footer">
                  <div className="footer-item">
                    <Calendar size={14} />
                    <span>{formatDate(page.createdAt)}</span>
                  </div>
                  <div className="footer-item">
                    <span className="version-badge">v{page.version || '1.0'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showEditModal && editingPage && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Page</h2>
              <button className="btn-icon" onClick={handleCancelEdit}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Page Name</label>
                <input
                  type="text"
                  value={editingPage.name || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, name: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Route</label>
                <input
                  type="text"
                  value={editingPage.route || ''}
                  onChange={(e) => setEditingPage({ ...editingPage, route: e.target.value })}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={editingPage.type || 'list'}
                  onChange={(e) => setEditingPage({ ...editingPage, type: e.target.value })}
                  className="form-input"
                >
                  <option value="list">List</option>
                  <option value="detail">Detail</option>
                  <option value="form">Form</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="auth">Auth</option>
                  <option value="confirmation">Confirmation</option>
                </select>
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select
                  value={editingPage.platform || 'both'}
                  onChange={(e) => setEditingPage({ ...editingPage, platform: e.target.value })}
                  className="form-input"
                >
                  <option value="web">Web</option>
                  <option value="mobile">Mobile</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button className="btn-create-form" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PagesList;
