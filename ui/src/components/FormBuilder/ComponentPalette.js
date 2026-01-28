import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getComponentsByCategory, SHADCN_MAPPINGS } from './componentDefinitions';
import './ComponentPalette.css';

const ComponentPalette = ({ onDropComponent, onCollapseChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const componentsByCategory = getComponentsByCategory();

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    if (onCollapseChange) {
      onCollapseChange(newCollapsed);
    }
  };

  const handleDragStart = (e, component) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('component', JSON.stringify(component));
  };

  // Get all components for collapsed view
  const allComponents = Object.values(componentsByCategory).flat();

  return (
    <div className={`component-palette ${isCollapsed ? 'collapsed' : ''}`}>
      <button
        className="palette-toggle"
        onClick={handleToggle}
        title={isCollapsed ? 'Show Components' : 'Hide Components'}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {isCollapsed ? (
        <div className="palette-collapsed-content">
          {allComponents.map(component => {
            const IconComponent = component.icon;
            return (
              <div
                key={component.type}
                className="component-icon-item"
                data-type={component.type}
                draggable
                onDragStart={(e) => handleDragStart(e, component)}
                onClick={() => onDropComponent(component)}
                title={component.label}
              >
                <div className="component-icon-only">
                  <IconComponent size={18} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="palette-header">
            <h3>Components</h3>
            <p>Drag to canvas or click to add</p>
          </div>
          <div className="palette-items">
            {Object.entries(componentsByCategory).map(([category, components]) => {
              if (components.length === 0) return null;

              return (
                <div key={category} className="palette-category">
                  <div className="category-title">{category}</div>
                  {components.map(component => {
                    const IconComponent = component.icon;
                    const shadcnMapping = SHADCN_MAPPINGS[component.type];
                    return (
                      <div
                        key={component.type}
                        className="palette-node"
                        data-type={component.type}
                        draggable
                        onDragStart={(e) => handleDragStart(e, component)}
                        onClick={() => onDropComponent(component)}
                      >
                        <div className="palette-node-icon">
                          <IconComponent size={20} />
                        </div>
                        <div className="palette-node-info">
                          <div className="palette-node-label">
                            {component.label}
                            {shadcnMapping && (
                              <span className="shadcn-badge">
                                {shadcnMapping.component}
                                {shadcnMapping.variants > 1 && (
                                  <span className="variant-count">{shadcnMapping.variants}</span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="palette-node-desc">{component.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ComponentPalette;
