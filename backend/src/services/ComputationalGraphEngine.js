/**
 * ComputationalGraphEngine
 *
 * Analyzes rule dependencies and creates a computational graph for optimal execution
 * Handles parallel execution where possible and manages rule cascading
 */

class ComputationalGraphEngine {
  constructor() {
    this.graph = new Map(); // ruleId -> { rule, dependencies, dependents }
    this.executionOrder = [];
  }

  /**
   * Build computational graph from rules
   */
  buildGraph(rules) {
    this.graph.clear();
    this.executionOrder = [];

    // Initialize nodes
    rules.forEach(rule => {
      this.graph.set(rule.id, {
        rule,
        dependencies: new Set(),
        dependents: new Set(),
        level: 0 // Execution level (0 = can run first)
      });
    });

    // Analyze dependencies
    rules.forEach(rule => {
      this.analyzeDependencies(rule, rules);
    });

    // Calculate execution levels
    this.calculateExecutionLevels();

    // Generate execution order
    this.generateExecutionOrder();

    return {
      graph: this.serializeGraph(),
      executionOrder: this.executionOrder,
      levels: this.getExecutionLevels()
    };
  }

  /**
   * Analyze dependencies between rules
   * A rule depends on another if:
   * 1. It reads a variable that another rule writes
   * 2. It has explicit dependencies in metadata
   */
  analyzeDependencies(rule, allRules) {
    const node = this.graph.get(rule.id);
    const writtenVars = this.extractWrittenVariables(rule);
    const readVars = this.extractReadVariables(rule);

    allRules.forEach(otherRule => {
      if (rule.id === otherRule.id) return;

      const otherWrittenVars = this.extractWrittenVariables(otherRule);

      // Check if this rule reads variables written by other rule
      const hasDataDependency = readVars.some(readVar =>
        otherWrittenVars.has(readVar)
      );

      if (hasDataDependency) {
        node.dependencies.add(otherRule.id);
        this.graph.get(otherRule.id).dependents.add(rule.id);
      }

      // Check explicit dependencies
      if (rule.metadata?.dependencies?.includes(otherRule.id)) {
        node.dependencies.add(otherRule.id);
        this.graph.get(otherRule.id).dependents.add(rule.id);
      }
    });
  }

  /**
   * Extract variables written by rule actions
   */
  extractWrittenVariables(rule) {
    const writtenVars = new Set();

    if (rule.actions?.actions) {
      rule.actions.actions.forEach(action => {
        if (action.type === 'setVariable' && action.params?.name) {
          writtenVars.add(action.params.name);
        }
      });
    }

    return writtenVars;
  }

  /**
   * Extract variables read by rule conditions and actions
   */
  extractReadVariables(rule) {
    const readVars = new Set();

    // Extract from conditions
    if (rule.conditions?.all) {
      rule.conditions.all.forEach(condition => {
        if (condition.field) {
          readVars.add(condition.field);
        }
      });
    }

    if (rule.conditions?.any) {
      rule.conditions.any.forEach(condition => {
        if (condition.field) {
          readVars.add(condition.field);
        }
      });
    }

    // Extract from actions (some actions may read variables)
    if (rule.actions?.actions) {
      rule.actions.actions.forEach(action => {
        if (action.params) {
          Object.values(action.params).forEach(value => {
            // Check if value references a variable (e.g., {{variableName}})
            if (typeof value === 'string') {
              const matches = value.match(/\{\{([^}]+)\}\}/g);
              if (matches) {
                matches.forEach(match => {
                  const varName = match.replace(/\{\{|\}\}/g, '').trim();
                  readVars.add(varName);
                });
              }
            }
          });
        }
      });
    }

    return readVars;
  }

  /**
   * Calculate execution levels using topological sort
   */
  calculateExecutionLevels() {
    const visited = new Set();
    const levels = new Map();

    // Helper function for DFS
    const calculateLevel = (ruleId) => {
      if (visited.has(ruleId)) {
        return levels.get(ruleId);
      }

      visited.add(ruleId);
      const node = this.graph.get(ruleId);

      if (node.dependencies.size === 0) {
        levels.set(ruleId, 0);
        node.level = 0;
        return 0;
      }

      let maxDepLevel = -1;
      for (const depId of node.dependencies) {
        const depLevel = calculateLevel(depId);
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }

      const level = maxDepLevel + 1;
      levels.set(ruleId, level);
      node.level = level;
      return level;
    };

    // Calculate level for each rule
    for (const ruleId of this.graph.keys()) {
      calculateLevel(ruleId);
    }
  }

  /**
   * Generate execution order based on levels
   */
  generateExecutionOrder() {
    const levelMap = new Map();

    // Group rules by level
    for (const [ruleId, node] of this.graph.entries()) {
      if (!levelMap.has(node.level)) {
        levelMap.set(node.level, []);
      }
      levelMap.get(node.level).push({
        ruleId,
        priority: node.rule.priority || 0
      });
    }

    // Sort levels
    const sortedLevels = Array.from(levelMap.keys()).sort((a, b) => a - b);

    // Build execution order
    this.executionOrder = [];
    sortedLevels.forEach(level => {
      const rulesAtLevel = levelMap.get(level);
      // Sort by priority within level
      rulesAtLevel.sort((a, b) => b.priority - a.priority);

      this.executionOrder.push({
        level,
        rules: rulesAtLevel.map(r => r.ruleId),
        parallel: true // Rules at same level can execute in parallel
      });
    });
  }

  /**
   * Get execution levels
   */
  getExecutionLevels() {
    const levels = new Map();

    for (const [ruleId, node] of this.graph.entries()) {
      if (!levels.has(node.level)) {
        levels.set(node.level, []);
      }
      levels.get(node.level).push(ruleId);
    }

    return Array.from(levels.entries()).map(([level, rules]) => ({
      level,
      rules
    }));
  }

  /**
   * Serialize graph for visualization
   */
  serializeGraph() {
    const nodes = [];
    const edges = [];

    for (const [ruleId, node] of this.graph.entries()) {
      nodes.push({
        id: ruleId,
        name: node.rule.name,
        type: node.rule.type,
        level: node.level,
        priority: node.rule.priority
      });

      for (const depId of node.dependencies) {
        edges.push({
          source: depId,
          target: ruleId,
          type: 'dependency'
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const detectCycle = (ruleId, path = []) => {
      if (recursionStack.has(ruleId)) {
        // Found a cycle
        const cycleStart = path.indexOf(ruleId);
        cycles.push(path.slice(cycleStart).concat(ruleId));
        return true;
      }

      if (visited.has(ruleId)) {
        return false;
      }

      visited.add(ruleId);
      recursionStack.add(ruleId);
      path.push(ruleId);

      const node = this.graph.get(ruleId);
      for (const depId of node.dependencies) {
        if (detectCycle(depId, [...path])) {
          // Continue checking other dependencies
        }
      }

      recursionStack.delete(ruleId);
      return false;
    };

    for (const ruleId of this.graph.keys()) {
      if (!visited.has(ruleId)) {
        detectCycle(ruleId);
      }
    }

    return cycles;
  }

  /**
   * Get critical path (longest path through the graph)
   */
  getCriticalPath() {
    const distances = new Map();
    const paths = new Map();

    // Initialize
    for (const ruleId of this.graph.keys()) {
      distances.set(ruleId, 0);
      paths.set(ruleId, [ruleId]);
    }

    // Calculate longest paths
    const sortedLevels = this.executionOrder.map(e => e.level).sort((a, b) => a - b);

    sortedLevels.forEach(level => {
      for (const [ruleId, node] of this.graph.entries()) {
        if (node.level === level) {
          for (const depId of node.dependencies) {
            const newDist = distances.get(depId) + 1;
            if (newDist > distances.get(ruleId)) {
              distances.set(ruleId, newDist);
              paths.set(ruleId, [...paths.get(depId), ruleId]);
            }
          }
        }
      }
    });

    // Find maximum distance
    let maxDist = 0;
    let criticalPath = [];

    for (const [ruleId, dist] of distances.entries()) {
      if (dist > maxDist) {
        maxDist = dist;
        criticalPath = paths.get(ruleId);
      }
    }

    return {
      length: maxDist,
      path: criticalPath
    };
  }

  /**
   * Get statistics about the graph
   */
  getStatistics() {
    const totalRules = this.graph.size;
    const totalDependencies = Array.from(this.graph.values())
      .reduce((sum, node) => sum + node.dependencies.size, 0);

    const cycles = this.detectCircularDependencies();
    const criticalPath = this.getCriticalPath();
    const levels = this.getExecutionLevels();

    return {
      totalRules,
      totalDependencies,
      hasCycles: cycles.length > 0,
      cycles,
      criticalPathLength: criticalPath.length,
      criticalPath: criticalPath.path,
      totalLevels: levels.length,
      averageDependenciesPerRule: totalRules > 0 ? totalDependencies / totalRules : 0
    };
  }
}

module.exports = ComputationalGraphEngine;
