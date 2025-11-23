/**
 * AgentOrchestrator - Coordinates multi-agent workflow generation
 */

const WorkflowAgent = require('./WorkflowAgent');
const DataModelAgent = require('./DataModelAgent');
const FormsAgent = require('./FormsAgent');
const MobileDesignAgent = require('./MobileDesignAgent');
const formDatabase = require('../../database/FormDatabase');
const dataModelDatabase = require('../../database/DataModelDatabase');

class AgentOrchestrator {
  constructor() {
    this.workflowAgent = new WorkflowAgent();
    this.dataModelAgent = new DataModelAgent();
    this.formsAgent = new FormsAgent();
    this.mobileDesignAgent = new MobileDesignAgent();
  }

  /**
   * Main orchestration method - coordinates all agents
   */
  async generateWorkflow(userRequirements, existingWorkflow = null, conversationHistory = [], emitEvent) {
    const allThinking = [];

    const emitThinking = (thinkingData) => {
      allThinking.push(thinkingData);
      if (emitEvent) {
        emitEvent({
          type: 'thinking-step',
          data: thinkingData
        });
      }
    };

    try {
      // Build shared context
      const sharedContext = {
        userRequirements,
        existingWorkflow,
        conversationHistory,
        timestamp: Date.now()
      };

      emitThinking({
        agent: 'Orchestrator',
        step: 'Initializing Multi-Agent System',
        content: 'Coordinating WorkflowAgent, DataModelAgent, FormsAgent, and MobileDesignAgent...'
      });

      await this.sleep(300);

      // ==================================================================
      // PHASE 1: Workflow Structure Generation (Sequential - Required First)
      // ==================================================================

      emitThinking({
        agent: 'Orchestrator',
        step: 'Phase 1: Workflow Structure',
        content: 'Delegating to WorkflowAgent...'
      });

      const workflow = await this.workflowAgent.execute(sharedContext, emitThinking);

      if (!workflow || !workflow.nodes || workflow.nodes.length === 0) {
        throw new Error('WorkflowAgent failed to generate valid workflow');
      }

      // Update shared context with workflow
      sharedContext.workflow = workflow;
      const workflowId = workflow.id || `workflow_${Date.now()}`;
      const workflowName = workflow.name || this.extractWorkflowName(userRequirements);

      await this.sleep(300);

      // ==================================================================
      // PHASE 2: Parallel Generation (Data Models, Forms, Mobile UI)
      // ==================================================================

      emitThinking({
        agent: 'Orchestrator',
        step: 'Phase 2: Parallel Generation',
        content: 'Running DataModelAgent, FormsAgent, and MobileDesignAgent in parallel...'
      });

      const [dataModels, forms, mobileUI] = await Promise.all([
        // Data Model Agent
        this.dataModelAgent.execute(sharedContext, emitThinking)
          .catch(error => {
            console.error('DataModelAgent failed:', error);
            return []; // Graceful fallback
          }),

        // Forms Agent
        this.formsAgent.execute(sharedContext, emitThinking)
          .catch(error => {
            console.error('FormsAgent failed:', error);
            return []; // Graceful fallback
          }),

        // Mobile Design Agent
        this.mobileDesignAgent.execute(sharedContext, emitThinking)
          .catch(error => {
            console.error('MobileDesignAgent failed:', error);
            return { screens: [], navigation: null }; // Graceful fallback
          })
      ]);

      await this.sleep(300);

      // ==================================================================
      // PHASE 3: Integration & Binding
      // ==================================================================

      emitThinking({
        agent: 'Orchestrator',
        step: 'Phase 3: Integration',
        content: 'Binding data models to workflow nodes and forms...'
      });

      // Enhance forms with data model references
      forms.forEach(form => {
        form.id = form.id || `form_${workflowId}_${form.nodeId}`;
        form.workflowId = workflowId;

        // Find matching data model
        const matchingModel = dataModels.find(dm =>
          dm.name && form.name &&
          dm.name.toLowerCase().includes(form.name.toLowerCase().split('_')[0])
        );

        if (matchingModel) {
          form.dataModelId = matchingModel.id;
        }
      });

      // Bind data models and forms to workflow nodes
      workflow.nodes.forEach(node => {
        if (node.type === 'startProcess' || node.type === 'userTask') {
          const nodeForm = forms.find(f => f.nodeId === node.id);

          if (nodeForm) {
            node.data.formId = nodeForm.id;
            node.data.formName = nodeForm.name;

            if (nodeForm.dataModelId) {
              const dataModel = dataModels.find(dm => dm.id === nodeForm.dataModelId);
              if (dataModel) {
                node.data.dataModel = dataModel.name;
                node.data.dataModelAction = node.type === 'startProcess' ? 'Create' : 'Update';
              }
            }
          }
        }
      });

      await this.sleep(200);

      // ==================================================================
      // PHASE 4: Persistence
      // ==================================================================

      emitThinking({
        agent: 'Orchestrator',
        step: 'Phase 4: Saving Artifacts',
        content: 'Persisting forms and data models to database...'
      });

      // Save forms to database
      forms.forEach(form => {
        try {
          formDatabase.saveForm(form);
        } catch (error) {
          console.error('Failed to save form:', error);
        }
      });

      // Save data models to database
      dataModels.forEach(model => {
        try {
          model.id = model.id || `model_${workflowId}_${Date.now()}`;
          model.workflowId = workflowId;
          dataModelDatabase.saveDataModel(model);
        } catch (error) {
          console.error('Failed to save data model:', error);
        }
      });

      await this.sleep(200);

      // ==================================================================
      // PHASE 5: Final Assembly
      // ==================================================================

      emitThinking({
        agent: 'Orchestrator',
        step: 'Phase 5: Final Assembly',
        content: 'Creating complete workflow package...'
      });

      // Embed everything into workflow (workflow as central piece)
      workflow.forms = forms;
      workflow.dataModels = dataModels;
      workflow.mobileUI = mobileUI;
      workflow.metadata = {
        workflowId,
        workflowName,
        generatedAt: new Date().toISOString(),
        formsCount: forms.length,
        dataModelsCount: dataModels.length,
        mobileScreensCount: mobileUI?.screens?.length || 0,
        generatedBy: 'multi-agent-system',
        agents: {
          workflow: 'WorkflowAgent',
          dataModels: 'DataModelAgent',
          forms: 'FormsAgent',
          mobileUI: 'MobileDesignAgent'
        }
      };

      await this.sleep(200);

      // ==================================================================
      // COMPLETE
      // ==================================================================

      emitThinking({
        agent: 'Orchestrator',
        step: 'Generation Complete',
        content: `✓ Workflow: ${workflow.nodes.length} nodes\n✓ Data Models: ${dataModels.length}\n✓ Forms: ${forms.length} with ${forms.reduce((sum, f) => sum + f.fields.length, 0)} fields\n✓ Mobile Screens: ${mobileUI?.screens?.length || 0}`
      });

      const summary = this.generateSummary(workflow, userRequirements);

      return {
        thinking: allThinking,
        workflow,
        summary
      };

    } catch (error) {
      console.error('AgentOrchestrator failed:', error);

      emitThinking({
        agent: 'Orchestrator',
        step: 'Error',
        content: `Generation failed: ${error.message}`
      });

      throw error;
    }
  }

  /**
   * Generate workflow summary
   */
  generateSummary(workflow, userRequirements) {
    const nodeTypes = {};
    workflow.nodes.forEach(node => {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    });

    const components = Object.entries(nodeTypes)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    return {
      title: workflow.name,
      description: `Generated a complete workflow system with ${workflow.nodes.length} workflow nodes, ${workflow.forms?.length || 0} forms, ${workflow.dataModels?.length || 0} data models, and ${workflow.mobileUI?.screens?.length || 0} mobile screens.

**Workflow Components:** ${components}
**Forms:** ${workflow.forms?.map(f => f.title).join(', ') || 'None'}
**Data Models:** ${workflow.dataModels?.map(dm => dm.name).join(', ') || 'None'}
**Mobile Screens:** ${workflow.mobileUI?.screens?.map(s => s.name).join(', ') || 'None'}

The workflow has been generated using a multi-agent system with specialized agents for workflow structure, data modeling, form design, and mobile UI.`,
      nodeCount: workflow.nodes.length,
      connectionCount: workflow.connections.length,
      formsCount: workflow.forms?.length || 0,
      dataModelsCount: workflow.dataModels?.length || 0,
      mobileScreensCount: workflow.mobileUI?.screens?.length || 0,
      components
    };
  }

  /**
   * Extract workflow name from user requirements
   */
  extractWorkflowName(requirements) {
    const req = requirements.toLowerCase();

    if (req.includes('expense')) return 'Expense Approval Workflow';
    if (req.includes('leave') || req.includes('vacation')) return 'Leave Request Workflow';
    if (req.includes('purchase') || req.includes('procurement')) return 'Purchase Order Workflow';
    if (req.includes('customer') || req.includes('onboard')) return 'Customer Onboarding Workflow';
    if (req.includes('invoice')) return 'Invoice Processing Workflow';
    if (req.includes('hiring') || req.includes('recruit')) return 'Recruitment Workflow';

    return 'Custom Workflow';
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AgentOrchestrator;
