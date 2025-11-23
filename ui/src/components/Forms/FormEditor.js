import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Eye, Edit2 } from 'lucide-react';
import FormPreview from './FormPreview';
import './FormEditor.css';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Select Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkbox' }
];

const FormEditor = ({ form, onClose }) => {
  const [formData, setFormData] = useState(form || {
    name: '',
    title: '',
    description: '',
    fields: []
  });

  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'preview'

  const handleFieldChange = (index, field, value) => {
    const newFields = [...formData.fields];
    newFields[index] = { ...newFields[index], [field]: value };
    setFormData({ ...formData, fields: newFields });
  };

  const handleAddField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      name: `field_${formData.fields.length + 1}`,
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: ''
    };

    setFormData({
      ...formData,
      fields: [...formData.fields, newField]
    });
  };

  const handleRemoveField = (index) => {
    const newFields = formData.fields.filter((_, i) => i !== index);
    setFormData({ ...formData, fields: newFields });
  };

  const handleAddOption = (fieldIndex) => {
    const newFields = [...formData.fields];
    if (!newFields[fieldIndex].options) {
      newFields[fieldIndex].options = [];
    }
    newFields[fieldIndex].options.push({
      value: `option_${newFields[fieldIndex].options.length + 1}`,
      label: 'New Option'
    });
    setFormData({ ...formData, fields: newFields });
  };

  const handleRemoveOption = (fieldIndex, optionIndex) => {
    const newFields = [...formData.fields];
    newFields[fieldIndex].options = newFields[fieldIndex].options.filter((_, i) => i !== optionIndex);
    setFormData({ ...formData, fields: newFields });
  };

  const handleOptionChange = (fieldIndex, optionIndex, field, value) => {
    const newFields = [...formData.fields];
    newFields[fieldIndex].options[optionIndex][field] = value;
    setFormData({ ...formData, fields: newFields });
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name || !formData.title) {
      alert('Please fill in name and title');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...formData,
        id: formData.id || `form_${Date.now()}`
      };

      const response = await fetch('http://localhost:5000/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        onClose();
      } else {
        alert('Failed to save form: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save form:', error);
      alert('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const needsOptions = (type) => {
    return type === 'select' || type === 'radio';
  };

  return (
    <div className="form-editor-container">
      <div className="form-editor-header">
        <button className="btn-back" onClick={onClose}>
          <ArrowLeft size={20} />
          Back to Forms
        </button>
        <div className="header-actions">
          <div className="view-mode-toggle">
            <button
              className={`btn-view-mode ${viewMode === 'edit' ? 'active' : ''}`}
              onClick={() => setViewMode('edit')}
            >
              <Edit2 size={16} />
              Edit
            </button>
            <button
              className={`btn-view-mode ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => setViewMode('preview')}
            >
              <Eye size={16} />
              Preview
            </button>
          </div>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Form'}
          </button>
        </div>
      </div>

      {viewMode === 'edit' ? (
        <div className="form-editor-content">
          <div className="editor-section">
          <h2>Form Details</h2>
          <div className="form-group">
            <label>Form Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., loan_approval_form"
            />
            <span className="help-text">Unique identifier for the form</span>
          </div>

          <div className="form-group">
            <label>Form Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Loan Approval Form"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this form is for"
              rows={3}
            />
          </div>
        </div>

        <div className="editor-section">
          <div className="section-header">
            <h2>Form Fields</h2>
            <button className="btn-add-field" onClick={handleAddField}>
              <Plus size={18} />
              Add Field
            </button>
          </div>

          {formData.fields.length === 0 ? (
            <div className="no-fields">
              <p>No fields yet. Click "Add Field" to create one.</p>
            </div>
          ) : (
            <div className="fields-list">
              {formData.fields.map((field, index) => (
                <div key={index} className="field-editor">
                  <div className="field-header">
                    <GripVertical size={16} className="drag-handle" />
                    <span className="field-number">Field {index + 1}</span>
                    <button
                      className="btn-remove-field"
                      onClick={() => handleRemoveField(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="field-grid">
                    <div className="form-group">
                      <label>Field Name</label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                        placeholder="field_name"
                      />
                    </div>

                    <div className="form-group">
                      <label>Label</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                        placeholder="Field Label"
                      />
                    </div>

                    <div className="form-group">
                      <label>Field Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                      >
                        {FIELD_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
                        />
                        Required
                      </label>
                    </div>

                    <div className="form-group full-width">
                      <label>Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => handleFieldChange(index, 'placeholder', e.target.value)}
                        placeholder="Enter placeholder text"
                      />
                    </div>

                    {needsOptions(field.type) && (
                      <div className="form-group full-width">
                        <div className="options-header">
                          <label>Options</label>
                          <button
                            className="btn-add-option"
                            onClick={() => handleAddOption(index)}
                          >
                            <Plus size={14} />
                            Add Option
                          </button>
                        </div>
                        <div className="options-list">
                          {field.options?.map((option, optIndex) => (
                            <div key={optIndex} className="option-item">
                              <input
                                type="text"
                                value={option.value}
                                onChange={(e) => handleOptionChange(index, optIndex, 'value', e.target.value)}
                                placeholder="value"
                              />
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) => handleOptionChange(index, optIndex, 'label', e.target.value)}
                                placeholder="Label"
                              />
                              <button
                                className="btn-remove-option"
                                onClick={() => handleRemoveOption(index, optIndex)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      ) : (
        <FormPreview form={formData} />
      )}
    </div>
  );
};

export default FormEditor;
