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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Network,
  Shield,
  UsersRound,
  FolderTree,
  BarChart3
} from 'lucide-react';

const Sidebar = () => {
  const { activeSidebar, setActiveSidebar } = useWorkflow();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOrgExpanded, setIsOrgExpanded] = useState(false);

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
    },
    {
      title: 'Insights',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 }
      ]
    }
  ];

  const orgItems = [
    { id: 'org-settings', label: 'Settings', icon: Building2 },
    { id: 'org-chart', label: 'Org Chart', icon: Network },
    { id: 'org-roles', label: 'Roles', icon: Shield },
    { id: 'org-groups', label: 'Groups', icon: UsersRound },
    { id: 'org-departments', label: 'Departments', icon: FolderTree }
  ];

  const isOrgItemActive = orgItems.some(item => item.id === activeSidebar);

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
        <div className={`org-section ${isOrgExpanded ? 'expanded' : ''} ${isOrgItemActive ? 'has-active' : ''}`}>
          <button
            className={`org-toggle ${isOrgItemActive ? 'active' : ''}`}
            onClick={() => setIsOrgExpanded(!isOrgExpanded)}
            title={isCollapsed ? 'Organization' : ''}
          >
            <Building2 size={18} />
            {!isCollapsed && (
              <>
                <span>Organization</span>
                {isOrgExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </>
            )}
          </button>
          {isOrgExpanded && !isCollapsed && (
            <div className="org-items">
              {orgItems.map(item => (
                <button
                  key={item.id}
                  className={`org-item ${activeSidebar === item.id ? 'active' : ''}`}
                  onClick={() => setActiveSidebar(item.id)}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
          {isOrgExpanded && isCollapsed && (
            <div className="org-items-collapsed">
              {orgItems.map(item => (
                <button
                  key={item.id}
                  className={`org-item ${activeSidebar === item.id ? 'active' : ''}`}
                  onClick={() => setActiveSidebar(item.id)}
                  title={item.label}
                >
                  <item.icon size={16} />
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="footer-item" title={isCollapsed ? 'Invite Team' : ''}>
          <Users size={18} />
          {!isCollapsed && <span>Invite Team</span>}
        </button>

        <button className="footer-item" title={isCollapsed ? 'Help & Documentation' : ''}>
          <HelpCircle size={18} />
          {!isCollapsed && <span>Help & Docs</span>}
        </button>
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
