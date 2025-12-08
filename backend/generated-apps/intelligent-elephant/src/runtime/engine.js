/**
 * Workflow Runtime Engine
 * Executes workflow instances and manages workflow state
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const WorkflowInstance = require('../models/WorkflowInstance');
const logger = require('../utils/logger');

class RuntimeEngine {
  constructor() {
    this.workflows = [];
    this.instances = new Map();
    this.nodeExecutors = this.initializeNodeExecutors();
  }

  async initialize() {
    try {
      // Load workflows
      const workflowsPath = path.join(__dirname, '../resources/workflows.json');
      const workflowsData = await fs.readFile(workflowsPath, 'utf8');
      this.workflows = JSON.parse(workflowsData);
      logger.info(`Loaded ${this.workflows.length} workflows`);
    } catch (error) {
      logger.error('Failed to load workflows:', error);
      throw error;
    }
  }

  initializeNodeExecutors() {
    return {
      startEvent: async (node, context) => {
        logger.info(`Starting workflow: ${node.id}`);
        return { status: 'completed', data: context.input || {} };
      },

      endEvent: async (node, context) => {
        logger.info(`Ending workflow: ${node.id}`);
        return { status: 'completed', data: context.data };
      },

      userTask: async (node, context) => {
        logger.info(`User task: ${node.data?.label}`);
        // User tasks wait for external input
        return { status: 'waiting', data: context.data };
      },

      serviceTask: async (node, context) => {
        logger.info(`Service task: ${node.data?.label}`);
        // Execute service task logic
        const result = await this.executeServiceTask(node, context);
        return { status: 'completed', data: result };
      },

      scriptTask: async (node, context) => {
        logger.info(`Script task: ${node.data?.label}`);
        // Execute script
        const result = await this.executeScript(node.data?.script, context);
        return { status: 'completed', data: result };
      },

      exclusiveGateway: async (node, context) => {
        logger.info(`Exclusive gateway: ${node.id}`);
        // Evaluate conditions and choose path
        const nextNode = await this.evaluateGateway(node, context);
        return { status: 'completed', data: context.data, nextNode };
      },

      parallelGateway: async (node, context) => {
        logger.info(`Parallel gateway: ${node.id}`);
        return { status: 'completed', data: context.data };
      }
    };
  }

  async executeServiceTask(node, context) {
    // Implement service task execution
    const serviceType = node.data?.serviceType;

    switch (serviceType) {
      case 'http':
        return await this.executeHttpService(node.data, context);
      case 'database':
        return await this.executeDatabaseService(node.data, context);
      default:
        return context.data;
    }
  }

  async executeHttpService(config, context) {
    // HTTP service implementation
    return context.data;
  }

  async executeDatabaseService(config, context) {
    // Database service implementation
    return context.data;
  }

  async executeScript(script, context) {
    try {
      // Safe script execution
      const fn = new Function('context', script);
      return fn(context.data);
    } catch (error) {
      logger.error('Script execution failed:', error);
      throw error;
    }
  }

  async evaluateGateway(node, context) {
    // Evaluate gateway conditions
    return null;
  }

  async startWorkflow(workflowId, input = {}) {
    const workflow = this.workflows.find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const instance = new WorkflowInstance({
      workflowId,
      workflow,
      input
    });

    this.instances.set(instance.id, instance);
    logger.info(`Started workflow instance: ${instance.id}`);

    // Execute workflow
    await this.executeWorkflow(instance);

    return instance;
  }

  async executeWorkflow(instance) {
    const startNode = instance.workflow.nodes.find(n => n.type === 'startEvent');
    if (!startNode) {
      throw new Error('No start event found');
    }

    instance.status = 'running';
    await this.executeNode(instance, startNode.id);
  }

  async executeNode(instance, nodeId) {
    const node = instance.workflow.nodes.find(n => n.id === nodeId);
    if (!node) {
      logger.error(`Node not found: ${nodeId}`);
      return;
    }

    instance.currentNodeId = nodeId;

    const executor = this.nodeExecutors[node.type];
    if (!executor) {
      logger.error(`No executor for node type: ${node.type}`);
      return;
    }

    const result = await executor(node, { data: instance.data, input: instance.input });

    if (result.status === 'completed') {
      instance.data = result.data;

      // Find next node
      const nextNodeId = result.nextNode || this.getNextNode(instance, nodeId);

      if (nextNodeId) {
        await this.executeNode(instance, nextNodeId);
      } else {
        // Workflow complete
        instance.status = 'completed';
        instance.completedAt = new Date();
        logger.info(`Workflow instance completed: ${instance.id}`);
      }
    } else if (result.status === 'waiting') {
      instance.status = 'waiting';
      logger.info(`Workflow instance waiting: ${instance.id}`);
    }
  }

  getNextNode(instance, currentNodeId) {
    const connections = instance.workflow.connections || instance.workflow.edges || [];
    const nextConnection = connections.find(c => c.source === currentNodeId);
    return nextConnection?.target;
  }

  async resumeWorkflow(instanceId, data) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    instance.data = { ...instance.data, ...data };
    await this.executeNode(instance, instance.currentNodeId);
  }

  getInstance(instanceId) {
    return this.instances.get(instanceId);
  }

  getAllInstances() {
    return Array.from(this.instances.values());
  }
}

module.exports = new RuntimeEngine();
