import React, { useState, useEffect } from 'react';
import { logsApi, workflowsApi, formsApi } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentWorkflows, setRecentWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, workflowsRes, formsRes] = await Promise.all([
        logsApi.getStatistics().catch(() => ({ data: {} })),
        workflowsApi.list().catch(() => ({ data: [] })),
        formsApi.list().catch(() => ({ data: [] }))
      ]);

      setStats({
        workflows: workflowsRes.data?.length || 0,
        forms: formsRes.data?.length || 0,
        dataModels: 0,
        executions: statsRes.data?.statistics?.totalExecutions || 0
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome to zen_dolphin</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.workflows || 0}</div>
          <div className="stat-label">Workflows</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.forms || 0}</div>
          <div className="stat-label">Forms</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.dataModels || 0}</div>
          <div className="stat-label">Data Models</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.executions || 0}</div>
          <div className="stat-label">Total Executions</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/workflows" className="btn btn-primary">View Workflows</a>
          <a href="/forms" className="btn btn-secondary">Browse Forms</a>
        </div>
      </div>
    </div>
  );
}