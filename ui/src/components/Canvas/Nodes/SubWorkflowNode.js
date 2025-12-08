import React from 'react';
import { Handle, Position } from 'reactflow';
import { Boxes, X, Clock, ArrowRight } from 'lucide-react';
import './NodeStyles.css';
import { useWorkflow } from '../../../context/WorkflowContext';

const SubWorkflowNode = ({ id, data = {}, selected }) => {
  const { deleteNode, currentApplication } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  // Get available workflows from current application
  const availableWorkflows = currentApplication?.resources?.workflows || [];
  // Support both targetWorkflow (name) and targetWorkflowId (id)
  const targetWorkflowObj = availableWorkflows.find(
    wf => wf.name === data?.targetWorkflow || wf.id === data?.targetWorkflowId
  );

  // Check for async mode (supports both async and waitForCompletion)
  const isAsync = data?.async === true || data?.waitForCompletion === false;

  // Count mappings (supports both string and object format)
  const inputMappingCount = typeof data?.inputMapping === 'string'
    ? (data.inputMapping.trim() ? data.inputMapping.split('\n').filter(l => l.trim()).length : 0)
    : (data?.inputMapping ? Object.keys(data.inputMapping).length : 0);
  const outputMappingCount = typeof data?.outputMapping === 'string'
    ? (data.outputMapping.trim() ? data.outputMapping.split('\n').filter(l => l.trim()).length : 0)
    : (data?.outputMapping ? Object.keys(data.outputMapping).length : 0);

  return (
    <div className={`custom-node sub-workflow-node ${selected ? 'selected' : ''}`}>
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <Handle
        type="target"
        position={Position.Top}
        className="node-handle"
      />

      <div className="node-icon sub-workflow-icon">
        <Boxes size={24} />
      </div>

      <div className="node-content">
        <div className="node-label">{data?.label || 'Sub Workflow'}</div>
        {(targetWorkflowObj || data?.targetWorkflow) && (
          <div className="node-meta">
            <ArrowRight size={12} style={{ marginRight: 4, display: 'inline' }} />
            {targetWorkflowObj?.name || data?.targetWorkflow}
          </div>
        )}
        {isAsync && (
          <div className="node-tag async-tag">
            <Clock size={10} style={{ marginRight: 3 }} />
            <span className="tag-label">Async</span>
          </div>
        )}
        {data?.description && (
          <div className="node-description">{data?.description}</div>
        )}
        {inputMappingCount > 0 && (
          <div className="node-tag input-tag">
            <span className="tag-label">Inputs:</span>
            <span>{inputMappingCount}</span>
          </div>
        )}
        {outputMappingCount > 0 && (
          <div className="node-tag output-tag">
            <span className="tag-label">Outputs:</span>
            <span>{outputMappingCount}</span>
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

export default SubWorkflowNode;
