/**
 * DashboardBuilder - Create Visual Dashboards
 *
 * Drag-and-drop dashboard builder for non-technical users.
 * Features pre-built templates and intuitive widget configuration.
 */

import React, { useState, useCallback } from 'react';
import {
  ArrowLeft,
  LayoutGrid,
  BarChart3,
  PieChart,
  TrendingUp,
  Table2,
  Hash,
  Plus,
  GripVertical,
  Settings,
  Trash2,
  Save,
  Eye,
  Copy,
  Maximize2,
  X,
  Check,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import './DashboardBuilder.css';

const DashboardBuilder = ({ onBack, catalogSummary }) => {
  const [dashboardName, setDashboardName] = useState('My Dashboard');
  const [widgets, setWidgets] = useState([]);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Widget types available
  const widgetTypes = [
    {
      id: 'bar-chart',
      name: 'Bar Chart',
      description: 'Compare values across categories',
      icon: BarChart3,
      defaultSize: { w: 2, h: 2 }
    },
    {
      id: 'pie-chart',
      name: 'Pie Chart',
      description: 'Show parts of a whole',
      icon: PieChart,
      defaultSize: { w: 1, h: 2 }
    },
    {
      id: 'line-chart',
      name: 'Trend Line',
      description: 'Track changes over time',
      icon: TrendingUp,
      defaultSize: { w: 2, h: 2 }
    },
    {
      id: 'kpi',
      name: 'Key Number',
      description: 'Highlight an important metric',
      icon: Hash,
      defaultSize: { w: 1, h: 1 }
    },
    {
      id: 'table',
      name: 'Data Table',
      description: 'Show detailed records',
      icon: Table2,
      defaultSize: { w: 2, h: 2 }
    }
  ];

  // Dashboard templates
  const templates = [
    {
      id: 'sales',
      name: 'Sales Overview',
      description: 'Track revenue, orders, and top products',
      widgets: [
        { type: 'kpi', title: 'Total Revenue', x: 0, y: 0, w: 1, h: 1 },
        { type: 'kpi', title: 'Orders Today', x: 1, y: 0, w: 1, h: 1 },
        { type: 'kpi', title: 'Avg Order Value', x: 2, y: 0, w: 1, h: 1 },
        { type: 'bar-chart', title: 'Sales by Region', x: 0, y: 1, w: 2, h: 2 },
        { type: 'pie-chart', title: 'Sales by Category', x: 2, y: 1, w: 1, h: 2 }
      ]
    },
    {
      id: 'customers',
      name: 'Customer Insights',
      description: 'Understand your customer base',
      widgets: [
        { type: 'kpi', title: 'Total Customers', x: 0, y: 0, w: 1, h: 1 },
        { type: 'kpi', title: 'New This Month', x: 1, y: 0, w: 1, h: 1 },
        { type: 'line-chart', title: 'Customer Growth', x: 0, y: 1, w: 2, h: 2 },
        { type: 'pie-chart', title: 'By Location', x: 2, y: 0, w: 1, h: 2 },
        { type: 'table', title: 'Recent Customers', x: 0, y: 3, w: 3, h: 2 }
      ]
    },
    {
      id: 'operations',
      name: 'Operations Monitor',
      description: 'Track workflow and task completion',
      widgets: [
        { type: 'kpi', title: 'Active Workflows', x: 0, y: 0, w: 1, h: 1 },
        { type: 'kpi', title: 'Pending Tasks', x: 1, y: 0, w: 1, h: 1 },
        { type: 'kpi', title: 'Completed Today', x: 2, y: 0, w: 1, h: 1 },
        { type: 'bar-chart', title: 'Tasks by Status', x: 0, y: 1, w: 2, h: 2 },
        { type: 'line-chart', title: 'Completion Rate', x: 2, y: 1, w: 1, h: 2 }
      ]
    },
    {
      id: 'blank',
      name: 'Start Fresh',
      description: 'Build your own from scratch',
      widgets: []
    }
  ];

  // Add widget to dashboard
  const addWidget = (type) => {
    const widgetType = widgetTypes.find(w => w.id === type);
    const newWidget = {
      id: `widget-${Date.now()}`,
      type,
      title: widgetType?.name || 'New Widget',
      x: 0,
      y: widgets.length > 0 ? Math.max(...widgets.map(w => w.y + w.h)) : 0,
      w: widgetType?.defaultSize.w || 1,
      h: widgetType?.defaultSize.h || 1,
      config: {}
    };
    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget.id);
    setShowWidgetPicker(false);
  };

  // Remove widget
  const removeWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
    if (selectedWidget === widgetId) {
      setSelectedWidget(null);
    }
  };

  // Update widget
  const updateWidget = (widgetId, updates) => {
    setWidgets(widgets.map(w =>
      w.id === widgetId ? { ...w, ...updates } : w
    ));
  };

  // Duplicate widget
  const duplicateWidget = (widget) => {
    const newWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      title: `${widget.title} (Copy)`,
      y: widget.y + widget.h
    };
    setWidgets([...widgets, newWidget]);
  };

  // Apply template
  const applyTemplate = (template) => {
    const templateWidgets = template.widgets.map((w, i) => ({
      ...w,
      id: `widget-${Date.now()}-${i}`,
      config: {}
    }));
    setWidgets(templateWidgets);
    setDashboardName(template.name);
    setShowTemplates(false);
  };

  // Save dashboard
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/analytics/dashboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': 'default'
        },
        body: JSON.stringify({
          name: dashboardName,
          widgets,
          layout: 'grid'
        })
      });

      if (res.ok) {
        // Show success feedback
      }
    } catch (error) {
      console.error('Error saving dashboard:', error);
    } finally {
      setSaving(false);
    }
  };

  // Get widget icon
  const getWidgetIcon = (type) => {
    const widget = widgetTypes.find(w => w.id === type);
    return widget?.icon || LayoutGrid;
  };

  // Render widget preview
  const renderWidgetPreview = (widget) => {
    const Icon = getWidgetIcon(widget.type);

    switch (widget.type) {
      case 'kpi':
        return (
          <div className="widget-kpi-preview">
            <span className="kpi-value">1,234</span>
            <span className="kpi-label">{widget.title}</span>
          </div>
        );

      case 'bar-chart':
        return (
          <div className="widget-chart-preview">
            <div className="chart-bars">
              <div className="bar" style={{ height: '60%' }} />
              <div className="bar" style={{ height: '80%' }} />
              <div className="bar" style={{ height: '45%' }} />
              <div className="bar" style={{ height: '90%' }} />
              <div className="bar" style={{ height: '70%' }} />
            </div>
          </div>
        );

      case 'pie-chart':
        return (
          <div className="widget-chart-preview">
            <div className="pie-placeholder">
              <Icon size={32} />
            </div>
          </div>
        );

      case 'line-chart':
        return (
          <div className="widget-chart-preview">
            <svg className="line-preview" viewBox="0 0 100 50">
              <polyline
                points="0,40 20,35 40,25 60,30 80,15 100,20"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
              />
            </svg>
          </div>
        );

      case 'table':
        return (
          <div className="widget-table-preview">
            <div className="table-row header">
              <span /><span /><span />
            </div>
            <div className="table-row"><span /><span /><span /></div>
            <div className="table-row"><span /><span /><span /></div>
            <div className="table-row"><span /><span /><span /></div>
          </div>
        );

      default:
        return (
          <div className="widget-placeholder">
            <Icon size={24} />
          </div>
        );
    }
  };

  // Render template selection
  const renderTemplates = () => (
    <div className="templates-view">
      <div className="templates-header">
        <h2>Start with a Template</h2>
        <p>Choose a starting point for your dashboard</p>
      </div>

      <div className="templates-grid">
        {templates.map((template) => (
          <div
            key={template.id}
            className="template-card"
            onClick={() => applyTemplate(template)}
          >
            <div className="template-preview">
              {template.id === 'blank' ? (
                <div className="blank-template">
                  <Plus size={32} />
                </div>
              ) : (
                <div className="template-mini-grid">
                  {template.widgets.slice(0, 5).map((w, i) => (
                    <div
                      key={i}
                      className={`mini-widget ${w.type}`}
                      style={{
                        gridColumn: `span ${w.w}`,
                        gridRow: `span ${w.h}`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <h3>{template.name}</h3>
            <p>{template.description}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // Render builder
  const renderBuilder = () => (
    <div className="builder-layout">
      {/* Canvas */}
      <div className="builder-canvas">
        <div className="canvas-header">
          <input
            type="text"
            className="dashboard-name-input"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
            placeholder="Dashboard name..."
          />
          <div className="canvas-actions">
            <button
              className="canvas-btn"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? <Settings size={18} /> : <Eye size={18} />}
              {previewMode ? 'Edit' : 'Preview'}
            </button>
            <button
              className="canvas-btn primary"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className={`canvas-grid ${previewMode ? 'preview-mode' : ''}`}>
          {widgets.length === 0 ? (
            <div className="canvas-empty">
              <LayoutGrid size={48} />
              <h3>Your dashboard is empty</h3>
              <p>Add widgets to start building</p>
              <button
                className="add-first-widget"
                onClick={() => setShowWidgetPicker(true)}
              >
                <Plus size={18} />
                Add Widget
              </button>
            </div>
          ) : (
            <>
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`dashboard-widget ${selectedWidget === widget.id ? 'selected' : ''}`}
                  style={{
                    gridColumn: `span ${widget.w}`,
                    gridRow: `span ${widget.h}`
                  }}
                  onClick={() => !previewMode && setSelectedWidget(widget.id)}
                >
                  {!previewMode && (
                    <div className="widget-drag-handle">
                      <GripVertical size={14} />
                    </div>
                  )}
                  <div className="widget-header">
                    <span className="widget-title">{widget.title}</span>
                    {!previewMode && (
                      <div className="widget-quick-actions">
                        <button onClick={(e) => { e.stopPropagation(); duplicateWidget(widget); }}>
                          <Copy size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="widget-content">
                    {renderWidgetPreview(widget)}
                  </div>
                </div>
              ))}

              {!previewMode && (
                <button
                  className="add-widget-card"
                  onClick={() => setShowWidgetPicker(true)}
                >
                  <Plus size={24} />
                  <span>Add Widget</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      {selectedWidget && !previewMode && (
        <div className="widget-properties">
          <div className="properties-header">
            <h3>Widget Settings</h3>
            <button onClick={() => setSelectedWidget(null)}>
              <X size={18} />
            </button>
          </div>

          {(() => {
            const widget = widgets.find(w => w.id === selectedWidget);
            if (!widget) return null;

            return (
              <div className="properties-content">
                <div className="property-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={widget.title}
                    onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
                  />
                </div>

                <div className="property-group">
                  <label>Data Source</label>
                  <select
                    value={widget.config.dataSource || ''}
                    onChange={(e) => updateWidget(widget.id, {
                      config: { ...widget.config, dataSource: e.target.value }
                    })}
                  >
                    <option value="">Select data...</option>
                    {catalogSummary?.categories?.map(cat =>
                      cat.models?.map(model => (
                        <option key={model.id} value={model.id}>
                          {cat.name} &gt; {model.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {widget.type !== 'kpi' && (
                  <div className="property-group">
                    <label>Group By</label>
                    <select
                      value={widget.config.groupBy || ''}
                      onChange={(e) => updateWidget(widget.id, {
                        config: { ...widget.config, groupBy: e.target.value }
                      })}
                    >
                      <option value="">Select field...</option>
                      <option value="category">Category</option>
                      <option value="region">Region</option>
                      <option value="status">Status</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                )}

                <div className="property-group">
                  <label>Measure</label>
                  <select
                    value={widget.config.measure || ''}
                    onChange={(e) => updateWidget(widget.id, {
                      config: { ...widget.config, measure: e.target.value }
                    })}
                  >
                    <option value="">Select measure...</option>
                    <option value="count">Count</option>
                    <option value="sum">Sum</option>
                    <option value="average">Average</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                  </select>
                </div>

                <div className="property-group">
                  <label>Size</label>
                  <div className="size-controls">
                    <div className="size-input">
                      <span>Width</span>
                      <select
                        value={widget.w}
                        onChange={(e) => updateWidget(widget.id, { w: parseInt(e.target.value) })}
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </div>
                    <div className="size-input">
                      <span>Height</span>
                      <select
                        value={widget.h}
                        onChange={(e) => updateWidget(widget.id, { h: parseInt(e.target.value) })}
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="property-group">
                  <label>Refresh</label>
                  <select
                    value={widget.config.refresh || 'manual'}
                    onChange={(e) => updateWidget(widget.id, {
                      config: { ...widget.config, refresh: e.target.value }
                    })}
                  >
                    <option value="manual">Manual</option>
                    <option value="1min">Every minute</option>
                    <option value="5min">Every 5 minutes</option>
                    <option value="15min">Every 15 minutes</option>
                    <option value="1hour">Every hour</option>
                  </select>
                </div>

                <button
                  className="delete-widget-btn"
                  onClick={() => removeWidget(widget.id)}
                >
                  <Trash2 size={16} />
                  Delete Widget
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Widget Picker Modal */}
      {showWidgetPicker && (
        <div className="widget-picker-overlay" onClick={() => setShowWidgetPicker(false)}>
          <div className="widget-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h3>Add Widget</h3>
              <button onClick={() => setShowWidgetPicker(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="picker-grid">
              {widgetTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    className="picker-item"
                    onClick={() => addWidget(type.id)}
                  >
                    <div className="picker-icon">
                      <Icon size={24} />
                    </div>
                    <span className="picker-name">{type.name}</span>
                    <span className="picker-desc">{type.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard-builder">
      {/* Header */}
      <div className="builder-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>{showTemplates ? 'Create Dashboard' : 'Dashboard Builder'}</h1>
        {!showTemplates && (
          <button
            className="templates-btn"
            onClick={() => setShowTemplates(true)}
          >
            <Sparkles size={16} />
            Templates
          </button>
        )}
      </div>

      {/* Content */}
      <div className="builder-content">
        {showTemplates ? renderTemplates() : renderBuilder()}
      </div>
    </div>
  );
};

export default DashboardBuilder;
