import React, { useState } from 'react';
import './Header.css';
import { useWorkflow } from '../../context/WorkflowContext';
import { useAres } from '../../context/AresContext';
import { Workflow, Users, Share2, MoreVertical, Star, Sparkles, MessageCircle } from 'lucide-react';

const Header = () => {
  const { currentApplication, currentWorkflow, activeTab, setActiveTab } = useWorkflow();
  const { open } = useAres();

  const tabs = [
    { id: 'designer', label: 'Designer', icon: '' },
    { id: 'ai-assistant', label: 'AI Assistant', icon: '' },
    { id: 'test-run', label: 'Test Run', icon: '' },
    { id: 'analytics', label: 'Analytics', icon: '' }
  ];

  return (
    <div className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon">AI</div>
          <span className="logo-text">Tentoro Designer</span>
        </div>
        {(currentApplication || currentWorkflow) && (
          <div className="breadcrumb">
            <Workflow size={16} />
            {currentApplication && (
              <>
                <span>{currentApplication.name}</span>
                {currentWorkflow && <span className="separator">/</span>}
              </>
            )}
            {currentWorkflow && (
              <>
                <span className="current-workflow">{currentWorkflow.name}</span>
                <button className="favorite-btn">
                  <Star size={16} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="header-center">
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="header-right">
        {currentWorkflow && (
          <div className="status-badge">
            <span className="status-dot"></span>
            Status: <strong>{currentWorkflow.status || 'Draft'}</strong>
          </div>
        )}
        <button className="icon-btn ares-btn" onClick={() => open()} title="AI Assistant (ARES)">
          <Sparkles size={28} />
        </button>
        <button className="icon-btn">
          <Users size={24} />
        </button>
        <button className="share-btn">
          <Share2 size={20} />
          Share
        </button>
        <button className="icon-btn">
          <MoreVertical size={24} />
        </button>
      </div>
    </div>
  );
};

export default Header;
