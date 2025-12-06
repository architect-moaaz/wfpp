/**
 * KIE Compatibility Agent
 * Ensures BPMN is compatible with KIE (jBPM/Drools) execution engine
 */

class KIECompatibilityAgent {
  constructor() {
    this.name = 'KIECompatibility';
  }

  /**
   * Execute KIE compatibility enhancements
   */
  async execute(bpmnXML, parsedData) {
    console.log('[KIECompatibility] Ensuring KIE (jBPM/Drools) compatibility...');

    let enhancedXML = bpmnXML;

    // Add jBPM namespace if not present
    enhancedXML = this.addJBPMNamespace(enhancedXML);

    // Ensure process is executable
    enhancedXML = this.ensureExecutable(enhancedXML);

    // Add KIE-specific metadata
    enhancedXML = this.addKIEMetadata(enhancedXML, parsedData);

    // Enhance user tasks with KIE attributes
    enhancedXML = this.enhanceUserTasks(enhancedXML);

    // Enhance script tasks with KIE attributes
    enhancedXML = this.enhanceScriptTasks(enhancedXML);

    // Add process variables if needed
    enhancedXML = this.addProcessVariables(enhancedXML, parsedData);

    console.log('[KIECompatibility] KIE compatibility enhancements applied ✓');

    return enhancedXML;
  }

  /**
   * Add jBPM namespace
   */
  addJBPMNamespace(xml) {
    if (!xml.includes('xmlns:drools=')) {
      xml = xml.replace(
        '<bpmn:definitions',
        '<bpmn:definitions\n                   xmlns:drools="http://www.jboss.org/drools"'
      );
    }
    return xml;
  }

  /**
   * Ensure process is marked as executable
   */
  ensureExecutable(xml) {
    if (!xml.includes('isExecutable="true"')) {
      xml = xml.replace(
        /<bpmn:process([^>]*?)>/,
        '<bpmn:process$1 isExecutable="true">'
      );
    }
    return xml;
  }

  /**
   * Add KIE-specific metadata
   */
  addKIEMetadata(xml, parsedData) {
    // Add package name for jBPM
    const packageName = `com.workflow.${parsedData.metadata.id}`;

    xml = xml.replace(
      'targetNamespace="http://bpmn.io/schema/bpmn"',
      `targetNamespace="http://bpmn.io/schema/bpmn"\n                   drools:packageName="${packageName}"`
    );

    return xml;
  }

  /**
   * Enhance user tasks with KIE-specific attributes
   */
  enhanceUserTasks(xml) {
    // Add task names for jBPM work item handler
    xml = xml.replace(
      /<bpmn:userTask([^>]*?)>/g,
      (match) => {
        if (!match.includes('camunda:taskName')) {
          return match.replace('>', ' drools:taskName="HumanTask">');
        }
        return match;
      }
    );

    return xml;
  }

  /**
   * Enhance script tasks with KIE attributes
   */
  enhanceScriptTasks(xml) {
    // Ensure script format is set (KIE requires this)
    xml = xml.replace(
      /<bpmn:scriptTask([^>]*?)>/g,
      (match) => {
        if (!match.includes('scriptFormat=')) {
          return match.replace('>', ' scriptFormat="javascript">');
        }
        return match;
      }
    );

    return xml;
  }

  /**
   * Add process variables
   */
  addProcessVariables(xml, parsedData) {
    // Add common process variables for KIE execution
    const processId = `Process_${parsedData.metadata.id}`;

    const variablesXML = `
    <!-- Process Variables for KIE -->
    <bpmn:property id="initiator" name="initiator" />
    <bpmn:property id="status" name="status" />
    <bpmn:property id="processData" name="processData" />`;

    // Insert variables before closing process tag
    xml = xml.replace(
      `  </bpmn:process>`,
      `${variablesXML}
  </bpmn:process>`
    );

    return xml;
  }
}

module.exports = KIECompatibilityAgent;
