/**
 * BPMN Converter Utility
 * Converts workflow JSON to BPMN 2.0 XML format
 */

// Map internal node types to BPMN element types
const nodeToBPMNType = (node) => {
  const typeMap = {
    'startProcess': 'bpmn:StartEvent',
    'endEvent': 'bpmn:EndEvent',
    'userTask': 'bpmn:UserTask',
    'scriptTask': 'bpmn:ScriptTask',
    'decision': node.data?.gatewayType === 'parallel' ? 'bpmn:ParallelGateway' : 'bpmn:ExclusiveGateway',
    'validation': 'bpmn:ServiceTask',
    'notification': 'bpmn:ServiceTask',
    'dataProcess': 'bpmn:ServiceTask',
    'timerEvent': 'bpmn:IntermediateCatchEvent'
  };

  return typeMap[node.type] || 'bpmn:Task';
};

// Generate BPMN element based on node type
const generateBPMNElement = (node) => {
  const bpmnType = nodeToBPMNType(node);
  const elementTag = bpmnType.split(':')[1];

  let element = `    <${bpmnType} id="${node.id}" name="${node.data?.label || node.type}">\n`;

  // Add specific configurations based on node type
  if (node.type === 'timerEvent' && node.data?.timerType) {
    element += `      <timerEventDefinition>\n`;
    if (node.data.timerType === 'duration') {
      element += `        <timeDuration>${node.data.duration || 'PT1H'}</timeDuration>\n`;
    } else if (node.data.timerType === 'date') {
      element += `        <timeDate>${node.data.date || ''}</timeDate>\n`;
    }
    element += `      </timerEventDefinition>\n`;
  }

  if (node.type === 'scriptTask' && node.data?.script) {
    element += `      <script>${node.data.script}</script>\n`;
  }

  if (node.type === 'userTask' && node.data?.assignedTo) {
    element += `      <potentialOwner>${node.data.assignedTo}</potentialOwner>\n`;
  }

  element += `    </${bpmnType}>\n`;

  return element;
};

// Convert workflow JSON to BPMN 2.0 XML
const convertToBPMN = (workflow) => {
  const processId = `Process_${workflow.id}`;
  const definitionsId = `Definitions_${workflow.id}`;

  let bpmnXML = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  bpmnXML += `<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"\n`;
  bpmnXML += `                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"\n`;
  bpmnXML += `                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"\n`;
  bpmnXML += `                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"\n`;
  bpmnXML += `                  id="${definitionsId}"\n`;
  bpmnXML += `                  targetNamespace="http://bpmn.io/schema/bpmn">\n`;
  bpmnXML += `  <bpmn:process id="${processId}" name="${workflow.name}" isExecutable="true">\n`;

  // Add nodes as BPMN elements
  if (workflow.nodes && workflow.nodes.length > 0) {
    workflow.nodes.forEach(node => {
      bpmnXML += generateBPMNElement(node);
    });
  }

  // Add connections as sequence flows
  if (workflow.connections && workflow.connections.length > 0) {
    workflow.connections.forEach(connection => {
      bpmnXML += `    <bpmn:sequenceFlow id="${connection.id}" sourceRef="${connection.source}" targetRef="${connection.target}" />\n`;
    });
  }

  bpmnXML += `  </bpmn:process>\n`;

  // Add BPMN Diagram Interchange (DI) for visual representation
  bpmnXML += `  <bpmndi:BPMNDiagram id="BPMNDiagram_1">\n`;
  bpmnXML += `    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">\n`;

  // Add shapes for nodes
  if (workflow.nodes && workflow.nodes.length > 0) {
    workflow.nodes.forEach(node => {
      const x = node.position?.x || 0;
      const y = node.position?.y || 0;
      const width = 100;
      const height = 80;

      bpmnXML += `      <bpmndi:BPMNShape id="${node.id}_di" bpmnElement="${node.id}">\n`;
      bpmnXML += `        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}" />\n`;
      bpmnXML += `      </bpmndi:BPMNShape>\n`;
    });
  }

  // Add edges for connections
  if (workflow.connections && workflow.connections.length > 0) {
    workflow.connections.forEach(connection => {
      const sourceNode = workflow.nodes.find(n => n.id === connection.source);
      const targetNode = workflow.nodes.find(n => n.id === connection.target);

      if (sourceNode && targetNode) {
        const sourceX = (sourceNode.position?.x || 0) + 50;
        const sourceY = (sourceNode.position?.y || 0) + 80;
        const targetX = (targetNode.position?.x || 0) + 50;
        const targetY = targetNode.position?.y || 0;

        bpmnXML += `      <bpmndi:BPMNEdge id="${connection.id}_di" bpmnElement="${connection.id}">\n`;
        bpmnXML += `        <di:waypoint x="${sourceX}" y="${sourceY}" />\n`;
        bpmnXML += `        <di:waypoint x="${targetX}" y="${targetY}" />\n`;
        bpmnXML += `      </bpmndi:BPMNEdge>\n`;
      }
    });
  }

  bpmnXML += `    </bpmndi:BPMNPlane>\n`;
  bpmnXML += `  </bpmndi:BPMNDiagram>\n`;
  bpmnXML += `</bpmn:definitions>`;

  return bpmnXML;
};

module.exports = {
  convertToBPMN,
  nodeToBPMNType
};
