import React, { useState, useEffect } from 'react';
import {
  Grid, List, Filter, Plus, MoreVertical, TrendingUp,
  AlertTriangle, Activity, Users, Clock
} from 'lucide-react';
import './ApplicationsDashboard.css';
import { useWorkflow } from '../../context/WorkflowContext';

const ApplicationsDashboard = () => {
  const { setCurrentApplication, setActiveSidebar } = useWorkflow();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const appsPerPage = 8;

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/applications');
      const data = await response.json();

      if (data.success) {
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const appId = `app_${timestamp}_${randomId}`;
      const appName = generateDockerStyleName();

      const response = await fetch('http://localhost:5000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: appId,
          name: appName,
          description: 'Auto-generated application',
          domain: 'general',
          resources: {
            workflows: [],
            forms: [],
            pages: [],
            dataModels: []
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentApplication(data.application);
        setActiveSidebar('workflows');
      }
    } catch (error) {
      console.error('Failed to create application:', error);
    }
  };

  const generateDockerStyleName = () => {
    const adjectives = [
      'happy', 'sleepy', 'dopey', 'grumpy', 'clever', 'brave', 'calm', 'eager',
      'fancy', 'gentle', 'kind', 'lively', 'nice', 'proud', 'silly', 'witty',
      'zealous', 'agile', 'bold', 'cool', 'daring', 'peaceful', 'serene'
    ];

    const nouns = [
      'albatross', 'bear', 'cat', 'dog', 'elephant', 'fox', 'giraffe',
      'hamster', 'jaguar', 'koala', 'leopard', 'monkey', 'narwhal', 'panda',
      'quokka', 'rabbit', 'tiger', 'whale', 'zebra', 'dolphin', 'eagle', 'falcon'
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adjective}-${noun}`;
  };

  // Calculate stats
  const totalApps = applications.length;
  const activeApps = applications.filter(app => app.status === 'production' || app.status === 'deployed').length;
  const issuesCount = applications.filter(app => app.status === 'draft').length;
  const avgUptime = '99.9%';

  // Pagination
  const indexOfLastApp = currentPage * appsPerPage;
  const indexOfFirstApp = indexOfLastApp - appsPerPage;
  const currentApps = applications.slice(indexOfFirstApp, indexOfLastApp);
  const totalPages = Math.ceil(applications.length / appsPerPage);

  if (loading) {
    return (
      <div className="apps-dashboard">
        <div className="loading-state">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="apps-dashboard">
      <div className="apps-header">
        <div className="header-content">
          <h1>Applications</h1>
          <p className="header-subtitle">Manage and monitor your deployed applications.</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={18} />
            </button>
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
          <button className="filter-btn">
            <Filter size={18} />
            Filter
          </button>
          <button className="new-app-btn" onClick={handleCreateNew}>
            <Plus size={18} />
            New App
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Users size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Apps</div>
            <div className="stat-value">{totalApps}</div>
            <div className="stat-change positive">
              <TrendingUp size={12} />
              12% from last month
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon active">
            <Activity size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Active</div>
            <div className="stat-value">{activeApps}</div>
            <div className="stat-meta">Currently running</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <AlertTriangle size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Issues</div>
            <div className="stat-value">{issuesCount}</div>
            <div className="stat-meta">Requires attention</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon uptime">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Avg. Uptime</div>
            <div className="stat-value">{avgUptime}</div>
            <div className="stat-meta">Last 30 days</div>
          </div>
        </div>
      </div>

      <div className={`apps-grid ${viewMode}`}>
        {currentApps.map(app => (
          <AppCard key={app.id} app={app} onRefresh={fetchApplications} />
        ))}

        {currentApps.length < appsPerPage && (
          <div className="deploy-new-card" onClick={handleCreateNew}>
            <div className="deploy-icon">
              <Plus size={24} />
            </div>
            <div className="deploy-content">
              <h3>Deploy New App</h3>
              <p>Create a new application from a template or connect a repository.</p>
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {indexOfFirstApp + 1} to {Math.min(indexOfLastApp, totalApps)} of {totalApps} results
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </button>
            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AppCard = ({ app, onRefresh }) => {
  const { setCurrentApplication, setConnectedForms, setDataModels, setConnectedPages, setCurrentWorkflow, setActiveSidebar } = useWorkflow();
  const [showMenu, setShowMenu] = useState(false);

  const getStatusInfo = (status) => {
    const statusMap = {
      production: { label: 'Running', color: '#10b981', dotColor: '#10b981' },
      deployed: { label: 'Warning', color: '#f59e0b', dotColor: '#f59e0b' },
      draft: { label: 'Stopped', color: '#6b7280', dotColor: '#6b7280' }
    };
    return statusMap[status] || statusMap.draft;
  };

  const getRegion = (app) => {
    const regions = ['US-East', 'EU-West', 'AP-South', 'US-West'];
    return regions[Math.floor(Math.random() * regions.length)];
  };

  const getCPUUsage = () => {
    return Math.floor(Math.random() * 100);
  };

  const getMemoryUsage = () => {
    return Math.floor(Math.random() * 100);
  };

  const getEnvironment = (status) => {
    if (status === 'production') return 'Production';
    if (status === 'deployed') return 'Staging';
    return 'Dev';
  };

  const getUpdatedTime = () => {
    const times = ['2h ago', '5m ago', '10h ago', '2d ago'];
    return times[Math.floor(Math.random() * times.length)];
  };

  const statusInfo = getStatusInfo(app.status);
  const cpuUsage = getCPUUsage();
  const memoryUsage = getMemoryUsage();
  const environment = getEnvironment(app.status);
  const region = getRegion(app);
  const updatedTime = getUpdatedTime();

  const handleLoadApp = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/applications/${app.id}`);
      const data = await response.json();

      if (data.success && data.application) {
        const application = data.application;
        setCurrentApplication(application);

        const workflows = application.resources?.workflows || [];
        if (workflows.length > 0 && workflows[0]) {
          setCurrentWorkflow(workflows[0]);
        }

        setConnectedForms(application.resources?.forms || []);
        setDataModels(application.resources?.dataModels || []);
        setConnectedPages(application.resources?.pages || []);
        setActiveSidebar('workflows');
      }
    } catch (error) {
      console.error('Failed to load application:', error);
    }
  };

  return (
    <div className="app-card" onClick={handleLoadApp}>
      <div className="app-card-header">
        <div className="app-icon">
          <div className="icon-placeholder">{app.name.substring(0, 2).toUpperCase()}</div>
        </div>
        <div className="app-title">
          <h3>{app.name}</h3>
          <p className="app-env">{environment} • v{app.version || '2.4.0'}</p>
        </div>
        <button
          className="menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      <div className="app-details">
        <div className="detail-row">
          <span className="detail-label">Status</span>
          <div className="status-badge">
            <span className="status-dot" style={{ backgroundColor: statusInfo.dotColor }} />
            {statusInfo.label}
          </div>
        </div>
        <div className="detail-row">
          <span className="detail-label">Region</span>
          <span className="detail-value">{region}</span>
        </div>
      </div>

      <div className="app-footer">
        <div className="team-avatars">
          {['JD', 'SM'].map((initials, i) => (
            <div key={i} className="avatar" style={{ left: `${i * 20}px` }}>
              {initials}
            </div>
          ))}
        </div>
        <span className="updated-time">Updated {updatedTime}</span>
      </div>
    </div>
  );
};

export default ApplicationsDashboard;
