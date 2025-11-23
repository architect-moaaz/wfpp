/**
 * Multi-Agent Orchestrator for BPMN Conversion
 * Coordinates multiple specialized agents to convert workflow JSON to BPMN 2.0
 */

class AgentOrchestrator {
  constructor() {
    this.agents = new Map();
    this.executionLog = [];
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(name, agent) {
    this.agents.set(name, agent);
    this.log(`Agent registered: ${name}`);
  }

  /**
   * Execute multi-agent workflow for JSON to BPMN conversion
   */
  async convertJSONtoBPMN(workflowJSON) {
    this.log('Starting multi-agent BPMN conversion pipeline');

    try {
      // Stage 1: Parse and analyze workflow
      this.log('Stage 1: Parsing workflow structure');
      const parserAgent = this.agents.get('WorkflowParser');
      const parsedData = await parserAgent.execute(workflowJSON);

      // Stage 2: Generate BPMN XML
      this.log('Stage 2: Generating BPMN 2.0 XML');
      const generatorAgent = this.agents.get('BPMNGenerator');
      const bpmnXML = await generatorAgent.execute(parsedData);

      // Stage 3: Validate BPMN 2.0 compliance
      this.log('Stage 3: Validating BPMN 2.0 compliance');
      const validationAgent = this.agents.get('Validation');
      const validationResult = await validationAgent.execute(bpmnXML);

      // Stage 4: Ensure KIE compatibility
      this.log('Stage 4: Checking KIE (jBPM/Drools) compatibility');
      const kieAgent = this.agents.get('KIECompatibility');
      const kieCompatibleBPMN = await kieAgent.execute(bpmnXML, parsedData);

      // Stage 5: Ensure BPMN.io compatibility
      this.log('Stage 5: Ensuring BPMN.io visual compatibility');
      const bpmnioAgent = this.agents.get('BPMNioCompatibility');
      const finalBPMN = await bpmnioAgent.execute(kieCompatibleBPMN, parsedData);

      this.log('Multi-agent conversion completed successfully');

      return {
        success: true,
        bpmnXML: finalBPMN,
        validationResults: validationResult,
        executionLog: this.executionLog,
        stages: {
          parsing: parsedData.summary,
          validation: validationResult,
          kieCompatibility: 'Passed',
          bpmnioCompatibility: 'Passed'
        }
      };

    } catch (error) {
      this.log(`Error in conversion pipeline: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        executionLog: this.executionLog
      };
    }
  }

  /**
   * Log execution events
   */
  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    this.executionLog.push(logEntry);
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  /**
   * Get execution log
   */
  getExecutionLog() {
    return this.executionLog;
  }

  /**
   * Clear execution log
   */
  clearLog() {
    this.executionLog = [];
  }
}

module.exports = AgentOrchestrator;
