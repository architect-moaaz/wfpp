import React, { useState, useEffect } from 'react';
import './WelcomeScreen.css';
import { Plus, Workflow, Search, ArrowLeft, X, Building2, Settings2, Sparkles } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAres } from '../../context/AresContext';

const WelcomeScreen = ({ onCreateNew, onOpenExisting }) => {
  const [applications, setApplications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { currentApplication, activeSidebar, setActiveSidebar, setCurrentApplication, setCurrentWorkflow, setConnectedForms, setDataModels, setConnectedPages } = useWorkflow();
  const { open: openAres } = useAres();

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

  useEffect(() => {
    // Fetch applications
    fetchApplications();

    // Open ARES in modal mode when welcome screen loads
    setTimeout(() => {
      openAres(true);
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide WelcomeScreen if an application is loaded or navigated to org management
  if (currentApplication || activeSidebar === 'org-chart') {
    return null;
  }

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    }
  };

  const handleManageExisting = () => {
    setShowModal(true);
  };

  const handleManageOrganization = () => {
    // Navigate to org chart / organization management
    setActiveSidebar('org-chart');
  };

  const handleLoadApplication = async (app) => {
    console.log('[WelcomeScreen] handleLoadApplication called for:', app.id, app.name);
    try {
      // Fetch full application data
      const response = await fetch(`http://localhost:5000/api/applications/${app.id}`);
      const data = await response.json();
      console.log('[WelcomeScreen] API response:', data.success, data.application?.name);

      if (data.success && data.application) {
        const application = data.application;

        // Set the current application
        console.log('[WelcomeScreen] Setting currentApplication:', application.name);
        setCurrentApplication(application);

        // Load all workflows from application resources
        const workflows = application.resources?.workflows || [];
        console.log('[WelcomeScreen] Loaded workflows:', workflows.length);
        if (workflows.length > 0 && workflows[0]) {
          // Workflows are already complete objects in the application resources
          console.log('[WelcomeScreen] Setting current workflow:', workflows[0].name);
          setCurrentWorkflow(workflows[0]);
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
        console.log('[WelcomeScreen] Setting activeSidebar to workflows');
        setActiveSidebar('workflows');

        // Close modal
        setShowModal(false);

        console.log(`[WelcomeScreen] Loaded application "${application.name}" with:`, {
          workflows: workflows.length,
          forms: forms.length,
          models: models.length,
          pages: pages.length
        });
      } else {
        console.error('[WelcomeScreen] API returned unsuccessful:', data);
        alert('Failed to load application: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('[WelcomeScreen] Failed to load application:', error);
      alert('Failed to load application: ' + error.message);
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
          <div className="quick-actions-header">
            <h2 className="quick-actions-title">Quick Actions</h2>
            <button className="quick-actions-close" onClick={() => openAres(true)}>
              <X size={20} />
            </button>
          </div>

          <div className="quick-actions-list">
            <div className="quick-action-card ares-card" onClick={() => openAres(true)}>
              <div className="quick-action-icon ares">
                <Sparkles size={24} />
              </div>
              <div className="quick-action-content centered">
                <h3 className="quick-action-title">Build with ARES</h3>
                <p className="quick-action-description">
                  Let AI guide you through creating workflows and applications.
                </p>
              </div>
            </div>

            <div className="quick-action-card" onClick={handleCreateNew}>
              <div className="quick-action-icon create">
                <Plus size={20} />
              </div>
              <div className="quick-action-content">
                <h3 className="quick-action-title">Create New Application</h3>
                <p className="quick-action-description">
                  Start from scratch manually. Define data models, UI, and logic.
                </p>
              </div>
            </div>

            <div className="quick-action-card" onClick={handleManageExisting}>
              <div className="quick-action-icon manage">
                <Settings2 size={20} />
              </div>
              <div className="quick-action-content">
                <h3 className="quick-action-title">Manage Applications</h3>
                <p className="quick-action-description">
                  Edit existing apps, configure settings, and monitor deployments.
                </p>
              </div>
            </div>

            <div className="quick-action-card" onClick={handleManageOrganization}>
              <div className="quick-action-icon organization">
                <Building2 size={20} />
              </div>
              <div className="quick-action-content">
                <h3 className="quick-action-title">Manage Organisation</h3>
                <p className="quick-action-description">
                  Team members, roles, billing, and global settings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Applications Modal */}
      {showModal && (
        <div className="welcome-modal-overlay" onClick={() => setShowModal(false)}>
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
                            {app.resourceCounts?.workflows || app.resources?.workflows?.length || 0} workflows
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
