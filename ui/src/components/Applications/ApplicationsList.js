import React, { useState, useEffect } from 'react';
import { Package, Plus, Play, Square, Edit2, Trash2, Rocket, ExternalLink, Database, FileText, Workflow, Layout, Link } from 'lucide-react';
import './ApplicationsList.css';
import ApplicationDashboard from './ApplicationDashboard';
import WelcomeScreen from '../WelcomeScreen/WelcomeScreen';
import { useWorkflow } from '../../context/WorkflowContext';

const ApplicationsList = () => {
  const { setCurrentApplication, setConnectedForms, setDataModels, setConnectedPages, setCurrentWorkflow, setActiveSidebar } = useWorkflow();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [availableWorkflows, setAvailableWorkflows] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'dashboard'
  const [selectedAppId, setSelectedAppId] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/applications');
      const data = await response.json();

      if (data.success) {
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (appId, e) => {
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this application?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/applications/${appId}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        fetchApplications();
      }
    } catch (error) {
      console.error('Failed to delete application:', error);
    }
  };

  const handleDeploy = async (app, e) => {
    e.stopPropagation();

    try {
      // First generate the scaffold
      const generateResponse = await fetch(`http://localhost:5000/api/applications/${app.id}/generate`, {
        method: 'POST'
      });
      const generateData = await generateResponse.json();

      if (!generateData.success) {
        alert('Failed to generate application');
        return;
      }

      // Then deploy
      const deployResponse = await fetch(`http://localhost:5000/api/applications/${app.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'standalone', port: 4000 })
      });
      const deployData = await deployResponse.json();

      if (deployData.success) {
        alert(`Application deployed successfully!\nPath: ${deployData.deployment.path}`);
        fetchApplications();
      }
    } catch (error) {
      console.error('Failed to deploy application:', error);
      alert('Failed to deploy application');
    }
  };

  const handleStart = async (app, e) => {
    e.stopPropagation();

    try {
      const response = await fetch(`http://localhost:5000/api/applications/${app.id}/start`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        alert(`Application started!\nURL: ${data.url}\nPID: ${data.pid}`);
        fetchApplications();
      }
    } catch (error) {
      console.error('Failed to start application:', error);
      alert('Failed to start application');
    }
  };

  const handleStop = async (app, e) => {
    e.stopPropagation();

    try {
      const response = await fetch(`http://localhost:5000/api/applications/${app.id}/stop`, {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        alert('Application stopped successfully');
        fetchApplications();
      }
    } catch (error) {
      console.error('Failed to stop application:', error);
      alert('Failed to stop application');
    }
  };

  const handleManageWorkflows = async (app, e) => {
    e.stopPropagation();
    setSelectedApp(app);

    // Fetch available workflows
    try {
      const response = await fetch('http://localhost:5000/api/workflows');
      const data = await response.json();
      if (data.success && data.workflows) {
        setAvailableWorkflows(data.workflows);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }

    setShowWorkflowModal(true);
  };

  const handleLinkWorkflow = async (workflowId) => {
    if (!selectedApp) return;

    try {
      const response = await fetch(`http://localhost:5000/api/applications/${selectedApp.id}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId })
      });
      const data = await response.json();

      if (data.success) {
        fetchApplications();
        setShowWorkflowModal(false);
        setSelectedApp(null);
      } else {
        alert('Failed to link workflow');
      }
    } catch (error) {
      console.error('Failed to link workflow:', error);
      alert('Failed to link workflow');
    }
  };

  const handleLoadApplication = async (app) => {
    try {
      // Fetch full application data
      const response = await fetch(`http://localhost:5000/api/applications/${app.id}`);
      const data = await response.json();

      if (data.success && data.application) {
        const application = data.application;

        // Set the current application
        setCurrentApplication(application);

        // Load all workflows
        const workflows = application.resources?.workflows || [];
        if (workflows.length > 0) {
          // Fetch full workflow data for the first workflow
          const firstWorkflowId = workflows[0].id || workflows[0];
          try {
            const wfResponse = await fetch(`http://localhost:5000/api/workflows/${firstWorkflowId}`);
            const wfData = await wfResponse.json();
            if (wfData.success && wfData.workflow) {
              setCurrentWorkflow(wfData.workflow);
            }
          } catch (error) {
            console.error(`Failed to fetch workflow ${firstWorkflowId}:`, error);
          }
        }

        // Load forms
        const forms = application.resources?.forms || [];
        setConnectedForms(forms);

        // Load data models
        const models = application.resources?.dataModels || [];
        setDataModels(models);

        // Load pages
        const pages = application.resources?.pages || [];
        setConnectedPages(pages);

        // Navigate to workflow editor
        setActiveSidebar('workflow-editor');

        console.log(`Loaded application "${application.name}" with:`, {
          workflows: workflows.length,
          forms: forms.length,
          models: models.length,
          pages: pages.length
        });

        alert(`Application "${application.name}" loaded successfully!\n\nWorkflows: ${workflows.length}\nForms: ${forms.length}\nData Models: ${models.length}\nPages: ${pages.length}`);
      }
    } catch (error) {
      console.error('Failed to load application:', error);
      alert('Failed to load application');
    }
  };

  const handleViewDashboard = (appId) => {
    setSelectedAppId(appId);
    setViewMode('dashboard');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedAppId(null);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: '#6b7280', label: 'Draft' },
      development: { color: '#f59e0b', label: 'Development' },
      production: { color: '#10b981', label: 'Production' },
      deployed: { color: '#3b82f6', label: 'Deployed' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span
        className="status-badge"
        style={{ backgroundColor: `${config.color}20`, color: config.color }}
      >
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="applications-container">
        <div className="loading-state">Loading applications...</div>
      </div>
    );
  }

  // Show dashboard view
  if (viewMode === 'dashboard' && selectedAppId) {
    return (
      <ApplicationDashboard
        applicationId={selectedAppId}
        onBack={handleBackToList}
      />
    );
  }

  // Show list view
  return (
    <div className="applications-container">
      <div className="applications-header">
        <div className="header-left">
          <Package size={28} />
          <h1>Applications</h1>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} />
          Create Application
        </button>
      </div>

      {applications.length === 0 ? (
        <WelcomeScreen
          onCreateNew={() => setShowCreateModal(true)}
          onOpenExisting={() => {
            // This will be called when user wants to see the list
            // Since we're already in the applications list, we can just show a message
            // or do nothing as they're already here
          }}
        />
      ) : (
        <div className="applications-grid">
          {applications.map(app => (
            <div
              key={app.id}
              className="app-card"
              onClick={() => handleViewDashboard(app.id)}
            >
              <div className="app-card-header">
                <div className="app-title-row">
                  <Package size={20} />
                  <h3>{app.name}</h3>
                </div>
                {getStatusBadge(app.status)}
              </div>

              <p className="app-description">{app.description || 'No description'}</p>

              <div className="app-stats">
                <div className="stat-item">
                  <Workflow size={16} />
                  <span>{app.stats?.workflowCount || 0} Workflows</span>
                </div>
                <div className="stat-item">
                  <FileText size={16} />
                  <span>{app.stats?.formCount || 0} Forms</span>
                </div>
                <div className="stat-item">
                  <Layout size={16} />
                  <span>{app.stats?.pageCount || 0} Pages</span>
                </div>
                <div className="stat-item">
                  <Database size={16} />
                  <span>{app.stats?.modelCount || 0} Models</span>
                </div>
              </div>

              <div className="app-meta">
                <span>Version {app.version}</span>
                <span>Updated {new Date(app.updatedAt).toLocaleDateString()}</span>
              </div>

              <div className="app-actions">
                <button
                  className="btn-icon"
                  onClick={(e) => handleManageWorkflows(app, e)}
                  title="Manage Workflows"
                >
                  <Link size={16} />
                </button>
                <button
                  className="btn-icon"
                  onClick={(e) => handleDeploy(app, e)}
                  title="Deploy Application"
                >
                  <Rocket size={16} />
                </button>
                <button
                  className="btn-icon"
                  onClick={(e) => handleStart(app, e)}
                  title="Start Application"
                >
                  <Play size={16} />
                </button>
                <button
                  className="btn-icon"
                  onClick={(e) => handleStop(app, e)}
                  title="Stop Application"
                >
                  <Square size={16} />
                </button>
                {app.deployment?.url && (
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(app.deployment.url, '_blank');
                    }}
                    title="Open Application"
                  >
                    <ExternalLink size={16} />
                  </button>
                )}
                <button
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLoadApplication(app);
                  }}
                  title="Load Application"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={(e) => handleDelete(app.id, e)}
                  title="Delete Application"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateApplicationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchApplications();
          }}
        />
      )}

      {showWorkflowModal && selectedApp && (
        <WorkflowsModal
          app={selectedApp}
          availableWorkflows={availableWorkflows}
          onClose={() => {
            setShowWorkflowModal(false);
            setSelectedApp(null);
          }}
          onLink={handleLinkWorkflow}
        />
      )}
    </div>
  );
};

const CreateApplicationModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    domain: 'general'
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter an application name');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('http://localhost:5000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          domain: formData.domain,
          resources: {
            workflows: [],
            forms: [],
            pages: [],
            dataModels: []
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        alert('Failed to create application');
      }
    } catch (error) {
      console.error('Failed to create application:', error);
      alert('Failed to create application');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Application</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Application Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Application"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your application..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Domain</label>
            <select
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            >
              <option value="general">General</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="education">Education</option>
              <option value="ecommerce">E-commerce</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WorkflowsModal = ({ app, availableWorkflows, onClose, onLink }) => {
  const linkedWorkflowIds = app.resources?.workflows?.map(w => w.id || w) || [];
  const unlinkedWorkflows = availableWorkflows.filter(w => !linkedWorkflowIds.includes(w.id));
  const linkedWorkflows = availableWorkflows.filter(w => linkedWorkflowIds.includes(w.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Workflows - {app.name}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          {linkedWorkflows.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                Linked Workflows ({linkedWorkflows.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {linkedWorkflows.map(workflow => (
                  <div
                    key={workflow.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Workflow size={16} style={{ color: '#6366f1' }} />
                      <div>
                        <div style={{ fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                          {workflow.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {workflow.description || 'No description'}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      background: '#10b98120',
                      color: '#10b981',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Linked
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unlinkedWorkflows.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                Available Workflows ({unlinkedWorkflows.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {unlinkedWorkflows.map(workflow => (
                  <div
                    key={workflow.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Workflow size={16} style={{ color: '#6b7280' }} />
                      <div>
                        <div style={{ fontWeight: '500', color: '#111827', fontSize: '14px' }}>
                          {workflow.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {workflow.description || 'No description'}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ padding: '6px 16px', fontSize: '13px' }}
                      onClick={() => onLink(workflow.id)}
                    >
                      <Link size={14} />
                      Link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unlinkedWorkflows.length === 0 && linkedWorkflows.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
              <Workflow size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>No workflows available. Create workflows first to link them to this application.</p>
            </div>
          )}
        </div>

        <div className="modal-actions" style={{ padding: '20px', borderTop: '1px solid #e5e7eb' }}>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationsList;
