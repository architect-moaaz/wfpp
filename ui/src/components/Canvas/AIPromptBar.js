import React, { useState } from 'react';
import './AIPromptBar.css';
import { Sparkles, Send, X, AlertCircle } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AIPromptBar = ({ onClose, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/ai/generate-workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: prompt })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to generate workflow');
      }

      if (data.success && onGenerate) {
        // Pass the generated workflow to the canvas
        const workflow = data.data?.workflow || data.workflow;
        onGenerate(workflow);
        setPrompt('');
        if (onClose) onClose();
      } else {
        throw new Error(data.message || 'No workflow generated');
      }
    } catch (err) {
      console.error('[AIPromptBar] Generation failed:', err);
      setError(err.message || 'Failed to generate workflow. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const suggestedPrompts = [
    'Create a customer onboarding workflow with validation',
    'Add approval process with email notifications',
    'Build invoice processing workflow',
    'Create data validation and transformation flow'
  ];

  return (
    <>
      <div className="ai-prompt-backdrop" onClick={onClose}></div>
      <div className="ai-prompt-bar">
        <div className="prompt-bar-header">
          <div className="prompt-bar-title">
            <Sparkles size={20} className="sparkle-icon-small" />
            <span>Describe your workflow in natural language</span>
          </div>
          <button className="close-prompt-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

      <div className="prompt-bar-content">
        <form onSubmit={handleSubmit} className="prompt-bar-form">
          <div className="prompt-input-container">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Create a customer registration workflow with email validation and approval'"
              rows={4}
              disabled={isProcessing}
              className="prompt-textarea"
              autoFocus
            />
            <button
              type="submit"
              className="submit-prompt-btn"
              disabled={!prompt.trim() || isProcessing}
            >
              {isProcessing ? (
                <div className="spinner"></div>
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="prompt-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div className="suggested-prompts-bar">
          <span className="prompts-label-small">Try:</span>
          {suggestedPrompts.map((suggestion, index) => (
            <button
              key={index}
              className="prompt-chip"
              onClick={() => setPrompt(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
      </div>
    </>
  );
};

export default AIPromptBar;
