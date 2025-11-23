import React, { useState } from 'react';
import './NodePalette.css';
import {
  PlayCircle, CheckCircle, GitBranch, Mail, Database,
  ChevronLeft, ChevronRight, Circle, User,
  FileCode, Clock, Sparkles
} from 'lucide-react';

const NodePalette = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const nodeCategories = [
    {
      category: 'Events',
      nodes: [
        { type: 'startProcess', label: 'Start Event', icon: PlayCircle, description: 'Workflow start' },
        { type: 'endEvent', label: 'End Event', icon: Circle, description: 'Workflow end' },
        { type: 'timerEvent', label: 'Timer Event', icon: Clock, description: 'Time-based trigger' },
      ]
    },
    {
      category: 'Tasks',
      nodes: [
        { type: 'userTask', label: 'Human Task', icon: User, description: 'Manual user task' },
        { type: 'scriptTask', label: 'Script', icon: FileCode, description: 'Execute script' },
        { type: 'llmTask', label: 'LLM Task', icon: Sparkles, description: 'AI-powered task' },
      ]
    },
    {
      category: 'Gateways',
      nodes: [
        { type: 'decision', label: 'Decision Gateway', icon: GitBranch, description: 'Routing & branching' },
      ]
    },
    {
      category: 'Other',
      nodes: [
        { type: 'validation', label: 'Validation', icon: CheckCircle, description: 'Data validation' },
        { type: 'notification', label: 'Notification', icon: Mail, description: 'Send notification' },
        { type: 'dataProcess', label: 'Data Process', icon: Database, description: 'Process data' },
      ]
    }
  ];

  const onDragStart = (event, nodeType) => {
    console.log('Drag started:', nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Get all nodes flattened for collapsed view
  const allNodes = nodeCategories.flatMap(category => category.nodes);

  return (
    <div className={`node-palette ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="palette-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Show Components' : 'Hide Components'}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {isCollapsed ? (
        <div className="palette-collapsed-content">
          {allNodes.map((node) => {
            const IconComponent = node.icon;
            return (
              <div
                key={node.type}
                className="node-icon-item"
                data-type={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                title={node.label}
              >
                <div className="node-icon-only">
                  <IconComponent size={18} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="palette-header">
            <h3>Components</h3>
            <p>Drag to canvas or use AI</p>
          </div>
          <div className="palette-items">
            {nodeCategories.map((category) => (
              <div key={category.category} className="palette-category">
                <div className="category-title">{category.category}</div>
                {category.nodes.map((node) => (
                  <div
                    key={node.type}
                    className="palette-node"
                    data-type={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                  >
                    <div className="palette-node-icon">
                      <node.icon size={20} />
                    </div>
                    <div className="palette-node-info">
                      <div className="palette-node-label">{node.label}</div>
                      <div className="palette-node-desc">{node.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default NodePalette;
