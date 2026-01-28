/**
 * Analytics - Unified Analytics Platform
 *
 * Main analytics interface matching the workflow editor design language.
 * Features main canvas and floating action buttons.
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  Link2,
  Database,
  Clock,
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import './Analytics.css';
import NaturalLanguageQuery from './NaturalLanguageQuery';
import DataExplorer from './DataExplorer';
import LookupBuilder from './LookupBuilder';
import DashboardBuilder from './DashboardBuilder';
import ReportDesigner from './ReportDesigner';

const Analytics = () => {
  const [activeView, setActiveView] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState([]);
  const [catalogSummary, setCatalogSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    fetchCatalogSummary();
    loadRecentItems();
  }, []);

  const fetchCatalogSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/catalog', {
        headers: { 'x-org-id': 'default' }
      });
      if (res.ok) {
        const data = await res.json();
        setCatalogSummary(data.data);
      }
    } catch (error) {
      console.error('Error fetching catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentItems = () => {
    setRecentItems([
      { id: 1, type: 'query', title: 'Sales by region this month', time: '2 hours ago' },
      { id: 2, type: 'dashboard', title: 'Executive Summary', time: '1 day ago' },
      { id: 3, type: 'report', title: 'Monthly Performance', time: '3 days ago' }
    ]);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveView('query');
    }
  };

  const getItemIcon = (type) => {
    switch (type) {
      case 'query': return MessageSquare;
      case 'dashboard': return LayoutDashboard;
      case 'report': return FileText;
      default: return Database;
    }
  };

  // Render content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'query':
        return (
          <NaturalLanguageQuery
            onBack={() => setActiveView('home')}
            initialQuery={searchQuery}
            catalogSummary={catalogSummary}
          />
        );
      case 'explore':
        return (
          <DataExplorer
            onBack={() => setActiveView('home')}
            catalogSummary={catalogSummary}
          />
        );
      case 'lookup':
        return <LookupBuilder onBack={() => setActiveView('home')} />;
      case 'dashboard':
        return (
          <DashboardBuilder
            onBack={() => setActiveView('home')}
            catalogSummary={catalogSummary}
          />
        );
      case 'report':
        return (
          <ReportDesigner
            onBack={() => setActiveView('home')}
            catalogSummary={catalogSummary}
          />
        );
      default:
        return renderHomeView();
    }
  };

  // Render home view (like empty canvas state)
  const renderHomeView = () => (
    <div className="analytics-canvas">
      {/* AI Prompt Trigger (like workflow editor) */}
      <button className="ai-prompt-trigger" onClick={() => setActiveView('query')}>
        <Sparkles size={18} />
        Ask AI
      </button>

      {/* Main Content */}
      <div className="canvas-content">
        {/* Search Section */}
        <div className="search-section">
          <h1>What would you like to know?</h1>
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-box">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Ask a question about your data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-submit" disabled={!searchQuery.trim()}>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
          <div className="search-suggestions">
            <span>Try:</span>
            <button onClick={() => { setSearchQuery('Show me sales by region'); setActiveView('query'); }}>
              Sales by region
            </button>
            <button onClick={() => { setSearchQuery('Top 10 customers this month'); setActiveView('query'); }}>
              Top customers
            </button>
            <button onClick={() => { setSearchQuery('Revenue trend over time'); setActiveView('query'); }}>
              Revenue trend
            </button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="quick-actions-section">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <div className="action-card" onClick={() => setActiveView('dashboard')}>
              <div className="action-icon dashboard">
                <LayoutDashboard size={24} />
              </div>
              <div className="action-info">
                <h3>Create Dashboard</h3>
                <p>Build visual dashboards with charts and metrics</p>
              </div>
              <ArrowRight size={18} className="action-arrow" />
            </div>

            <div className="action-card" onClick={() => setActiveView('report')}>
              <div className="action-icon report">
                <FileText size={24} />
              </div>
              <div className="action-info">
                <h3>Create Report</h3>
                <p>Design professional reports with data tables</p>
              </div>
              <ArrowRight size={18} className="action-arrow" />
            </div>

            <div className="action-card" onClick={() => setActiveView('lookup')}>
              <div className="action-icon lookup">
                <Link2 size={24} />
              </div>
              <div className="action-info">
                <h3>Connected Dropdown</h3>
                <p>Create cascading selections like Country to City</p>
              </div>
              <ArrowRight size={18} className="action-arrow" />
            </div>

            <div className="action-card" onClick={() => setActiveView('explore')}>
              <div className="action-icon explore">
                <Database size={24} />
              </div>
              <div className="action-info">
                <h3>Browse Data</h3>
                <p>Explore data models across your applications</p>
              </div>
              <ArrowRight size={18} className="action-arrow" />
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="bottom-section">
          {/* Recent Items */}
          <div className="recent-section">
            <div className="section-header">
              <h2><Clock size={18} /> Recent</h2>
            </div>
            <div className="recent-list">
              {recentItems.map((item) => {
                const Icon = getItemIcon(item.type);
                return (
                  <div key={item.id} className="recent-item">
                    <Icon size={16} />
                    <span className="recent-title">{item.title}</span>
                    <span className="recent-time">{item.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Summary */}
          <div className="data-summary">
            <div className="section-header">
              <h2><Database size={18} /> Your Data</h2>
              <button className="refresh-btn" onClick={fetchCatalogSummary} title="Refresh">
                <RefreshCw size={14} />
              </button>
            </div>
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : catalogSummary ? (
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-value">{catalogSummary.totalModels || 0}</span>
                  <span className="stat-label">Data Models</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{catalogSummary.totalFields || 0}</span>
                  <span className="stat-label">Fields</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{catalogSummary.categories?.length || 0}</span>
                  <span className="stat-label">Categories</span>
                </div>
              </div>
            ) : (
              <div className="empty-state">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Buttons (like workflow editor FABs) */}
      <div className="fab-container">
        <button className="fab-button fab-query" title="Ask a Question" onClick={() => setActiveView('query')}>
          <MessageSquare size={22} />
        </button>
        <button className="fab-button fab-dashboard" title="New Dashboard" onClick={() => setActiveView('dashboard')}>
          <LayoutDashboard size={22} />
        </button>
        <button className="fab-button fab-report" title="New Report" onClick={() => setActiveView('report')}>
          <FileText size={22} />
        </button>
        <button className="fab-button fab-explore" title="Browse Data" onClick={() => setActiveView('explore')}>
          <Database size={22} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="analytics-container">
      <div className="analytics-main">
        {renderContent()}
      </div>
    </div>
  );
};

export default Analytics;
