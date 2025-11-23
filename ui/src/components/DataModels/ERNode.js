import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Database, MoreVertical } from 'lucide-react';
import './ERNode.css';

// Color mapping for different table types
const getTableColor = (modelName) => {
  const name = modelName.toLowerCase();
  if (name.includes('user')) return '#3B82F6'; // Blue
  if (name.includes('order')) return '#22C55E'; // Green
  if (name.includes('product')) return '#A855F7'; // Purple
  if (name.includes('category')) return '#F97316'; // Orange
  if (name.includes('payment')) return '#EF4444'; // Red
  if (name.includes('customer')) return '#06B6D4'; // Cyan
  // Default colors cycle
  const colors = ['#3B82F6', '#22C55E', '#A855F7', '#F97316', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899'];
  return colors[modelName.length % colors.length];
};

const ERNode = ({ data }) => {
  const { model, onEditModel } = data;
  const [showMenu, setShowMenu] = useState(false);
  const tableColor = getTableColor(model.name);

  return (
    <div className="er-node-custom">
      {/* Header */}
      <div className="er-node-header">
        <div className="er-node-icon" style={{ backgroundColor: tableColor }}>
          <Database size={14} />
        </div>
        <span className="er-node-title">{model.displayName || model.name}</span>
        <button
          className="er-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <MoreVertical size={16} />
        </button>
        {showMenu && (
          <div className="er-menu-dropdown">
            <div
              className="er-menu-item"
              onClick={(e) => {
                e.stopPropagation();
                if (onEditModel) onEditModel(model);
                setShowMenu(false);
              }}
            >
              Edit Model
            </div>
          </div>
        )}
      </div>

      {/* Fields with connection handles */}
      <div className="er-node-body">
        {model.fields && model.fields.map((field, idx) => {
          const isPrimaryKey = field.primaryKey || field.name === 'id';
          const isForeignKey = field.foreignKey || field.name.endsWith('_id');

          return (
            <div key={idx} className="er-field-row">
              {/* Left handle for incoming connections */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${model.id}-${field.name}-left`}
                style={{
                  left: -5,
                  top: '50%',
                  width: 10,
                  height: 10,
                  background: '#d1d5db',
                  border: '2px solid #ffffff',
                  borderRadius: '50%',
                }}
                className="er-handle"
              />

              <div className="er-field">
                <span className="field-name">
                  {isPrimaryKey && <span className="key-icon">🔑</span>}
                  {isForeignKey && !isPrimaryKey && <span className="link-icon">🔗</span>}
                  {field.name}
                </span>
                <span className="field-type">{field.type}</span>
              </div>

              {/* Right handle for outgoing connections */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${model.id}-${field.name}-right`}
                style={{
                  right: -5,
                  top: '50%',
                  width: 10,
                  height: 10,
                  background: '#d1d5db',
                  border: '2px solid #ffffff',
                  borderRadius: '50%',
                }}
                className="er-handle"
              />
            </div>
          );
        })}
      </div>

      {/* Additional handles at top and bottom for flexible connections */}
      <Handle
        type="target"
        position={Position.Top}
        id={`${model.id}-top`}
        style={{ top: -5, left: '50%', width: 10, height: 10, background: '#d1d5db', border: '2px solid #ffffff' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${model.id}-bottom`}
        style={{ bottom: -5, left: '50%', width: 10, height: 10, background: '#d1d5db', border: '2px solid #ffffff' }}
      />
    </div>
  );
};

export default ERNode;
