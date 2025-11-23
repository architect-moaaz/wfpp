import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import './PropertiesPanel.css';

const PropertiesPanel = ({ component, onUpdate, onClose }) => {
  const [localComponent, setLocalComponent] = useState(component);

  useEffect(() => {
    setLocalComponent(component);
  }, [component]);

  const handlePropertyChange = (property, value) => {
    const updated = {
      ...localComponent,
      [property]: value
    };
    setLocalComponent(updated);
    onUpdate(updated);
  };

  const handleNestedPropertyChange = (parentKey, property, value) => {
    const updated = {
      ...localComponent,
      [parentKey]: {
        ...localComponent[parentKey],
        [property]: value
      }
    };
    setLocalComponent(updated);
    onUpdate(updated);
  };

  const renderPropertyInput = (key, value, onChange) => {
    // Boolean properties
    if (typeof value === 'boolean') {
      return (
        <div className="property-field">
          <label className="property-label">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => onChange(key, e.target.checked)}
            />
            <span>{formatLabel(key)}</span>
          </label>
        </div>
      );
    }

    // Number properties
    if (typeof value === 'number' || key.includes('min') || key.includes('max') || key.includes('size')) {
      return (
        <div className="property-field">
          <label className="property-label">{formatLabel(key)}</label>
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
            className="property-input"
          />
        </div>
      );
    }

    // Array properties (like options)
    if (Array.isArray(value)) {
      return (
        <div className="property-field">
          <label className="property-label">{formatLabel(key)}</label>
          <textarea
            value={value.join('\n')}
            onChange={(e) => onChange(key, e.target.value.split('\n'))}
            className="property-textarea"
            rows={4}
            placeholder="One option per line"
          />
        </div>
      );
    }

    // Select properties
    if (key === 'layout' || key === 'alignment' || key === 'ratingType') {
      const options = getSelectOptions(key);
      return (
        <div className="property-field">
          <label className="property-label">{formatLabel(key)}</label>
          <select
            value={value || ''}
            onChange={(e) => onChange(key, e.target.value)}
            className="property-select"
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    // Color properties
    if (key.includes('color') || key.includes('Color')) {
      return (
        <div className="property-field">
          <label className="property-label">{formatLabel(key)}</label>
          <div className="color-input-wrapper">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => onChange(key, e.target.value)}
              className="property-color"
            />
            <input
              type="text"
              value={value || '#000000'}
              onChange={(e) => onChange(key, e.target.value)}
              className="property-input"
              placeholder="#000000"
            />
          </div>
        </div>
      );
    }

    // Default text input
    return (
      <div className="property-field">
        <label className="property-label">{formatLabel(key)}</label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(key, e.target.value)}
          className="property-input"
        />
      </div>
    );
  };

  const formatLabel = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getSelectOptions = (key) => {
    const optionsMap = {
      layout: [
        { value: 'vertical', label: 'Vertical' },
        { value: 'horizontal', label: 'Horizontal' }
      ],
      alignment: [
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' }
      ],
      ratingType: [
        { value: 'star', label: 'Star' },
        { value: 'heart', label: 'Heart' },
        { value: 'thumbs', label: 'Thumbs Up' }
      ]
    };
    return optionsMap[key] || [];
  };

  return (
    <div className="properties-panel">
      <div className="properties-header">
        <div className="header-title">
          <Settings size={18} />
          <span>Properties</span>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="properties-content">
        {/* Basic Properties */}
        <div className="property-section">
          <h4 className="section-title">Basic</h4>

          {renderPropertyInput('fieldName', localComponent.fieldName, handlePropertyChange)}
          {renderPropertyInput('processVariable', localComponent.processVariable, handlePropertyChange)}
          {renderPropertyInput('required', localComponent.required, handlePropertyChange)}
        </div>

        {/* Component-specific Properties */}
        {localComponent.properties && Object.keys(localComponent.properties).length > 0 && (
          <div className="property-section">
            <h4 className="section-title">Component Settings</h4>
            {Object.entries(localComponent.properties).map(([key, value]) => (
              <div key={key}>
                {renderPropertyInput(key, value, (k, v) =>
                  handleNestedPropertyChange('properties', k, v)
                )}
              </div>
            ))}
          </div>
        )}

        {/* Validation */}
        <div className="property-section">
          <h4 className="section-title">Validation</h4>
          <div className="property-field">
            <label className="property-label">
              <input
                type="checkbox"
                checked={localComponent.required || false}
                onChange={(e) => handlePropertyChange('required', e.target.checked)}
              />
              <span>Required Field</span>
            </label>
          </div>
        </div>

        {/* Styling */}
        <div className="property-section">
          <h4 className="section-title">Styling</h4>
          <div className="property-field">
            <label className="property-label">Tooltip</label>
            <input
              type="text"
              value={localComponent.tooltip || ''}
              onChange={(e) => handlePropertyChange('tooltip', e.target.value)}
              className="property-input"
              placeholder="Help text on hover"
            />
          </div>
        </div>

        {/* Accessibility */}
        <div className="property-section">
          <h4 className="section-title">Visibility</h4>
          <div className="property-field">
            <label className="property-label">
              <input
                type="checkbox"
                checked={localComponent.hideOnMobile || false}
                onChange={(e) => handlePropertyChange('hideOnMobile', e.target.checked)}
              />
              <span>Hide on Mobile</span>
            </label>
          </div>
          <div className="property-field">
            <label className="property-label">
              <input
                type="checkbox"
                checked={localComponent.hideOnWeb || false}
                onChange={(e) => handlePropertyChange('hideOnWeb', e.target.checked)}
              />
              <span>Hide on Web</span>
            </label>
          </div>
        </div>
      </div>

      <div className="properties-footer">
        <div className="component-id">ID: {localComponent.id}</div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
