/**
 * MoEOrchestrator - Coordinates the Mixture of Experts system
 *
 * Flow:
 * 1. RouterAgent analyzes request and routes to experts
 * 2. Execute selected experts in parallel
 * 3. ExpertCombiner merges results
 * 4. Return complete workflow package
 */

const RouterAgent = require('./RouterAgent');
const ExpertCombiner = require('./ExpertCombiner');
const WorkflowValidator = require('../validation/WorkflowValidator');
const WorkflowFixer = require('../validation/WorkflowFixer');
const ApplicationValidator = require('./experts/ApplicationValidator');
const PlanningExpert = require('./experts/PlanningExpert');
const ComponentOrchestrator = require('./ComponentOrchestrator');

// Import workflow experts
const SimpleWorkflowExpert = require('./experts/SimpleWorkflowExpert');
const ApprovalWorkflowExpert = require('./experts/ApprovalWorkflowExpert');
const ComplexWorkflowExpert = require('./experts/ComplexWorkflowExpert');
const DataProcessingExpert = require('./experts/DataProcessingExpert');
const SequentialWorkflowExpert = require('./experts/SequentialWorkflowExpert');

// Import data model experts
const SQLExpert = require('./experts/SQLExpert');
const NoSQLExpert = require('./experts/NoSQLExpert');
const GraphExpert = require('./experts/GraphExpert');
const TimeSeriesExpert = require('./experts/TimeSeriesExpert');

// Import form experts
const SimpleFormExpert = require('./experts/SimpleFormExpert');
const AdvancedFormExpert = require('./experts/AdvancedFormExpert');
const MobileFormExpert = require('./experts/MobileFormExpert');
const WizardFormExpert = require('./experts/WizardFormExpert');

// Import mobile experts
const iOSExpert = require('./experts/iOSExpert');
const AndroidExpert = require('./experts/AndroidExpert');
const CrossPlatformExpert = require('./experts/CrossPlatformExpert');

// Import page expert
const PageExpert = require('./experts/PageExpert');

// Import design expert
const DesignExpert = require('./experts/DesignExpert');

// Import rules expert
const RulesExpert = require('./experts/RulesExpert');

class MoEOrchestrator {
  constructor() {
    this.router = new RouterAgent();
    this.planningExpert = new PlanningExpert();

    // Initialize all experts
    this.experts = {
      workflow: {
        simple: new SimpleWorkflowExpert(),
        approval: new ApprovalWorkflowExpert(),
        complex: new ComplexWorkflowExpert(),
        dataProcessing: new DataProcessingExpert(),
        sequential: new SequentialWorkflowExpert()
      },
      dataModel: {
        sql: new SQLExpert(),
        nosql: new NoSQLExpert(),
        graph: new GraphExpert(),
        timeSeries: new TimeSeriesExpert()
      },
      forms: {
        simple: new SimpleFormExpert(),
        advanced: new AdvancedFormExpert(),
        mobile: new MobileFormExpert(),
        wizard: new WizardFormExpert()
      },
      mobile: {
        ios: new iOSExpert(),
        android: new AndroidExpert(),
        crossPlatform: new CrossPlatformExpert()
      },
      pages: {
        generic: new PageExpert()
      },
      design: {
        ui: new DesignExpert()
      },
      rules: {
        business: new RulesExpert()
      }
    };

    console.log('MoEOrchestrator initialized with experts:', {
      workflow: Object.keys(this.experts.workflow),
      dataModel: Object.keys(this.experts.dataModel),
      forms: Object.keys(this.experts.forms),
      mobile: Object.keys(this.experts.mobile),
      pages: Object.keys(this.experts.pages),
      design: Object.keys(this.experts.design),
      rules: Object.keys(this.experts.rules)
    });
  }

  /**
   * Main method: Generate complete workflow using MoE
   */
  async generateWorkflow(userRequirements, existingWorkflow, conversationHistory, emitEvent, designInput = null) {
    console.log('[MoE] === WORKFLOW GENERATION STARTED ===');
    console.log('[MoE] User requirements:', userRequirements);
    if (designInput) {
      console.log('[MoE] Design input provided:', designInput.type, designInput.name);
    }

    const thinking = [];

    const emitThinking = (thought) => {
      thinking.push(thought);
      if (emitEvent) {
        emitEvent({
          type: 'thinking-step',
          data: thought
        });
      }
    };

    try {
      console.log('[MoE] Step 1: Emitting initial thinking...');
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Starting Mixture of Experts',
        content: designInput ? 'Analyzing request with design file and routing to specialized experts...' : 'Analyzing request and routing to specialized experts...'
      });

      // Phase 0: Create comprehensive plan (only for new workflows)
      let applicationPlan = null;
      if (!existingWorkflow) {
        console.log('[MoE] Step 1.5: Creating application plan...');
        applicationPlan = await this.createApplicationPlan(userRequirements, conversationHistory, emitThinking);
        console.log('[MoE] Step 1.5 COMPLETE: Plan created with', applicationPlan ? `${applicationPlan.dataModels.length} models` : 'fallback');
      }

      // Phase 1: Route to appropriate experts
      console.log('[MoE] Step 2: Starting request routing...');
      const routing = await this.routeRequest(userRequirements, conversationHistory, emitThinking, applicationPlan);
      console.log('[MoE] Step 2 COMPLETE: Routing result:', JSON.stringify(routing, null, 2));

      // Phase 2: Execute selected experts in parallel
      const results = await this.executeExperts(
        routing,
        userRequirements,
        existingWorkflow,
        conversationHistory,
        emitThinking,
        designInput,
        applicationPlan
      );

      // Phase 3: Combine results
      const combined = await this.combineResults(results, routing, emitThinking);

      // Phase 4: Finalize workflow
      const finalWorkflow = await this.finalizeWorkflow(combined, routing);

      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'MoE Complete',
        content: `Generated workflow using ${Object.keys(results).length} experts with ${routing.combineStrategy} strategy`
      });

      return {
        thinking,
        workflow: finalWorkflow,
        summary: this.generateSummary(finalWorkflow, routing)
      };

    } catch (error) {
      console.error('MoE generation failed:', error);
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Error',
        content: `MoE failed: ${error.message}`
      });
      throw error;
    }
  }

  /**
   * Phase 0: Create comprehensive application plan
   * Uses NEW component-based architecture to eliminate JSON truncation
   */
  async createApplicationPlan(userRequirements, conversationHistory, emitThinking) {
    emitThinking({
      agent: 'PlanningExpert',
      step: 'Creating Application Blueprint',
      content: 'Analyzing requirements and creating component specifications...'
    });

    try {
      const context = {
        applicationDomain: this.extractDomain(userRequirements),
        complexity: this.estimateComplexity(userRequirements)
      };

      // STEP 1: Create lightweight component plan (specs only, 3000 tokens)
      console.log('[MoE] Step 1: Creating component plan...');
      const componentPlan = await this.planningExpert.createComponentPlan(
        userRequirements,
        context,
        emitThinking
      );

      console.log('[MoE] Component plan created:', {
        components: componentPlan.componentSpecs.length,
        strategy: componentPlan.generationStrategy,
        complexity: componentPlan.complexity
      });

      emitThinking({
        agent: 'PlanningExpert',
        step: 'Component Plan Created',
        content: `Identified ${componentPlan.componentSpecs.length} components to generate using ${componentPlan.generationStrategy} strategy`
      });

      // STEP 1.5: Generate design system using DesignExpert
      // DesignExpert acts as UX Designer, creating ONLY design specifications
      // FormExpert and PageExpert will use these specs to generate components
      console.log('[MoE] Step 1.5: Generating design system...');
      emitThinking({
        agent: 'DesignExpert',
        step: 'Generating Design System',
        content: 'UX Designer creating professional design specifications...'
      });

      let designSystem = null;
      try {
        const designExpert = this.experts.design.ui;
        const designAnalysis = await designExpert.generateOptimalDesign(
          userRequirements,
          [],  // dataModels not yet generated
          null,  // workflow not yet generated
          (thought) => {
            if (emitThinking) emitThinking(thought);
          }
        );

        designSystem = designAnalysis?.designAnalysis || this.getDefaultDesignSystem();

        console.log('[MoE] Design system generated successfully:', {
          hasDesignSystem: !!designSystem,
          domain: designSystem?.domain || 'auto-generated'
        });
      } catch (error) {
        console.warn('[MoE] DesignExpert failed, using default design system:', error.message);
        designSystem = this.getDefaultDesignSystem();

        emitThinking({
          agent: 'DesignExpert',
          step: 'Using Default Design',
          content: 'Using professional default design system'
        });
      }

      emitThinking({
        agent: 'DesignExpert',
        step: 'Design System Ready',
        content: 'Design specs ready - FormExpert and PageExpert will generate components using these specifications'
      });

      // Attach design system to component plan
      componentPlan.designSystem = designSystem;

      // STEP 2: Execute component generation using ComponentOrchestrator
      console.log('[MoE] Step 2: Executing component generation with design system...');
      const orchestrator = new ComponentOrchestrator();
      const plan = await orchestrator.execute(componentPlan, emitThinking);

      console.log('[MoE] Component generation complete:', {
        dataModels: plan.dataModels.length,
        workflows: plan.workflows.length,
        forms: plan.forms.length,
        pages: plan.pages.length
      });

      emitThinking({
        agent: 'ComponentOrchestrator',
        step: 'Generation Complete',
        content: `Blueprint complete: ${plan.dataModels.length} data models, ${plan.workflows.length} workflows, ${plan.forms.length} forms, ${plan.pages.length} pages`
      });

      return plan;
    } catch (error) {
      console.error('[MoE] Planning failed:', error);
      emitThinking({
        agent: 'PlanningExpert',
        step: 'Planning Failed',
        content: `Error during planning: ${error.message}`
      });

      // Don't return null - let the error propagate so ARES can show the error to the user
      throw error;
    }
  }

  /**
   * Extract application domain from requirements
   */
  extractDomain(requirements) {
    const domains = ['HR', 'Finance', 'CRM', 'Inventory', 'Project Management', 'Healthcare', 'Education'];
    const lower = requirements.toLowerCase();
    for (const domain of domains) {
      if (lower.includes(domain.toLowerCase())) {
        return domain;
      }
    }
    return 'General';
  }

  /**
   * Estimate complexity from requirements
   */
  estimateComplexity(requirements) {
    const lower = requirements.toLowerCase();
    const complexIndicators = ['integration', 'multiple', 'advanced', 'complex', 'approval', 'workflow'];
    const matchCount = complexIndicators.filter(indicator => lower.includes(indicator)).length;

    if (matchCount >= 3) return 'complex';
    if (matchCount >= 1) return 'moderate';
    return 'simple';
  }

  /**
   * Phase 1: Route request to appropriate experts
   */
  async routeRequest(userRequirements, conversationHistory, emitThinking, applicationPlan = null) {
    emitThinking({
      agent: 'RouterAgent',
      step: 'Analyzing Request',
      content: applicationPlan ? 'Using application plan to route to experts...' : 'Determining complexity, domain, and best expert combination...'
    });

    const routing = await this.router.execute(userRequirements, conversationHistory, emitThinking, applicationPlan);

    emitThinking({
      agent: 'RouterAgent',
      step: 'Routing Complete',
      content: `Selected experts: Workflow(${routing.routing.workflowExperts.length}), Data(${routing.routing.dataModelExperts.length}), Forms(${routing.routing.formExperts.length}), Mobile(${routing.routing.mobileExperts.length}) | Strategy: ${routing.combineStrategy} | Confidence: ${(routing.confidence * 100).toFixed(0)}%`
    });

    return routing;
  }

  /**
   * Phase 2: Execute selected experts in parallel
   */
  async executeExperts(routing, userRequirements, existingWorkflow, conversationHistory, emitThinking, designInput = null, applicationPlan = null) {
    const sharedContext = {
      userRequirements,
      existingWorkflow,
      conversationHistory,
      routing
    };

    const results = {
      workflows: [],
      dataModels: [],
      forms: [],
      mobileUI: [],
      pages: [],
      design: null,
      rules: []
    };

    // Pre-populate results with components from applicationPlan if available
    // (generated by new component-based architecture)
    if (applicationPlan) {
      if (applicationPlan.dataModels && applicationPlan.dataModels.length > 0) {
        results.dataModels.push(applicationPlan.dataModels);
        console.log(`[MoE] Using ${applicationPlan.dataModels.length} data models from ComponentOrchestrator`);
      }
      if (applicationPlan.workflows && applicationPlan.workflows.length > 0) {
        // Keep each workflow separate - push each one individually
        applicationPlan.workflows.forEach(wf => {
          results.workflows.push({ workflow: wf });
        });
        console.log(`[MoE] Using ${applicationPlan.workflows.length} separate workflow(s) from ComponentOrchestrator`);
      }
      if (applicationPlan.forms && applicationPlan.forms.length > 0) {
        results.forms.push({ forms: applicationPlan.forms });
        console.log(`[MoE] Using ${applicationPlan.forms.length} forms from ComponentOrchestrator`);
      }
      if (applicationPlan.pages && applicationPlan.pages.length > 0) {
        results.pages.push({ pages: applicationPlan.pages });
        console.log(`[MoE] Using ${applicationPlan.pages.length} pages from ComponentOrchestrator`);
      }
    }

    // ONLY execute design expert for Figma/PDF/Image analysis (OLD PATH)
    // Note: NEW PATH (applicationPlan) already called DesignExpert for design system
    // This section is for when a design FILE is provided (Figma/PDF/Image)
    if (designInput) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Executing Design Expert',
        content: `Analyzing ${designInput.type} design file: ${designInput.name}`
      });

      const designExpert = this.getExpert('design', 'ui');
      if (designExpert) {
        try {
          // Prepare design input for the expert
          let designInputForExpert = null;
          if (designInput) {
            // Convert base64 data to temporary file path format expected by DesignExpert
            designInputForExpert = designInput.name; // Filename with extension
            // Store the base64 data for the expert to use
            designExpert.base64Data = designInput.data;
            designExpert.mimeType = designInput.mimeType;
          }

          const designResult = await designExpert.execute(
            sharedContext.userRequirements,
            sharedContext.conversationHistory,
            emitThinking,
            designInputForExpert
          );

          if (designResult) {
            results.design = designResult;
            // When analyzing Figma/PDF/Image files, DesignExpert extracts forms and pages
            // Use these instead of generating new ones
            if (designResult.forms && designResult.forms.length > 0) {
              results.forms.push({ forms: designResult.forms });
              console.log(`[MoE] Design expert extracted ${designResult.forms.length} forms from design file`);
            }
            if (designResult.pages && designResult.pages.length > 0) {
              results.pages.push({ pages: designResult.pages });
              console.log(`[MoE] Design expert extracted ${designResult.pages.length} pages from design file`);
            }
          }
        } catch (error) {
          console.error('[MoE] Design expert failed:', error.message);
          emitThinking({
            agent: 'MoEOrchestrator',
            step: 'Design Expert Error',
            content: `Design file analysis failed: ${error.message}. Falling back to auto-generation...`
          });
        }
      }
    }

    // Execute workflow experts (if any exist and not already generated by ComponentOrchestrator)
    if (routing.routing.workflowExperts.length > 0 && results.workflows.length === 0) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Executing Workflow Experts',
        content: `Running ${routing.routing.workflowExperts.length} workflow expert(s)...`
      });

      const workflowPromises = routing.routing.workflowExperts.map(expertName => {
        const expert = this.getExpert('workflow', expertName);
        if (expert) {
          return expert.execute(sharedContext, emitThinking);
        }
        return null;
      });

      const workflows = await Promise.all(workflowPromises);
      results.workflows = workflows.filter(w => w !== null);
    } else if (results.workflows.length > 0) {
      console.log('[MoE] Skipping old workflow experts - workflows already generated by ComponentOrchestrator');
    }

    // Execute data model experts (if any exist and not already generated by ComponentOrchestrator)
    if (routing.routing.dataModelExperts.length > 0 && results.dataModels.length === 0) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Executing Data Model Experts',
        content: `Running ${routing.routing.dataModelExperts.length} data expert(s)...`
      });

      const dataPromises = routing.routing.dataModelExperts.map(expertName => {
        const expert = this.getExpert('dataModel', expertName);
        if (expert) {
          return expert.execute(sharedContext, emitThinking);
        }
        return null;
      });

      const dataModels = await Promise.all(dataPromises);
      results.dataModels = dataModels.filter(d => d !== null);
    } else if (results.dataModels.length > 0) {
      console.log('[MoE] Skipping old data model experts - models already generated by ComponentOrchestrator');
    }

    // Execute form experts (if any exist and design expert didn't already generate forms)
    if (routing.routing.formExperts.length > 0 && results.forms.length === 0) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Executing Form Experts',
        content: `Running ${routing.routing.formExperts.length} form expert(s)...`
      });

      const formPromises = routing.routing.formExperts.map(expertName => {
        const expert = this.getExpert('forms', expertName);
        if (expert) {
          return expert.execute(sharedContext, emitThinking);
        }
        return null;
      });

      const forms = await Promise.all(formPromises);
      results.forms = forms.filter(f => f !== null);
    } else if (results.forms.length > 0) {
      console.log('[MoE] Skipping form experts - forms already generated by design expert');
    }

    // Execute mobile experts (if any exist) with AI-powered self-healing
    if (routing.routing.mobileExperts.length > 0) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Executing Mobile Experts',
        content: `Running ${routing.routing.mobileExperts.length} mobile expert(s) with self-healing enabled...`
      });

      const mobilePromises = routing.routing.mobileExperts.map(async expertName => {
        const expert = this.getExpert('mobile', expertName);
        if (expert) {
          try {
            // Expert now uses executeWithSelfHealing internally
            const result = await expert.execute(sharedContext, emitThinking);
            console.log(`[MoE] Mobile expert ${expertName} completed successfully`);
            return result;
          } catch (error) {
            console.error(`[MoE] Mobile expert ${expertName} failed after self-healing attempts:`, error.message);

            // Emit detailed error info for AI recovery at orchestrator level
            emitThinking({
              agent: 'MoEOrchestrator',
              step: 'Mobile Expert Recovery',
              content: `Mobile screens (${expertName}) failed. AI recovery will attempt regeneration...`
            });

            // Store error details for potential AI recovery
            const errorInfo = {
              expert: expertName,
              error: error.message,
              timestamp: new Date().toISOString()
            };

            // Try AI-powered regeneration for mobile component
            try {
              const regeneratedMobile = await this.regenerateMobileWithAI(
                expertName,
                sharedContext,
                emitThinking
              );
              if (regeneratedMobile) {
                console.log(`[MoE] AI successfully regenerated mobile screens for ${expertName}`);
                emitThinking({
                  agent: 'MoEOrchestrator',
                  step: 'Mobile Recovery Success',
                  content: `AI successfully recovered mobile screens (${expertName})`
                });
                return regeneratedMobile;
              }
            } catch (regenError) {
              console.error(`[MoE] AI regeneration failed for ${expertName}:`, regenError.message);
            }

            return null;
          }
        }
        return null;
      });

      const mobileUI = await Promise.all(mobilePromises);
      results.mobileUI = mobileUI.filter(m => m !== null);

      if (results.mobileUI.length === 0 && routing.routing.mobileExperts.length > 0) {
        console.log('[MoE] All mobile experts failed, but core application generation continues');
        emitThinking({
          agent: 'MoEOrchestrator',
          step: 'Mobile Screens Deferred',
          content: 'Mobile screens will be available after manual enhancement or retry'
        });
      }
    }

    // Execute page expert - always run if we have forms or data models and design expert didn't generate pages
    const hasFormsOrDataModels = results.forms.length > 0 || results.dataModels.length > 0;
    const designDidNotGeneratePages = results.pages.length === 0;
    if (hasFormsOrDataModels && designDidNotGeneratePages) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Executing Page Expert',
        content: 'Generating pages based on workflow, forms, and data models...'
      });

      const pageExpert = this.getExpert('pages', 'generic');
      if (pageExpert) {
        // Prepare context with results from previous experts
        const pageContext = {
          ...sharedContext,
          workflow: results.workflows.length > 0 ? results.workflows[0] : null,
          forms: results.forms.flatMap(f => f.forms || []),
          dataModels: results.dataModels.flatMap(dm => dm.dataModels || [])
        };

        const pageResult = await pageExpert.execute(pageContext, emitThinking);
        if (pageResult) {
          results.pages.push(pageResult);
        }
      }
    } else if (!designDidNotGeneratePages) {
      console.log('[MoE] Skipping page expert - pages already generated by design expert');
    }

    // Execute rules expert - generate rules for workflows after workflows are created
    // Rules need to be attached to specific workflow nodes
    if (results.workflows.length > 0) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Executing Rules Expert',
        content: 'Generating business rules for workflow nodes...'
      });

      const rulesExpert = this.getExpert('rules', 'business');
      if (rulesExpert) {
        try {
          // Get the combined workflow (first workflow result)
          const workflow = results.workflows[0]?.workflow || results.workflows[0];

          if (workflow && workflow.nodes) {
            // Get data models for context
            const dataModels = results.dataModels.flatMap(dm => dm.dataModels || dm || []);

            // Generate rules for the workflow
            const generatedRules = await rulesExpert.generateForWorkflow(
              workflow,
              dataModels,
              {
                overview: {
                  name: userRequirements.substring(0, 50),
                  category: 'General'
                }
              }
            );

            if (generatedRules && generatedRules.length > 0) {
              results.rules = generatedRules;
              console.log(`[MoE] Generated ${generatedRules.length} business rules for workflow`);

              emitThinking({
                agent: 'RulesExpert',
                step: 'Rules Generation Complete',
                content: `Generated ${generatedRules.length} business rule(s) for workflow nodes`
              });
            }
          }
        } catch (error) {
          console.error('[MoE] Rules expert failed:', error.message);
          emitThinking({
            agent: 'MoEOrchestrator',
            step: 'Rules Expert Warning',
            content: `Rules generation failed: ${error.message}. Continuing without rules...`
          });
          // Don't fail the entire generation if rules fail
          results.rules = [];
        }
      }
    }

    return results;
  }

  /**
   * Phase 3: Combine results from multiple experts
   */
  async combineResults(results, routing, emitThinking) {
    emitThinking({
      agent: 'ExpertCombiner',
      step: 'Combining Results',
      content: `Merging outputs using ${routing.combineStrategy} strategy...`
    });

    const combined = {
      workflows: [],  // Changed from workflow (singular) to workflows (array)
      dataModels: [],
      forms: [],
      mobileUI: null,
      pages: [],
      rules: []
    };

    // Keep workflows separate - don't combine them
    if (results.workflows.length > 0) {
      // Extract workflow from each result and add to array
      results.workflows.forEach(result => {
        const workflow = result.workflow || result;
        if (workflow) {
          combined.workflows.push(workflow);
        }
      });
      console.log(`[MoE] Keeping ${combined.workflows.length} workflows separate`);
    }

    // Combine data models
    if (results.dataModels.length > 0) {
      combined.dataModels = ExpertCombiner.combineDataModels(
        results.dataModels,
        routing.combineStrategy
      );
    }

    // Combine forms
    if (results.forms.length > 0) {
      combined.forms = ExpertCombiner.combineForms(
        results.forms,
        routing.combineStrategy
      );
    }

    // Combine mobile UI
    if (results.mobileUI.length > 0) {
      combined.mobileUI = ExpertCombiner.combineMobileUI(
        results.mobileUI,
        routing.combineStrategy
      );
    }

    // Combine pages - extract from page results
    if (results.pages.length > 0) {
      combined.pages = results.pages.flatMap(p => p.pages || []);
    }

    // Combine rules - rules are already in correct format
    if (results.rules && results.rules.length > 0) {
      combined.rules = results.rules;
    }

    // FALLBACK: Link forms to user task nodes for nodes not already linked by ComponentOrchestrator
    // Plan-based linking in ComponentOrchestrator.linkFormsToWorkflows() runs first (if component plan has formAssociation)
    // This heuristic linking only applies to nodes that don't have formId already set
    // Track globally used forms to prevent reusing the same form across workflows
    if (combined.workflows.length > 0 && combined.forms && combined.forms.length > 0) {
      const usedFormIds = new Set();
      let globalFormIndex = 0;

      // First, mark forms that are already linked (from plan-based linking) as used
      combined.workflows.forEach(workflow => {
        if (workflow.nodes) {
          workflow.nodes.forEach(node => {
            if (node.data?.formId) {
              usedFormIds.add(node.data.formId);
            }
          });
        }
      });

      console.log(`[MoE] Forms already linked by ComponentOrchestrator: ${usedFormIds.size}`);

      combined.workflows.forEach(workflow => {
        globalFormIndex = this.linkFormsToUserTasks(
          workflow,
          combined.forms,
          emitThinking,
          usedFormIds,
          globalFormIndex
        );
      });
    }

    // Calculate total nodes across all workflows
    const totalNodes = combined.workflows.reduce((sum, wf) => sum + (wf.nodes?.length || 0), 0);

    emitThinking({
      agent: 'ExpertCombiner',
      step: 'Combination Complete',
      content: `Kept ${combined.workflows.length} workflow(s) separate with ${totalNodes} total nodes, ${combined.dataModels.length} data models, ${combined.forms.length} forms, ${combined.pages.length} pages, ${combined.rules.length} rules`
    });

    return combined;
  }

  /**
   * Phase 4: Finalize workflows with all components
   * Now handles multiple workflows - returns object with workflows array
   */
  async finalizeWorkflow(combined, routing) {
    const validator = new WorkflowValidator();
    const fixer = new WorkflowFixer();
    const finalizedWorkflows = [];

    // Get workflows array (or create default if empty)
    let workflows = combined.workflows || [];
    if (workflows.length === 0) {
      workflows = [{
        id: `workflow_${Date.now()}`,
        name: 'Generated Workflow',
        nodes: [],
        connections: []
      }];
    }

    console.log(`[MoE] Finalizing ${workflows.length} workflow(s)...`);

    // Process each workflow individually
    for (let i = 0; i < workflows.length; i++) {
      let workflow = workflows[i];
      console.log(`[MoE] Processing workflow ${i + 1}/${workflows.length}: ${workflow.name || workflow.id}`);

      // Normalize workflow structure (convert edges to connections if needed)
      workflow = this.normalizeWorkflowStructure(workflow);

      // Embed shared components into each workflow
      workflow.dataModels = combined.dataModels;
      workflow.forms = combined.forms;
      workflow.mobileUI = combined.mobileUI;
      workflow.pages = combined.pages;
      workflow.rules = combined.rules;

      // Add MoE metadata
      workflow.generatedBy = 'MoE';
      workflow.routing = routing;
      workflow.expertsUsed = {
        workflow: routing.routing.workflowExperts,
        dataModel: routing.routing.dataModelExperts,
        forms: routing.routing.formExperts,
        mobile: routing.routing.mobileExperts,
        pages: combined.pages.length > 0 ? ['PageExpert'] : [],
        rules: combined.rules.length > 0 ? ['RulesExpert'] : []
      };
      workflow.combineStrategy = routing.combineStrategy;
      workflow.confidence = routing.confidence;

      // VALIDATE AND AUTO-FIX WORKFLOW STRUCTURE
      console.log(`[MoE] Validating workflow ${workflow.name || workflow.id}...`);
      const maxIterations = 3;
      let iteration = 0;
      let validationResult = validator.validate(workflow);
      const allFixes = [];

      // Iterative validation and fix loop
      while (!validationResult.valid && iteration < maxIterations) {
        iteration++;
        console.log(`[MoE] Validation iteration ${iteration}/${maxIterations}`);
        console.error('[MoE] Workflow validation FAILED:');
        validationResult.errors.forEach(err => console.error(`  - ERROR: ${err}`));

        // Attempt to fix errors
        const fixResult = fixer.fix(workflow, validationResult);

        if (!fixResult.fixed || fixResult.changes.length === 0) {
          console.error('[MoE] Unable to automatically fix errors');
          break;
        }

        // Apply fixes
        workflow = fixResult.workflow;
        allFixes.push(...fixResult.changes);

        console.log('[MoE] Applied fixes:');
        fixResult.changes.forEach(change => console.log(`  - ${change}`));

        // Re-validate
        validationResult = validator.validate(workflow);
      }

      // Log final validation results
      if (!validationResult.valid) {
        console.error(`[MoE] Workflow ${workflow.name || workflow.id} validation FAILED after auto-fix attempts`);
        workflow.validationErrors = validationResult.errors;
        workflow.validationWarnings = validationResult.warnings;
        workflow.autoFixesApplied = allFixes;
        workflow.hasValidationErrors = true;
      } else {
        if (allFixes.length > 0) {
          console.log(`[MoE] Workflow ${workflow.name || workflow.id} validation PASSED with ${allFixes.length} auto-fix(es)`);
          workflow.autoFixesApplied = allFixes;
        } else {
          console.log(`[MoE] Workflow ${workflow.name || workflow.id} validation PASSED`);
        }
      }

      if (validationResult.warnings && validationResult.warnings.length > 0) {
        workflow.validationWarnings = validationResult.warnings;
      }

      finalizedWorkflows.push(workflow);
    }

    // COMPREHENSIVE APPLICATION VALIDATION AND AUTO-FIX (across all workflows)
    console.log('[MoE] Running comprehensive application validation and auto-fix...');
    const appValidator = new ApplicationValidator();

    const applicationPackage = {
      workflows: finalizedWorkflows.filter(wf => wf.nodes && wf.nodes.length > 0),
      forms: combined.forms || [],
      pages: combined.pages || [],
      dataModels: combined.dataModels || []
    };

    // Use validateAndFix to both fix issues and validate
    const { validationReport: appValidationReport, fixes, totalFixesApplied } = await appValidator.validateAndFix(applicationPackage);

    if (totalFixesApplied > 0) {
      console.log(`[MoE] ApplicationValidator auto-fixed ${totalFixesApplied} issues before validation`);
    }

    // Log validation results
    if (appValidationReport.valid) {
      console.log('[MoE] Application validation PASSED');
      if (appValidationReport.summary.warnings > 0) {
        console.warn(`[MoE]   Warnings: ${appValidationReport.summary.warnings}`);
      }
    } else {
      console.error('[MoE] Application validation FAILED');
      console.error(`[MoE]   Critical Issues: ${appValidationReport.summary.criticalIssues}`);

      // Log critical issues
      if (appValidationReport.components?.workflows?.issues?.length > 0) {
        appValidationReport.components.workflows.issues
          .filter(i => i.severity === 'critical')
          .forEach(issue => console.error(`  - ${issue.message}`));
      }
    }

    // Attach validation report to each workflow
    finalizedWorkflows.forEach(workflow => {
      workflow.applicationValidation = {
        valid: appValidationReport.valid,
        summary: appValidationReport.summary,
        timestamp: appValidationReport.timestamp,
        hasIssues: !appValidationReport.valid,
        criticalIssues: appValidationReport.summary.criticalIssues,
        warnings: appValidationReport.summary.warnings,
        recommendations: appValidationReport.recommendations
      };

      if (!appValidationReport.valid || appValidationReport.summary.warnings > 0) {
        workflow.applicationValidationDetails = appValidationReport;
      }
    });

    // Return object with workflows array (for multiple workflow support)
    // Also include a primary workflow for backward compatibility
    return {
      workflows: finalizedWorkflows,
      // Primary workflow for backward compatibility (first workflow)
      ...finalizedWorkflows[0],
      // Override with workflows array
      _isMultiWorkflow: finalizedWorkflows.length > 1,
      _workflowCount: finalizedWorkflows.length
    };
  }

  /**
   * Normalize workflow structure to ensure compatibility with validator
   * Converts edges to connections and ensures proper node structure
   */
  normalizeWorkflowStructure(workflow) {
    if (!workflow) return workflow;

    console.log(`[MoE] Normalizing workflow structure for: ${workflow.name || workflow.id}`);

    // Convert edges to connections if edges exist but connections don't
    if (workflow.edges && Array.isArray(workflow.edges) && (!workflow.connections || !Array.isArray(workflow.connections))) {
      console.log(`[MoE] Converting ${workflow.edges.length} edges to connections`);
      workflow.connections = workflow.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label || '',
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null
      }));
    }

    // Ensure connections array exists
    if (!workflow.connections) {
      workflow.connections = [];
    }

    // Ensure nodes array exists
    if (!workflow.nodes) {
      workflow.nodes = [];
    }

    // Normalize node structure
    workflow.nodes = workflow.nodes.map(node => {
      // Normalize node types to expected format
      if (node.type === 'start' || node.type === 'startEvent') {
        node.type = 'startProcess';
      }
      if (node.type === 'end' || node.type === 'endEvent') {
        node.type = 'endProcess';
      }

      // Ensure node has required properties
      if (!node.data) {
        node.data = {
          label: node.name || node.label || node.id || 'Unnamed Node',
          description: node.description || ''
        };
      }

      // Ensure data.label exists
      if (!node.data.label) {
        node.data.label = node.label || node.name || node.id || 'Unnamed Node';
      }

      // Ensure node has position
      if (!node.position) {
        node.position = { x: 0, y: 0 };
      }

      return node;
    });

    // Check for start node - add one if missing
    const hasStartNode = workflow.nodes.some(n =>
      n.type === 'startProcess' || n.type === 'startEvent' || n.type === 'start'
    );

    if (!hasStartNode && workflow.nodes.length > 0) {
      console.log('[MoE] Adding missing start node');
      const startNodeId = `start-${Date.now()}`;
      const firstNode = workflow.nodes[0];

      workflow.nodes.unshift({
        id: startNodeId,
        type: 'startProcess',
        position: { x: (firstNode.position?.x || 0) - 150, y: firstNode.position?.y || 0 },
        data: { label: 'Start', description: 'Process start' }
      });

      // Connect start to first node
      workflow.connections.unshift({
        id: `conn-start-${Date.now()}`,
        source: startNodeId,
        target: firstNode.id,
        label: ''
      });
    }

    // Check for end node - add one if missing
    const hasEndNode = workflow.nodes.some(n =>
      n.type === 'endProcess' || n.type === 'endEvent' || n.type === 'end'
    );

    if (!hasEndNode && workflow.nodes.length > 0) {
      console.log('[MoE] Adding missing end node');
      const endNodeId = `end-${Date.now()}`;
      const lastNode = workflow.nodes[workflow.nodes.length - 1];

      // Find nodes that don't have outgoing connections (terminal nodes)
      const nodesWithOutgoing = new Set(workflow.connections.map(c => c.source));
      const terminalNodes = workflow.nodes.filter(n =>
        n.type !== 'startProcess' && n.type !== 'startEvent' && n.type !== 'start' &&
        !nodesWithOutgoing.has(n.id)
      );

      workflow.nodes.push({
        id: endNodeId,
        type: 'endProcess',
        position: { x: (lastNode.position?.x || 0) + 150, y: lastNode.position?.y || 0 },
        data: { label: 'End', description: 'Process end' }
      });

      // Connect terminal nodes to end
      if (terminalNodes.length > 0) {
        terminalNodes.forEach(node => {
          workflow.connections.push({
            id: `conn-end-${Date.now()}-${node.id}`,
            source: node.id,
            target: endNodeId,
            label: ''
          });
        });
      } else {
        // Just connect the last non-end node to end
        workflow.connections.push({
          id: `conn-end-${Date.now()}`,
          source: lastNode.id,
          target: endNodeId,
          label: ''
        });
      }
    }

    // Fix decision nodes without default paths
    const decisionNodes = workflow.nodes.filter(n =>
      n.type === 'decision' || n.type === 'exclusiveGateway' || n.type === 'exclusive'
    );

    decisionNodes.forEach(decisionNode => {
      // Find all connections from this decision node
      const outgoingConnections = workflow.connections.filter(c => c.source === decisionNode.id);

      if (outgoingConnections.length > 0) {
        // Check if any connection has isDefault: true
        const hasDefault = outgoingConnections.some(c => c.isDefault === true);

        if (!hasDefault) {
          // Mark the last connection as default (typically the "else" path)
          const lastConnection = outgoingConnections[outgoingConnections.length - 1];
          lastConnection.isDefault = true;
          console.log(`[MoE] Added default path to decision node ${decisionNode.id}: connection ${lastConnection.id}`);
        }
      }
    });

    console.log(`[MoE] Normalized workflow: ${workflow.nodes.length} nodes, ${workflow.connections.length} connections`);

    return workflow;
  }

  /**
   * Get default design system based on procurement form styling
   * Used as fallback when DesignExpert fails or generates invalid output
   */
  getDefaultDesignSystem() {
    return {
      source: 'default',
      colors: {
        primary: '#1f2937',
        secondary: '#3b82f6',
        background: '#f8f9fa',
        cardBackground: '#ffffff',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: '#d1d5db',
        focus: '#3b82f6',
        error: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b'
      },
      typography: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: {
          base: '14px',
          h1: '24px',
          h2: '20px',
          label: '14px',
          input: '14px'
        },
        fontWeight: {
          title: 600,
          label: 500,
          input: 400
        }
      },
      spacing: {
        container: '24px',
        fieldGap: '16px',
        sectionGap: '32px',
        inputPadding: '10px 12px'
      },
      components: {
        input: {
          borderRadius: '6px',
          borderWidth: '1px',
          height: '42px',
          focusStyle: '2px solid #3b82f6, 0 0 0 3px rgba(59, 130, 246, 0.1)'
        },
        button: {
          primary: {
            background: '#1f2937',
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: '6px'
          },
          secondary: {
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            padding: '10px 24px',
            borderRadius: '6px'
          }
        },
        card: {
          background: '#ffffff',
          borderRadius: '8px',
          shadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: '24px'
        }
      },
      layout: {
        maxWidth: '800px',
        columns: {
          desktop: 2,
          mobile: 1
        }
      }
    };
  }

  /**
   * Link forms to user task nodes and start process nodes
   * @param {Object} workflow - The workflow to link forms to
   * @param {Array} forms - Available forms to link
   * @param {Function} emitThinking - Callback to emit thinking events
   * @param {Set} usedFormIds - Set of form IDs already used (to prevent reuse across workflows)
   * @param {number} globalFormIndex - Current position in the forms array
   * @returns {number} Updated globalFormIndex after linking
   */
  linkFormsToUserTasks(workflow, forms, emitThinking, usedFormIds = new Set(), globalFormIndex = 0) {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      console.log('[MoE] No workflow nodes to link forms to');
      return globalFormIndex;
    }
    if (!forms || forms.length === 0) {
      console.log('[MoE] No forms available to link');
      return globalFormIndex;
    }

    console.log(`[MoE] Starting form linking for workflow "${workflow.name || workflow.id}": ${forms.length} forms, ${workflow.nodes.length} nodes, globalFormIndex=${globalFormIndex}`);
    let linkedCount = 0;

    // Get available forms (excluding already used ones)
    const availableForms = forms.filter(form => !usedFormIds.has(form.id));
    console.log(`[MoE] Available forms (not yet used): ${availableForms.length}`);

    // Iterate through all user task and start process nodes
    workflow.nodes.forEach((node, nodeIndex) => {
      if (node.type === 'userTask' || node.type === 'startProcess') {
        // Check if node already has a formId or formName
        if (node.data && (node.data.formId || node.data.formName)) {
          console.log(`[MoE] Node ${node.id} already has form linked: ${node.data.formName || node.data.formId}`);
          return; // Already linked
        }

        // Strategy 1: Find matching form by nodeId (from available forms only)
        let matchingForm = availableForms.find(form => form.nodeId === node.id && !usedFormIds.has(form.id));

        // Strategy 2: If no match, use next available form by global index
        if (!matchingForm && globalFormIndex < forms.length) {
          // Find next unused form starting from globalFormIndex
          while (globalFormIndex < forms.length && usedFormIds.has(forms[globalFormIndex].id)) {
            globalFormIndex++;
          }
          if (globalFormIndex < forms.length) {
            matchingForm = forms[globalFormIndex];
            globalFormIndex++;
            console.log(`[MoE] Using form index match: form ${matchingForm.id} for node ${node.id} (globalFormIndex now ${globalFormIndex})`);
          }
        }

        // Strategy 3: If still no match, try to match by similar name (from available forms only)
        if (!matchingForm) {
          const nodeLabel = (node.data?.label || '').toLowerCase();
          matchingForm = availableForms.find(form => {
            if (usedFormIds.has(form.id)) return false;
            const formName = (form.name || form.title || '').toLowerCase();
            return nodeLabel.includes(formName) || formName.includes(nodeLabel);
          });
          if (matchingForm) {
            console.log(`[MoE] Using name similarity match: form "${matchingForm.name}" for node "${node.data?.label}"`);
          }
        }

        // NO Strategy 4 fallback - we don't want to reuse forms across workflows
        // If no form is found, leave the node without a form
        // The node will get a form generated later via ApplicationService.addWorkflow

        if (matchingForm) {
          // Link the form to the node
          if (!node.data) {
            node.data = {};
          }
          node.data.formId = matchingForm.id;
          node.data.formName = matchingForm.name;
          usedFormIds.add(matchingForm.id);
          linkedCount++;
          console.log(`[MoE] ✓ Linked form "${matchingForm.name}" (${matchingForm.id}) to ${node.type} "${node.data.label || node.id}"`);
        } else {
          console.log(`[MoE] ✗ No unused form available for ${node.type} "${node.data?.label || node.id}" - will be generated later`);
        }
      }
    });

    console.log(`[MoE] Form linking complete for workflow "${workflow.name || workflow.id}": ${linkedCount} forms linked, globalFormIndex now ${globalFormIndex}`);

    if (linkedCount > 0 && emitThinking) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Form Linking',
        content: `Linked ${linkedCount} form(s) to workflow "${workflow.name || workflow.id}"`
      });
    }

    return globalFormIndex;
  }

  /**
   * Generate summary of MoE generation
   * Now supports multiple workflows
   */
  generateSummary(workflow, routing) {
    // Handle multiple workflows
    const workflows = workflow.workflows || [workflow];
    const workflowCount = workflows.length;

    // Calculate totals across all workflows
    const totalNodes = workflows.reduce((sum, wf) => sum + (wf.nodes?.length || 0), 0);
    const totalConnections = workflows.reduce((sum, wf) => sum + (wf.connections?.length || 0), 0);
    const dataModelsCount = workflow.dataModels?.length || 0;
    const formsCount = workflow.forms?.length || 0;
    const mobileScreensCount = workflow.mobileUI?.screens?.length || 0;
    const pagesCount = workflow.pages?.length || 0;
    const rulesCount = workflow.rules?.length || 0;
    const autoFixesCount = workflows.reduce((sum, wf) => sum + (wf.autoFixesApplied?.length || 0), 0);

    // Create a user-friendly description
    const workflowLabel = workflowCount > 1 ? `${workflowCount} workflows` : 'workflow';
    let description = `Successfully generated ${workflowLabel} with ${totalNodes} total nodes and ${totalConnections} connections using the Mixture of Experts system.

**Experts Used:** ${routing.routing.workflowExperts.join(', ')}
**Domain:** ${routing.domain}
**Confidence:** ${(routing.confidence * 100).toFixed(0)}%

**Generated Components:**
- ${workflowCount} workflow(s) with ${totalNodes} nodes total
- ${totalConnections} connections
- ${dataModelsCount} data models
- ${formsCount} forms
- ${mobileScreensCount} mobile screens
- ${pagesCount} pages
- ${rulesCount} business rules`;

    // List individual workflows if multiple
    if (workflowCount > 1) {
      description += `

**Workflows:**`;
      workflows.forEach((wf, i) => {
        description += `
- ${wf.name || `Workflow ${i + 1}`}: ${wf.nodes?.length || 0} nodes`;
      });
    }

    // Add auto-fix information if fixes were applied
    if (autoFixesCount > 0) {
      description += `

**Auto-Fixes Applied:** ${autoFixesCount}`;
    }

    description += `

The workflows have been validated and saved with all artifacts.`;

    return {
      title: workflowCount > 1 ? "Multiple Workflows Generated Successfully" : "Workflow Generated Successfully",
      description: description,
      message: `Generated ${workflowCount} workflow(s) with ${totalNodes} total nodes using Mixture of Experts${autoFixesCount > 0 ? ` (${autoFixesCount} auto-fixes applied)` : ''}`,
      workflowCount: workflowCount,
      nodeCount: totalNodes,
      connectionCount: totalConnections,
      complexity: routing.complexity.workflow,
      domain: routing.domain,
      expertsUsed: routing.routing.workflowExperts.join(', '),
      combineStrategy: routing.combineStrategy,
      confidence: routing.confidence,
      autoFixesCount: autoFixesCount,
      components: `${workflowCount} workflows, ${totalNodes} nodes, ${totalConnections} connections, ${dataModelsCount} data models, ${formsCount} forms, ${mobileScreensCount} mobile screens, ${pagesCount} pages, ${rulesCount} rules`
    };
  }

  /**
   * Helper: Get expert instance by category and name
   */
  getExpert(category, expertName) {
    // Convert expert name to key format
    // e.g., "SimpleWorkflowExpert" -> "simple"
    // e.g., "ApprovalWorkflowExpert" -> "approval"
    // e.g., "AdvancedFormExpert" -> "advanced"
    // e.g., "CrossPlatformExpert" -> "crossPlatform"
    // e.g., "SQLExpert" -> "sql"
    // e.g., "NoSQLExpert" -> "nosql"

    let key = expertName
      .replace(/Expert$/, ''); // Remove "Expert" suffix

    // Remove category-specific suffixes
    if (category === 'workflow') {
      key = key.replace(/Workflow$/, '');
    } else if (category === 'forms') {
      key = key.replace(/Form$/, '');
    }

    // Handle special cases for acronyms (SQL, NoSQL, iOS, etc.)
    // If the key is all uppercase or starts with uppercase acronym, convert to lowercase
    if (key === key.toUpperCase()) {
      // All uppercase (e.g., "SQL") -> lowercase (e.g., "sql")
      key = key.toLowerCase();
    } else if (key.startsWith('NoSQL')) {
      // "NoSQL" -> "nosql"
      key = 'nosql';
    } else if (key.startsWith('iOS')) {
      // "iOS" -> "ios"
      key = 'ios';
    } else {
      // Standard camelCase conversion (first letter lowercase)
      key = key.charAt(0).toLowerCase() + key.slice(1);
    }

    const expert = this.experts[category]?.[key];

    if (!expert) {
      console.warn(`Expert not found: ${category}.${key} (${expertName})`);
    }

    return expert;
  }

  /**
   * AI-powered mobile component regeneration
   * Called when mobile expert fails, uses AI to regenerate the component
   */
  async regenerateMobileWithAI(expertName, sharedContext, emitThinking) {
    console.log(`[MoE] Attempting AI regeneration for mobile component: ${expertName}`);

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const platform = expertName.includes('ios') ? 'iOS' :
                    expertName.includes('android') ? 'Android' : 'Cross-Platform';

    const regenerationPrompt = `Generate mobile UI screens for ${platform} for the following requirements.

REQUIREMENTS: ${sharedContext.userRequirements}

Generate a simple, valid JSON response with mobile screens. Keep it minimal but functional.

IMPORTANT:
- Return ONLY valid JSON
- Ensure all commas, brackets, and braces are correct
- Keep the response under 2000 tokens

Return JSON in this exact format:
{
  "screens": [
    {
      "id": "screen_1",
      "name": "MainScreen",
      "type": "list",
      "platform": "${platform.toLowerCase().replace('-', '')}",
      "components": [
        {
          "type": "SafeAreaView",
          "children": [
            {
              "type": "ScrollView",
              "children": [
                { "type": "Text", "props": { "children": "Screen Content" } }
              ]
            }
          ]
        }
      ]
    }
  ],
  "navigation": {
    "type": "stack",
    "screens": ["MainScreen"]
  }
}`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001', // Fast model for recovery
        max_tokens: 2000,
        messages: [{ role: 'user', content: regenerationPrompt }],
        system: 'You are a mobile UI generation expert. Generate valid, minimal JSON for mobile screens. Never add explanations.'
      });

      const responseText = response.content[0].text;

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const mobileUI = JSON.parse(jsonMatch[0]);
        console.log(`[MoE] AI regeneration successful for ${expertName}`);
        mobileUI.regeneratedByAI = true;
        return mobileUI;
      }

      throw new Error('No valid JSON in AI response');
    } catch (error) {
      console.error(`[MoE] AI regeneration failed for ${expertName}:`, error.message);
      return null;
    }
  }

  /**
   * Generate forms for the application
   */
  async generateForms(requirements) {
    console.log('[MoE] Generating forms based on requirements...');

    // For now, return empty array - this will be implemented later
    // when the full application generation flow is needed
    return [];
  }

  /**
   * Generate data models for the application
   */
  async generateDataModels(requirements) {
    console.log('[MoE] Generating data models based on requirements...');

    // For now, return empty array - this will be implemented later
    return [];
  }

  /**
   * Generate pages for the application
   */
  async generatePages(requirements) {
    console.log('[MoE] Generating pages based on requirements...');

    // For now, return empty array - this will be implemented later
    return [];
  }

  /**
   * Generate mobile UI for the application
   */
  async generateMobileUI(requirements) {
    console.log('[MoE] Generating mobile UI based on requirements...');

    // For now, return null - this will be implemented later
    return null;
  }
}

module.exports = MoEOrchestrator;
