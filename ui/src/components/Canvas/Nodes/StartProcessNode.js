import React from 'react';
import { Handle, Position } from 'reactflow';
import './NodeStyles.css';
import { PlayCircle, X } from 'lucide-react';
import { useWorkflow } from '../../../context/WorkflowContext';

const StartProcessNode = ({ id, data = {}, selected }) => {
  const { deleteNode } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  return (
    <div className={`custom-node start-node ${selected ? 'selected' : ''}`}>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <div className="node-icon start-icon">
        <PlayCircle size={24} />
      </div>
      <div className="node-content">
        <div className="node-label">{data?.label || 'Start Process'}</div>
        {data?.trigger && <div className="node-meta">Trigger: {data?.trigger}</div>}
        {data?.description && <div className="node-description">{data?.description}</div>}
        {data?.formName && (
          <div className="node-tag">
            <span className="tag-label">Form:</span> {data?.formName}
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
    </div>
  );
};

export default StartProcessNode;
