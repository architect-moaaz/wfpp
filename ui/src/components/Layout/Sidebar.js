import React, { useState } from 'react';
import './Sidebar.css';
import { useWorkflow } from '../../context/WorkflowContext';
import {
  GitBranch,
  Play,
  Smartphone,
  FileText,
  Database,
  Layers,
  Users,
  HelpCircle,
  History,
  Package,
  Workflow,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Sidebar = () => {
  const { activeSidebar, setActiveSidebar } = useWorkflow();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navGroups = [
    {
      title: 'Applications',
      items: [
        { id: 'applications', label: 'Applications', icon: Package }
      ]
    },
    {
      title: 'Components',
      items: [
        { id: 'workflows', label: 'Workflows', icon: Workflow },
        { id: 'forms', label: 'Forms', icon: FileText },
        { id: 'data-models', label: 'Data Models', icon: Database },
        { id: 'pages', label: 'Pages', icon: Layers }
      ]
    },
    {
      title: 'Advanced',
      items: [
        { id: 'rule-engine', label: 'Rule Engine', icon: GitBranch },
        { id: 'orchestration', label: 'Orchestration', icon: Play },
        { id: 'version-history', label: 'Version History', icon: History }
      ]
    },
    {
      title: 'UI Design',
      items: [
        { id: 'mobile-screens', label: 'Mobile Screens', icon: Smartphone }
      ]
    }
  ];

  const bottomItems = [
    { id: 'invite-team', label: 'Invite Team', icon: Users },
    { id: 'help', label: 'Help & Documentation', icon: HelpCircle }
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-content">
        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <div key={group.title} className="nav-group">
              {!isCollapsed && <div className="nav-group-title">{group.title}</div>}
              {group.items.map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${activeSidebar === item.id ? 'active' : ''}`}
                  onClick={() => setActiveSidebar(item.id)}
                  title={isCollapsed ? item.label : ''}
                >
                  <item.icon size={18} />
                  {!isCollapsed && <span className="nav-label">{item.label}</span>}
                  {!isCollapsed && item.shortcut && <span className="nav-shortcut">{item.shortcut}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        {bottomItems.map(item => (
          <button key={item.id} className="footer-item" title={isCollapsed ? item.label : ''}>
            <item.icon size={18} />
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>

      {!isCollapsed && (
        <div className="zoom-controls">
          <span>Zoom: 100%</span>
          <div className="zoom-buttons">
            <button>+</button>
            <button>-</button>
            <button>Fit</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
