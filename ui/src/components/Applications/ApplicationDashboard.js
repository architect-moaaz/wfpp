import React, { useState, useEffect } from 'react';
import './ApplicationDashboard.css';
import {
  ArrowLeft,
  Package,
  Workflow,
  Calendar,
  Activity,
  Rocket,
  FileText,
  Database,
  Layout,
  Settings,
  Play,
  Pause,
  BarChart3,
  Users
} from 'lucide-react';

const ApplicationDashboard = ({ applicationId, onBack }) => {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (applicationId) {
      fetchApplication();
    }
  }, [applicationId]);

  const fetchApplication = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/applications/${applicationId}`);
      const data = await response.json();

      if (data.success) {
        setApplication(data.application);
      }
    } catch (error) {
      console.error('Error fetching application:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': '#10b981',
      'Deployed': '#3b82f6',
      'Draft': '#f59e0b',
      'Inactive': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">Loading application...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="dashboard-container">
        <div className="empty-state">Application not found</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Applications
        </button>
      </div>

      {/* Application Info */}
      <div className="app-info-card">
        <div className="app-info-header">
          <div className="app-info-left">
            <div className="app-icon-large">
              <Package size={32} />
            </div>
            <div>
              <h1 className="app-name">{application.name}</h1>
              <p className="app-description-text">{application.description}</p>
            </div>
          </div>
          <div className="app-info-right">
            <span
              className="status-badge-large"
              style={{
                backgroundColor: `${getStatusColor(application.metadata.status)}15`,
                color: getStatusColor(application.metadata.status)
              }}
            >
              {application.metadata.status}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="app-metadata">
          <div className="metadata-item">
            <Calendar size={16} />
            <span>Created: {new Date(application.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="metadata-item">
            <Activity size={16} />
            <span>Updated: {new Date(application.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="metadata-item">
            <Users size={16} />
            <span>Version: {application.metadata.version}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <Workflow size={24} style={{ color: '#3b82f6' }} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{application.stats.workflowCount}</div>
            <div className="stat-label">Workflows</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            <FileText size={24} style={{ color: '#f59e0b' }} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{application.stats.formCount}</div>
            <div className="stat-label">Forms</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#d1fae5' }}>
            <Layout size={24} style={{ color: '#10b981' }} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{application.stats.pageCount}</div>
            <div className="stat-label">Pages</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e9d5ff' }}>
            <Database size={24} style={{ color: '#a855f7' }} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{application.stats.dataModelCount}</div>
            <div className="stat-label">Data Models</div>
          </div>
        </div>
      </div>

      {/* Resources Section */}
      <div className="dashboard-grid">
        {/* Workflows */}
        <div className="resource-card">
          <div className="resource-header">
            <h3>
              <Workflow size={20} />
              Workflows
            </h3>
            <span className="resource-count">{application.resources.workflows.length}</span>
          </div>
          <div className="resource-list">
            {application.resources.workflows.length > 0 ? (
              application.resources.workflows.map((workflow, index) => (
                <div key={index} className="resource-item">
                  <Workflow size={16} />
                  <span>{workflow.name || workflow.id || `Workflow ${index + 1}`}</span>
                </div>
              ))
            ) : (
              <div className="resource-empty">No workflows linked yet</div>
            )}
          </div>
        </div>

        {/* Data Models */}
        <div className="resource-card">
          <div className="resource-header">
            <h3>
              <Database size={20} />
              Data Models
            </h3>
            <span className="resource-count">{application.resources.dataModels.length}</span>
          </div>
          <div className="resource-list">
            {application.resources.dataModels.length > 0 ? (
              application.resources.dataModels.map((model, index) => (
                <div key={index} className="resource-item">
                  <Database size={16} />
                  <span>{model.name || `Model ${index + 1}`}</span>
                </div>
              ))
            ) : (
              <div className="resource-empty">No data models defined</div>
            )}
          </div>
        </div>

        {/* Forms */}
        <div className="resource-card">
          <div className="resource-header">
            <h3>
              <FileText size={20} />
              Forms
            </h3>
            <span className="resource-count">{application.resources.forms.length}</span>
          </div>
          <div className="resource-list">
            {application.resources.forms.length > 0 ? (
              application.resources.forms.map((form, index) => (
                <div key={index} className="resource-item">
                  <FileText size={16} />
                  <span>{form.name || `Form ${index + 1}`}</span>
                </div>
              ))
            ) : (
              <div className="resource-empty">No forms created</div>
            )}
          </div>
        </div>

        {/* Pages */}
        <div className="resource-card">
          <div className="resource-header">
            <h3>
              <Layout size={20} />
              Pages
            </h3>
            <span className="resource-count">{application.resources.pages.length}</span>
          </div>
          <div className="resource-list">
            {application.resources.pages.length > 0 ? (
              application.resources.pages.map((page, index) => (
                <div key={index} className="resource-item">
                  <Layout size={16} />
                  <span>{page.name || `Page ${index + 1}`}</span>
                </div>
              ))
            ) : (
              <div className="resource-empty">No pages designed</div>
            )}
          </div>
        </div>
      </div>

      {/* Deployment Section */}
      <div className="deployment-section">
        <h2>
          <Rocket size={24} />
          Deployment
        </h2>

        {application.deployment ? (
          <div className="deployment-info">
            <div className="deployment-status">
              <div className="deployment-status-item">
                <span className="deployment-label">Status:</span>
                <span className="deployment-value">
                  {application.deployment.status === 'deployed' ? (
                    <>
                      <Play size={16} style={{ color: '#10b981' }} />
                      Deployed
                    </>
                  ) : (
                    <>
                      <Pause size={16} style={{ color: '#6b7280' }} />
                      Not Deployed
                    </>
                  )}
                </span>
              </div>
              {application.deployment.url && (
                <div className="deployment-status-item">
                  <span className="deployment-label">URL:</span>
                  <a
                    href={application.deployment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="deployment-link"
                  >
                    {application.deployment.url}
                  </a>
                </div>
              )}
              {application.deployment.deployedAt && (
                <div className="deployment-status-item">
                  <span className="deployment-label">Deployed At:</span>
                  <span className="deployment-value">
                    {new Date(application.deployment.deployedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {application.deployment.environment && (
              <div className="deployment-env">
                <h4>Environment Variables</h4>
                <div className="env-list">
                  {Object.entries(application.deployment.environment).map(([key, value]) => (
                    <div key={key} className="env-item">
                      <code className="env-key">{key}</code>
                      <code className="env-value">{value}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="deployment-empty">
            <Rocket size={48} style={{ color: '#d1d5db' }} />
            <p>Application not yet deployed</p>
            <button className="btn-primary">
              <Rocket size={16} />
              Deploy Application
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="dashboard-actions">
        <button className="btn-primary">
          <Settings size={16} />
          Configure
        </button>
        <button className="btn-primary">
          <BarChart3 size={16} />
          View Analytics
        </button>
        <button className="btn-secondary">
          <Rocket size={16} />
          {application.deployment?.status === 'deployed' ? 'Redeploy' : 'Deploy'}
        </button>
      </div>
    </div>
  );
};

export default ApplicationDashboard;
