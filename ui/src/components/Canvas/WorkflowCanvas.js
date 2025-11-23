import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './WorkflowCanvas.css';
import { useWorkflow } from '../../context/WorkflowContext';
import NodePalette from './NodePalette';
import Toast from '../Common/Toast';
import ValidationResultsModal from '../Common/ValidationResultsModal';
import StartProcessNode from './Nodes/StartProcessNode';
import ValidationNode from './Nodes/ValidationNode';
import DecisionNode from './Nodes/DecisionNode';
import NotificationNode from './Nodes/NotificationNode';
import DataProcessNode from './Nodes/DataProcessNode';
import EndEventNode from './Nodes/EndEventNode';
import UserTaskNode from './Nodes/UserTaskNode';
import ScriptTaskNode from './Nodes/ScriptTaskNode';
import TimerEventNode from './Nodes/TimerEventNode';
import LLMTaskNode from './Nodes/LLMTaskNode';
import { Grid3x3, Upload, Save, Download, Rocket, CheckCircle } from 'lucide-react';

const nodeTypes = {
  startProcess: StartProcessNode,
  validation: ValidationNode,
  decision: DecisionNode,
  notification: NotificationNode,
  dataProcess: DataProcessNode,
  endEvent: EndEventNode,
  userTask: UserTaskNode,
  scriptTask: ScriptTaskNode,
  timerEvent: TimerEventNode,
  llmTask: LLMTaskNode,
};

let id = 0;
const getId = () => `node_${id++}`;

const WorkflowCanvas = () => {
  const { currentWorkflow, setCurrentWorkflow, setSelectedNode, setPropertiesPanelOpen, setConnectedForms, setDataModels } = useWorkflow();
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [toast, setToast] = useState(null);
  const [validationResult, setValidationResult] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Initialize ReactFlow instance
  const onInit = useCallback((instance) => {
    console.log('ReactFlow initialized:', instance);
    setReactFlowInstance(instance);

    // Log that the canvas is ready
    setTimeout(() => {
      console.log('ReactFlow ready for interactions');
    }, 100);
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(currentWorkflow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentWorkflow?.edges || []);

  // Track last synced workflow ID to prevent re-sync during drag
  const lastWorkflowIdRef = useRef(currentWorkflow?.id);

  // Sync React Flow state with context state (only on major changes, not drag updates)
  useEffect(() => {
    if (!currentWorkflow) return;

    // Only sync if:
    // 1. Workflow ID changed (new workflow loaded)
    // 2. Number of nodes changed (node added/deleted)
    const workflowChanged = lastWorkflowIdRef.current !== currentWorkflow.id;
    const nodesCountChanged = nodes.length !== (currentWorkflow.nodes?.length || 0);

    if (workflowChanged || nodesCountChanged) {
      // Normalize edges: handle both 'edges' and 'connections' properties
      const workflowEdges = currentWorkflow.edges || currentWorkflow.connections || [];
      console.log('Syncing workflow state - Nodes:', currentWorkflow.nodes?.length || 0, 'Edges:', workflowEdges.length);

      if (currentWorkflow.nodes && currentWorkflow.nodes.length > 0) {
        setNodes(currentWorkflow.nodes);
        setEdges(workflowEdges);
        console.log('Nodes and edges set from context');
        lastWorkflowIdRef.current = currentWorkflow.id;
      }
    }
  }, [currentWorkflow, nodes.length, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => {
      const newEdge = { ...params, id: `edge-${Date.now()}`, animated: false };
      setEdges((eds) => addEdge(newEdge, eds));
      setCurrentWorkflow(prev => ({
        ...prev,
        edges: [...(prev.edges || prev.connections || []), newEdge]
      }));
    },
    [setEdges, setCurrentWorkflow]
  );

  const onNodeClick = useCallback(
    (event, node) => {
      setSelectedNode(node.id);
      setPropertiesPanelOpen(true);
    },
    [setSelectedNode, setPropertiesPanelOpen]
  );

  const onNodesChangeHandler = useCallback(
    (changes) => {
      onNodesChange(changes);

      // Handle node deletion
      const removeChanges = changes.filter(change => change.type === 'remove');
      if (removeChanges.length > 0) {
        setCurrentWorkflow(prev => ({
          ...prev,
          nodes: prev.nodes.filter(node => !removeChanges.find(c => c.id === node.id)),
          edges: (prev.edges || prev.connections || []).filter(edge =>
            !removeChanges.find(c => c.id === edge.source || c.id === edge.target)
          )
        }));
        return;
      }

      // Update context when nodes change (e.g., position changes)
      const updatedNodes = nodes.map(node => {
        const change = changes.find(c => c.id === node.id && c.type === 'position');
        if (change && change.position) {
          return { ...node, position: change.position };
        }
        return node;
      });
      setCurrentWorkflow(prev => ({ ...prev, nodes: updatedNodes }));
    },
    [onNodesChange, nodes, setCurrentWorkflow]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      console.log('Drop event triggered');

      const type = event.dataTransfer.getData('application/reactflow');
      console.log('Node type from drop:', type);

      if (typeof type === 'undefined' || !type) {
        console.warn('No valid node type in drop data');
        return;
      }

      // Check if reactFlowInstance is initialized
      if (!reactFlowInstance) {
        console.warn('ReactFlow instance not ready');
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1).replace(/([A-Z])/g, ' $1').trim(),
          description: 'New node'
        },
        draggable: true
      };

      console.log('Creating new node:', newNode);

      setNodes((nds) => nds.concat(newNode));
      setCurrentWorkflow(prev => ({
        ...prev,
        nodes: [...prev.nodes, newNode]
      }));
    },
    [reactFlowInstance, setNodes, setCurrentWorkflow]
  );

  const onNodesDelete = useCallback(
    (deleted) => {
      setCurrentWorkflow(prev => ({
        ...prev,
        nodes: prev.nodes.filter(node => !deleted.find(d => d.id === node.id)),
        edges: (prev.edges || prev.connections || []).filter(edge =>
          !deleted.find(d => d.id === edge.source || d.id === edge.target)
        )
      }));
    },
    [setCurrentWorkflow]
  );

  const handleAIWorkflowGenerated = useCallback(
    (workflow) => {
      console.log('handleAIWorkflowGenerated called with:', workflow);

      // Apply AI-generated workflow to canvas
      if (workflow && workflow.nodes && workflow.connections) {
        console.log('Valid workflow received, arranging nodes...');

        // Hierarchical layout algorithm
        const arrangeNodesHierarchically = (nodes, connections) => {
          // Build adjacency map
          const adjacencyMap = new Map();
          const incomingEdges = new Map();

          nodes.forEach(node => {
            adjacencyMap.set(node.id, []);
            incomingEdges.set(node.id, []);
          });

          connections.forEach(conn => {
            if (adjacencyMap.has(conn.source)) {
              adjacencyMap.get(conn.source).push(conn.target);
            }
            if (incomingEdges.has(conn.target)) {
              incomingEdges.get(conn.target).push(conn.source);
            }
          });

          // Find root nodes (nodes with no incoming edges)
          const rootNodes = nodes.filter(node =>
            incomingEdges.get(node.id).length === 0
          );

          // BFS to assign levels
          const levels = new Map();
          const queue = rootNodes.map(node => ({ id: node.id, level: 0 }));
          const visited = new Set();

          while (queue.length > 0) {
            const { id, level } = queue.shift();

            if (visited.has(id)) continue;
            visited.add(id);

            levels.set(id, level);

            const children = adjacencyMap.get(id) || [];
            children.forEach(childId => {
              if (!visited.has(childId)) {
                queue.push({ id: childId, level: level + 1 });
              }
            });
          }

          // Assign levels to unvisited nodes (in case of cycles or disconnected components)
          nodes.forEach(node => {
            if (!levels.has(node.id)) {
              levels.set(node.id, 0);
            }
          });

          // Group nodes by level
          const nodesByLevel = new Map();
          nodes.forEach(node => {
            const level = levels.get(node.id);
            if (!nodesByLevel.has(level)) {
              nodesByLevel.set(level, []);
            }
            nodesByLevel.get(level).push(node);
          });

          // Position nodes
          const HORIZONTAL_SPACING = 350;
          const VERTICAL_SPACING = 150;
          const START_X = 100;
          const START_Y = 100;

          const positioned = [];

          nodesByLevel.forEach((levelNodes, level) => {
            const x = START_X + (level * HORIZONTAL_SPACING);
            const totalHeight = (levelNodes.length - 1) * VERTICAL_SPACING;
            const startY = START_Y - (totalHeight / 2);

            levelNodes.forEach((node, indexInLevel) => {
              positioned.push({
                ...node,
                position: {
                  x: x,
                  y: startY + (indexInLevel * VERTICAL_SPACING) + (level * 50) // Slight offset per level
                },
                draggable: true
              });
            });
          });

          return positioned;
        };

        // Check if nodes need positioning
        const needsPositioning = workflow.nodes.some(node =>
          !node.position || (node.position.x === 0 && node.position.y === 0)
        );

        const arrangedNodes = needsPositioning
          ? arrangeNodesHierarchically(workflow.nodes, workflow.connections)
          : workflow.nodes.map(node => ({ ...node, draggable: true }));

        console.log('Setting nodes and edges:', arrangedNodes.length, workflow.connections.length);

        // Update forms and data models if they exist in the workflow
        if (workflow.forms && workflow.forms.length > 0) {
          console.log('Setting forms:', workflow.forms.length);
          setConnectedForms(workflow.forms);
        }

        if (workflow.dataModels && workflow.dataModels.length > 0) {
          console.log('Setting data models:', workflow.dataModels.length);
          setDataModels(workflow.dataModels);
        }

        setNodes(arrangedNodes);
        setEdges(workflow.connections);

        setCurrentWorkflow(prev => ({
          ...prev,
          nodes: arrangedNodes,
          edges: workflow.connections,
          forms: workflow.forms || prev.forms || [],
          dataModels: workflow.dataModels || prev.dataModels || []
        }));

        // Auto-fit view after a delay to ensure nodes are rendered
        const attemptFitView = (retries = 3) => {
          setTimeout(() => {
            console.log('Attempting to fit view, reactFlowInstance:', reactFlowInstance ? 'ready' : 'not ready');
            if (reactFlowInstance) {
              try {
                reactFlowInstance.fitView({
                  padding: 0.2,
                  maxZoom: 1,
                  duration: 400
                });
                console.log('Fit view applied successfully');
              } catch (error) {
                console.error('Error applying fitView:', error);
                if (retries > 0) {
                  console.log('Retrying fitView...');
                  attemptFitView(retries - 1);
                }
              }
            } else {
              console.warn('ReactFlow instance not available for fitView');
              if (retries > 0) {
                console.log('Waiting for ReactFlow instance, retries left:', retries);
                attemptFitView(retries - 1);
              }
            }
          }, 300);
        };

        attemptFitView();
      } else {
        console.warn('Invalid workflow data:', workflow);
      }
    },
    [setNodes, setEdges, setCurrentWorkflow, reactFlowInstance, setConnectedForms, setDataModels]
  );

  const handleSave = useCallback(() => {
    if (!currentWorkflow) {
      showToast('No workflow to save', 'warning');
      return;
    }

    // Create workflow JSON with connection information
    const workflowJSON = {
      id: currentWorkflow.id,
      name: currentWorkflow.name,
      version: "1.0",
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      },
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data
        }
      })),
      connections: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      }))
    };

    // Create and download JSON file
    const dataStr = JSON.stringify(workflowJSON, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentWorkflow.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentWorkflow, nodes, edges, showToast]);

  const handleValidate = useCallback(async () => {
    if (!currentWorkflow || nodes.length === 0) {
      showToast('No workflow to validate. Please create a workflow first.', 'warning');
      return;
    }

    try {
      // Call validation endpoint
      const response = await fetch(`http://localhost:5000/api/workflows/${currentWorkflow.id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        const validation = result.data;

        // Show validation modal with detailed results
        setValidationResult(validation);

        // Also log to console for debugging
        if (validation.valid) {
          console.log('[Validation] ✓ PASSED');
          if (validation.warnings.length > 0) {
            const warningList = validation.warnings.map(w => `  - ${w}`).join('\n');
            console.warn('[Validation] Warnings:\n' + warningList);
          }
        } else {
          console.error('[Validation] ✗ FAILED');
          const errorList = validation.errors.map(e => `  - ${e}`).join('\n');
          console.error('[Validation] Errors:\n' + errorList);

          if (validation.warnings.length > 0) {
            const warningList = validation.warnings.map(w => `  - ${w}`).join('\n');
            console.warn('[Validation] Warnings:\n' + warningList);
          }
        }
      } else {
        showToast(`Validation error: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Validation Error:', error);
      showToast(`Error validating workflow: ${error.message}`, 'error');
    }
  }, [currentWorkflow, nodes, showToast]);

  const handleDownloadBPMN = useCallback(async () => {
    if (!currentWorkflow || nodes.length === 0) {
      showToast('No workflow to export. Please create a workflow first.', 'warning');
      return;
    }

    try {
      // Create workflow JSON
      const workflowJSON = {
        id: currentWorkflow.id,
        name: currentWorkflow.name,
        version: "1.0",
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        },
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            ...node.data
          }
        })),
        connections: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle
        }))
      };

      // Call multi-agent BPMN conversion service
      const response = await fetch('http://localhost:5000/api/bpmn/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowJSON)
      });

      const result = await response.json();

      if (result.success) {
        // Download BPMN file
        const bpmnBlob = new Blob([result.bpmnXML], { type: 'application/xml' });
        const url = URL.createObjectURL(bpmnBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentWorkflow.name.replace(/\s+/g, '_')}_${Date.now()}.bpmn`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message with validation results
        console.log('BPMN Conversion Results:', result);
        const validationStatus = result.validationResults.valid ? '✓ Passed' : '✗ Failed';
        showToast(`BPMN file generated successfully! Validation: ${validationStatus}, KIE Compatible ✓, BPMN.io Compatible ✓`, 'success');
      } else {
        console.error('BPMN Conversion Error:', result.error);
        showToast(`Failed to generate BPMN file: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('BPMN Download Error:', error);
      showToast(`Error downloading BPMN file: ${error.message}`, 'error');
    }
  }, [currentWorkflow, nodes, edges, showToast]);

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) {
      showToast('No nodes to arrange', 'warning');
      return;
    }

    // Build adjacency map
    const adjacencyMap = new Map();
    const incomingEdges = new Map();

    nodes.forEach(node => {
      adjacencyMap.set(node.id, []);
      incomingEdges.set(node.id, []);
    });

    edges.forEach(conn => {
      if (adjacencyMap.has(conn.source)) {
        adjacencyMap.get(conn.source).push(conn.target);
      }
      if (incomingEdges.has(conn.target)) {
        incomingEdges.get(conn.target).push(conn.source);
      }
    });

    // Find root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(node =>
      incomingEdges.get(node.id).length === 0
    );

    // BFS to assign levels
    const levels = new Map();
    const queue = rootNodes.map(node => ({ id: node.id, level: 0 }));
    const visited = new Set();

    while (queue.length > 0) {
      const { id, level } = queue.shift();

      if (visited.has(id)) continue;
      visited.add(id);

      levels.set(id, level);

      const children = adjacencyMap.get(id) || [];
      children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push({ id: childId, level: level + 1 });
        }
      });
    }

    // Assign levels to unvisited nodes (in case of cycles or disconnected components)
    nodes.forEach(node => {
      if (!levels.has(node.id)) {
        levels.set(node.id, 0);
      }
    });

    // Group nodes by level
    const nodesByLevel = new Map();
    nodes.forEach(node => {
      const level = levels.get(node.id);
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level).push(node);
    });

    // Position nodes (vertical layout: top-to-bottom)
    const HORIZONTAL_SPACING = 350;
    const VERTICAL_SPACING = 250;
    const START_X = 100;
    const START_Y = 100;

    const positioned = [];

    nodesByLevel.forEach((levelNodes, level) => {
      const y = START_Y + (level * VERTICAL_SPACING);
      const totalWidth = (levelNodes.length - 1) * HORIZONTAL_SPACING;
      const startX = START_X - (totalWidth / 2);

      levelNodes.forEach((node, indexInLevel) => {
        positioned.push({
          ...node,
          position: {
            x: startX + (indexInLevel * HORIZONTAL_SPACING) + (level * 50), // Slight offset per level
            y: y
          },
          draggable: true
        });
      });
    });

    // Update nodes with new positions
    setNodes(positioned);
    setCurrentWorkflow(prev => ({ ...prev, nodes: positioned }));

    // Fit view after layout
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2, maxZoom: 1 });
      }
    }, 100);

    showToast('Layout arranged hierarchically', 'success');
  }, [nodes, edges, setNodes, setCurrentWorkflow, reactFlowInstance, showToast]);

  const handleImport = useCallback(() => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workflowJSON = JSON.parse(event.target.result);

          // Validate JSON structure
          if (!workflowJSON.nodes || !Array.isArray(workflowJSON.nodes)) {
            showToast('Invalid workflow JSON: missing or invalid nodes array', 'error');
            return;
          }

          // Update the highest id counter to avoid conflicts
          workflowJSON.nodes.forEach(node => {
            const nodeIdNum = parseInt(node.id.split('_')[1]);
            if (!isNaN(nodeIdNum) && nodeIdNum >= id) {
              id = nodeIdNum + 1;
            }
          });

          // Ensure proper node arrangement
          const arrangedNodes = workflowJSON.nodes.map((node, index) => {
            if (!node.position || (node.position.x === 0 && node.position.y === 0)) {
              return {
                ...node,
                position: { x: 300, y: 100 + (index * 180) },
                draggable: true
              };
            }
            return {
              ...node,
              draggable: true
            };
          });

          // Load nodes onto canvas
          setNodes(arrangedNodes);

          // Load connections/edges if they exist
          const edges = workflowJSON.connections || workflowJSON.edges || [];
          if (Array.isArray(edges)) {
            setEdges(edges);
          } else {
            setEdges([]);
          }

          // Update context
          setCurrentWorkflow({
            id: workflowJSON.id || currentWorkflow?.id || `workflow-${Date.now()}`,
            name: workflowJSON.name || currentWorkflow?.name || 'Imported Workflow',
            nodes: arrangedNodes,
            edges: edges
          });

          console.log('Workflow imported successfully:', workflowJSON.name || 'Untitled');
          showToast(`Workflow "${workflowJSON.name || 'Untitled'}" imported successfully!`, 'success');

          // Auto-fit view after import
          setTimeout(() => {
            if (reactFlowInstance) {
              reactFlowInstance.fitView({
                padding: 0.2,
                maxZoom: 1,
                duration: 400
              });
            }
          }, 100);
        } catch (error) {
          console.error('Error parsing workflow JSON:', error);
          showToast('Failed to import workflow: Invalid JSON format', 'error');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }, [setNodes, setEdges, setCurrentWorkflow, currentWorkflow, reactFlowInstance, showToast]);

  return (
    <div className="workflow-canvas-container">
      <NodePalette />
      <div className="workflow-canvas" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeHandler}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodesDelete={onNodesDelete}
          onInit={onInit}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          minZoom={0.1}
          maxZoom={2}
          fitViewOptions={{
            padding: 0.2,
            includeHiddenNodes: false,
            maxZoom: 1
          }}
          attributionPosition="bottom-left"
          deleteKeyCode="Delete"
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls />
          <MiniMap
            nodeColor="#d1d5db"
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>

        {/* Floating Action Buttons */}
        <div className="fab-container">
          <button className="fab-button fab-validate" onClick={handleValidate} title="Validate Workflow">
            <CheckCircle size={20} />
          </button>
          <button className="fab-button fab-auto-layout" onClick={handleAutoLayout} title="Auto Layout">
            <Grid3x3 size={20} />
          </button>
          <button className="fab-button fab-import" onClick={handleImport} title="Import Workflow">
            <Upload size={20} />
          </button>
          <button className="fab-button fab-save" onClick={handleSave} title="Save as JSON">
            <Save size={20} />
          </button>
          <button className="fab-button fab-download" onClick={handleDownloadBPMN} title="Download BPMN">
            <Download size={20} />
          </button>
          <button className="fab-button fab-publish" title="Publish Workflow">
            <Rocket size={20} />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Validation Results Modal */}
      {validationResult && (
        <ValidationResultsModal
          validationResult={validationResult}
          onClose={() => setValidationResult(null)}
        />
      )}
    </div>
  );
};

export default WorkflowCanvas;
