/**
 * WorkflowFixer - Automatically fixes common workflow validation errors
 *
 * This service analyzes validation errors and attempts to automatically fix them:
 * - Circular dependencies: Break loops by removing problematic edges
 * - Missing default paths on decision nodes: Add default path to first outgoing edge
 * - Invalid ProcessData references: Remove or fix references
 * - Unreachable nodes: Add connections or remove isolated nodes
 */

class WorkflowFixer {
  constructor() {
    this.maxIterations = 3; // Maximum number of fix attempts
  }

  /**
   * Main method: Attempt to fix all validation errors
   * @param {Object} workflow - The workflow object with nodes and connections
   * @param {Object} validationResult - The validation result with errors
   * @returns {Object} - { fixed: boolean, workflow: Object, changes: Array }
   */
  fix(workflow, validationResult) {
    if (!validationResult || validationResult.valid) {
      return { fixed: true, workflow, changes: [] };
    }

    console.log('[WorkflowFixer] Attempting to fix validation errors...');
    const changes = [];
    let fixedWorkflow = JSON.parse(JSON.stringify(workflow)); // Deep clone

    // Iterate through each error and try to fix it
    for (const error of validationResult.errors) {
      const fix = this.fixError(fixedWorkflow, error);
      if (fix.applied) {
        changes.push(fix.description);
        fixedWorkflow = fix.workflow;
      }
    }

    return {
      fixed: changes.length > 0,
      workflow: fixedWorkflow,
      changes
    };
  }

  /**
   * Analyze error message and dispatch to appropriate fixer
   */
  fixError(workflow, errorMessage) {
    console.log(`[WorkflowFixer] Analyzing error: ${errorMessage}`);

    // Fix duplicate node IDs
    if (errorMessage.includes('Duplicate node ID')) {
      return this.fixDuplicateNodeId(workflow, errorMessage);
    }

    // Fix circular dependencies
    if (errorMessage.includes('Circular dependency detected')) {
      return this.fixCircularDependency(workflow, errorMessage);
    }

    // Fix missing default paths on decision/gateway nodes
    if (errorMessage.includes('must have at least one default path')) {
      return this.fixMissingDefaultPath(workflow, errorMessage);
    }

    // Fix invalid ProcessData references
    if (errorMessage.includes('references non-existent ProcessData')) {
      return this.fixInvalidProcessDataReference(workflow, errorMessage);
    }

    // Fix unreachable nodes
    if (errorMessage.includes('is unreachable from start')) {
      return this.fixUnreachableNode(workflow, errorMessage);
    }

    // Fix nodes with no outgoing connections (except end nodes)
    if (errorMessage.includes('has no outgoing connections')) {
      return this.fixNoOutgoingConnections(workflow, errorMessage);
    }

    console.log(`[WorkflowFixer] No automatic fix available for: ${errorMessage}`);
    return { applied: false, workflow };
  }

  /**
   * Fix duplicate node IDs by renaming duplicates
   */
  fixDuplicateNodeId(workflow, errorMessage) {
    // Extract the duplicate node ID from error message
    // Example: "Duplicate node ID: node_2"
    const match = errorMessage.match(/Duplicate node ID: (.+)/);
    if (!match) {
      return { applied: false, workflow };
    }

    const duplicateId = match[1].trim();

    // Find all nodes with this ID
    const duplicateNodes = workflow.nodes.filter(node => node.id === duplicateId);

    if (duplicateNodes.length <= 1) {
      // Not actually a duplicate (might have been fixed already)
      return { applied: false, workflow };
    }

    console.log(`[WorkflowFixer] Found ${duplicateNodes.length} nodes with duplicate ID: ${duplicateId}`);

    // Keep the first occurrence, rename all others
    let renamed = 0;
    for (let i = 1; i < duplicateNodes.length; i++) {
      const nodeToRename = duplicateNodes[i];
      const newId = `${duplicateId}_dup${i}_${Date.now()}`;
      const oldId = nodeToRename.id;

      // Rename the node
      nodeToRename.id = newId;

      // Update all connections that reference this node
      workflow.connections.forEach(conn => {
        if (conn.source === oldId) {
          conn.source = newId;
        }
        if (conn.target === oldId) {
          conn.target = newId;
        }
      });

      console.log(`[WorkflowFixer] Renamed duplicate node from ${oldId} to ${newId}`);
      renamed++;
    }

    if (renamed > 0) {
      return {
        applied: true,
        workflow,
        description: `Fixed duplicate node IDs: renamed ${renamed} duplicate occurrence(s) of ${duplicateId}`
      };
    }

    return { applied: false, workflow };
  }

  /**
   * Fix circular dependency by breaking the loop
   */
  fixCircularDependency(workflow, errorMessage) {
    // Extract node IDs from error message
    // Example: "Circular dependency detected: node_1 → node_2 → node_3 → node_1"
    const match = errorMessage.match(/Circular dependency detected: (.+)/);
    if (!match) {
      return { applied: false, workflow };
    }

    const cyclePath = match[1].split(' → ').map(id => id.trim());
    if (cyclePath.length < 2) {
      return { applied: false, workflow };
    }

    // Break the loop by removing the last connection (that creates the cycle)
    const lastNode = cyclePath[cyclePath.length - 2];
    const firstNode = cyclePath[cyclePath.length - 1];

    console.log(`[WorkflowFixer] Breaking circular dependency: removing connection from ${lastNode} to ${firstNode}`);

    // Find and remove the connection that creates the cycle
    const originalCount = workflow.connections.length;
    workflow.connections = workflow.connections.filter(conn => {
      const isProblematicConnection = conn.source === lastNode && conn.target === firstNode;
      if (isProblematicConnection) {
        console.log(`[WorkflowFixer] Removed connection: ${conn.id}`);
      }
      return !isProblematicConnection;
    });

    const removed = originalCount - workflow.connections.length;

    if (removed > 0) {
      return {
        applied: true,
        workflow,
        description: `Removed circular dependency: broke loop by removing connection from ${lastNode} to ${firstNode}`
      };
    }

    return { applied: false, workflow };
  }

  /**
   * Fix missing default path on decision/gateway nodes
   */
  fixMissingDefaultPath(workflow, errorMessage) {
    // Extract node ID from error message
    // Example: "Exclusive decision node node_8 must have at least one default path"
    const match = errorMessage.match(/node (\w+) must have at least one default path/);
    if (!match) {
      return { applied: false, workflow };
    }

    const nodeId = match[1];
    const node = workflow.nodes.find(n => n.id === nodeId);

    if (!node) {
      return { applied: false, workflow };
    }

    // Find all outgoing connections from this node
    const outgoingConnections = workflow.connections.filter(conn => conn.source === nodeId);

    if (outgoingConnections.length === 0) {
      console.log(`[WorkflowFixer] Cannot fix missing default path: node ${nodeId} has no outgoing connections`);
      return { applied: false, workflow };
    }

    // Set the first outgoing connection as default
    const defaultConnection = outgoingConnections[0];

    // Update connection to mark as default (set both for compatibility)
    defaultConnection.isDefault = true;
    defaultConnection.data = defaultConnection.data || {};
    defaultConnection.data.isDefault = true;
    defaultConnection.label = 'Default';

    console.log(`[WorkflowFixer] Set connection ${defaultConnection.id} as default path for node ${nodeId}`);

    return {
      applied: true,
      workflow,
      description: `Added default path to decision node ${nodeId}: set connection to ${defaultConnection.target} as default`
    };
  }

  /**
   * Fix invalid ProcessData reference
   */
  fixInvalidProcessDataReference(workflow, errorMessage) {
    // Extract node ID and field name from error message
    // Example: "Node node_5 references non-existent ProcessData field: userData"
    const match = errorMessage.match(/Node (\w+) references non-existent ProcessData field: (\w+)/);
    if (!match) {
      return { applied: false, workflow };
    }

    const nodeId = match[1];
    const fieldName = match[2];
    const node = workflow.nodes.find(n => n.id === nodeId);

    if (!node || !node.data) {
      return { applied: false, workflow };
    }

    // Strategy 1: Look for the field in existing ProcessData nodes
    const processDataNodes = workflow.nodes.filter(n => n.type === 'dataProcess');
    const matchingField = processDataNodes.find(pdn =>
      pdn.data?.processData?.some(pd => pd.key === fieldName)
    );

    if (!matchingField) {
      // Strategy 2: Remove the invalid reference
      console.log(`[WorkflowFixer] Removing invalid ProcessData reference "${fieldName}" from node ${nodeId}`);

      // Remove from various possible locations
      if (node.data.processData) {
        node.data.processData = node.data.processData.filter(pd => pd.key !== fieldName);
      }
      if (node.data.condition) {
        // Remove field references from conditions
        node.data.condition = node.data.condition.replace(new RegExp(`\\b${fieldName}\\b`, 'g'), 'null');
      }

      return {
        applied: true,
        workflow,
        description: `Removed invalid ProcessData reference "${fieldName}" from node ${nodeId}`
      };
    }

    return { applied: false, workflow };
  }

  /**
   * Fix unreachable node by connecting it to the workflow
   */
  fixUnreachableNode(workflow, errorMessage) {
    // Extract node ID from error message
    // Example: "Node node_5 is unreachable from start node"
    const match = errorMessage.match(/Node (\w+) is unreachable/);
    if (!match) {
      return { applied: false, workflow };
    }

    const nodeId = match[1];
    const node = workflow.nodes.find(n => n.id === nodeId);

    if (!node) {
      return { applied: false, workflow };
    }

    // Find the start node
    const startNode = workflow.nodes.find(n => n.type === 'startProcess');

    if (!startNode) {
      return { applied: false, workflow };
    }

    // Check if there are any nodes that could logically connect to this node
    // For now, just remove the unreachable node
    console.log(`[WorkflowFixer] Removing unreachable node ${nodeId}`);

    workflow.nodes = workflow.nodes.filter(n => n.id !== nodeId);

    // Also remove any connections involving this node
    workflow.connections = workflow.connections.filter(conn =>
      conn.source !== nodeId && conn.target !== nodeId
    );

    return {
      applied: true,
      workflow,
      description: `Removed unreachable node ${nodeId} from workflow`
    };
  }

  /**
   * Fix node with no outgoing connections (except end nodes)
   */
  fixNoOutgoingConnections(workflow, errorMessage) {
    // Extract node ID from error message
    // Example: "Node node_5 has no outgoing connections"
    const match = errorMessage.match(/Node (\w+) has no outgoing connections/);
    if (!match) {
      return { applied: false, workflow };
    }

    const nodeId = match[1];
    const node = workflow.nodes.find(n => n.id === nodeId);

    if (!node) {
      return { applied: false, workflow };
    }

    // Find an appropriate end node to connect to
    const endNode = workflow.nodes.find(n => n.type === 'endEvent');

    if (!endNode) {
      return { applied: false, workflow };
    }

    // Create a new connection
    const newConnection = {
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: nodeId,
      target: endNode.id,
      type: 'smoothstep',
      animated: false
    };

    workflow.connections.push(newConnection);

    console.log(`[WorkflowFixer] Added connection from ${nodeId} to end node ${endNode.id}`);

    return {
      applied: true,
      workflow,
      description: `Added connection from node ${nodeId} to end node ${endNode.id}`
    };
  }
}

module.exports = WorkflowFixer;
