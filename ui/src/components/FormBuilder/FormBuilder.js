import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Save, Eye, Code, Settings, Trash2, Copy, ArrowLeft, X, Monitor, Tablet, Smartphone } from 'lucide-react';
import ComponentPalette from './ComponentPalette';
import PropertiesPanel from './PropertiesPanel';
import FormComponentRenderer from './FormComponentRenderer';
import { DesignSystemProvider, generateCSSVariables } from './DesignSystemContext';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './FormBuilder.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const FormBuilder = ({ formId, initialForm, applicationId, onSave, onClose }) => {
  const [formName, setFormName] = useState(initialForm?.name || initialForm?.title || 'New Form');
  const [formDescription, setFormDescription] = useState(initialForm?.description || '');

  // Get design system from form (if provided by DesignExpert) or use default
  const designSystem = initialForm?.designSystem || initialForm?.designAnalysis?.designSystem || null;

  // Generate CSS variables from design system
  const cssVariables = useMemo(() => generateCSSVariables(designSystem), [designSystem]);

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
      y: index * 8, // Stack vertically with more spacing
      w: 24, // Full width
      h: 8, // Increased height for proper field display
      minW: 6, // Minimum width
      minH: 6  // Minimum height for comfortable display
    }));
  };

  // Handle layout - ensure it's always an array
  // Priority: gridLayout > layout > generate from components
  let initialLayout;
  if (initialForm?.gridLayout && Array.isArray(initialForm.gridLayout)) {
    // Use gridLayout if available (from FormExpert)
    initialLayout = initialForm.gridLayout;
  } else if (initialForm?.layout) {
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

  // Fix layout items to ensure w >= minW and h >= minH (prevents react-grid-layout errors)
  initialLayout = initialLayout.map(item => ({
    ...item,
    w: Math.max(item.w || 24, 6),  // Ensure width is at least minW (6)
    h: Math.max(item.h || 8, 6),   // Ensure height is at least minH (6)
    minW: 6,
    minH: 6
  }));

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
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');
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
      h: componentType.defaultHeight || 8,
      minW: 6,
      minH: 6
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
      h: 8,
      minW: 6,
      minH: 6
    };

    setComponents(prev => [...prev, duplicatedComponent]);
    setLayout(prev => [...prev, newLayoutItem]);
  }, [components, layout]);

  // Save form
  const handleSave = async () => {
    // Convert components to fields format expected by the API
    const fields = components.map(comp => ({
      id: comp.id,
      type: comp.type,
      fieldName: comp.fieldName,
      name: comp.fieldName,
      label: comp.properties?.label || comp.fieldName,
      processVariable: comp.processVariable,
      required: comp.required || false,
      placeholder: comp.properties?.placeholder,
      description: comp.properties?.description,
      tooltip: comp.properties?.tooltip,
      options: comp.properties?.options,
      validation: comp.properties?.validation,
      properties: comp.properties
    }));

    const savedFormId = formId || generateId();
    const formData = {
      id: savedFormId,
      name: formName,
      title: formName,
      description: formDescription,
      fields,
      components, // Keep components for FormBuilder compatibility
      layout,
      gridLayout: layout, // Also save as gridLayout
      applicationId, // Include applicationId so backend can update PostgreSQL
      version: '1.0',
      updatedAt: new Date().toISOString()
    };

    try {
      // Save to forms API (will update both file-based and PostgreSQL if applicationId provided)
      const response = await fetch('http://localhost:5000/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!data.success) {
        console.error('Failed to save form:', data.error);
        alert('Failed to save form: ' + (data.error || 'Unknown error'));
        return;
      }

      console.log('[FormBuilder] Form saved successfully:', savedFormId);
      alert('Form saved successfully!');
      if (onSave) onSave(formData);
    } catch (error) {
      console.error('Failed to save form:', error);
      alert('Failed to save form: ' + error.message);
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
    <DesignSystemProvider designSystem={designSystem}>
      <div className="form-builder" style={cssVariables}>
        {/* Header */}
        <div className="form-builder-header">
        <div className="header-left">
          {onClose && (
            <button className="back-btn" onClick={onClose} title="Back to Forms">
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
            className="action-btn"
            onClick={() => setShowPreview(true)}
            title="Preview Form"
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
        <ComponentPalette onDropComponent={handleDropComponent} />

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
                  rowHeight={20}
                  onLayoutChange={handleLayoutChange}
                  isDraggable={true}
                  isResizable={true}
                  compactType="vertical"
                  preventCollision={false}
                  draggableHandle=".component-drag-handle"
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
                        <div className="component-toolbar" onClick={(e) => {
                            e.stopPropagation();
                            handleSelectComponent(component.id);
                          }}>
                            <div className="component-drag-handle" title="Drag to move">
                              <span className="drag-dots">⋮⋮</span>
                            </div>
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
                        <FormComponentRenderer
                          component={component}
                          previewMode={false}
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
        {selectedComponent && (
          <PropertiesPanel
            component={selectedComponent}
            onUpdate={handleUpdateProperties}
            onClose={() => setSelectedComponent(null)}
          />
        )}
      </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="form-preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="form-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="form-preview-header">
              <h3>Form Preview - {formName || 'Untitled Form'}</h3>
              <div className="form-preview-actions">
                <div className="form-preview-devices">
                  <button
                    className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                    onClick={() => setPreviewDevice('desktop')}
                    title="Desktop"
                  >
                    <Monitor size={18} />
                  </button>
                  <button
                    className={`device-btn ${previewDevice === 'tablet' ? 'active' : ''}`}
                    onClick={() => setPreviewDevice('tablet')}
                    title="Tablet"
                  >
                    <Tablet size={18} />
                  </button>
                  <button
                    className={`device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                    onClick={() => setPreviewDevice('mobile')}
                    title="Mobile"
                  >
                    <Smartphone size={18} />
                  </button>
                </div>
                <button className="form-preview-close" onClick={() => setShowPreview(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="form-preview-content">
              <div
                className={`form-preview-frame form-preview-${previewDevice}`}
                style={{
                  width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px',
                  margin: '0 auto',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: previewDevice !== 'desktop' ? '0 4px 24px rgba(0,0,0,0.15)' : 'none',
                  overflow: 'hidden'
                }}
              >
                <div className="form-preview-form">
                  {formName && (
                    <div className="form-preview-title">
                      <h2>{formName}</h2>
                      {formDescription && <p>{formDescription}</p>}
                    </div>
                  )}
                  <div className="form-preview-fields">
                    {components.length === 0 ? (
                      <div className="form-preview-empty">
                        <p>No fields added to this form yet.</p>
                      </div>
                    ) : (
                      components.map((component) => (
                        <div key={component.id} className="form-preview-field">
                          <FormComponentRenderer
                            component={component}
                            previewMode={true}
                          />
                        </div>
                      ))
                    )}
                  </div>
                  {components.length > 0 && (
                    <div className="form-preview-submit">
                      <button className="form-submit-btn">Submit</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DesignSystemProvider>
  );
};

export default FormBuilder;
