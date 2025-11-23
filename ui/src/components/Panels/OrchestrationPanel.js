import React from 'react';
import './PanelStyles.css';
import { Play, Activity, CheckCircle, XCircle } from 'lucide-react';

const OrchestrationPanel = () => {
  const executions = [
    { id: 1, workflowName: 'Customer Onboarding', status: 'Running', startTime: '2 min ago', progress: 60 },
    { id: 2, workflowName: 'Invoice Approval', status: 'Completed', startTime: '15 min ago', progress: 100 },
    { id: 3, workflowName: 'Customer Onboarding', status: 'Failed', startTime: '1 hour ago', progress: 45 }
  ];

  return (
    <div className="panel-container">
      <div className="panel-header">
        <div className="panel-title">
          <Play size={24} />
          <div>
            <h2>Orchestration</h2>
            <p>Monitor and manage workflow executions</p>
          </div>
        </div>
        <button className="primary-btn">
          <Activity size={16} />
          View All Executions
        </button>
      </div>

      <div className="panel-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">24</div>
            <div className="stat-label">Active Workflows</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">156</div>
            <div className="stat-label">Completed Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">3</div>
            <div className="stat-label">Failed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">98.2%</div>
            <div className="stat-label">Success Rate</div>
          </div>
        </div>

        <div className="section-title">Recent Executions</div>

        <div className="executions-list">
          {executions.map(execution => (
            <div key={execution.id} className="execution-item">
              <div className="execution-status">
                {execution.status === 'Running' && <Activity size={20} className="status-running" />}
                {execution.status === 'Completed' && <CheckCircle size={20} className="status-completed" />}
                {execution.status === 'Failed' && <XCircle size={20} className="status-failed" />}
              </div>
              <div className="execution-info">
                <div className="execution-name">{execution.workflowName}</div>
                <div className="execution-time">{execution.startTime}</div>
              </div>
              <div className="execution-progress">
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${execution.status.toLowerCase()}`}
                    style={{ width: `${execution.progress}%` }}
                  />
                </div>
                <span className="progress-text">{execution.progress}%</span>
              </div>
              <span className={`status-badge ${execution.status.toLowerCase()}`}>
                {execution.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrchestrationPanel;
