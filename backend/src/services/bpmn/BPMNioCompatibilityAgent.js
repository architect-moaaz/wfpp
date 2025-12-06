/**
 * BPMN.io Compatibility Agent
 * Ensures BPMN is compatible with BPMN.io visual modeler
 */

class BPMNioCompatibilityAgent {
  constructor() {
    this.name = 'BPMNioCompatibility';
  }

  /**
   * Execute BPMN.io compatibility enhancements
   */
  async execute(bpmnXML, parsedData) {
    console.log('[BPMNioCompatibility] Ensuring BPMN.io visual compatibility...');

    let enhancedXML = bpmnXML;

    // Ensure proper exporter metadata
    enhancedXML = this.addExporterMetadata(enhancedXML);

    // Fix shape bounds to match BPMN.io expectations
    enhancedXML = this.fixShapeBounds(enhancedXML, parsedData);

    // Add proper edge waypoints
    enhancedXML = this.fixEdgeWaypoints(enhancedXML, parsedData);

    // Add labels for shapes
    enhancedXML = this.addShapeLabels(enhancedXML, parsedData);

    // Ensure color scheme compatibility
    enhancedXML = this.ensureColorCompatibility(enhancedXML);

    console.log('[BPMNioCompatibility] BPMN.io compatibility enhancements applied ✓');

    return enhancedXML;
  }

  /**
   * Add exporter metadata for BPMN.io
   */
  addExporterMetadata(xml) {
    if (!xml.includes('exporter=')) {
      xml = xml.replace(
        'targetNamespace=',
        'exporter="bpmn-js"\n                   exporterVersion="14.0.0"\n                   targetNamespace='
      );
    }
    return xml;
  }

  /**
   * Fix shape bounds for proper visual rendering
   */
  fixShapeBounds(xml, parsedData) {
    const { nodes } = parsedData;

    nodes.forEach(node => {
      const { id, position, bpmnType } = node;
      const x = position.x || 0;
      const y = position.y || 0;

      // Get proper dimensions for BPMN.io
      const dimensions = this.getBPMNioDimensions(bpmnType);

      // Replace bounds in XML
      const boundsRegex = new RegExp(
        `(<bpmndi:BPMNShape id="${id}_di"[^>]*>\\s*<dc:Bounds)([^>]*)(/>)`
      );

      xml = xml.replace(
        boundsRegex,
        `$1 x="${x}" y="${y}" width="${dimensions.width}" height="${dimensions.height}" $3`
      );
    });

    return xml;
  }

  /**
   * Fix edge waypoints for proper routing
   */
  fixEdgeWaypoints(xml, parsedData) {
    const { nodes, connections } = parsedData;

    // Build node position map
    const nodePositions = new Map();
    nodes.forEach(node => {
      nodePositions.set(node.id, {
        x: node.position.x || 0,
        y: node.position.y || 0,
        type: node.bpmnType
      });
    });

    connections.forEach(conn => {
      const sourceNode = nodePositions.get(conn.source);
      const targetNode = nodePositions.get(conn.target);

      if (sourceNode && targetNode) {
        const sourceDim = this.getBPMNioDimensions(sourceNode.type);
        const targetDim = this.getBPMNioDimensions(targetNode.type);

        // Calculate waypoints (center of source to center of target)
        const waypoint1 = {
          x: sourceNode.x + (sourceDim.width / 2),
          y: sourceNode.y + (sourceDim.height / 2)
        };

        const waypoint2 = {
          x: targetNode.x + (targetDim.width / 2),
          y: targetNode.y + (targetDim.height / 2)
        };

        const flowId = conn.id || `Flow_${conn.source}_${conn.target}`;

        // Replace waypoints
        const waypointPattern = new RegExp(
          `(<bpmndi:BPMNEdge id="${flowId}_di"[^>]*>)([\\s\\S]*?)(</bpmndi:BPMNEdge>)`,
          'g'
        );

        xml = xml.replace(
          waypointPattern,
          `$1
        <di:waypoint x="${waypoint1.x}" y="${waypoint1.y}" />
        <di:waypoint x="${waypoint2.x}" y="${waypoint2.y}" />
      $3`
        );
      }
    });

    return xml;
  }

  /**
   * Add labels for shapes (task names, gateway names)
   */
  addShapeLabels(xml, parsedData) {
    const { nodes } = parsedData;

    nodes.forEach(node => {
      // Add labels for tasks and gateways
      if (this.needsLabel(node.bpmnType) && node.name) {
        const shapeId = `${node.id}_di`;
        const labelXML = `
        <bpmndi:BPMNLabel />`;

        // Insert label after shape
        xml = xml.replace(
          new RegExp(`(<bpmndi:BPMNShape id="${shapeId}"[^>]*>\\s*<dc:Bounds[^>]*/>)`),
          `$1${labelXML}`
        );
      }
    });

    return xml;
  }

  /**
   * Check if node type needs a label
   */
  needsLabel(bpmnType) {
    return [
      'userTask',
      'scriptTask',
      'serviceTask',
      'businessRuleTask',
      'sendTask',
      'task',
      'exclusiveGateway',
      'parallelGateway'
    ].includes(bpmnType);
  }

  /**
   * Ensure color scheme compatibility
   */
  ensureColorCompatibility(xml) {
    // BPMN.io uses specific color attributes
    // Add bioc namespace for colors if needed
    if (!xml.includes('xmlns:bioc=')) {
      xml = xml.replace(
        '<bpmn:definitions',
        '<bpmn:definitions\n                   xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0"'
      );
    }

    return xml;
  }

  /**
   * Get BPMN.io standard dimensions
   */
  getBPMNioDimensions(bpmnType) {
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
}

module.exports = BPMNioCompatibilityAgent;
