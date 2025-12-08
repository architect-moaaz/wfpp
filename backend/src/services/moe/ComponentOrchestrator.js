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

    // Phase 3: Generate pages (can use forms and data models)
    results.pages = await this.generatePages(pageSpecs, componentPlan, eventEmitter, results);

    // Phase 4: Generate rules for workflows
    results.rules = await this.generateRules(componentPlan, eventEmitter, results);

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

    // After all components are generated, generate rules for workflows
    results.rules = await this.generateRules(componentPlan, eventEmitter, results);

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
   */
  async generateRules(componentPlan, eventEmitter, existingComponents = {}) {
    // Only generate rules if there are workflows
    if (!existingComponents.workflows || existingComponents.workflows.length === 0) {
      console.log('[ComponentOrchestrator] No workflows found, skipping rules generation');
      return [];
    }

    try {
      if (eventEmitter) {
        eventEmitter({
          type: 'thinking-step',
          data: {
            agent: 'Rules Expert',
            step: 'generating',
            content: `Generating business rules for workflow nodes...`
          }
        });
      }

      // Get the first workflow (typically there's one main workflow)
      const workflow = existingComponents.workflows[0];
      const dataModels = existingComponents.dataModels || [];

      console.log(`[ComponentOrchestrator] Generating rules for workflow: ${workflow.name || workflow.id}`);

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
            content: `Generated ${rules.length} business rule(s)`
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
}

module.exports = ComponentOrchestrator;
