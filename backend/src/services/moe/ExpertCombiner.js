/**
 * ExpertCombiner - Merges outputs from multiple experts using various strategies
 *
 * Enhanced to support multi-workflow architecture where workflows are kept
 * separate and connected via events or direct calls instead of being merged.
 */

class ExpertCombiner {
  /**
   * Combine outputs from multiple workflow experts
   *
   * Strategies:
   * - 'best-only': Select the single best workflow (legacy)
   * - 'ensemble': Merge nodes from multiple workflows into one (legacy)
   * - 'weighted': Weighted combination based on confidence (legacy)
   * - 'multi-workflow': Keep workflows separate with connections (NEW)
   */
  static combineWorkflows(workflows, strategy = 'best-only', routing, workflowConnections = []) {
    if (!workflows || workflows.length === 0) {
      throw new Error('No workflows to combine');
    }

    // New multi-workflow strategy - keeps workflows separate
    if (strategy === 'multi-workflow') {
      return this.combineAsMultiWorkflow(workflows, routing, workflowConnections);
    }

    if (workflows.length === 1 || strategy === 'best-only') {
      // Return the single/best workflow
      return this.selectBestWorkflow(workflows, routing);
    }

    if (strategy === 'ensemble') {
      // Merge multiple workflows intelligently
      return this.ensembleWorkflows(workflows, routing);
    }

    if (strategy === 'weighted') {
      // Weighted combination based on confidence
      return this.weightedCombine(workflows, routing);
    }

    return workflows[0];
  }

  /**
   * NEW: Combine workflows as separate entities with connections
   * This is the preferred strategy for multi-workflow applications
   */
  static combineAsMultiWorkflow(workflows, routing, workflowConnections = []) {
    console.log('[ExpertCombiner] Using multi-workflow strategy for', workflows.length, 'workflows');

    // Ensure each workflow has proper configuration
    const processedWorkflows = workflows.map((wf, index) => {
      // Generate unique ID if not present
      if (!wf.id) {
        wf.id = `workflow_${index + 1}_${Date.now()}`;
      }

      // Ensure workflow has triggers (default to user_action)
      if (!wf.triggers || wf.triggers.length === 0) {
        wf.triggers = [{ type: 'user_action' }];
      }

      // Ensure workflow has events config
      if (!wf.events) {
        wf.events = { emits: [], listensTo: [] };
      }

      // Mark sub-workflows
      if (wf.isSubWorkflow === undefined) {
        wf.isSubWorkflow = false;
      }

      // Add metadata
      wf.multiWorkflowEnabled = true;
      wf.combineStrategy = 'multi-workflow';

      return wf;
    });

    // Apply workflow connections from the plan
    if (workflowConnections && workflowConnections.length > 0) {
      this.applyWorkflowConnections(processedWorkflows, workflowConnections);
    }

    // Identify main workflow(s) vs sub-workflows
    const mainWorkflows = processedWorkflows.filter(wf => !wf.isSubWorkflow);
    const subWorkflows = processedWorkflows.filter(wf => wf.isSubWorkflow);

    console.log('[ExpertCombiner] Multi-workflow result:', {
      total: processedWorkflows.length,
      main: mainWorkflows.length,
      sub: subWorkflows.length,
      connections: workflowConnections.length
    });

    // Return as a multi-workflow package
    return {
      isMultiWorkflow: true,
      workflows: processedWorkflows,
      connections: workflowConnections,
      mainWorkflows: mainWorkflows.map(wf => wf.id || wf.name),
      subWorkflows: subWorkflows.map(wf => wf.id || wf.name),
      combineStrategy: 'multi-workflow'
    };
  }

  /**
   * Apply workflow connections to workflows
   * Updates triggers, events, and sub-workflow flags based on connections
   */
  static applyWorkflowConnections(workflows, connections) {
    const workflowMap = new Map();
    workflows.forEach(wf => {
      workflowMap.set(wf.name, wf);
      if (wf.id) workflowMap.set(wf.id, wf);
    });

    connections.forEach(conn => {
      const sourceWf = workflowMap.get(conn.source);
      const targetWf = workflowMap.get(conn.target);

      if (!sourceWf || !targetWf) {
        console.warn('[ExpertCombiner] Connection references unknown workflow:', conn);
        return;
      }

      if (conn.via === 'event' && conn.event) {
        // Event-based connection
        // Source workflow emits the event
        if (!sourceWf.events.emits.includes(conn.event)) {
          sourceWf.events.emits.push(conn.event);
        }

        // Target workflow listens to the event
        if (!targetWf.events.listensTo.includes(conn.event)) {
          targetWf.events.listensTo.push(conn.event);
        }

        // Add event trigger to target if not present
        const hasEventTrigger = targetWf.triggers.some(
          t => t.type === 'event' && t.event === conn.event
        );
        if (!hasEventTrigger) {
          targetWf.triggers.push({ type: 'event', event: conn.event });
        }

      } else if (conn.via === 'direct_call') {
        // Direct call connection - target is a sub-workflow
        targetWf.isSubWorkflow = true;

        // Add direct_call trigger to target if not present
        const hasDirectCallTrigger = targetWf.triggers.some(
          t => t.type === 'direct_call'
        );
        if (!hasDirectCallTrigger) {
          targetWf.triggers.push({ type: 'direct_call' });
        }

        // Track which workflows call this sub-workflow
        if (!targetWf.calledBy) {
          targetWf.calledBy = [];
        }
        if (!targetWf.calledBy.includes(sourceWf.name)) {
          targetWf.calledBy.push(sourceWf.name);
        }

        // Track which sub-workflows this workflow calls
        if (!sourceWf.callsSubWorkflows) {
          sourceWf.callsSubWorkflows = [];
        }
        if (!sourceWf.callsSubWorkflows.includes(targetWf.name)) {
          sourceWf.callsSubWorkflows.push(targetWf.name);
        }
      }
    });
  }

  /**
   * Select the best workflow based on criteria
   */
  static selectBestWorkflow(workflows, routing) {
    if (workflows.length === 1) return workflows[0];

    // Score each workflow
    const scored = workflows.map(wf => ({
      workflow: wf,
      score: this.scoreWorkflow(wf, routing)
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored[0].workflow;
  }

  /**
   * Score a workflow based on various criteria
   */
  static scoreWorkflow(workflow, routing) {
    let score = 0;

    // Complexity match
    if (workflow.complexity === routing?.complexity?.workflow) {
      score += 30;
    }

    // Domain match
    if (workflow.domain === routing?.domain) {
      score += 25;
    }

    // Node count appropriateness
    const nodeCount = workflow.nodes?.length || 0;
    if (routing?.complexity?.workflow === 'simple' && nodeCount <= 5) score += 20;
    if (routing?.complexity?.workflow === 'medium' && nodeCount >= 4 && nodeCount <= 10) score += 20;
    if (routing?.complexity?.workflow === 'complex' && nodeCount >= 8) score += 20;

    // Connection logic
    const connectionCount = workflow.connections?.length || 0;
    if (connectionCount > 0) score += 15;

    // Has proper start and end
    const hasStart = workflow.nodes?.some(n => n.type === 'startProcess');
    const hasEnd = workflow.nodes?.some(n => n.type === 'endEvent');
    if (hasStart && hasEnd) score += 10;

    return score;
  }

  /**
   * Ensemble multiple workflows - merge best parts
   */
  static ensembleWorkflows(workflows, routing) {
    // Use the highest scored workflow as base
    const base = this.selectBestWorkflow(workflows, routing);

    // Extract best nodes from other workflows
    workflows.forEach(wf => {
      if (wf === base) return;

      // Find unique valuable nodes
      wf.nodes?.forEach(node => {
        const exists = base.nodes.some(n =>
          n.type === node.type && n.data?.label === node.data?.label
        );

        if (!exists && this.isValuableNode(node, routing)) {
          base.nodes.push(node);
        }
      });
    });

    base.combinedFrom = workflows.map(wf => wf.expertType).join(', ');
    base.combineStrategy = 'ensemble';

    return base;
  }

  /**
   * Weighted combination based on expert confidence
   */
  static weightedCombine(workflows, routing) {
    // For now, use ensemble strategy
    // In production, you could weight based on past performance
    return this.ensembleWorkflows(workflows, routing);
  }

  /**
   * Check if a node is valuable to add
   */
  static isValuableNode(node, routing) {
    // Always valuable: validations, notifications
    if (node.type === 'validation' || node.type === 'notification') {
      return true;
    }

    // Domain-specific valuable nodes
    if (routing?.domain === 'approval' && node.type === 'decision') {
      return true;
    }

    return false;
  }

  /**
   * Combine forms from multiple experts
   */
  static combineForms(formsArrays, strategy = 'best-only') {
    if (!formsArrays || formsArrays.length === 0) return [];
    if (formsArrays.length === 1) return formsArrays[0].forms || formsArrays[0];

    if (strategy === 'best-only') {
      // Return forms with most fields
      const sorted = [...formsArrays].sort((a, b) =>
        b.reduce((sum, f) => sum + (f.fields?.length || 0), 0) -
        a.reduce((sum, f) => sum + (f.fields?.length || 0), 0)
      );
      // Still need to deduplicate by id even in best-only
      return this.deduplicateById(sorted[0]);
    }

    // Ensemble: merge unique forms by ID (database requires unique IDs)
    const formsMap = new Map();

    formsArrays.forEach(forms => {
      (forms || []).forEach(form => {
        const formId = form.id;
        if (!formId) {
          // Generate ID if missing
          form.id = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          formsMap.set(form.id, form);
        } else if (!formsMap.has(formId)) {
          formsMap.set(formId, form);
        } else {
          // Keep the more complete version (more fields)
          const existing = formsMap.get(formId);
          if ((form.fields?.length || 0) > (existing.fields?.length || 0)) {
            formsMap.set(formId, form);
          }
        }
      });
    });

    return Array.from(formsMap.values());
  }

  /**
   * Deduplicate array by id field
   */
  static deduplicateById(items) {
    if (!items || !Array.isArray(items)) return items;
    const seen = new Map();
    for (const item of items) {
      if (!item.id) {
        item.id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      if (!seen.has(item.id)) {
        seen.set(item.id, item);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Combine data models from multiple experts
   */
  static combineDataModels(dataModelsArrays, strategy = 'best-only') {
    if (!dataModelsArrays || dataModelsArrays.length === 0) return [];
    if (dataModelsArrays.length === 1) {
      // Still need to deduplicate by id even for single array
      return this.deduplicateById(dataModelsArrays[0]);
    }

    if (strategy === 'best-only') {
      // Return most comprehensive models, deduplicated by id
      const sorted = [...dataModelsArrays].sort((a, b) =>
        b.reduce((sum, dm) => sum + (dm.fields?.length || 0), 0) -
        a.reduce((sum, dm) => sum + (dm.fields?.length || 0), 0)
      );
      return this.deduplicateById(sorted[0]);
    }

    // Ensemble: merge models by ID first (database constraint), then by name for merging fields
    const modelsById = new Map();  // For database uniqueness
    const modelsByName = new Map(); // For logical merging

    dataModelsArrays.forEach(models => {
      (models || []).forEach(model => {
        // Ensure model has an id
        if (!model.id) {
          model.id = model.name || `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Check by ID first (database constraint)
        if (modelsById.has(model.id)) {
          // Same ID - merge fields into existing
          const existing = modelsById.get(model.id);
          model.fields?.forEach(field => {
            if (!existing.fields?.some(f => f.name === field.name)) {
              existing.fields = existing.fields || [];
              existing.fields.push(field);
            }
          });
        } else if (modelsByName.has(model.name)) {
          // Same name but different ID - merge into name-matched model, discard this ID
          const existing = modelsByName.get(model.name);
          model.fields?.forEach(field => {
            if (!existing.fields?.some(f => f.name === field.name)) {
              existing.fields = existing.fields || [];
              existing.fields.push(field);
            }
          });
          console.log(`[ExpertCombiner] Merged duplicate data model "${model.name}" (id: ${model.id} -> ${existing.id})`);
        } else {
          // New model
          modelsById.set(model.id, model);
          modelsByName.set(model.name, model);
        }
      });
    });

    return Array.from(modelsById.values());
  }

  /**
   * Combine mobile UI from multiple experts
   */
  static combineMobileUI(mobileUIArrays, strategy = 'best-only') {
    if (!mobileUIArrays || mobileUIArrays.length === 0) {
      return { screens: [], navigation: null };
    }
    if (mobileUIArrays.length === 1) return mobileUIArrays[0];

    if (strategy === 'best-only') {
      // Return UI with most screens
      const sorted = [...mobileUIArrays].sort((a, b) =>
        (b.screens?.length || 0) - (a.screens?.length || 0)
      );
      return sorted[0];
    }

    // Ensemble: merge unique screens
    const screens = [];
    const seen = new Set();

    mobileUIArrays.forEach(ui => {
      ui.screens?.forEach(screen => {
        if (!seen.has(screen.workflowNodeId || screen.name)) {
          screens.push(screen);
          seen.add(screen.workflowNodeId || screen.name);
        }
      });
    });

    return {
      screens,
      navigation: mobileUIArrays[0].navigation // Use first navigation
    };
  }

  /**
   * NEW: Combine pages with multi-workflow support
   * Each page can reference specific workflows it interacts with
   */
  static combinePages(pagesArrays, workflowNames = [], strategy = 'best-only') {
    if (!pagesArrays || pagesArrays.length === 0) return [];
    if (pagesArrays.length === 1) {
      // Still need to deduplicate by id
      return this.deduplicateById(pagesArrays[0]);
    }

    if (strategy === 'best-only') {
      // Return pages with most components, deduplicated by id
      const sorted = [...pagesArrays].sort((a, b) =>
        b.reduce((sum, p) => sum + (p.components?.length || 0), 0) -
        a.reduce((sum, p) => sum + (p.components?.length || 0), 0)
      );
      return this.deduplicateById(sorted[0]);
    }

    // Ensemble: merge unique pages by ID (database requires unique IDs)
    const pagesMap = new Map();

    pagesArrays.forEach(pages => {
      (pages || []).forEach(page => {
        // Ensure page has an id
        if (!page.id) {
          page.id = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        if (!pagesMap.has(page.id)) {
          // Tag page with associated workflows if not already done
          if (!page.workflows && workflowNames.length > 0) {
            page.workflows = workflowNames;
          }
          pagesMap.set(page.id, page);
        } else {
          // Same ID - keep the more complete version (more components)
          const existing = pagesMap.get(page.id);
          if ((page.components?.length || 0) > (existing.components?.length || 0)) {
            if (!page.workflows && workflowNames.length > 0) {
              page.workflows = workflowNames;
            }
            pagesMap.set(page.id, page);
          }
        }
      });
    });

    return Array.from(pagesMap.values());
  }

  /**
   * NEW: Combine complete application with multi-workflow support
   * This is the main entry point for combining all expert outputs
   */
  static combineApplication(expertOutputs, componentPlan) {
    const isMultiWorkflow = componentPlan?.workflowConnections?.length > 0 ||
      expertOutputs.workflows?.length > 1;

    const strategy = isMultiWorkflow ? 'multi-workflow' : 'best-only';

    console.log('[ExpertCombiner] Combining application with strategy:', strategy);

    // Combine workflows
    const combinedWorkflows = this.combineWorkflows(
      expertOutputs.workflows || [],
      strategy,
      componentPlan?.routing,
      componentPlan?.workflowConnections || []
    );

    // Combine data models
    const combinedDataModels = this.combineDataModels(
      expertOutputs.dataModels ? [expertOutputs.dataModels] : [],
      strategy
    );

    // Combine forms
    const combinedForms = this.combineForms(
      expertOutputs.forms ? [expertOutputs.forms] : [],
      strategy
    );

    // Get workflow names for page association
    const workflowNames = isMultiWorkflow && combinedWorkflows.workflows
      ? combinedWorkflows.workflows.map(wf => wf.name)
      : [combinedWorkflows.name].filter(Boolean);

    // Combine pages with workflow associations
    const combinedPages = this.combinePages(
      expertOutputs.pages ? [expertOutputs.pages] : [],
      workflowNames,
      strategy
    );

    // Combine mobile UI
    const combinedMobileUI = this.combineMobileUI(
      expertOutputs.mobileUI ? [expertOutputs.mobileUI] : [],
      strategy
    );

    return {
      isMultiWorkflow,
      workflows: combinedWorkflows,
      dataModels: combinedDataModels,
      forms: combinedForms,
      pages: combinedPages,
      mobileUI: combinedMobileUI,
      combineStrategy: strategy,
      overview: componentPlan?.overview || null
    };
  }

  /**
   * NEW: Extract workflow connections from component plan
   */
  static extractWorkflowConnections(componentPlan) {
    if (!componentPlan || !componentPlan.workflowConnections) {
      return [];
    }

    return componentPlan.workflowConnections.map(conn => ({
      source: conn.source,
      target: conn.target,
      via: conn.via || 'event',
      event: conn.event || null
    }));
  }

  /**
   * NEW: Validate multi-workflow structure
   */
  static validateMultiWorkflow(workflows, connections) {
    const issues = [];
    const workflowNames = new Set(workflows.map(wf => wf.name));

    // Check all connections reference valid workflows
    connections.forEach((conn, index) => {
      if (!workflowNames.has(conn.source)) {
        issues.push(`Connection ${index}: source "${conn.source}" not found`);
      }
      if (!workflowNames.has(conn.target)) {
        issues.push(`Connection ${index}: target "${conn.target}" not found`);
      }
      if (conn.via === 'event' && !conn.event) {
        issues.push(`Connection ${index}: event connection missing event name`);
      }
    });

    // Check for circular dependencies in direct calls
    const directCallGraph = new Map();
    connections.filter(c => c.via === 'direct_call').forEach(conn => {
      if (!directCallGraph.has(conn.source)) {
        directCallGraph.set(conn.source, []);
      }
      directCallGraph.get(conn.source).push(conn.target);
    });

    const visited = new Set();
    const recursionStack = new Set();

    const hasCycle = (node) => {
      if (recursionStack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const neighbors = directCallGraph.get(node) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) return true;
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of directCallGraph.keys()) {
      if (hasCycle(node)) {
        issues.push(`Circular dependency detected involving workflow "${node}"`);
        break;
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

module.exports = ExpertCombiner;
