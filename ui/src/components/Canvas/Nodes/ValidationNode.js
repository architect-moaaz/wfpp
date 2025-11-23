import React from 'react';
import { Handle, Position } from 'reactflow';
import './NodeStyles.css';
import { CheckCircle, X } from 'lucide-react';
import { useWorkflow } from '../../../context/WorkflowContext';

const ValidationNode = ({ id, data = {}, selected }) => {
  const { deleteNode } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  return (
    <div className={`custom-node validation-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="node-handle" />
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <div className="node-icon validation-icon">
        <CheckCircle size={24} />
      </div>
      <div className="node-content">
        <div className="node-label">{data?.label || 'Validation'}</div>
        {data.ruleType && <div className="node-meta">Rule: {data.ruleType}</div>}
        {data?.description && <div className="node-description">{data?.description}</div>}
        {data?.rules && data.rules.length > 0 && (
          <div className="node-rules">
            {data?.rules.slice(0, 2).map((rule, index) => (
              <div key={rule.id || `rule-${index}`} className="rule-badge">
                <span className="rule-badge-label">Rule:</span> {rule.name || rule}
              </div>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
};

export default ValidationNode;
