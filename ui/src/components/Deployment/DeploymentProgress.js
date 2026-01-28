import React from 'react';

const DeploymentProgress = ({ deployment, onCancel }) => {
  const steps = deployment.steps || [];
  const logs = deployment.logs || [];
  const urls = deployment.urls || {};
  const isCompleted = deployment.status === 'completed';
  const isFailed = deployment.status === 'failed';

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getStepIcon = (status) => {
    switch (status) {
      case 'completed':
        return '\u2713';
      case 'in_progress':
        return '\u2022';
      case 'failed':
        return '\u2717';
      default:
        return '\u2022';
    }
  };

  return (
    <div className="deployment-progress">
      <div className="progress-header">
        <div className="progress-title">
          <h3>Deployment {deployment.id}</h3>
          <span className={`progress-status ${deployment.status}`}>
            {deployment.status}
          </span>
        </div>
        {!isCompleted && !isFailed && (
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      <div className="progress-bar-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${deployment.progress || 0}%` }}
          />
        </div>
        <div className="progress-percentage">
          {deployment.progress || 0}% Complete
        </div>
      </div>

      <div className="steps-list">
        {steps.map((step) => (
          <div key={step.id} className={`step-item ${step.status}`}>
            <div className={`step-icon ${step.status}`}>
              {getStepIcon(step.status)}
            </div>
            <div className="step-info">
              <div className="step-name">{step.name}</div>
              {step.error && <div className="step-error">{step.error}</div>}
            </div>
            {step.completedAt && (
              <div className="step-time">{formatTime(step.completedAt)}</div>
            )}
          </div>
        ))}
      </div>

      {isCompleted && Object.keys(urls).length > 0 && (
        <div className="deployment-urls">
          <h4>Access URLs</h4>
          <div className="urls-grid">
            {urls.frontend && (
              <div className="url-item">
                <label>Frontend</label>
                <a href={urls.frontend} target="_blank" rel="noopener noreferrer">
                  {urls.frontend}
                </a>
              </div>
            )}
            {urls.backend && (
              <div className="url-item">
                <label>Backend API</label>
                <a href={urls.backend} target="_blank" rel="noopener noreferrer">
                  {urls.backend}
                </a>
              </div>
            )}
            {urls.api_docs && (
              <div className="url-item">
                <label>API Documentation</label>
                <a href={urls.api_docs} target="_blank" rel="noopener noreferrer">
                  {urls.api_docs}
                </a>
              </div>
            )}
            {urls.health && (
              <div className="url-item">
                <label>Health Check</label>
                <a href={urls.health} target="_blank" rel="noopener noreferrer">
                  {urls.health}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="deployment-logs">
          <h4>Deployment Logs</h4>
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-time">{formatTime(log.timestamp)}</span>
              <span className={`log-level ${log.level}`}>[{log.level}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeploymentProgress;
