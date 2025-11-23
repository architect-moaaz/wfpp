import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Eye, Grid, Type, Image, Square, Circle,
  List, Table, FormInput, CheckSquare, Calendar, Clock,
  Mail, Phone, MapPin, User, Star, Heart, Settings, Plus, Trash2,
  Copy, Undo, Redo, Layers, Move, Monitor, Smartphone, Tablet,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  ChevronDown, ChevronUp, Menu, Code, X
} from 'lucide-react';
import './PageDesigner.css';

const PageDesignerEnhanced = ({ pageId, onBack }) => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [components, setComponents] = useState([]);
  const [draggedComponent, setDraggedComponent] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [previewMode, setPreviewMode] = useState(false);
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop, tablet, mobile
  const [showLayers, setShowLayers] = useState(true);
  const [clipboard, setClipboard] = useState(null);
  const [showCSSEditor, setShowCSSEditor] = useState(false);
  const [customCSS, setCustomCSS] = useState('');
  const [cssError, setCSSError] = useState(null);
  const [cssEditorMode, setCSSEditorMode] = useState('visual'); // 'visual' or 'code'
  const [visualCSS, setVisualCSS] = useState({
    typography: {
      fontFamily: 'inherit',
      fontSize: '14px',
      fontWeight: '400',
      color: '#111827',
      lineHeight: '1.6',
      textAlign: 'left'
    },
    spacing: {
      padding: '16px',
      margin: '0px',
      gap: '16px'
    },
    background: {
      backgroundColor: '#ffffff',
      backgroundImage: '',
      opacity: '1'
    },
    borders: {
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#e5e7eb',
      borderRadius: '8px'
    },
    layout: {
      display: 'block',
      width: 'auto',
      height: 'auto',
      maxWidth: '100%'
    },
    effects: {
      boxShadow: 'none',
      transform: 'none',
      transition: 'all 0.3s ease'
    }
  });
  const canvasRef = useRef(null);

  // Enhanced component library
  const componentPalette = [
    {
      category: 'Layout',
      items: [
        {
          type: 'container',
          icon: Square,
          label: 'Container',
          config: {
            padding: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            children: []
          }
        },
        {
          type: 'grid',
          icon: Grid,
          label: 'Grid',
          config: {
            columns: 2,
            gap: '16px',
            children: []
          }
        },
        {
          type: 'flexRow',
          icon: Menu,
          label: 'Flex Row',
          config: {
            gap: '16px',
            alignItems: 'center',
            justifyContent: 'flex-start',
            children: []
          }
        },
        {
          type: 'section',
          icon: Square,
          label: 'Section',
          config: {
            title: 'Section Title',
            padding: '24px',
            children: []
          }
        },
        {
          type: 'card',
          icon: Square,
          label: 'Card',
          config: {
            title: 'Card Title',
            content: 'Card content goes here...',
            padding: '20px',
            shadow: true
          }
        }
      ]
    },
    {
      category: 'Forms',
      items: [
        {
          type: 'textInput',
          icon: FormInput,
          label: 'Text Input',
          config: {
            label: 'Field Label',
            placeholder: 'Enter text...',
            required: false,
            width: '100%'
          }
        },
        {
          type: 'textarea',
          icon: Type,
          label: 'Text Area',
          config: {
            label: 'Description',
            rows: 4,
            placeholder: 'Enter description...'
          }
        },
        {
          type: 'select',
          icon: List,
          label: 'Dropdown',
          config: {
            label: 'Select Option',
            options: ['Option 1', 'Option 2', 'Option 3']
          }
        },
        {
          type: 'checkbox',
          icon: CheckSquare,
          label: 'Checkbox',
          config: {
            label: 'Accept terms and conditions'
          }
        },
        {
          type: 'radio',
          icon: Circle,
          label: 'Radio Group',
          config: {
            label: 'Choose one',
            options: ['Option 1', 'Option 2']
          }
        },
        {
          type: 'datePicker',
          icon: Calendar,
          label: 'Date Picker',
          config: {
            label: 'Select Date'
          }
        },
        {
          type: 'timePicker',
          icon: Clock,
          label: 'Time Picker',
          config: {
            label: 'Select Time'
          }
        }
      ]
    },
    {
      category: 'Content',
      items: [
        {
          type: 'heading',
          icon: Type,
          label: 'Heading',
          config: {
            text: 'Heading Text',
            level: 'h2',
            align: 'left',
            color: '#111827'
          }
        },
        {
          type: 'paragraph',
          icon: Type,
          label: 'Paragraph',
          config: {
            text: 'Your paragraph text here...',
            align: 'left',
            color: '#374151'
          }
        },
        {
          type: 'image',
          icon: Image,
          label: 'Image',
          config: {
            src: 'https://via.placeholder.com/400x300',
            alt: 'Image',
            width: '100%',
            borderRadius: '8px'
          }
        },
        {
          type: 'button',
          icon: Circle,
          label: 'Button',
          config: {
            text: 'Click Me',
            variant: 'primary',
            size: 'medium',
            fullWidth: false
          }
        },
        {
          type: 'link',
          icon: Type,
          label: 'Link',
          config: {
            text: 'Click here',
            href: '#',
            color: '#3b82f6'
          }
        },
        {
          type: 'divider',
          icon: Square,
          label: 'Divider',
          config: {
            color: '#e5e7eb',
            height: '1px',
            margin: '20px 0'
          }
        }
      ]
    },
    {
      category: 'Data Display',
      items: [
        {
          type: 'table',
          icon: Table,
          label: 'Table',
          config: {
            columns: ['Column 1', 'Column 2', 'Column 3'],
            rows: [
              ['Data 1', 'Data 2', 'Data 3'],
              ['Data 4', 'Data 5', 'Data 6']
            ]
          }
        },
        {
          type: 'list',
          icon: List,
          label: 'List',
          config: {
            items: ['Item 1', 'Item 2', 'Item 3'],
            ordered: false
          }
        },
        {
          type: 'badge',
          icon: Circle,
          label: 'Badge',
          config: {
            text: 'New',
            color: 'blue'
          }
        },
        {
          type: 'alert',
          icon: Star,
          label: 'Alert',
          config: {
            title: 'Alert Title',
            message: 'This is an alert message',
            type: 'info'
          }
        }
      ]
    },
    {
      category: 'Media & Icons',
      items: [
        {
          type: 'icon',
          icon: Star,
          label: 'Icon',
          config: {
            iconType: 'star',
            size: 24,
            color: '#374151'
          }
        },
        {
          type: 'avatar',
          icon: User,
          label: 'Avatar',
          config: {
            name: 'User Name',
            size: 'medium',
            src: ''
          }
        },
        {
          type: 'video',
          icon: Image,
          label: 'Video',
          config: {
            src: '',
            controls: true,
            autoplay: false
          }
        }
      ]
    }
  ];

  useEffect(() => {
    if (pageId) {
      fetchPage();
    }
  }, [pageId]);

  // Add to history when components change
  useEffect(() => {
    if (components.length > 0 || historyIndex >= 0) {
      addToHistory(components);
    }
  }, []);

  const fetchPage = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/pages/${pageId}`);
      const data = await response.json();

      if (data.success) {
        setPage(data.page);
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
        addToHistory(allComponents);

        // Load custom CSS if available
        if (data.page.customCSS) {
          setCustomCSS(data.page.customCSS);
        }
      }
    } catch (error) {
      console.error('Failed to fetch page:', error);
    } finally {
      setLoading(false);
    }
  };

  // History management
  const addToHistory = (newComponents) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newComponents)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setComponents(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setComponents(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (component, fromPalette = true, index = null) => {
    setDraggedComponent(component);
    if (!fromPalette) {
      setDraggedIndex(index);
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null) {
      setDropIndicatorIndex(index);
    }
  };

  const handleDrop = (e, targetIndex = null) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedComponent) {
      let newComponents = [...components];

      if (draggedIndex !== null) {
        // Reordering existing component
        const [removed] = newComponents.splice(draggedIndex, 1);
        const insertIndex = targetIndex !== null ? targetIndex : newComponents.length;
        newComponents.splice(insertIndex, 0, removed);
      } else {
        // Adding new component from palette
        const newComponent = {
          id: `comp-${Date.now()}`,
          type: draggedComponent.type,
          config: JSON.parse(JSON.stringify(draggedComponent.config))
        };
        if (targetIndex !== null) {
          newComponents.splice(targetIndex, 0, newComponent);
        } else {
          newComponents.push(newComponent);
        }
      }

      setComponents(newComponents);
      addToHistory(newComponents);
      setDraggedComponent(null);
      setDraggedIndex(null);
      setDropIndicatorIndex(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedComponent(null);
    setDraggedIndex(null);
    setDropIndicatorIndex(null);
  };

  const handleComponentClick = (component, e) => {
    e?.stopPropagation();
    setSelectedComponent(component);
  };

  const handleDeleteComponent = (componentId) => {
    const newComponents = components.filter(c => c.id !== componentId);
    setComponents(newComponents);
    addToHistory(newComponents);
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(null);
    }
  };

  const handleDuplicateComponent = (componentId) => {
    const componentToDuplicate = components.find(c => c.id === componentId);
    if (componentToDuplicate) {
      const newComponent = {
        ...JSON.parse(JSON.stringify(componentToDuplicate)),
        id: `comp-${Date.now()}`
      };
      const index = components.findIndex(c => c.id === componentId);
      const newComponents = [...components];
      newComponents.splice(index + 1, 0, newComponent);
      setComponents(newComponents);
      addToHistory(newComponents);
    }
  };

  const handleCopyComponent = (componentId) => {
    const componentToCopy = components.find(c => c.id === componentId);
    if (componentToCopy) {
      setClipboard(JSON.parse(JSON.stringify(componentToCopy)));
    }
  };

  const handlePasteComponent = () => {
    if (clipboard) {
      const newComponent = {
        ...JSON.parse(JSON.stringify(clipboard)),
        id: `comp-${Date.now()}`
      };
      const newComponents = [...components, newComponent];
      setComponents(newComponents);
      addToHistory(newComponents);
    }
  };

  const handleMoveComponent = (componentId, direction) => {
    const index = components.findIndex(c => c.id === componentId);
    if (direction === 'up' && index > 0) {
      const newComponents = [...components];
      [newComponents[index - 1], newComponents[index]] = [newComponents[index], newComponents[index - 1]];
      setComponents(newComponents);
      addToHistory(newComponents);
    } else if (direction === 'down' && index < components.length - 1) {
      const newComponents = [...components];
      [newComponents[index], newComponents[index + 1]] = [newComponents[index + 1], newComponents[index]];
      setComponents(newComponents);
      addToHistory(newComponents);
    }
  };

  const handleUpdateComponent = (componentId, newConfig) => {
    const newComponents = components.map(c =>
      c.id === componentId ? { ...c, config: { ...c.config, ...newConfig } } : c
    );
    setComponents(newComponents);
    addToHistory(newComponents);
    if (selectedComponent?.id === componentId) {
      setSelectedComponent({ ...selectedComponent, config: { ...selectedComponent.config, ...newConfig } });
    }
  };

  const handleSave = async () => {
    if (!page) return;

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
      ],
      customCSS: customCSS
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

  // CSS Handler
  const handleCSSChange = (newCSS) => {
    setCustomCSS(newCSS);
    // Clear error when user types
    if (cssError) {
      setCSSError(null);
    }
  };

  const handleApplyCSS = () => {
    try {
      // Validate CSS by creating a temporary style element
      const styleEl = document.createElement('style');
      styleEl.textContent = customCSS;
      setCSSError(null);
      alert('CSS applied successfully!');
    } catch (error) {
      setCSSError(error.message);
    }
  };

  const handleResetCSS = () => {
    if (window.confirm('Are you sure you want to reset all custom CSS? This cannot be undone.')) {
      setCustomCSS('');
      setCSSError(null);
    }
  };

  const insertCSSTemplate = (template) => {
    const templates = {
      container: `/* Container Styles */
.canvas-component {
  transition: all 0.3s ease;
}

.canvas-component:hover {
  transform: scale(1.02);
}`,
      typography: `/* Typography Styles */
.component-heading {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.02em;
}

.component-paragraph {
  line-height: 1.8;
  font-size: 16px;
}`,
      colors: `/* Custom Colors */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #6b7280;
  --accent-color: #f59e0b;
}

.component-button.primary {
  background-color: var(--primary-color);
}`,
      animations: `/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.canvas-component {
  animation: slideIn 0.5s ease;
}`
    };

    const templateCSS = templates[template] || '';
    setCustomCSS(prevCSS => prevCSS + '\n\n' + templateCSS);
  };

  // Visual CSS Handlers
  const updateVisualCSS = (category, property, value) => {
    setVisualCSS(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [property]: value
      }
    }));
  };

  const generateCSSFromVisual = () => {
    const { typography, spacing, background, borders, layout, effects } = visualCSS;

    let css = '/* Generated from Visual Editor */\n.canvas-component {\n';

    // Typography
    if (typography.fontFamily !== 'inherit') css += `  font-family: ${typography.fontFamily};\n`;
    if (typography.fontSize !== '14px') css += `  font-size: ${typography.fontSize};\n`;
    if (typography.fontWeight !== '400') css += `  font-weight: ${typography.fontWeight};\n`;
    if (typography.color !== '#111827') css += `  color: ${typography.color};\n`;
    if (typography.lineHeight !== '1.6') css += `  line-height: ${typography.lineHeight};\n`;
    if (typography.textAlign !== 'left') css += `  text-align: ${typography.textAlign};\n`;

    // Spacing
    if (spacing.padding !== '16px') css += `  padding: ${spacing.padding};\n`;
    if (spacing.margin !== '0px') css += `  margin: ${spacing.margin};\n`;
    if (spacing.gap !== '16px') css += `  gap: ${spacing.gap};\n`;

    // Background
    if (background.backgroundColor !== '#ffffff') css += `  background-color: ${background.backgroundColor};\n`;
    if (background.backgroundImage) css += `  background-image: url(${background.backgroundImage});\n`;
    if (background.opacity !== '1') css += `  opacity: ${background.opacity};\n`;

    // Borders
    if (borders.borderWidth !== '1px' || borders.borderStyle !== 'solid' || borders.borderColor !== '#e5e7eb') {
      css += `  border: ${borders.borderWidth} ${borders.borderStyle} ${borders.borderColor};\n`;
    }
    if (borders.borderRadius !== '8px') css += `  border-radius: ${borders.borderRadius};\n`;

    // Layout
    if (layout.display !== 'block') css += `  display: ${layout.display};\n`;
    if (layout.width !== 'auto') css += `  width: ${layout.width};\n`;
    if (layout.height !== 'auto') css += `  height: ${layout.height};\n`;
    if (layout.maxWidth !== '100%') css += `  max-width: ${layout.maxWidth};\n`;

    // Effects
    if (effects.boxShadow !== 'none') css += `  box-shadow: ${effects.boxShadow};\n`;
    if (effects.transform !== 'none') css += `  transform: ${effects.transform};\n`;
    if (effects.transition !== 'all 0.3s ease') css += `  transition: ${effects.transition};\n`;

    css += '}\n';

    return css;
  };

  const handleApplyVisualCSS = () => {
    const generatedCSS = generateCSSFromVisual();
    setCustomCSS(prevCSS => {
      // Replace existing generated CSS or append
      if (prevCSS.includes('/* Generated from Visual Editor */')) {
        const parts = prevCSS.split('/* Generated from Visual Editor */');
        const afterGenerated = parts[1] ? parts[1].split('}')[1] || '' : '';
        return parts[0].trim() + '\n\n' + generatedCSS + afterGenerated;
      } else {
        return prevCSS + '\n\n' + generatedCSS;
      }
    });
    setCSSError(null);
    alert('Visual CSS applied! Switch to Code mode to see the generated CSS.');
  };

  // Component renderer with enhanced visuals
  const renderComponent = (component, isPreview = false) => {
    const config = component.config || {};

    switch (component.type) {
      case 'heading':
        const HeadingTag = config.level || 'h2';
        return (
          <HeadingTag
            className="component-heading"
            style={{
              textAlign: config.align,
              color: config.color,
              margin: '0'
            }}
          >
            {config.text}
          </HeadingTag>
        );

      case 'paragraph':
        return (
          <p
            className="component-paragraph"
            style={{
              textAlign: config.align,
              color: config.color,
              lineHeight: '1.6',
              margin: '0'
            }}
          >
            {config.text}
          </p>
        );

      case 'textInput':
        return (
          <div className="component-input">
            <label>{config.label}{config.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
            <input
              type="text"
              placeholder={config.placeholder}
              style={{ width: config.width }}
              disabled={!isPreview}
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="component-input">
            <label>{config.label}</label>
            <textarea
              placeholder={config.placeholder}
              rows={config.rows}
              disabled={!isPreview}
            />
          </div>
        );

      case 'select':
        return (
          <div className="component-input">
            <label>{config.label}</label>
            <select disabled={!isPreview}>
              {config.options?.map((opt, i) => (
                <option key={i}>{opt}</option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <label className="component-checkbox">
            <input type="checkbox" disabled={!isPreview} />
            <span>{config.label}</span>
          </label>
        );

      case 'button':
        return (
          <button
            className={`component-button ${config.variant} ${config.size}`}
            style={{ width: config.fullWidth ? '100%' : 'auto' }}
          >
            {config.text}
          </button>
        );

      case 'image':
        return (
          <img
            src={config.src}
            alt={config.alt}
            className="component-image"
            style={{
              width: config.width,
              borderRadius: config.borderRadius,
              maxWidth: '100%'
            }}
          />
        );

      case 'card':
        return (
          <div
            className="component-card"
            style={{
              padding: config.padding,
              boxShadow: config.shadow ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <h3>{config.title}</h3>
            <p>{config.content}</p>
          </div>
        );

      case 'container':
        return (
          <div
            className="component-container"
            style={{
              padding: config.padding,
              backgroundColor: config.backgroundColor,
              borderRadius: config.borderRadius,
              minHeight: '100px'
            }}
          >
            {config.children?.length > 0 ? 'Container with children' : 'Empty Container'}
          </div>
        );

      case 'divider':
        return (
          <hr
            style={{
              border: 'none',
              borderTop: `${config.height} solid ${config.color}`,
              margin: config.margin
            }}
          />
        );

      case 'badge':
        const badgeColors = {
          blue: '#3b82f6',
          green: '#10b981',
          red: '#ef4444',
          yellow: '#f59e0b',
          gray: '#6b7280'
        };
        return (
          <span
            className="component-badge"
            style={{
              backgroundColor: badgeColors[config.color] || badgeColors.blue,
              color: '#ffffff',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            {config.text}
          </span>
        );

      case 'list':
        const ListTag = config.ordered ? 'ol' : 'ul';
        return (
          <ListTag className="component-list">
            {config.items?.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ListTag>
        );

      case 'table':
        return (
          <table className="component-table">
            <thead>
              <tr>
                {config.columns?.map((col, i) => (
                  <th key={i}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.rows?.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        const Icon = component.icon || Square;
        return (
          <div className="component-placeholder">
            <Icon size={24} />
            <span>{config.label || component.type}</span>
          </div>
        );
    }
  };

  if (loading) {
    return <div className="page-designer-loading">Loading page designer...</div>;
  }

  if (!page) {
    return <div className="page-designer-error">Page not found</div>;
  }

  const canvasWidth = deviceMode === 'mobile' ? '375px' : deviceMode === 'tablet' ? '768px' : '100%';

  return (
    <div className="page-designer">
      {/* Enhanced Header */}
      <div className="page-designer-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="page-info">
          <h2>{page.name}</h2>
          <span className="page-route">{page.route}</span>
        </div>

        {/* Device Mode Switcher */}
        <div className="device-switcher">
          <button
            className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setDeviceMode('desktop')}
            title="Desktop View"
          >
            <Monitor size={18} />
          </button>
          <button
            className={`device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
            onClick={() => setDeviceMode('tablet')}
            title="Tablet View"
          >
            <Tablet size={18} />
          </button>
          <button
            className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setDeviceMode('mobile')}
            title="Mobile View"
          >
            <Smartphone size={18} />
          </button>
        </div>

        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <Undo size={18} />
          </button>
          <button
            className="btn-secondary"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
          >
            <Redo size={18} />
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowLayers(!showLayers)}
            title="Toggle Layers"
          >
            <Layers size={18} />
          </button>
          <button
            className={`btn-secondary ${showCSSEditor ? 'active' : ''}`}
            onClick={() => setShowCSSEditor(!showCSSEditor)}
            title="CSS Editor"
          >
            <Code size={18} />
            CSS
          </button>
          <button
            className="btn-secondary"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye size={18} />
            {previewMode ? 'Edit' : 'Preview'}
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={18} />
            Save
          </button>
        </div>
      </div>

      <div className="page-designer-body">
        {/* Component Palette */}
        {!previewMode && (
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
                          onDragStart={() => handleDragStart(item, true)}
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
        )}

        {/* Canvas */}
        <div className="page-canvas" style={{ width: previewMode ? '100%' : 'auto' }}>
          <div className="canvas-header">
            <h4>Canvas {deviceMode !== 'desktop' && `(${deviceMode})`}</h4>
            <span className="component-count">{components.length} components</span>
          </div>
          <div
            className="canvas-content"
            ref={canvasRef}
            onDrop={(e) => handleDrop(e, null)}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="canvas-viewport" style={{ maxWidth: canvasWidth, margin: '0 auto' }}>
              {components.length === 0 ? (
                <div className="canvas-empty">
                  <Grid size={48} style={{ opacity: 0.3 }} />
                  <p>Drag components from the left panel to start designing</p>
                </div>
              ) : (
                <div className="canvas-components">
                  {components.map((component, index) => (
                    <React.Fragment key={component.id}>
                      {dropIndicatorIndex === index && (
                        <div className="drop-indicator" />
                      )}
                      <div
                        className={`canvas-component ${selectedComponent?.id === component.id ? 'selected' : ''} ${previewMode ? 'preview' : ''}`}
                        onClick={(e) => !previewMode && handleComponentClick(component, e)}
                        draggable={!previewMode}
                        onDragStart={() => handleDragStart(component, false, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                      >
                        {renderComponent(component, previewMode)}

                        {!previewMode && selectedComponent?.id === component.id && (
                          <div className="component-toolbar">
                            <button
                              className="toolbar-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveComponent(component.id, 'up');
                              }}
                              title="Move Up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              className="toolbar-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMoveComponent(component.id, 'down');
                              }}
                              title="Move Down"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              className="toolbar-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyComponent(component.id);
                              }}
                              title="Copy"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              className="toolbar-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateComponent(component.id);
                              }}
                              title="Duplicate"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              className="toolbar-btn danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteComponent(component.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                  {dropIndicatorIndex === components.length && (
                    <div className="drop-indicator" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Layers and Properties Panel */}
        {!previewMode && showLayers && (
          <div className="right-sidebar">
            {/* Layers Panel */}
            <div className="layers-panel">
              <div className="panel-header">
                <Layers size={18} />
                <h3>Layers</h3>
              </div>
              <div className="panel-content">
                {components.length === 0 ? (
                  <div className="no-layers">No components yet</div>
                ) : (
                  <div className="layers-list">
                    {components.map((component, index) => (
                      <div
                        key={component.id}
                        className={`layer-item ${selectedComponent?.id === component.id ? 'selected' : ''}`}
                        onClick={() => handleComponentClick(component)}
                      >
                        <Move size={14} className="drag-handle" />
                        <span className="layer-type">{component.type}</span>
                        <span className="layer-index">#{index + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Properties Panel */}
            {!showCSSEditor && (
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

                      {Object.entries(selectedComponent.config || {}).map(([key, value]) => {
                        if (key === 'children') return null;

                        return (
                          <div key={key} className="property-group">
                            <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>

                            {typeof value === 'boolean' ? (
                              <label className="property-checkbox">
                                <input
                                  type="checkbox"
                                  checked={value}
                                  onChange={(e) => handleUpdateComponent(selectedComponent.id, { [key]: e.target.checked })}
                                />
                                <span>{value ? 'Yes' : 'No'}</span>
                              </label>
                            ) : typeof value === 'string' ? (
                              key.toLowerCase().includes('color') ? (
                                <input
                                  type="color"
                                  value={value}
                                  onChange={(e) => handleUpdateComponent(selectedComponent.id, { [key]: e.target.value })}
                                  className="property-color"
                                />
                              ) : key === 'text' || key === 'content' ? (
                                <textarea
                                  value={value}
                                  onChange={(e) => handleUpdateComponent(selectedComponent.id, { [key]: e.target.value })}
                                  className="property-textarea"
                                  rows="3"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => handleUpdateComponent(selectedComponent.id, { [key]: e.target.value })}
                                  className="property-input"
                                />
                              )
                            ) : typeof value === 'number' ? (
                              <input
                                type="number"
                                value={value}
                                onChange={(e) => handleUpdateComponent(selectedComponent.id, { [key]: parseInt(e.target.value) })}
                                className="property-input"
                              />
                            ) : Array.isArray(value) ? (
                              <div className="property-array">
                                {value.map((item, i) => (
                                  <div key={i} className="array-item">{typeof item === 'string' ? item : JSON.stringify(item)}</div>
                                ))}
                              </div>
                            ) : (
                              <div className="property-value">{JSON.stringify(value)}</div>
                            )}
                          </div>
                        );
                      })}

                      {clipboard && (
                        <button
                          className="btn-paste"
                          onClick={handlePasteComponent}
                        >
                          <Copy size={16} />
                          Paste Component
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="no-selection">
                      <p>Select a component to edit its properties</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CSS Editor Panel */}
            {showCSSEditor && (
              <div className="css-editor-panel">
                <div className="panel-header">
                  <Code size={18} />
                  <h3>CSS Editor</h3>
                  <button className="icon-btn" onClick={() => setShowCSSEditor(false)} title="Close CSS Editor">
                    <X size={18} />
                  </button>
                </div>

                {/* Mode Toggle */}
                <div className="css-mode-toggle">
                  <button
                    className={`mode-toggle-btn ${cssEditorMode === 'visual' ? 'active' : ''}`}
                    onClick={() => setCSSEditorMode('visual')}
                  >
                    Visual
                  </button>
                  <button
                    className={`mode-toggle-btn ${cssEditorMode === 'code' ? 'active' : ''}`}
                    onClick={() => setCSSEditorMode('code')}
                  >
                    Code
                  </button>
                </div>

                <div className="panel-content">
                  {/* Visual Editor Mode */}
                  {cssEditorMode === 'visual' && (
                    <div className="visual-css-editor">
                      {/* Typography Section */}
                      <div className="css-section">
                        <h4 className="css-section-title">Typography</h4>
                        <div className="css-controls">
                          <div className="css-control">
                            <label>Font Family</label>
                            <select
                              value={visualCSS.typography.fontFamily}
                              onChange={(e) => updateVisualCSS('typography', 'fontFamily', e.target.value)}
                              className="css-input"
                            >
                              <option value="inherit">Inherit</option>
                              <option value="'Inter', sans-serif">Inter</option>
                              <option value="'Arial', sans-serif">Arial</option>
                              <option value="'Georgia', serif">Georgia</option>
                              <option value="'Courier New', monospace">Courier New</option>
                            </select>
                          </div>
                          <div className="css-control">
                            <label>Font Size</label>
                            <input
                              type="text"
                              value={visualCSS.typography.fontSize}
                              onChange={(e) => updateVisualCSS('typography', 'fontSize', e.target.value)}
                              className="css-input"
                              placeholder="14px"
                            />
                          </div>
                          <div className="css-control">
                            <label>Font Weight</label>
                            <select
                              value={visualCSS.typography.fontWeight}
                              onChange={(e) => updateVisualCSS('typography', 'fontWeight', e.target.value)}
                              className="css-input"
                            >
                              <option value="300">Light (300)</option>
                              <option value="400">Normal (400)</option>
                              <option value="500">Medium (500)</option>
                              <option value="600">Semibold (600)</option>
                              <option value="700">Bold (700)</option>
                            </select>
                          </div>
                          <div className="css-control">
                            <label>Color</label>
                            <div className="css-color-control">
                              <input
                                type="color"
                                value={visualCSS.typography.color}
                                onChange={(e) => updateVisualCSS('typography', 'color', e.target.value)}
                                className="css-color-picker"
                              />
                              <input
                                type="text"
                                value={visualCSS.typography.color}
                                onChange={(e) => updateVisualCSS('typography', 'color', e.target.value)}
                                className="css-input css-color-text"
                                placeholder="#111827"
                              />
                            </div>
                          </div>
                          <div className="css-control">
                            <label>Line Height</label>
                            <input
                              type="text"
                              value={visualCSS.typography.lineHeight}
                              onChange={(e) => updateVisualCSS('typography', 'lineHeight', e.target.value)}
                              className="css-input"
                              placeholder="1.6"
                            />
                          </div>
                          <div className="css-control">
                            <label>Text Align</label>
                            <select
                              value={visualCSS.typography.textAlign}
                              onChange={(e) => updateVisualCSS('typography', 'textAlign', e.target.value)}
                              className="css-input"
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                              <option value="justify">Justify</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Spacing Section */}
                      <div className="css-section">
                        <h4 className="css-section-title">Spacing</h4>
                        <div className="css-controls">
                          <div className="css-control">
                            <label>Padding</label>
                            <input
                              type="text"
                              value={visualCSS.spacing.padding}
                              onChange={(e) => updateVisualCSS('spacing', 'padding', e.target.value)}
                              className="css-input"
                              placeholder="16px"
                            />
                          </div>
                          <div className="css-control">
                            <label>Margin</label>
                            <input
                              type="text"
                              value={visualCSS.spacing.margin}
                              onChange={(e) => updateVisualCSS('spacing', 'margin', e.target.value)}
                              className="css-input"
                              placeholder="0px"
                            />
                          </div>
                          <div className="css-control">
                            <label>Gap</label>
                            <input
                              type="text"
                              value={visualCSS.spacing.gap}
                              onChange={(e) => updateVisualCSS('spacing', 'gap', e.target.value)}
                              className="css-input"
                              placeholder="16px"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Background Section */}
                      <div className="css-section">
                        <h4 className="css-section-title">Background</h4>
                        <div className="css-controls">
                          <div className="css-control">
                            <label>Background Color</label>
                            <div className="css-color-control">
                              <input
                                type="color"
                                value={visualCSS.background.backgroundColor}
                                onChange={(e) => updateVisualCSS('background', 'backgroundColor', e.target.value)}
                                className="css-color-picker"
                              />
                              <input
                                type="text"
                                value={visualCSS.background.backgroundColor}
                                onChange={(e) => updateVisualCSS('background', 'backgroundColor', e.target.value)}
                                className="css-input css-color-text"
                                placeholder="#ffffff"
                              />
                            </div>
                          </div>
                          <div className="css-control">
                            <label>Background Image URL</label>
                            <input
                              type="text"
                              value={visualCSS.background.backgroundImage}
                              onChange={(e) => updateVisualCSS('background', 'backgroundImage', e.target.value)}
                              className="css-input"
                              placeholder="https://..."
                            />
                          </div>
                          <div className="css-control">
                            <label>Opacity</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={visualCSS.background.opacity}
                              onChange={(e) => updateVisualCSS('background', 'opacity', e.target.value)}
                              className="css-range"
                            />
                            <span className="css-range-value">{visualCSS.background.opacity}</span>
                          </div>
                        </div>
                      </div>

                      {/* Borders Section */}
                      <div className="css-section">
                        <h4 className="css-section-title">Borders</h4>
                        <div className="css-controls">
                          <div className="css-control">
                            <label>Border Width</label>
                            <input
                              type="text"
                              value={visualCSS.borders.borderWidth}
                              onChange={(e) => updateVisualCSS('borders', 'borderWidth', e.target.value)}
                              className="css-input"
                              placeholder="1px"
                            />
                          </div>
                          <div className="css-control">
                            <label>Border Style</label>
                            <select
                              value={visualCSS.borders.borderStyle}
                              onChange={(e) => updateVisualCSS('borders', 'borderStyle', e.target.value)}
                              className="css-input"
                            >
                              <option value="solid">Solid</option>
                              <option value="dashed">Dashed</option>
                              <option value="dotted">Dotted</option>
                              <option value="double">Double</option>
                              <option value="none">None</option>
                            </select>
                          </div>
                          <div className="css-control">
                            <label>Border Color</label>
                            <div className="css-color-control">
                              <input
                                type="color"
                                value={visualCSS.borders.borderColor}
                                onChange={(e) => updateVisualCSS('borders', 'borderColor', e.target.value)}
                                className="css-color-picker"
                              />
                              <input
                                type="text"
                                value={visualCSS.borders.borderColor}
                                onChange={(e) => updateVisualCSS('borders', 'borderColor', e.target.value)}
                                className="css-input css-color-text"
                                placeholder="#e5e7eb"
                              />
                            </div>
                          </div>
                          <div className="css-control">
                            <label>Border Radius</label>
                            <input
                              type="text"
                              value={visualCSS.borders.borderRadius}
                              onChange={(e) => updateVisualCSS('borders', 'borderRadius', e.target.value)}
                              className="css-input"
                              placeholder="8px"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Layout Section */}
                      <div className="css-section">
                        <h4 className="css-section-title">Layout</h4>
                        <div className="css-controls">
                          <div className="css-control">
                            <label>Display</label>
                            <select
                              value={visualCSS.layout.display}
                              onChange={(e) => updateVisualCSS('layout', 'display', e.target.value)}
                              className="css-input"
                            >
                              <option value="block">Block</option>
                              <option value="inline-block">Inline Block</option>
                              <option value="flex">Flex</option>
                              <option value="grid">Grid</option>
                              <option value="none">None</option>
                            </select>
                          </div>
                          <div className="css-control">
                            <label>Width</label>
                            <input
                              type="text"
                              value={visualCSS.layout.width}
                              onChange={(e) => updateVisualCSS('layout', 'width', e.target.value)}
                              className="css-input"
                              placeholder="auto"
                            />
                          </div>
                          <div className="css-control">
                            <label>Height</label>
                            <input
                              type="text"
                              value={visualCSS.layout.height}
                              onChange={(e) => updateVisualCSS('layout', 'height', e.target.value)}
                              className="css-input"
                              placeholder="auto"
                            />
                          </div>
                          <div className="css-control">
                            <label>Max Width</label>
                            <input
                              type="text"
                              value={visualCSS.layout.maxWidth}
                              onChange={(e) => updateVisualCSS('layout', 'maxWidth', e.target.value)}
                              className="css-input"
                              placeholder="100%"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Effects Section */}
                      <div className="css-section">
                        <h4 className="css-section-title">Effects</h4>
                        <div className="css-controls">
                          <div className="css-control">
                            <label>Box Shadow</label>
                            <input
                              type="text"
                              value={visualCSS.effects.boxShadow}
                              onChange={(e) => updateVisualCSS('effects', 'boxShadow', e.target.value)}
                              className="css-input"
                              placeholder="none"
                            />
                            <small className="css-hint">e.g., 0 2px 8px rgba(0,0,0,0.1)</small>
                          </div>
                          <div className="css-control">
                            <label>Transform</label>
                            <input
                              type="text"
                              value={visualCSS.effects.transform}
                              onChange={(e) => updateVisualCSS('effects', 'transform', e.target.value)}
                              className="css-input"
                              placeholder="none"
                            />
                            <small className="css-hint">e.g., scale(1.1) rotate(5deg)</small>
                          </div>
                          <div className="css-control">
                            <label>Transition</label>
                            <input
                              type="text"
                              value={visualCSS.effects.transition}
                              onChange={(e) => updateVisualCSS('effects', 'transition', e.target.value)}
                              className="css-input"
                              placeholder="all 0.3s ease"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="css-editor-actions">
                        <button className="btn-primary" onClick={handleApplyVisualCSS}>
                          <Save size={16} />
                          Apply Visual Styles
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Code Editor Mode */}
                  {cssEditorMode === 'code' && (
                    <div className="code-css-editor">
                      <div className="css-editor-tools">
                        <label className="css-label">Insert Template</label>
                        <select
                          className="css-template-select"
                          onChange={(e) => {
                            if (e.target.value) {
                              insertCSSTemplate(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Select a template...</option>
                          <option value="container">Container Styles</option>
                          <option value="typography">Typography</option>
                          <option value="colors">Custom Colors</option>
                          <option value="animations">Animations</option>
                        </select>
                      </div>

                      <div className="css-editor-textarea-wrapper">
                        <textarea
                          className="css-editor-textarea"
                          value={customCSS}
                          onChange={(e) => handleCSSChange(e.target.value)}
                          placeholder="/* Write your custom CSS here */&#10;.canvas-component {&#10;  /* Your styles */&#10;}"
                          spellCheck={false}
                        />
                      </div>

                      {cssError && (
                        <div className="css-error">
                          <span>Error: {cssError}</span>
                        </div>
                      )}

                      <div className="css-editor-actions">
                        <button className="btn-secondary" onClick={handleResetCSS}>
                          <Trash2 size={16} />
                          Reset CSS
                        </button>
                        <button className="btn-primary" onClick={handleApplyCSS}>
                          <Save size={16} />
                          Apply CSS
                        </button>
                      </div>

                      <div className="css-editor-info">
                        <p className="css-info-text">
                          Your CSS will be scoped to the page canvas. Use classes like <code>.canvas-component</code>, <code>.component-heading</code>, etc.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inject Custom CSS */}
      {customCSS && (
        <style>{customCSS}</style>
      )}
    </div>
  );
};

export default PageDesignerEnhanced;
