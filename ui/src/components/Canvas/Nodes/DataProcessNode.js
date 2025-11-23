import React from 'react';
import { Handle, Position } from 'reactflow';
import './NodeStyles.css';
import { Database, X } from 'lucide-react';
import { useWorkflow } from '../../../context/WorkflowContext';

const DataProcessNode = ({ id, data = {}, selected }) => {
  const { deleteNode } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  return (
    <div className={`custom-node dataprocess-node ${selected ? 'selected' : ''}`}>
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <Handle type="target" position={Position.Top} className="node-handle" />
      <div className="node-icon dataprocess-icon">
        <Database size={24} />
      </div>
      <div className="node-content">
        <div className="node-label">{data?.label || 'Data Process'}</div>
        {data?.dataModelAction && (
          <div className="node-meta">{data?.dataModelAction}</div>
        )}
        {data?.description && <div className="node-description">{data?.description}</div>}
        {data?.dataModel && (
          <div className="node-tag data-model-tag">
            <span className="tag-label">Data:</span> {data?.dataModel}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
    </div>
  );
};

export default DataProcessNode;
