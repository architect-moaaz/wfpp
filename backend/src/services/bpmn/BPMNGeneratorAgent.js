/**
 * BPMN Generator Agent
 * Generates BPMN 2.0 compliant XML from parsed workflow data
 */

class BPMNGeneratorAgent {
  constructor() {
    this.name = 'BPMNGenerator';
  }

  /**
   * Execute BPMN XML generation
   */
  async execute(parsedData) {
    console.log('[BPMNGenerator] Generating BPMN 2.0 XML...');

    const processId = `Process_${parsedData.metadata.id}`;
    const diagramId = `Diagram_${parsedData.metadata.id}`;
    const planeId = `Plane_${parsedData.metadata.id}`;

    const bpmnXML = this.generateBPMNXML(parsedData, processId, diagramId, planeId);

    console.log('[BPMNGenerator] BPMN 2.0 XML generated successfully');

    return bpmnXML;
  }

  /**
   * Generate complete BPMN 2.0 XML
   */
  generateBPMNXML(parsedData, processId, diagramId, planeId) {
    const { metadata, nodes, connections } = parsedData;

    // Generate process elements
    const processElements = this.generateProcessElements(nodes, connections);

    // Generate diagram elements (visual layout)
    const diagramElements = this.generateDiagramElements(nodes, connections, planeId);

    // Construct BPMN XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                   xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                   xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                   xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                   xmlns:camunda="http://camunda.org/schema/1.0/bpmn"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   id="Definitions_${metadata.id}"
                   targetNamespace="http://bpmn.io/schema/bpmn"
                   exporter="Workflow++ Editor"
                   exporterVersion="1.0">
  <bpmn:process id="${processId}" name="${this.escapeXML(metadata.name)}" isExecutable="true">
${processElements}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="${diagramId}">
    <bpmndi:BPMNPlane id="${planeId}" bpmnElement="${processId}">
${diagramElements}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

    return xml;
  }

  /**
   * Generate process elements (logic)
   */
  generateProcessElements(nodes, connections) {
    let xml = '';

    // Build connection maps for each node
    const incomingFlows = new Map();
    const outgoingFlows = new Map();

    connections.forEach(conn => {
      const flowId = conn.id || `Flow_${conn.source}_${conn.target}`;

      // Map incoming flows for target node
      if (!incomingFlows.has(conn.target)) {
        incomingFlows.set(conn.target, []);
      }
      incomingFlows.get(conn.target).push(flowId);

      // Map outgoing flows for source node
      if (!outgoingFlows.has(conn.source)) {
        outgoingFlows.set(conn.source, []);
      }
      outgoingFlows.get(conn.source).push(flowId);
    });

    // Generate all node elements with proper flow references
    nodes.forEach(node => {
      xml += this.generateNodeElement(node, incomingFlows, outgoingFlows);
    });

    // Generate sequence flows (connections)
    connections.forEach(conn => {
      xml += this.generateSequenceFlow(conn);
    });

    return xml;
  }

  /**
   * Generate individual node element
   */
  generateNodeElement(node, incomingFlows, outgoingFlows) {
    const name = this.escapeXML(node.name);
    const id = node.id;

    // Get actual flow IDs for this node
    const incoming = incomingFlows.get(id) || [];
    const outgoing = outgoingFlows.get(id) || [];

    // Generate incoming/outgoing flow references
    const incomingXML = incoming.map(flowId => `      <bpmn:incoming>${flowId}</bpmn:incoming>`).join('\n');
    const outgoingXML = outgoing.map(flowId => `      <bpmn:outgoing>${flowId}</bpmn:outgoing>`).join('\n');

    switch (node.bpmnType) {
      case 'startEvent':
        return `    <bpmn:startEvent id="${id}" name="${name}">
${outgoingXML}
    </bpmn:startEvent>\n`;

      case 'endEvent':
        return `    <bpmn:endEvent id="${id}" name="${name}">
${incomingXML}
    </bpmn:endEvent>\n`;

      case 'userTask':
        return `    <bpmn:userTask id="${id}" name="${name}"${this.getUserTaskAttributes(node)}>
${incomingXML}
${outgoingXML}
${this.generateTaskDocumentation(node)}
    </bpmn:userTask>\n`;

      case 'scriptTask':
        return `    <bpmn:scriptTask id="${id}" name="${name}"${this.getScriptTaskAttributes(node)}>
${incomingXML}
${outgoingXML}
${this.generateTaskDocumentation(node)}
    </bpmn:scriptTask>\n`;

      case 'serviceTask':
        return `    <bpmn:serviceTask id="${id}" name="${name}">
${incomingXML}
${outgoingXML}
${this.generateTaskDocumentation(node)}
    </bpmn:serviceTask>\n`;

      case 'businessRuleTask':
        return `    <bpmn:businessRuleTask id="${id}" name="${name}">
${incomingXML}
${outgoingXML}
${this.generateTaskDocumentation(node)}
    </bpmn:businessRuleTask>\n`;

      case 'sendTask':
        return `    <bpmn:sendTask id="${id}" name="${name}">
${incomingXML}
${outgoingXML}
${this.generateTaskDocumentation(node)}
    </bpmn:sendTask>\n`;

      case 'exclusiveGateway':
        return `    <bpmn:exclusiveGateway id="${id}" name="${name}">
${incomingXML}
${outgoingXML}
    </bpmn:exclusiveGateway>\n`;

      case 'parallelGateway':
        return `    <bpmn:parallelGateway id="${id}" name="${name}">
${incomingXML}
${outgoingXML}
    </bpmn:parallelGateway>\n`;

      case 'intermediateCatchEvent':
        return `    <bpmn:intermediateCatchEvent id="${id}" name="${name}">
${incomingXML}
${outgoingXML}
      <bpmn:timerEventDefinition />
    </bpmn:intermediateCatchEvent>\n`;

      default:
        return `    <bpmn:task id="${id}" name="${name}">
${incomingXML}
${outgoingXML}
    </bpmn:task>\n`;
    }
  }

  /**
   * Generate sequence flow (connection)
   */
  generateSequenceFlow(connection) {
    const id = connection.id || `Flow_${connection.source}_${connection.target}`;
    const name = connection.label ? ` name="${this.escapeXML(connection.label)}"` : '';

    return `    <bpmn:sequenceFlow id="${id}" sourceRef="${connection.source}" targetRef="${connection.target}"${name} />\n`;
  }

  /**
   * Generate diagram elements (visual layout)
   */
  generateDiagramElements(nodes, connections, planeId) {
    let xml = '';

    // Generate shapes for nodes
    nodes.forEach(node => {
      xml += this.generateNodeShape(node);
    });

    // Generate edges for connections
    connections.forEach(conn => {
      xml += this.generateEdge(conn);
    });

    return xml;
  }

  /**
   * Generate visual shape for node
   */
  generateNodeShape(node) {
    const { id, position, bpmnType } = node;
    const x = position.x || 0;
    const y = position.y || 0;

    // Determine dimensions based on type
    const dimensions = this.getNodeDimensions(bpmnType);

    return `      <bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}">
        <dc:Bounds x="${x}" y="${y}" width="${dimensions.width}" height="${dimensions.height}" />
      </bpmndi:BPMNShape>\n`;
  }

  /**
   * Generate visual edge for connection
   */
  generateEdge(connection) {
    const id = connection.id || `Flow_${connection.source}_${connection.target}`;

    // Simple edge without waypoints (BPMN.io will auto-route)
    return `      <bpmndi:BPMNEdge id="${id}_di" bpmnElement="${id}">
        <di:waypoint x="0" y="0" />
        <di:waypoint x="0" y="0" />
      </bpmndi:BPMNEdge>\n`;
  }

  /**
   * Get node dimensions based on BPMN type
   */
  getNodeDimensions(bpmnType) {
    const dimensions = {
      'startEvent': { width: 36, height: 36 },
      'endEvent': { width: 36, height: 36 },
      'intermediateCatchEvent': { width: 36, height: 36 },
      'userTask': { width: 100, height: 80 },
      'scriptTask': { width: 100, height: 80 },
      'serviceTask': { width: 100, height: 80 },
      'businessRuleTask': { width: 100, height: 80 },
      'sendTask': { width: 100, height: 80 },
      'task': { width: 100, height: 80 },
      'exclusiveGateway': { width: 50, height: 50 },
      'parallelGateway': { width: 50, height: 50 }
    };

    return dimensions[bpmnType] || { width: 100, height: 80 };
  }

  /**
   * Get user task specific attributes
   */
  getUserTaskAttributes(node) {
    let attrs = '';
    if (node.data.assignedTo) {
      attrs += ` camunda:assignee="${this.escapeXML(node.data.assignedTo)}"`;
    }
    if (node.data.candidateGroups) {
      attrs += ` camunda:candidateGroups="${this.escapeXML(node.data.candidateGroups)}"`;
    }
    if (node.data.priority) {
      attrs += ` camunda:priority="${this.escapeXML(node.data.priority)}"`;
    }
    return attrs;
  }

  /**
   * Get script task specific attributes
   */
  getScriptTaskAttributes(node) {
    let attrs = '';
    if (node.data.scriptType) {
      attrs += ` scriptFormat="${this.escapeXML(node.data.scriptType.toLowerCase())}"`;
    }
    return attrs;
  }

  /**
   * Generate task documentation
   */
  generateTaskDocumentation(node) {
    if (node.data.description || node.data.instructions) {
      const doc = node.data.description || node.data.instructions;
      return `      <bpmn:documentation>${this.escapeXML(doc)}</bpmn:documentation>\n`;
    }
    return '';
  }

  /**
   * Escape XML special characters
   */
  escapeXML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

module.exports = BPMNGeneratorAgent;
