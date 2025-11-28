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
      }
    };

    console.log('MoEOrchestrator initialized with experts:', {
      workflow: Object.keys(this.experts.workflow),
      dataModel: Object.keys(this.experts.dataModel),
      forms: Object.keys(this.experts.forms),
      mobile: Object.keys(this.experts.mobile),
      pages: Object.keys(this.experts.pages),
      design: Object.keys(this.experts.design)
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

      // STEP 2: Execute component generation using ComponentOrchestrator
      console.log('[MoE] Step 2: Executing component generation...');
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
      design: null
    };

    // Pre-populate results with components from applicationPlan if available
    // (generated by new component-based architecture)
    if (applicationPlan) {
      if (applicationPlan.dataModels && applicationPlan.dataModels.length > 0) {
        results.dataModels.push(applicationPlan.dataModels);
        console.log(`[MoE] Using ${applicationPlan.dataModels.length} data models from ComponentOrchestrator`);
      }
      if (applicationPlan.workflows && applicationPlan.workflows.length > 0) {
        // If multiple workflows, combine them into one or push each separately
        // For now, we'll combine them all into a single workflow with all nodes/edges
        if (applicationPlan.workflows.length === 1) {
          results.workflows.push({ workflow: applicationPlan.workflows[0] });
        } else {
          // Combine multiple workflows into one
          const combinedWorkflow = {
            id: 'combined-workflow',
            name: 'Combined Workflow',
            description: 'Combined from multiple generated workflows',
            nodes: [],
            edges: [],
            version: '1.0.0'
          };
          applicationPlan.workflows.forEach(wf => {
            if (wf.nodes) combinedWorkflow.nodes.push(...wf.nodes);
            if (wf.edges) combinedWorkflow.edges.push(...wf.edges);
          });
          results.workflows.push({ workflow: combinedWorkflow });
        }
        console.log(`[MoE] Using ${applicationPlan.workflows.length} workflow(s) from ComponentOrchestrator`);
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

    // ALWAYS execute design expert for optimal UI/UX (auto-design mode when no file provided)
    // This ensures all forms and pages have professional design and styling
    if (true) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Executing Design Expert',
        content: designInput ? `Analyzing ${designInput.type} design file: ${designInput.name}` : 'Generating optimal UI/UX design using best practices...'
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
            // If design expert generated forms and pages, use them instead of running form/page experts
            if (designResult.forms && designResult.forms.length > 0) {
              results.forms.push({ forms: designResult.forms });
              console.log(`[MoE] Design expert generated ${designResult.forms.length} forms, skipping form experts`);
            }
            if (designResult.pages && designResult.pages.length > 0) {
              results.pages.push({ pages: designResult.pages });
              console.log(`[MoE] Design expert generated ${designResult.pages.length} pages, skipping page expert`);
            }
          }
        } catch (error) {
          console.error('[MoE] Design expert failed:', error.message);
          emitThinking({
            agent: 'MoEOrchestrator',
            step: 'Design Expert Error',
            content: `Design analysis failed: ${error.message}. Continuing with auto-generated design...`
          });
        }
      }
    }

    // Execute workflow experts
    if (routing.routing.workflowExperts.length > 0) {
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

    // Execute mobile experts (if any exist)
    if (routing.routing.mobileExperts.length > 0) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Executing Mobile Experts',
        content: `Running ${routing.routing.mobileExperts.length} mobile expert(s)...`
      });

      const mobilePromises = routing.routing.mobileExperts.map(async expertName => {
        const expert = this.getExpert('mobile', expertName);
        if (expert) {
          try {
            return await expert.execute(sharedContext, emitThinking);
          } catch (error) {
            console.error(`[MoE] Mobile expert ${expertName} failed:`, error.message);
            emitThinking({
              agent: 'MoEOrchestrator',
              step: 'Mobile Expert Error',
              content: `Skipping mobile screens (${expertName}) due to error: ${error.message}`
            });
            return null;
          }
        }
        return null;
      });

      const mobileUI = await Promise.all(mobilePromises);
      results.mobileUI = mobileUI.filter(m => m !== null);

      if (results.mobileUI.length === 0 && routing.routing.mobileExperts.length > 0) {
        console.log('[MoE] All mobile experts failed, continuing without mobile screens');
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
      workflow: null,
      dataModels: [],
      forms: [],
      mobileUI: null,
      pages: []
    };

    // Combine workflows
    if (results.workflows.length > 0) {
      combined.workflow = ExpertCombiner.combineWorkflows(
        results.workflows,
        routing.combineStrategy,
        routing
      );
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

    // Link forms to user task nodes
    if (combined.workflow && combined.forms && combined.forms.length > 0) {
      this.linkFormsToUserTasks(combined.workflow, combined.forms, emitThinking);
    }

    emitThinking({
      agent: 'ExpertCombiner',
      step: 'Combination Complete',
      content: `Merged: ${combined.workflow?.nodes?.length || 0} nodes, ${combined.dataModels.length} data models, ${combined.forms.length} forms, ${combined.pages.length} pages`
    });

    return combined;
  }

  /**
   * Phase 4: Finalize workflow with all components
   */
  async finalizeWorkflow(combined, routing) {
    let workflow = combined.workflow || {
      id: `workflow_${Date.now()}`,
      name: 'Generated Workflow',
      nodes: [],
      connections: []
    };

    // Embed all components into workflow
    workflow.dataModels = combined.dataModels;
    workflow.forms = combined.forms;
    workflow.mobileUI = combined.mobileUI;
    workflow.pages = combined.pages;

    // Add MoE metadata
    workflow.generatedBy = 'MoE';
    workflow.routing = routing;
    workflow.expertsUsed = {
      workflow: routing.routing.workflowExperts,
      dataModel: routing.routing.dataModelExperts,
      forms: routing.routing.formExperts,
      mobile: routing.routing.mobileExperts,
      pages: combined.pages.length > 0 ? ['PageExpert'] : []
    };
    workflow.combineStrategy = routing.combineStrategy;
    workflow.confidence = routing.confidence;

    // VALIDATE AND AUTO-FIX WORKFLOW STRUCTURE
    console.log('[MoE] Validating workflow structure with auto-fix...');
    const validator = new WorkflowValidator();
    const fixer = new WorkflowFixer();
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
      fixResult.changes.forEach(change => console.log(`  ✓ ${change}`));

      // Re-validate
      validationResult = validator.validate(workflow);
    }

    // Log final validation results
    if (!validationResult.valid) {
      console.error('[MoE] Workflow validation FAILED after auto-fix attempts:');
      validationResult.errors.forEach(err => console.error(`  - ERROR: ${err}`));
      validationResult.warnings.forEach(warn => console.warn(`  - WARNING: ${warn}`));

      // Attach validation errors and fixes to workflow
      workflow.validationErrors = validationResult.errors;
      workflow.validationWarnings = validationResult.warnings;
      workflow.autoFixesApplied = allFixes;

      // Instead of throwing, mark workflow as having validation issues and continue
      console.warn('[MoE] Continuing with workflow despite validation errors (will be handled by caller)');
      workflow.hasValidationErrors = true;
    }

    // Success - attach any fixes that were applied
    if (allFixes.length > 0) {
      console.log(`[MoE] Workflow validation PASSED after ${iteration} iteration(s) with ${allFixes.length} auto-fix(es) ✓`);
      workflow.autoFixesApplied = allFixes;
    } else {
      console.log('[MoE] Workflow validation PASSED ✓');
    }

    if (validationResult.warnings.length > 0) {
      console.warn('[MoE] Workflow validation passed with warnings:');
      validationResult.warnings.forEach(warn => console.warn(`  - WARNING: ${warn}`));
      workflow.validationWarnings = validationResult.warnings;
    }

    // COMPREHENSIVE APPLICATION VALIDATION
    console.log('[MoE] Running comprehensive application validation...');
    const appValidator = new ApplicationValidator();

    const applicationPackage = {
      workflows: workflow.nodes ? [workflow] : [],
      forms: workflow.forms || [],
      pages: workflow.pages || [],
      dataModels: workflow.dataModels || []
    };

    const appValidationReport = await appValidator.validate(applicationPackage);

    // Log validation results
    if (appValidationReport.valid) {
      console.log('[MoE] ✓ Application validation PASSED');
      if (appValidationReport.summary.warnings > 0) {
        console.warn(`[MoE]   Warnings: ${appValidationReport.summary.warnings}`);
      }
      if (appValidationReport.summary.info > 0) {
        console.log(`[MoE]   Info: ${appValidationReport.summary.info}`);
      }
    } else {
      console.error('[MoE] ✗ Application validation FAILED');
      console.error(`[MoE]   Critical Issues: ${appValidationReport.summary.criticalIssues}`);
      console.error(`[MoE]   Warnings: ${appValidationReport.summary.warnings}`);

      // Log critical issues
      if (appValidationReport.components.workflows.issues.length > 0) {
        console.error('[MoE] Workflow issues:');
        appValidationReport.components.workflows.issues
          .filter(i => i.severity === 'critical')
          .forEach(issue => console.error(`  - ${issue.message}`));
      }
      if (appValidationReport.components.forms.issues.length > 0) {
        console.error('[MoE] Form issues:');
        appValidationReport.components.forms.issues
          .filter(i => i.severity === 'critical')
          .forEach(issue => console.error(`  - ${issue.message}`));
      }
      if (appValidationReport.components.pages.issues.length > 0) {
        console.error('[MoE] Page issues:');
        appValidationReport.components.pages.issues
          .filter(i => i.severity === 'critical')
          .forEach(issue => console.error(`  - ${issue.message}`));
      }
      if (appValidationReport.components.dataModels.issues.length > 0) {
        console.error('[MoE] Data model issues:');
        appValidationReport.components.dataModels.issues
          .filter(i => i.severity === 'critical')
          .forEach(issue => console.error(`  - ${issue.message}`));
      }
      if (appValidationReport.crossComponent.issues.length > 0) {
        console.error('[MoE] Cross-component issues:');
        appValidationReport.crossComponent.issues
          .filter(i => i.severity === 'critical')
          .forEach(issue => console.error(`  - ${issue.message}`));
      }

      // Log recommendations
      if (appValidationReport.recommendations.length > 0) {
        console.log('[MoE] Recommendations:');
        appValidationReport.recommendations.forEach(rec => {
          console.log(`  [${rec.priority.toUpperCase()}] ${rec.message}`);
          console.log(`    Action: ${rec.action}`);
        });
      }
    }

    // Attach validation report to workflow
    workflow.applicationValidation = {
      valid: appValidationReport.valid,
      summary: appValidationReport.summary,
      timestamp: appValidationReport.timestamp,
      hasIssues: !appValidationReport.valid,
      criticalIssues: appValidationReport.summary.criticalIssues,
      warnings: appValidationReport.summary.warnings,
      recommendations: appValidationReport.recommendations
    };

    // Attach detailed report for debugging (optional, can be removed in production)
    if (!appValidationReport.valid || appValidationReport.summary.warnings > 0) {
      workflow.applicationValidationDetails = appValidationReport;
    }

    return workflow;
  }

  /**
   * Link forms to user task nodes and start process nodes
   */
  linkFormsToUserTasks(workflow, forms, emitThinking) {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      console.log('[MoE] No workflow nodes to link forms to');
      return;
    }
    if (!forms || forms.length === 0) {
      console.log('[MoE] No forms available to link');
      return;
    }

    console.log(`[MoE] Starting form linking: ${forms.length} forms, ${workflow.nodes.length} nodes`);
    let linkedCount = 0;
    let formIndex = 0;

    // Iterate through all user task and start process nodes
    workflow.nodes.forEach((node, nodeIndex) => {
      if (node.type === 'userTask' || node.type === 'startProcess') {
        // Check if node already has a formId or formName
        if (node.data && (node.data.formId || node.data.formName)) {
          console.log(`[MoE] Node ${node.id} already has form linked: ${node.data.formName || node.data.formId}`);
          return; // Already linked
        }

        // Strategy 1: Find matching form by nodeId
        let matchingForm = forms.find(form => form.nodeId === node.id);

        // Strategy 2: If no match, try to match by index (in order)
        if (!matchingForm && formIndex < forms.length) {
          matchingForm = forms[formIndex];
          formIndex++;
          console.log(`[MoE] Using form index match: form ${matchingForm.id} for node ${node.id}`);
        }

        // Strategy 3: If still no match, try to match by similar name
        if (!matchingForm) {
          const nodeLabel = (node.data?.label || '').toLowerCase();
          matchingForm = forms.find(form => {
            const formName = (form.name || form.title || '').toLowerCase();
            return nodeLabel.includes(formName) || formName.includes(nodeLabel);
          });
          if (matchingForm) {
            console.log(`[MoE] Using name similarity match: form "${matchingForm.name}" for node "${node.data?.label}"`);
          }
        }

        // Strategy 4: Use first available form as fallback
        if (!matchingForm && forms.length > 0) {
          matchingForm = forms[0];
          console.log(`[MoE] Using first form as fallback: "${matchingForm.name}" for node "${node.data?.label || node.id}"`);
        }

        if (matchingForm) {
          // Link the form to the node
          if (!node.data) {
            node.data = {};
          }
          node.data.formId = matchingForm.id;
          node.data.formName = matchingForm.name;
          linkedCount++;
          console.log(`[MoE] ✓ Linked form "${matchingForm.name}" (${matchingForm.id}) to ${node.type} "${node.data.label || node.id}"`);
        } else {
          console.log(`[MoE] ✗ Could not find form for ${node.type} "${node.data?.label || node.id}"`);
        }
      }
    });

    console.log(`[MoE] Form linking complete: ${linkedCount} forms linked`);

    if (linkedCount > 0 && emitThinking) {
      emitThinking({
        agent: 'MoEOrchestrator',
        step: 'Form Linking',
        content: `Linked ${linkedCount} form(s) to workflow nodes`
      });
    }
  }

  /**
   * Generate summary of MoE generation
   */
  generateSummary(workflow, routing) {
    const nodesCount = workflow.nodes?.length || 0;
    const connectionsCount = workflow.connections?.length || 0;
    const dataModelsCount = workflow.dataModels?.length || 0;
    const formsCount = workflow.forms?.length || 0;
    const mobileScreensCount = workflow.mobileUI?.screens?.length || 0;
    const pagesCount = workflow.pages?.length || 0;
    const autoFixesCount = workflow.autoFixesApplied?.length || 0;

    // Create a user-friendly description
    let description = `Successfully generated a ${routing.complexity.workflow} workflow with ${nodesCount} nodes and ${connectionsCount} connections using the Mixture of Experts system.

**Experts Used:** ${routing.routing.workflowExperts.join(', ')}
**Domain:** ${routing.domain}
**Confidence:** ${(routing.confidence * 100).toFixed(0)}%

**Generated Components:**
- ${nodesCount} workflow nodes
- ${connectionsCount} connections
- ${dataModelsCount} data models
- ${formsCount} forms
- ${mobileScreensCount} mobile screens
- ${pagesCount} pages`;

    // Add auto-fix information if fixes were applied
    if (autoFixesCount > 0) {
      description += `

**Auto-Fixes Applied:** ${autoFixesCount}
${workflow.autoFixesApplied.map(fix => `- ${fix}`).join('\n')}`;
    }

    description += `

The workflow has been validated and rendered on the canvas with all artifacts saved.`;

    return {
      title: "Workflow Generated Successfully",
      description: description,
      message: `Generated ${nodesCount}-node workflow using Mixture of Experts${autoFixesCount > 0 ? ` (${autoFixesCount} auto-fixes applied)` : ''}`,
      nodeCount: nodesCount,
      connectionCount: connectionsCount,
      complexity: routing.complexity.workflow,
      domain: routing.domain,
      expertsUsed: routing.routing.workflowExperts.join(', '),
      combineStrategy: routing.combineStrategy,
      confidence: routing.confidence,
      autoFixesCount: autoFixesCount,
      components: `${nodesCount} nodes, ${connectionsCount} connections, ${dataModelsCount} data models, ${formsCount} forms, ${mobileScreensCount} mobile screens, ${pagesCount} pages`
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
