import React, { createContext, useContext, useState, useEffect } from 'react';

const WorkflowContext = createContext();

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within WorkflowProvider');
  }
  return context;
};

export const WorkflowProvider = ({ children, currentApp }) => {
  const [currentApplication, setCurrentApplication] = useState(null);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState('designer');
  const [activeSidebar, setActiveSidebar] = useState('workflow-editor');
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false);
  const [mappedRules, setMappedRules] = useState([]);
  const [dataModels, setDataModels] = useState([]);
  const [connectedForms, setConnectedForms] = useState([]);
  const [connectedPages, setConnectedPages] = useState([]);
  const [showAres, setShowAres] = useState(true);
  const [aresMode, setAresMode] = useState('modal'); // 'modal' or 'sidebar'

  // Load application data function (can be called manually or via useEffect)
  const loadApplicationData = async (appId) => {
    const applicationId = appId || currentApp?.id;
    if (applicationId) {
      try {
        console.log('[WorkflowContext] Loading application data for:', applicationId);
        const response = await fetch(`http://localhost:5000/api/applications/${applicationId}`);
        const data = await response.json();

        if (data.success && data.application) {
          setCurrentApplication(data.application);

          // Load workflows from application resources
          const workflows = data.application.resources?.workflows || [];
          console.log('[WorkflowContext] Loaded workflows:', workflows.length, workflows);
          if (workflows.length > 0) {
            // Workflows are already complete objects in the application resources
            // Set the last workflow as current (most recently added)
            const latestWorkflow = workflows[workflows.length - 1];
            const workflowEdges = (latestWorkflow.edges?.length > 0 ? latestWorkflow.edges : null)
              || (latestWorkflow.connections?.length > 0 ? latestWorkflow.connections : null)
              || [];
            console.log('[WorkflowContext] Setting current workflow:', {
              id: latestWorkflow.id,
              name: latestWorkflow.name,
              nodeCount: latestWorkflow.nodes?.length || 0,
              hasEdges: !!latestWorkflow.edges,
              hasConnections: !!latestWorkflow.connections,
              edgesLength: latestWorkflow.edges?.length,
              connectionsLength: latestWorkflow.connections?.length,
              edgesCount: workflowEdges.length,
              edges: latestWorkflow.edges,
              connections: latestWorkflow.connections,
              fullWorkflow: latestWorkflow
            });
            setCurrentWorkflow(latestWorkflow);
          }

          // Load forms from application resources (not from global database)
          const forms = data.application.resources?.forms || [];
          console.log('[WorkflowContext] Loading forms:', forms.length, forms.map(f => f.name || f.id));
          setConnectedForms(forms);

          // Load data models from application resources (not from global database)
          const models = data.application.resources?.dataModels || [];
          console.log('[WorkflowContext] Loading data models:', models.length);
          setDataModels(models);

          // Load pages from application resources (not from global database)
          const appPages = (data.application.resources?.pages || []).map(page => {
            // Flatten config properties into the page object
            if (page.config && typeof page.config === 'object') {
              return { ...page.config, ...page };
            }
            return page;
          });
          console.log('[WorkflowContext] Loading pages:', appPages.length);
          setConnectedPages(appPages);

          return data.application;
        }
      } catch (error) {
        console.error('[WorkflowContext] Failed to load application data:', error);
      }
    }
    return null;
  };

  // Load application data when currentApp changes
  useEffect(() => {
    if (currentApp && currentApp.id) {
      loadApplicationData(currentApp.id);
    }
  }, [currentApp]);

  const updateNodeData = (nodeId, newData) => {
    setCurrentWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    }));
  };

  const addNode = (nodeType, position) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: nodeType,
      position,
      data: { label: `New ${nodeType}`, description: '' }
    };
    setCurrentWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
  };

  const deleteNode = (nodeId) => {
    setCurrentWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));
  };

  const addEdge = (edge) => {
    setCurrentWorkflow(prev => ({
      ...prev,
      edges: [...prev.edges, edge]
    }));
  };

  const value = {
    currentApplication,
    setCurrentApplication,
    currentWorkflow,
    setCurrentWorkflow,
    selectedNode,
    setSelectedNode,
    activeTab,
    setActiveTab,
    activeSidebar,
    setActiveSidebar,
    propertiesPanelOpen,
    setPropertiesPanelOpen,
    mappedRules,
    setMappedRules,
    dataModels,
    setDataModels,
    connectedForms,
    setConnectedForms,
    connectedPages,
    setConnectedPages,
    showAres,
    setShowAres,
    aresMode,
    setAresMode,
    loadApplicationData,
    updateNodeData,
    addNode,
    deleteNode,
    addEdge
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
};
