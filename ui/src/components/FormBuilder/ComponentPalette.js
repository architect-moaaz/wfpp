import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Search, ChevronLeft } from 'lucide-react';
import { getComponentsByCategory, COMPONENT_CATEGORIES } from './componentDefinitions';
import './ComponentPalette.css';

const ComponentPalette = ({ onDropComponent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({
    [COMPONENT_CATEGORIES.CORE]: true,
    [COMPONENT_CATEGORIES.LAYOUT]: false,
    [COMPONENT_CATEGORIES.CARDS]: false,
    [COMPONENT_CATEGORIES.ADVANCED]: false
  });

  const componentsByCategory = getComponentsByCategory();

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const filterComponents = (components) => {
    if (!searchTerm) return components;
    return components.filter(comp =>
      comp.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
        onClick={() => setIsCollapsed(!isCollapsed)}
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
            <h3>Form Components</h3>
            <p>Drag to canvas or click to add</p>
            <div className="palette-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search components..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

      <div className="palette-content">
        {Object.entries(componentsByCategory).map(([category, components]) => {
          const filteredComponents = filterComponents(components);
          if (filteredComponents.length === 0 && searchTerm) return null;

          return (
            <div key={category} className="component-category">
              <div className="category-title">{category.toUpperCase()}</div>

              <div className="category-components">
                {filteredComponents.map(component => {
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
                        <IconComponent size={16} />
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

          <div className="palette-footer">
            <div className="component-stats">
              <strong>64</strong> Components Available
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ComponentPalette;
