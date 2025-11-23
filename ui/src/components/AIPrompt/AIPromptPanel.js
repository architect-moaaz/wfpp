import React, { useState } from 'react';
import './AIPromptPanel.css';
import { Sparkles, Send, Loader } from 'lucide-react';

const AIPromptPanel = () => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState([
    {
      id: 1,
      type: 'assistant',
      message: 'Hi! I\'m your AI Workflow Assistant. Describe your workflow in natural language and I\'ll help you build it.',
      timestamp: new Date()
    }
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: prompt,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    setPrompt('');
    setIsProcessing(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        message: 'I\'ve analyzed your request and generated a workflow with the following steps:\n\n1. Start Process (Form Submission)\n2. Validate Information\n3. Decision Point (Credit Check)\n\nYou can now see these nodes on the canvas. Would you like me to add any additional steps or modify the workflow?',
        timestamp: new Date()
      };
      setConversation(prev => [...prev, aiResponse]);
      setIsProcessing(false);
    }, 2000);
  };

  const suggestedPrompts = [
    'Create a customer onboarding workflow with email validation',
    'Add a credit check decision point',
    'Optimize this workflow for faster processing',
    'Add email notifications when workflow is approved'
  ];

  return (
    <div className="ai-prompt-panel">
      <div className="ai-prompt-header">
        <div className="header-title">
          <Sparkles size={24} className="sparkle-icon" />
          <div>
            <h2>AI Workflow Assistant</h2>
            <p>Describe your workflow in natural language and I'll help you build it</p>
          </div>
        </div>
        <button className="start-prompting-btn">Start Prompting</button>
      </div>

      <div className="conversation-area">
        {conversation.map(msg => (
          <div key={msg.id} className={`message ${msg.type}`}>
            <div className="message-avatar">
              {msg.type === 'assistant' ? '🤖' : '👤'}
            </div>
            <div className="message-content">
              <div className="message-text">{msg.message}</div>
              <div className="message-timestamp">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="message assistant processing">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="processing-indicator">
                <Loader className="spin" size={16} />
                <span>AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="suggested-prompts">
        <div className="prompts-label">Suggested prompts:</div>
        <div className="prompts-grid">
          {suggestedPrompts.map((suggestion, index) => (
            <button
              key={index}
              className="prompt-suggestion"
              onClick={() => setPrompt(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <form className="prompt-input-area" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your workflow or ask me to optimize it..."
            rows={3}
            disabled={isProcessing}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!prompt.trim() || isProcessing}
          >
            <Send size={20} />
          </button>
        </div>
        <div className="input-hint">
          Press <kbd>⌘</kbd> + <kbd>Enter</kbd> to send
        </div>
      </form>
    </div>
  );
};

export default AIPromptPanel;
