import React from 'react';
import { Handle, Position } from 'reactflow';
import './NodeStyles.css';
import { GitBranch, X } from 'lucide-react';
import { useWorkflow } from '../../../context/WorkflowContext';

const DecisionNode = ({ id, data = {}, selected }) => {
  const { deleteNode } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  const gatewayType = data.gatewayType || 'exclusive';
  const isExclusive = gatewayType === 'exclusive';

  return (
    <div className={`custom-node decision-node ${selected ? 'selected' : ''}`}>
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <Handle type="target" position={Position.Top} className="node-handle" />

      <div className="node-icon decision-icon">
        <GitBranch size={24} />
      </div>

      <div className="node-content">
        <div className="node-label">{data?.label || 'Decision Gateway'}</div>
        <div className="node-meta">
          {isExclusive ? 'Exclusive (XOR)' : 'Parallel (AND)'}
        </div>
        {data?.description && (
          <div className="node-description">{data?.description}</div>
        )}
        {isExclusive && data.condition && (
          <div className="node-tag">
            <span className="tag-label">Condition:</span> {data.condition}
          </div>
        )}
        {!isExclusive && data.branches && (
          <div className="node-tag">
            <span className="tag-label">Branches:</span> {data.branches}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} id="a" className="node-handle" />
      <Handle type="source" position={Position.Right} id="b" className="node-handle" />
    </div>
  );
};

export default DecisionNode;
