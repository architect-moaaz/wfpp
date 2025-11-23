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
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
            className="preview-select"
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
        <form className="preview-form" onSubmit={(e) => e.preventDefault()}>
          {form.fields.map((field, index) => (
            <div key={index} className="preview-field-group">
              <label className="preview-label">
                {field.label}
                {field.required && <span className="required-mark">*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}
          <div className="preview-actions">
            <button type="submit" className="btn-preview-submit">
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
