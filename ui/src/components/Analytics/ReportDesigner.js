/**
 * ReportDesigner - Create Professional Reports
 *
 * Visual report builder for non-technical users.
 * Features templates, drag-and-drop sections, and multiple export formats.
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Table2,
  BarChart3,
  Image,
  Type,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Settings,
  Download,
  Send,
  Calendar,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Save,
  FileDown,
  Mail
} from 'lucide-react';
import './ReportDesigner.css';

const ReportDesigner = ({ onBack, catalogSummary }) => {
  const [reportName, setReportName] = useState('My Report');
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Section types
  const sectionTypes = [
    {
      id: 'title',
      name: 'Title Section',
      description: 'Report title and subtitle',
      icon: Type,
      defaultContent: { title: 'Report Title', subtitle: '' }
    },
    {
      id: 'text',
      name: 'Text Block',
      description: 'Add explanatory text',
      icon: FileText,
      defaultContent: { text: '' }
    },
    {
      id: 'table',
      name: 'Data Table',
      description: 'Display data in rows and columns',
      icon: Table2,
      defaultContent: { dataSource: null, columns: [] }
    },
    {
      id: 'chart',
      name: 'Chart',
      description: 'Visualize data with charts',
      icon: BarChart3,
      defaultContent: { chartType: 'bar', dataSource: null }
    },
    {
      id: 'summary',
      name: 'Summary Box',
      description: 'Key metrics summary',
      icon: FileText,
      defaultContent: { metrics: [] }
    }
  ];

  // Report templates
  const templates = [
    {
      id: 'sales-report',
      name: 'Sales Report',
      description: 'Monthly sales performance summary',
      sections: [
        { type: 'title', content: { title: 'Monthly Sales Report', subtitle: 'Performance Summary' } },
        { type: 'summary', content: { metrics: ['Total Revenue', 'Orders', 'Average Order Value'] } },
        { type: 'chart', content: { chartType: 'bar', title: 'Sales by Region' } },
        { type: 'table', content: { title: 'Top Products' } }
      ]
    },
    {
      id: 'customer-report',
      name: 'Customer Analysis',
      description: 'Customer demographics and trends',
      sections: [
        { type: 'title', content: { title: 'Customer Analysis Report', subtitle: '' } },
        { type: 'summary', content: { metrics: ['Total Customers', 'New This Month', 'Retention Rate'] } },
        { type: 'chart', content: { chartType: 'pie', title: 'Customers by Region' } },
        { type: 'table', content: { title: 'Recent Customers' } }
      ]
    },
    {
      id: 'operations-report',
      name: 'Operations Summary',
      description: 'Workflow and task completion metrics',
      sections: [
        { type: 'title', content: { title: 'Operations Report', subtitle: 'Weekly Summary' } },
        { type: 'summary', content: { metrics: ['Active Workflows', 'Completed Tasks', 'Pending Approvals'] } },
        { type: 'chart', content: { chartType: 'line', title: 'Completion Trend' } },
        { type: 'table', content: { title: 'Task Breakdown' } }
      ]
    },
    {
      id: 'blank',
      name: 'Blank Report',
      description: 'Start from scratch',
      sections: []
    }
  ];

  // Add section
  const addSection = (type) => {
    const sectionType = sectionTypes.find(s => s.id === type);
    const newSection = {
      id: `section-${Date.now()}`,
      type,
      content: { ...sectionType?.defaultContent }
    };
    setSections([...sections, newSection]);
    setSelectedSection(newSection.id);
    setShowSectionPicker(false);
  };

  // Remove section
  const removeSection = (sectionId) => {
    setSections(sections.filter(s => s.id !== sectionId));
    if (selectedSection === sectionId) {
      setSelectedSection(null);
    }
  };

  // Update section
  const updateSection = (sectionId, updates) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, content: { ...s.content, ...updates } } : s
    ));
  };

  // Move section
  const moveSection = (sectionId, direction) => {
    const index = sections.findIndex(s => s.id === sectionId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
  };

  // Apply template
  const applyTemplate = (template) => {
    const templateSections = template.sections.map((s, i) => ({
      ...s,
      id: `section-${Date.now()}-${i}`
    }));
    setSections(templateSections);
    setReportName(template.name);
    setShowTemplates(false);
  };

  // Get section icon
  const getSectionIcon = (type) => {
    const section = sectionTypes.find(s => s.id === type);
    return section?.icon || FileText;
  };

  // Render section preview
  const renderSectionPreview = (section) => {
    switch (section.type) {
      case 'title':
        return (
          <div className="section-preview title-preview">
            <h2>{section.content.title || 'Report Title'}</h2>
            {section.content.subtitle && <p>{section.content.subtitle}</p>}
          </div>
        );

      case 'text':
        return (
          <div className="section-preview text-preview">
            <p>{section.content.text || 'Click to add text content...'}</p>
          </div>
        );

      case 'table':
        return (
          <div className="section-preview table-preview">
            <div className="table-placeholder">
              <Table2 size={24} />
              <span>{section.content.title || 'Data Table'}</span>
            </div>
          </div>
        );

      case 'chart':
        return (
          <div className="section-preview chart-preview">
            <div className="chart-placeholder">
              <BarChart3 size={24} />
              <span>{section.content.title || 'Chart'}</span>
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className="section-preview summary-preview">
            {(section.content.metrics || []).map((metric, i) => (
              <div key={i} className="summary-metric">
                <span className="metric-value">--</span>
                <span className="metric-label">{metric}</span>
              </div>
            ))}
            {(!section.content.metrics || section.content.metrics.length === 0) && (
              <span className="placeholder-text">Add metrics to display</span>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Render templates view
  const renderTemplates = () => (
    <div className="templates-view">
      <div className="templates-header">
        <h2>Choose a Template</h2>
        <p>Start with a pre-built report layout</p>
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
                <div className="template-sections">
                  {template.sections.slice(0, 4).map((s, i) => {
                    const Icon = getSectionIcon(s.type);
                    return (
                      <div key={i} className={`mini-section ${s.type}`}>
                        <Icon size={14} />
                      </div>
                    );
                  })}
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

  // Render designer
  const renderDesigner = () => (
    <div className="designer-layout">
      {/* Report Canvas */}
      <div className="report-canvas">
        <div className="canvas-header">
          <input
            type="text"
            className="report-name-input"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            placeholder="Report name..."
          />
          <div className="canvas-actions">
            <button
              className="canvas-btn"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye size={18} />
              {previewMode ? 'Edit' : 'Preview'}
            </button>
            <button
              className="canvas-btn"
              onClick={() => setShowScheduler(true)}
            >
              <Calendar size={18} />
              Schedule
            </button>
            <button
              className="canvas-btn primary"
              onClick={() => setShowExportOptions(true)}
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        <div className={`report-paper ${previewMode ? 'preview-mode' : ''}`}>
          {sections.length === 0 ? (
            <div className="paper-empty">
              <FileText size={48} />
              <h3>Your report is empty</h3>
              <p>Add sections to build your report</p>
              <button
                className="add-first-section"
                onClick={() => setShowSectionPicker(true)}
              >
                <Plus size={18} />
                Add Section
              </button>
            </div>
          ) : (
            <>
              {sections.map((section, index) => (
                <div
                  key={section.id}
                  className={`report-section ${selectedSection === section.id ? 'selected' : ''}`}
                  onClick={() => !previewMode && setSelectedSection(section.id)}
                >
                  {!previewMode && (
                    <div className="section-controls">
                      <div className="section-drag">
                        <GripVertical size={14} />
                      </div>
                      <div className="section-move">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'up'); }}
                          disabled={index === 0}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveSection(section.id, 'down'); }}
                          disabled={index === sections.length - 1}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                      <button
                        className="section-delete"
                        onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                  {renderSectionPreview(section)}
                </div>
              ))}

              {!previewMode && (
                <button
                  className="add-section-btn"
                  onClick={() => setShowSectionPicker(true)}
                >
                  <Plus size={18} />
                  Add Section
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      {selectedSection && !previewMode && (
        <div className="section-properties">
          <div className="properties-header">
            <h3>Section Settings</h3>
            <button onClick={() => setSelectedSection(null)}>
              <X size={18} />
            </button>
          </div>

          {(() => {
            const section = sections.find(s => s.id === selectedSection);
            if (!section) return null;

            return (
              <div className="properties-content">
                {/* Title Section Settings */}
                {section.type === 'title' && (
                  <>
                    <div className="property-group">
                      <label>Title</label>
                      <input
                        type="text"
                        value={section.content.title || ''}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        placeholder="Enter title..."
                      />
                    </div>
                    <div className="property-group">
                      <label>Subtitle</label>
                      <input
                        type="text"
                        value={section.content.subtitle || ''}
                        onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                        placeholder="Optional subtitle..."
                      />
                    </div>
                  </>
                )}

                {/* Text Section Settings */}
                {section.type === 'text' && (
                  <div className="property-group">
                    <label>Content</label>
                    <textarea
                      value={section.content.text || ''}
                      onChange={(e) => updateSection(section.id, { text: e.target.value })}
                      placeholder="Enter text content..."
                      rows={6}
                    />
                  </div>
                )}

                {/* Table Section Settings */}
                {section.type === 'table' && (
                  <>
                    <div className="property-group">
                      <label>Table Title</label>
                      <input
                        type="text"
                        value={section.content.title || ''}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        placeholder="Table title..."
                      />
                    </div>
                    <div className="property-group">
                      <label>Data Source</label>
                      <select
                        value={section.content.dataSource || ''}
                        onChange={(e) => updateSection(section.id, { dataSource: e.target.value })}
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
                    <div className="property-group">
                      <label>Row Limit</label>
                      <select
                        value={section.content.limit || '10'}
                        onChange={(e) => updateSection(section.id, { limit: e.target.value })}
                      >
                        <option value="5">5 rows</option>
                        <option value="10">10 rows</option>
                        <option value="25">25 rows</option>
                        <option value="50">50 rows</option>
                        <option value="100">100 rows</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Chart Section Settings */}
                {section.type === 'chart' && (
                  <>
                    <div className="property-group">
                      <label>Chart Title</label>
                      <input
                        type="text"
                        value={section.content.title || ''}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        placeholder="Chart title..."
                      />
                    </div>
                    <div className="property-group">
                      <label>Chart Type</label>
                      <select
                        value={section.content.chartType || 'bar'}
                        onChange={(e) => updateSection(section.id, { chartType: e.target.value })}
                      >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="pie">Pie Chart</option>
                        <option value="area">Area Chart</option>
                      </select>
                    </div>
                    <div className="property-group">
                      <label>Data Source</label>
                      <select
                        value={section.content.dataSource || ''}
                        onChange={(e) => updateSection(section.id, { dataSource: e.target.value })}
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
                  </>
                )}

                {/* Summary Section Settings */}
                {section.type === 'summary' && (
                  <div className="property-group">
                    <label>Metrics</label>
                    <div className="metrics-list">
                      {(section.content.metrics || []).map((metric, i) => (
                        <div key={i} className="metric-item">
                          <input
                            type="text"
                            value={metric}
                            onChange={(e) => {
                              const newMetrics = [...section.content.metrics];
                              newMetrics[i] = e.target.value;
                              updateSection(section.id, { metrics: newMetrics });
                            }}
                          />
                          <button onClick={() => {
                            const newMetrics = section.content.metrics.filter((_, idx) => idx !== i);
                            updateSection(section.id, { metrics: newMetrics });
                          }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        className="add-metric-btn"
                        onClick={() => {
                          const newMetrics = [...(section.content.metrics || []), 'New Metric'];
                          updateSection(section.id, { metrics: newMetrics });
                        }}
                      >
                        <Plus size={14} />
                        Add Metric
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className="delete-section-btn"
                  onClick={() => removeSection(section.id)}
                >
                  <Trash2 size={16} />
                  Delete Section
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Section Picker Modal */}
      {showSectionPicker && (
        <div className="modal-overlay" onClick={() => setShowSectionPicker(false)}>
          <div className="section-picker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h3>Add Section</h3>
              <button onClick={() => setShowSectionPicker(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="picker-grid">
              {sectionTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    className="picker-item"
                    onClick={() => addSection(type.id)}
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

      {/* Export Options Modal */}
      {showExportOptions && (
        <div className="modal-overlay" onClick={() => setShowExportOptions(false)}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Export Report</h3>
              <button onClick={() => setShowExportOptions(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="export-options">
              <button className="export-option">
                <FileDown size={24} />
                <span className="export-name">PDF</span>
                <span className="export-desc">Best for sharing and printing</span>
              </button>
              <button className="export-option">
                <Table2 size={24} />
                <span className="export-name">Excel</span>
                <span className="export-desc">Editable spreadsheet format</span>
              </button>
              <button className="export-option">
                <FileText size={24} />
                <span className="export-name">Word</span>
                <span className="export-desc">Editable document format</span>
              </button>
              <button className="export-option">
                <Mail size={24} />
                <span className="export-name">Email</span>
                <span className="export-desc">Send report via email</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduler Modal */}
      {showScheduler && (
        <div className="modal-overlay" onClick={() => setShowScheduler(false)}>
          <div className="scheduler-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Schedule Report</h3>
              <button onClick={() => setShowScheduler(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="scheduler-content">
              <div className="property-group">
                <label>Frequency</label>
                <select>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="property-group">
                <label>Time</label>
                <input type="time" defaultValue="09:00" />
              </div>
              <div className="property-group">
                <label>Send to</label>
                <input type="email" placeholder="email@example.com" />
              </div>
              <div className="property-group">
                <label>Format</label>
                <select>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
              </div>
              <button className="schedule-btn">
                <Calendar size={16} />
                Schedule Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="report-designer">
      {/* Header */}
      <div className="designer-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>{showTemplates ? 'Create Report' : 'Report Designer'}</h1>
        {!showTemplates && (
          <button
            className="templates-btn"
            onClick={() => setShowTemplates(true)}
          >
            Templates
          </button>
        )}
      </div>

      {/* Content */}
      <div className="designer-content">
        {showTemplates ? renderTemplates() : renderDesigner()}
      </div>
    </div>
  );
};

export default ReportDesigner;
