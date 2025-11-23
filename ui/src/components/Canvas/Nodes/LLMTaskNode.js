import React from 'react';
import { Handle, Position } from 'reactflow';
import { Sparkles, X } from 'lucide-react';
import './NodeStyles.css';
import { useWorkflow } from '../../../context/WorkflowContext';

const LLMTaskNode = ({ id, data = {}, selected }) => {
  const { deleteNode } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  return (
    <div className={`custom-node llm-task-node ${selected ? 'selected' : ''}`}>
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <Handle
        type="target"
        position={Position.Top}
        className="node-handle"
      />

      <div className="node-icon llm-icon">
        <Sparkles size={24} />
      </div>

      <div className="node-content">
        <div className="node-label">{data?.label || 'LLM Task'}</div>
        {data?.model && (
          <div className="node-meta">{data?.model}</div>
        )}
        {data?.description && (
          <div className="node-description">{data?.description}</div>
        )}
        {data?.prompt && (
          <div className="node-prompt-preview">
            {data.prompt.length > 50 ? data.prompt.substring(0, 50) + '...' : data.prompt}
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

export default LLMTaskNode;
