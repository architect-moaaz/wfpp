import React from 'react';
import { Handle, Position } from 'reactflow';
import { Circle, X } from 'lucide-react';
import './NodeStyles.css';
import { useWorkflow } from '../../../context/WorkflowContext';

const EndEventNode = ({ id, data = {}, selected }) => {
  const { deleteNode } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  return (
    <div className={`custom-node end-event-node ${selected ? 'selected' : ''}`}>
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <Handle
        type="target"
        position={Position.Top}
        className="node-handle"
      />

      <div className="node-icon end-icon">
        <Circle size={24} />
      </div>

      <div className="node-content">
        <div className="node-label">{data?.label || 'End Event'}</div>
        {data.eventType && (
          <div className="node-meta">{data.eventType}</div>
        )}
        {data?.description && (
          <div className="node-description">{data?.description}</div>
        )}
      </div>
    </div>
  );
};

export default EndEventNode;
