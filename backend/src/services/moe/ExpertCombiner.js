/**
 * ExpertCombiner - Merges outputs from multiple experts using various strategies
 */

class ExpertCombiner {
  /**
   * Combine outputs from multiple workflow experts
   */
  static combineWorkflows(workflows, strategy = 'best-only', routing) {
    if (!workflows || workflows.length === 0) {
      throw new Error('No workflows to combine');
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
    if (workflow.complexity === routing.complexity.workflow) {
      score += 30;
    }

    // Domain match
    if (workflow.domain === routing.domain) {
      score += 25;
    }

    // Node count appropriateness
    const nodeCount = workflow.nodes?.length || 0;
    if (routing.complexity.workflow === 'simple' && nodeCount <= 5) score += 20;
    if (routing.complexity.workflow === 'medium' && nodeCount >= 4 && nodeCount <= 10) score += 20;
    if (routing.complexity.workflow === 'complex' && nodeCount >= 8) score += 20;

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
    if (routing.domain === 'approval' && node.type === 'decision') {
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
        b.reduce((sum, f) => sum + f.fields.length, 0) -
        a.reduce((sum, f) => sum + f.fields.length, 0)
      );
      return sorted[0];
    }

    // Ensemble: merge unique forms
    const allForms = [];
    const seen = new Set();

    formsArrays.forEach(forms => {
      forms.forEach(form => {
        if (!seen.has(form.nodeId)) {
          allForms.push(form);
          seen.add(form.nodeId);
        }
      });
    });

    return allForms;
  }

  /**
   * Combine data models from multiple experts
   */
  static combineDataModels(dataModelsArrays, strategy = 'best-only') {
    if (!dataModelsArrays || dataModelsArrays.length === 0) return [];
    if (dataModelsArrays.length === 1) return dataModelsArrays[0];

    if (strategy === 'best-only') {
      // Return most comprehensive models
      const sorted = [...dataModelsArrays].sort((a, b) =>
        b.reduce((sum, dm) => sum + dm.fields.length, 0) -
        a.reduce((sum, dm) => sum + dm.fields.length, 0)
      );
      return sorted[0];
    }

    // Ensemble: merge models by name
    const modelsMap = new Map();

    dataModelsArrays.forEach(models => {
      models.forEach(model => {
        if (!modelsMap.has(model.name)) {
          modelsMap.set(model.name, model);
        } else {
          // Merge fields
          const existing = modelsMap.get(model.name);
          model.fields.forEach(field => {
            if (!existing.fields.some(f => f.name === field.name)) {
              existing.fields.push(field);
            }
          });
        }
      });
    });

    return Array.from(modelsMap.values());
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
}

module.exports = ExpertCombiner;
