import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import './ConversationalAssistant.css';
import { Sparkles, Send, X, Loader, CheckCircle2, ChevronDown, ChevronRight, Brain, Paperclip } from 'lucide-react';
// import { useWorkflow } from '../../context/WorkflowContext'; // Not needed - component now focuses on workflow generation only

const ConversationalAssistant = ({ onClose, onWorkflowGenerated, currentWorkflow, currentApplication, mode = 'sidebar' }) => {
  const STORAGE_KEY = 'workflow_ai_conversation_history';
  // Removed unused context variables - keeping component simple for workflow generation only
  // const { ... } = useWorkflow();

  const getInitialMessage = () => {
    if (currentWorkflow && currentWorkflow.nodes && currentWorkflow.nodes.length > 0) {
      return {
        role: 'assistant',
        content: `Hi! I'm ARES (AI Runtime Engine Schematic), powered by Mixture of Experts (MoE) architecture.\n\nI can see you have a workflow with ${currentWorkflow.nodes.length} node${currentWorkflow.nodes.length > 1 ? 's' : ''} on the canvas. I can help you:\n\n**Edit Workflows:**\n- **Add** new steps: "add a notification after approval"\n- **Remove** steps: "remove the validation step"\n- **Modify** existing steps: "change the assignee to manager"\n- **Reorganize**: "add validation before the decision"\n- **Convert to App**: "turn this into a complete application"\n\n**MOE Architecture:**\nI use specialized expert agents for different workflow types:\n- Simple Workflows (Haiku - fast)\n- Complex Workflows (Sonnet 4)\n- Approval Workflows (Sonnet 4)\n- Data Processing (Sonnet 4)\n\nWhat would you like to do with your workflow?`,
        timestamp: new Date()
      };
    }
    return {
      role: 'assistant',
      content: `Hi! I'm ARES (AI Runtime Engine Schematic), powered by Mixture of Experts (MoE) architecture.\n\nI can create both **workflows** and **complete applications** using specialized AI experts!\n\n**Workflow Examples:**\n- "Create an expense approval workflow"\n- "Build a customer onboarding workflow"\n- "Design a task tracking workflow"\n\n**Complete Application Examples:**\n- "Create an expense management application"\n- "Build a complete customer onboarding app with forms and pages"\n- "Create an application for project management"\n\n**🎨 Have a Design?**\nI can analyze your design files!\n- **PDF Wireframes/Mockups** - Upload a PDF and I'll extract forms and pages\n- **Figma Designs** - Share your Figma URL\n- **Design Screenshots** - Upload images (PNG, JPG)\n- **No Design?** - No problem! I'll create an optimal design for you\n\nJust mention "I have a design" or "use my PDF wireframe" in your request!\n\n**How I decide:**\nI automatically detect whether you want:\n- **Workflow only** - Just the process flow (faster)\n- **Complete Application** - Workflow + Forms + Data Models + Pages + Mobile UI (comprehensive)\n\n**MOE Architecture:**\n18 specialized experts including:\n- Workflow Experts (Simple, Complex, Approval, Data Processing)\n- Form Experts (Simple, Advanced, Mobile, Wizard)\n- Data Model Experts (SQL, NoSQL, Graph, TimeSeries)\n- **Design Expert** - Analyzes Figma, PDF, or creates optimal designs\n- Page Experts\n- Mobile Experts (iOS, Android, Cross-Platform)\n\nJust describe what you want to build - I'll handle the rest!`,
      timestamp: new Date(),
      showDesignUpload: true
    };
  };

  // Load messages from localStorage or use initial message
  const loadMessages = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        return messagesWithDates.length > 0 ? messagesWithDates : [getInitialMessage()];
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
    return [getInitialMessage()];
  };

  const [messages, setMessages] = useState(loadMessages());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState({});
  const [currentThinking, setCurrentThinking] = useState([]);
  const [designFile, setDesignFile] = useState(null);
  const [figmaUrl, setFigmaUrl] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }, [messages]);

  // Note: Removed dynamic initial message update to prevent errors
  // The initial message is set once when component mounts via loadMessages()

  // Initialize WebSocket connection
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentThinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Detect user intent: should we generate a complete application or just a workflow?
   * Returns: 'application' | 'workflow'
   *
   * Examples:
   *
   * APPLICATION INTENT (generates workflow + forms + data models + pages + mobile UI):
   * - "Create an expense management application"
   * - "Build a complete customer onboarding app"
   * - "Create an app for leave requests with forms"
   * - "Build a project management application with pages and data models"
   * - "I need a full application for inventory tracking"
   *
   * WORKFLOW INTENT (generates workflow only - faster):
   * - "Create an expense approval workflow"
   * - "Build a customer onboarding workflow"
   * - "Design a leave request workflow"
   * - "Just create the workflow for project management"
   * - "I only need a workflow for inventory processing"
   *
   * EDITING (modifies existing workflow):
   * - "Add a notification step after approval"
   * - "Remove the validation node"
   * - "Turn this workflow into a complete application" (converts to app)
   */
  const detectIntent = (userInput) => {
    const lower = userInput.toLowerCase();

    // Keywords that strongly suggest application generation
    const applicationKeywords = [
      'create app', 'build app', 'new app', 'application',
      'complete app', 'full app', 'entire app',
      'app with', 'app that', 'app for',
      'with forms', 'with pages', 'with data model', 'with mobile',
      'full stack', 'end-to-end',
      'forms and', 'pages and', 'models and'
    ];

    // Keywords that suggest workflow-only generation
    const workflowOnlyKeywords = [
      'just workflow', 'only workflow', 'workflow only',
      'just the workflow', 'just a workflow',
      'only the workflow', 'workflow for'
    ];

    // Check for workflow-only intent first (more specific)
    for (const keyword of workflowOnlyKeywords) {
      if (lower.includes(keyword)) {
        return 'workflow';
      }
    }

    // Check for application intent
    for (const keyword of applicationKeywords) {
      if (lower.includes(keyword)) {
        return 'application';
      }
    }

    // If editing existing workflow, assume workflow mode
    if (currentWorkflow && currentWorkflow.nodes && currentWorkflow.nodes.length > 0) {
      // Unless they explicitly mention creating an app from it
      if (lower.includes('turn into app') || lower.includes('convert to app')) {
        return 'application';
      }
      return 'workflow';
    }

    // Default: if unclear, generate workflow (safer, faster)
    // User can always ask for "complete application" if they want more
    return 'workflow';
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:image/png;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !socketRef.current) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    // Add file indicator to user message if file is attached
    if (designFile) {
      userMessage.content += ` [Attached: ${designFile.name}]`;
    }

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    const currentDesignFile = designFile;
    setInput('');
    setDesignFile(null); // Clear the design file after capturing it
    setIsLoading(true);
    setCurrentThinking([]);

    // Set up WebSocket event listeners for workflow generation
    const handleThinkingStep = (data) => {
      setCurrentThinking(prev => [...prev, data]);
    };

    const handleWorkflowComplete = (data) => {
      const aiMessage = {
        role: 'assistant',
        content: data.summary.description,
        thinking: data.thinking,
        workflow: data.workflow,
        summary: data.summary,
        forms: data.workflow?.forms || [],
        dataModels: data.workflow?.dataModels || [],
        mobileUI: data.workflow?.mobileUI,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentThinking([]);
      setIsLoading(false);

      // Automatically apply workflow to canvas if it has nodes
      if (data.workflow && data.workflow.nodes && data.workflow.nodes.length > 0) {
        console.log('Applying workflow to canvas:', data.workflow);
        if (onWorkflowGenerated) {
          // Normalize workflow: ensure 'edges' exists (backend might send 'connections')
          const normalizedWorkflow = {
            ...data.workflow,
            edges: data.workflow.edges || data.workflow.connections || []
          };

          setTimeout(() => {
            onWorkflowGenerated(normalizedWorkflow);
          }, 0);
        }
      }

      // Clean up listeners
      cleanupListeners();
    };

    const handleApplicationComplete = (data) => {
      // Ensure application resources structure exists to prevent undefined errors
      const application = data.application ? {
        ...data.application,
        resources: data.application.resources || {
          workflows: [],
          forms: [],
          dataModels: [],
          pages: [],
          mobileUI: null
        }
      } : null;

      const aiMessage = {
        role: 'assistant',
        content: data.summary.description || 'Application generation complete',
        thinking: data.thinking || [],
        application: application,
        summary: data.summary || {},
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentThinking([]);
      setIsLoading(false);

      // Clean up listeners
      cleanupListeners();
    };

    const handleError = (data) => {
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${data.message}. Please try again.`,
        isError: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setCurrentThinking([]);
      setIsLoading(false);

      // Clean up listeners
      cleanupListeners();
    };

    const cleanupListeners = () => {
      socketRef.current.off('thinking-step', handleThinkingStep);
      socketRef.current.off('workflow-complete', handleWorkflowComplete);
      socketRef.current.off('application-complete', handleApplicationComplete);
      socketRef.current.off('error', handleError);
    };

    const buildConversationHistory = () => {
      return messages.map(msg => {
        let content = msg.content;

        // If assistant message had a workflow, add summary to context
        if (msg.role === 'assistant' && msg.summary && msg.summary.nodeCount > 0) {
          content += `\n\n[Generated workflow: ${msg.summary.components} with ${msg.summary.nodeCount} nodes]`;
        }

        return {
          role: msg.role,
          content: content,
          timestamp: msg.timestamp
        };
      });
    };

    // Attach event listeners
    socketRef.current.on('thinking-step', handleThinkingStep);
    socketRef.current.on('workflow-complete', handleWorkflowComplete);
    socketRef.current.on('application-complete', handleApplicationComplete);
    socketRef.current.on('error', handleError);

    // Build conversation history
    const conversationHistory = buildConversationHistory();

    // Detect user intent: application or workflow?
    const intent = detectIntent(userInput);
    console.log(`ARES Intent Detection: "${intent}" for input: "${userInput}"`);

    // Prepare design input if file is attached
    let designInput = null;
    if (currentDesignFile) {
      console.log(`Socket connected BEFORE file read: ${socketRef.current?.connected}`);
      try {
        const base64Data = await readFileAsBase64(currentDesignFile);
        console.log(`Socket connected AFTER file read: ${socketRef.current?.connected}`);
        designInput = {
          type: currentDesignFile.type.startsWith('image/') ? 'image' : 'pdf',
          name: currentDesignFile.name,
          data: base64Data,
          mimeType: currentDesignFile.type
        };
        console.log(`Design file attached: ${currentDesignFile.name} (${currentDesignFile.type}), size: ${base64Data.length} chars`);
      } catch (error) {
        console.error('Failed to read design file:', error);
        // Continue without design file if reading fails
      }
    }

    // Ensure socket is connected before emitting
    if (!socketRef.current || !socketRef.current.connected) {
      console.error('WebSocket not connected, cannot send request');
      setIsLoading(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection lost. Please refresh the page and try again.',
        timestamp: new Date()
      }]);
      return;
    }

    console.log('Emitting event to backend:', intent === 'application' ? 'generate-application' : 'generate-workflow');

    if (intent === 'application') {
      // Generate complete application with all components
      socketRef.current.emit('generate-application', {
        requirements: userInput,
        conversationHistory: conversationHistory,
        designInput: designInput
      });
    } else {
      // Generate workflow only (uses MOE architecture)
      socketRef.current.emit('generate-workflow', {
        requirements: userInput,
        applicationId: currentApplication?.id || null,
        existingWorkflow: currentWorkflow && currentWorkflow.nodes && currentWorkflow.nodes.length > 0 ? {
          nodes: currentWorkflow.nodes,
          connections: currentWorkflow.edges || []
        } : null,
        conversationHistory: conversationHistory,
        designInput: designInput
      });
    }
  };

  const toggleThinking = (messageIndex, thinkingIndex) => {
    const key = `${messageIndex}-${thinkingIndex}`;
    setExpandedThinking(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear the conversation history? This cannot be undone.')) {
      const initialMsg = [getInitialMessage()];
      setMessages(initialMsg);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMsg));
    }
  };

  return (
    <div className={`conversational-assistant ${mode}-mode`}>
      <div className="assistant-header">
        <div className="assistant-title">
          <Sparkles size={20} />
          <h3>ARES</h3>
        </div>
        <div className="assistant-header-actions">
          {messages.length > 1 && (
            <button className="clear-history-btn" onClick={clearHistory} title="Clear conversation history">
              Clear History
            </button>
          )}
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="assistant-messages">
        {/* Conversation Memory Indicator */}
        {messages.length > 2 && (
          <div className="conversation-memory-indicator">
            <Brain size={14} />
            <span>Conversation memory active - I remember our previous {messages.length - 1} messages</span>
          </div>
        )}

        {/* Workflow Context Indicator */}
        {currentWorkflow && currentWorkflow.nodes && currentWorkflow.nodes.length > 0 && (
          <div className="workflow-context-indicator">
            <div className="context-header">
              <Sparkles size={14} />
              <span>Current Workflow Context</span>
            </div>
            <div className="context-details">
              <div className="context-stat">
                <span className="context-label">Nodes:</span>
                <span className="context-value">{currentWorkflow.nodes.length}</span>
              </div>
              <div className="context-stat">
                <span className="context-label">Connections:</span>
                <span className="context-value">{currentWorkflow.edges?.length || 0}</span>
              </div>
            </div>
            <div className="context-note">
              Note: I'll intelligently edit this workflow - keeping unchanged nodes and only modifying what you request.
            </div>
          </div>
        )}

        {messages.map((message, messageIndex) => (
          <div key={messageIndex} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'user' ? 'U' : 'AI'}
            </div>
            <div className="message-content-wrapper">
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? 'You' : 'ARES'}
                </span>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {/* Thinking Process */}
              {message.thinking && message.thinking.length > 0 && (
                <div className="thinking-container">
                  <div className="thinking-header">
                    <Sparkles size={14} />
                    <span>Thinking Process</span>
                  </div>
                  {message.thinking.map((thought, thinkingIndex) => {
                    const key = `${messageIndex}-${thinkingIndex}`;
                    const isExpanded = expandedThinking[key];
                    // All thinking steps in a completed message should show as completed
                    const isCompleted = true;

                    return (
                      <div key={thinkingIndex} className={`thinking-step ${isCompleted ? 'completed' : ''}`}>
                        <div
                          className="thinking-step-header"
                          onClick={() => toggleThinking(messageIndex, thinkingIndex)}
                        >
                          <div className="thinking-step-icon">
                            <CheckCircle2 size={16} className="success-icon" />
                          </div>
                          <span className="thinking-step-title">{thought.step}</span>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        {isExpanded && (
                          <div className="thinking-step-content">
                            <pre>{thought.content}</pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Main Content */}
              <div className={`message-text ${message.isError ? 'error' : ''}`}>
                {message.content}
              </div>

              {/* Workflow Summary */}
              {message.summary && message.summary.nodeCount > 0 && (
                <div className="workflow-summary">
                  <div className="summary-header">
                    <CheckCircle2 size={16} />
                    <span>Workflow Applied to Canvas ✓</span>
                  </div>
                  <div className="summary-details">
                    <div className="summary-stat">
                      <span className="stat-label">Nodes:</span>
                      <span className="stat-value">{message.summary.nodeCount}</span>
                    </div>
                    <div className="summary-stat">
                      <span className="stat-label">Connections:</span>
                      <span className="stat-value">{message.summary.connectionCount}</span>
                    </div>
                    {message.forms && message.forms.length > 0 && (
                      <div className="summary-stat">
                        <span className="stat-label">Forms:</span>
                        <span className="stat-value">{message.forms.length}</span>
                      </div>
                    )}
                    {message.dataModels && message.dataModels.length > 0 && (
                      <div className="summary-stat">
                        <span className="stat-label">Data Models:</span>
                        <span className="stat-value">{message.dataModels.length}</span>
                      </div>
                    )}
                  </div>
                  <div className="workflow-path">
                    <span className="path-label">Flow:</span>
                    <span className="path-value">{message.summary.components}</span>
                  </div>
                </div>
              )}

              {/* Application Summary */}
              {message.application && (
                <div className="application-summary">
                  <div className="summary-header">
                    <CheckCircle2 size={16} />
                    <span>Application Created ✓</span>
                  </div>
                  <div className="summary-details">
                    <div className="summary-stat">
                      <span className="stat-label">Name:</span>
                      <span className="stat-value">{message.application.name}</span>
                    </div>
                    {message.application.resources && (
                      <>
                        {message.application.resources.workflows && message.application.resources.workflows.length > 0 && (
                          <div className="summary-stat">
                            <span className="stat-label">Workflows:</span>
                            <span className="stat-value">{message.application.resources.workflows.length}</span>
                          </div>
                        )}
                        {message.application.resources.forms && message.application.resources.forms.length > 0 && (
                          <div className="summary-stat">
                            <span className="stat-label">Forms:</span>
                            <span className="stat-value">{message.application.resources.forms.length}</span>
                          </div>
                        )}
                        {message.application.resources.dataModels && message.application.resources.dataModels.length > 0 && (
                          <div className="summary-stat">
                            <span className="stat-label">Data Models:</span>
                            <span className="stat-value">{message.application.resources.dataModels.length}</span>
                          </div>
                        )}
                        {message.application.resources.pages && message.application.resources.pages.length > 0 && (
                          <div className="summary-stat">
                            <span className="stat-label">Pages:</span>
                            <span className="stat-value">{message.application.resources.pages.length}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {message.application.description && (
                    <div className="workflow-path">
                      <span className="path-label">Description:</span>
                      <span className="path-value">{message.application.description}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">AI</div>
            <div className="message-content-wrapper">
              <div className="message-header">
                <span className="message-role">ARES</span>
              </div>

              {currentThinking.length === 0 ? (
                <div className="loading-indicator">
                  <Loader size={16} className="spinner" />
                  <span>Analyzing requirements...</span>
                </div>
              ) : (
                <div className="thinking-container">
                  <div className="thinking-header">
                    <Sparkles size={14} />
                    <span>Thinking Process</span>
                  </div>
                  {currentThinking.map((thought, index) => {
                    const isLastStep = index === currentThinking.length - 1;
                    return (
                      <div key={index} className={`thinking-step ${isLastStep ? 'active' : 'completed'}`}>
                        <div className="thinking-step-header">
                          <div className="thinking-step-icon">
                            {isLastStep ? (
                              <Loader size={16} className="thinking-icon" />
                            ) : (
                              <CheckCircle2 size={16} className="success-icon" />
                            )}
                          </div>
                          <span className="thinking-step-title">{thought.step}</span>
                        </div>
                        <div className="thinking-step-content">
                          <pre>{thought.content}</pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="assistant-input-form" onSubmit={handleSubmit}>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Claude Vision API has a limit of ~5-10 MB for images and PDFs
            // Setting limit to 5 MB to be safe
            const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
            if (file.size > MAX_FILE_SIZE) {
              alert(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the limit of 5 MB.\n\nClaude's Vision API cannot process files larger than 5 MB.\n\nPlease:\n- Compress your PDF\n- Reduce image quality/resolution\n- Use a smaller file`);
              e.target.value = ''; // Reset the file input
              return;
            }

            setDesignFile(file);
          }}
          style={{ display: 'none' }}
        />

        {/* Selected file indicator */}
        {designFile && (
          <div className="selected-file-indicator">
            <Paperclip size={14} />
            <span className="file-name">
              {designFile.name}
              <span className="file-size"> ({(designFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </span>
            <button
              type="button"
              className="remove-file-btn"
              onClick={() => setDesignFile(null)}
              title="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="input-container">
          <button
            type="button"
            className="attach-file-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload design file (PDF, PNG, JPG)"
            disabled={isLoading}
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={inputRef}
            type="text"
            className="assistant-input"
            placeholder="Describe the workflow or application you want to create..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!input.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConversationalAssistant;
