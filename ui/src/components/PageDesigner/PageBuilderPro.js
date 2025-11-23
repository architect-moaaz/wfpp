import React, { useState, useEffect } from 'react';
import {
  Monitor, Smartphone, Tablet, Search, ZoomIn, ZoomOut,
  RotateCcw, RotateCw, Eye, ChevronDown, ChevronUp,
  Type, Square, Grid, Columns, Video, MoreHorizontal
} from 'lucide-react';
import './PageBuilderPro.css';

const PageBuilderPro = ({ pageId, onBack }) => {
  const [page, setPage] = useState({ name: 'Landing Page' });
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [components, setComponents] = useState([]);
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeTab, setActiveTab] = useState('components'); // 'components' or 'layers'
  const [loading, setLoading] = useState(true);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    layout: true,
    typography: true,
    background: true,
    bordersAndShadows: false,
    interactions: false
  });

  // Component palette matching the screenshot
  const componentPalette = {
    'BASIC ELEMENTS': [
      { type: 'heading', icon: 'H', label: 'Heading' },
      { type: 'text', icon: '¶', label: 'Text' },
      { type: 'button', icon: '↗', label: 'Button' },
      { type: 'image', icon: '🖼', label: 'Image' }
    ],
    'LAYOUT': [
      { type: 'container', icon: '⊞', label: 'Container' },
      { type: 'grid', icon: '⊡', label: 'Grid' },
      { type: 'columns', icon: '|||', label: 'Columns' },
      { type: 'section', icon: '▭', label: 'Section' }
    ],
    'MEDIA': [
      { type: 'video', icon: '▶', label: 'Video' },
      { type: 'carousel', icon: '⋮', label: 'Carousel' }
    ]
  };

  // Fetch page data on component mount
  useEffect(() => {
    if (pageId) {
      fetchPage();
    } else {
      setLoading(false);
    }
  }, [pageId]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/pages/${pageId}`);
      const data = await response.json();

      if (data.success && data.page) {
        setPage(data.page);

        // Extract all components from all sections
        const allComponents = [];
        if (data.page.sections) {
          data.page.sections.forEach((section, sectionIndex) => {
            if (section.components) {
              section.components.forEach((comp, compIndex) => {
                allComponents.push({
                  id: `comp-${sectionIndex}-${compIndex}`,
                  sectionId: section.id,
                  sectionType: section.type,
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDragStart = (component) => {
    // Drag handling
  };

  const handleDrop = () => {
    // Drop handling
  };

  const renderComponentPreview = (component) => {
    const config = component.config || {};
    const style = {
      padding: '12px',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      backgroundColor: '#f9fafb',
      minHeight: '40px'
    };

    switch (component.type) {
      case 'text':
        return <div style={style}>{component.content || component.text || config.text || 'Text content'}</div>;
      case 'card':
        return (
          <div style={{...style, borderLeft: '4px solid #3b82f6'}}>
            <div style={{fontWeight: 600, marginBottom: '4px'}}>{component.title || config.title || 'Card'}</div>
            <div style={{fontSize: '12px', color: '#6b7280'}}>{component.content || config.content || component.metric || config.metric || 'Content'}</div>
          </div>
        );
      case 'chart':
        return (
          <div style={{...style, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{fontSize: '12px', color: '#6b7280'}}>
              {component.title || config.title || 'Chart'} ({component.chartType || config.type || 'bar'})
            </div>
          </div>
        );
      case 'list':
        return (
          <div style={style}>
            <div style={{fontWeight: 600, marginBottom: '4px'}}>{component.title || config.title || 'List'}</div>
            <div style={{fontSize: '12px', color: '#6b7280'}}>List items...</div>
          </div>
        );
      default:
        return <div style={style}>{component.type}</div>;
    }
  };

  return (
    <div className="page-builder-pro">
      {/* Header */}
      <div className="builder-header">
        <div className="header-left">
          <div className="logo-section">
            <Square size={20} className="logo-icon" />
            <span className="logo-text">PageBuilder</span>
          </div>
          <div className="project-selector">
            <span className="project-label">Project:</span>
            <button className="project-dropdown">
              {page.name}
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        <div className="header-center">
          <div className="device-controls">
            <button
              className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setDeviceMode('desktop')}
              title="Desktop"
            >
              <Monitor size={18} />
            </button>
            <button
              className={`device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
              onClick={() => setDeviceMode('tablet')}
              title="Tablet"
            >
              <Tablet size={18} />
            </button>
            <button
              className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setDeviceMode('mobile')}
              title="Mobile"
            >
              <Smartphone size={18} />
            </button>
          </div>

          <div className="zoom-controls">
            <button className="zoom-btn" onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}>
              <ZoomOut size={16} />
            </button>
            <span className="zoom-level">{zoomLevel}%</span>
            <button className="zoom-btn" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}>
              <ZoomIn size={16} />
            </button>
          </div>
        </div>

        <div className="header-right">
          <button className="history-btn" title="Undo">
            <RotateCcw size={18} />
          </button>
          <button className="history-btn" title="Redo">
            <RotateCw size={18} />
          </button>
          <button className="preview-btn">
            <Eye size={18} />
            Preview
          </button>
          <button className="publish-btn">Publish</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="builder-content">
        {/* Left Sidebar - Components */}
        <div className="left-sidebar">
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${activeTab === 'components' ? 'active' : ''}`}
              onClick={() => setActiveTab('components')}
            >
              Components
            </button>
            <button
              className={`tab-btn ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
            >
              Layers
            </button>
          </div>

          {activeTab === 'components' && (
            <div className="components-panel">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search components..."
                  className="search-input"
                />
              </div>

              <div className="components-list">
                {Object.entries(componentPalette).map(([category, items]) => (
                  <div key={category} className="component-category">
                    <div className="category-label">{category}</div>
                    <div className="category-grid">
                      {items.map((item) => (
                        <div
                          key={item.type}
                          className="component-item"
                          draggable
                          onDragStart={() => handleDragStart(item)}
                        >
                          <div className="component-icon">{item.icon}</div>
                          <div className="component-label">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'layers' && (
            <div className="layers-panel">
              <div className="layers-list">
                <div className="layer-item">Root</div>
              </div>
            </div>
          )}
        </div>

        {/* Center Canvas */}
        <div className="canvas-area">
          <div
            className={`canvas-container canvas-${deviceMode}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            <div className="canvas-page">
              {loading ? (
                <div className="canvas-empty">
                  <p>Loading page...</p>
                </div>
              ) : components.length === 0 ? (
                <div className="canvas-empty">
                  <p>Drop components here to start building</p>
                </div>
              ) : (
                components.map((component) => (
                  <div
                    key={component.id}
                    className={`canvas-component ${selectedComponent?.id === component.id ? 'selected' : ''}`}
                    onClick={() => setSelectedComponent(component)}
                  >
                    <div className="component-label">
                      {component.type}
                      {component.title && ` - ${component.title}`}
                      {component.content && ` - ${component.content.substring(0, 30)}...`}
                    </div>
                    <div className="component-preview">
                      {renderComponentPreview ? renderComponentPreview(component) : <div>{component.type} component</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="right-sidebar">
          {selectedComponent ? (
            <div className="properties-panel">
              <div className="properties-header">
                <h3>Button Properties</h3>
                <p className="selected-component-id">Selected component: primary-cta</p>
              </div>

              <div className="properties-content">
                {/* Layout Section */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('layout')}
                  >
                    <span>Layout</span>
                    {expandedSections.layout ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedSections.layout && (
                    <div className="section-content">
                      <div className="property-row">
                        <div className="property-field">
                          <label>Width</label>
                          <input type="text" defaultValue="Auto" className="prop-input" />
                        </div>
                        <div className="property-field">
                          <label>Height</label>
                          <input type="text" defaultValue="Auto" className="prop-input" />
                        </div>
                      </div>
                      <div className="property-row">
                        <label>Padding</label>
                        <div className="padding-grid">
                          <input type="number" defaultValue="12" className="prop-input-sm" />
                          <input type="number" defaultValue="32" className="prop-input-sm" />
                          <input type="number" defaultValue="12" className="prop-input-sm" />
                          <input type="number" defaultValue="32" className="prop-input-sm" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Typography Section */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('typography')}
                  >
                    <span>Typography</span>
                    {expandedSections.typography ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedSections.typography && (
                    <div className="section-content">
                      <div className="property-row">
                        <div className="property-field">
                          <label>Color</label>
                          <input type="text" defaultValue="#FFFFFF" className="prop-input" />
                        </div>
                      </div>
                      <div className="property-row">
                        <div className="property-field">
                          <label>Size</label>
                          <input type="text" defaultValue="16px" className="prop-input" />
                        </div>
                        <div className="property-field">
                          <label>Weight</label>
                          <select className="prop-select">
                            <option>Medium</option>
                            <option>Light</option>
                            <option>Bold</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Background Section */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('background')}
                  >
                    <span>Background</span>
                    {expandedSections.background ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedSections.background && (
                    <div className="section-content">
                      <div className="property-row">
                        <div className="property-field">
                          <label>Color</label>
                          <div className="color-input-group">
                            <input type="color" defaultValue="#1F2937" className="color-picker" />
                            <input type="text" defaultValue="#1F2937" className="prop-input" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Borders & Shadows Section */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('bordersAndShadows')}
                  >
                    <span>Borders & Shadows</span>
                    {expandedSections.bordersAndShadows ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedSections.bordersAndShadows && (
                    <div className="section-content">
                      <p className="section-placeholder">Border and shadow controls</p>
                    </div>
                  )}
                </div>

                {/* Interactions Section */}
                <div className="property-section">
                  <button
                    className="section-header"
                    onClick={() => toggleSection('interactions')}
                  >
                    <span>Interactions</span>
                    {expandedSections.interactions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {expandedSections.interactions && (
                    <div className="section-content">
                      <p className="section-placeholder">Interaction controls</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="properties-empty">
              <p>Select a component to edit its properties</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageBuilderPro;
