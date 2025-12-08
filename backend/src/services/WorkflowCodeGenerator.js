

class WorkflowCodeGenerator {
  /**
   * Validate workflow before generation
   */
  async validateWorkflow(workflow) {
    const errors = [];

    if (!workflow || !workflow.definition) {
      errors.push('Invalid workflow structure');
    }

    if (!workflow.definition.nodes || workflow.definition.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check for disallowed patterns
    const hasArbitraryCode = this.checkForArbitraryCode(workflow);
    if (hasArbitraryCode) {
      errors.push('Workflow contains potentially unsafe code');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for arbitrary code execution
   */
  checkForArbitraryCode(workflow) {
    const dangerousPatterns = [
      /eval\(/,
      /Function\(/,
      /require\(/,
      /import\(/,
      /fs\./,
      /child_process/,
      /exec\(/,
      /spawn\(/
    ];

    const workflowStr = JSON.stringify(workflow);
    return dangerousPatterns.some(pattern => pattern.test(workflowStr));
  }

  /**
   * Generate deployable code from workflow
   */
  async generate(workflow) {
    console.log(`Generating code for workflow ${workflow.id}`);

    const codePackage = {
      // Frontend React app
      frontend: this.generateFrontend(workflow),

      // Backend API
      backend: this.generateBackend(workflow),

      // Configuration files
      config: this.generateConfig(workflow)
    };

    return codePackage;
  }

  /**
   * Generate frontend React application
   */
  generateFrontend(workflow) {
    // Create app name from workflow name (lowercase, replace spaces with hyphens)
    const appName = (workflow.name || 'workflow-app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const packageJson = {
      name: appName,
      version: '1.0.0',
      private: true,
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-scripts': '5.0.1',
        axios: '^1.4.0'
      },
      scripts: {
        start: 'react-scripts start',
        build: 'react-scripts build',
        test: 'react-scripts test',
        eject: 'react-scripts eject'
      }
    };

    const appJs = `
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [instances, setInstances] = useState([]);
  const [currentInstance, setCurrentInstance] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  // Fetch all workflow instances
  const fetchInstances = async () => {
    try {
      const response = await axios.get(\`\${API_BASE}/workflow/instances\`);
      setInstances(response.data.instances || []);
    } catch (error) {
      console.error('Error fetching instances:', error);
    }
  };

  // Start new workflow
  const startWorkflow = async () => {
    setLoading(true);
    try {
      const response = await axios.post(\`\${API_BASE}/workflow/start\`, {
        initialData: formData
      });

      setCurrentInstance(response.data.instanceId);
      await fetchInstances();
      await loadInstanceDetails(response.data.instanceId);
    } catch (error) {
      console.error('Error starting workflow:', error);
      alert('Error starting workflow: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Load instance details
  const loadInstanceDetails = async (instanceId) => {
    try {
      const [statusRes, tasksRes] = await Promise.all([
        axios.get(\`\${API_BASE}/workflow/\${instanceId}/status\`),
        axios.get(\`\${API_BASE}/workflow/\${instanceId}/tasks\`)
      ]);

      setTasks(tasksRes.data.tasks || []);
    } catch (error) {
      console.error('Error loading instance details:', error);
    }
  };

  // Complete a task
  const completeTask = async (taskId) => {
    if (!currentInstance) return;

    const taskData = formData[taskId] || {};

    try {
      await axios.post(
        \`\${API_BASE}/workflow/\${currentInstance}/task/\${taskId}/complete\`,
        { data: taskData }
      );

      await loadInstanceDetails(currentInstance);
      await fetchInstances();
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Error completing task: ' + error.message);
    }
  };

  // Select instance
  const selectInstance = (instanceId) => {
    setCurrentInstance(instanceId);
    loadInstanceDetails(instanceId);
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>${workflow.name}</h1>
        <p className="subtitle">Workflow Runtime Engine</p>
      </header>

      <div className="container">
        <div className="sidebar">
          <div className="section">
            <h2>Start New Workflow</h2>
            <button
              onClick={startWorkflow}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Starting...' : 'Start Workflow'}
            </button>
          </div>

          <div className="section">
            <h2>Workflow Instances</h2>
            <div className="instance-list">
              {instances.length === 0 ? (
                <p className="empty-state">No instances yet</p>
              ) : (
                instances.map(instance => (
                  <div
                    key={instance.id}
                    className={\`instance-item \${
                      currentInstance === instance.id ? 'active' : ''
                    }\`}
                    onClick={() => selectInstance(instance.id)}
                  >
                    <div className="instance-id">{instance.id.substring(0, 8)}...</div>
                    <div className={\`status status-\${instance.status}\`}>
                      {instance.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="main-content">
          {currentInstance ? (
            <>
              <div className="section">
                <h2>Active Tasks</h2>
                {tasks.length === 0 ? (
                  <p className="empty-state">No active tasks</p>
                ) : (
                  <div className="tasks-list">
                    {tasks.map(task => (
                      <div key={task.id} className="task-card">
                        <h3>{task.nodeName}</h3>
                        <p className="task-id">Task ID: {task.id}</p>

                        {task.formData && Object.keys(task.formData).length > 0 && (
                          <div className="form-data">
                            {Object.entries(task.formData).map(([key, value]) => (
                              <div key={key} className="form-field">
                                <label>{key}</label>
                                <input
                                  type="text"
                                  placeholder={value}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      [task.id]: {
                                        ...(formData[task.id] || {}),
                                        [key]: e.target.value
                                      }
                                    })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => completeTask(task.id)}
                          className="btn btn-success"
                        >
                          Complete Task
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="section">
                <h2>Instance Details</h2>
                <button
                  onClick={() => loadInstanceDetails(currentInstance)}
                  className="btn btn-secondary"
                >
                  Refresh
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state-large">
              <h2>No Instance Selected</h2>
              <p>Start a new workflow or select an existing instance from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
`;

    const appCss = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.App {
  min-height: 100vh;
  background: #f5f7fa;
}

.App-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.App-header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  opacity: 0.9;
  font-size: 1rem;
}

.container {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.sidebar {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  height: fit-content;
}

.main-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  min-height: 500px;
}

.section {
  margin-bottom: 2rem;
}

.section h2 {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #333;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-success {
  background: #48bb78;
  color: white;
  width: 100%;
  margin-top: 1rem;
}

.btn-success:hover {
  background: #38a169;
}

.btn-secondary {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-secondary:hover {
  background: #cbd5e0;
}

.instance-list {
  max-height: 400px;
  overflow-y: auto;
}

.instance-item {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.instance-item:hover {
  border-color: #667eea;
  background: #f7fafc;
}

.instance-item.active {
  border-color: #667eea;
  background: #edf2f7;
}

.instance-id {
  font-family: monospace;
  font-size: 0.9rem;
  color: #4a5568;
  margin-bottom: 0.5rem;
}

.status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-running {
  background: #bee3f8;
  color: #2c5282;
}

.status-completed {
  background: #c6f6d5;
  color: #22543d;
}

.status-failed {
  background: #fed7d7;
  color: #742a2a;
}

.empty-state {
  color: #a0aec0;
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;
}

.empty-state-large {
  text-align: center;
  padding: 4rem 2rem;
  color: #a0aec0;
}

.empty-state-large h2 {
  color: #4a5568;
  margin-bottom: 0.5rem;
}

.tasks-list {
  display: grid;
  gap: 1rem;
}

.task-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f7fafc;
}

.task-card h3 {
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.task-id {
  font-family: monospace;
  font-size: 0.85rem;
  color: #718096;
  margin-bottom: 1rem;
}

.form-data {
  margin-top: 1rem;
}

.form-field {
  margin-bottom: 1rem;
}

.form-field label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 0.5rem;
}

.form-field input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 1rem;
}

.form-field input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
`;

    const indexHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${workflow.name}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

    const indexJs = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

    return {
      'package.json': JSON.stringify(packageJson, null, 2),
      'public/index.html': indexHtml,
      'src/App.js': appJs,
      'src/App.css': appCss,
      'src/index.js': indexJs,
      'src/index.css': 'body { margin: 0; font-family: sans-serif; }'
    };
  }

  /**
   * Generate backend Express API
   */
  generateBackend(workflow) {
    // Create app name from workflow name (lowercase, replace spaces with hyphens)
    const appName = (workflow.name || 'workflow-app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const packageJson = {
      name: `${appName}-api`,
      version: '1.0.0',
      main: 'server.js',
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        dotenv: '^16.0.3',
        uuid: '^9.0.0',
        axios: '^1.4.0'
      },
      scripts: {
        start: 'node server.js'
      }
    };

    const serverJs = `
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const WorkflowEngine = require('./workflow-engine');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize workflow engine with workflow definition
const workflowDefinition = ${JSON.stringify(workflow.definition, null, 2)};
const engine = new WorkflowEngine(workflowDefinition);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    workflow: '${workflow.id}',
    workflowName: '${workflow.name}'
  });
});

// Start a new workflow instance
app.post('/workflow/start', async (req, res) => {
  try {
    const { initialData } = req.body;
    const instance = await engine.startWorkflow(initialData || {});

    res.json({
      instanceId: instance.id,
      status: instance.status,
      currentNodes: instance.currentNodes,
      message: 'Workflow started successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get workflow instance status
app.get('/workflow/:instanceId/status', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const instance = engine.getInstance(instanceId);

    if (!instance) {
      return res.status(404).json({ error: 'Workflow instance not found' });
    }

    res.json({
      instanceId: instance.id,
      status: instance.status,
      currentNodes: instance.currentNodes,
      data: instance.data,
      history: instance.history,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active tasks for a workflow instance
app.get('/workflow/:instanceId/tasks', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const tasks = engine.getActiveTasks(instanceId);

    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete a user task
app.post('/workflow/:instanceId/task/:taskId/complete', async (req, res) => {
  try {
    const { instanceId, taskId } = req.params;
    const { data } = req.body;

    await engine.completeTask(instanceId, taskId, data || {});
    const instance = engine.getInstance(instanceId);

    res.json({
      message: 'Task completed successfully',
      instanceId: instance.id,
      status: instance.status,
      currentNodes: instance.currentNodes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all workflow instances
app.get('/workflow/instances', (req, res) => {
  try {
    const instances = engine.getAllInstances();
    res.json({ instances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger an event
app.post('/workflow/:instanceId/event/:eventName', async (req, res) => {
  try {
    const { instanceId, eventName } = req.params;
    const { data } = req.body;

    await engine.triggerEvent(instanceId, eventName, data || {});
    const instance = engine.getInstance(instanceId);

    res.json({
      message: 'Event triggered successfully',
      instanceId: instance.id,
      status: instance.status,
      currentNodes: instance.currentNodes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(\`Workflow Engine Server running on port \${PORT}\`);
  console.log(\`Workflow: ${workflow.name}\`);
  console.log(\`Nodes: \${workflowDefinition.nodes.length}\`);
});
`;

    const envExample = `
PORT=5000
NODE_ENV=production
`;

    // Workflow Engine - Core state machine
    const workflowEngineJs = this.generateWorkflowEngine();

    // Node Handlers - Different node type processors
    const nodeHandlersJs = this.generateNodeHandlers();

    return {
      'package.json': JSON.stringify(packageJson, null, 2),
      'server.js': serverJs,
      'workflow-engine.js': workflowEngineJs,
      'node-handlers.js': nodeHandlersJs,
      '.env.example': envExample
    };
  }

  /**
   * Generate Workflow Engine - State Machine
   */
  generateWorkflowEngine() {
    return `
const { v4: uuidv4 } = require('uuid');
const NodeHandlers = require('./node-handlers');

class WorkflowEngine {
  constructor(workflowDefinition) {
    this.definition = workflowDefinition;
    this.instances = new Map();
    this.nodeHandlers = new NodeHandlers();

    // Build node lookup map
    this.nodes = new Map();
    this.definition.nodes.forEach(node => {
      this.nodes.set(node.id, node);
    });

    // Build edge lookup map (from source to targets)
    this.edges = new Map();
    this.definition.edges.forEach(edge => {
      if (!this.edges.has(edge.source)) {
        this.edges.set(edge.source, []);
      }
      this.edges.get(edge.source).push({
        id: edge.id,
        target: edge.target,
        condition: edge.condition
      });
    });
  }

  /**
   * Start a new workflow instance
   */
  async startWorkflow(initialData = {}) {
    const instanceId = uuidv4();

    // Find start node
    const startNode = Array.from(this.nodes.values()).find(
      node => node.type === 'startProcess' || node.type === 'startEvent'
    );

    if (!startNode) {
      throw new Error('No start node found in workflow definition');
    }

    const instance = {
      id: instanceId,
      status: 'running',
      currentNodes: [startNode.id],
      data: { ...initialData },
      history: [],
      activeTasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.instances.set(instanceId, instance);

    // Execute start node
    await this.executeNode(instanceId, startNode.id);

    return instance;
  }

  /**
   * Execute a node
   */
  async executeNode(instanceId, nodeId) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(\`Instance \${instanceId} not found\`);
    }

    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(\`Node \${nodeId} not found\`);
    }

    console.log(\`Executing node: \${node.id} (type: \${node.type})\`);

    // Add to history
    instance.history.push({
      nodeId: node.id,
      nodeName: node.data?.label || node.id,
      nodeType: node.type,
      timestamp: new Date().toISOString(),
      status: 'executing'
    });

    // Execute node based on type
    const result = await this.nodeHandlers.execute(node, instance);

    // Update history
    instance.history[instance.history.length - 1].status = 'completed';
    instance.history[instance.history.length - 1].result = result;

    // Handle different node results
    if (result.waitForTask) {
      // User task - add to active tasks
      instance.activeTasks.push({
        id: uuidv4(),
        nodeId: node.id,
        nodeName: node.data?.label || node.id,
        formData: node.data?.formData || {},
        createdAt: new Date().toISOString()
      });
      instance.updatedAt = new Date().toISOString();
      return;
    }

    if (result.data) {
      // Merge result data into instance data
      instance.data = { ...instance.data, ...result.data };
    }

    // Check if this is an end node
    if (node.type === 'endEvent') {
      instance.status = 'completed';
      instance.currentNodes = [];
      instance.updatedAt = new Date().toISOString();
      console.log(\`Workflow instance \${instanceId} completed\`);
      return;
    }

    // Move to next nodes
    await this.transitionToNext(instanceId, nodeId);
  }

  /**
   * Transition to next nodes
   */
  async transitionToNext(instanceId, fromNodeId) {
    const instance = this.instances.get(instanceId);
    const outgoingEdges = this.edges.get(fromNodeId) || [];

    // Remove current node from currentNodes
    instance.currentNodes = instance.currentNodes.filter(id => id !== fromNodeId);

    if (outgoingEdges.length === 0) {
      // No outgoing edges - workflow stuck
      console.warn(\`Node \${fromNodeId} has no outgoing edges\`);
      if (instance.currentNodes.length === 0) {
        instance.status = 'completed';
      }
      return;
    }

    // Evaluate conditions and find valid edges
    const validEdges = outgoingEdges.filter(edge => {
      if (!edge.condition) return true;
      // Simple condition evaluation (can be enhanced)
      return this.evaluateCondition(edge.condition, instance.data);
    });

    // Get target nodes
    const nextNodeIds = validEdges.map(edge => edge.target);

    // Add to current nodes
    instance.currentNodes.push(...nextNodeIds);
    instance.updatedAt = new Date().toISOString();

    // Execute next nodes
    for (const nodeId of nextNodeIds) {
      await this.executeNode(instanceId, nodeId);
    }
  }

  /**
   * Evaluate condition
   */
  evaluateCondition(condition, data) {
    try {
      // Simple condition evaluation
      // Format: "variable === value" or "variable > value"
      const fn = new Function('data', \`return \${condition}\`);
      return fn(data);
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return true; // Default to true if condition fails
    }
  }

  /**
   * Complete a user task
   */
  async completeTask(instanceId, taskId, taskData = {}) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(\`Instance \${instanceId} not found\`);
    }

    const taskIndex = instance.activeTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(\`Task \${taskId} not found\`);
    }

    const task = instance.activeTasks[taskIndex];

    // Merge task data into instance data
    instance.data = { ...instance.data, ...taskData };

    // Remove task from active tasks
    instance.activeTasks.splice(taskIndex, 1);

    // Continue workflow from this node
    await this.transitionToNext(instanceId, task.nodeId);
  }

  /**
   * Trigger an event
   */
  async triggerEvent(instanceId, eventName, eventData = {}) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(\`Instance \${instanceId} not found\`);
    }

    // Find event nodes matching the event name
    const eventNodes = Array.from(this.nodes.values()).filter(
      node => node.type === 'intermediateEvent' && node.data?.eventName === eventName
    );

    if (eventNodes.length === 0) {
      console.warn(\`No event nodes found for event: \${eventName}\`);
      return;
    }

    // Merge event data
    instance.data = { ...instance.data, ...eventData };

    // Execute event nodes
    for (const node of eventNodes) {
      if (instance.currentNodes.includes(node.id)) {
        await this.executeNode(instanceId, node.id);
      }
    }
  }

  /**
   * Get workflow instance
   */
  getInstance(instanceId) {
    return this.instances.get(instanceId);
  }

  /**
   * Get all instances
   */
  getAllInstances() {
    return Array.from(this.instances.values());
  }

  /**
   * Get active tasks for an instance
   */
  getActiveTasks(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(\`Instance \${instanceId} not found\`);
    }
    return instance.activeTasks;
  }
}

module.exports = WorkflowEngine;
`;
  }

  /**
   * Generate Node Handlers
   */
  generateNodeHandlers() {
    return `
const axios = require('axios');

class NodeHandlers {
  /**
   * Execute a node based on its type
   */
  async execute(node, instance) {
    const handler = this.getHandler(node.type);
    if (!handler) {
      console.warn(\`No handler for node type: \${node.type}\`);
      return { success: true };
    }

    return await handler.call(this, node, instance);
  }

  /**
   * Get handler for node type
   */
  getHandler(nodeType) {
    const handlers = {
      startProcess: this.handleStartEvent,
      startEvent: this.handleStartEvent,
      endEvent: this.handleEndEvent,
      userTask: this.handleUserTask,
      serviceTask: this.handleServiceTask,
      scriptTask: this.handleScriptTask,
      exclusiveGateway: this.handleExclusiveGateway,
      parallelGateway: this.handleParallelGateway,
      intermediateEvent: this.handleIntermediateEvent
    };

    return handlers[nodeType];
  }

  /**
   * Handle Start Event
   */
  async handleStartEvent(node, instance) {
    console.log(\`Start event: \${node.data?.label || node.id}\`);
    return {
      success: true,
      data: {}
    };
  }

  /**
   * Handle End Event
   */
  async handleEndEvent(node, instance) {
    console.log(\`End event: \${node.data?.label || node.id}\`);
    return {
      success: true,
      end: true
    };
  }

  /**
   * Handle User Task
   */
  async handleUserTask(node, instance) {
    console.log(\`User task: \${node.data?.label || node.id}\`);

    // User tasks wait for external completion
    return {
      success: true,
      waitForTask: true
    };
  }

  /**
   * Handle Service Task
   */
  async handleServiceTask(node, instance) {
    console.log(\`Service task: \${node.data?.label || node.id}\`);

    const config = node.data?.serviceConfig || {};

    try {
      if (config.type === 'http') {
        // Make HTTP request
        const response = await axios({
          method: config.method || 'GET',
          url: config.url,
          data: config.body ? this.interpolateData(config.body, instance.data) : undefined,
          headers: config.headers || {}
        });

        return {
          success: true,
          data: {
            [\`\${node.id}_response\`]: response.data
          }
        };
      } else if (config.type === 'function') {
        // Execute custom function
        const result = await this.executeFunction(config.function, instance.data);
        return {
          success: true,
          data: {
            [\`\${node.id}_result\`]: result
          }
        };
      }
    } catch (error) {
      console.error(\`Service task error: \${error.message}\`);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  }

  /**
   * Handle Script Task
   */
  async handleScriptTask(node, instance) {
    console.log(\`Script task: \${node.data?.label || node.id}\`);

    const script = node.data?.script;
    if (!script) {
      return { success: true };
    }

    try {
      // Execute script with instance data
      const fn = new Function('data', script);
      const result = fn(instance.data);

      return {
        success: true,
        data: {
          [\`\${node.id}_result\`]: result
        }
      };
    } catch (error) {
      console.error(\`Script task error: \${error.message}\`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle Exclusive Gateway (XOR)
   */
  async handleExclusiveGateway(node, instance) {
    console.log(\`Exclusive gateway: \${node.data?.label || node.id}\`);

    // Gateway logic is handled by edge conditions
    return {
      success: true
    };
  }

  /**
   * Handle Parallel Gateway (AND)
   */
  async handleParallelGateway(node, instance) {
    console.log(\`Parallel gateway: \${node.data?.label || node.id}\`);

    // Parallel execution is handled by the engine
    return {
      success: true
    };
  }

  /**
   * Handle Intermediate Event
   */
  async handleIntermediateEvent(node, instance) {
    console.log(\`Intermediate event: \${node.data?.label || node.id}\`);

    const eventType = node.data?.eventType;

    if (eventType === 'timer') {
      // Timer event - wait for specified duration
      const duration = node.data?.duration || 0;
      await this.sleep(duration);
    } else if (eventType === 'message') {
      // Message event - wait for external message
      return {
        success: true,
        waitForEvent: true
      };
    }

    return {
      success: true
    };
  }

  /**
   * Helper: Interpolate data into string
   */
  interpolateData(str, data) {
    if (typeof str !== 'string') return str;

    return str.replace(/\\\${([^}]+)}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Helper: Execute custom function
   */
  async executeFunction(fnString, data) {
    const fn = new Function('data', \`return \${fnString}\`);
    return fn(data);
  }

  /**
   * Helper: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = NodeHandlers;
`;
  }

  /**
   * Generate configuration files
   */
  generateConfig(workflow) {
    const vercelJson = {
      version: 2,
      builds: [
        {
          src: 'package.json',
          use: '@vercel/static-build',
          config: { distDir: 'build' }
        }
      ],
      routes: [
        {
          src: '/api/(.*)',
          dest: '/api/server.js'
        },
        {
          src: '/(.*)',
          dest: '/index.html'
        }
      ]
    };

    const renderYaml = `
services:
  - type: web
    name: ${workflow.id}-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/build

  - type: web
    name: ${workflow.id}-backend
    env: node
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
`;

    return {
      'vercel.json': JSON.stringify(vercelJson, null, 2),
      'render.yaml': renderYaml
    };
  }

  /**
   * Validate generated code package
   */
  async validateGenerated(codePackage) {
    const errors = [];

    if (!codePackage.frontend || Object.keys(codePackage.frontend).length === 0) {
      errors.push('Missing frontend code');
    }

    if (!codePackage.backend || Object.keys(codePackage.backend).length === 0) {
      errors.push('Missing backend code');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new WorkflowCodeGenerator();
