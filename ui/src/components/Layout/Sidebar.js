import React from 'react';
import './Sidebar.css';
import { useWorkflow } from '../../context/WorkflowContext';
import {
  Sparkles,
  LayoutDashboard,
  GitBranch,
  Play,
  Smartphone,
  FileText,
  Database,
  Clock,
  Layers,
  Users,
  HelpCircle,
  ChevronDown,
  History,
  Package
} from 'lucide-react';

const Sidebar = () => {
  const { activeSidebar, setActiveSidebar } = useWorkflow();

  const navGroups = [
    {
      title: 'Applications',
      items: [
        { id: 'applications', label: 'Applications', icon: Package }
      ]
    },
    {
      title: 'Create',
      items: [
        { id: 'ai-prompt', label: 'AI Prompt', icon: Sparkles, shortcut: '⌘P' },
        { id: 'workflow-editor', label: 'Workflow Editor', icon: LayoutDashboard }
      ]
    },
    {
      title: 'Components',
      items: [
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

  const sections = [
    {
      title: 'Recent Workflows',
      icon: Clock,
      items: [
        { id: 'order-processing', label: 'Order Processing', icon: '•' },
        { id: 'customer-onboarding', label: 'Customer Onboarding', icon: '•', active: true },
        { id: 'invoice-approval', label: 'Invoice Approval', icon: '•' }
      ]
    },
    {
      title: 'Templates',
      icon: Layers,
      items: [
        { id: 'quick-start', label: 'Quick Start', icon: '•' }
      ]
    }
  ];

  const bottomItems = [
    { id: 'invite-team', label: 'Invite Team', icon: Users },
    { id: 'help', label: 'Help & Documentation', icon: HelpCircle }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <div key={group.title} className="nav-group">
              <div className="nav-group-title">{group.title}</div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  className={`nav-item ${activeSidebar === item.id ? 'active' : ''}`}
                  onClick={() => setActiveSidebar(item.id)}
                >
                  <item.icon size={18} />
                  <span className="nav-label">{item.label}</span>
                  {item.shortcut && <span className="nav-shortcut">{item.shortcut}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-sections">
          {sections.map(section => (
            <div key={section.title} className="sidebar-section">
              <div className="section-header">
                <section.icon size={16} />
                <span>{section.title}</span>
                <ChevronDown size={14} />
              </div>
              <div className="section-items">
                {section.items.map(item => (
                  <button
                    key={item.id}
                    className={`section-item ${item.active ? 'active' : ''}`}
                  >
                    <span className="item-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        {bottomItems.map(item => (
          <button key={item.id} className="footer-item">
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="zoom-controls">
        <span>Zoom: 100%</span>
        <div className="zoom-buttons">
          <button>⊕</button>
          <button>⊖</button>
          <button>⤢</button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
