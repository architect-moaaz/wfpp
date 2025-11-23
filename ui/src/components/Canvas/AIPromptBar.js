import React, { useState } from 'react';
import './AIPromptBar.css';
import { Sparkles, Send, X } from 'lucide-react';

const AIPromptBar = ({ onClose, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    setIsProcessing(true);

    // Simulate AI processing
    setTimeout(() => {
      if (onGenerate) {
        onGenerate(prompt);
      }
      setIsProcessing(false);
      setPrompt('');
    }, 1500);
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
