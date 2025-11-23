import React from 'react';
import { Handle, Position } from 'reactflow';
import { FileCode, X } from 'lucide-react';
import './NodeStyles.css';
import { useWorkflow } from '../../../context/WorkflowContext';

const ScriptTaskNode = ({ id, data = {}, selected }) => {
  const { deleteNode } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  return (
    <div className={`custom-node script-task-node ${selected ? 'selected' : ''}`}>
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <Handle
        type="target"
        position={Position.Top}
        className="node-handle"
      />

      <div className="node-icon script-icon">
        <FileCode size={24} />
      </div>

      <div className="node-content">
        <div className="node-label">{data?.label || 'Script Task'}</div>
        {data?.scriptType && (
          <div className="node-meta">{data?.scriptType}</div>
        )}
        {data?.description && (
          <div className="node-description">{data?.description}</div>
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

export default ScriptTaskNode;
