/**
 * Validation Agent
 * Validates BPMN 2.0 XML for compliance and correctness
 */

class ValidationAgent {
  constructor() {
    this.name = 'Validation';
  }

  /**
   * Execute validation checks
   */
  async execute(bpmnXML) {
    console.log('[Validation] Validating BPMN 2.0 compliance...');

    const results = {
      valid: true,
      errors: [],
      warnings: [],
      checks: []
    };

    // Run validation checks
    this.checkXMLStructure(bpmnXML, results);
    this.checkBPMNNamespaces(bpmnXML, results);
    this.checkProcessElement(bpmnXML, results);
    this.checkStartEvents(bpmnXML, results);
    this.checkEndEvents(bpmnXML, results);
    this.checkSequenceFlows(bpmnXML, results);
    this.checkFlowReferences(bpmnXML, results);
    this.checkDiagramElements(bpmnXML, results);

    results.valid = results.errors.length === 0;

    if (results.valid) {
      console.log('[Validation] BPMN 2.0 validation passed ✓');
    } else {
      console.warn(`[Validation] BPMN 2.0 validation failed with ${results.errors.length} errors`);
    }

    return results;
  }

  /**
   * Check XML structure
   */
  checkXMLStructure(xml, results) {
    const check = { name: 'XML Structure', status: 'checking' };

    if (!xml || typeof xml !== 'string') {
      check.status = 'failed';
      results.errors.push('Invalid XML: Empty or non-string input');
    } else if (!xml.includes('<?xml')) {
      check.status = 'warning';
      results.warnings.push('Missing XML declaration');
    } else if (!xml.includes('<bpmn:definitions')) {
      check.status = 'failed';
      results.errors.push('Missing BPMN definitions element');
    } else {
      check.status = 'passed';
    }

    results.checks.push(check);
  }

  /**
   * Check BPMN namespaces
   */
  checkBPMNNamespaces(xml, results) {
    const check = { name: 'BPMN Namespaces', status: 'checking' };

    const requiredNamespaces = [
      'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"',
      'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"',
      'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"',
      'xmlns:di="http://www.omg.org/spec/DD/20100524/DI"'
    ];

    const missingNamespaces = requiredNamespaces.filter(ns => !xml.includes(ns));

    if (missingNamespaces.length > 0) {
      check.status = 'failed';
      results.errors.push(`Missing required namespaces: ${missingNamespaces.join(', ')}`);
    } else {
      check.status = 'passed';
    }

    results.checks.push(check);
  }

  /**
   * Check process element
   */
  checkProcessElement(xml, results) {
    const check = { name: 'Process Element', status: 'checking' };

    if (!xml.includes('<bpmn:process')) {
      check.status = 'failed';
      results.errors.push('Missing <bpmn:process> element');
    } else if (!xml.includes('isExecutable="true"')) {
      check.status = 'warning';
      results.warnings.push('Process is not marked as executable');
    } else {
      check.status = 'passed';
    }

    results.checks.push(check);
  }

  /**
   * Check start events
   */
  checkStartEvents(xml, results) {
    const check = { name: 'Start Events', status: 'checking' };

    const startEventCount = (xml.match(/<bpmn:startEvent/g) || []).length;

    if (startEventCount === 0) {
      check.status = 'failed';
      results.errors.push('No start event found - every process must have at least one start event');
    } else if (startEventCount > 1) {
      check.status = 'warning';
      results.warnings.push(`Multiple start events (${startEventCount}) found - ensure this is intentional`);
    } else {
      check.status = 'passed';
    }

    results.checks.push(check);
  }

  /**
   * Check end events
   */
  checkEndEvents(xml, results) {
    const check = { name: 'End Events', status: 'checking' };

    const endEventCount = (xml.match(/<bpmn:endEvent/g) || []).length;

    if (endEventCount === 0) {
      check.status = 'warning';
      results.warnings.push('No end event found - processes should have at least one end event');
    } else {
      check.status = 'passed';
    }

    results.checks.push(check);
  }

  /**
   * Check sequence flows
   */
  checkSequenceFlows(xml, results) {
    const check = { name: 'Sequence Flows', status: 'checking' };

    const flowCount = (xml.match(/<bpmn:sequenceFlow/g) || []).length;

    if (flowCount === 0) {
      check.status = 'warning';
      results.warnings.push('No sequence flows found - elements may not be connected');
    } else {
      // Check that all flows have source and target
      const invalidFlows = xml.match(/<bpmn:sequenceFlow[^>]*>/g) || [];
      const hasInvalid = invalidFlows.some(flow =>
        !flow.includes('sourceRef=') || !flow.includes('targetRef=')
      );

      if (hasInvalid) {
        check.status = 'failed';
        results.errors.push('Some sequence flows missing sourceRef or targetRef attributes');
      } else {
        check.status = 'passed';
      }
    }

    results.checks.push(check);
  }

  /**
   * Check flow references are valid
   */
  checkFlowReferences(xml, results) {
    const check = { name: 'Flow References', status: 'checking' };

    // Extract all sequence flow IDs
    const flowIdPattern = /<bpmn:sequenceFlow[^>]*id="([^"]*)"/g;
    const flowIds = new Set();
    let match;

    while ((match = flowIdPattern.exec(xml)) !== null) {
      flowIds.add(match[1]);
    }

    // Extract all incoming/outgoing references
    const incomingPattern = /<bpmn:incoming>([^<]*)<\/bpmn:incoming>/g;
    const outgoingPattern = /<bpmn:outgoing>([^<]*)<\/bpmn:outgoing>/g;
    const unresolvedRefs = new Set();

    // Check incoming references
    while ((match = incomingPattern.exec(xml)) !== null) {
      const refId = match[1];
      if (!flowIds.has(refId)) {
        unresolvedRefs.add(refId);
      }
    }

    // Check outgoing references
    while ((match = outgoingPattern.exec(xml)) !== null) {
      const refId = match[1];
      if (!flowIds.has(refId)) {
        unresolvedRefs.add(refId);
      }
    }

    if (unresolvedRefs.size > 0) {
      check.status = 'failed';
      const unresolvedList = Array.from(unresolvedRefs).slice(0, 5).join(', ');
      const moreCount = unresolvedRefs.size > 5 ? ` (and ${unresolvedRefs.size - 5} more)` : '';
      results.errors.push(`Unresolved flow references: ${unresolvedList}${moreCount}`);
    } else {
      check.status = 'passed';
    }

    results.checks.push(check);
  }

  /**
   * Check diagram elements
   */
  checkDiagramElements(xml, results) {
    const check = { name: 'Diagram Elements', status: 'checking' };

    if (!xml.includes('<bpmndi:BPMNDiagram')) {
      check.status = 'warning';
      results.warnings.push('Missing BPMNDiagram - visual layout may not render properly');
    } else if (!xml.includes('<bpmndi:BPMNPlane')) {
      check.status = 'warning';
      results.warnings.push('Missing BPMNPlane - visual layout may not render properly');
    } else {
      check.status = 'passed';
    }

    results.checks.push(check);
  }
}

module.exports = ValidationAgent;
