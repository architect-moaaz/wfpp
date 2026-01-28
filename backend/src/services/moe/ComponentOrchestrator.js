/**
 * Component Orchestrator
 *
 * Smart orchestrator that decides generation strategy based on project complexity.
 * Coordinates sequential or parallel generation of components to avoid JSON truncation.
 */

const fs = require('fs');
const path = require('path');
const DataModelExpert = require('./experts/DataModelExpert');
const WorkflowExpert = require('./experts/WorkflowExpert');
const FormExpert = require('./experts/FormExpert');
const PageExpert = require('./experts/PageExpert');
const RulesExpert = require('./experts/RulesExpert');
const BehaviorExpert = require('./experts/BehaviorExpert');

class ComponentOrchestrator {
  constructor() {
    this.dataModelExpert = new DataModelExpert();
    this.workflowExpert = new WorkflowExpert();
    this.formExpert = new FormExpert();
    this.pageExpert = new PageExpert();
    this.rulesExpert = new RulesExpert();
    this.behaviorExpert = new BehaviorExpert();
    this.checkpointDir = path.join(__dirname, '../../..', 'data', 'checkpoints');
    this.organizationContext = null;
    this.ensureCheckpointDir();
  }

  /**
   * Set organization context for task assignment in generated workflows
   * Passes context to WorkflowExpert for Human Task generation
   * @param {Object} orgContext - Organization details (roles, groups, departments, positions)
   */
  setOrganizationContext(orgContext) {
    this.organizationContext = orgContext;
    // Forward to WorkflowExpert which uses it during workflow generation
    if (this.workflowExpert && this.workflowExpert.setOrganizationContext) {
      this.workflowExpert.setOrganizationContext(orgContext);
      console.log('[ComponentOrchestrator] Organization context forwarded to WorkflowExpert');
    }
  }

  /**
   * Ensure checkpoint directory exists
   */
  ensureCheckpointDir() {
    if (!fs.existsSync(this.checkpointDir)) {
      fs.mkdirSync(this.checkpointDir, { recursive: true });
    }
  }

  /**
   * Get checkpoint file path for an application
   */
  getCheckpointPath(applicationId) {
    return path.join(this.checkpointDir, `${applicationId}.checkpoint.json`);
  }

  /**
   * Save generation checkpoint
   */
  saveCheckpoint(applicationId, results, completedSpecs, componentPlan) {
    const checkpoint = {
      applicationId,
      timestamp: new Date().toISOString(),
      results,
      completedSpecs: completedSpecs.map(s => s.name),
      componentPlanHash: this.hashPlan(componentPlan)
    };
    fs.writeFileSync(this.getCheckpointPath(applicationId), JSON.stringify(checkpoint, null, 2));
    console.log(`[ComponentOrchestrator] Checkpoint saved: ${completedSpecs.length} components completed`);
  }

  /**
   * Load existing checkpoint if valid
   */
  loadCheckpoint(applicationId, componentPlan) {
    const checkpointPath = this.getCheckpointPath(applicationId);
    if (!fs.existsSync(checkpointPath)) return null;

    try {
      const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'));

      // Verify checkpoint is for the same plan
      if (checkpoint.componentPlanHash !== this.hashPlan(componentPlan)) {
        console.log('[ComponentOrchestrator] Checkpoint plan mismatch, starting fresh');
        this.clearCheckpoint(applicationId);
        return null;
      }

      // Check if checkpoint is not too old (1 hour)
      const checkpointAge = Date.now() - new Date(checkpoint.timestamp).getTime();
      if (checkpointAge > 3600000) {
        console.log('[ComponentOrchestrator] Checkpoint expired, starting fresh');
        this.clearCheckpoint(applicationId);
        return null;
      }

      console.log(`[ComponentOrchestrator] Resuming from checkpoint: ${checkpoint.completedSpecs.length} components already done`);
      return checkpoint;
    } catch (error) {
      console.error('[ComponentOrchestrator] Error loading checkpoint:', error);
      return null;
    }
  }

  /**
   * Clear checkpoint after successful completion
   */
  clearCheckpoint(applicationId) {
    const checkpointPath = this.getCheckpointPath(applicationId);
    if (fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
    }
  }

  /**
   * Simple hash for component plan to detect changes
   */
  hashPlan(componentPlan) {
    const key = componentPlan.componentSpecs.map(s => `${s.type}:${s.name}`).sort().join('|');
    return Buffer.from(key).toString('base64').substring(0, 32);
  }

  /**
   * Execute component generation based on the plan
   * Automatically chooses sequential or parallel strategy based on complexity
   */
  async execute(componentPlan, eventEmitter = null) {
    console.log('[ComponentOrchestrator] Starting component generation...');
    console.log('[ComponentOrchestrator] Strategy:', componentPlan.generationStrategy);
    console.log('[ComponentOrchestrator] Complexity:', componentPlan.complexity);

    const results = {
      dataModels: [],
      workflows: [],
      forms: [],
      pages: [],
      rules: []
    };

    try {
      if (componentPlan.generationStrategy === 'parallel') {
        // Simple projects: Generate all components of each type in parallel
        return await this.executeParallel(componentPlan, eventEmitter);
      } else {
        // Complex projects: Generate components sequentially
        return await this.executeSequential(componentPlan, eventEmitter);
      }
    } catch (error) {
      console.error('[ComponentOrchestrator] Generation failed:', error);
      throw error;
    }
  }

  /**
   * Parallel generation strategy for simple projects
   * Generates components in dependency-aware phases:
   * - Phase 1: Data models and workflows (parallel, no dependencies)
   * - Phase 2: Forms (depends on data models)
   * - Phase 3: Pages (depends on forms)
   * - Phase 4: Link forms to workflow nodes based on formAssociation
   */
  async executeParallel(componentPlan, eventEmitter) {
    console.log('[ComponentOrchestrator] Executing PARALLEL strategy with dependency awareness...');

    const results = {
      dataModels: [],
      workflows: [],
      forms: [],
      pages: [],
      rules: []
    };

    // Group component specs by type
    const dataModelSpecs = componentPlan.componentSpecs.filter(c => c.type === 'dataModel');
    const workflowSpecs = componentPlan.componentSpecs.filter(c => c.type === 'workflow');
    const formSpecs = componentPlan.componentSpecs.filter(c => c.type === 'form');
    const pageSpecs = componentPlan.componentSpecs.filter(c => c.type === 'page');

    // Phase 1: Generate data models and workflows in parallel (no dependencies)
    const [dataModels, workflows] = await Promise.all([
      this.generateDataModels(dataModelSpecs, componentPlan, eventEmitter),
      this.generateWorkflows(workflowSpecs, componentPlan, eventEmitter)
    ]);

    results.dataModels = dataModels;
    results.workflows = workflows;

    // Phase 2: Generate forms (can use data models)
    results.forms = await this.generateForms(formSpecs, componentPlan, eventEmitter, results);

    // Phase 3: Link data models to forms
    this.linkDataModelsToForms(results, dataModelSpecs, eventEmitter);

    // Phase 4: Link forms to workflow nodes based on formAssociation
    this.linkFormsToWorkflows(results, formSpecs, eventEmitter);

    // Phase 5: Generate pages (can use forms and data models)
    results.pages = await this.generatePages(pageSpecs, componentPlan, eventEmitter, results);

    // Phase 5.5: Link page navigation to actual page routes
    this.linkPageNavigation(results, pageSpecs, eventEmitter);

    // Phase 5.6: Validate and fix form references in pages
    this.linkFormsToPages(results, pageSpecs, eventEmitter);

    // Phase 6: Generate rules for workflows
    results.rules = await this.generateRules(componentPlan, eventEmitter, results);

    // Phase 7: Link rules to workflows and forms
    const ruleSpecs = componentPlan.componentSpecs.filter(c => c.type === 'rule');
    this.linkRulesToComponents(results, ruleSpecs, eventEmitter);

    // Phase 8: Generate behaviors for interactive UX (NEW)
    results.behaviors = await this.generateBehaviors(results, componentPlan, eventEmitter);

    console.log('[ComponentOrchestrator] Parallel generation complete:', {
      dataModels: results.dataModels.length,
      workflows: results.workflows.length,
      forms: results.forms.length,
      pages: results.pages.length,
      rules: results.rules.length,
      behaviors: results.behaviors?.pageBehaviors?.length || 0
    });

    return results;
  }

  /**
   * Sequential generation strategy for complex projects
   * Generates components one at a time to ensure dependencies are met
   * Supports checkpoint/resume for network failure recovery
   */
  async executeSequential(componentPlan, eventEmitter, applicationId = null) {
    console.log('[ComponentOrchestrator] Executing SEQUENTIAL strategy...');

    // Try to load checkpoint if applicationId provided
    let results = {
      dataModels: [],
      workflows: [],
      forms: [],
      pages: [],
      rules: []
    };
    let completedSpecs = [];

    if (applicationId) {
      const checkpoint = this.loadCheckpoint(applicationId, componentPlan);
      if (checkpoint) {
        results = checkpoint.results;
        completedSpecs = componentPlan.componentSpecs.filter(s =>
          checkpoint.completedSpecs.includes(s.name)
        );

        if (eventEmitter) {
          eventEmitter({
            type: 'checkpoint-restored',
            data: {
              completedCount: completedSpecs.length,
              totalCount: componentPlan.componentSpecs.length
            }
          });
        }
      }
    }

    // Sort components by dependency order
    const sortedSpecs = this.sortByDependencies(componentPlan.componentSpecs);
    const completedNames = new Set(completedSpecs.map(s => s.name));
    const remainingSpecs = sortedSpecs.filter(s => !completedNames.has(s.name));

    console.log(`[ComponentOrchestrator] ${completedSpecs.length} already completed, ${remainingSpecs.length} remaining`);

    for (const spec of remainingSpecs) {
      const overallIndex = sortedSpecs.indexOf(spec);

      if (eventEmitter) {
        eventEmitter({
          type: 'component-generating',
          data: {
            componentType: spec.type,
            componentName: spec.name,
            progress: `${overallIndex + 1}/${sortedSpecs.length}`
          }
        });
      }

      console.log(`[ComponentOrchestrator] Generating ${spec.type}: ${spec.name}...`);

      try {
        let component;

        switch (spec.type) {
          case 'dataModel':
            component = await this.dataModelExpert.generateSingle(spec, componentPlan, results);
            results.dataModels.push(component);
            break;

          case 'workflow':
            component = await this.workflowExpert.generateSingle(spec, componentPlan, results);
            results.workflows.push(component);
            break;

          case 'form':
            component = await this.formExpert.generateSingle(spec, componentPlan, results);
            results.forms.push(component);
            break;

          case 'page':
            component = await this.pageExpert.generateSingle(spec, componentPlan, results);
            results.pages.push(component);
            break;

          case 'rule':
            // Rules are generated in batch after all other components via generateRules()
            // Skip individual rule specs here - they'll be processed later
            console.log(`[ComponentOrchestrator] Skipping rule "${spec.name}" - rules generated in batch later`);
            continue; // Skip checkpoint and event for rules here

          default:
            console.warn(`[ComponentOrchestrator] Unknown component type: ${spec.type}`);
        }

        // Track completed and save checkpoint
        completedSpecs.push(spec);
        if (applicationId) {
          this.saveCheckpoint(applicationId, results, completedSpecs, componentPlan);
        }

        if (eventEmitter && component) {
          eventEmitter({
            type: 'component-completed',
            data: {
              componentType: spec.type,
              componentName: spec.name,
              component: component
            }
          });
        }

      } catch (error) {
        console.error(`[ComponentOrchestrator] Failed to generate ${spec.type} ${spec.name}:`, error);

        // Save checkpoint even on error so we can resume
        if (applicationId) {
          this.saveCheckpoint(applicationId, results, completedSpecs, componentPlan);
        }

        if (eventEmitter) {
          eventEmitter({
            type: 'component-error',
            data: {
              componentType: spec.type,
              componentName: spec.name,
              error: error.message
            }
          });
        }

        // Continue with other components even if one fails
        continue;
      }
    }

    // After all components are generated, link data models to forms
    const dataModelSpecs = componentPlan.componentSpecs.filter(c => c.type === 'dataModel');
    this.linkDataModelsToForms(results, dataModelSpecs, eventEmitter);

    // Link forms to workflows
    const formSpecs = componentPlan.componentSpecs.filter(c => c.type === 'form');
    this.linkFormsToWorkflows(results, formSpecs, eventEmitter);

    // Link page navigation to actual page routes
    const pageSpecs = componentPlan.componentSpecs.filter(c => c.type === 'page');
    this.linkPageNavigation(results, pageSpecs, eventEmitter);

    // Validate and fix form references in pages
    this.linkFormsToPages(results, pageSpecs, eventEmitter);

    // Generate rules for workflows
    results.rules = await this.generateRules(componentPlan, eventEmitter, results);

    // Link rules to workflows and forms
    const ruleSpecs = componentPlan.componentSpecs.filter(c => c.type === 'rule');
    this.linkRulesToComponents(results, ruleSpecs, eventEmitter);

    // Generate behaviors for interactive UX (NEW)
    results.behaviors = await this.generateBehaviors(results, componentPlan, eventEmitter);

    // Clear checkpoint on successful completion
    if (applicationId) {
      this.clearCheckpoint(applicationId);
    }

    console.log('[ComponentOrchestrator] Sequential generation complete:', {
      dataModels: results.dataModels.length,
      workflows: results.workflows.length,
      forms: results.forms.length,
      pages: results.pages.length,
      rules: results.rules.length,
      behaviors: results.behaviors?.pageBehaviors?.length || 0
    });

    return results;
  }

  /**
   * Generate all data models for parallel strategy
   */
  async generateDataModels(specs, componentPlan, eventEmitter) {
    if (specs.length === 0) return [];

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Data Model Expert',
          step: 'generating',
          content: `Generating ${specs.length} data model(s)...`
        }
      });
    }

    return await this.dataModelExpert.generateBatch(specs, componentPlan);
  }

  /**
   * Generate all workflows for parallel strategy
   */
  async generateWorkflows(specs, componentPlan, eventEmitter) {
    if (specs.length === 0) return [];

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Workflow Expert',
          step: 'generating',
          content: `Generating ${specs.length} workflow(s)...`
        }
      });
    }

    return await this.workflowExpert.generateBatch(specs, componentPlan);
  }

  /**
   * Generate all forms for parallel strategy
   */
  async generateForms(specs, componentPlan, eventEmitter, existingComponents = {}) {
    if (specs.length === 0) return [];

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Form Expert',
          step: 'generating',
          content: `Generating ${specs.length} form(s)...`
        }
      });
    }

    return await this.formExpert.generateBatch(specs, componentPlan, existingComponents);
  }

  /**
   * Generate all pages for parallel strategy
   */
  async generatePages(specs, componentPlan, eventEmitter, existingComponents = {}) {
    if (specs.length === 0) return [];

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Page Expert',
          step: 'generating',
          content: `Generating ${specs.length} page(s)...`
        }
      });
    }

    return await this.pageExpert.generateBatch(specs, componentPlan, existingComponents);
  }

  /**
   * Generate rules for workflows
   * Uses rule specs from PlanningExpert if available, otherwise auto-generates from workflow nodes
   */
  async generateRules(componentPlan, eventEmitter, existingComponents = {}) {
    // Only generate rules if there are workflows
    if (!existingComponents.workflows || existingComponents.workflows.length === 0) {
      console.log('[ComponentOrchestrator] No workflows found, skipping rules generation');
      return [];
    }

    try {
      // Check if there are rule specs from PlanningExpert
      const ruleSpecs = componentPlan.componentSpecs?.filter(c => c.type === 'rule') || [];

      if (ruleSpecs.length > 0) {
        // Use planned rule specs with ruleAssociation context
        console.log(`[ComponentOrchestrator] Using ${ruleSpecs.length} planned rule specs from PlanningExpert`);

        if (eventEmitter) {
          eventEmitter({
            type: 'thinking-step',
            data: {
              agent: 'Rules Expert',
              step: 'generating',
              content: `Generating ${ruleSpecs.length} business rules from plan...`
            }
          });
        }

        const rules = await this.rulesExpert.generateBatch(ruleSpecs, componentPlan, existingComponents);

        if (eventEmitter && rules.length > 0) {
          eventEmitter({
            type: 'thinking-step',
            data: {
              agent: 'Rules Expert',
              step: 'complete',
              content: `Generated ${rules.length} business rule(s) from plan`
            }
          });
        }

        return rules;
      }

      // Fallback: Auto-generate rules from workflow nodes
      if (eventEmitter) {
        eventEmitter({
          type: 'thinking-step',
          data: {
            agent: 'Rules Expert',
            step: 'generating',
            content: `Auto-generating business rules for workflow nodes...`
          }
        });
      }

      // Get the first workflow (typically there's one main workflow)
      const workflow = existingComponents.workflows[0];
      const dataModels = existingComponents.dataModels || [];

      console.log(`[ComponentOrchestrator] Auto-generating rules for workflow: ${workflow.name || workflow.id}`);

      const rules = await this.rulesExpert.generateForWorkflow(
        workflow,
        dataModels,
        componentPlan
      );

      if (eventEmitter && rules.length > 0) {
        eventEmitter({
          type: 'thinking-step',
          data: {
            agent: 'Rules Expert',
            step: 'complete',
            content: `Auto-generated ${rules.length} business rule(s)`
          }
        });
      }

      return rules;
    } catch (error) {
      console.error('[ComponentOrchestrator] Rules generation failed:', error);

      if (eventEmitter) {
        eventEmitter({
          type: 'thinking-step',
          data: {
            agent: 'Rules Expert',
            step: 'error',
            content: `Rules generation failed: ${error.message}`
          }
        });
      }

      return []; // Return empty array on failure, don't break the entire generation
    }
  }

  /**
   * Sort component specs by dependency order
   * Data models first, then workflows, then forms, then pages
   */
  sortByDependencies(componentSpecs) {
    const order = {
      'dataModel': 1,
      'workflow': 2,
      'form': 3,
      'page': 4
    };

    return componentSpecs.sort((a, b) => {
      const orderDiff = order[a.type] - order[b.type];
      if (orderDiff !== 0) return orderDiff;

      // Within same type, sort by dependencies
      if (a.dependencies && b.dependencies) {
        return a.dependencies.length - b.dependencies.length;
      }

      return 0;
    });
  }

  /**
   * Analyze complexity and determine strategy
   * This can be overridden by the plan's suggested strategy
   */
  static determineStrategy(componentPlan) {
    const counts = {
      dataModels: componentPlan.componentSpecs.filter(c => c.type === 'dataModel').length,
      workflows: componentPlan.componentSpecs.filter(c => c.type === 'workflow').length,
      forms: componentPlan.componentSpecs.filter(c => c.type === 'form').length,
      pages: componentPlan.componentSpecs.filter(c => c.type === 'page').length
    };

    const totalComponents = Object.values(counts).reduce((a, b) => a + b, 0);

    // Simple: Total <= 8 components AND no single type > 3
    const isSimple = totalComponents <= 8 &&
                     Object.values(counts).every(count => count <= 3);

    return {
      strategy: isSimple ? 'parallel' : 'sequential',
      complexity: isSimple ? 'simple' : (totalComponents > 15 ? 'complex' : 'moderate'),
      counts
    };
  }

  /**
   * Link data models to forms based on dataModelAssociation from plan
   * Sets dataModelId on forms that should use specific data models
   *
   * @param {Object} results - Generated components (dataModels, forms, etc.)
   * @param {Array} dataModelSpecs - Data model specifications with dataModelAssociation
   * @param {Function} eventEmitter - Event emitter for progress updates
   */
  linkDataModelsToForms(results, dataModelSpecs, eventEmitter) {
    if (!results.dataModels || results.dataModels.length === 0) {
      console.log('[ComponentOrchestrator] No data models to link');
      return;
    }

    if (!results.forms || results.forms.length === 0) {
      console.log('[ComponentOrchestrator] No forms to link data models to');
      return;
    }

    console.log('[ComponentOrchestrator] Linking data models to forms based on dataModelAssociation...');

    // Build maps for lookup
    const dataModelsByName = new Map();
    results.dataModels.forEach(dm => {
      dataModelsByName.set(dm.name.toLowerCase(), dm);
      if (dm._specName) {
        dataModelsByName.set(dm._specName.toLowerCase(), dm);
      }
    });

    const formsByName = new Map();
    results.forms.forEach(form => {
      formsByName.set(form.name.toLowerCase(), form);
      if (form._specName) {
        formsByName.set(form._specName.toLowerCase(), form);
      }
    });

    let linkedCount = 0;

    // For each data model with associations
    results.dataModels.forEach(dataModel => {
      const assoc = dataModel._dataModelAssociation;
      if (!assoc || !assoc.usedByForms || assoc.usedByForms.length === 0) {
        return;
      }

      // Link to each form that uses this data model
      assoc.usedByForms.forEach(formName => {
        const formKey = formName.toLowerCase();
        let form = formsByName.get(formKey);

        // Fuzzy match if exact match fails
        if (!form) {
          for (const [key, f] of formsByName.entries()) {
            if (key.includes(formKey) || formKey.includes(key)) {
              form = f;
              break;
            }
          }
        }

        if (form) {
          // Ensure we use a valid ID format - if the ID looks like a name, use the normalized ID instead
          const dmId = dataModel.id;
          const isValidId = dmId && (dmId.startsWith('dm_') || dmId.includes('-') || /^\d+$/.test(dmId));

          if (isValidId) {
            form.dataModelId = dmId;
          } else {
            // Generate a proper ID if the data model has an invalid ID
            const normalizedId = `dm_${(dataModel.name || 'model').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
            dataModel.id = normalizedId; // Fix the data model ID too
            form.dataModelId = normalizedId;
            console.log(`[ComponentOrchestrator] Normalized data model ID from "${dmId}" to "${normalizedId}"`);
          }
          form.dataModelName = dataModel.name;
          linkedCount++;
          console.log(`[ComponentOrchestrator] Linked data model "${dataModel.name}" (id: ${form.dataModelId}) to form "${form.name}"`);
        }
      });
    });

    // Also check forms that specify which data model they use via _formAssociation
    results.forms.forEach(form => {
      if (form.dataModelId) return; // Already linked

      const assoc = form._formAssociation;
      if (assoc && assoc.usesDataModel) {
        const dmKey = assoc.usesDataModel.toLowerCase();
        let dataModel = dataModelsByName.get(dmKey);

        if (!dataModel) {
          for (const [key, dm] of dataModelsByName.entries()) {
            if (key.includes(dmKey) || dmKey.includes(key)) {
              dataModel = dm;
              break;
            }
          }
        }

        if (dataModel) {
          // Ensure we use a valid ID format
          const dmId = dataModel.id;
          const isValidId = dmId && (dmId.startsWith('dm_') || dmId.includes('-') || /^\d+$/.test(dmId));

          if (isValidId) {
            form.dataModelId = dmId;
          } else {
            // Generate a proper ID if the data model has an invalid ID
            const normalizedId = `dm_${(dataModel.name || 'model').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
            dataModel.id = normalizedId;
            form.dataModelId = normalizedId;
            console.log(`[ComponentOrchestrator] Normalized data model ID from "${dmId}" to "${normalizedId}"`);
          }
          form.dataModelName = dataModel.name;
          linkedCount++;
          console.log(`[ComponentOrchestrator] Linked data model "${dataModel.name}" (id: ${form.dataModelId}) to form "${form.name}" (via formAssociation)`);
        }
      }
    });

    console.log(`[ComponentOrchestrator] Data model linking complete: ${linkedCount} forms linked`);

    // Final validation: ensure all form dataModelIds reference actual data models
    // This catches forms where AI directly set dataModelId to an invalid value
    const validDataModelIds = new Set(results.dataModels.map(dm => dm.id));
    let clearedCount = 0;
    results.forms.forEach(form => {
      if (form.dataModelId && !validDataModelIds.has(form.dataModelId)) {
        // Try to find a matching data model by name
        const dmByName = results.dataModels.find(dm =>
          dm.name.toLowerCase() === form.dataModelId.toLowerCase() ||
          dm.name.toLowerCase().replace(/[^a-z0-9]/g, '') === form.dataModelId.toLowerCase().replace(/[^a-z0-9]/g, '')
        );

        if (dmByName) {
          console.log(`[ComponentOrchestrator] Fixed invalid dataModelId "${form.dataModelId}" -> "${dmByName.id}" for form "${form.name}"`);
          form.dataModelId = dmByName.id;
          form.dataModelName = dmByName.name;
        } else {
          console.log(`[ComponentOrchestrator] Clearing invalid dataModelId "${form.dataModelId}" from form "${form.name}" (no matching data model found)`);
          delete form.dataModelId;
          delete form.dataModelName;
          clearedCount++;
        }
      }
    });

    if (clearedCount > 0) {
      console.log(`[ComponentOrchestrator] Cleared ${clearedCount} invalid dataModelId references`);
    }

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Component Orchestrator',
          step: 'datamodel-linking',
          content: `Linked ${linkedCount} data models to forms based on plan associations`
        }
      });
    }
  }

  /**
   * Link rules to workflows and forms based on ruleAssociation from plan
   * Attaches rules to workflow nodes or forms as specified
   *
   * @param {Object} results - Generated components (workflows, forms, rules, etc.)
   * @param {Array} ruleSpecs - Rule specifications with ruleAssociation
   * @param {Function} eventEmitter - Event emitter for progress updates
   */
  linkRulesToComponents(results, ruleSpecs, eventEmitter) {
    if (!results.rules || results.rules.length === 0) {
      console.log('[ComponentOrchestrator] No rules to link');
      return;
    }

    console.log('[ComponentOrchestrator] Linking rules to components based on ruleAssociation...');

    // Build maps for lookup
    const workflowsByName = new Map();
    if (results.workflows) {
      results.workflows.forEach(wf => {
        workflowsByName.set(wf.name.toLowerCase(), wf);
      });
    }

    const formsByName = new Map();
    if (results.forms) {
      results.forms.forEach(form => {
        formsByName.set(form.name.toLowerCase(), form);
        if (form._specName) {
          formsByName.set(form._specName.toLowerCase(), form);
        }
      });
    }

    let linkedToWorkflows = 0;
    let linkedToForms = 0;

    results.rules.forEach(rule => {
      const assoc = rule._ruleAssociation;
      if (!assoc) return;

      // Link to workflow
      if (assoc.forWorkflow) {
        const wfKey = assoc.forWorkflow.toLowerCase();
        let workflow = workflowsByName.get(wfKey);

        if (!workflow) {
          for (const [key, wf] of workflowsByName.entries()) {
            if (key.includes(wfKey) || wfKey.includes(key)) {
              workflow = wf;
              break;
            }
          }
        }

        if (workflow) {
          // Add rule to workflow's rules array
          if (!workflow.rules) workflow.rules = [];
          workflow.rules.push({
            id: rule.id,
            name: rule.name,
            ruleType: assoc.ruleType || 'validation',
            triggerEvent: assoc.triggerEvent || 'onSubmit'
          });
          linkedToWorkflows++;
          console.log(`[ComponentOrchestrator] Linked rule "${rule.name}" to workflow "${workflow.name}"`);
        }
      }

      // Link to form
      if (assoc.forForm) {
        const formKey = assoc.forForm.toLowerCase();
        let form = formsByName.get(formKey);

        if (!form) {
          for (const [key, f] of formsByName.entries()) {
            if (key.includes(formKey) || formKey.includes(key)) {
              form = f;
              break;
            }
          }
        }

        if (form) {
          // Add rule to form's validation rules
          if (!form.validationRules) form.validationRules = [];
          form.validationRules.push({
            id: rule.id,
            name: rule.name,
            ruleType: assoc.ruleType || 'validation',
            triggerEvent: assoc.triggerEvent || 'onFieldChange',
            affectedFields: assoc.affectedFields || []
          });
          linkedToForms++;
          console.log(`[ComponentOrchestrator] Linked rule "${rule.name}" to form "${form.name}"`);
        }
      }
    });

    console.log(`[ComponentOrchestrator] Rule linking complete: ${linkedToWorkflows} to workflows, ${linkedToForms} to forms`);

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Component Orchestrator',
          step: 'rule-linking',
          content: `Linked ${linkedToWorkflows + linkedToForms} rules to components`
        }
      });
    }
  }

  /**
   * Link page navigation to actual page routes
   * Ensures navigation.onAction targets and navigation.menu items reference valid page routes
   * Also adds logical navigation between related pages (list -> detail, form -> list, etc.)
   *
   * @param {Object} results - Generated components (pages, forms, etc.)
   * @param {Array} pageSpecs - Page specifications with pageAssociation
   * @param {Function} eventEmitter - Event emitter for progress updates
   */
  linkPageNavigation(results, pageSpecs, eventEmitter) {
    if (!results.pages || results.pages.length === 0) {
      console.log('[ComponentOrchestrator] No pages to link navigation');
      return;
    }

    console.log('[ComponentOrchestrator] Linking page navigation...');

    // Build a map of all page routes for validation and linking
    const pagesByRoute = new Map();
    const pagesByType = new Map();
    const pagesByName = new Map();

    results.pages.forEach(page => {
      if (page.route) {
        pagesByRoute.set(page.route, page);
        // Also map without leading slash for flexible matching
        const normalizedRoute = page.route.replace(/^\//, '');
        pagesByRoute.set(normalizedRoute, page);
      }
      if (page.type) {
        if (!pagesByType.has(page.type)) {
          pagesByType.set(page.type, []);
        }
        pagesByType.get(page.type).push(page);
      }
      if (page.name) {
        pagesByName.set(page.name.toLowerCase(), page);
        pagesByName.set(page.name.toLowerCase().replace(/[^a-z0-9]/g, ''), page);
      }
    });

    let fixedNavCount = 0;
    let addedNavCount = 0;

    // Helper to find matching page by route or fuzzy match
    const findPageByTarget = (target) => {
      if (!target) return null;

      // Direct route match
      if (pagesByRoute.has(target)) return pagesByRoute.get(target);

      // Normalize and try again
      const normalized = target.replace(/^\//, '').toLowerCase();
      for (const [route, page] of pagesByRoute.entries()) {
        const normalizedRoute = route.replace(/^\//, '').toLowerCase();
        if (normalizedRoute === normalized) return page;
        // Partial match (e.g., /users matches /users-list)
        if (normalizedRoute.includes(normalized) || normalized.includes(normalizedRoute)) {
          return page;
        }
      }

      // Try by name
      const nameKey = target.replace(/^\//, '').replace(/-/g, '').toLowerCase();
      if (pagesByName.has(nameKey)) return pagesByName.get(nameKey);

      return null;
    };

    // Process each page
    results.pages.forEach(page => {
      // Initialize navigation if not present
      if (!page.navigation) {
        page.navigation = { onAction: {}, menu: [] };
      }
      if (!page.navigation.onAction) {
        page.navigation.onAction = {};
      }
      if (!page.navigation.menu) {
        page.navigation.menu = [];
      }

      // Fix existing navigation.onAction targets
      Object.entries(page.navigation.onAction).forEach(([actionName, actionData]) => {
        if (actionData.type === 'navigate' && actionData.target) {
          const targetPage = findPageByTarget(actionData.target);
          if (targetPage && targetPage.route !== actionData.target) {
            console.log(`[ComponentOrchestrator] Fixed nav target: ${actionData.target} -> ${targetPage.route} in page ${page.name}`);
            actionData.target = targetPage.route;
            fixedNavCount++;
          }
        }
      });

      // Fix existing navigation.menu targets
      page.navigation.menu.forEach(menuItem => {
        if (menuItem.route) {
          const targetPage = findPageByTarget(menuItem.route);
          if (targetPage && targetPage.route !== menuItem.route) {
            console.log(`[ComponentOrchestrator] Fixed menu route: ${menuItem.route} -> ${targetPage.route} in page ${page.name}`);
            menuItem.route = targetPage.route;
            fixedNavCount++;
          }
        }
      });

      // Add logical navigation based on page type if missing
      const existingTargets = new Set([
        ...Object.values(page.navigation.onAction)
          .filter(a => a.type === 'navigate')
          .map(a => a.target),
        ...page.navigation.menu.map(m => m.route)
      ]);

      // List pages should navigate to detail/form pages
      if (page.type === 'list') {
        // Find related detail page
        const detailPages = pagesByType.get('detail') || [];
        const relatedDetail = detailPages.find(dp => {
          // Match by similar name pattern
          const pageBase = page.name.toLowerCase().replace(/list|s$/g, '');
          const detailBase = dp.name.toLowerCase().replace(/detail|view|s$/g, '');
          return pageBase.includes(detailBase) || detailBase.includes(pageBase);
        });

        if (relatedDetail && !existingTargets.has(relatedDetail.route)) {
          page.navigation.onAction.view = { type: 'navigate', target: relatedDetail.route };
          addedNavCount++;
        }

        // Find related form page for create action
        const formPages = pagesByType.get('form') || [];
        const relatedForm = formPages.find(fp => {
          const pageBase = page.name.toLowerCase().replace(/list|s$/g, '');
          const formBase = fp.name.toLowerCase().replace(/form|create|edit|new/g, '');
          return pageBase.includes(formBase) || formBase.includes(pageBase);
        });

        if (relatedForm && !existingTargets.has(relatedForm.route)) {
          page.navigation.onAction.create = { type: 'navigate', target: relatedForm.route };
          addedNavCount++;
        }
      }

      // Form pages should navigate back to list after submit
      if (page.type === 'form') {
        const listPages = pagesByType.get('list') || [];
        const relatedList = listPages.find(lp => {
          const pageBase = page.name.toLowerCase().replace(/form|create|edit|new/g, '');
          const listBase = lp.name.toLowerCase().replace(/list|s$/g, '');
          return pageBase.includes(listBase) || listBase.includes(pageBase);
        });

        if (relatedList && !existingTargets.has(relatedList.route)) {
          page.navigation.onAction.submit = { type: 'navigate', target: relatedList.route };
          page.navigation.onAction.cancel = { type: 'navigate', target: relatedList.route };
          addedNavCount += 2;
        }
      }

      // Detail pages should navigate back to list
      if (page.type === 'detail') {
        const listPages = pagesByType.get('list') || [];
        const relatedList = listPages.find(lp => {
          const pageBase = page.name.toLowerCase().replace(/detail|view|s$/g, '');
          const listBase = lp.name.toLowerCase().replace(/list|s$/g, '');
          return pageBase.includes(listBase) || listBase.includes(pageBase);
        });

        if (relatedList && !existingTargets.has(relatedList.route)) {
          page.navigation.onAction.back = { type: 'navigate', target: relatedList.route };
          addedNavCount++;
        }
      }

      // Dashboard should have menu to all main pages
      if (page.type === 'dashboard') {
        const mainPages = results.pages.filter(p =>
          p.id !== page.id &&
          (p.type === 'list' || p.type === 'dashboard')
        );

        mainPages.forEach(mainPage => {
          if (!existingTargets.has(mainPage.route)) {
            page.navigation.menu.push({
              label: mainPage.name || mainPage.title,
              route: mainPage.route
            });
            addedNavCount++;
          }
        });
      }

      // Ensure all pages have a menu with at least the dashboard/home
      if (page.navigation.menu.length === 0 && page.type !== 'dashboard' && page.type !== 'auth') {
        const dashboardPages = pagesByType.get('dashboard') || [];
        const homePages = results.pages.filter(p =>
          p.route === '/' || p.route === '/home' || p.route === '/dashboard'
        );
        const homePage = dashboardPages[0] || homePages[0];

        if (homePage && homePage.id !== page.id) {
          page.navigation.menu.push({
            label: 'Home',
            route: homePage.route
          });
          addedNavCount++;
        }
      }
    });

    // Link pages based on navigationFlow from specs (MoE-generated)
    // This uses the intelligent linking defined by the PlanningExpert
    if (pageSpecs && pageSpecs.length > 0) {
      console.log(`[ComponentOrchestrator] Applying MoE-generated navigationFlow from ${pageSpecs.length} page specs...`);

      pageSpecs.forEach(spec => {
        const page = results.pages.find(p =>
          p.name === spec.name ||
          p.name?.toLowerCase().replace(/\s+/g, '') === spec.name?.toLowerCase().replace(/\s+/g, '')
        );

        if (!page) return;

        const pageAssoc = spec.pageAssociation || {};

        // Apply pageAssociation metadata from spec
        page.pageAssociation = page.pageAssociation || {};
        if (pageAssoc.isEntryPoint !== undefined) {
          page.pageAssociation.isEntryPoint = pageAssoc.isEntryPoint;
        }
        if (pageAssoc.requiresAuth !== undefined) {
          page.pageAssociation.requiresAuth = pageAssoc.requiresAuth;
        }
        if (pageAssoc.pageType) {
          page.type = pageAssoc.pageType;
        }

        // Apply navigationFlow from spec
        const navFlow = pageAssoc.navigationFlow;
        if (navFlow) {
          page.navigation = page.navigation || { onAction: {}, menu: [] };

          // Link to next page
          if (navFlow.nextPage) {
            const nextPage = findPageByTarget(navFlow.nextPage);
            if (nextPage) {
              page.navigation.onAction.success = { type: 'navigate', target: nextPage.route };
              page.navigation.onAction.next = { type: 'navigate', target: nextPage.route };
              addedNavCount++;
            }
          }

          // Link to previous page
          if (navFlow.previousPage) {
            const prevPage = findPageByTarget(navFlow.previousPage);
            if (prevPage) {
              page.navigation.onAction.back = { type: 'navigate', target: prevPage.route };
              page.navigation.onAction.cancel = { type: 'navigate', target: prevPage.route };
              addedNavCount++;
            }
          }

          // Link alternate pages (e.g., login -> register, login -> forgot-password)
          if (navFlow.alternateLinks && Array.isArray(navFlow.alternateLinks)) {
            page.navigation.alternateLinks = page.navigation.alternateLinks || [];
            navFlow.alternateLinks.forEach(linkName => {
              const altPage = findPageByTarget(linkName);
              if (altPage) {
                page.navigation.alternateLinks.push({
                  label: altPage.title || altPage.name,
                  route: altPage.route
                });
                addedNavCount++;
              }
            });
          }
        }
      });
    }

    // Set requiresAuth defaults based on page type (auth pages don't require auth)
    results.pages.forEach(page => {
      page.pageAssociation = page.pageAssociation || {};
      if (page.pageAssociation.requiresAuth === undefined) {
        // Auth pages don't require authentication, all others do
        page.pageAssociation.requiresAuth = page.type !== 'auth';
      }
    });

    console.log(`[ComponentOrchestrator] Page navigation linking complete: ${fixedNavCount} fixed, ${addedNavCount} added`);

    // DEBUG: Log navigation state after linking
    results.pages.forEach(page => {
      console.log(`[ComponentOrchestrator] Page ${page.name} navigation after linking:`, {
        hasNavigation: !!page.navigation,
        onActionCount: page.navigation?.onAction ? Object.keys(page.navigation.onAction).length : 0,
        menuCount: page.navigation?.menu?.length || 0
      });
    });

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Component Orchestrator',
          step: 'page-navigation-linking',
          content: `Linked page navigation: ${fixedNavCount} targets fixed, ${addedNavCount} new links added`
        }
      });
    }
  }

  /**
   * Validate and fix form references in pages
   * Ensures that all formRef properties and forms arrays reference actual generated forms
   *
   * This fixes synchronization issues where:
   * 1. PageExpert generates formRef with spec names instead of actual form IDs
   * 2. PlanningExpert specifies displaysForms that don't match generated form IDs
   *
   * @param {Object} results - Generated components (pages, forms, etc.)
   * @param {Array} pageSpecs - Page specifications with pageAssociation
   * @param {Function} eventEmitter - Event emitter for progress updates
   */
  linkFormsToPages(results, pageSpecs, eventEmitter) {
    if (!results.pages || results.pages.length === 0) {
      console.log('[ComponentOrchestrator] No pages to validate form references');
      return;
    }

    if (!results.forms || results.forms.length === 0) {
      console.log('[ComponentOrchestrator] No forms available, clearing all form references from pages');
      // Clear all form references if no forms exist
      results.pages.forEach(page => {
        page.forms = [];
        this.clearFormRefsFromComponents(page.sections);
      });
      return;
    }

    console.log('[ComponentOrchestrator] Validating and fixing form references in pages...');

    // Build lookup maps for forms
    const formsById = new Map();
    const formsByName = new Map();
    const formsBySpecName = new Map();

    results.forms.forEach(form => {
      formsById.set(form.id, form);
      formsByName.set(form.name.toLowerCase(), form);
      formsByName.set(form.name.toLowerCase().replace(/[^a-z0-9]/g, ''), form);
      if (form._specName) {
        formsBySpecName.set(form._specName.toLowerCase(), form);
        formsBySpecName.set(form._specName.toLowerCase().replace(/[^a-z0-9]/g, ''), form);
      }
    });

    // Helper to find a form by ID or name (with fuzzy matching)
    const findForm = (formRef) => {
      if (!formRef) return null;

      // Direct ID match
      if (formsById.has(formRef)) {
        return formsById.get(formRef);
      }

      // Normalize the reference for matching
      const normalizedRef = formRef.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Try by name
      if (formsByName.has(formRef.toLowerCase())) {
        return formsByName.get(formRef.toLowerCase());
      }
      if (formsByName.has(normalizedRef)) {
        return formsByName.get(normalizedRef);
      }

      // Try by spec name
      if (formsBySpecName.has(formRef.toLowerCase())) {
        return formsBySpecName.get(formRef.toLowerCase());
      }
      if (formsBySpecName.has(normalizedRef)) {
        return formsBySpecName.get(normalizedRef);
      }

      // Fuzzy match - find form whose name/id contains the ref or vice versa
      for (const [key, form] of formsByName.entries()) {
        if (key.includes(normalizedRef) || normalizedRef.includes(key)) {
          return form;
        }
      }

      // Try matching by extracting meaningful parts
      // e.g., "customer-quick-add-form-1766755325101-g3us65" -> "customer quick add form"
      const refWords = formRef.toLowerCase().replace(/[-_]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      for (const form of results.forms) {
        const formWords = form.name.toLowerCase().replace(/[-_]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        const matchingWords = refWords.filter(w => formWords.some(fw => fw.includes(w) || w.includes(fw)));
        if (matchingWords.length >= Math.min(2, refWords.length)) {
          return form;
        }
      }

      return null;
    };

    let fixedRefsCount = 0;
    let removedRefsCount = 0;
    let validRefsCount = 0;

    // Process each page
    results.pages.forEach(page => {
      // Fix forms array
      if (page.forms && Array.isArray(page.forms)) {
        const validForms = [];
        page.forms.forEach(formRef => {
          const form = findForm(formRef);
          if (form) {
            if (formRef !== form.id) {
              console.log(`[ComponentOrchestrator] Fixed page "${page.name}" forms array: "${formRef}" -> "${form.id}"`);
              fixedRefsCount++;
            } else {
              validRefsCount++;
            }
            if (!validForms.includes(form.id)) {
              validForms.push(form.id);
            }
          } else {
            console.log(`[ComponentOrchestrator] Removed invalid form reference "${formRef}" from page "${page.name}" forms array`);
            removedRefsCount++;
          }
        });
        page.forms = validForms;
      }

      // Fix formRef properties in sections and components
      if (page.sections && Array.isArray(page.sections)) {
        page.sections.forEach(section => {
          this.fixFormRefsInComponents(section.components, page.name, findForm,
            (fixed) => { fixedRefsCount += fixed; },
            (removed) => { removedRefsCount += removed; },
            (valid) => { validRefsCount += valid; }
          );
        });
      }

      // Fix formRef in navigation.onAction
      if (page.navigation?.onAction) {
        Object.entries(page.navigation.onAction).forEach(([actionName, actionData]) => {
          if (actionData.formRef) {
            const form = findForm(actionData.formRef);
            if (form) {
              if (actionData.formRef !== form.id) {
                console.log(`[ComponentOrchestrator] Fixed page "${page.name}" nav action "${actionName}": "${actionData.formRef}" -> "${form.id}"`);
                actionData.formRef = form.id;
                fixedRefsCount++;
              } else {
                validRefsCount++;
              }
            } else {
              console.log(`[ComponentOrchestrator] Removed invalid formRef "${actionData.formRef}" from page "${page.name}" nav action "${actionName}"`);
              delete actionData.formRef;
              removedRefsCount++;
            }
          }
          if (actionData.formId) {
            const form = findForm(actionData.formId);
            if (form) {
              if (actionData.formId !== form.id) {
                actionData.formId = form.id;
                fixedRefsCount++;
              } else {
                validRefsCount++;
              }
            } else {
              delete actionData.formId;
              removedRefsCount++;
            }
          }
        });
      }
    });

    console.log(`[ComponentOrchestrator] Form-to-page linking complete: ${validRefsCount} valid, ${fixedRefsCount} fixed, ${removedRefsCount} removed`);

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Component Orchestrator',
          step: 'form-page-linking',
          content: `Validated form references in pages: ${validRefsCount} valid, ${fixedRefsCount} fixed, ${removedRefsCount} invalid removed`
        }
      });
    }
  }

  /**
   * Recursively fix formRef properties in components
   */
  fixFormRefsInComponents(components, pageName, findForm, onFixed, onRemoved, onValid) {
    if (!components || !Array.isArray(components)) return;

    components.forEach(component => {
      // Fix formRef at component level
      if (component.formRef) {
        const form = findForm(component.formRef);
        if (form) {
          if (component.formRef !== form.id) {
            console.log(`[ComponentOrchestrator] Fixed component formRef in "${pageName}": "${component.formRef}" -> "${form.id}"`);
            component.formRef = form.id;
            onFixed(1);
          } else {
            onValid(1);
          }
        } else {
          console.log(`[ComponentOrchestrator] Removed invalid formRef "${component.formRef}" from component in "${pageName}"`);
          delete component.formRef;
          onRemoved(1);
        }
      }

      // Check nested components
      if (component.components) {
        this.fixFormRefsInComponents(component.components, pageName, findForm, onFixed, onRemoved, onValid);
      }

      // Check config for nested form references
      if (component.config?.formRef) {
        const form = findForm(component.config.formRef);
        if (form) {
          if (component.config.formRef !== form.id) {
            component.config.formRef = form.id;
            onFixed(1);
          } else {
            onValid(1);
          }
        } else {
          delete component.config.formRef;
          onRemoved(1);
        }
      }
    });
  }

  /**
   * Clear all formRef properties from components (when no forms exist)
   */
  clearFormRefsFromComponents(sections) {
    if (!sections || !Array.isArray(sections)) return;

    sections.forEach(section => {
      if (section.components && Array.isArray(section.components)) {
        section.components.forEach(component => {
          if (component.formRef) delete component.formRef;
          if (component.config?.formRef) delete component.config.formRef;
          if (component.components) {
            this.clearFormRefsFromComponents([{ components: component.components }]);
          }
        });
      }
    });
  }

  /**
   * Link generated forms to workflow nodes based on formAssociation from plan
   * This replaces the heuristic linkFormsToUserTasks in MoEOrchestrator
   *
   * IMPORTANT: Each node (startProcess or userTask) should have exactly ONE form.
   * This method ensures only the best-matching form is linked to each node.
   *
   * Uses two sources of formAssociation:
   * 1. _formAssociation attached directly to forms by FormExpert (preferred)
   * 2. formSpecs from the plan (fallback)
   *
   * @param {Object} results - Generated components (workflows, forms, etc.)
   * @param {Array} formSpecs - Form specifications with formAssociation
   * @param {Function} eventEmitter - Event emitter for progress updates
   */
  linkFormsToWorkflows(results, formSpecs, eventEmitter) {
    if (!results.workflows || results.workflows.length === 0) {
      console.log('[ComponentOrchestrator] No workflows to link forms to');
      return;
    }

    if (!results.forms || results.forms.length === 0) {
      console.log('[ComponentOrchestrator] No forms to link');
      return;
    }

    console.log('[ComponentOrchestrator] Linking forms to workflow nodes based on formAssociation...');

    // Build a map of form specs by their original names for lookup (fallback)
    const formSpecsByName = new Map();
    formSpecs.forEach(spec => {
      formSpecsByName.set(spec.name.toLowerCase(), spec);
    });

    // Group forms by their workflow association (using _formAssociation from FormExpert)
    const formsByWorkflow = new Map();
    results.forms.forEach(form => {
      const assoc = form._formAssociation;
      if (assoc && assoc.forWorkflow) {
        const wfKey = assoc.forWorkflow.toLowerCase();
        if (!formsByWorkflow.has(wfKey)) {
          formsByWorkflow.set(wfKey, []);
        }
        formsByWorkflow.get(wfKey).push(form);
      }
    });

    // Also build a map by spec name for fallback matching
    const formsByName = new Map();
    results.forms.forEach(form => {
      formsByName.set(form.name.toLowerCase(), form);
      if (form._specName) {
        formsByName.set(form._specName.toLowerCase(), form);
      }
    });

    // Track which forms have been linked to prevent duplicates
    const linkedFormIds = new Set();
    let linkedCount = 0;
    let totalFormNodes = 0;

    // Helper to calculate match score (higher is better)
    const calculateMatchScore = (form, node, nodeLabel) => {
      const assoc = form._formAssociation;
      if (!assoc) return 0;

      let score = 0;

      // Must match node type
      if (assoc.forNodeType && assoc.forNodeType !== node.type) {
        return 0;
      }

      // Base score for matching node type
      if (assoc.forNodeType === node.type) {
        score += 10;
      }

      // Bonus for matching node label
      if (assoc.forNodeLabel) {
        const specLabel = assoc.forNodeLabel.toLowerCase();
        const actualLabel = nodeLabel.toLowerCase();

        // Exact match - highest priority
        if (specLabel === actualLabel) {
          score += 100;
        }
        // Contains match
        else if (actualLabel.includes(specLabel) || specLabel.includes(actualLabel)) {
          score += 50;
        }
        // Word-based match
        else {
          const specWords = specLabel.split(/\s+|-|_/).filter(w => w.length > 2);
          const actualWords = actualLabel.split(/\s+|-|_/).filter(w => w.length > 2);
          const matchingWords = specWords.filter(w => actualWords.some(aw => aw.includes(w) || w.includes(aw)));
          score += matchingWords.length * 10;
        }
      }

      return score;
    };

    // For each workflow, find and link its forms
    results.workflows.forEach(workflow => {
      const workflowName = workflow.name;
      const workflowKey = workflowName.toLowerCase();

      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        console.warn(`[ComponentOrchestrator] Workflow "${workflowName}" has no nodes array`);
        return;
      }

      // Get forms associated with this workflow (from _formAssociation)
      const workflowForms = formsByWorkflow.get(workflowKey) || [];
      console.log(`[ComponentOrchestrator] Found ${workflowForms.length} forms with direct association to workflow "${workflowName}"`);

      // Collect all nodes that need forms
      const formNodes = workflow.nodes.filter(node =>
        node.type === 'startProcess' || node.type === 'userTask'
      );

      // For startProcess nodes - there should be exactly ONE, link only ONE form
      const startNodes = formNodes.filter(n => n.type === 'startProcess');
      const userTaskNodes = formNodes.filter(n => n.type === 'userTask');

      // Link forms to start nodes (should be only 1 start node per workflow)
      startNodes.forEach(node => {
        totalFormNodes++;
        const nodeLabel = node.data?.label || node.id;

        // Find the BEST matching form for this start node
        const availableForms = workflowForms.filter(f => !linkedFormIds.has(f.id));
        let bestForm = null;
        let bestScore = 0;

        availableForms.forEach(form => {
          const score = calculateMatchScore(form, node, nodeLabel);
          if (score > bestScore) {
            bestScore = score;
            bestForm = form;
          }
        });

        // Fallback: find any form designated for startProcess in this workflow
        if (!bestForm) {
          bestForm = availableForms.find(form => {
            const assoc = form._formAssociation;
            return assoc && assoc.forNodeType === 'startProcess';
          });
        }

        if (bestForm) {
          node.data = node.data || {};
          node.data.formId = bestForm.id;
          node.data.formName = bestForm.name;
          // Also set workflowId on the form for workflow integration
          bestForm.workflowId = workflow.id;
          bestForm.linkedNodeId = node.id;
          bestForm.linkedNodeType = 'startEvent';
          linkedFormIds.add(bestForm.id);
          linkedCount++;
          console.log(`[ComponentOrchestrator] Linked form "${bestForm.name}" to start node "${nodeLabel}" in workflow "${workflowName}" (score: ${bestScore})`);

          // Extract form fields as workflow input variables for startProcess nodes
          this.extractInputVariablesFromForm(bestForm, workflow, 'startProcess');
        } else {
          console.warn(`[ComponentOrchestrator] No form matches start node "${nodeLabel}" in workflow "${workflowName}"`);
        }
      });

      // Link forms to user task nodes
      userTaskNodes.forEach(node => {
        totalFormNodes++;
        const nodeLabel = node.data?.label || node.id;

        // Find the BEST matching form for this user task
        const availableForms = workflowForms.filter(f => !linkedFormIds.has(f.id));
        let bestForm = null;
        let bestScore = 0;

        availableForms.forEach(form => {
          const score = calculateMatchScore(form, node, nodeLabel);
          if (score > bestScore) {
            bestScore = score;
            bestForm = form;
          }
        });

        // Fallback: find any unlinked form designated for userTask in this workflow
        if (!bestForm) {
          bestForm = availableForms.find(form => {
            const assoc = form._formAssociation;
            return assoc && assoc.forNodeType === 'userTask';
          });
        }

        // Strategy 2: Fallback to formSpecs if no direct match
        if (!bestForm) {
          const workflowFormSpecs = formSpecs.filter(spec => {
            const assoc = spec.formAssociation;
            if (!assoc || !assoc.forWorkflow) return false;
            return assoc.forWorkflow.toLowerCase() === workflowKey;
          });

          const matchingSpec = workflowFormSpecs.find(spec => {
            const assoc = spec.formAssociation;
            if (!assoc) return false;

            if (assoc.forNodeType && assoc.forNodeType !== node.type) {
              return false;
            }

            if (assoc.forNodeLabel) {
              const specLabel = assoc.forNodeLabel.toLowerCase();
              const actualLabel = nodeLabel.toLowerCase();
              return specLabel === actualLabel ||
                     actualLabel.includes(specLabel) ||
                     specLabel.includes(actualLabel);
            }

            return assoc.forNodeType === node.type;
          });

          if (matchingSpec) {
            const specForm = formsByName.get(matchingSpec.name.toLowerCase());
            if (specForm && !linkedFormIds.has(specForm.id)) {
              bestForm = specForm;
            }
          }
        }

        if (bestForm) {
          node.data = node.data || {};
          node.data.formId = bestForm.id;
          node.data.formName = bestForm.name;
          // Also set workflowId on the form for workflow integration
          bestForm.workflowId = workflow.id;
          bestForm.linkedNodeId = node.id;
          bestForm.linkedNodeType = 'userTask';
          linkedFormIds.add(bestForm.id);
          linkedCount++;
          console.log(`[ComponentOrchestrator] Linked form "${bestForm.name}" to user task "${nodeLabel}" in workflow "${workflowName}" (score: ${bestScore})`);

          // Extract form fields as workflow variables for userTask nodes (optional variables)
          this.extractInputVariablesFromForm(bestForm, workflow, 'userTask');
        } else {
          console.warn(`[ComponentOrchestrator] No form matches user task "${nodeLabel}" in workflow "${workflowName}"`);
        }
      });
    });

    console.log(`[ComponentOrchestrator] Form linking complete: ${linkedCount}/${totalFormNodes} nodes linked`);

    // Auto-generate forms for nodes that don't have forms (only if needed)
    const unlinkedNodes = [];
    results.workflows.forEach(workflow => {
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) return;

      workflow.nodes.forEach(node => {
        if ((node.type === 'userTask' || node.type === 'startProcess') &&
            (!node.data?.formId)) {
          unlinkedNodes.push({
            workflowId: workflow.id,
            workflowName: workflow.name,
            nodeId: node.id,
            nodeType: node.type,
            nodeLabel: node.data?.label || node.id
          });
        }
      });
    });

    if (unlinkedNodes.length > 0) {
      console.log(`[ComponentOrchestrator] Found ${unlinkedNodes.length} nodes without forms, auto-generating ONE form per node...`);

      for (const unlinkedNode of unlinkedNodes) {
        const autoForm = this.createAutoForm(unlinkedNode, results);

        // Set workflowId on auto-generated form
        autoForm.workflowId = unlinkedNode.workflowId;
        autoForm.linkedNodeId = unlinkedNode.nodeId;
        autoForm.linkedNodeType = unlinkedNode.nodeType;

        results.forms.push(autoForm);
        linkedFormIds.add(autoForm.id);

        // Link the auto-generated form to the node
        const workflow = results.workflows.find(w => w.id === unlinkedNode.workflowId || w.name === unlinkedNode.workflowName);
        if (workflow && workflow.nodes) {
          const node = workflow.nodes.find(n => n.id === unlinkedNode.nodeId);
          if (node) {
            node.data = node.data || {};
            node.data.formId = autoForm.id;
            node.data.formName = autoForm.name;
            linkedCount++;
            console.log(`[ComponentOrchestrator] Auto-generated form "${autoForm.name}" for node "${unlinkedNode.nodeLabel}"`);

            // Extract form fields as workflow variables for auto-generated forms
            this.extractInputVariablesFromForm(autoForm, workflow, unlinkedNode.nodeType);
          }
        }
      }
    }

    // Log summary of input variables extracted
    results.workflows.forEach(workflow => {
      const varCount = workflow.inputVariables?.length || 0;
      if (varCount > 0) {
        console.log(`[ComponentOrchestrator] Workflow "${workflow.name}" has ${varCount} input variables: ${workflow.inputVariables.map(v => v.name).join(', ')}`);
      }
    });

    if (eventEmitter) {
      const totalVars = results.workflows.reduce((sum, w) => sum + (w.inputVariables?.length || 0), 0);
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Component Orchestrator',
          step: 'form-linking',
          content: `Linked ${linkedCount} forms to workflow nodes (including ${unlinkedNodes.length} auto-generated). Extracted ${totalVars} process variables from form fields.`
        }
      });
    }
  }

  /**
   * Create an auto-generated form for a node that doesn't have one
   * @param {Object} nodeInfo - Information about the unlinked node
   * @param {Object} results - Generated components
   * @returns {Object} Auto-generated form
   */
  createAutoForm(nodeInfo, results) {
    const timestamp = Date.now();
    const sanitizedLabel = (nodeInfo.nodeLabel || 'Task').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const formId = `form_auto_${sanitizedLabel}_${timestamp}`;

    // Try to find a data model that might be relevant
    const dataModel = results.dataModels?.[0];

    // Generate basic fields based on node type
    let fields = [];

    if (nodeInfo.nodeType === 'startProcess') {
      fields = [
        {
          id: `field_${timestamp}_1`,
          name: 'submitterName',
          label: 'Submitter Name',
          type: 'text',
          required: true
        },
        {
          id: `field_${timestamp}_2`,
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: false
        },
        {
          id: `field_${timestamp}_3`,
          name: 'priority',
          label: 'Priority',
          type: 'dropdown',
          required: false,
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' }
          ]
        }
      ];
    } else {
      // userTask - typically needs review/action fields
      fields = [
        {
          id: `field_${timestamp}_1`,
          name: 'status',
          label: 'Status',
          type: 'dropdown',
          required: true,
          options: [
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'Pending', value: 'pending' }
          ]
        },
        {
          id: `field_${timestamp}_2`,
          name: 'comments',
          label: 'Comments',
          type: 'textarea',
          required: false
        }
      ];
    }

    const form = {
      id: formId,
      name: `${nodeInfo.nodeLabel} Form`,
      description: `Auto-generated form for ${nodeInfo.nodeLabel}`,
      type: 'simple',
      // Include fields at top level for UI compatibility
      fields: fields,
      // Also include in sections structure
      sections: [
        {
          id: `section_${timestamp}`,
          title: nodeInfo.nodeLabel,
          fields: fields
        }
      ],
      // Add grid layout for proper form rendering
      gridLayout: fields.map((field, index) => ({
        i: field.id,
        x: 0,
        y: index * 10,
        w: 24,
        h: field.type === 'textarea' ? 12 : 8,
        minW: 6,
        minH: 6
      })),
      layout: { type: 'single-column', sections: [] },
      submitButton: { label: 'Submit', position: 'right' },
      validation: { mode: 'onSubmit', showErrors: true },
      dataModelId: dataModel?.id || null,
      dataModelName: dataModel?.name || null,
      _autoGenerated: true,
      _forWorkflow: nodeInfo.workflowName,
      _forNode: nodeInfo.nodeId
    };

    return form;
  }

  /**
   * Map form field type to workflow variable type
   * @param {string} formFieldType - The form field type
   * @returns {string} The corresponding workflow variable type
   */
  mapFormFieldTypeToVariableType(formFieldType) {
    const typeMapping = {
      'text': 'string',
      'textarea': 'string',
      'email': 'string',
      'phone': 'string',
      'url': 'string',
      'password': 'string',
      'richtext': 'string',
      'number': 'number',
      'currency': 'number',
      'slider': 'number',
      'rating': 'number',
      'checkbox': 'boolean',
      'toggle': 'boolean',
      'switch': 'boolean',
      'date': 'date',
      'datetime': 'date',
      'time': 'string',
      'select': 'string',
      'radio': 'string',
      'dropdown': 'string',
      'multiselect': 'array',
      'checkboxgroup': 'array',
      'file': 'object',
      'image': 'object',
      'signature': 'string',
      'address': 'object',
      'location': 'object'
    };
    return typeMapping[formFieldType?.toLowerCase()] || 'string';
  }

  /**
   * Bind form fields to workflow input variables and extract new variables if needed.
   *
   * Priority:
   * 1. If form field has 'bindToVariable', link it to the existing workflow variable
   * 2. If form field name matches an existing workflow variable, link them
   * 3. If no match, create a new workflow variable from the form field
   *
   * @param {Object} form - The form with fields
   * @param {Object} workflow - The workflow to add/update inputVariables
   * @param {string} nodeType - 'startProcess' or 'userTask'
   */
  extractInputVariablesFromForm(form, workflow, nodeType) {
    if (!form || !form.fields || !Array.isArray(form.fields)) {
      console.log(`[ComponentOrchestrator] No fields to process from form "${form?.name}"`);
      return;
    }

    // Initialize inputVariables array if not present
    if (!workflow.inputVariables) {
      workflow.inputVariables = [];
    }

    let boundCount = 0;
    let addedCount = 0;

    form.fields.forEach(field => {
      // Skip fields without a name
      if (!field.name) return;

      // Priority 1: Check if field has explicit bindToVariable
      if (field.bindToVariable) {
        const boundVar = workflow.inputVariables.find(
          v => v.name?.toLowerCase() === field.bindToVariable.toLowerCase()
        );
        if (boundVar) {
          boundVar.formFieldId = field.id;
          boundCount++;
          console.log(`[ComponentOrchestrator] Bound form field "${field.name}" to workflow variable "${boundVar.name}"`);
          return;
        } else {
          console.warn(`[ComponentOrchestrator] Form field "${field.name}" references unknown variable "${field.bindToVariable}"`);
        }
      }

      // Priority 2: Check if field name matches an existing variable
      const matchingVar = workflow.inputVariables.find(
        v => v.name?.toLowerCase() === field.name.toLowerCase()
      );
      if (matchingVar) {
        if (!matchingVar.formFieldId) {
          matchingVar.formFieldId = field.id;
          boundCount++;
          console.log(`[ComponentOrchestrator] Matched form field "${field.name}" to workflow variable "${matchingVar.name}"`);
        }
        return;
      }

      // Priority 3: Create new input variable from form field
      const inputVariable = {
        id: `var_${field.id || field.name}_${Date.now()}`,
        name: field.name,
        type: this.mapFormFieldTypeToVariableType(field.type),
        required: nodeType === 'startProcess' ? (field.required || false) : false,
        defaultValue: field.defaultValue || '',
        description: field.label || field.name,
        formFieldId: field.id
      };

      workflow.inputVariables.push(inputVariable);
      addedCount++;
    });

    console.log(`[ComponentOrchestrator] Form "${form.name}" -> Workflow "${workflow.name}": bound ${boundCount} fields, added ${addedCount} new variables`);
  }

  /**
   * Generate interactive behaviors for pages and forms
   * This adds state management, conditional rendering, and UX flows
   */
  async generateBehaviors(results, componentPlan, eventEmitter) {
    console.log('[ComponentOrchestrator] Generating interactive behaviors...');

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          step: 'Generating Behaviors',
          content: 'Adding interactive state management, loading states, and UX flows to pages and forms...'
        }
      });

      eventEmitter({
        type: 'component-generating',
        data: {
          componentType: 'behaviors',
          componentName: 'Interactive UX Behaviors',
          count: results.pages?.length || 0
        }
      });
    }

    try {
      const behaviorResult = await this.behaviorExpert.generate(
        results.pages || [],
        results.forms || [],
        results.workflows || [],
        results.dataModels || [],
        {
          applicationName: componentPlan.overview?.name,
          domain: componentPlan.overview?.category
        }
      );

      if (eventEmitter) {
        eventEmitter({
          type: 'component-completed',
          data: {
            componentType: 'behaviors',
            componentName: 'Interactive UX Behaviors',
            count: behaviorResult.behaviors?.pageBehaviors?.length || 0
          }
        });
      }

      console.log(`[ComponentOrchestrator] Generated behaviors for ${behaviorResult.behaviors?.pageBehaviors?.length || 0} pages`);

      return behaviorResult.behaviors;
    } catch (error) {
      console.error('[ComponentOrchestrator] Failed to generate behaviors:', error);

      if (eventEmitter) {
        eventEmitter({
          type: 'component-error',
          data: {
            componentType: 'behaviors',
            error: error.message
          }
        });
      }

      // Return empty behaviors instead of failing entire generation
      return {
        pageBehaviors: [],
        globalBehaviors: {}
      };
    }
  }
}

module.exports = ComponentOrchestrator;
