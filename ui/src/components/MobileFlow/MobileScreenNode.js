import React from 'react';
import { Handle, Position } from 'reactflow';
import { Smartphone, Menu, Layers } from 'lucide-react';

const MobileScreenNode = ({ data }) => {
  const { label, type, platform, screenData } = data;

  const getScreenTypeColor = (screenType) => {
    const colors = {
      list: '#3b82f6',
      detail: '#10b981',
      form: '#f59e0b',
      dashboard: '#8b5cf6',
      auth: '#ef4444'
    };
    return colors[screenType] || '#6b7280';
  };

  const getScreenIcon = () => {
    return <Smartphone size={18} />;
  };

  return (
    <div
      className="mobile-screen-node"
      style={{
        borderColor: getScreenTypeColor(type),
        backgroundColor: '#ffffff'
      }}
    >
      <Handle type="target" position={Position.Top} />

      <div className="mobile-screen-node-header" style={{ borderBottomColor: getScreenTypeColor(type) }}>
        <div className="mobile-screen-icon" style={{ color: getScreenTypeColor(type) }}>
          {getScreenIcon()}
        </div>
        <div className="mobile-screen-info">
          <div className="mobile-screen-name">{label}</div>
          <div className="mobile-screen-type">{type || 'screen'}</div>
        </div>
      </div>

      <div className="mobile-screen-node-body">
        {platform && (
          <div className="mobile-screen-badge">
            {platform}
          </div>
        )}

        {screenData?.navigation?.showHeader && (
          <div className="mobile-screen-feature">
            <Menu size={12} />
            <span>Has Header</span>
          </div>
        )}

        {screenData?.components && (
          <div className="mobile-screen-feature">
            <Layers size={12} />
            <span>{screenData.components.length} components</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default MobileScreenNode;
