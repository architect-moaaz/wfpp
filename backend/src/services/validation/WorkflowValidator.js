/**
 * WorkflowValidator - Validates workflow structure to prevent runtime errors
 */

class WorkflowValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Main validation method
   * @param {Object} workflow - Workflow object to validate
   * @returns {Object} { valid: boolean, errors: [], warnings: [] }
   */
  validate(workflow) {
    this.errors = [];
    this.warnings = [];

    if (!workflow) {
      this.errors.push('Workflow is null or undefined');
      return this.getResult();
    }

    // Required structure checks
    this.validateBasicStructure(workflow);

    if (this.errors.length > 0) {
      return this.getResult();
    }

    // Validate nodes
    this.validateNodes(workflow.nodes);

    // Validate connections
    this.validateConnections(workflow.nodes, workflow.connections);

    // Check for circular dependencies (infinite loops)
    this.validateNoCircularPaths(workflow.nodes, workflow.connections);

    // Validate gateway conditions
    this.validateGatewayConditions(workflow.nodes, workflow.connections);

    // Validate that all paths lead to end
    this.validateAllPathsEnd(workflow.nodes, workflow.connections);

    return this.getResult();
  }

  validateBasicStructure(workflow) {
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      this.errors.push('Workflow must have a nodes array');
    }

    if (!workflow.connections || !Array.isArray(workflow.connections)) {
      this.errors.push('Workflow must have a connections array');
    }

    if (workflow.nodes && workflow.nodes.length === 0) {
      this.errors.push('Workflow must have at least one node');
    }
  }

  validateNodes(nodes) {
    const nodeIds = new Set();
    let hasStart = false;
    let hasEnd = false;

    nodes.forEach((node, index) => {
      // Check for duplicate IDs
      if (nodeIds.has(node.id)) {
        this.errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);

      // Check required properties
      if (!node.id) {
        this.errors.push(`Node at index ${index} missing id`);
      }

      if (!node.type) {
        this.errors.push(`Node ${node.id || index} missing type`);
      }

      if (!node.data) {
        this.errors.push(`Node ${node.id || index} missing data`);
      }

      // Track start and end nodes
      if (node.type === 'startProcess' || node.type === 'startEvent') {
        hasStart = true;
      }

      if (node.type === 'endProcess' || node.type === 'endEvent') {
        hasEnd = true;
      }
    });

    if (!hasStart) {
      this.errors.push('Workflow must have at least one start node');
    }

    if (!hasEnd) {
      this.errors.push('Workflow must have at least one end node');
    }
  }

  validateConnections(nodes, connections) {
    const nodeIds = new Set(nodes.map(n => n.id));

    connections.forEach((conn, index) => {
      if (!conn.source) {
        this.errors.push(`Connection at index ${index} missing source`);
      }

      if (!conn.target) {
        this.errors.push(`Connection at index ${index} missing target`);
      }

      // Validate source and target exist
      if (conn.source && !nodeIds.has(conn.source)) {
        this.errors.push(`Connection ${conn.id || index} references non-existent source: ${conn.source}`);
      }

      if (conn.target && !nodeIds.has(conn.target)) {
        this.errors.push(`Connection ${conn.id || index} references non-existent target: ${conn.target}`);
      }
    });
  }

  /**
   * Detect circular paths using DFS with cycle detection
   */
  validateNoCircularPaths(nodes, connections) {
    const adjacencyList = this.buildAdjacencyList(nodes, connections);
    const visited = new Set();
    const recursionStack = new Set();
    const path = [];

    const hasCycle = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart).concat(neighbor);
          this.errors.push(`Circular dependency detected: ${cycle.join(' → ')}`);
          return true;
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
      return false;
    };

    // Check from all start nodes
    const startNodes = nodes.filter(n =>
      n.type === 'startProcess' || n.type === 'startEvent'
    );

    for (const startNode of startNodes) {
      if (!visited.has(startNode.id)) {
        if (hasCycle(startNode.id)) {
          break; // Stop after finding first cycle
        }
      }
    }
  }

  /**
   * Build adjacency list for graph traversal
   */
  buildAdjacencyList(nodes, connections) {
    const adjacencyList = new Map();

    // Initialize all nodes
    nodes.forEach(node => {
      adjacencyList.set(node.id, []);
    });

    // Add connections
    connections.forEach(conn => {
      if (conn.source && conn.target) {
        const neighbors = adjacencyList.get(conn.source) || [];
        neighbors.push(conn.target);
        adjacencyList.set(conn.source, neighbors);
      }
    });

    return adjacencyList;
  }

  /**
   * Validate gateway conditions
   */
  validateGatewayConditions(nodes, connections) {
    const decisionNodes = nodes.filter(n =>
      n.type === 'decision' ||
      n.type === 'exclusiveGateway' ||
      n.type === 'parallelGateway'
    );

    decisionNodes.forEach(node => {
      const outgoingConnections = connections.filter(c => c.source === node.id);

      if (outgoingConnections.length === 0) {
        this.errors.push(`Decision node ${node.id} has no outgoing connections`);
        return;
      }

      if (outgoingConnections.length === 1) {
        this.warnings.push(`Decision node ${node.id} has only one outgoing path (not really a decision)`);
      }

      // For exclusive gateways, check for default path
      if (node.type === 'decision' || node.type === 'exclusiveGateway') {
        const hasDefault = outgoingConnections.some(c => c.isDefault === true);

        if (!hasDefault) {
          this.errors.push(`Exclusive decision node ${node.id} must have at least one default path (isDefault: true)`);
        }

        // Check conditions
        outgoingConnections.forEach(conn => {
          if (!conn.isDefault && !conn.condition) {
            this.warnings.push(`Connection ${conn.id} from decision ${node.id} has no condition and is not marked as default`);
          }

          // Check for invalid variable references in conditions
          if (conn.condition) {
            this.validateConditionSyntax(conn.condition, conn.id, node.id);
          }
        });
      }
    });
  }

  /**
   * Validate condition syntax
   */
  validateConditionSyntax(condition, connId, nodeId) {
    // Check for common undefined variable patterns
    const problematicPatterns = [
      /\bprocessData\b/,  // Good - should reference processData
      /\bvalid\b(?!\s*===|\s*!==|\s*=)/,  // Bad - standalone "valid"
      /\binvalid\b(?!\s*===|\s*!==|\s*=)/,  // Bad - standalone "invalid"
      /\btrue\b(?!\s*===|\s*!==)/,  // Bad - standalone "true" without comparison
      /\bfalse\b(?!\s*===|\s*!==)/,  // Bad - standalone "false" without comparison
    ];

    // Check if condition references processData (good practice)
    if (!condition.includes('processData')) {
      this.warnings.push(
        `Connection ${connId} from ${nodeId} condition does not reference processData: "${condition}". ` +
        `Consider using: processData.fieldName === "value"`
      );
    }

    // Check for dangerous eval patterns
    if (condition.includes('__proto__') || condition.includes('constructor') || condition.includes('prototype')) {
      this.errors.push(`Connection ${connId} condition contains potentially dangerous code: "${condition}"`);
    }
  }

  /**
   * Validate that all paths eventually reach an end node
   */
  validateAllPathsEnd(nodes, connections) {
    const adjacencyList = this.buildAdjacencyList(nodes, connections);
    const endNodes = new Set(
      nodes.filter(n => n.type === 'endProcess' || n.type === 'endEvent').map(n => n.id)
    );

    if (endNodes.size === 0) {
      return; // Already flagged by validateNodes
    }

    const startNodes = nodes.filter(n =>
      n.type === 'startProcess' || n.type === 'startEvent'
    );

    const canReachEnd = (nodeId, visited = new Set()) => {
      if (endNodes.has(nodeId)) {
        return true;
      }

      if (visited.has(nodeId)) {
        return false; // Prevent infinite recursion
      }

      visited.add(nodeId);
      const neighbors = adjacencyList.get(nodeId) || [];

      return neighbors.some(neighbor => canReachEnd(neighbor, visited));
    };

    startNodes.forEach(startNode => {
      if (!canReachEnd(startNode.id)) {
        this.warnings.push(`Start node ${startNode.id} has no path to any end node`);
      }
    });
  }

  getResult() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

module.exports = WorkflowValidator;
