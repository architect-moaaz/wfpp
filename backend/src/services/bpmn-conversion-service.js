/**
 * BPMN Conversion Service
 * Multi-agent system for converting workflow JSON to BPMN 2.0 XML
 * Ensures compatibility with KIE (jBPM/Drools) and BPMN.io
 */

const BPMNConversionOrchestrator = require('./bpmn/BPMNConversionOrchestrator');
const WorkflowParserAgent = require('./bpmn/WorkflowParserAgent');
const BPMNGeneratorAgent = require('./bpmn/BPMNGeneratorAgent');
const BPMNValidationAgent = require('./bpmn/BPMNValidationAgent');
const KIECompatibilityAgent = require('./bpmn/KIECompatibilityAgent');
const BPMNioCompatibilityAgent = require('./bpmn/BPMNioCompatibilityAgent');

class BPMNConversionService {
  constructor() {
    this.orchestrator = new BPMNConversionOrchestrator();
    this.initializeAgents();
  }

  /**
   * Initialize and register all agents
   */
  initializeAgents() {
    console.log('[BPMNConversionService] Initializing multi-agent system...');

    // Register agents
    this.orchestrator.registerAgent('WorkflowParser', new WorkflowParserAgent());
    this.orchestrator.registerAgent('BPMNGenerator', new BPMNGeneratorAgent());
    this.orchestrator.registerAgent('Validation', new BPMNValidationAgent());
    this.orchestrator.registerAgent('KIECompatibility', new KIECompatibilityAgent());
    this.orchestrator.registerAgent('BPMNioCompatibility', new BPMNioCompatibilityAgent());

    console.log('[BPMNConversionService] All agents initialized successfully ✓');
  }

  /**
   * Convert workflow JSON to BPMN 2.0 XML
   * @param {object} workflowJSON - Workflow JSON structure
   * @returns {object} Conversion result with BPMN XML
   */
  async convertToBPMN(workflowJSON) {
    console.log('[BPMNConversionService] Starting JSON to BPMN conversion...');

    try {
      // Validate input
      if (!workflowJSON || !workflowJSON.nodes) {
        throw new Error('Invalid workflow JSON: missing nodes array');
      }

      // Execute multi-agent conversion pipeline
      const result = await this.orchestrator.convertJSONtoBPMN(workflowJSON);

      if (result.success) {
        console.log('[BPMNConversionService] Conversion completed successfully ✓');
      } else {
        console.error('[BPMNConversionService] Conversion failed:', result.error);
      }

      return result;

    } catch (error) {
      console.error('[BPMNConversionService] Conversion error:', error);
      return {
        success: false,
        error: error.message,
        executionLog: this.orchestrator.getExecutionLog()
      };
    }
  }

  /**
   * Get execution log from orchestrator
   */
  getExecutionLog() {
    return this.orchestrator.getExecutionLog();
  }

  /**
   * Clear execution log
   */
  clearLog() {
    this.orchestrator.clearLog();
  }
}

// Export singleton instance
module.exports = new BPMNConversionService();
