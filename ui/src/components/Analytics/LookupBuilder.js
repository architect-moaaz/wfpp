/**
 * LookupBuilder - Create Connected Dropdowns
 *
 * Wizard-style interface for creating cascading dropdown configurations.
 * Designed for non-technical users with step-by-step guidance.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Folder,
  Building,
  Plus,
  ChevronRight,
  Check,
  ArrowRight,
  Link2,
  Trash2,
  Settings,
  Eye,
  Save
} from 'lucide-react';
import './LookupBuilder.css';

const LookupBuilder = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [lookupConfig, setLookupConfig] = useState({
    name: '',
    description: '',
    levels: []
  });
  const [previewValues, setPreviewValues] = useState({});
  const [previewOptions, setPreviewOptions] = useState({});
  const [loading, setLoading] = useState(false);

  // Templates
  const templates = [
    {
      id: 'geographic',
      name: 'Location',
      description: 'Country, State, and City selection',
      icon: MapPin,
      levels: ['Country', 'State', 'City']
    },
    {
      id: 'category',
      name: 'Category',
      description: 'Category and Subcategory selection',
      icon: Folder,
      levels: ['Category', 'Subcategory']
    },
    {
      id: 'organizational',
      name: 'Organization',
      description: 'Department and Team selection',
      icon: Building,
      levels: ['Department', 'Team']
    },
    {
      id: 'custom',
      name: 'Custom',
      description: 'Build your own connected dropdown',
      icon: Plus,
      levels: []
    }
  ];

  // Handle template selection
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setLookupConfig({
      name: template.name === 'Custom' ? '' : `${template.name} Hierarchy`,
      description: template.description,
      levels: template.levels.map((name, index) => ({
        name,
        order: index,
        source: null,
        dependsOn: index > 0 ? template.levels[index - 1] : null
      }))
    });
    setStep(2);
  };

  // Handle level configuration
  const updateLevel = (index, updates) => {
    setLookupConfig(prev => ({
      ...prev,
      levels: prev.levels.map((level, i) =>
        i === index ? { ...level, ...updates } : level
      )
    }));
  };

  // Add custom level
  const addLevel = () => {
    const newLevel = {
      name: `Level ${lookupConfig.levels.length + 1}`,
      order: lookupConfig.levels.length,
      source: null,
      dependsOn: lookupConfig.levels.length > 0
        ? lookupConfig.levels[lookupConfig.levels.length - 1].name
        : null
    };
    setLookupConfig(prev => ({
      ...prev,
      levels: [...prev.levels, newLevel]
    }));
  };

  // Remove level
  const removeLevel = (index) => {
    setLookupConfig(prev => ({
      ...prev,
      levels: prev.levels.filter((_, i) => i !== index)
    }));
  };

  // Fetch preview options
  const fetchPreviewOptions = async (level, parentValue = null) => {
    setLoading(true);
    try {
      const lookupId = selectedTemplate?.id || 'geographic';
      let url = `/api/analytics/lookups/${lookupId}/options?level=${level}`;

      if (parentValue) {
        const parentLevel = lookupConfig.levels.find(l => l.name === level)?.dependsOn;
        if (parentLevel) {
          url += `&${parentLevel}=${parentValue}`;
        }
      }

      const res = await fetch(url, {
        headers: { 'x-org-id': 'default' }
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewOptions(prev => ({
          ...prev,
          [level]: data.data.options
        }));
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle preview value change
  const handlePreviewChange = (level, value) => {
    setPreviewValues(prev => {
      const newValues = { ...prev, [level]: value };

      // Clear child values
      const levelIndex = lookupConfig.levels.findIndex(l => l.name === level);
      lookupConfig.levels.forEach((l, i) => {
        if (i > levelIndex) {
          delete newValues[l.name];
        }
      });

      return newValues;
    });

    // Fetch next level options
    const levelIndex = lookupConfig.levels.findIndex(l => l.name === level);
    if (levelIndex < lookupConfig.levels.length - 1) {
      const nextLevel = lookupConfig.levels[levelIndex + 1].name;
      fetchPreviewOptions(nextLevel, value);
    }
  };

  // Load initial preview options
  useEffect(() => {
    if (step === 3 && lookupConfig.levels.length > 0) {
      fetchPreviewOptions(lookupConfig.levels[0].name);
    }
  }, [step]);

  // Save lookup
  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/lookups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': 'default'
        },
        body: JSON.stringify(lookupConfig)
      });

      if (res.ok) {
        setStep(4);
      }
    } catch (error) {
      console.error('Error saving lookup:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render step 1 - Choose Template
  const renderStep1 = () => (
    <div className="wizard-step">
      <h2>What kind of connected dropdown do you need?</h2>

      <div className="template-grid">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <div
              key={template.id}
              className="template-card"
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="template-icon">
                <Icon size={32} />
              </div>
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              {template.levels.length > 0 && (
                <div className="template-levels">
                  {template.levels.map((level, i) => (
                    <React.Fragment key={level}>
                      <span className="level-name">{level}</span>
                      {i < template.levels.length - 1 && <ArrowRight size={14} />}
                    </React.Fragment>
                  ))}
                </div>
              )}
              <button className="template-select">Use this</button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render step 2 - Configure Levels
  const renderStep2 = () => (
    <div className="wizard-step">
      <h2>Build your {lookupConfig.name || 'dropdown'}</h2>
      <p className="step-description">Configure each step of your connected dropdown:</p>

      <div className="levels-builder">
        <div className="levels-flow">
          {lookupConfig.levels.map((level, index) => (
            <React.Fragment key={index}>
              <div className="level-card">
                <div className="level-header">
                  <span className="level-number">Step {index + 1}</span>
                  {lookupConfig.levels.length > 1 && (
                    <button
                      className="remove-level"
                      onClick={() => removeLevel(index)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  className="level-name-input"
                  value={level.name}
                  onChange={(e) => updateLevel(index, { name: e.target.value })}
                  placeholder="Level name"
                />
                <div className="level-config">
                  <div className="config-row">
                    <label>Data source:</label>
                    <select className="config-select">
                      <option value="">Select data source...</option>
                      <option value="countries">Reference Data &gt; Countries</option>
                      <option value="states">Reference Data &gt; States</option>
                      <option value="cities">Reference Data &gt; Cities</option>
                    </select>
                  </div>
                  {index > 0 && (
                    <div className="config-row dependency">
                      <Link2 size={14} />
                      <span>Depends on: {level.dependsOn}</span>
                    </div>
                  )}
                </div>
              </div>
              {index < lookupConfig.levels.length - 1 && (
                <div className="level-arrow">
                  <ArrowRight size={20} />
                </div>
              )}
            </React.Fragment>
          ))}

          <button className="add-level-btn" onClick={addLevel}>
            <Plus size={18} />
            Add another step
          </button>
        </div>
      </div>

      <div className="wizard-actions">
        <button className="btn-secondary" onClick={() => setStep(1)}>
          <ArrowLeft size={16} />
          Back
        </button>
        <button className="btn-primary" onClick={() => setStep(3)}>
          Next: Preview
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );

  // Render step 3 - Preview
  const renderStep3 = () => (
    <div className="wizard-step">
      <h2>Try it out!</h2>
      <p className="step-description">Select values to see how it works:</p>

      <div className="preview-container">
        {lookupConfig.levels.map((level, index) => {
          const options = previewOptions[level.name] || [];
          const value = previewValues[level.name] || '';
          const isDisabled = index > 0 && !previewValues[lookupConfig.levels[index - 1].name];

          return (
            <div key={level.name} className="preview-field">
              <label>{level.name}</label>
              <select
                value={value}
                onChange={(e) => handlePreviewChange(level.name, e.target.value)}
                disabled={isDisabled}
                className={isDisabled ? 'disabled' : ''}
              >
                <option value="">
                  {isDisabled
                    ? `Select ${lookupConfig.levels[index - 1].name} first...`
                    : `Select ${level.name}...`}
                </option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        {Object.keys(previewValues).length === lookupConfig.levels.length &&
          previewValues[lookupConfig.levels[lookupConfig.levels.length - 1].name] && (
          <div className="preview-success">
            <Check size={18} />
            <span>Working correctly!</span>
          </div>
        )}
      </div>

      <div className="wizard-actions">
        <button className="btn-secondary" onClick={() => setStep(2)}>
          <ArrowLeft size={16} />
          Back
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={loading}>
          <Save size={16} />
          Save & Use
        </button>
      </div>
    </div>
  );

  // Render step 4 - Success
  const renderStep4 = () => (
    <div className="wizard-step success-step">
      <div className="success-icon">
        <Check size={40} />
      </div>
      <h2>Lookup Created!</h2>
      <p>Your "{lookupConfig.name}" connected dropdown is ready to use.</p>

      <div className="success-actions">
        <button className="btn-primary" onClick={onBack}>
          Done
        </button>
        <button className="btn-secondary" onClick={() => {
          setStep(1);
          setSelectedTemplate(null);
          setLookupConfig({ name: '', description: '', levels: [] });
          setPreviewValues({});
          setPreviewOptions({});
        }}>
          Create Another
        </button>
      </div>

      <div className="success-info">
        <h4>Use this lookup in your forms:</h4>
        <code>{`lookupId: "${lookupConfig.name?.toLowerCase().replace(/\s+/g, '-')}"`}</code>
      </div>
    </div>
  );

  return (
    <div className="lookup-builder">
      {/* Header */}
      <div className="builder-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>Create Connected Dropdown</h1>
      </div>

      {/* Progress */}
      <div className="wizard-progress">
        <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <span className="step-dot">{step > 1 ? <Check size={14} /> : '1'}</span>
          <span className="step-label">Choose</span>
        </div>
        <div className="progress-line" />
        <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <span className="step-dot">{step > 2 ? <Check size={14} /> : '2'}</span>
          <span className="step-label">Setup</span>
        </div>
        <div className="progress-line" />
        <div className={`progress-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
          <span className="step-dot">{step > 3 ? <Check size={14} /> : '3'}</span>
          <span className="step-label">Preview</span>
        </div>
        <div className="progress-line" />
        <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>
          <span className="step-dot">4</span>
          <span className="step-label">Save</span>
        </div>
      </div>

      {/* Content */}
      <div className="wizard-content">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>
    </div>
  );
};

export default LookupBuilder;
