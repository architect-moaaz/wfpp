/**
 * SubWorkflowNode - Node type for calling sub-workflows
 *
 * This node allows a parent workflow to:
 * - Call another workflow as a sub-process
 * - Pass input data to the sub-workflow
 * - Receive output data from the sub-workflow
 * - Handle errors from sub-workflow execution
 */

const workflowTrigger = require('../WorkflowTrigger');
const messageStore = require('../MessageStore');
const eventBus = require('../EventBus');

class SubWorkflowNode {
  constructor(config) {
    this.type = 'subWorkflow';
    this.id = config.id;
    this.name = config.name || 'Sub-Workflow';
    this.targetWorkflowId = config.targetWorkflowId;
    this.inputMapping = config.inputMapping || {}; // Map parent variables to sub-workflow inputs
    this.outputMapping = config.outputMapping || {}; // Map sub-workflow outputs to parent variables
    this.waitForCompletion = config.waitForCompletion !== false; // Default: wait for result
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.onError = config.onError || 'throw'; // 'throw', 'continue', 'retry'
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Execute the sub-workflow node
   * @param {object} context - Execution context from parent workflow
   * @returns {Promise<object>} - Execution result
   */
  async execute(context) {
    const { variables, correlationId, workflowId, nodeId } = context;

    console.log(`[SubWorkflowNode] Executing sub-workflow: ${this.targetWorkflowId}`, {
      parentWorkflow: workflowId,
      parentNode: nodeId || this.id,
      correlationId
    });

    // Map input variables
    const input = this.mapInput(variables);

    // Store the call in message store for tracking
    messageStore.store({
      source: workflowId,
      target: this.targetWorkflowId,
      correlationId,
      type: 'subworkflow_call',
      payload: {
        nodeId: this.id,
        input,
        timestamp: new Date().toISOString()
      }
    });

    try {
      let result;

      if (this.waitForCompletion) {
        // Synchronous call - wait for sub-workflow to complete
        result = await this.executeSync(input, context);
      } else {
        // Async call - fire and forget
        result = await this.executeAsync(input, context);
      }

      // Map output variables
      const mappedOutput = this.mapOutput(result);

      // Store response
      messageStore.storeResponse(this.targetWorkflowId, mappedOutput, correlationId);

      // Emit completion event
      eventBus.emit('subworkflow.completed', {
        parentWorkflowId: workflowId,
        subWorkflowId: this.targetWorkflowId,
        nodeId: this.id,
        result: mappedOutput
      }, {
        sourceWorkflowId: workflowId,
        correlationId
      });

      return {
        success: true,
        output: mappedOutput,
        subWorkflowId: this.targetWorkflowId
      };

    } catch (error) {
      return await this.handleError(error, input, context);
    }
  }

  /**
   * Execute sub-workflow synchronously (wait for result)
   */
  async executeSync(input, context) {
    const { correlationId, workflowId } = context;

    return workflowTrigger.callSubWorkflow(this.targetWorkflowId, input, {
      workflowId,
      nodeId: this.id,
      correlationId,
      timeout: this.timeout
    });
  }

  /**
   * Execute sub-workflow asynchronously (fire and forget)
   */
  async executeAsync(input, context) {
    const { correlationId, workflowId } = context;

    // Emit event to trigger sub-workflow
    eventBus.emit(`workflow.${this.targetWorkflowId}.start`, input, {
      sourceWorkflowId: workflowId,
      sourceNodeId: this.id,
      correlationId,
      async: true
    });

    // Return immediately with pending status
    return {
      status: 'pending',
      message: `Sub-workflow ${this.targetWorkflowId} started asynchronously`,
      correlationId
    };
  }

  /**
   * Map parent workflow variables to sub-workflow input
   */
  mapInput(parentVariables) {
    const input = {};

    for (const [subWorkflowKey, parentKey] of Object.entries(this.inputMapping)) {
      if (parentKey.startsWith('$')) {
        // Direct value
        input[subWorkflowKey] = parentKey.slice(1);
      } else if (parentKey.includes('.')) {
        // Nested property access
        input[subWorkflowKey] = this.getNestedValue(parentVariables, parentKey);
      } else {
        // Simple variable
        input[subWorkflowKey] = parentVariables[parentKey];
      }
    }

    // If no mapping defined, pass all parent variables
    if (Object.keys(this.inputMapping).length === 0) {
      return { ...parentVariables };
    }

    return input;
  }

  /**
   * Map sub-workflow output to parent workflow variables
   */
  mapOutput(subWorkflowOutput) {
    const output = {};

    for (const [parentKey, subWorkflowKey] of Object.entries(this.outputMapping)) {
      if (subWorkflowKey.includes('.')) {
        output[parentKey] = this.getNestedValue(subWorkflowOutput, subWorkflowKey);
      } else {
        output[parentKey] = subWorkflowOutput[subWorkflowKey];
      }
    }

    // If no mapping defined, return all sub-workflow output
    if (Object.keys(this.outputMapping).length === 0) {
      return { ...subWorkflowOutput };
    }

    return output;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Handle execution errors
   */
  async handleError(error, input, context) {
    const { correlationId, workflowId } = context;

    console.error(`[SubWorkflowNode] Sub-workflow failed: ${this.targetWorkflowId}`, {
      error: error.message,
      parentWorkflow: workflowId
    });

    // Store error
    messageStore.storeError(this.targetWorkflowId, error, correlationId);

    // Emit error event
    eventBus.emit('subworkflow.failed', {
      parentWorkflowId: workflowId,
      subWorkflowId: this.targetWorkflowId,
      nodeId: this.id,
      error: error.message
    }, {
      sourceWorkflowId: workflowId,
      correlationId
    });

    switch (this.onError) {
      case 'continue':
        return {
          success: false,
          error: error.message,
          subWorkflowId: this.targetWorkflowId,
          continued: true
        };

      case 'retry':
        if ((context.retryCount || 0) < this.maxRetries) {
          console.log(`[SubWorkflowNode] Retrying sub-workflow (attempt ${(context.retryCount || 0) + 1}/${this.maxRetries})`);
          return this.execute({
            ...context,
            retryCount: (context.retryCount || 0) + 1
          });
        }
        // Fall through to throw after max retries

      case 'throw':
      default:
        throw new Error(`Sub-workflow ${this.targetWorkflowId} failed: ${error.message}`);
    }
  }

  /**
   * Validate node configuration
   */
  validate() {
    const errors = [];

    if (!this.targetWorkflowId) {
      errors.push('targetWorkflowId is required');
    }

    if (this.timeout && (typeof this.timeout !== 'number' || this.timeout <= 0)) {
      errors.push('timeout must be a positive number');
    }

    if (!['throw', 'continue', 'retry'].includes(this.onError)) {
      errors.push('onError must be one of: throw, continue, retry');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to JSON representation
   */
  toJSON() {
    return {
      type: this.type,
      id: this.id,
      name: this.name,
      config: {
        targetWorkflowId: this.targetWorkflowId,
        inputMapping: this.inputMapping,
        outputMapping: this.outputMapping,
        waitForCompletion: this.waitForCompletion,
        timeout: this.timeout,
        onError: this.onError,
        maxRetries: this.maxRetries
      }
    };
  }

  /**
   * Create from node data
   */
  static fromNodeData(nodeData) {
    return new SubWorkflowNode({
      id: nodeData.id,
      name: nodeData.data?.label || nodeData.name,
      targetWorkflowId: nodeData.data?.targetWorkflowId || nodeData.config?.targetWorkflowId,
      inputMapping: nodeData.data?.inputMapping || nodeData.config?.inputMapping || {},
      outputMapping: nodeData.data?.outputMapping || nodeData.config?.outputMapping || {},
      waitForCompletion: nodeData.data?.waitForCompletion ?? nodeData.config?.waitForCompletion ?? true,
      timeout: nodeData.data?.timeout || nodeData.config?.timeout || 30000,
      onError: nodeData.data?.onError || nodeData.config?.onError || 'throw',
      maxRetries: nodeData.data?.maxRetries || nodeData.config?.maxRetries || 3
    });
  }
}

module.exports = SubWorkflowNode;
