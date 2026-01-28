import React, { useState } from 'react';

export default function FormRenderer({ form, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    const newErrors = {};
    (form.fields || []).forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label || field.name} is required`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            className="form-textarea"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'select':
      case 'dropdown':
        return (
          <select
            className="form-select"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
          >
            <option value="">Select {field.label}...</option>
            {(field.options || []).map((opt, i) => (
              <option key={i} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => handleChange(field.name, e.target.checked)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className="form-input"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            className="form-input"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            className="form-input"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      default:
        return (
          <input
            type="text"
            className="form-input"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {(form.fields || []).map((field, index) => (
        <div key={index} className="form-group">
          <label className="form-label">
            {field.label || field.name}
            {field.required && <span style={{ color: '#ef4444' }}> *</span>}
          </label>
          {renderField(field)}
          {errors[field.name] && (
            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
              {errors[field.name]}
            </div>
          )}
        </div>
      ))}
      <div className="modal-footer">
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          Submit
        </button>
      </div>
    </form>
  );
}