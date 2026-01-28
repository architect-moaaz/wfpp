import React, { useState, useEffect, useCallback } from 'react';
import { Rocket, Download, Code, ChevronDown } from 'lucide-react';
import './DeploymentDashboard.css';

const DeploymentDashboard = ({ application, onClose }) => {
  const [environments, setEnvironments] = useState([]);
  const [deploymentHistory, setDeploymentHistory] = useState([]);
  const [currentDeployment, setCurrentDeployment] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [buildType, setBuildType] = useState('standard');
  const [rollbackStrategy, setRollbackStrategy] = useState('auto');
  const [runTests, setRunTests] = useState(true);

  const API_BASE = 'http://localhost:5000';

  const fetchEnvironments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/environments`);
      if (response.ok) {
        const data = await response.json();
        setEnvironments(data);
      }
    } catch (err) {
      console.error('Error fetching environments:', err);
    }
  }, []);

  const fetchDeploymentHistory = useCallback(async () => {
    if (!application?.id) return;
    try {
      const response = await fetch(`${API_BASE}/api/deployments?application_id=${application.id}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setDeploymentHistory(data);
      }
    } catch (err) {
      console.error('Error fetching deployment history:', err);
    }
  }, [application?.id]);

  useEffect(() => {
    fetchEnvironments();
    fetchDeploymentHistory();
  }, [fetchEnvironments, fetchDeploymentHistory]);

  useEffect(() => {
    let interval;
    if (isDeploying && currentDeployment) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE}/api/deployments/${currentDeployment.id}`);
          if (response.ok) {
            const data = await response.json();
            setCurrentDeployment(data);
            if (data.status === 'completed' || data.status === 'failed') {
              setIsDeploying(false);
              fetchDeploymentHistory();
            }
          }
        } catch (err) {
          console.error('Error polling deployment:', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isDeploying, currentDeployment, fetchDeploymentHistory]);

  const handleDeploy = async () => {
    if (!selectedEnvironment) {
      setError('Please select an environment');
      return;
    }

    setError(null);
    setIsDeploying(true);

    try {
      const response = await fetch(`${API_BASE}/api/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: application.id,
          environment_id: selectedEnvironment,
          run_tests: runTests,
          build_type: buildType,
          rollback_strategy: rollbackStrategy
        })
      });

      if (response.ok) {
        const deployment = await response.json();
        setCurrentDeployment(deployment);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Deployment failed');
        setIsDeploying(false);
      }
    } catch (err) {
      setError(err.message);
      setIsDeploying(false);
    }
  };

  const getEnvironmentStatus = (envId) => {
    const deployment = deploymentHistory.find(d => d.environment_id === envId && d.status === 'completed');
    if (!deployment) return { status: 'inactive', label: 'Not Deployed' };

    if (currentDeployment?.environment_id === envId && isDeploying) {
      return { status: 'deploying', label: 'Deploying' };
    }
    return { status: 'healthy', label: 'Healthy' };
  };

  const getStepStatus = (stepId) => {
    if (!currentDeployment?.steps) return 'waiting';
    const step = currentDeployment.steps.find(s => s.id === stepId);
    return step?.status || 'pending';
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const deploymentSteps = [
    { id: 'validate', name: 'Initializing deployment' },
    { id: 'install', name: 'Building application' },
    { id: 'test', name: 'Running tests' },
    { id: 'deploy', name: 'Deploying to environment' }
  ];

  const downloadLogs = () => {
    if (!currentDeployment?.logs) return;
    const logText = currentDeployment.logs.map(l =>
      `[${new Date(l.timestamp).toISOString()}] ${l.message}`
    ).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-${currentDeployment.id}.log`;
    a.click();
  };

  return (
    <div className="deploy-manager">
      <div className="deploy-manager-header">
        <h1>One Click Deployment Manager</h1>
        <p>Deploy your applications to different environments with a single click</p>
        <button className="close-btn" onClick={onClose}>Close</button>
      </div>

      {error && (
        <div className="deploy-error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="deploy-manager-content">
        <div className="deploy-main">
          {/* Deploy Application Card */}
          <div className="deploy-card">
            <div className="card-header">
              <h2>Deploy Application</h2>
              <span className={`status-badge ${isDeploying ? 'deploying' : 'ready'}`}>
                {isDeploying ? 'Deploying' : 'Ready'}
              </span>
            </div>

            <div className="project-info">
              <label>Project</label>
              <div className="project-display">
                <div className="project-icon">
                  <Code size={20} />
                </div>
                <div className="project-details">
                  <span className="project-name">{application?.name}</span>
                  {application?.version && (
                    <span className="project-meta">v{application.version}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Target Environment</label>
              <div className="select-wrapper">
                <select
                  value={selectedEnvironment}
                  onChange={(e) => setSelectedEnvironment(e.target.value)}
                  disabled={isDeploying}
                >
                  <option value="">Select Environment</option>
                  {environments.map(env => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-icon" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Build Type</label>
                <div className="select-wrapper">
                  <select
                    value={buildType}
                    onChange={(e) => setBuildType(e.target.value)}
                    disabled={isDeploying}
                  >
                    <option value="standard">Standard Deploy</option>
                    <option value="quick">Quick Deploy</option>
                    <option value="full">Full Rebuild</option>
                  </select>
                  <ChevronDown size={16} className="select-icon" />
                </div>
              </div>
              <div className="form-group">
                <label>Rollback Strategy</label>
                <div className="select-wrapper">
                  <select
                    value={rollbackStrategy}
                    onChange={(e) => setRollbackStrategy(e.target.value)}
                    disabled={isDeploying}
                  >
                    <option value="auto">Auto Rollback</option>
                    <option value="manual">Manual Rollback</option>
                    <option value="none">No Rollback</option>
                  </select>
                  <ChevronDown size={16} className="select-icon" />
                </div>
              </div>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={runTests}
                onChange={(e) => setRunTests(e.target.checked)}
                disabled={isDeploying}
              />
              <span>Run automated tests before deployment</span>
            </label>

            <button
              className="deploy-btn"
              onClick={handleDeploy}
              disabled={isDeploying || !selectedEnvironment}
            >
              <Rocket size={18} />
              {isDeploying ? 'Deploying...' : 'Deploy Now'}
            </button>
          </div>

          {/* Deployment Status Card - Only show during active deployment */}
          {currentDeployment && (
            <div className="deploy-card">
              <div className="card-header">
                <h2>Deployment Status</h2>
              </div>
              <div className="status-steps">
                {deploymentSteps.map((step) => {
                  const status = getStepStatus(step.id);
                  return (
                    <div key={step.id} className={`status-step ${status}`}>
                      <span className={`step-dot ${status}`}></span>
                      <span className="step-name">{step.name}</span>
                      <span className="step-status">
                        {status === 'completed' ? 'Done' :
                         status === 'in_progress' ? 'Running...' :
                         status === 'failed' ? 'Failed' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deployment Logs Card - Only show during active deployment */}
          {currentDeployment && (
            <div className="deploy-card">
              <div className="card-header">
                <h2>Deployment Logs</h2>
                {currentDeployment?.logs?.length > 0 && (
                  <button className="download-btn" onClick={downloadLogs}>
                    <Download size={14} />
                    Download
                  </button>
                )}
              </div>
              <div className="logs-container">
                {currentDeployment?.logs?.length > 0 ? (
                  currentDeployment.logs.map((log, idx) => (
                    <div key={idx} className={`log-line ${log.level || 'info'}`}>
                      <span className="log-time">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="log-line info">
                    <span className="log-message">Initializing...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="deploy-sidebar">
          {/* Environment Status Card */}
          <div className="deploy-card">
            <div className="card-header">
              <h2>Environment Status</h2>
            </div>
            <div className="env-status-list">
              {environments.length > 0 ? (
                environments.map(env => {
                  const { status, label } = getEnvironmentStatus(env.id);
                  return (
                    <div key={env.id} className={`env-status-item ${status}`}>
                      <span className={`env-dot ${status}`}></span>
                      <span className="env-name">{env.name}</span>
                      <span className={`env-label ${status}`}>{label}</span>
                    </div>
                  );
                })
              ) : (
                <div className="no-deployments">No environments configured</div>
              )}
            </div>
          </div>

          {/* Recent Deployments Card */}
          <div className="deploy-card">
            <div className="card-header">
              <h2>Recent Deployments</h2>
            </div>
            <div className="recent-deployments">
              {deploymentHistory.slice(0, 5).map(deployment => {
                const env = environments.find(e => e.id === deployment.environment_id);
                return (
                  <div key={deployment.id} className="recent-deployment-item">
                    <span className={`deployment-dot ${deployment.status}`}></span>
                    <div className="deployment-info">
                      <span className="deployment-env">{env?.name || deployment.environment_id}</span>
                      {deployment.version && (
                        <span className="deployment-version">v{deployment.version}</span>
                      )}
                      <span className={`deployment-status ${deployment.status}`}>
                        {deployment.status === 'completed' ? 'Success' :
                         deployment.status === 'failed' ? 'Failed' :
                         deployment.status === 'superseded' ? 'Superseded' :
                         deployment.status}
                      </span>
                    </div>
                    <span className="deployment-time">{formatTimeAgo(deployment.started_at)}</span>
                  </div>
                );
              })}
              {deploymentHistory.length === 0 && (
                <div className="no-deployments">No deployments yet</div>
              )}
            </div>
            {deploymentHistory.length > 5 && (
              <button className="view-all-btn">View All Deployments</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentDashboard;
