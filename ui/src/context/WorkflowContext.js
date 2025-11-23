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

  // Load application data when currentApp changes
  useEffect(() => {
    const loadApplicationData = async () => {
      if (currentApp && currentApp.id) {
        try {
          const response = await fetch(`http://localhost:5000/api/applications/${currentApp.id}`);
          const data = await response.json();

          if (data.success && data.application) {
            setCurrentApplication(data.application);

            // Load workflows from application
            const workflows = data.application.resources?.workflows || [];
            if (workflows.length > 0) {
              // Fetch full workflow data for each workflow ID
              const workflowPromises = workflows.map(async (wf) => {
                const wfId = wf.id || wf;
                try {
                  const wfResponse = await fetch(`http://localhost:5000/api/workflows/${wfId}`);
                  const wfData = await wfResponse.json();
                  return wfData.success ? wfData.workflow : null;
                } catch (error) {
                  console.error(`Failed to fetch workflow ${wfId}:`, error);
                  return null;
                }
              });

              const loadedWorkflows = (await Promise.all(workflowPromises)).filter(w => w !== null);
              // Set the first workflow as current if available
              if (loadedWorkflows.length > 0 && loadedWorkflows[0]) {
                setCurrentWorkflow(loadedWorkflows[0]);
              }
            }

            // Load forms from application resources (not from global database)
            const forms = data.application.resources?.forms || [];
            setConnectedForms(forms);

            // Load data models from application resources (not from global database)
            const models = data.application.resources?.dataModels || [];
            setDataModels(models);

            // Load pages from application resources (not from global database)
            const appPages = data.application.resources?.pages || [];
            setConnectedPages(appPages);
          }
        } catch (error) {
          console.error('Failed to load application data:', error);
        }
      }
    };

    loadApplicationData();
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
