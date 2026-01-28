import React, { useState, useEffect } from 'react';
import { Palette, Type, Ruler, RotateCcw, Save, Eye } from 'lucide-react';
import './DesignCustomizer.css';

const DEFAULT_DESIGN_TOKENS = {
  colors: {
    primary: '#1a1a1a',
    secondary: '#374151',
    background: '#f5f5f5',
    cardBackground: '#ffffff',
    cardBorder: '#e8e8e8',
    text: '#1a1a1a',
    textSecondary: '#6b7280',
    labelText: '#374151',
    border: '#d1d5db',
    focus: '#000000',
    info: '#3b82f6',
    infoBackground: '#f0f9ff',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b'
  },
  typography: {
    fontFamily: 'Inter',
    pageTitle: { size: '28px', weight: 600 },
    sectionHeader: { size: '16px', weight: 600 },
    fieldLabel: { size: '14px', weight: 500 },
    inputText: { size: '14px', weight: 400 },
    buttonText: { size: '14px', weight: 500 }
  },
  spacing: {
    unit: '8px',
    sectionPadding: '24px',
    fieldGap: '16px',
    sectionGap: '16px',
    containerMaxWidth: '800px'
  },
  borderRadius: {
    card: '8px',
    input: '6px',
    button: '6px'
  }
};

const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Poppins',
  'Source Sans Pro',
  'Nunito',
  'Montserrat',
  'Raleway',
  'Work Sans'
];

const DesignCustomizer = ({ application, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState('colors');
  const [designTokens, setDesignTokens] = useState(DEFAULT_DESIGN_TOKENS);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    // Load existing theme from application if available
    if (application?.theme) {
      const merged = {
        colors: { ...DEFAULT_DESIGN_TOKENS.colors, ...application.theme.colors },
        typography: { ...DEFAULT_DESIGN_TOKENS.typography, ...application.theme.typography },
        spacing: { ...DEFAULT_DESIGN_TOKENS.spacing, ...application.theme.spacing },
        borderRadius: { ...DEFAULT_DESIGN_TOKENS.borderRadius, ...application.theme.borderRadius }
      };
      setDesignTokens(merged);
    }
  }, [application]);

  const updateColor = (key, value) => {
    setDesignTokens(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateTypography = (key, field, value) => {
    setDesignTokens(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        [key]: typeof prev.typography[key] === 'object'
          ? { ...prev.typography[key], [field]: value }
          : value
      }
    }));
    setHasChanges(true);
  };

  const updateSpacing = (key, value) => {
    setDesignTokens(prev => ({
      ...prev,
      spacing: { ...prev.spacing, [key]: value }
    }));
    setHasChanges(true);
  };

  const updateBorderRadius = (key, value) => {
    setDesignTokens(prev => ({
      ...prev,
      borderRadius: { ...prev.borderRadius, [key]: value }
    }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setDesignTokens(DEFAULT_DESIGN_TOKENS);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(designTokens);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save design:', err);
    } finally {
      setSaving(false);
    }
  };

  const colorGroups = [
    {
      title: 'Primary Colors',
      colors: [
        { key: 'primary', label: 'Primary' },
        { key: 'secondary', label: 'Secondary' }
      ]
    },
    {
      title: 'Background',
      colors: [
        { key: 'background', label: 'Page Background' },
        { key: 'cardBackground', label: 'Card Background' },
        { key: 'cardBorder', label: 'Card Border' }
      ]
    },
    {
      title: 'Text',
      colors: [
        { key: 'text', label: 'Primary Text' },
        { key: 'textSecondary', label: 'Secondary Text' },
        { key: 'labelText', label: 'Label Text' }
      ]
    },
    {
      title: 'Form Elements',
      colors: [
        { key: 'border', label: 'Input Border' },
        { key: 'focus', label: 'Focus Color' }
      ]
    },
    {
      title: 'Status Colors',
      colors: [
        { key: 'info', label: 'Info' },
        { key: 'infoBackground', label: 'Info Background' },
        { key: 'success', label: 'Success' },
        { key: 'error', label: 'Error' },
        { key: 'warning', label: 'Warning' }
      ]
    }
  ];

  const renderColorsTab = () => (
    <div className="design-tab-content">
      {colorGroups.map(group => (
        <div key={group.title} className="color-group">
          <h4>{group.title}</h4>
          <div className="color-grid">
            {group.colors.map(({ key, label }) => (
              <div key={key} className="color-item">
                <label>{label}</label>
                <div className="color-input-wrapper">
                  <input
                    type="color"
                    value={designTokens.colors[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={designTokens.colors[key]}
                    onChange={(e) => updateColor(key, e.target.value)}
                    className="color-text"
                    placeholder="#000000"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderTypographyTab = () => (
    <div className="design-tab-content">
      <div className="typography-group">
        <h4>Font Family</h4>
        <select
          value={designTokens.typography.fontFamily}
          onChange={(e) => updateTypography('fontFamily', null, e.target.value)}
          className="font-select"
        >
          {FONT_OPTIONS.map(font => (
            <option key={font} value={font}>{font}</option>
          ))}
        </select>
      </div>

      <div className="typography-group">
        <h4>Text Styles</h4>
        <div className="typography-grid">
          {[
            { key: 'pageTitle', label: 'Page Title' },
            { key: 'sectionHeader', label: 'Section Header' },
            { key: 'fieldLabel', label: 'Field Label' },
            { key: 'inputText', label: 'Input Text' },
            { key: 'buttonText', label: 'Button Text' }
          ].map(({ key, label }) => (
            <div key={key} className="typography-item">
              <label>{label}</label>
              <div className="typography-inputs">
                <div className="input-group">
                  <span className="input-label">Size</span>
                  <input
                    type="text"
                    value={designTokens.typography[key]?.size || '14px'}
                    onChange={(e) => updateTypography(key, 'size', e.target.value)}
                    placeholder="14px"
                  />
                </div>
                <div className="input-group">
                  <span className="input-label">Weight</span>
                  <select
                    value={designTokens.typography[key]?.weight || 400}
                    onChange={(e) => updateTypography(key, 'weight', parseInt(e.target.value))}
                  >
                    <option value={300}>Light (300)</option>
                    <option value={400}>Regular (400)</option>
                    <option value={500}>Medium (500)</option>
                    <option value={600}>Semibold (600)</option>
                    <option value={700}>Bold (700)</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSpacingTab = () => (
    <div className="design-tab-content">
      <div className="spacing-group">
        <h4>Spacing</h4>
        <div className="spacing-grid">
          {[
            { key: 'unit', label: 'Base Unit' },
            { key: 'sectionPadding', label: 'Section Padding' },
            { key: 'fieldGap', label: 'Field Gap' },
            { key: 'sectionGap', label: 'Section Gap' },
            { key: 'containerMaxWidth', label: 'Container Max Width' }
          ].map(({ key, label }) => (
            <div key={key} className="spacing-item">
              <label>{label}</label>
              <input
                type="text"
                value={designTokens.spacing[key]}
                onChange={(e) => updateSpacing(key, e.target.value)}
                placeholder="8px"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="spacing-group">
        <h4>Border Radius</h4>
        <div className="spacing-grid">
          {[
            { key: 'card', label: 'Card Radius' },
            { key: 'input', label: 'Input Radius' },
            { key: 'button', label: 'Button Radius' }
          ].map(({ key, label }) => (
            <div key={key} className="spacing-item">
              <label>{label}</label>
              <input
                type="text"
                value={designTokens.borderRadius[key]}
                onChange={(e) => updateBorderRadius(key, e.target.value)}
                placeholder="8px"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Load Google Font dynamically when font family changes
  useEffect(() => {
    const fontFamily = designTokens.typography.fontFamily;
    if (fontFamily && fontFamily !== 'Inter') {
      const fontName = fontFamily.replace(/\s+/g, '+');
      const linkId = `google-font-${fontName}`;

      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [designTokens.typography.fontFamily]);

  const renderPreview = () => (
    <div
      className="design-preview"
      style={{
        '--preview-primary': designTokens.colors.primary,
        '--preview-secondary': designTokens.colors.secondary,
        '--preview-background': designTokens.colors.background,
        '--preview-card-bg': designTokens.colors.cardBackground,
        '--preview-card-border': designTokens.colors.cardBorder,
        '--preview-text': designTokens.colors.text,
        '--preview-text-secondary': designTokens.colors.textSecondary,
        '--preview-border': designTokens.colors.border,
        '--preview-info': designTokens.colors.info,
        '--preview-success': designTokens.colors.success,
        '--preview-error': designTokens.colors.error,
        '--preview-radius-card': designTokens.borderRadius.card,
        '--preview-radius-input': designTokens.borderRadius.input,
        '--preview-radius-button': designTokens.borderRadius.button,
        '--preview-section-padding': designTokens.spacing.sectionPadding,
        '--preview-field-gap': designTokens.spacing.fieldGap,
        '--preview-section-gap': designTokens.spacing.sectionGap,
        '--preview-container-max-width': designTokens.spacing.containerMaxWidth,
        '--preview-input-size': designTokens.typography.inputText?.size,
        '--preview-input-weight': designTokens.typography.inputText?.weight,
        '--preview-button-size': designTokens.typography.buttonText?.size,
        '--preview-button-weight': designTokens.typography.buttonText?.weight,
        fontFamily: `"${designTokens.typography.fontFamily}", -apple-system, BlinkMacSystemFont, sans-serif`
      }}
    >
      <div className="preview-page" style={{ maxWidth: designTokens.spacing.containerMaxWidth }}>
        <div className="preview-header" style={{ marginBottom: designTokens.spacing.sectionGap }}>
          <h1 style={{ fontSize: designTokens.typography.pageTitle?.size, fontWeight: designTokens.typography.pageTitle?.weight }}>
            Sample Form
          </h1>
          <p>Preview your design changes</p>
        </div>
        <div className="preview-card" style={{ padding: designTokens.spacing.sectionPadding }}>
          <h3 style={{ fontSize: designTokens.typography.sectionHeader?.size, fontWeight: designTokens.typography.sectionHeader?.weight, marginBottom: designTokens.spacing.fieldGap }}>
            Contact Information
          </h3>
          <div className="preview-form" style={{ gap: designTokens.spacing.fieldGap }}>
            <div className="preview-field">
              <label style={{ fontSize: designTokens.typography.fieldLabel?.size, fontWeight: designTokens.typography.fieldLabel?.weight }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                readOnly
                style={{
                  fontSize: designTokens.typography.inputText?.size,
                  fontWeight: designTokens.typography.inputText?.weight
                }}
              />
            </div>
            <div className="preview-field">
              <label style={{ fontSize: designTokens.typography.fieldLabel?.size, fontWeight: designTokens.typography.fieldLabel?.weight }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                readOnly
                style={{
                  fontSize: designTokens.typography.inputText?.size,
                  fontWeight: designTokens.typography.inputText?.weight
                }}
              />
            </div>
          </div>
          <div className="preview-actions" style={{ marginTop: designTokens.spacing.fieldGap }}>
            <button
              className="preview-btn-secondary"
              style={{ fontSize: designTokens.typography.buttonText?.size, fontWeight: designTokens.typography.buttonText?.weight }}
            >
              Cancel
            </button>
            <button
              className="preview-btn-primary"
              style={{ fontSize: designTokens.typography.buttonText?.size, fontWeight: designTokens.typography.buttonText?.weight }}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="design-customizer">
      <div className="design-customizer-header">
        <h3>Design Customization</h3>
        <p>Customize colors, typography, and spacing for your application</p>
      </div>

      <div className="design-tabs">
        <button
          className={`design-tab ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          <Palette size={16} />
          Colors
        </button>
        <button
          className={`design-tab ${activeTab === 'typography' ? 'active' : ''}`}
          onClick={() => setActiveTab('typography')}
        >
          <Type size={16} />
          Typography
        </button>
        <button
          className={`design-tab ${activeTab === 'spacing' ? 'active' : ''}`}
          onClick={() => setActiveTab('spacing')}
        >
          <Ruler size={16} />
          Spacing
        </button>
        <button
          className={`design-tab preview-tab ${showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye size={16} />
          Preview
        </button>
      </div>

      <div className="design-content-wrapper">
        <div className={`design-editor ${showPreview ? 'with-preview' : ''}`}>
          {activeTab === 'colors' && renderColorsTab()}
          {activeTab === 'typography' && renderTypographyTab()}
          {activeTab === 'spacing' && renderSpacingTab()}
        </div>

        {showPreview && renderPreview()}
      </div>

      <div className="design-actions">
        <button className="reset-btn" onClick={handleReset}>
          <RotateCcw size={16} />
          Reset to Default
        </button>
        <div className="action-buttons">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesignCustomizer;
