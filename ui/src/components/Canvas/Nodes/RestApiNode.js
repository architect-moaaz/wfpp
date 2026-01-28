import React from 'react';
import { Handle, Position } from 'reactflow';
import { Globe, X } from 'lucide-react';
import './NodeStyles.css';
import { useWorkflow } from '../../../context/WorkflowContext';

const RestApiNode = ({ id, data = {}, selected }) => {
  const { deleteNode } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: '#22c55e',
      POST: '#3b82f6',
      PUT: '#f59e0b',
      PATCH: '#8b5cf6',
      DELETE: '#ef4444'
    };
    return colors[method] || '#6b7280';
  };

  return (
    <div className={`custom-node rest-api-node ${selected ? 'selected' : ''}`}>
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <Handle
        type="target"
        position={Position.Top}
        className="node-handle"
      />

      <div className="node-icon rest-icon">
        <Globe size={24} />
      </div>

      <div className="node-content">
        <div className="node-label">{data?.label || 'REST API Call'}</div>
        {data?.method && (
          <div className="node-meta">
            <span
              className="method-badge"
              style={{
                backgroundColor: getMethodColor(data.method),
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600'
              }}
            >
              {data.method}
            </span>
          </div>
        )}
        {data?.url && (
          <div className="node-description" style={{
            fontSize: '10px',
            maxWidth: '140px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {data.url}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="node-handle"
      />
    </div>
  );
};

export default RestApiNode;
