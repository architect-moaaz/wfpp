import React from 'react';
import './PanelStyles.css';
import { BarChart3, TrendingUp, Clock, AlertCircle } from 'lucide-react';

const AnalyticsPanel = () => {
  const metrics = [
    { label: 'Total Executions', value: '1,234', change: '+12%', trend: 'up' },
    { label: 'Avg. Completion Time', value: '2.3s', change: '-15%', trend: 'down' },
    { label: 'Success Rate', value: '98.5%', change: '+2.1%', trend: 'up' },
    { label: 'Active Users', value: '42', change: '+8%', trend: 'up' }
  ];

  const bottlenecks = [
    { step: 'Credit Check API', avgTime: '1.8s', percentage: 60 },
    { step: 'Email Validation', avgTime: '0.5s', percentage: 20 },
    { step: 'Data Mapping', avgTime: '0.3s', percentage: 15 }
  ];

  return (
    <div className="panel-container">
      <div className="panel-header">
        <div className="panel-title">
          <BarChart3 size={24} />
          <div>
            <h2>Analytics</h2>
            <p>Workflow performance insights and metrics</p>
          </div>
        </div>
        <div className="date-range">
          <select>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="panel-content">
        <div className="metrics-grid">
          {metrics.map((metric, index) => (
            <div key={index} className="metric-card">
              <div className="metric-header">
                <span className="metric-label">{metric.label}</span>
                <span className={`metric-change ${metric.trend}`}>
                  <TrendingUp size={14} />
                  {metric.change}
                </span>
              </div>
              <div className="metric-value">{metric.value}</div>
            </div>
          ))}
        </div>

        <div className="chart-section">
          <h3 className="section-title">Execution Trend</h3>
          <div className="chart-placeholder">
            <BarChart3 size={48} />
            <p>Execution trend chart would be displayed here</p>
          </div>
        </div>

        <div className="insights-section">
          <h3 className="section-title">
            <AlertCircle size={18} />
            Performance Bottlenecks
          </h3>
          <div className="insights-list">
            {bottlenecks.map((item, index) => (
              <div key={index} className="insight-item">
                <div className="insight-header">
                  <span className="insight-step">{item.step}</span>
                  <span className="insight-time">
                    <Clock size={14} />
                    {item.avgTime}
                  </span>
                </div>
                <div className="insight-bar">
                  <div
                    className="insight-fill"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="insight-percentage">{item.percentage}% of total time</div>
              </div>
            ))}
          </div>

          <div className="ai-insight">
            <div className="ai-insight-icon">i</div>
            <div className="ai-insight-content">
              <strong>AI Insight:</strong> Credit check API is causing 60% of delays.
              Consider implementing caching or using a faster API provider.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
