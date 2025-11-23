import React from 'react';
import './FormComponentRenderer.css';

const FormComponentRenderer = ({ component, previewMode }) => {
  const { type, fieldName, processVariable, required, properties } = component;

  // Render label for most components
  const renderLabel = () => {
    if (type === 'label' || type === 'button') return null;
    const labelText = properties?.label || fieldName;
    return (
      <label className="component-field-label">
        {labelText}
        {required && <span className="required-indicator">*</span>}
        {properties?.tooltip && (
          <span className="field-tooltip" title={properties.tooltip}> ℹ️</span>
        )}
      </label>
    );
  };

  // Render based on component type
  const renderComponent = () => {
    switch (type) {
      case 'label':
        return (
          <div
            className="rendered-label"
            style={{
              fontSize: properties?.fontSize || '14px',
              fontWeight: properties?.fontWeight || 'normal',
              color: properties?.color || '#000000',
              textAlign: properties?.alignment || 'left'
            }}
          >
            {properties?.text || fieldName}
          </div>
        );

      case 'text':
        return (
          <input
            type="text"
            className="rendered-textbox"
            placeholder={properties?.placeholder || 'Enter text'}
            disabled={!previewMode}
          />
        );

      case 'number':
        return (
          <div className="number-input-wrapper">
            {properties?.prefix && <span className="input-prefix">{properties.prefix}</span>}
            <input
              type="number"
              className="rendered-number"
              placeholder={properties?.placeholder || 'Enter number'}
              min={properties?.min}
              max={properties?.max}
              disabled={!previewMode}
            />
            {properties?.suffix && <span className="input-suffix">{properties.suffix}</span>}
          </div>
        );

      case 'date':
        return (
          <input
            type={properties?.includeTime ? 'datetime-local' : 'date'}
            className="rendered-date"
            disabled={!previewMode}
          />
        );

      case 'textarea':
        return (
          <textarea
            className="rendered-textarea"
            placeholder={properties?.placeholder || 'Enter text'}
            rows={properties?.rows || 4}
            disabled={!previewMode}
          />
        );

      case 'dropdown':
        return (
          <select className="rendered-dropdown" disabled={!previewMode}>
            <option value="">{properties?.placeholder || 'Select an option'}</option>
            {properties?.options?.map((opt, idx) => {
              // Handle both string options and object options {value, label}
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <option key={idx} value={optValue}>{optLabel}</option>
              );
            })}
          </select>
        );

      case 'radio':
        return (
          <div className={`radio-group radio-${properties?.layout || 'vertical'}`}>
            {properties?.options?.map((opt, idx) => {
              const optionValue = typeof opt === 'object' ? opt.value : opt;
              const optionLabel = typeof opt === 'object' ? opt.label : opt;
              return (
                <label key={idx} className="radio-option">
                  <input
                    type="radio"
                    name={processVariable}
                    value={optionValue}
                    disabled={!previewMode}
                  />
                  <span>{optionLabel}</span>
                </label>
              );
            })}
          </div>
        );

      case 'checkbox':
        return (
          <div className={`checkbox-group checkbox-${properties?.layout || 'vertical'}`}>
            {properties?.options?.map((opt, idx) => {
              const optionValue = typeof opt === 'object' ? opt.value : opt;
              const optionLabel = typeof opt === 'object' ? opt.label : opt;
              return (
                <label key={idx} className="checkbox-option">
                  <input
                    type="checkbox"
                    value={optionValue}
                    disabled={!previewMode}
                  />
                  <span>{optionLabel}</span>
                </label>
              );
            })}
          </div>
        );

      case 'rating':
        return (
          <div className="rating-component">
            {[...Array(properties?.maxRating || 5)].map((_, idx) => (
              <span key={idx} className="rating-item">
                {properties?.ratingType === 'heart' ? '❤️' :
                 properties?.ratingType === 'thumbs' ? '👍' : '⭐'}
              </span>
            ))}
          </div>
        );

      case 'file':
      case 'image':
        return (
          <div className="file-upload-component">
            <button className="upload-btn" disabled={!previewMode}>
              📎 Choose Files
            </button>
            <span className="upload-hint">
              {properties?.maxFiles > 1 ? `Max ${properties.maxFiles} files` : 'Single file'}
              {properties?.maxSize && ` • Max ${properties.maxSize}MB`}
            </span>
          </div>
        );

      case 'button':
        return (
          <button
            className={`rendered-button btn-${properties?.color || 'primary'} btn-${properties?.size || 'medium'}`}
            disabled={!previewMode}
          >
            {properties?.buttonText || fieldName}
          </button>
        );

      case 'slider':
        return (
          <div className="slider-component">
            <input
              type="range"
              className="rendered-slider"
              min={properties?.min || 0}
              max={properties?.max || 100}
              step={properties?.step || 1}
              disabled={!previewMode}
            />
            {properties?.showValue && (
              <span className="slider-value">{properties?.min || 0}</span>
            )}
          </div>
        );

      case 'currency':
        return (
          <div className="currency-input-wrapper">
            <span className="currency-symbol">{properties?.currencySymbol || '$'}</span>
            <input
              type="number"
              className="rendered-currency"
              placeholder="0.00"
              step="0.01"
              disabled={!previewMode}
            />
          </div>
        );

      case 'Progress Bar':
        return (
          <div className="progress-bar-component">
            <div
              className="progress-bar-fill"
              style={{
                width: `${((properties?.currentValue || 0) / (properties?.maxValue || 100)) * 100}%`,
                backgroundColor: properties?.color || '#4CAF50'
              }}
            />
            {properties?.showPercentage && (
              <span className="progress-percentage">
                {Math.round(((properties?.currentValue || 0) / (properties?.maxValue || 100)) * 100)}%
              </span>
            )}
          </div>
        );

      case 'esign':
        return (
          <div className="esign-component">
            <div
              className="esign-canvas"
              style={{
                width: properties?.canvasWidth || 400,
                height: properties?.canvasHeight || 200,
                border: '1px solid #d1d5db',
                backgroundColor: '#f9fafb'
              }}
            >
              <span className="esign-placeholder">✍️ Sign here</span>
            </div>
          </div>
        );

      case 'phoneInput':
        return (
          <div className="phone-input-wrapper">
            <select className="country-code" disabled={!previewMode}>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+91">🇮🇳 +91</option>
            </select>
            <input
              type="tel"
              className="rendered-phone"
              placeholder="Enter phone number"
              disabled={!previewMode}
            />
          </div>
        );

      case 'dataGrid':
        return (
          <div className="datagrid-component">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Column 1</th>
                  <th>Column 2</th>
                  <th>Column 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sample data</td>
                  <td>Sample data</td>
                  <td>Sample data</td>
                </tr>
              </tbody>
            </table>
          </div>
        );

      case 'section':
      case 'card':
        return (
          <div
            className="section-component"
            style={{
              backgroundColor: properties?.backgroundColor || '#ffffff',
              borderColor: properties?.borderColor || '#e5e7eb',
              borderRadius: properties?.borderRadius || '8px',
              padding: properties?.padding || '16px'
            }}
          >
            {properties?.headerText && (
              <h3 className="section-header">{properties.headerText}</h3>
            )}
            <div className="section-content">
              Drop components here
            </div>
          </div>
        );

      case 'tab':
        return (
          <div className="tabs-component">
            <div className="tabs-header">
              {properties?.tabs?.map((tab, idx) => (
                <button key={idx} className={`tab-button ${idx === 0 ? 'active' : ''}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="tabs-content">
              Tab content area
            </div>
          </div>
        );

      case 'qrcode':
        return (
          <div className="qrcode-component">
            <div className="qrcode-placeholder">
              📱 QR Code
            </div>
          </div>
        );

      case 'barcode':
        return (
          <div className="barcode-component">
            <div className="barcode-placeholder">
              📊 Barcode
            </div>
          </div>
        );

      // Default renderer for unsupported types
      default:
        return (
          <div className="component-placeholder">
            <span className="placeholder-icon">🔧</span>
            <span className="placeholder-text">{type}</span>
          </div>
        );
    }
  };

  return (
    <div className="form-component-renderer">
      {renderLabel()}
      {renderComponent()}
      {component.tooltip && !previewMode && (
        <div className="component-tooltip">Tip: {component.tooltip}</div>
      )}
    </div>
  );
};

export default FormComponentRenderer;
