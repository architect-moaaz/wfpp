import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Save, Eye, Grid, Type, Image, Square, Circle,
  List, Table, FormInput, CheckSquare, Calendar, Clock,
  Mail, Phone, MapPin, User, Star, Heart, Settings, Plus, Trash2
} from 'lucide-react';
import './PageDesigner.css';

const PageDesigner = ({ pageId, onBack }) => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [components, setComponents] = useState([]);
  const [draggedComponent, setDraggedComponent] = useState(null);

  // Component library
  const componentPalette = [
    {
      category: 'Layout',
      items: [
        { type: 'container', icon: Square, label: 'Container', config: { padding: '20px', backgroundColor: '#f9fafb' } },
        { type: 'grid', icon: Grid, label: 'Grid', config: { columns: 2, gap: '16px' } },
        { type: 'section', icon: Square, label: 'Section', config: { title: 'Section Title' } }
      ]
    },
    {
      category: 'Forms',
      items: [
        { type: 'textInput', icon: FormInput, label: 'Text Input', config: { label: 'Field Label', placeholder: 'Enter text...' } },
        { type: 'textarea', icon: Type, label: 'Text Area', config: { label: 'Description', rows: 4 } },
        { type: 'select', icon: List, label: 'Dropdown', config: { label: 'Select Option', options: ['Option 1', 'Option 2'] } },
        { type: 'checkbox', icon: CheckSquare, label: 'Checkbox', config: { label: 'Accept terms' } },
        { type: 'datePicker', icon: Calendar, label: 'Date Picker', config: { label: 'Select Date' } }
      ]
    },
    {
      category: 'Content',
      items: [
        { type: 'heading', icon: Type, label: 'Heading', config: { text: 'Heading Text', level: 'h2' } },
        { type: 'text', icon: Type, label: 'Text', config: { text: 'Your text here...' } },
        { type: 'image', icon: Image, label: 'Image', config: { src: '', alt: 'Image' } },
        { type: 'button', icon: Circle, label: 'Button', config: { text: 'Click Me', variant: 'primary' } }
      ]
    },
    {
      category: 'Data Display',
      items: [
        { type: 'table', icon: Table, label: 'Table', config: { columns: ['Column 1', 'Column 2'], rows: [] } },
        { type: 'list', icon: List, label: 'List', config: { items: ['Item 1', 'Item 2', 'Item 3'] } },
        { type: 'card', icon: Square, label: 'Card', config: { title: 'Card Title', content: 'Card content' } }
      ]
    },
    {
      category: 'Icons & Widgets',
      items: [
        { type: 'icon', icon: Star, label: 'Icon', config: { iconType: 'star' } },
        { type: 'avatar', icon: User, label: 'Avatar', config: { name: 'User Name' } },
        { type: 'badge', icon: Circle, label: 'Badge', config: { text: 'New', color: 'blue' } }
      ]
    }
  ];

  useEffect(() => {
    if (pageId) {
      fetchPage();
    }
  }, [pageId]);

  const fetchPage = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/pages/${pageId}`);
      const data = await response.json();

      if (data.success) {
        setPage(data.page);
        // Extract components from sections
        const allComponents = [];
        if (data.page.sections) {
          data.page.sections.forEach((section, sectionIndex) => {
            if (section.components) {
              section.components.forEach((comp, compIndex) => {
                allComponents.push({
                  id: `comp-${sectionIndex}-${compIndex}`,
                  ...comp
                });
              });
            }
          });
        }
        setComponents(allComponents);
      }
    } catch (error) {
      console.error('Failed to fetch page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (component) => {
    setDraggedComponent(component);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedComponent) {
      const newComponent = {
        id: `comp-${Date.now()}`,
        type: draggedComponent.type,
        config: { ...draggedComponent.config }
      };
      setComponents([...components, newComponent]);
      setDraggedComponent(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleComponentClick = (component) => {
    setSelectedComponent(component);
  };

  const handleDeleteComponent = (componentId) => {
    setComponents(components.filter(c => c.id !== componentId));
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(null);
    }
  };

  const handleUpdateComponent = (componentId, newConfig) => {
    setComponents(components.map(c =>
      c.id === componentId ? { ...c, config: { ...c.config, ...newConfig } } : c
    ));
    if (selectedComponent?.id === componentId) {
      setSelectedComponent({ ...selectedComponent, config: { ...selectedComponent.config, ...newConfig } });
    }
  };

  const handleSave = async () => {
    if (!page) return;

    // Convert components back to page structure
    const updatedPage = {
      ...page,
      sections: [
        {
          id: 'main',
          type: 'main',
          components: components.map(c => ({
            type: c.type,
            config: c.config
          }))
        }
      ]
    };

    try {
      const response = await fetch('http://localhost:5000/api/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPage)
      });

      const data = await response.json();
      if (data.success) {
        alert('Page saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save page:', error);
      alert('Failed to save page');
    }
  };

  const renderComponent = (component) => {
    const Icon = component.icon || Square;

    switch (component.type) {
      case 'heading':
        return <div className="component-heading" style={{ fontSize: component.config.level === 'h1' ? '32px' : '24px' }}>{component.config.text}</div>;
      case 'text':
        return <div className="component-text">{component.config.text}</div>;
      case 'textInput':
        return (
          <div className="component-input">
            <label>{component.config.label}</label>
            <input type="text" placeholder={component.config.placeholder} />
          </div>
        );
      case 'button':
        return <button className={`component-button ${component.config.variant}`}>{component.config.text}</button>;
      case 'container':
        return <div className="component-container" style={{ padding: component.config.padding, backgroundColor: component.config.backgroundColor }}>Container</div>;
      default:
        return <div className="component-placeholder"><Icon size={24} /><span>{component.config.label || component.type}</span></div>;
    }
  };

  if (loading) {
    return <div className="page-designer-loading">Loading page designer...</div>;
  }

  if (!page) {
    return <div className="page-designer-error">Page not found</div>;
  }

  return (
    <div className="page-designer">
      {/* Header */}
      <div className="page-designer-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Pages
        </button>
        <div className="page-info">
          <h2>{page.name}</h2>
          <span className="page-route">{page.route}</span>
        </div>
        <div className="header-actions">
          <button className="btn-secondary">
            <Eye size={18} />
            Preview
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={18} />
            Save
          </button>
        </div>
      </div>

      <div className="page-designer-body">
        {/* Component Palette */}
        <div className="component-palette">
          <div className="palette-header">
            <h3>Components</h3>
          </div>
          <div className="palette-content">
            {componentPalette.map((category) => (
              <div key={category.category} className="palette-category">
                <div className="category-title">{category.category}</div>
                <div className="category-items">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.type}
                        className="palette-item"
                        draggable
                        onDragStart={() => handleDragStart(item)}
                      >
                        <Icon size={20} />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div
          className="page-canvas"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="canvas-header">
            <h4>Canvas</h4>
            <span className="component-count">{components.length} components</span>
          </div>
          <div className="canvas-content">
            {components.length === 0 ? (
              <div className="canvas-empty">
                <Grid size={48} style={{ opacity: 0.3 }} />
                <p>Drag components from the left panel to start designing</p>
              </div>
            ) : (
              <div className="canvas-components">
                {components.map((component) => (
                  <div
                    key={component.id}
                    className={`canvas-component ${selectedComponent?.id === component.id ? 'selected' : ''}`}
                    onClick={() => handleComponentClick(component)}
                  >
                    {renderComponent(component)}
                    {selectedComponent?.id === component.id && (
                      <button
                        className="component-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteComponent(component.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="properties-panel">
          <div className="panel-header">
            <Settings size={18} />
            <h3>Properties</h3>
          </div>
          <div className="panel-content">
            {selectedComponent ? (
              <div className="component-properties">
                <div className="property-group">
                  <label>Component Type</label>
                  <div className="property-value">{selectedComponent.type}</div>
                </div>

                {Object.entries(selectedComponent.config || {}).map(([key, value]) => (
                  <div key={key} className="property-group">
                    <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                    {typeof value === 'string' ? (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleUpdateComponent(selectedComponent.id, { [key]: e.target.value })}
                        className="property-input"
                      />
                    ) : typeof value === 'number' ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleUpdateComponent(selectedComponent.id, { [key]: parseInt(e.target.value) })}
                        className="property-input"
                      />
                    ) : (
                      <div className="property-value">{JSON.stringify(value)}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-selection">
                <p>Select a component to edit its properties</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageDesigner;
