import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Globe, Server, ExternalLink, Copy, Check, X, Play, Square, Palette } from 'lucide-react';
import DesignCustomizer from './DesignCustomizer';
import './ApplicationSettings.css';

const ApplicationSettings = ({ application, onClose, onUpdate }) => {
  const [deployments, setDeployments] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [runningStatus, setRunningStatus] = useState({});
  const [showDesignCustomizer, setShowDesignCustomizer] = useState(false);

  const API_BASE = 'http://localhost:5000';

  const checkIfRunning = useCallback(async (deployment) => {
    if (!deployment?.urls?.health) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(deployment.urls.health, {
        signal: controller.signal,
        mode: 'no-cors'
      });
      clearTimeout(timeoutId);
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!application?.id) return;

    setLoading(true);
    try {
      const [deploymentsRes, environmentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/deployments?application_id=${application.id}`),
        fetch(`${API_BASE}/api/environments`)
      ]);

      if (deploymentsRes.ok) {
        const data = await deploymentsRes.json();
        setDeployments(data);

        // Check running status for each deployment
        const statusChecks = {};
        for (const dep of data) {
          if (dep.status === 'completed' || dep.status === 'running') {
            statusChecks[dep.id] = await checkIfRunning(dep);
          }
        }
        setRunningStatus(statusChecks);
      }
      if (environmentsRes.ok) {
        const data = await environmentsRes.json();
        setEnvironments(data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [application?.id, checkIfRunning]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getActiveDeploymentForEnv = (envId) => {
    return deployments.find(d =>
      d.environment_id === envId &&
      (d.status === 'completed' || d.status === 'running')
    );
  };

  const isDeploymentRunning = (deployment) => {
    if (!deployment) return false;
    return runningStatus[deployment.id] === true;
  };

  const copyToClipboard = async (url, id) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(id);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStopDeployment = async (deploymentId) => {
    try {
      const response = await fetch(`${API_BASE}/api/deployments/${deploymentId}/stop`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error stopping deployment:', err);
    }
  };

  const handleStartDeployment = async (envId) => {
    try {
      const response = await fetch(`${API_BASE}/api/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: application.id,
          environment_id: envId
        })
      });
      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error starting deployment:', err);
    }
  };

  const handleSaveDesign = async (designTokens) => {
    try {
      const response = await fetch(`${API_BASE}/api/applications/${application.id}/theme`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: designTokens })
      });
      if (response.ok) {
        const data = await response.json();
        if (onUpdate && data.application) {
          onUpdate(data.application);
        }
        setShowDesignCustomizer(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save design');
      }
    } catch (err) {
      console.error('Error saving design:', err);
      throw err;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEnvIcon = (envType) => {
    switch (envType) {
      case 'local':
      case 'development':
        return <Server size={18} />;
      case 'production':
        return <Globe size={18} />;
      default:
        return <Server size={18} />;
    }
  };

  const getEnvColor = (envType) => {
    switch (envType) {
      case 'local':
        return '#6366f1';
      case 'development':
        return '#f59e0b';
      case 'staging':
        return '#8b5cf6';
      case 'production':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  return (
    <div className="app-settings">
      <div className="app-settings-header">
        <div className="header-left">
          <div className="app-icon-large">
            <Settings size={24} />
          </div>
          <div className="header-info">
            <h1>{application?.name}</h1>
            <p>Application Settings & Deployments</p>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="app-settings-content">
        {/* Deployment URLs Section */}
        <div className="settings-section">
          <h2>Deployment URLs</h2>
          <p className="section-desc">Access your application in different environments</p>

          {loading ? (
            <div className="loading-state">Loading deployments...</div>
          ) : (
            <div className="deployment-urls-list">
              {environments.map(env => {
                const deployment = getActiveDeploymentForEnv(env.id);
                const hasUrls = deployment?.urls;
                const envColor = getEnvColor(env.type);
                const isRunning = isDeploymentRunning(deployment);

                return (
                  <div key={env.id} className="env-url-card">
                    <div className="env-url-header">
                      <div className="env-info">
                        <div className="env-icon" style={{ backgroundColor: `${envColor}15`, color: envColor }}>
                          {getEnvIcon(env.type)}
                        </div>
                        <div className="env-details">
                          <span className="env-name">{env.name}</span>
                          <span className="env-type">{env.type}</span>
                        </div>
                      </div>
                      <div className="env-status">
                        {deployment ? (
                          <>
                            <span className={`status-indicator ${isRunning ? 'running' : 'stopped'}`}>
                              {isRunning ? 'Running' : 'Stopped'}
                            </span>
                            {isRunning ? (
                              <button
                                className="action-btn stop"
                                onClick={() => handleStopDeployment(deployment.id)}
                                title="Stop deployment"
                              >
                                <Square size={14} />
                              </button>
                            ) : (
                              <button
                                className="action-btn start"
                                onClick={() => handleStartDeployment(env.id)}
                                title="Start deployment"
                              >
                                <Play size={14} />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="status-indicator inactive">Not Deployed</span>
                            <button
                              className="action-btn start"
                              onClick={() => handleStartDeployment(env.id)}
                              title="Deploy to this environment"
                            >
                              <Play size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {hasUrls && isRunning && (
                      <div className="url-list">
                        {deployment.urls.backend && (
                          <div className="url-item">
                            <span className="url-label">Backend API</span>
                            <div className="url-value">
                              <a href={deployment.urls.backend} target="_blank" rel="noopener noreferrer">
                                {deployment.urls.backend}
                                <ExternalLink size={12} />
                              </a>
                              <button
                                className="copy-btn"
                                onClick={() => copyToClipboard(deployment.urls.backend, `${env.id}-backend`)}
                              >
                                {copiedUrl === `${env.id}-backend` ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                        )}
                        {deployment.urls.frontend && (
                          <div className="url-item">
                            <span className="url-label">Frontend</span>
                            <div className="url-value">
                              <a href={deployment.urls.frontend} target="_blank" rel="noopener noreferrer">
                                {deployment.urls.frontend}
                                <ExternalLink size={12} />
                              </a>
                              <button
                                className="copy-btn"
                                onClick={() => copyToClipboard(deployment.urls.frontend, `${env.id}-frontend`)}
                              >
                                {copiedUrl === `${env.id}-frontend` ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                        )}
                        {deployment.completed_at && (
                          <div className="deployment-meta">
                            Last deployed on {formatDate(deployment.completed_at)}
                          </div>
                        )}
                      </div>
                    )}

                    {hasUrls && !isRunning && deployment && (
                      <div className="no-urls">
                        Application is stopped. Click the play button to start it.
                      </div>
                    )}

                    {!hasUrls && deployment && (
                      <div className="no-urls">
                        Deployment in progress...
                      </div>
                    )}
                  </div>
                );
              })}

              {environments.length === 0 && (
                <div className="empty-state">
                  No environments configured. Add environments to deploy your application.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Design Customization Section */}
        <div className="settings-section">
          <h2>Design Customization</h2>
          <p className="section-desc">Customize colors, typography, and spacing for your application</p>
          <button
            className="design-customize-btn"
            onClick={() => setShowDesignCustomizer(true)}
          >
            <Palette size={18} />
            <span>Customize Design</span>
          </button>
        </div>

        {/* Application Info Section */}
        <div className="settings-section">
          <h2>Application Info</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Application ID</span>
              <span className="info-value">{application?.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Created</span>
              <span className="info-value">{formatDate(application?.created_at)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Updated</span>
              <span className="info-value">{formatDate(application?.updated_at)}</span>
            </div>
            {application?.version && (
              <div className="info-item">
                <span className="info-label">Version</span>
                <span className="info-value">v{application.version}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDesignCustomizer && (
        <div className="design-customizer-overlay">
          <DesignCustomizer
            application={application}
            onSave={handleSaveDesign}
            onClose={() => setShowDesignCustomizer(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ApplicationSettings;
