import React from 'react';

const EnvironmentCard = ({
  environment,
  activeDeployment,
  onDeploy,
  onStop,
  isDeploying
}) => {
  const isRunning = activeDeployment && activeDeployment.status === 'completed';
  const urls = activeDeployment?.urls || {};

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const openUrl = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div className={`environment-card ${isRunning ? 'active' : ''}`}>
      <div className="env-header">
        <div className="env-info">
          <h3>{environment.name}</h3>
          <span className={`env-type ${environment.type}`}>
            {environment.type}
          </span>
        </div>
        <div className="env-status">
          <span className={`status-dot ${isRunning ? 'running' : 'stopped'}`}></span>
          <span>{isRunning ? 'Running' : 'Stopped'}</span>
        </div>
      </div>

      {environment.description && (
        <p className="env-description">{environment.description}</p>
      )}

      {isRunning && urls.frontend && (
        <div className="env-urls">
          <div className="url-row">
            <span className="url-label">Frontend:</span>
            <span className="url-value" onClick={() => openUrl(urls.frontend)}>
              {urls.frontend}
            </span>
            <button className="copy-btn" onClick={() => copyToClipboard(urls.frontend)}>
              Copy
            </button>
          </div>
          {urls.backend && (
            <div className="url-row">
              <span className="url-label">API:</span>
              <span className="url-value" onClick={() => openUrl(urls.backend)}>
                {urls.backend}
              </span>
              <button className="copy-btn" onClick={() => copyToClipboard(urls.backend)}>
                Copy
              </button>
            </div>
          )}
          {urls.health && (
            <div className="url-row">
              <span className="url-label">Health:</span>
              <span className="url-value" onClick={() => openUrl(urls.health)}>
                {urls.health}
              </span>
              <button className="copy-btn" onClick={() => copyToClipboard(urls.health)}>
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      {activeDeployment?.runtime?.port && (
        <div className="env-runtime">
          <span>Port: {activeDeployment.runtime.port}</span>
          {activeDeployment.runtime.pid && (
            <span>PID: {activeDeployment.runtime.pid}</span>
          )}
        </div>
      )}

      <div className="env-actions">
        <button
          className="deploy-btn"
          onClick={onDeploy}
          disabled={isDeploying || environment.status !== 'active'}
        >
          {isDeploying ? 'Deploying...' : isRunning ? 'Redeploy' : 'Deploy'}
        </button>
        {isRunning && (
          <button className="stop-btn" onClick={onStop}>
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default EnvironmentCard;
