/**
 * Workflow Parser Agent
 * Analyzes and parses workflow JSON structure for BPMN conversion
 */

class WorkflowParserAgent {
  constructor() {
    this.name = 'WorkflowParser';
  }

  /**
   * Execute parsing and analysis
   */
  async execute(workflowJSON) {
    console.log('[WorkflowParser] Analyzing workflow structure...');

    const parsed = {
      metadata: this.extractMetadata(workflowJSON),
      nodes: this.parseNodes(workflowJSON.nodes || []),
      connections: this.parseConnections(workflowJSON.connections || workflowJSON.edges || []),
      flowStructure: this.analyzeFlowStructure(workflowJSON),
      summary: {}
    };

    parsed.summary = {
      totalNodes: parsed.nodes.length,
      totalConnections: parsed.connections.length,
      nodeTypes: this.getNodeTypeDistribution(parsed.nodes),
      hasStartEvent: parsed.nodes.some(n => n.bpmnType === 'startEvent'),
      hasEndEvent: parsed.nodes.some(n => n.bpmnType === 'endEvent'),
      hasGateways: parsed.nodes.some(n => n.bpmnType.includes('Gateway')),
      hasTasks: parsed.nodes.some(n => n.bpmnType.includes('Task'))
    };

    console.log(`[WorkflowParser] Parsed ${parsed.summary.totalNodes} nodes and ${parsed.summary.totalConnections} connections`);

    return parsed;
  }

  /**
   * Extract workflow metadata
   */
  extractMetadata(workflow) {
    return {
      id: workflow.id || `workflow_${Date.now()}`,
      name: workflow.name || 'Untitled Workflow',
      version: workflow.version || '1.0',
      created: workflow.metadata?.created || new Date().toISOString(),
      modified: workflow.metadata?.modified || new Date().toISOString()
    };
  }

  /**
   * Parse nodes and map to BPMN types
   */
  parseNodes(nodes) {
    return nodes.map(node => {
      const bpmnMapping = this.mapNodeToBPMN(node);
      return {
        id: node.id,
        originalType: node.type,
        bpmnType: bpmnMapping.type,
        bpmnElement: bpmnMapping.element,
        name: node.data?.label || node.data?.name || 'Unnamed',
        data: node.data || {},
        position: node.position || { x: 0, y: 0 }
      };
    });
  }

  /**
   * Parse connections/edges
   */
  parseConnections(connections) {
    return connections.map(conn => ({
      id: conn.id || `flow_${conn.source}_${conn.target}`,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceHandle,
      targetHandle: conn.targetHandle,
      label: conn.label || ''
    }));
  }

  /**
   * Map custom node types to BPMN 2.0 elements
   */
  mapNodeToBPMN(node) {
    const typeMapping = {
      'startProcess': {
        type: 'startEvent',
        element: 'bpmn:StartEvent'
      },
      'endEvent': {
        type: 'endEvent',
        element: 'bpmn:EndEvent'
      },
      'userTask': {
        type: 'userTask',
        element: 'bpmn:UserTask'
      },
      'scriptTask': {
        type: 'scriptTask',
        element: 'bpmn:ScriptTask'
      },
      'decision': {
        type: node.data?.gatewayType === 'parallel' ? 'parallelGateway' : 'exclusiveGateway',
        element: node.data?.gatewayType === 'parallel' ? 'bpmn:ParallelGateway' : 'bpmn:ExclusiveGateway'
      },
      'validation': {
        type: 'businessRuleTask',
        element: 'bpmn:BusinessRuleTask'
      },
      'notification': {
        type: 'sendTask',
        element: 'bpmn:SendTask'
      },
      'dataProcess': {
        type: 'serviceTask',
        element: 'bpmn:ServiceTask'
      },
      'timerEvent': {
        type: 'intermediateCatchEvent',
        element: 'bpmn:IntermediateCatchEvent'
      }
    };

    return typeMapping[node.type] || {
      type: 'task',
      element: 'bpmn:Task'
    };
  }

  /**
   * Analyze flow structure
   */
  analyzeFlowStructure(workflow) {
    const nodes = workflow.nodes || [];
    const connections = workflow.connections || workflow.edges || [];

    // Build adjacency map
    const adjacency = new Map();
    nodes.forEach(node => adjacency.set(node.id, []));
    connections.forEach(conn => {
      if (adjacency.has(conn.source)) {
        adjacency.get(conn.source).push(conn.target);
      }
    });

    // Find start and end nodes
    const startNodes = nodes.filter(n => n.type === 'startProcess');
    const endNodes = nodes.filter(n => n.type === 'endEvent');

    return {
      adjacency,
      startNodes: startNodes.map(n => n.id),
      endNodes: endNodes.map(n => n.id),
      isLinear: this.isLinearFlow(adjacency),
      hasBranching: this.hasBranching(adjacency),
      hasLoops: this.hasLoops(adjacency, nodes)
    };
  }

  /**
   * Check if flow is linear (no branching)
   */
  isLinearFlow(adjacency) {
    for (const [_, targets] of adjacency) {
      if (targets.length > 1) return false;
    }
    return true;
  }

  /**
   * Check if flow has branching
   */
  hasBranching(adjacency) {
    for (const [_, targets] of adjacency) {
      if (targets.length > 1) return true;
    }
    return false;
  }

  /**
   * Check for loops (cycles) in flow
   */
  hasLoops(adjacency, nodes) {
    const visited = new Set();
    const recStack = new Set();

    const hasCycle = (nodeId) => {
      if (recStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) return true;
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (hasCycle(node.id)) return true;
    }

    return false;
  }

  /**
   * Get node type distribution
   */
  getNodeTypeDistribution(nodes) {
    const distribution = {};
    nodes.forEach(node => {
      const type = node.bpmnType;
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return distribution;
  }
}

module.exports = WorkflowParserAgent;
