import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/PublishModal.css';

const PublishModal = ({ deploymentId, workflowName, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('building');
  const [deploymentUrl, setDeploymentUrl] = useState(null);
  const [localPath, setLocalPath] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    // Connect to SSE stream for real-time logs
    const eventSource = new EventSource(
      `/api/deployments/${deploymentId}/stream`
    );

    eventSource.onmessage = (event) => {
      const log = JSON.parse(event.data);

      setLogs(prev => [...prev, log]);

      if (log.type === 'complete') {
        setStatus('success');
        setDeploymentUrl(log.frontendUrl);
        eventSource.close();
      } else if (log.type === 'error') {
        setStatus('failed');
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setStatus('failed');
      eventSource.close();
    };

    eventSourceRef.current = eventSource;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [deploymentId]);

  // Fetch deployment details when completed to get local path
  useEffect(() => {
    if (status === 'success') {
      axios.get(`http://localhost:5000/api/deployments/${deploymentId}/status`)
        .then(response => {
          setLocalPath(response.data.localPath);
        })
        .catch(error => {
          console.error('Error fetching deployment details:', error);
        });
    }
  }, [status, deploymentId]);

  const getStepStatus = (step) => {
    const stepKeywords = {
      validating: ['Validating', 'Fetching'],
      generating: ['Generating'],
      building: ['Building', 'Installing', 'Uploading'],
      deploying: ['Deploying', 'Configuring', 'Provisioning']
    };

    for (const log of logs) {
      for (const [stepName, keywords] of Object.entries(stepKeywords)) {
        if (keywords.some(kw => log.message?.includes(kw))) {
          if (stepName === step) return 'active';
          if (Object.keys(stepKeywords).indexOf(stepName) < Object.keys(stepKeywords).indexOf(step)) {
            return 'complete';
          }
        }
      }
    }

    return 'pending';
  };

  return (
    <div className="publish-modal-overlay" onClick={onClose}>
      <div className="publish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Publishing {workflowName}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Progress Steps */}
          <div className="progress-steps">
            <Step
              label="Validating Workflow"
              status={getStepStatus('validating')}
            />
            <Step
              label="Generating Code"
              status={getStepStatus('generating')}
            />
            <Step
              label="Building Application"
              status={getStepStatus('building')}
            />
            <Step
              label="Deploying to Platform"
              status={getStepStatus('deploying')}
            />
          </div>

          {/* Build Logs */}
          <div className="build-logs">
            <h3>Build Logs</h3>
            <div className="logs-container">
              {logs.map((log, index) => (
                <div key={index} className={`log-entry log-${log.type}`}>
                  <span className="log-timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Success State */}
          {status === 'success' && deploymentUrl && (
            <div className="success-message">
              <div className="success-icon">✓</div>
              <h3>Deployment Successful!</h3>
              <p>Your application has been published</p>
              {localPath && (
                <div className="local-path-info">
                  <strong>Generated code location:</strong>
                  <code>{localPath}</code>
                </div>
              )}
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="view-deployment-button"
              >
                View Deployment
              </a>
            </div>
          )}

          {/* Error State */}
          {status === 'failed' && (
            <div className="error-message">
              <div className="error-icon">✗</div>
              <h3>Deployment Failed</h3>
              <p>Check the logs above for details</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {status === 'success' && (
            <button className="primary-button" onClick={onClose}>
              Done
            </button>
          )}
          {status === 'failed' && (
            <button className="primary-button" onClick={onClose}>
              Close
            </button>
          )}
          {status === 'building' && (
            <button className="secondary-button" onClick={onClose}>
              Run in Background
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Step = ({ label, status }) => {
  return (
    <div className={`step step-${status}`}>
      <div className="step-icon">
        {status === 'complete' && <span>✓</span>}
        {status === 'active' && <span className="spinner-small"></span>}
        {status === 'pending' && <span>○</span>}
      </div>
      <div className="step-label">{label}</div>
    </div>
  );
};

export default PublishModal;
