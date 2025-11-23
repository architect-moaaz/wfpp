import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import './DataModelEditor.css';

const FIELD_TYPES = [
  'string', 'number', 'boolean', 'datetime', 'date', 'time', 'json', 'text'
];

const DataModelEditor = ({ model, onClose }) => {
  const [modelData, setModelData] = useState(model || {
    name: '',
    displayName: '',
    description: '',
    fields: [],
    relationships: []
  });

  const [saving, setSaving] = useState(false);

  const handleAddField = () => {
    const newField = {
      name: `field_${modelData.fields.length + 1}`,
      type: 'string',
      required: false,
      description: ''
    };

    setModelData({
      ...modelData,
      fields: [...modelData.fields, newField]
    });
  };

  const handleRemoveField = (index) => {
    const newFields = modelData.fields.filter((_, i) => i !== index);
    setModelData({ ...modelData, fields: newFields });
  };

  const handleFieldChange = (index, field, value) => {
    const newFields = [...modelData.fields];
    newFields[index] = { ...newFields[index], [field]: value };
    setModelData({ ...modelData, fields: newFields });
  };

  const handleSave = async () => {
    // Validation
    if (!modelData.name || !modelData.displayName) {
      alert('Please fill in name and display name');
      return;
    }

    if (modelData.fields.length === 0) {
      alert('Please add at least one field');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...modelData,
        id: modelData.id || `model_${Date.now()}`
      };

      const response = await fetch('http://localhost:5000/api/datamodels', {
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
        alert('Failed to save data model: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save data model:', error);
      alert('Failed to save data model');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="data-model-editor">
      <div className="editor-header">
        <button className="btn-back" onClick={onClose}>
          <ArrowLeft size={20} />
          Back to Data Models
        </button>
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Model'}
        </button>
      </div>

      <div className="editor-content">
        <div className="editor-section">
          <h2>Model Details</h2>

          <div className="form-group">
            <label>Model Name *</label>
            <input
              type="text"
              value={modelData.name}
              onChange={(e) => setModelData({ ...modelData, name: e.target.value })}
              placeholder="e.g., Customer"
            />
            <span className="help-text">Unique identifier for the model (no spaces)</span>
          </div>

          <div className="form-group">
            <label>Display Name *</label>
            <input
              type="text"
              value={modelData.displayName}
              onChange={(e) => setModelData({ ...modelData, displayName: e.target.value })}
              placeholder="e.g., Customer Data"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={modelData.description}
              onChange={(e) => setModelData({ ...modelData, description: e.target.value })}
              placeholder="Describe what this model represents"
              rows={3}
            />
          </div>
        </div>

        <div className="editor-section">
          <div className="section-header">
            <h2>Fields</h2>
            <button className="btn-add" onClick={handleAddField}>
              <Plus size={18} />
              Add Field
            </button>
          </div>

          {modelData.fields.length === 0 ? (
            <div className="no-fields">
              <p>No fields yet. Click "Add Field" to create one.</p>
            </div>
          ) : (
            <div className="fields-list">
              {modelData.fields.map((field, index) => (
                <div key={index} className="field-editor">
                  <div className="field-header">
                    <span className="field-number">Field {index + 1}</span>
                    <button
                      className="btn-remove"
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
                      <label>Field Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                      >
                        {FIELD_TYPES.map(type => (
                          <option key={type} value={type}>
                            {type}
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

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={field.primaryKey || false}
                          onChange={(e) => handleFieldChange(index, 'primaryKey', e.target.checked)}
                        />
                        Primary Key
                      </label>
                    </div>

                    <div className="form-group full-width">
                      <label>Description</label>
                      <input
                        type="text"
                        value={field.description || ''}
                        onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                        placeholder="Field description"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataModelEditor;
