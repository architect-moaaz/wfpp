import React, { useState, useRef, useEffect } from 'react';
import './AresChatbot.css';
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Loader,
  Plus,
  FolderOpen,
  Workflow,
  Trash2
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAres } from '../../context/AresContext';
import { useWorkflow } from '../../context/WorkflowContext';

const AresChatbot = () => {
  const {
    isOpen,
    isModalMode,
    conversation,
    isProcessing,
    addUserMessage,
    addAssistantMessage,
    close,
    toggleModalToWindow,
    setIsProcessing,
    clearConversation
  } = useAres();

  const {
    currentApplication,
    setCurrentApplication,
    setActiveSidebar,
    setCurrentWorkflow,
    setConnectedForms,
    setDataModels,
    setConnectedPages
  } = useWorkflow();

  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [progressMessages, setProgressMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [conversation, progressMessages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Setup Socket.io connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');

    newSocket.on('connect', () => {
      console.log('[ARES] Socket connected:', newSocket.id);
    });

    newSocket.on('ares:progress', (event) => {
      console.log('[ARES] Progress event:', event);

      if (event.type === 'completed') {
        // Clear progress messages
        setProgressMessages([]);

        // Auto-load the generated resources
        if (event.resources && event.applicationId) {
          console.log('[ARES] Auto-loading generated resources:', event.resources);

          // Load the updated application immediately
          (async () => {
            try {
              const response = await fetch(`http://localhost:5000/api/applications/${event.applicationId}`);
              const data = await response.json();

              if (data.success && data.application) {
                console.log('[ARES] Fetched updated application:', data.application);

                // Update application in context first
                setCurrentApplication(data.application);

                // Load all resources from the updated application
                const resources = data.application.resources || {};

                // Load the most recently added workflow (last in array)
                if (resources.workflows && resources.workflows.length > 0) {
                  const latestWorkflow = resources.workflows[resources.workflows.length - 1];
                  console.log('[ARES] Auto-loading workflow:', latestWorkflow.name, latestWorkflow);
                  setCurrentWorkflow(latestWorkflow);
                }

                // Load all forms
                if (resources.forms && resources.forms.length > 0) {
                  console.log('[ARES] Auto-loading forms:', resources.forms.length);
                  setConnectedForms(resources.forms);
                }

                // Load all data models
                if (resources.dataModels && resources.dataModels.length > 0) {
                  console.log('[ARES] Auto-loading data models:', resources.dataModels.length);
                  setDataModels(resources.dataModels);
                }

                // Load all pages
                if (resources.pages && resources.pages.length > 0) {
                  console.log('[ARES] Auto-loading pages:', resources.pages.length);
                  setConnectedPages(resources.pages);
                }

                // Navigate to workflow editor to show the generated workflow
                console.log('[ARES] Navigating to workflow editor');
                setActiveSidebar('workflow-editor');

                console.log('[ARES] Auto-load complete!');
              }
            } catch (error) {
              console.error('[ARES] Error auto-loading resources:', error);
            }
          })();
        }

        // Show success message
        addAssistantMessage(
          `Successfully generated your workflow!

✓ Workflows: ${event.stats.workflowsAdded}
✓ Forms: ${event.stats.formsAdded}
✓ Data Models: ${event.stats.dataModelsAdded}
✓ Pages: ${event.stats.pagesAdded}

The resources have been automatically loaded into their respective editors.`,
          [
            { id: 'view', label: 'View workflow canvas', action: 'view_workflow' },
            { id: 'create-another', label: 'Create another workflow', action: 'build_workflow' }
          ]
        );
      } else if (event.type === 'error') {
        setProgressMessages([]);
        addAssistantMessage(`Error: ${event.message}`);
      } else if (event.type === 'thinking-step') {
        // Skip thinking-step events - these are internal diagnostic events
        console.log('[ARES] Thinking step:', event.data || event);
      } else if (event.message) {
        // Add progress message only if it has a message
        setProgressMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          message: event.message,
          timestamp: event.timestamp || Date.now()
        }]);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userInput = input.trim();
    setInput('');
    addUserMessage(userInput);
    setIsProcessing(true);

    // Process user input
    await processUserInput(userInput);
  };

  const handleSuggestionClick = async (suggestion) => {
    // Only add user message for actions that represent actual user input
    // Skip for conversational continuation actions
    const skipUserMessage = ['gather_requirements', 'confirm_requirements', 'edit_requirements'].includes(suggestion.action);

    if (!skipUserMessage) {
      addUserMessage(suggestion.label);
    }

    setIsProcessing(true);

    // Execute the suggested action (pass full suggestion object)
    await executeAction(suggestion);
  };

  const processUserInput = async (input) => {
    try {
      // Call ARES backend API
      const response = await fetch('http://localhost:5000/api/ares/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: conversation.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })).concat([{
            role: 'user',
            content: input,
            timestamp: Date.now()
          }]),
          context: {
            currentApplication: currentApplication,
            activeView: window.location.pathname
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        // Add assistant response with suggestions
        addAssistantMessage(data.response.content, data.response.suggestions || []);

        // Execute action if suggestions contain actionable items
        if (data.response.suggestions && data.response.suggestions.length > 0) {
          // Actions will be executed when user clicks suggestion buttons
        }
      } else {
        addAssistantMessage('Sorry, I encountered an error processing your request. Please try again.');
      }
    } catch (error) {
      console.error('Error processing input:', error);
      // Fallback to local processing if backend is unavailable
      await processUserInputFallback(input);
    } finally {
      setIsProcessing(false);
    }
  };

  const processUserInputFallback = async (input) => {
    const lowerInput = input.toLowerCase();

    try {
      // Detect intent
      if (lowerInput.includes('create') && (lowerInput.includes('app') || lowerInput.includes('application'))) {
        await executeAction('create_application', input);
      } else if (lowerInput.includes('open') && (lowerInput.includes('app') || lowerInput.includes('application') || lowerInput.includes('existing'))) {
        await executeAction('open_application', input);
      } else if (lowerInput.includes('build') || lowerInput.includes('create') || lowerInput.includes('generate')) {
        if (lowerInput.includes('workflow')) {
          await executeAction('build_workflow', input);
        } else {
          // General build request - ask for clarification
          addAssistantMessage(
            'I can help you build a workflow. Could you describe what kind of workflow you need? For example: "Build a customer onboarding workflow" or "Create an expense approval process".',
            [
              { id: 'example1', label: 'Customer onboarding workflow', action: 'build_workflow_with_prompt', prompt: 'Build a customer onboarding workflow' },
              { id: 'example2', label: 'Expense approval process', action: 'build_workflow_with_prompt', prompt: 'Create an expense approval process' },
              { id: 'example3', label: 'Task management system', action: 'build_workflow_with_prompt', prompt: 'Build a task management system' }
            ]
          );
          setIsProcessing(false);
        }
      } else if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
        addAssistantMessage(
          'I can help you with the following:\n\n• Create new applications\n• Open existing applications\n• Build workflows using AI\n• Generate forms and data models\n• Design mobile interfaces\n\nWhat would you like to do?',
          [
            { id: 'create-app', label: 'Create a new application', action: 'create_application' },
            { id: 'build-workflow', label: 'Build a workflow', action: 'build_workflow' },
            { id: 'open-app', label: 'Open existing application', action: 'open_application' }
          ]
        );
        setIsProcessing(false);
      } else {
        // Use as workflow prompt
        await executeAction('build_workflow_with_prompt', input, input);
      }
    } catch (error) {
      console.error('Error processing input:', error);
      addAssistantMessage('Sorry, I encountered an error processing your request. Please try again.');
      setIsProcessing(false);
    }
  };

  const executeAction = async (suggestion) => {
    try {
      const { action, label, prompt, requirements } = suggestion;

      switch (action) {
        case 'create_application':
          await createApplication();
          break;

        case 'open_application':
          await openApplicationsList();
          break;

        case 'build_workflow':
          addAssistantMessage(
            'Great! Please describe the workflow you want to build. For example: "Create a customer onboarding workflow" or "Build an expense approval system".',
            [
              { id: 'example1', label: 'Customer onboarding workflow', action: 'build_workflow_with_prompt', prompt: 'Build a customer onboarding workflow with user registration, email verification, and profile setup' },
              { id: 'example2', label: 'Expense approval workflow', action: 'build_workflow_with_prompt', prompt: 'Create an expense approval workflow with submission, manager review, and accounting approval' },
              { id: 'example3', label: 'Task management workflow', action: 'build_workflow_with_prompt', prompt: 'Build a task management workflow with task creation, assignment, and completion tracking' }
            ]
          );
          setIsProcessing(false);
          break;

        case 'build_workflow_with_prompt':
          const workflowPrompt = prompt || label;
          await buildWorkflow(workflowPrompt);
          break;

        case 'generate_with_moe':
          await generateWithMoE(requirements);
          break;

        case 'gather_requirements':
        case 'confirm_requirements':
        case 'edit_requirements':
          // These actions trigger ARES to continue the conversation
          // The user message was already added by handleSuggestionClick
          // Just call the API with the current conversation
          try {
            const response = await fetch('http://localhost:5000/api/ares/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationHistory: conversation.map(msg => ({
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.timestamp
                })),
                context: {
                  currentApplication: currentApplication,
                  activeView: window.location.pathname
                }
              })
            });

            const data = await response.json();

            if (data.success) {
              addAssistantMessage(data.response.content, data.response.suggestions || []);
            } else {
              addAssistantMessage('Sorry, I encountered an error processing your request. Please try again.');
            }
          } catch (error) {
            console.error('Error processing conversation action:', error);
            addAssistantMessage('Sorry, I encountered an error. Please try again.');
          } finally {
            setIsProcessing(false);
          }
          break;

        case 'load_application':
          // Load the selected application
          const applicationId = suggestion.applicationId;

          if (!applicationId) {
            addAssistantMessage('Sorry, I couldn\'t load the application. Please try again.');
            setIsProcessing(false);
            break;
          }

          try {
            const response = await fetch(`http://localhost:5000/api/applications/${applicationId}`);
            const data = await response.json();

            if (data.success && data.application) {
              // First, clear all existing resources to force a refresh
              setCurrentWorkflow(null);
              setConnectedForms([]);
              setDataModels([]);
              setConnectedPages([]);

              // Set the new application
              setCurrentApplication(data.application);

              // Then load all resources into the context
              const resources = data.application.resources || {};

              // Use setTimeout to ensure the clear happens first
              setTimeout(() => {
                if (resources.workflows && resources.workflows.length > 0) {
                  setCurrentWorkflow(resources.workflows[0]); // Load the first workflow
                }
                if (resources.forms) {
                  setConnectedForms(resources.forms);
                }
                if (resources.dataModels) {
                  setDataModels(resources.dataModels);
                }
                if (resources.pages) {
                  setConnectedPages(resources.pages);
                }
              }, 100);

              // Transition from modal to window if in modal mode
              if (isModalMode) {
                toggleModalToWindow();
              }

              // Navigate to workflow editor
              setActiveSidebar('workflow-editor');

              const workflowCount = resources.workflows?.length || 0;
              const formCount = resources.forms?.length || 0;
              const dataModelCount = resources.dataModels?.length || 0;

              addAssistantMessage(
                `Welcome back to "${data.application.name}"!\n\nCurrent resources:\n• Workflows: ${workflowCount}\n• Forms: ${formCount}\n• Data Models: ${dataModelCount}\n\nWhat would you like to do?`,
                [
                  { id: 'build-wf', label: 'Build a new workflow', action: 'build_workflow' },
                  { id: 'view-wf', label: 'View existing workflows', action: 'view_workflow' }
                ]
              );
            } else {
              addAssistantMessage('Sorry, I couldn\'t load the application. Please try again.');
            }
          } catch (error) {
            console.error('Error loading application:', error);
            addAssistantMessage('Sorry, I encountered an error loading the application.');
          } finally {
            setIsProcessing(false);
          }
          break;

        case 'view_workflow':
          setActiveSidebar('workflow-editor');
          setIsProcessing(false);
          break;

        default:
          addAssistantMessage('I\'m not sure how to help with that. Try asking me to create an application or build a workflow.');
          setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      addAssistantMessage('Sorry, I encountered an error. Please try again.');
      setIsProcessing(false);
    }
  };

  const generateWithMoE = async (requirements) => {
    try {
      if (!currentApplication) {
        addAssistantMessage('Please create an application first before generating workflows.');
        setIsProcessing(false);
        return;
      }

      if (!socket || !socket.id) {
        addAssistantMessage('Socket connection not ready. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Clear previous progress messages
      setProgressMessages([]);

      addAssistantMessage('Starting generation using our Mixture of Experts system...');

      const response = await fetch('http://localhost:5000/api/ares/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements: requirements,
          conversationHistory: conversation.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          socketId: socket.id,
          context: {
            currentApplication: currentApplication,
            applicationId: currentApplication.id
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        // Reload application to show new resources
        const appResponse = await fetch(`http://localhost:5000/api/applications/${currentApplication.id}`);
        const appData = await appResponse.json();
        if (appData.success) {
          setCurrentApplication(appData.application);
        }
      } else {
        setProgressMessages([]);
        addAssistantMessage(`Sorry, I encountered an error generating the workflow: ${data.message}`);
      }
    } catch (error) {
      console.error('Error generating with MoE:', error);
      setProgressMessages([]);
      addAssistantMessage('Sorry, I encountered an error generating the workflow. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const createApplication = async () => {
    try {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 9);
      const appId = `app_${timestamp}_${randomId}`;

      // Generate Docker-style name
      const adjectives = ['happy', 'clever', 'brave', 'calm', 'eager', 'fancy', 'gentle', 'kind', 'wise', 'zen'];
      const nouns = ['dolphin', 'eagle', 'falcon', 'giraffe', 'hawk', 'jaguar', 'koala', 'lion', 'panda', 'tiger'];
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const appName = `${adjective}_${noun}`;

      const response = await fetch('http://localhost:5000/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: appId,
          name: appName,
          description: 'AI-generated application via ARES',
          domain: 'general',
          resources: {
            workflows: [],
            forms: [],
            pages: [],
            dataModels: []
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentApplication(data.application);

        // Transition from modal to window if in modal mode
        if (isModalMode) {
          toggleModalToWindow();
        }

        // Navigate to workflow editor
        setActiveSidebar('workflow-editor');

        addAssistantMessage(
          `Perfect! I've created a new application called "${appName}". You're now in the workflow designer. What kind of workflow would you like to build?`,
          [
            { id: 'wf1', label: 'Customer management system', action: 'build_workflow_with_prompt', prompt: 'Build a customer management system with customer registration, profile management, and activity tracking' },
            { id: 'wf2', label: 'Order processing workflow', action: 'build_workflow_with_prompt', prompt: 'Create an order processing workflow with order submission, payment, and fulfillment' },
            { id: 'wf3', label: 'Help desk ticketing system', action: 'build_workflow_with_prompt', prompt: 'Build a help desk ticketing system with ticket creation, assignment, and resolution tracking' }
          ]
        );
      } else {
        addAssistantMessage('Sorry, I couldn\'t create the application. Please try again.');
      }
    } catch (error) {
      console.error('Error creating application:', error);
      addAssistantMessage('Sorry, I encountered an error creating the application.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openApplicationsList = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/applications');
      const data = await response.json();

      if (data.success && data.applications && data.applications.length > 0) {
        const appList = data.applications
          .slice(0, 5)
          .map((app, index) => `${index + 1}. ${app.name} - ${app.description || 'No description'}`)
          .join('\n');

        addAssistantMessage(
          `Here are your recent applications:\n\n${appList}\n\nWhich application would you like to open?`,
          data.applications.slice(0, 5).map(app => ({
            id: app.id,
            label: app.name,
            action: 'load_application',
            applicationId: app.id
          }))
        );
      } else {
        addAssistantMessage(
          'You don\'t have any applications yet. Would you like to create one?',
          [
            { id: 'create', label: 'Yes, create new application', action: 'create_application' }
          ]
        );
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      addAssistantMessage('Sorry, I couldn\'t fetch your applications.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadApplication = async (suggestion) => {
    try {
      const applicationId = suggestion.applicationId;

      if (!applicationId) {
        addAssistantMessage('Sorry, I couldn\'t load the application. Please try again.');
        setIsProcessing(false);
        return;
      }

      const response = await fetch(`http://localhost:5000/api/applications/${applicationId}`);
      const data = await response.json();

      if (data.success && data.application) {
        setCurrentApplication(data.application);

        // Transition from modal to window if in modal mode
        if (isModalMode) {
          toggleModalToWindow();
        }

        // Navigate to workflow editor
        setActiveSidebar('workflow-editor');

        const workflowCount = data.application.resources?.workflows?.length || 0;
        const formCount = data.application.resources?.forms?.length || 0;
        const dataModelCount = data.application.resources?.dataModels?.length || 0;

        addAssistantMessage(
          `Welcome back to "${data.application.name}"!\n\nCurrent resources:\n• Workflows: ${workflowCount}\n• Forms: ${formCount}\n• Data Models: ${dataModelCount}\n\nWhat would you like to do?`,
          [
            { id: 'build-wf', label: 'Build a new workflow', action: 'build_workflow' },
            { id: 'view-wf', label: 'View existing workflows', action: 'view_workflow' }
          ]
        );
      } else {
        addAssistantMessage('Sorry, I couldn\'t load the application. Please try again.');
      }
    } catch (error) {
      console.error('Error loading application:', error);
      addAssistantMessage('Sorry, I encountered an error loading the application.');
    } finally {
      setIsProcessing(false);
    }
  };

  const buildWorkflow = async (prompt) => {
    try {
      if (!currentApplication) {
        addAssistantMessage('Please create or open an application first before building workflows.');
        setIsProcessing(false);
        return;
      }

      addAssistantMessage(`Great! I'll start building your workflow: "${prompt}". This may take a moment...`);

      // Send the prompt to ARES to either gather more requirements or generate directly
      const response = await fetch('http://localhost:5000/api/ares/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: conversation.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })).concat([{
            role: 'user',
            content: prompt,
            timestamp: Date.now()
          }]),
          context: {
            currentApplication: currentApplication,
            applicationId: currentApplication.id,
            activeView: window.location.pathname
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        addAssistantMessage(data.response.content, data.response.suggestions || []);
      } else {
        addAssistantMessage('Sorry, I encountered an error processing your request. Please try again.');
      }
    } catch (error) {
      console.error('Error building workflow:', error);
      addAssistantMessage('Sorry, I encountered an error building the workflow.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const containerClass = isModalMode
    ? 'ares-chatbot-modal'
    : 'ares-chatbot-window';

  return (
    <div className={containerClass}>
      <div className={`ares-chatbot ${isMinimized ? 'minimized' : ''}`}>
        {/* Header */}
        <div className="ares-header">
          <div className="ares-header-left">
            <div className="ares-avatar">
              <Sparkles size={20} />
            </div>
            <div className="ares-header-info">
              <h3 className="ares-title">ARES</h3>
              <span className="ares-status">Online</span>
            </div>
          </div>
          <div className="ares-header-actions">
            {!isModalMode && (
              <button
                className="ares-header-btn"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
            )}
            <button
              className="ares-header-btn"
              onClick={clearConversation}
              title="Clear conversation"
            >
              <Trash2 size={18} />
            </button>
            <button
              className="ares-header-btn"
              onClick={close}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        {!isMinimized && (
          <>
            <div className="ares-messages">
              {conversation.map((message, index) => (
                <div
                  key={message.id}
                  className={`ares-message-wrapper ${message.role}`}
                >
                  {message.role === 'assistant' && (
                    <div className="message-avatar assistant">
                      <Sparkles size={18} />
                    </div>
                  )}
                  <div className="message-group">
                    <div className="message-header">
                      <span className="message-sender">
                        {message.role === 'assistant' ? 'ARES' : 'You'}
                      </span>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="message-bubble">
                      <div className="message-text">{message.content}</div>
                    </div>
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="message-actions">
                        {message.suggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            className="action-card-btn"
                            onClick={() => handleSuggestionClick(suggestion)}
                            disabled={isProcessing}
                          >
                            <span className="action-label">{suggestion.label}</span>
                            <span className="action-arrow">→</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="message-avatar user">
                      <MessageCircle size={18} />
                    </div>
                  )}
                </div>
              ))}

              {/* Progress messages from MoE generation */}
              {progressMessages.map((progress) => (
                <div
                  key={progress.id}
                  className="ares-message-wrapper assistant progress"
                >
                  <div className="message-avatar assistant">
                    <Loader size={18} className="spin" />
                  </div>
                  <div className="message-group">
                    <div className="message-header">
                      <span className="message-sender">MoE System</span>
                      <span className="message-time">
                        {new Date(progress.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="message-bubble progress-bubble">
                      <div className="message-text">{progress.message}</div>
                    </div>
                  </div>
                </div>
              ))}

              {isProcessing && progressMessages.length === 0 && (
                <div className="ares-message-wrapper assistant">
                  <div className="message-avatar assistant">
                    <Sparkles size={18} />
                  </div>
                  <div className="message-group">
                    <div className="message-header">
                      <span className="message-sender">ARES</span>
                      <span className="message-time">
                        {new Date().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="message-bubble">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="ares-input-container">
              <button className="ares-attach-btn" title="Attach file">
                <Plus size={20} />
              </button>
              <input
                ref={inputRef}
                type="text"
                className="ares-input"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                disabled={isProcessing}
              />
              <button
                className="ares-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
              >
                <Send size={20} />
              </button>
            </div>
            <div className="ares-footer">
              ARES makes mistakes. Please verify important information.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AresChatbot;
