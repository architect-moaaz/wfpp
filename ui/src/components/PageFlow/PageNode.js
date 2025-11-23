import React from 'react';
import { Handle, Position } from 'reactflow';
import { Layout, Home, FileText, Grid, Lock, CheckCircle, LayoutDashboard } from 'lucide-react';

const PageNode = ({ data, selected }) => {
  const getPageIcon = (type) => {
    switch (type) {
      case 'list':
        return Grid;
      case 'detail':
        return FileText;
      case 'form':
        return Layout;
      case 'dashboard':
        return LayoutDashboard;
      case 'auth':
        return Lock;
      case 'confirmation':
        return CheckCircle;
      default:
        return Layout;
    }
  };

  const getPageColor = (type) => {
    const colors = {
      list: '#3b82f6',
      detail: '#10b981',
      form: '#f59e0b',
      dashboard: '#8b5cf6',
      auth: '#ef4444',
      confirmation: '#06b6d4'
    };
    return colors[type] || '#6b7280';
  };

  const Icon = getPageIcon(data.type);
  const color = getPageColor(data.type);

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        background: '#ffffff',
        border: selected ? `2px solid ${color}` : '2px solid #e5e7eb',
        minWidth: '200px',
        boxShadow: selected ? `0 4px 12px ${color}20` : '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s'
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: color,
          width: '10px',
          height: '10px',
          border: '2px solid #fff'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
            {data.label}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            {data.type}
          </div>
        </div>
      </div>

      {data.route && (
        <div
          style={{
            fontSize: '11px',
            color: '#6b7280',
            fontFamily: 'monospace',
            background: '#f9fafb',
            padding: '4px 8px',
            borderRadius: '4px',
            marginTop: '8px'
          }}
        >
          {data.route}
        </div>
      )}

      {data.platform && (
        <div
          style={{
            fontSize: '10px',
            color: '#6b7280',
            marginTop: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {data.platform}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: color,
          width: '10px',
          height: '10px',
          border: '2px solid #fff'
        }}
      />
    </div>
  );
};

export default PageNode;
