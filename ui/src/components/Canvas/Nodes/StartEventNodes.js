import React from 'react';
import { Handle, Position } from 'reactflow';
import './NodeStyles.css';
import { Calendar, Webhook, Radio, AlertCircle, X } from 'lucide-react';
import { useWorkflow } from '../../../context/WorkflowContext';

// Base component for all start event nodes
const BaseStartEventNode = ({ id, data = {}, selected, icon: Icon, className, defaultLabel, children }) => {
  const { deleteNode } = useWorkflow();

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNode(id);
  };

  return (
    <div className={`custom-node start-node ${className} ${selected ? 'selected' : ''}`}>
      <Handle type="source" position={Position.Bottom} className="node-handle" />
      <button className="node-delete-btn nopan nodrag" onClick={handleDelete} title="Delete node">
        <X size={14} />
      </button>
      <div className={`node-icon ${className}-icon`}>
        <Icon size={24} />
      </div>
      <div className="node-content">
        <div className="node-label">{data?.label || defaultLabel}</div>
        {data?.description && <div className="node-description">{data?.description}</div>}
        {children}
      </div>
    </div>
  );
};

// Timer Start Event - triggers on schedule
export const TimerStartEventNode = ({ id, data = {}, selected }) => {
  return (
    <BaseStartEventNode
      id={id}
      data={data}
      selected={selected}
      icon={Calendar}
      className="timer-start"
      defaultLabel="Timer Start"
    >
      {data?.schedule && (
        <div className="node-tag">
          <span className="tag-label">Schedule:</span> {data?.schedule}
        </div>
      )}
      {data?.timezone && (
        <div className="node-meta">Timezone: {data?.timezone}</div>
      )}
    </BaseStartEventNode>
  );
};

// Message Start Event - triggers on webhook/message
export const MessageStartEventNode = ({ id, data = {}, selected }) => {
  return (
    <BaseStartEventNode
      id={id}
      data={data}
      selected={selected}
      icon={Webhook}
      className="message-start"
      defaultLabel="Message Start"
    >
      {data?.channel && (
        <div className="node-tag">
          <span className="tag-label">Channel:</span> {data?.channel}
        </div>
      )}
      {data?.webhookPath && (
        <div className="node-tag">
          <span className="tag-label">Webhook:</span> {data?.webhookPath}
        </div>
      )}
      {data?.messageType && (
        <div className="node-meta">Type: {data?.messageType}</div>
      )}
    </BaseStartEventNode>
  );
};

// Signal Start Event - triggers on broadcast signal
export const SignalStartEventNode = ({ id, data = {}, selected }) => {
  return (
    <BaseStartEventNode
      id={id}
      data={data}
      selected={selected}
      icon={Radio}
      className="signal-start"
      defaultLabel="Signal Start"
    >
      {data?.signalName && (
        <div className="node-tag">
          <span className="tag-label">Signal:</span> {data?.signalName}
        </div>
      )}
      {data?.signalScope && (
        <div className="node-meta">Scope: {data?.signalScope}</div>
      )}
    </BaseStartEventNode>
  );
};

// Conditional Start Event - triggers when condition is met
export const ConditionalStartEventNode = ({ id, data = {}, selected }) => {
  return (
    <BaseStartEventNode
      id={id}
      data={data}
      selected={selected}
      icon={AlertCircle}
      className="conditional-start"
      defaultLabel="Conditional Start"
    >
      {data?.condition && (
        <div className="node-tag">
          <span className="tag-label">Condition:</span> {data?.condition}
        </div>
      )}
      {data?.dataSource && (
        <div className="node-tag">
          <span className="tag-label">Source:</span> {data?.dataSource}
        </div>
      )}
      {data?.pollInterval && (
        <div className="node-meta">Poll: {data?.pollInterval}</div>
      )}
    </BaseStartEventNode>
  );
};
