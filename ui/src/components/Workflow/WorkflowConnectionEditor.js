import React, { useState } from 'react';
import {
  GitBranch, ArrowRight, Plus, Trash2, X, Zap, Workflow,
  Save, AlertCircle
} from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import './WorkflowConnectionEditor.css';

const WorkflowConnectionEditor = ({ onClose }) => {
  const { currentApplication, setCurrentApplication } = useWorkflow();

  const workflows = currentApplication?.resources?.workflows || [];
  const [connections, setConnections] = useState(
    currentApplication?.resources?.workflowConnections || []
  );
  const [editingConnection, setEditingConnection] = useState(null);
  const [errors, setErrors] = useState([]);

  const handleAddConnection = () => {
    const newConnection = {
      id: `conn_${Date.now()}`,
      source: '',
      target: '',
      via: 'event',
      event: ''
    };
    setConnections([...connections, newConnection]);
    setEditingConnection(newConnection.id);
  };

  const handleUpdateConnection = (connId, field, value) => {
    setConnections(connections.map(conn =>
      conn.id === connId ? { ...conn, [field]: value } : conn
    ));
  };

  const handleDeleteConnection = (connId) => {
    setConnections(connections.filter(conn => conn.id !== connId));
  };

  const validateConnections = () => {
    const newErrors = [];

    connections.forEach((conn, index) => {
      if (!conn.source) {
        newErrors.push(`Connection ${index + 1}: Source workflow is required`);
      }
      if (!conn.target) {
        newErrors.push(`Connection ${index + 1}: Target workflow is required`);
      }
      if (conn.source === conn.target && conn.source) {
        newErrors.push(`Connection ${index + 1}: Source and target cannot be the same`);
      }
      if (conn.via === 'event' && !conn.event) {
        newErrors.push(`Connection ${index + 1}: Event name is required for event connections`);
      }
    });

    // Check for circular dependencies in direct calls
    const directCallGraph = new Map();
    connections.filter(c => c.via === 'direct_call').forEach(conn => {
      if (!directCallGraph.has(conn.source)) {
        directCallGraph.set(conn.source, []);
      }
      directCallGraph.get(conn.source).push(conn.target);
    });

    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (node, path = []) => {
      if (recursionStack.has(node)) {
        newErrors.push(`Circular dependency detected: ${[...path, node].join(' -> ')}`);
        return true;
      }
      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const neighbors = directCallGraph.get(node) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor, [...path, node])) return true;
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of directCallGraph.keys()) {
      visited.clear();
      recursionStack.clear();
      hasCycle(node);
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (!validateConnections()) {
      return;
    }

    // Update workflows with event configurations based on connections
    const updatedWorkflows = workflows.map(wf => {
      const emits = [];
      const listensTo = [];
      let isSubWorkflow = wf.isSubWorkflow || false;
      const triggers = [...(wf.triggers || [{ type: 'user_action' }])];

      connections.forEach(conn => {
        // Source workflow emits events
        if ((conn.source === wf.name || conn.source === wf.id) && conn.via === 'event') {
          if (!emits.includes(conn.event)) {
            emits.push(conn.event);
          }
        }

        // Target workflow listens to events or is a sub-workflow
        if (conn.target === wf.name || conn.target === wf.id) {
          if (conn.via === 'event') {
            if (!listensTo.includes(conn.event)) {
              listensTo.push(conn.event);
            }
            // Add event trigger if not exists
            if (!triggers.some(t => t.type === 'event' && t.event === conn.event)) {
              triggers.push({ type: 'event', event: conn.event });
            }
          } else if (conn.via === 'direct_call') {
            isSubWorkflow = true;
            if (!triggers.some(t => t.type === 'direct_call')) {
              triggers.push({ type: 'direct_call' });
            }
          }
        }
      });

      return {
        ...wf,
        isSubWorkflow,
        triggers,
        events: {
          emits: emits.length > 0 ? emits : (wf.events?.emits || []),
          listensTo: listensTo.length > 0 ? listensTo : (wf.events?.listensTo || [])
        }
      };
    });

    // Update application
    const updatedApplication = {
      ...currentApplication,
      resources: {
        ...currentApplication?.resources,
        workflows: updatedWorkflows,
        workflowConnections: connections
      }
    };

    setCurrentApplication(updatedApplication);
    if (onClose) onClose();
  };

  const getWorkflowName = (idOrName) => {
    const wf = workflows.find(w => w.id === idOrName || w.name === idOrName);
    return wf?.name || idOrName;
  };

  return (
    <div className="connection-editor">
      <div className="connection-editor-header">
        <div className="header-title">
          <GitBranch size={18} />
          <h3>Workflow Connections</h3>
        </div>
        <div className="header-actions">
          <button className="save-btn" onClick={handleSave}>
            <Save size={16} />
            Save
          </button>
          {onClose && (
            <button className="close-btn" onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="connection-errors">
          <AlertCircle size={16} />
          <div className="error-list">
            {errors.map((error, index) => (
              <div key={index} className="error-item">{error}</div>
            ))}
          </div>
        </div>
      )}

      <div className="connection-list">
        {connections.length === 0 ? (
          <div className="no-connections">
            <GitBranch size={32} />
            <p>No connections defined</p>
            <span>Add connections to link workflows together</span>
          </div>
        ) : (
          connections.map((conn, index) => (
            <div
              key={conn.id}
              className={`connection-item ${editingConnection === conn.id ? 'editing' : ''}`}
            >
              <div className="connection-number">{index + 1}</div>

              <div className="connection-content">
                <div className="connection-row">
                  <div className="connection-field">
                    <label>Source Workflow</label>
                    <select
                      value={conn.source}
                      onChange={(e) => handleUpdateConnection(conn.id, 'source', e.target.value)}
                    >
                      <option value="">Select workflow...</option>
                      {workflows.map(wf => (
                        <option key={wf.id} value={wf.name}>{wf.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="connection-arrow">
                    <ArrowRight size={20} />
                  </div>

                  <div className="connection-field">
                    <label>Target Workflow</label>
                    <select
                      value={conn.target}
                      onChange={(e) => handleUpdateConnection(conn.id, 'target', e.target.value)}
                    >
                      <option value="">Select workflow...</option>
                      {workflows.filter(wf => wf.name !== conn.source && wf.id !== conn.source).map(wf => (
                        <option key={wf.id} value={wf.name}>{wf.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="connection-row">
                  <div className="connection-field">
                    <label>Connection Type</label>
                    <div className="connection-type-buttons">
                      <button
                        className={conn.via === 'event' ? 'active' : ''}
                        onClick={() => handleUpdateConnection(conn.id, 'via', 'event')}
                      >
                        <Zap size={14} />
                        Event
                      </button>
                      <button
                        className={conn.via === 'direct_call' ? 'active' : ''}
                        onClick={() => handleUpdateConnection(conn.id, 'via', 'direct_call')}
                      >
                        <Workflow size={14} />
                        Direct Call
                      </button>
                    </div>
                  </div>

                  {conn.via === 'event' && (
                    <div className="connection-field event-field">
                      <label>Event Name</label>
                      <input
                        type="text"
                        value={conn.event || ''}
                        onChange={(e) => handleUpdateConnection(conn.id, 'event', e.target.value)}
                        placeholder="e.g., order.completed"
                      />
                    </div>
                  )}
                </div>

                {conn.source && conn.target && (
                  <div className="connection-preview">
                    <span className="workflow-name">{getWorkflowName(conn.source)}</span>
                    <span className="connection-via">
                      {conn.via === 'event' ? (
                        <><Zap size={12} /> emits "{conn.event || '?'}"</>
                      ) : (
                        <><Workflow size={12} /> calls directly</>
                      )}
                    </span>
                    <ArrowRight size={14} />
                    <span className="workflow-name">{getWorkflowName(conn.target)}</span>
                  </div>
                )}
              </div>

              <button
                className="delete-connection"
                onClick={() => handleDeleteConnection(conn.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <button className="add-connection-btn" onClick={handleAddConnection}>
        <Plus size={16} />
        Add Connection
      </button>
    </div>
  );
};

export default WorkflowConnectionEditor;
