import React, { useState, useCallback, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Save, Eye, Code, Settings, Trash2, Copy, ArrowLeft } from 'lucide-react';
import ComponentPalette from './ComponentPalette';
import PropertiesPanel from './PropertiesPanel';
import FormComponentRenderer from './FormComponentRenderer';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './FormBuilder.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const FormBuilder = ({ formId, initialForm, onSave, onClose }) => {
  const [formName, setFormName] = useState(initialForm?.name || initialForm?.title || 'New Form');
  const [formDescription, setFormDescription] = useState(initialForm?.description || '');

  // Handle both 'components' (FormBuilder format) and 'fields' (backend format)
  // Convert backend fields to FormBuilder components if needed
  const convertFieldsToComponents = (fields) => {
    if (!fields || fields.length === 0) return [];

    return fields.map((field, index) => {
      // Generate ID if not present
      const fieldId = field.id || `field_${index}_${Date.now()}`;
      const fieldName = field.fieldName || field.name || field.label || `field_${index}`;

      return {
        id: fieldId,
        type: field.type,
        fieldName: fieldName,
        processVariable: field.processVariable || fieldName || `var_${fieldId}`,
        required: field.required || false,
        properties: {
          label: field.label,
          placeholder: field.placeholder,
          description: field.description,
          tooltip: field.tooltip,
          readonly: field.readonly,
          options: field.options, // For dropdown, radio, etc.
          ...field.properties,
          ...field.validation
        }
      };
    });
  };

  const initialComponents = initialForm?.components || convertFieldsToComponents(initialForm?.fields) || [];

  // Generate layout for components if not provided
  const generateLayoutForComponents = (components) => {
    return components.map((comp, index) => ({
      i: comp.id,
      x: 0,
      y: index * 4, // Stack vertically with more spacing
      w: 24, // Full width
      h: 4, // Increased height for better display
      minW: 4, // Reduced to work with all breakpoints
      minH: 2
    }));
  };

  // Handle layout - ensure it's always an array
  let initialLayout;
  if (initialForm?.layout) {
    // If layout is an object with breakpoints (e.g., {lg: [...], md: [...]})
    if (typeof initialForm.layout === 'object' && !Array.isArray(initialForm.layout)) {
      initialLayout = initialForm.layout.lg || initialForm.layout.md || [];
    } else if (Array.isArray(initialForm.layout)) {
      initialLayout = initialForm.layout;
    } else {
      initialLayout = generateLayoutForComponents(initialComponents);
    }
  } else {
    initialLayout = generateLayoutForComponents(initialComponents);
  }

  // Debug logging
  if (initialForm) {
    console.log('[FormBuilder] Loading form:', {
      formId,
      formName: initialForm.name || initialForm.title,
      hasComponents: !!initialForm.components,
      hasFields: !!initialForm.fields,
      fieldsArray: initialForm.fields,
      componentCount: initialComponents.length,
      layoutCount: initialLayout.length,
      layoutType: typeof initialLayout,
      isArray: Array.isArray(initialLayout),
      components: initialComponents
    });
  }

  const [components, setComponents] = useState(initialComponents);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [layout, setLayout] = useState(initialLayout);
  const [previewMode, setPreviewMode] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const layoutRef = useRef(null);

  // Generate unique ID for components
  const generateId = () => `component_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle dropping component from palette
  const handleDropComponent = useCallback((componentType) => {
    const id = generateId();
    const newComponent = {
      id,
      type: componentType.type,
      fieldName: componentType.defaultName || componentType.label,
      processVariable: `var_${id}`,
      required: false,
      properties: {
        ...componentType.defaultProperties
      }
    };

    // Add to components
    setComponents(prev => [...prev, newComponent]);

    // Add to layout
    const newLayoutItem = {
      i: id,
      x: 0,
      y: Infinity, // Place at bottom
      w: componentType.defaultWidth || 24,
      h: componentType.defaultHeight || 4,
      minW: 6,
      minH: 2
    };
    setLayout(prev => [...prev, newLayoutItem]);

    // Select the new component
    setSelectedComponent(newComponent);
  }, []);

  // Handle drag over canvas
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle drop on canvas
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    try {
      const componentData = e.dataTransfer.getData('component');
      if (componentData) {
        const componentType = JSON.parse(componentData);
        handleDropComponent(componentType);
      }
    } catch (error) {
      console.error('Failed to drop component:', error);
    }
  }, [handleDropComponent]);

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout);
  }, []);

  // Handle component selection
  const handleSelectComponent = useCallback((id) => {
    const component = components.find(c => c.id === id);
    setSelectedComponent(component);
  }, [components]);

  // Handle property update
  const handleUpdateProperties = useCallback((updatedComponent) => {
    setComponents(prev => prev.map(c =>
      c.id === updatedComponent.id ? updatedComponent : c
    ));
    setSelectedComponent(updatedComponent);
  }, []);

  // Handle component delete
  const handleDeleteComponent = useCallback((id) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    setLayout(prev => prev.filter(l => l.i !== id));
    if (selectedComponent?.id === id) {
      setSelectedComponent(null);
    }
  }, [selectedComponent]);

  // Handle component duplicate
  const handleDuplicateComponent = useCallback((id) => {
    const component = components.find(c => c.id === id);
    if (!component) return;

    const newId = generateId();
    const duplicatedComponent = {
      ...component,
      id: newId,
      fieldName: `${component.fieldName} (Copy)`,
      processVariable: `var_${newId}`
    };

    // Safety check: ensure layout is an array
    const layoutArray = Array.isArray(layout) ? layout : [];
    const layoutItem = layoutArray.find(l => l.i === id);
    const newLayoutItem = layoutItem ? {
      ...layoutItem,
      i: newId,
      x: (layoutItem.x + layoutItem.w) % 24,
      y: layoutItem.y
    } : {
      i: newId,
      x: 0,
      y: Infinity,
      w: 24,
      h: 3,
      minW: 2,
      minH: 1
    };

    setComponents(prev => [...prev, duplicatedComponent]);
    setLayout(prev => [...prev, newLayoutItem]);
  }, [components, layout]);

  // Save form
  const handleSave = async () => {
    const formData = {
      id: formId || generateId(),
      name: formName,
      description: formDescription,
      components,
      layout,
      version: '1.0',
      updatedAt: new Date().toISOString()
    };

    try {
      const response = await fetch('http://localhost:5000/api/form-builder/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        alert('Form saved successfully!');
        if (onSave) onSave(data.form);
      }
    } catch (error) {
      console.error('Failed to save form:', error);
      alert('Failed to save form');
    }
  };

  // Generate form JSON
  const getFormJSON = () => {
    return JSON.stringify({
      name: formName,
      description: formDescription,
      components,
      layout
    }, null, 2);
  };

  return (
    <div className="form-builder">
      {/* Header */}
      <div className="form-builder-header">
        <div className="header-left">
          {onClose && (
            <button className="action-btn" onClick={onClose} title="Back to Forms">
              <ArrowLeft size={18} />
            </button>
          )}
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="form-name-input"
            placeholder="Form Name"
          />
          <input
            type="text"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            className="form-description-input"
            placeholder="Form Description"
          />
        </div>
        <div className="header-actions">
          <button
            className={`action-btn ${previewMode ? 'active' : ''}`}
            onClick={() => setPreviewMode(!previewMode)}
            title="Preview"
          >
            <Eye size={18} />
            Preview
          </button>
          <button
            className={`action-btn ${showCode ? 'active' : ''}`}
            onClick={() => setShowCode(!showCode)}
            title="View JSON"
          >
            <Code size={18} />
            JSON
          </button>
          <button className="action-btn primary" onClick={handleSave} title="Save">
            <Save size={18} />
            Save
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="form-builder-content">
        {/* Component Palette */}
        {!previewMode && (
          <ComponentPalette onDropComponent={handleDropComponent} />
        )}

        {/* Canvas */}
        <div className="form-canvas">
          {showCode ? (
            <pre className="form-json-view">{getFormJSON()}</pre>
          ) : (
            <div
              className="canvas-container"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {components.length === 0 ? (
                <div className="canvas-empty">
                  <Settings size={64} style={{ opacity: 0.3 }} />
                  <h3>Start Building Your Form</h3>
                  <p>Drag components from the left palette to begin</p>
                </div>
              ) : (
                <ResponsiveGridLayout
                  ref={layoutRef}
                  className="form-grid-layout"
                  layouts={{ lg: layout }}
                  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 600 }}
                  cols={{ lg: 24, md: 20, sm: 12, xs: 8 }}
                  rowHeight={35}
                  onLayoutChange={handleLayoutChange}
                  isDraggable={!previewMode}
                  isResizable={!previewMode}
                  compactType="vertical"
                  preventCollision={false}
                >
                  {components.map(component => {
                    // Safety check: ensure layout is an array before calling .find()
                    // Note: layoutItem is currently unused but keeping for potential future use
                    const layoutArray = Array.isArray(layout) ? layout : [];
                    const layoutItem = layoutArray.find(l => l.i === component.id);
                    return (
                      <div
                        key={component.id}
                        className={`form-component-wrapper ${
                          selectedComponent?.id === component.id ? 'selected' : ''
                        }`}
                        onClick={() => handleSelectComponent(component.id)}
                      >
                        {!previewMode && (
                          <div className="component-toolbar">
                            <span className="component-label">{component.fieldName}</span>
                            <div className="component-actions">
                              <button
                                className="icon-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateComponent(component.id);
                                }}
                                title="Duplicate"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                className="icon-btn danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteComponent(component.id);
                                }}
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                        <FormComponentRenderer
                          component={component}
                          previewMode={previewMode}
                        />
                      </div>
                    );
                  })}
                </ResponsiveGridLayout>
              )}
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {!previewMode && selectedComponent && (
          <PropertiesPanel
            component={selectedComponent}
            onUpdate={handleUpdateProperties}
            onClose={() => setSelectedComponent(null)}
          />
        )}
      </div>
    </div>
  );
};

export default FormBuilder;
