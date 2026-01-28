import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';

const OrgChartNode = memo(({ data, selected }) => {
  const [showActions, setShowActions] = useState(false);
  const {
    title,
    user_name,
    user_email,
    user_avatar,
    department_name,
    department_color,
    is_vacant,
    onEdit,
    onAddReport,
    onDelete
  } = data;

  // Generate initials for avatar placeholder
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate a consistent color based on name
  const getAvatarColor = (name) => {
    const colors = [
      '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
      '#10b981', '#06b6d4', '#6366f1', '#ef4444'
    ];
    if (!name) return colors[0];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const displayName = user_name || 'Vacant Position';
  const displayTitle = title || 'No Title';

  return (
    <div
      className={`org-node ${selected ? 'selected' : ''} ${is_vacant ? 'vacant' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Handle type="target" position={Position.Top} className="org-handle org-handle-top" />

      <div className="org-node-content">
        {/* Avatar */}
        <div className="org-node-avatar">
          {user_avatar ? (
            <img src={user_avatar} alt={displayName} />
          ) : (
            <div
              className="org-node-avatar-placeholder"
              style={{ backgroundColor: is_vacant ? '#94a3b8' : getAvatarColor(displayName) }}
            >
              {is_vacant ? '?' : getInitials(displayName)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="org-node-info">
          <div className="org-node-name">{displayName}</div>
          <div className="org-node-title">{displayTitle}</div>
          {department_name && (
            <div className="org-node-dept" style={{ color: department_color || '#64748b' }}>
              {department_name}
            </div>
          )}
        </div>
      </div>

      {/* Hover Actions */}
      <div className={`org-node-actions ${showActions ? 'visible' : ''}`}>
        <button
          className="org-action-btn org-action-add"
          onClick={(e) => {
            e.stopPropagation();
            onAddReport?.();
          }}
          title="Add subordinate"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button
          className="org-action-btn org-action-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          title="Edit position"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button
          className="org-action-btn org-action-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          title="Remove position"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} className="org-handle org-handle-bottom" />
    </div>
  );
});

OrgChartNode.displayName = 'OrgChartNode';

export default OrgChartNode;
