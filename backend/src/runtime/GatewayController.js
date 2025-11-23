/**
 * Gateway Controller
 * Handles workflow gateway logic for parallel and inclusive execution
 */

const tokenManager = require('./TokenManager');

class GatewayController {
  constructor() {
    // Track gateway join states: instanceId -> { gatewayId -> { expectedTokens, arrivedTokens[] } }
    this.gatewayStates = new Map();
  }

  /**
   * Process Parallel Gateway Split (AND)
   * Forks token into multiple parallel paths
   */
  async processParallelGatewaySplit(gateway, token, workflow, instance) {
    const outgoingFlows = this.getOutgoingFlows(gateway.id, workflow);

    if (outgoingFlows.length === 0) {
      throw new Error(`Parallel gateway ${gateway.id} has no outgoing flows`);
    }

    console.log(`[GatewayController] Parallel split at ${gateway.id}, creating ${outgoingFlows.length} tokens`);

    // Get target node IDs
    const targetNodeIds = outgoingFlows.map(flow => flow.targetId);

    // Fork token into multiple child tokens
    const childTokens = tokenManager.forkToken(
      instance.id,
      token.id,
      targetNodeIds
    );

    return {
      type: 'split',
      gateway: gateway.id,
      tokens: childTokens,
      nextNodes: targetNodeIds
    };
  }

  /**
   * Process Parallel Gateway Join (AND)
   * Waits for all incoming tokens and merges them
   */
  async processParallelGatewayJoin(gateway, token, workflow, instance) {
    const incomingFlows = this.getIncomingFlows(gateway.id, workflow);

    if (incomingFlows.length === 0) {
      throw new Error(`Parallel gateway ${gateway.id} has no incoming flows`);
    }

    // Initialize gateway state if needed
    if (!this.gatewayStates.has(instance.id)) {
      this.gatewayStates.set(instance.id, new Map());
    }

    const instanceGateways = this.gatewayStates.get(instance.id);

    if (!instanceGateways.has(gateway.id)) {
      instanceGateways.set(gateway.id, {
        expectedTokens: incomingFlows.length,
        arrivedTokens: [],
        timestamp: new Date()
      });
    }

    const gatewayState = instanceGateways.get(gateway.id);

    // Register token arrival
    if (!gatewayState.arrivedTokens.includes(token.id)) {
      gatewayState.arrivedTokens.push(token.id);
    }

    console.log(`[GatewayController] Parallel join at ${gateway.id}: ${gatewayState.arrivedTokens.length}/${gatewayState.expectedTokens} tokens arrived`);

    // Check if all tokens have arrived
    if (gatewayState.arrivedTokens.length < gatewayState.expectedTokens) {
      return {
        type: 'wait',
        gateway: gateway.id,
        waiting: true,
        arrived: gatewayState.arrivedTokens.length,
        expected: gatewayState.expectedTokens
      };
    }

    // All tokens arrived - merge them
    const outgoingFlows = this.getOutgoingFlows(gateway.id, workflow);

    if (outgoingFlows.length === 0) {
      throw new Error(`Parallel gateway ${gateway.id} has no outgoing flow after join`);
    }

    const targetNodeId = outgoingFlows[0].targetId;

    // Merge tokens
    const mergedToken = tokenManager.mergeTokens(
      instance.id,
      gatewayState.arrivedTokens,
      targetNodeId
    );

    // Clear gateway state
    instanceGateways.delete(gateway.id);

    console.log(`[GatewayController] Parallel join complete at ${gateway.id}, merged into token ${mergedToken.id}`);

    return {
      type: 'join',
      gateway: gateway.id,
      token: mergedToken,
      nextNode: targetNodeId
    };
  }

  /**
   * Process Inclusive Gateway Split (OR)
   * Evaluates conditions and forks token for paths that evaluate to true
   */
  async processInclusiveGatewaySplit(gateway, token, workflow, instance) {
    const outgoingFlows = this.getOutgoingFlows(gateway.id, workflow);

    if (outgoingFlows.length === 0) {
      throw new Error(`Inclusive gateway ${gateway.id} has no outgoing flows`);
    }

    console.log(`[GatewayController] Inclusive split at ${gateway.id}, evaluating ${outgoingFlows.length} conditions`);

    // Evaluate each outgoing flow condition
    const activeFlows = [];

    for (const flow of outgoingFlows) {
      const shouldTake = await this.evaluateCondition(
        flow.condition,
        token.variables,
        instance
      );

      if (shouldTake) {
        activeFlows.push(flow);
      }
    }

    // If no conditions match, check for default flow
    if (activeFlows.length === 0) {
      const defaultFlow = outgoingFlows.find(f => f.isDefault);
      if (defaultFlow) {
        activeFlows.push(defaultFlow);
      } else {
        throw new Error(`Inclusive gateway ${gateway.id} has no matching conditions and no default flow`);
      }
    }

    console.log(`[GatewayController] Inclusive split: ${activeFlows.length} paths activated`);

    // Get target node IDs
    const targetNodeIds = activeFlows.map(flow => flow.targetId);

    // Fork token into selected paths
    const childTokens = tokenManager.forkToken(
      instance.id,
      token.id,
      targetNodeIds
    );

    // Track which paths were activated for join synchronization
    if (!this.gatewayStates.has(instance.id)) {
      this.gatewayStates.set(instance.id, new Map());
    }

    const correspondingJoin = this.findCorrespondingJoin(gateway.id, workflow);
    if (correspondingJoin) {
      const instanceGateways = this.gatewayStates.get(instance.id);
      instanceGateways.set(correspondingJoin.id, {
        expectedTokens: activeFlows.length,
        arrivedTokens: [],
        timestamp: new Date(),
        splitGatewayId: gateway.id
      });
    }

    return {
      type: 'split',
      gateway: gateway.id,
      tokens: childTokens,
      nextNodes: targetNodeIds,
      activePaths: activeFlows.length
    };
  }

  /**
   * Process Inclusive Gateway Join (OR)
   * Waits for all activated tokens and merges them
   */
  async processInclusiveGatewayJoin(gateway, token, workflow, instance) {
    const incomingFlows = this.getIncomingFlows(gateway.id, workflow);

    if (incomingFlows.length === 0) {
      throw new Error(`Inclusive gateway ${gateway.id} has no incoming flows`);
    }

    // Initialize gateway state if needed
    if (!this.gatewayStates.has(instance.id)) {
      this.gatewayStates.set(instance.id, new Map());
    }

    const instanceGateways = this.gatewayStates.get(instance.id);

    // If no state exists, this join wasn't properly initialized by a split
    if (!instanceGateways.has(gateway.id)) {
      console.warn(`[GatewayController] Inclusive join ${gateway.id} has no state - assuming single token`);
      instanceGateways.set(gateway.id, {
        expectedTokens: 1,
        arrivedTokens: [],
        timestamp: new Date()
      });
    }

    const gatewayState = instanceGateways.get(gateway.id);

    // Register token arrival
    if (!gatewayState.arrivedTokens.includes(token.id)) {
      gatewayState.arrivedTokens.push(token.id);
    }

    console.log(`[GatewayController] Inclusive join at ${gateway.id}: ${gatewayState.arrivedTokens.length}/${gatewayState.expectedTokens} tokens arrived`);

    // Check if all expected tokens have arrived
    if (gatewayState.arrivedTokens.length < gatewayState.expectedTokens) {
      return {
        type: 'wait',
        gateway: gateway.id,
        waiting: true,
        arrived: gatewayState.arrivedTokens.length,
        expected: gatewayState.expectedTokens
      };
    }

    // All expected tokens arrived - merge them
    const outgoingFlows = this.getOutgoingFlows(gateway.id, workflow);

    if (outgoingFlows.length === 0) {
      throw new Error(`Inclusive gateway ${gateway.id} has no outgoing flow after join`);
    }

    const targetNodeId = outgoingFlows[0].targetId;

    // Merge tokens
    const mergedToken = tokenManager.mergeTokens(
      instance.id,
      gatewayState.arrivedTokens,
      targetNodeId
    );

    // Clear gateway state
    instanceGateways.delete(gateway.id);

    console.log(`[GatewayController] Inclusive join complete at ${gateway.id}, merged into token ${mergedToken.id}`);

    return {
      type: 'join',
      gateway: gateway.id,
      token: mergedToken,
      nextNode: targetNodeId
    };
  }

  /**
   * Process Exclusive Gateway (XOR)
   * Evaluates conditions and takes first matching path
   */
  async processExclusiveGateway(gateway, token, workflow, instance) {
    const outgoingFlows = this.getOutgoingFlows(gateway.id, workflow);

    if (outgoingFlows.length === 0) {
      throw new Error(`Exclusive gateway ${gateway.id} has no outgoing flows`);
    }

    console.log(`[GatewayController] Exclusive gateway at ${gateway.id}, evaluating ${outgoingFlows.length} conditions`);

    // Evaluate conditions in order until one matches
    for (const flow of outgoingFlows) {
      if (flow.isDefault) {
        continue; // Skip default, check it last
      }

      const shouldTake = await this.evaluateCondition(
        flow.condition,
        token.variables,
        instance
      );

      if (shouldTake) {
        console.log(`[GatewayController] Exclusive gateway taking path to ${flow.targetId}`);

        // Move token to target
        tokenManager.moveToken(instance.id, token.id, flow.targetId);

        return {
          type: 'exclusive',
          gateway: gateway.id,
          token: token,
          nextNode: flow.targetId
        };
      }
    }

    // No condition matched - take default flow
    const defaultFlow = outgoingFlows.find(f => f.isDefault);
    if (!defaultFlow) {
      throw new Error(`Exclusive gateway ${gateway.id} has no matching conditions and no default flow`);
    }

    console.log(`[GatewayController] Exclusive gateway taking default path to ${defaultFlow.targetId}`);

    tokenManager.moveToken(instance.id, token.id, defaultFlow.targetId);

    return {
      type: 'exclusive',
      gateway: gateway.id,
      token: token,
      nextNode: defaultFlow.targetId
    };
  }

  /**
   * Evaluate a flow condition
   */
  async evaluateCondition(condition, variables, instance) {
    // No condition means always true
    if (!condition || condition.trim() === '') {
      return true;
    }

    try {
      // Simple expression evaluation
      // Support: variable == value, variable > value, variable < value, etc.

      // Replace variable references with actual values
      let expression = condition;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        const replacementValue = typeof value === 'string' ? `"${value}"` : value;
        expression = expression.replace(regex, replacementValue);
      }

      // Evaluate expression safely
      // In production, use a proper expression parser
      const result = eval(expression);

      console.log(`[GatewayController] Condition "${condition}" evaluated to ${result}`);

      return Boolean(result);
    } catch (error) {
      console.error(`[GatewayController] Error evaluating condition "${condition}":`, error);
      return false;
    }
  }

  /**
   * Get outgoing flows from a gateway
   */
  getOutgoingFlows(gatewayId, workflow) {
    const flows = [];

    if (!workflow.connections || !Array.isArray(workflow.connections)) {
      return flows;
    }

    for (const connection of workflow.connections) {
      if (connection.source === gatewayId) {
        flows.push({
          id: connection.id,
          sourceId: connection.source,
          targetId: connection.target,
          condition: connection.condition || '',
          isDefault: connection.isDefault || false
        });
      }
    }

    return flows;
  }

  /**
   * Get incoming flows to a gateway
   */
  getIncomingFlows(gatewayId, workflow) {
    const flows = [];

    if (!workflow.connections || !Array.isArray(workflow.connections)) {
      return flows;
    }

    for (const connection of workflow.connections) {
      if (connection.target === gatewayId) {
        flows.push({
          id: connection.id,
          sourceId: connection.source,
          targetId: connection.target
        });
      }
    }

    return flows;
  }

  /**
   * Find corresponding join gateway for a split gateway
   */
  findCorrespondingJoin(splitGatewayId, workflow) {
    // This is a simplified implementation
    // In a real system, you'd track gateway pairs in the workflow definition

    // For now, we'll look for the next gateway of the same type after the split
    const outgoingFlows = this.getOutgoingFlows(splitGatewayId, workflow);

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return null;
    }

    // Find nodes that are reachable from all outgoing flows
    const visitedNodes = new Set();
    const pathsFromSplit = outgoingFlows.map(flow => {
      return this.findNodesInPath(flow.targetId, workflow, visitedNodes);
    });

    // Find common nodes (potential join gateways)
    if (pathsFromSplit.length === 0) {
      return null;
    }

    const commonNodes = pathsFromSplit[0].filter(node =>
      pathsFromSplit.every(path => path.includes(node))
    );

    // Return first gateway in common nodes
    for (const nodeId of commonNodes) {
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (node && (node.type === 'gateway' || node.type === 'parallelGateway' || node.type === 'inclusiveGateway')) {
        return node;
      }
    }

    return null;
  }

  /**
   * Find all nodes reachable from a starting node
   */
  findNodesInPath(startNodeId, workflow, visited = new Set()) {
    const nodes = [];
    const queue = [startNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift();

      if (visited.has(nodeId)) {
        continue;
      }

      visited.add(nodeId);
      nodes.push(nodeId);

      // Add outgoing nodes to queue
      const outgoing = this.getOutgoingFlows(nodeId, workflow);
      for (const flow of outgoing) {
        if (!visited.has(flow.targetId)) {
          queue.push(flow.targetId);
        }
      }
    }

    return nodes;
  }

  /**
   * Clear gateway states for an instance
   */
  clearInstanceState(instanceId) {
    this.gatewayStates.delete(instanceId);
    console.log(`[GatewayController] Cleared gateway states for instance ${instanceId}`);
  }

  /**
   * Get gateway state for debugging
   */
  getGatewayState(instanceId, gatewayId) {
    if (!this.gatewayStates.has(instanceId)) {
      return null;
    }

    const instanceGateways = this.gatewayStates.get(instanceId);
    return instanceGateways.get(gatewayId) || null;
  }

  /**
   * Export gateway states for persistence
   */
  exportStates(instanceId) {
    if (!this.gatewayStates.has(instanceId)) {
      return {};
    }

    const instanceGateways = this.gatewayStates.get(instanceId);
    const states = {};

    for (const [gatewayId, state] of instanceGateways.entries()) {
      states[gatewayId] = { ...state };
    }

    return states;
  }

  /**
   * Import gateway states from persistence
   */
  importStates(instanceId, states) {
    if (!this.gatewayStates.has(instanceId)) {
      this.gatewayStates.set(instanceId, new Map());
    }

    const instanceGateways = this.gatewayStates.get(instanceId);

    for (const [gatewayId, state] of Object.entries(states)) {
      instanceGateways.set(gatewayId, state);
    }

    console.log(`[GatewayController] Imported gateway states for instance ${instanceId}`);
  }
}

module.exports = new GatewayController();
