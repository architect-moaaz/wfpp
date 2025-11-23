import React, { useState, useEffect } from 'react';
import {
  History,
  ChevronDown,
  ChevronRight,
  Star,
  GitBranch,
  Eye,
  RotateCcw,
  Copy,
  Trash2,
  Archive,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Download,
  Upload,
  GitCompare,
  Check,
  X
} from 'lucide-react';
import versionApi from '../../services/versionApi';
import './VersionHistoryPanel.css';

const VersionHistoryPanel = ({ workflowId, onVersionRestore }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedVersions, setExpandedVersions] = useState(new Set());
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (workflowId) {
      loadVersions();
    }
  }, [workflowId, filterStatus]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);

      const options = {
        includeArchived: filterStatus === 'all',
        status: filterStatus !== 'all' ? filterStatus.toUpperCase() : undefined
      };

      const response = await versionApi.getVersions(workflowId, options);
      setVersions(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (versionNumber) => {
    try {
      await versionApi.publishVersion(workflowId, versionNumber, false);
      await loadVersions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetDefault = async (versionNumber) => {
    try {
      await versionApi.setDefaultVersion(workflowId, versionNumber);
      await loadVersions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRestore = async (versionNumber) => {
    try {
      const result = await versionApi.restoreVersion(workflowId, versionNumber, {
        author: 'user',
        changeDescription: `Restored from version ${versionNumber}`
      });

      if (onVersionRestore) {
        onVersionRestore(result.data.version);
      }

      await loadVersions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClone = async (versionNumber) => {
    try {
      await versionApi.cloneVersion(workflowId, versionNumber, {
        author: 'user',
        changeDescription: `Cloned from version ${versionNumber}`
      });
      await loadVersions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleArchive = async (versionNumber) => {
    try {
      await versionApi.archiveVersion(workflowId, versionNumber);
      await loadVersions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (versionNumber) => {
    if (!window.confirm(`Are you sure you want to delete version ${versionNumber}?`)) {
      return;
    }

    try {
      await versionApi.deleteVersion(workflowId, versionNumber);
      await loadVersions();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExport = async (versionNumber) => {
    try {
      const result = await versionApi.exportVersion(workflowId, versionNumber);
      const dataStr = JSON.stringify(result.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflow-${workflowId}-v${versionNumber}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCompareVersions = async () => {
    if (selectedVersions.length !== 2) {
      setError('Please select exactly 2 versions to compare');
      return;
    }

    try {
      const [v1, v2] = selectedVersions.sort((a, b) => a - b);
      const result = await versionApi.compareVersions(workflowId, v1, v2);
      setComparison(result.data);
      setShowCompareModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleVersionExpansion = (versionNumber) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionNumber)) {
      newExpanded.delete(versionNumber);
    } else {
      newExpanded.add(versionNumber);
    }
    setExpandedVersions(newExpanded);
  };

  const toggleVersionSelection = (versionNumber) => {
    const newSelected = selectedVersions.includes(versionNumber)
      ? selectedVersions.filter(v => v !== versionNumber)
      : [...selectedVersions, versionNumber];
    setSelectedVersions(newSelected);
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: { icon: AlertCircle, className: 'status-draft', label: 'Draft' },
      PUBLISHED: { icon: CheckCircle, className: 'status-published', label: 'Published' },
      DEPRECATED: { icon: AlertCircle, className: 'status-deprecated', label: 'Deprecated' },
      ARCHIVED: { icon: Archive, className: 'status-archived', label: 'Archived' }
    };

    const badge = badges[status] || badges.DRAFT;
    const Icon = badge.icon;

    return (
      <span className={`version-status ${badge.className}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="version-history-panel">
        <div className="panel-header">
          <History size={20} />
          <h3>Version History</h3>
        </div>
        <div className="loading">Loading versions...</div>
      </div>
    );
  }

  return (
    <div className="version-history-panel">
      <div className="panel-header">
        <History size={20} />
        <h3>Version History</h3>
        <button className="refresh-btn" onClick={loadVersions}>
          <RotateCcw size={16} />
        </button>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="panel-toolbar">
        <div className="filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Versions</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>

        {selectedVersions.length === 2 && (
          <button className="compare-btn" onClick={handleCompareVersions}>
            <GitCompare size={16} />
            Compare Selected
          </button>
        )}
      </div>

      <div className="versions-list">
        {versions.length === 0 ? (
          <div className="empty-state">
            <History size={48} />
            <p>No versions found</p>
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              className={`version-item ${version.metadata.isDefault ? 'is-default' : ''} ${
                selectedVersions.includes(version.version) ? 'selected' : ''
              }`}
            >
              <div className="version-header" onClick={() => toggleVersionExpansion(version.version)}>
                <div className="version-header-left">
                  <button className="expand-btn">
                    {expandedVersions.has(version.version) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>

                  <input
                    type="checkbox"
                    checked={selectedVersions.includes(version.version)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleVersionSelection(version.version);
                    }}
                    className="version-checkbox"
                  />

                  <div className="version-info">
                    <div className="version-title">
                      <span className="version-number">v{version.version}</span>
                      {version.metadata.isDefault && (
                        <span className="default-badge">
                          <Star size={14} /> Default
                        </span>
                      )}
                    </div>
                    <p className="version-description">
                      {version.metadata.changeDescription || 'No description'}
                    </p>
                  </div>
                </div>

                <div className="version-header-right">
                  {getStatusBadge(version.status)}
                </div>
              </div>

              {expandedVersions.has(version.version) && (
                <div className="version-details">
                  <div className="version-metadata">
                    <div className="metadata-item">
                      <User size={14} />
                      <span>Author: {version.metadata.author}</span>
                    </div>
                    <div className="metadata-item">
                      <Clock size={14} />
                      <span>Created: {formatDate(version.metadata.createdAt)}</span>
                    </div>
                    {version.metadata.publishedAt && (
                      <div className="metadata-item">
                        <CheckCircle size={14} />
                        <span>Published: {formatDate(version.metadata.publishedAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="version-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total Instances:</span>
                      <span className="stat-value">{version.stats.instanceCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Active:</span>
                      <span className="stat-value">{version.stats.activeInstances}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Completed:</span>
                      <span className="stat-value">{version.stats.completedInstances}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Failed:</span>
                      <span className="stat-value">{version.stats.failedInstances}</span>
                    </div>
                  </div>

                  <div className="version-actions">
                    {version.status === 'DRAFT' && (
                      <button
                        className="action-btn publish"
                        onClick={() => handlePublish(version.version)}
                      >
                        <CheckCircle size={14} />
                        Publish
                      </button>
                    )}

                    {version.status === 'PUBLISHED' && !version.metadata.isDefault && (
                      <button
                        className="action-btn set-default"
                        onClick={() => handleSetDefault(version.version)}
                      >
                        <Star size={14} />
                        Set as Default
                      </button>
                    )}

                    <button
                      className="action-btn restore"
                      onClick={() => handleRestore(version.version)}
                    >
                      <RotateCcw size={14} />
                      Restore
                    </button>

                    <button
                      className="action-btn clone"
                      onClick={() => handleClone(version.version)}
                    >
                      <Copy size={14} />
                      Clone
                    </button>

                    <button
                      className="action-btn export"
                      onClick={() => handleExport(version.version)}
                    >
                      <Download size={14} />
                      Export
                    </button>

                    {version.status !== 'ARCHIVED' && (
                      <button
                        className="action-btn archive"
                        onClick={() => handleArchive(version.version)}
                      >
                        <Archive size={14} />
                        Archive
                      </button>
                    )}

                    {!version.metadata.isDefault && version.stats.instanceCount === 0 && (
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(version.version)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </div>

                  {version.metadata.tags && version.metadata.tags.length > 0 && (
                    <div className="version-tags">
                      {version.metadata.tags.map((tag, index) => (
                        <span key={index} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showCompareModal && comparison && (
        <div className="compare-modal-overlay" onClick={() => setShowCompareModal(false)}>
          <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <GitCompare size={20} />
                Version Comparison: v{comparison.versions.from} vs v{comparison.versions.to}
              </h3>
              <button className="close-btn" onClick={() => setShowCompareModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-content">
              <div className="comparison-summary">
                <div className="summary-item">
                  <span className="summary-label">Nodes Added:</span>
                  <span className="summary-value added">{comparison.summary.nodesAdded}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Nodes Removed:</span>
                  <span className="summary-value removed">{comparison.summary.nodesRemoved}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Nodes Modified:</span>
                  <span className="summary-value modified">{comparison.summary.nodesModified}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Connections Added:</span>
                  <span className="summary-value added">{comparison.summary.connectionsAdded}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Connections Removed:</span>
                  <span className="summary-value removed">{comparison.summary.connectionsRemoved}</span>
                </div>
              </div>

              {comparison.changes.nodes.added.length > 0 && (
                <div className="change-section">
                  <h4 className="added">Added Nodes ({comparison.changes.nodes.added.length})</h4>
                  <ul>
                    {comparison.changes.nodes.added.map((node, idx) => (
                      <li key={idx}>
                        {node.id} - {node.type}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {comparison.changes.nodes.removed.length > 0 && (
                <div className="change-section">
                  <h4 className="removed">Removed Nodes ({comparison.changes.nodes.removed.length})</h4>
                  <ul>
                    {comparison.changes.nodes.removed.map((node, idx) => (
                      <li key={idx}>
                        {node.id} - {node.type}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {comparison.changes.nodes.modified.length > 0 && (
                <div className="change-section">
                  <h4 className="modified">Modified Nodes ({comparison.changes.nodes.modified.length})</h4>
                  <ul>
                    {comparison.changes.nodes.modified.map((change, idx) => (
                      <li key={idx}>
                        {change.id} - {change.changes.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionHistoryPanel;
