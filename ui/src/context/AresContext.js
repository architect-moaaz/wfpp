import React, { createContext, useContext, useState, useCallback } from 'react';

const AresContext = createContext();

export const useAres = () => {
  const context = useContext(AresContext);
  if (!context) {
    throw new Error('useAres must be used within AresProvider');
  }
  return context;
};

export const AresProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalMode, setIsModalMode] = useState(false);
  const [conversation, setConversation] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m ARES, your AI workflow assistant. I can help you create applications, build workflows, open existing projects, and more. What would you like to do today?',
      timestamp: new Date().toISOString(),
      suggestions: [
        { id: 'create-app', label: 'Create a new application', action: 'create_application' },
        { id: 'open-app', label: 'Open existing application', action: 'open_application' },
        { id: 'build-workflow', label: 'Build a workflow', action: 'build_workflow' }
      ]
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentApplication, setCurrentApplication] = useState(null);

  const addMessage = useCallback((message) => {
    setConversation(prev => [...prev, {
      ...message,
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: message.timestamp || new Date().toISOString()
    }]);
  }, []);

  const addUserMessage = useCallback((content) => {
    addMessage({
      role: 'user',
      content
    });
  }, [addMessage]);

  const addAssistantMessage = useCallback((content, suggestions = null) => {
    addMessage({
      role: 'assistant',
      content,
      suggestions
    });
  }, [addMessage]);

  const open = useCallback((modalMode = false) => {
    setIsOpen(true);
    setIsModalMode(modalMode);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Keep modal mode false when closing
    if (isModalMode) {
      setIsModalMode(false);
    }
  }, [isModalMode]);

  const toggleModalToWindow = useCallback(() => {
    setIsModalMode(false);
  }, []);

  const clearConversation = useCallback(() => {
    setConversation([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m ARES, your AI workflow assistant. I can help you create applications, build workflows, open existing projects, and more. What would you like to do today?',
        timestamp: new Date().toISOString(),
        suggestions: [
          { id: 'create-app', label: 'Create a new application', action: 'create_application' },
          { id: 'open-app', label: 'Open existing application', action: 'open_application' },
          { id: 'build-workflow', label: 'Build a workflow', action: 'build_workflow' }
        ]
      }
    ]);
  }, []);

  const value = {
    isOpen,
    isModalMode,
    conversation,
    isProcessing,
    currentApplication,
    setIsProcessing,
    setCurrentApplication,
    addMessage,
    addUserMessage,
    addAssistantMessage,
    open,
    close,
    toggleModalToWindow,
    clearConversation
  };

  return (
    <AresContext.Provider value={value}>
      {children}
    </AresContext.Provider>
  );
};
