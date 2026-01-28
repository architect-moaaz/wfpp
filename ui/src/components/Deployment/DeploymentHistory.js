import React from 'react';

const DeploymentHistory = ({ deployments, onRollback, onViewLogs }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDuration = (startedAt, completedAt) => {
    if (!startedAt || !completedAt) return '-';
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const seconds = Math.floor((end - start) / 1000);

    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (deployments.length === 0) {
    return (
      <div className="deployment-history empty">
        <p>No deployment history available.</p>
      </div>
    );
  }

  return (
    <div className="deployment-history">
      <table>
        <thead>
          <tr>
            <th>Version</th>
            <th>Environment</th>
            <th>Status</th>
            <th>Started</th>
            <th>Duration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {deployments.map((deployment) => (
            <tr key={deployment.id}>
              <td>{deployment.version}</td>
              <td>
                <span className={`env-type ${deployment.environment_type || 'local'}`}>
                  {deployment.environment_name || deployment.environment_id}
                </span>
              </td>
              <td>
                <span className={`status-badge ${deployment.status}`}>
                  {deployment.status}
                </span>
              </td>
              <td>{formatDate(deployment.started_at)}</td>
              <td>{formatDuration(deployment.started_at, deployment.completed_at)}</td>
              <td>
                <button
                  className="action-btn"
                  onClick={() => onViewLogs(deployment)}
                >
                  View Logs
                </button>
                {deployment.status === 'completed' && (
                  <button
                    className="action-btn rollback"
                    onClick={() => onRollback(deployment.id)}
                  >
                    Rollback
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeploymentHistory;
