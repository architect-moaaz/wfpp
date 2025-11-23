import React, { useState, useEffect } from 'react';
import './WelcomeScreen.css';
import { Plus, FolderOpen, Workflow, Search, ArrowLeft, X } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';

const WelcomeScreen = ({ onCreateNew, onOpenExisting }) => {
  const [applications, setApplications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { setActiveSidebar, setCurrentApplication, setCurrentWorkflow, setConnectedForms, setDataModels, setConnectedPages } = useWorkflow();

  useEffect(() => {
    // Fetch applications
    fetchApplications();
  }, []);

  const fetchApplications = () => {
    fetch('http://localhost:5000/api/applications')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.applications) {
          setApplications(data.applications);
        }
      })
      .catch(err => console.error('Error fetching applications:', err));
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    }
  };

  const handleManageExisting = () => {
    setShowModal(true);
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

        // Close modal
        setShowModal(false);

        console.log(`Loaded application "${application.name}" with:`, {
          workflows: workflows.length,
          forms: forms.length,
          models: models.length,
          pages: pages.length
        });
      }
    } catch (error) {
      console.error('Failed to load application:', error);
      alert('Failed to load application');
    }
  };

  const filteredApplications = applications.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.description && app.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <div className="welcome-screen">
        <div className="welcome-container">
          <div className="welcome-header">
            <div className="welcome-logo">
              <Workflow size={48} />
            </div>
            <h1 className="welcome-title">Welcome to Workflow Designer</h1>
            <p className="welcome-subtitle">Create and manage your workflow applications</p>
          </div>

          <div className="welcome-actions">
            <div className="action-card" onClick={handleCreateNew}>
              <div className="action-card-icon">
                <Plus size={32} />
              </div>
              <h3 className="action-card-title">Create New Application</h3>
              <p className="action-card-description">
                Start a new workflow application from scratch
              </p>
            </div>

            <div className="action-card" onClick={handleManageExisting}>
              <div className="action-card-icon">
                <FolderOpen size={32} />
              </div>
              <h3 className="action-card-title">Manage Existing Applications</h3>
              <p className="action-card-description">
                Open and manage your existing applications
                {applications.length > 0 && ` (${applications.length} total)`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="applications-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button className="back-btn" onClick={() => setShowModal(false)}>
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <h2>Select Application</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-search">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="modal-content">
              {filteredApplications.length === 0 ? (
                <div className="no-applications">
                  <Workflow size={48} style={{ opacity: 0.3 }} />
                  <p>No applications found</p>
                </div>
              ) : (
                <div className="applications-list">
                  {filteredApplications.map((app) => (
                    <div
                      key={app.id}
                      className="application-item"
                      onClick={() => handleLoadApplication(app)}
                    >
                      <div className="app-item-icon">
                        <Workflow size={24} />
                      </div>
                      <div className="app-item-info">
                        <div className="app-item-name">{app.name}</div>
                        <div className="app-item-description">
                          {app.description || 'No description'}
                        </div>
                        <div className="app-item-meta">
                          <span>{app.domain || 'General'}</span>
                          <span>•</span>
                          <span>
                            {app.resources?.workflows?.length || 0} workflows
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WelcomeScreen;
