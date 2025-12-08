import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import ConditionBuilder from './ConditionBuilder';
import ActionBuilder from './ActionBuilder';
import './RuleEngine.css';

const RuleEditor = ({ rule, onSave, onCancel, applicationId, dataModels = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'validation',
    priority: 0,
    is_active: true,
    conditions: { all: [] },
    actions: { actions: [] },
    ...rule
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showTextToRules, setShowTextToRules] = useState(false);
  const [textDescription, setTextDescription] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState(null);

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || '',
        description: rule.description || '',
        type: rule.type || 'validation',
        priority: rule.priority || 0,
        is_active: rule.is_active !== undefined ? rule.is_active : true,
        conditions: rule.conditions || { all: [] },
        actions: rule.actions || { actions: [] }
      });
    }
  }, [rule]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a rule name');
      return;
    }

    setIsSaving(true);

    try {
      const ruleData = {
        ...formData,
        application_id: applicationId
      };

      await onSave(ruleData);
    } catch (error) {
      console.error('Error saving rule:', error);
      alert('Failed to save rule. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertText = async () => {
    if (!textDescription.trim()) {
      alert('Please enter a description for the rule');
      return;
    }

    setIsConverting(true);
    setConversionResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/rules/text-to-rule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: textDescription,
          context: {
            dataModels,
            applicationId
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setConversionResult(data);
        // Auto-populate form with generated rule
        setFormData({
          ...formData,
          name: data.rule.name || '',
          description: data.rule.description || '',
          type: data.rule.type || 'validation',
          priority: data.rule.priority || 0,
          conditions: data.rule.conditions || { all: [] },
          actions: data.rule.actions || { actions: [] }
        });
      } else {
        throw new Error(data.error || 'Failed to convert text to rule');
      }
    } catch (error) {
      console.error('Error converting text to rule:', error);
      setConversionResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleApplyGenerated = () => {
    setShowTextToRules(false);
    setTextDescription('');
    setConversionResult(null);
  };

  return (
    <div className="rule-editor-modal" onClick={onCancel}>
      <div className="rule-editor-content" onClick={(e) => e.stopPropagation()}>
        <div className="rule-editor-header">
          <div className="header-left">
            <h2>{rule?.id ? 'Edit Rule' : 'Create New Rule'}</h2>
            <button
              className="text-to-rules-toggle"
              onClick={() => setShowTextToRules(!showTextToRules)}
              title="Generate rule from natural language"
            >
              <Sparkles size={16} />
              {showTextToRules ? 'Manual Editor' : 'Generate from Text'}
            </button>
          </div>
          <button className="close-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className="rule-editor-body">
          {showTextToRules && (
            <div className="text-to-rules-section">
              <div className="text-to-rules-header">
                <Sparkles size={20} />
                <div>
                  <h3>Generate Rule from Natural Language</h3>
                  <p>Describe your rule in plain English and AI will convert it to a structured rule</p>
                </div>
              </div>

              <div className="text-to-rules-input">
                <textarea
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="Example: Send a notification when an order total is greater than $1000 and the status is pending"
                  rows={4}
                  disabled={isConverting}
                />
                <button
                  className="convert-btn"
                  onClick={handleConvertText}
                  disabled={isConverting || !textDescription.trim()}
                >
                  {isConverting ? 'Converting...' : 'Generate Rule'}
                </button>
              </div>

              {conversionResult && (
                <div className={`conversion-result ${conversionResult.success ? 'success' : 'error'}`}>
                  {conversionResult.success ? (
                    <>
                      <div className="result-header">
                        <CheckCircle size={20} />
                        <div>
                          <strong>Rule Generated Successfully</strong>
                          <p>Confidence: {conversionResult.confidence}%</p>
                        </div>
                      </div>
                      {conversionResult.explanation && (
                        <p className="result-explanation">{conversionResult.explanation}</p>
                      )}
                      <button
                        className="apply-btn"
                        onClick={handleApplyGenerated}
                      >
                        Apply to Editor
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="result-header">
                        <AlertCircle size={20} />
                        <strong>Conversion Failed</strong>
                      </div>
                      <p className="result-error">{conversionResult.error}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="rule-basic-info">
            <div className="form-group">
              <label>Rule Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter rule name"
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
              >
                <option value="validation">Validation</option>
                <option value="decision">Decision</option>
                <option value="transformation">Transformation</option>
                <option value="notification">Notification</option>
                <option value="automation">Automation</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', parseInt(e.target.value) || 0)}
                min="0"
                max="100"
              />
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this rule does"
                rows={2}
              />
            </div>

            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
              />
              <label htmlFor="is_active">Rule is active</label>
            </div>
          </div>

          <ConditionBuilder
            conditions={formData.conditions}
            onChange={(conditions) => handleInputChange('conditions', conditions)}
            dataModels={dataModels}
          />

          <ActionBuilder
            actions={formData.actions}
            onChange={(actions) => handleInputChange('actions', actions)}
          />
        </div>

        <div className="rule-editor-footer">
          <button className="cancel-btn" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : (rule?.id ? 'Update Rule' : 'Create Rule')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RuleEditor;
