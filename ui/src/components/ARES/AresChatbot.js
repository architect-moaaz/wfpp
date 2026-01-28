import React, { useState, useRef, useEffect } from 'react';
import './AresChatbot.css';
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  Plus,
  Trash2,
  Rocket,
  CheckCircle,
  ExternalLink,
  Building2,
  Sun,
  Moon,
  Upload
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAres } from '../../context/AresContext';
import { useWorkflow } from '../../context/WorkflowContext';
import GameProgress from './GameProgress';

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
    clearConversation: clearConversationContext
  } = useAres();

  const {
    currentApplication,
    setCurrentApplication,
    setActiveSidebar,
    setCurrentWorkflow,
    setConnectedForms,
    setDataModels,
    setConnectedPages,
    loadApplicationData
  } = useWorkflow();

  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [progressMessages, setProgressMessages] = useState([]);
  const [currentThinkingStep, setCurrentThinkingStep] = useState(null);
  const [generationEvents, setGenerationEvents] = useState([]);
  const [socket, setSocket] = useState(null);
  const [environments, setEnvironments] = useState([]);
  const [deploymentProgress, setDeploymentProgress] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [completionActions, setCompletionActions] = useState([]);
  const [progressInsertIndex, setProgressInsertIndex] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [designPdfData, setDesignPdfData] = useState(null);
  const [showThemeSelection, setShowThemeSelection] = useState(false);
  const [pendingRequirements, setPendingRequirements] = useState(null);
  const messagesEndRef = useRef(null);
  const pdfFileInputRef = useRef(null);
  const inputRef = useRef(null);
  const environmentsRef = useRef([]); // Ref to track current environments for socket handler

  // Generate a persistent session ID for socket reconnection support
  const getSessionId = () => {
    const stored = sessionStorage.getItem('ares_session_id');
    if (stored) return stored;
    const newId = `ares_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('ares_session_id', newId);
    return newId;
  };
  const sessionIdRef = useRef(getSessionId());

  // Refs to avoid stale closures in socket handler
  const addAssistantMessageRef = useRef(addAssistantMessage);
  const loadApplicationDataRef = useRef(loadApplicationData);
  const setActiveSidebarRef = useRef(setActiveSidebar);
  const setIsProcessingRef = useRef(setIsProcessing);

  useEffect(() => {
    scrollToBottom();
  }, [conversation, progressMessages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Fetch environments on mount
  useEffect(() => {
    const fetchEnvironments = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/environments');
        if (response.ok) {
          const data = await response.json();
          setEnvironments(data);
          environmentsRef.current = data; // Update ref immediately
          console.log('[ARES] Environments loaded:', data.length);
        }
      } catch (err) {
        console.error('[ARES] Error fetching environments:', err);
      }
    };
    fetchEnvironments();
  }, []);

  // Keep refs in sync with latest values
  useEffect(() => {
    environmentsRef.current = environments;
  }, [environments]);

  useEffect(() => {
    addAssistantMessageRef.current = addAssistantMessage;
    loadApplicationDataRef.current = loadApplicationData;
    setActiveSidebarRef.current = setActiveSidebar;
    setIsProcessingRef.current = setIsProcessing;
  }, [addAssistantMessage, loadApplicationData, setActiveSidebar, setIsProcessing]);

  // Setup Socket.io connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');

    newSocket.on('connect', () => {
      console.log('[ARES] Socket connected:', newSocket.id);
      // Register session for reconnection support
      const sessionId = sessionIdRef.current;
      newSocket.emit('register:session', sessionId);
      console.log('[ARES] Registered session:', sessionId);
    });

    newSocket.on('ares:progress', (event) => {
      console.log('[ARES] Progress event:', event);

      // Add event to generation events for GameProgress
      setGenerationEvents(prev => [...prev, event]);

      if (event.type === 'completed') {
        // Clear progress messages and thinking step
        setProgressMessages([]);
        setCurrentThinkingStep(null);
        setIsProcessingRef.current(false);

        // Auto-load the generated resources
        if (event.resources && event.applicationId) {
          console.log('[ARES] Auto-loading generated resources:', event.resources);

          // Use the centralized loadApplicationData function to reload everything
          (async () => {
            try {
              console.log('[ARES] Reloading application data...');
              await loadApplicationDataRef.current(event.applicationId);

              // Navigate to workflow editor to show the generated workflow
              console.log('[ARES] Navigating to workflow editor');
              setActiveSidebarRef.current('workflows');

              console.log('[ARES] Auto-load complete!');
            } catch (error) {
              console.error('[ARES] Error auto-loading resources:', error);
            }
          })();
        }

        // Build deployment options from available environments (use ref to avoid stale closure)
        const currentEnvs = environmentsRef.current || [];
        console.log('[ARES] Building deploy options with environments:', currentEnvs.length);

        const deployOptions = currentEnvs.slice(0, 3).map(env => ({
          id: `deploy-${env.id}`,
          label: `Deploy to ${env.name}`,
          action: 'deploy_application',
          environmentId: env.id,
          environmentName: env.name
        }));

        // Store actions for GameProgress to display below completion message
        const actions = [
          ...deployOptions,
          { id: 'seed-data', label: 'Seed sample data', action: 'seed_data', applicationId: event.applicationId },
          { id: 'view', label: 'View workflow canvas', action: 'view_workflow' },
          { id: 'create-another', label: 'Create another workflow', action: 'build_workflow' }
        ];
        setCompletionActions(actions);
      } else if (event.type === 'error') {
        setProgressMessages([]);
        setCurrentThinkingStep(null);
        setGenerationEvents([]);
        setIsProcessingRef.current(false);
        addAssistantMessageRef.current(`Error: ${event.message}`);
      } else if (event.type === 'thinking-step') {
        // Update current thinking step display
        console.log('[ARES] Thinking step:', event.data || event);
        if (event.data) {
          setCurrentThinkingStep({
            agent: event.data.agent || 'MoE System',
            step: event.data.step || event.data.content || '',
            content: event.data.content || event.data.step || ''
          });
        }
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

  // Wrapper to clear conversation and progress state
  const clearConversation = () => {
    clearConversationContext();
    setProgressMessages([]);
    setGenerationEvents([]);
    setCompletionActions([]);
    setProgressInsertIndex(null);
    setCurrentThinkingStep(null);
    setSelectedTheme(null);
    setDesignPdfData(null);
    setShowThemeSelection(false);
    setPendingRequirements(null);
  };

  // Theme selection handlers
  const handleThemeSelect = (theme) => {
    setSelectedTheme(theme);
    setShowThemeSelection(false);

    // Add message about theme selection
    const themeLabel = theme === 'dark' ? 'Dark Theme' : 'Light Theme';
    addAssistantMessage(
      `Theme selected: ${themeLabel}. Now generating your application...`,
      []
    );

    // Proceed with generation using the selected theme
    if (pendingRequirements) {
      setTimeout(() => {
        generateWithMoE(pendingRequirements, theme, null);
      }, 500);
    }
  };

  const handlePdfUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Convert to base64 for sending to backend
        const base64Data = e.target.result.split(',')[1]; // Remove data:application/pdf;base64, prefix
        const pdfData = {
          name: file.name,
          data: base64Data,
          type: 'pdf',
          mimeType: 'application/pdf'
        };
        setDesignPdfData(pdfData);
        setSelectedTheme('figma-pdf');
        setShowThemeSelection(false);

        addAssistantMessage(
          `Figma design uploaded: ${file.name}. Analyzing your design and generating matching styles...`,
          []
        );

        // Proceed with generation using the uploaded PDF design
        if (pendingRequirements) {
          setTimeout(() => {
            generateWithMoE(pendingRequirements, 'figma-pdf', pdfData);
          }, 500);
        }
      };
      reader.readAsDataURL(file);
    }
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
          'I can help you with the following:\n\n- Create new applications\n- Open existing applications\n- Build workflows using AI\n- Generate forms and data models\n- Design mobile interfaces\n- Manage organization (users, roles, org chart)\n\nWhat would you like to do?',
          [
            { id: 'create-app', label: 'Create a new application', action: 'create_application' },
            { id: 'build-workflow', label: 'Build a workflow', action: 'build_workflow' },
            { id: 'open-app', label: 'Open existing application', action: 'open_application' },
            { id: 'manage-org', label: 'Manage organization', action: 'manage_organization' }
          ]
        );
        setIsProcessing(false);
      } else if (lowerInput.includes('organization') || lowerInput.includes('org chart') ||
                 lowerInput.includes('users') || lowerInput.includes('roles') ||
                 lowerInput.includes('department')) {
        await executeAction({ action: 'manage_organization' });
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
          // Show theme selection before generating
          setPendingRequirements(requirements);
          setShowThemeSelection(true);
          addAssistantMessage(
            'Before I generate your application, please select a theme for your pages and forms:',
            []
          );
          setIsProcessing(false);
          break;

        case 'select_theme':
          // User clicked "Choose theme and generate" - show theme selection UI
          setPendingRequirements(requirements);
          setShowThemeSelection(true);
          addAssistantMessage(
            'Please select a design theme for your application:',
            []
          );
          setIsProcessing(false);
          break;

        case 'select_light_theme':
          // User selected light theme from suggestions
          setPendingRequirements(requirements);
          handleThemeSelect('light');
          break;

        case 'select_dark_theme':
          // User selected dark theme from suggestions
          setPendingRequirements(requirements);
          handleThemeSelect('dark');
          break;

        case 'select_custom_theme':
          // User wants to upload Figma design PDF
          setPendingRequirements(requirements);
          addAssistantMessage(
            'Please upload your Figma design as a PDF file:',
            []
          );
          setShowThemeSelection(true);
          setIsProcessing(false);
          // Trigger PDF file picker
          setTimeout(() => {
            pdfFileInputRef.current?.click();
          }, 300);
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
              setActiveSidebar('workflows');

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
          setActiveSidebar('workflows');
          setIsProcessing(false);
          break;

        case 'manage_organization':
          // Navigate to organization management
          if (isModalMode) {
            toggleModalToWindow();
          }
          setActiveSidebar('org-chart');
          addAssistantMessage(
            'Welcome to Organization Management! Here you can:\n\n- View and edit your org chart\n- Manage departments and positions\n- Configure roles and permissions\n- Add users and groups\n\nWhat would you like to do?',
            [
              { id: 'view-org', label: 'View org chart', action: 'view_org_chart' },
              { id: 'back-apps', label: 'Back to applications', action: 'open_application' }
            ]
          );
          setIsProcessing(false);
          break;

        case 'view_org_chart':
          setActiveSidebar('org-chart');
          setIsProcessing(false);
          break;

        case 'deploy_application':
          await deployApplication(suggestion.environmentId, suggestion.environmentName);
          break;

        case 'seed_data':
          await seedApplicationData(suggestion.applicationId);
          break;

        case 'open_url':
          if (suggestion.url) {
            window.open(suggestion.url, '_blank');
          }
          setIsProcessing(false);
          break;

        case 'show_deploy_options':
          // Show environment selection for deployment (use ref to ensure fresh data)
          const currentEnvs = environmentsRef.current || environments || [];
          const envDeployOptions = currentEnvs.slice(0, 3).map(env => ({
            id: `deploy-${env.id}`,
            label: `Deploy to ${env.name}`,
            action: 'deploy_application',
            environmentId: env.id,
            environmentName: env.name
          }));
          addAssistantMessage(
            envDeployOptions.length > 0
              ? 'Choose an environment to deploy your application:'
              : 'No deployment environments configured. Please configure environments first.',
            envDeployOptions.length > 0 ? envDeployOptions : [
              { id: 'view-workflow', label: 'View workflow canvas', action: 'view_workflow' }
            ]
          );
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

  const generateWithMoE = async (requirements, theme = null, cssContent = null) => {
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

      setIsProcessing(true);

      // Clear previous progress messages, events, and completion actions
      setProgressMessages([]);
      setGenerationEvents([]);
      setCompletionActions([]);
      // Track where in conversation the progress should appear (after the "Starting generation" message)
      setProgressInsertIndex(conversation.length + 1);

      addAssistantMessage('Starting generation using our Mixture of Experts system...');

      // Build theme configuration
      let themeConfig = null;
      if (theme) {
        if (theme === 'figma-pdf' && cssContent) {
          // cssContent here is actually pdfData object for PDF uploads
          themeConfig = {
            theme: 'figma-pdf',
            designFile: cssContent  // { name, data, type, mimeType }
          };
        } else {
          themeConfig = {
            theme: theme,
            customCss: null
          };
        }
      }

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
          sessionId: sessionIdRef.current, // Use persistent sessionId for reconnection support
          themeConfig: themeConfig,
          context: {
            currentApplication: currentApplication,
            applicationId: currentApplication.id
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        // Generation started - completion will be notified via WebSocket
        console.log('[ARES] Generation started, waiting for WebSocket completion...');
        // Don't set isProcessing to false here - wait for WebSocket 'completed' or 'error' event
      } else {
        setProgressMessages([]);
        setIsProcessing(false);
        addAssistantMessage(`Sorry, I encountered an error starting generation: ${data.message}`);
      }
    } catch (error) {
      console.error('Error starting generation:', error);
      setProgressMessages([]);
      setIsProcessing(false);
      addAssistantMessage('Sorry, I encountered an error starting generation. Please try again.');
    }
    // Note: isProcessing will be set to false by the WebSocket 'completed' or 'error' handler
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
        setActiveSidebar('workflows');

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
        setActiveSidebar('workflows');

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

  const deployApplication = async (environmentId, environmentName) => {
    if (!currentApplication) {
      addAssistantMessage('No application selected. Please create or open an application first.');
      setIsProcessing(false);
      return;
    }

    try {
      setIsDeploying(true);
      addAssistantMessage(`Starting deployment to ${environmentName}...`);

      // Start the deployment
      const response = await fetch('http://localhost:5000/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: currentApplication.id,
          environment_id: environmentId
        })
      });

      const deployment = await response.json();

      if (deployment.id) {
        // Poll for deployment status
        setDeploymentProgress({
          id: deployment.id,
          status: deployment.status,
          steps: deployment.steps || [],
          progress: deployment.progress || 0
        });

        // Start polling for updates
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`http://localhost:5000/api/deployments/${deployment.id}`);
            const statusData = await statusResponse.json();

            setDeploymentProgress({
              id: statusData.id,
              status: statusData.status,
              steps: statusData.steps || [],
              progress: statusData.progress || 0
            });

            // Update progress message
            const completedSteps = (statusData.steps || []).filter(s => s.status === 'completed').length;
            const totalSteps = (statusData.steps || []).length;
            const currentStep = (statusData.steps || []).find(s => s.status === 'in_progress');

            if (currentStep) {
              setProgressMessages([{
                id: Date.now(),
                message: `${currentStep.name}... (${completedSteps}/${totalSteps})`,
                timestamp: Date.now()
              }]);
            }

            if (statusData.status === 'completed') {
              clearInterval(pollInterval);
              setIsDeploying(false);
              setDeploymentProgress(null);
              setProgressMessages([]);

              // Show success with URLs
              const urls = statusData.urls || {};
              const appUrl = urls.frontend || urls.backend;
              const urlMessage = urls.frontend
                ? `Frontend: ${urls.frontend}\nBackend API: ${urls.backend || 'N/A'}`
                : urls.backend
                  ? `Backend API: ${urls.backend}`
                  : 'URLs not available yet';

              // Build actions based on available URLs
              const actions = [];
              if (appUrl) {
                actions.push({ id: 'open-frontend', label: 'Open Application', action: 'open_url', url: appUrl });
              }
              actions.push({ id: 'deploy-another', label: 'Deploy to another environment', action: 'show_deploy_options' });
              actions.push({ id: 'view-workflow', label: 'View workflow canvas', action: 'view_workflow' });

              addAssistantMessage(
                `Deployment to ${environmentName} completed successfully!\n\n${urlMessage}`,
                actions
              );
              setIsProcessing(false);
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval);
              setIsDeploying(false);
              setDeploymentProgress(null);
              setProgressMessages([]);

              addAssistantMessage(
                `Deployment to ${environmentName} failed: ${statusData.error_message || 'Unknown error'}`,
                [
                  { id: 'retry', label: 'Retry deployment', action: 'deploy_application', environmentId, environmentName },
                  { id: 'view-workflow', label: 'View workflow canvas', action: 'view_workflow' }
                ]
              );
              setIsProcessing(false);
            }
          } catch (pollError) {
            console.error('[ARES] Error polling deployment status:', pollError);
          }
        }, 2000);

        // Clear interval after 5 minutes (timeout)
        setTimeout(() => {
          clearInterval(pollInterval);
          if (isDeploying) {
            setIsDeploying(false);
            setDeploymentProgress(null);
            addAssistantMessage('Deployment is taking longer than expected. Please check the deployment status manually.');
            setIsProcessing(false);
          }
        }, 300000);
      } else {
        setIsDeploying(false);
        addAssistantMessage(`Failed to start deployment: ${deployment.error || 'Unknown error'}`);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('[ARES] Error deploying application:', error);
      setIsDeploying(false);
      addAssistantMessage('Sorry, I encountered an error starting the deployment. Please try again.');
      setIsProcessing(false);
    }
  };

  const seedApplicationData = async (applicationId) => {
    if (!applicationId && !currentApplication) {
      addAssistantMessage('No application selected. Please create or open an application first.');
      setIsProcessing(false);
      return;
    }

    const appId = applicationId || currentApplication.id;

    try {
      addAssistantMessage('Analyzing data models and generating sample data...');

      const response = await fetch(`http://localhost:5000/api/applications/${appId}/seed-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordsPerModel: 15
        })
      });

      const data = await response.json();

      if (data.success) {
        const { models, totalRecords, insertedCount } = data.sampleData;

        addAssistantMessage(
          `Sample data seeded successfully!\n\n` +
          `• Data Models: ${models}\n` +
          `• Total Records Generated: ${totalRecords}\n` +
          `• Records Inserted: ${insertedCount}\n\n` +
          `Your application database is now populated with realistic test data.`,
          [
            { id: 'deploy-now', label: 'Deploy application', action: 'show_deploy_options' },
            { id: 'view-workflow', label: 'View workflow canvas', action: 'view_workflow' }
          ]
        );
      } else {
        addAssistantMessage(
          `Failed to seed data: ${data.error || 'Unknown error'}`,
          [
            { id: 'retry-seed', label: 'Retry seeding', action: 'seed_data', applicationId: appId },
            { id: 'view-workflow', label: 'View workflow canvas', action: 'view_workflow' }
          ]
        );
      }
    } catch (error) {
      console.error('[ARES] Error seeding data:', error);
      addAssistantMessage('Sorry, I encountered an error seeding the data. Please try again.');
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
                <React.Fragment key={message.id}>
                  <div className={`ares-message-wrapper ${message.role}`}>
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
                  {/* Show GameProgress after the message at progressInsertIndex */}
                  {progressInsertIndex !== null && index === progressInsertIndex - 1 && (
                    <GameProgress
                      events={generationEvents}
                      isGenerating={isProcessing}
                      actions={completionActions}
                      onActionClick={handleSuggestionClick}
                    />
                  )}
                </React.Fragment>
              ))}

              {/* Show GameProgress at the end only if insert index not reached yet */}
              {(progressInsertIndex === null || progressInsertIndex > conversation.length) && generationEvents.length > 0 && (
                <GameProgress
                  events={generationEvents}
                  isGenerating={isProcessing}
                  actions={completionActions}
                  onActionClick={handleSuggestionClick}
                />
              )}

              {/* Theme Selection UI */}
              {showThemeSelection && (
                <div className="ares-message-wrapper assistant">
                  <div className="message-avatar assistant">
                    <Sparkles size={18} />
                  </div>
                  <div className="message-group">
                    <div className="message-actions">
                      <button
                        className="action-card-btn"
                        onClick={() => handleThemeSelect('light')}
                        disabled={isProcessing}
                      >
                        <Sun size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
                        <span className="action-label">Light Theme</span>
                        <span className="action-arrow">→</span>
                      </button>
                      <button
                        className="action-card-btn"
                        onClick={() => handleThemeSelect('dark')}
                        disabled={isProcessing}
                      >
                        <Moon size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
                        <span className="action-label">Dark Theme</span>
                        <span className="action-arrow">→</span>
                      </button>
                      <button
                        className="action-card-btn"
                        onClick={() => pdfFileInputRef.current?.click()}
                        disabled={isProcessing}
                      >
                        <Upload size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
                        <span className="action-label">Upload Figma Design (PDF)</span>
                        <span className="action-arrow">→</span>
                      </button>
                    </div>
                    <input
                      ref={pdfFileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              )}

              {isProcessing && !currentThinkingStep && progressMessages.length === 0 && (
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
