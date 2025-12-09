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

class ComponentOrchestrator {
  constructor() {
    this.dataModelExpert = new DataModelExpert();
    this.workflowExpert = new WorkflowExpert();
    this.formExpert = new FormExpert();
    this.pageExpert = new PageExpert();
    this.rulesExpert = new RulesExpert();
    this.checkpointDir = path.join(__dirname, '../../..', 'data', 'checkpoints');
    this.ensureCheckpointDir();
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

    // Phase 6: Generate rules for workflows
    results.rules = await this.generateRules(componentPlan, eventEmitter, results);

    // Phase 7: Link rules to workflows and forms
    const ruleSpecs = componentPlan.componentSpecs.filter(c => c.type === 'rule');
    this.linkRulesToComponents(results, ruleSpecs, eventEmitter);

    console.log('[ComponentOrchestrator] Parallel generation complete:', {
      dataModels: results.dataModels.length,
      workflows: results.workflows.length,
      forms: results.forms.length,
      pages: results.pages.length,
      rules: results.rules.length
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

    // Generate rules for workflows
    results.rules = await this.generateRules(componentPlan, eventEmitter, results);

    // Link rules to workflows and forms
    const ruleSpecs = componentPlan.componentSpecs.filter(c => c.type === 'rule');
    this.linkRulesToComponents(results, ruleSpecs, eventEmitter);

    // Clear checkpoint on successful completion
    if (applicationId) {
      this.clearCheckpoint(applicationId);
    }

    console.log('[ComponentOrchestrator] Sequential generation complete:', {
      dataModels: results.dataModels.length,
      workflows: results.workflows.length,
      forms: results.forms.length,
      pages: results.pages.length,
      rules: results.rules.length
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
   * Link generated forms to workflow nodes based on formAssociation from plan
   * This replaces the heuristic linkFormsToUserTasks in MoEOrchestrator
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

    let linkedCount = 0;
    let totalFormNodes = 0;

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

      // For each node that needs a form (startProcess, userTask)
      workflow.nodes.forEach(node => {
        if (node.type !== 'startProcess' && node.type !== 'userTask') {
          return;
        }

        totalFormNodes++;
        const nodeLabel = node.data?.label || node.id;

        // Strategy 1: Direct match using _formAssociation from forms
        let matchedForm = workflowForms.find(form => {
          const assoc = form._formAssociation;
          if (!assoc) return false;

          // Match by node type
          if (assoc.forNodeType && assoc.forNodeType !== node.type) {
            return false;
          }

          // Match by node label (fuzzy matching)
          if (assoc.forNodeLabel) {
            const specLabel = assoc.forNodeLabel.toLowerCase();
            const actualLabel = nodeLabel.toLowerCase();

            // Exact match or contains match
            if (specLabel === actualLabel ||
                actualLabel.includes(specLabel) ||
                specLabel.includes(actualLabel)) {
              return true;
            }

            // Word-based match
            const specWords = specLabel.split(/\s+|-|_/);
            const actualWords = actualLabel.split(/\s+|-|_/);
            const matchingWords = specWords.filter(w => actualWords.some(aw => aw.includes(w) || w.includes(aw)));

            return matchingWords.length >= Math.min(2, specWords.length);
          }

          // If no label specified, match by node type alone
          return assoc.forNodeType === node.type;
        });

        // Strategy 2: Fallback to formSpecs if no direct match
        if (!matchedForm) {
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
            matchedForm = formsByName.get(matchingSpec.name.toLowerCase());
          }
        }

        if (matchedForm) {
          node.data = node.data || {};
          node.data.formId = matchedForm.id;
          node.data.formName = matchedForm.name;
          linkedCount++;
          console.log(`[ComponentOrchestrator] Linked form "${matchedForm.name}" to node "${nodeLabel}" in workflow "${workflowName}"`);
        } else {
          console.warn(`[ComponentOrchestrator] No form matches node "${nodeLabel}" (${node.type}) in workflow "${workflowName}"`);
        }
      });
    });

    console.log(`[ComponentOrchestrator] Form linking complete: ${linkedCount}/${totalFormNodes} nodes linked`);

    if (eventEmitter) {
      eventEmitter({
        type: 'thinking-step',
        data: {
          agent: 'Component Orchestrator',
          step: 'form-linking',
          content: `Linked ${linkedCount} forms to workflow nodes based on plan associations`
        }
      });
    }
  }
}

module.exports = ComponentOrchestrator;
