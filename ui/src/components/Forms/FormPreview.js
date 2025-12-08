import React, { useState } from 'react';
import './FormPreview.css';

const FormPreview = ({ form }) => {
  const [formValues, setFormValues] = useState({});

  const handleInputChange = (fieldName, value) => {
    setFormValues({
      ...formValues,
      [fieldName]: value
    });
  };

  // Extract styling from form
  const getInputStyle = () => {
    if (!form.styling) return {};
    const { spacing, components, colors } = form.styling;
    return {
      padding: spacing?.inputPadding || undefined,
      borderRadius: components?.input?.borderRadius || undefined,
      borderWidth: components?.input?.borderWidth || undefined,
      height: components?.input?.height || undefined,
      borderColor: colors?.border || undefined,
      fontFamily: form.styling.typography?.fontFamily || undefined,
      fontSize: form.styling.typography?.fontSize?.input || undefined,
      fontWeight: form.styling.typography?.fontWeight?.input || undefined,
    };
  };

  const getLabelStyle = () => {
    if (!form.styling) return {};
    return {
      fontFamily: form.styling.typography?.fontFamily || undefined,
      fontSize: form.styling.typography?.fontSize?.label || undefined,
      fontWeight: form.styling.typography?.fontWeight?.label || undefined,
      color: form.styling.colors?.text || undefined,
    };
  };

  const getFormStyle = () => {
    if (!form.styling) return {};
    return {
      gap: form.styling.spacing?.fieldGap || undefined,
    };
  };

  const getButtonStyle = () => {
    if (!form.styling?.components?.button?.primary) return {};
    const btn = form.styling.components.button.primary;
    return {
      background: btn.background || undefined,
      color: btn.color || undefined,
      padding: btn.padding || undefined,
      borderRadius: form.styling.components?.input?.borderRadius || undefined,
    };
  };

  const renderField = (field) => {
    const value = formValues[field.name] || '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.required}
            className="preview-input"
            style={getInputStyle()}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.required}
            rows={4}
            className="preview-textarea"
            style={getInputStyle()}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
            className="preview-select"
            style={getInputStyle()}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="preview-radio-group">
            {field.options?.map((option, index) => (
              <label key={index} className="preview-radio-label">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  required={field.required}
                  className="preview-radio"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="preview-checkbox-label">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              className="preview-checkbox"
            />
            <span>{field.label}</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder || ''}
            className="preview-input"
          />
        );
    }
  };

  return (
    <div className="form-preview-container">
      <div className="preview-header">
        <h2>{form.title || form.name}</h2>
        {form.description && (
          <p className="preview-description">{form.description}</p>
        )}
      </div>

      {form.fields && form.fields.length > 0 ? (
        <form className="preview-form" style={getFormStyle()} onSubmit={(e) => e.preventDefault()}>
          {form.fields.map((field, index) => (
            <div key={index} className="preview-field-group">
              <label className="preview-label" style={getLabelStyle()}>
                {field.label}
                {field.required && <span className="required-mark">*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}
          <div className="preview-actions">
            <button type="submit" className="btn-preview-submit" style={getButtonStyle()}>
              Submit
            </button>
            <button type="button" className="btn-preview-cancel">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="preview-empty">
          <p>No fields to preview. Add fields to see the preview.</p>
        </div>
      )}
    </div>
  );
};

export default FormPreview;
