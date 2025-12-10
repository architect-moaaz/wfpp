import React, { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { getComponentsByCategory } from './componentDefinitions';
import './ComponentPalette.css';

const ComponentPalette = ({ onDropComponent }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const componentsByCategory = getComponentsByCategory();

  const handleDragStart = (e, component) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('component', JSON.stringify(component));
  };

  // Get all components for collapsed view
  const allComponents = Object.values(componentsByCategory).flat();

  return (
    <div className={`component-palette ${isCollapsed ? 'collapsed' : ''}`}>
      {isCollapsed ? (
        <div className="palette-collapsed-content">
          <button
            className="palette-toggle-collapsed"
            onClick={() => setIsCollapsed(false)}
            title="Show Components"
          >
            <ChevronRight size={16} />
          </button>
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
                  <IconComponent size={20} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="palette-header">
            <div className="palette-header-content">
              <h3>Components</h3>
              <p>Drag to canvas or use AI</p>
            </div>
            <button
              className="palette-toggle"
              onClick={() => setIsCollapsed(true)}
              title="Hide Components"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="palette-content">
            {Object.entries(componentsByCategory).map(([category, components]) => {
              if (components.length === 0) return null;

              return (
                <div key={category} className="component-category">
                  <div className="category-title">{category.toUpperCase()}</div>

                  <div className="category-components">
                    {components.map(component => {
                      const IconComponent = component.icon;
                      return (
                        <div
                          key={component.type}
                          className="component-card"
                          data-type={component.type}
                          draggable
                          onDragStart={(e) => handleDragStart(e, component)}
                          onClick={() => onDropComponent(component)}
                        >
                          <div className="component-icon">
                            <IconComponent size={20} />
                          </div>
                          <div className="component-info">
                            <div className="component-name">{component.label}</div>
                            <div className="component-desc">{component.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
