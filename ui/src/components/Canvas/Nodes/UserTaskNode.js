import React from 'react';
import { Handle, Position } from 'reactflow';
import { User, X } from 'lucide-react';
import './NodeStyles.css';
import { useWorkflow } from '../../../context/WorkflowContext';

const UserTaskNode = ({ id, data = {}, selected }) => {
  const { deleteNode } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  return (
    <div className={`custom-node user-task-node ${selected ? 'selected' : ''}`}>
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <Handle
        type="target"
        position={Position.Top}
        className="node-handle"
      />

      <div className="node-icon user-task-icon">
        <User size={24} />
      </div>

      <div className="node-content">
        <div className="node-label">{data?.label || 'User Task'}</div>
        {data?.assignee && (
          <div className="node-meta">Assignee: {data?.assignee}</div>
        )}
        {data?.description && (
          <div className="node-description">{data?.description}</div>
        )}
        {data?.formName && (
          <div className="node-tag">
            <span className="tag-label">Form:</span>
            <span>{data?.formName}</span>
          </div>
        )}
        {data?.dataModel && (
          <div className="node-tag data-model-tag">
            <span className="tag-label">Data:</span> {data?.dataModel}
            {data?.dataModelAction && (
              <span className="tag-action">({data?.dataModelAction})</span>
            )}
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

export default UserTaskNode;
