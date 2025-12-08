/**
 * RulesEvaluator
 *
 * Enhanced rule evaluation engine with:
 * - Computational graph-based execution ordering
 * - Parallel execution of independent rules
 * - Execution tracing and context tracking
 * - Rule cascading support
 */

const ComputationalGraphEngine = require('./ComputationalGraphEngine');
const RuleService = require('./RuleService');

class RulesEvaluator {
  constructor() {
    this.graphEngine = new ComputationalGraphEngine();
    this.ruleService = new RuleService();
  }

  /**
   * Evaluate all rules for an application with optimal execution order
   */
  async evaluateApplicationRules(applicationId, initialContext = {}) {
    try {
      // Load all active rules for the application
      const rulesResult = await this.ruleService.getRulesByApplication(applicationId, {
        is_active: true
      });

      if (!rulesResult.success) {
        throw new Error(rulesResult.error || 'Failed to load rules');
      }

      const rules = rulesResult.rules || [];

      if (rules.length === 0) {
        return {
          success: true,
          message: 'No active rules to evaluate',
          executionTrace: [],
          finalContext: initialContext
        };
      }

      // Build computational graph
      const graphResult = this.graphEngine.buildGraph(rules);

      // Check for circular dependencies
      const cycles = this.graphEngine.detectCircularDependencies();
      if (cycles.length > 0) {
        return {
          success: false,
          error: 'Circular dependencies detected',
          cycles,
          executionTrace: []
        };
      }

      // Execute rules level by level
      const executionResult = await this.executeRulesInOrder(
        graphResult.executionOrder,
        rules,
        initialContext
      );

      return {
        success: true,
        executionTrace: executionResult.trace,
        finalContext: executionResult.context,
        statistics: {
          totalRules: rules.length,
          rulesExecuted: executionResult.trace.filter(t => t.executed).length,
          rulesFired: executionResult.trace.filter(t => t.fired).length,
          executionLevels: graphResult.executionOrder.length,
          criticalPath: this.graphEngine.getCriticalPath()
        },
        graph: graphResult.graph
      };
    } catch (error) {
      console.error('[RulesEvaluator] Error evaluating application rules:', error);
      return {
        success: false,
        error: error.message,
        executionTrace: []
      };
    }
  }

  /**
   * Execute rules in computational graph order
   */
  async executeRulesInOrder(executionOrder, rules, initialContext) {
    const context = { ...initialContext };
    const trace = [];
    const rulesMap = new Map(rules.map(r => [r.id, r]));

    for (const level of executionOrder) {
      const levelStartTime = Date.now();
      const levelRules = level.rules.map(ruleId => rulesMap.get(ruleId));

      // Execute rules at this level (can be parallel if level.parallel is true)
      if (level.parallel && levelRules.length > 1) {
        // Parallel execution
        const levelPromises = levelRules.map(rule =>
          this.executeRule(rule, context)
        );

        const levelResults = await Promise.all(levelPromises);

        // Merge results
        levelResults.forEach((result, index) => {
          const rule = levelRules[index];
          trace.push({
            ruleId: rule.id,
            ruleName: rule.name,
            level: level.level,
            executed: true,
            fired: result.fired,
            conditionsMatched: result.conditionsMatched,
            actionsExecuted: result.actionsExecuted,
            contextChanges: result.contextChanges,
            executionTime: result.executionTime,
            parallel: true
          });

          // Apply context changes
          if (result.fired && result.contextChanges) {
            Object.assign(context, result.contextChanges);
          }
        });
      } else {
        // Sequential execution (for single rule or non-parallel levels)
        for (const rule of levelRules) {
          const result = await this.executeRule(rule, context);

          trace.push({
            ruleId: rule.id,
            ruleName: rule.name,
            level: level.level,
            executed: true,
            fired: result.fired,
            conditionsMatched: result.conditionsMatched,
            actionsExecuted: result.actionsExecuted,
            contextChanges: result.contextChanges,
            executionTime: result.executionTime,
            parallel: false
          });

          // Apply context changes
          if (result.fired && result.contextChanges) {
            Object.assign(context, result.contextChanges);
          }
        }
      }

      const levelEndTime = Date.now();
      console.log(`[RulesEvaluator] Level ${level.level} completed in ${levelEndTime - levelStartTime}ms`);
    }

    return { trace, context };
  }

  /**
   * Execute a single rule with detailed tracking
   */
  async executeRule(rule, context) {
    const startTime = Date.now();
    const contextSnapshot = { ...context };
    const contextChanges = {};

    try {
      // Evaluate conditions
      const conditionsMatched = this.evaluateConditions(rule.conditions, context);

      if (!conditionsMatched) {
        return {
          fired: false,
          conditionsMatched: false,
          actionsExecuted: [],
          contextChanges: null,
          executionTime: Date.now() - startTime
        };
      }

      // Execute actions
      const actionsExecuted = [];

      if (rule.actions && rule.actions.actions) {
        for (const action of rule.actions.actions) {
          const actionResult = await this.executeAction(action, context, contextChanges);
          actionsExecuted.push({
            type: action.type,
            success: actionResult.success,
            params: action.params,
            result: actionResult.result,
            error: actionResult.error
          });

          // Stop workflow if requested
          if (action.type === 'stopWorkflow' && actionResult.success) {
            break;
          }
        }
      }

      return {
        fired: true,
        conditionsMatched: true,
        actionsExecuted,
        contextChanges,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      console.error(`[RulesEvaluator] Error executing rule ${rule.name}:`, error);
      return {
        fired: false,
        conditionsMatched: false,
        actionsExecuted: [],
        contextChanges: null,
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Evaluate rule conditions
   */
  evaluateConditions(conditions, context) {
    if (!conditions) return true;

    // AND logic (all conditions must match)
    if (conditions.all && Array.isArray(conditions.all)) {
      return conditions.all.every(condition =>
        this.evaluateSingleCondition(condition, context)
      );
    }

    // OR logic (any condition must match)
    if (conditions.any && Array.isArray(conditions.any)) {
      return conditions.any.some(condition =>
        this.evaluateSingleCondition(condition, context)
      );
    }

    return false;
  }

  /**
   * Evaluate a single condition
   */
  evaluateSingleCondition(condition, context) {
    const { field, operator, value } = condition;
    const fieldValue = this.getNestedValue(context, field);

    switch (operator) {
      case 'equals':
        return fieldValue == value;

      case 'notEquals':
        return fieldValue != value;

      case 'greaterThan':
        return Number(fieldValue) > Number(value);

      case 'lessThan':
        return Number(fieldValue) < Number(value);

      case 'greaterThanOrEqual':
        return Number(fieldValue) >= Number(value);

      case 'lessThanOrEqual':
        return Number(fieldValue) <= Number(value);

      case 'contains':
        return String(fieldValue).includes(String(value));

      case 'notContains':
        return !String(fieldValue).includes(String(value));

      case 'startsWith':
        return String(fieldValue).startsWith(String(value));

      case 'endsWith':
        return String(fieldValue).endsWith(String(value));

      case 'isEmpty':
        return !fieldValue || fieldValue === '' ||
               (Array.isArray(fieldValue) && fieldValue.length === 0);

      case 'isNotEmpty':
        return fieldValue && fieldValue !== '' &&
               (!Array.isArray(fieldValue) || fieldValue.length > 0);

      case 'in':
        const valueArray = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
        return valueArray.includes(String(fieldValue));

      case 'notIn':
        const notInArray = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
        return !notInArray.includes(String(fieldValue));

      default:
        console.warn(`[RulesEvaluator] Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Execute a single action
   */
  async executeAction(action, context, contextChanges) {
    try {
      switch (action.type) {
        case 'setVariable':
          return this.executeSetVariable(action, context, contextChanges);

        case 'sendEmail':
          return this.executeSendEmail(action, context);

        case 'sendNotification':
          return this.executeSendNotification(action, context);

        case 'callWebhook':
          return this.executeCallWebhook(action, context);

        case 'updateRecord':
          return this.executeUpdateRecord(action, context);

        case 'createRecord':
          return this.executeCreateRecord(action, context);

        case 'log':
          return this.executeLog(action, context);

        case 'stopWorkflow':
          return this.executeStopWorkflow(action, context);

        case 'throwError':
          return this.executeThrowError(action, context);

        default:
          return {
            success: false,
            error: `Unknown action type: ${action.type}`
          };
      }
    } catch (error) {
      console.error(`[RulesEvaluator] Error executing action ${action.type}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Set variable action
   */
  executeSetVariable(action, context, contextChanges) {
    const { name, value } = action.params || {};

    if (!name) {
      return { success: false, error: 'Variable name is required' };
    }

    // Interpolate value if it contains variables
    const interpolatedValue = this.interpolateValue(value, context);

    // Set in both context and track changes
    context[name] = interpolatedValue;
    contextChanges[name] = interpolatedValue;

    return {
      success: true,
      result: { name, value: interpolatedValue }
    };
  }

  /**
   * Send email action (simulated for now)
   */
  executeSendEmail(action, context) {
    const { to, subject, body } = action.params || {};

    console.log('[RulesEvaluator] Send Email:', {
      to: this.interpolateValue(to, context),
      subject: this.interpolateValue(subject, context),
      body: this.interpolateValue(body, context)
    });

    return {
      success: true,
      result: { sent: true }
    };
  }

  /**
   * Send notification action (simulated for now)
   */
  executeSendNotification(action, context) {
    const { message, notificationType } = action.params || {};

    console.log('[RulesEvaluator] Send Notification:', {
      message: this.interpolateValue(message, context),
      type: notificationType || 'info'
    });

    return {
      success: true,
      result: { sent: true }
    };
  }

  /**
   * Call webhook action (simulated for now)
   */
  async executeCallWebhook(action, context) {
    const { url, method, body } = action.params || {};

    console.log('[RulesEvaluator] Call Webhook:', {
      url: this.interpolateValue(url, context),
      method: method || 'POST',
      body: this.interpolateValue(body, context)
    });

    // In a real implementation, this would make an HTTP request
    return {
      success: true,
      result: { called: true }
    };
  }

  /**
   * Update record action (simulated for now)
   */
  async executeUpdateRecord(action, context) {
    const { recordId, updates } = action.params || {};

    console.log('[RulesEvaluator] Update Record:', {
      recordId: this.interpolateValue(recordId, context),
      updates
    });

    return {
      success: true,
      result: { updated: true }
    };
  }

  /**
   * Create record action (simulated for now)
   */
  async executeCreateRecord(action, context) {
    const { recordType, data } = action.params || {};

    console.log('[RulesEvaluator] Create Record:', {
      recordType,
      data
    });

    return {
      success: true,
      result: { created: true, id: `record_${Date.now()}` }
    };
  }

  /**
   * Log action
   */
  executeLog(action, context) {
    const { message, level } = action.params || {};
    const interpolatedMessage = this.interpolateValue(message, context);

    const logLevel = level || 'info';
    console.log(`[RulesEvaluator] [${logLevel.toUpperCase()}] ${interpolatedMessage}`);

    return {
      success: true,
      result: { logged: true, message: interpolatedMessage }
    };
  }

  /**
   * Stop workflow action
   */
  executeStopWorkflow(action, context) {
    const { reason } = action.params || {};

    console.log('[RulesEvaluator] Stop Workflow:', {
      reason: this.interpolateValue(reason, context)
    });

    return {
      success: true,
      result: { stopped: true }
    };
  }

  /**
   * Throw error action
   */
  executeThrowError(action, context) {
    const { message } = action.params || {};
    const errorMessage = this.interpolateValue(message, context) || 'Rule error';

    throw new Error(errorMessage);
  }

  /**
   * Interpolate variables in value strings (e.g., "Hello {{name}}")
   */
  interpolateValue(value, context) {
    if (typeof value !== 'string') {
      return value;
    }

    return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const varValue = this.getNestedValue(context, varName.trim());
      return varValue !== undefined ? varValue : match;
    });
  }

  /**
   * Get nested value from context (e.g., "user.profile.name")
   */
  getNestedValue(obj, path) {
    if (!path) return undefined;

    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Evaluate rules for a specific workflow node
   */
  async evaluateNodeRules(nodeId, context = {}) {
    try {
      const rulesResult = await this.ruleService.getRulesByNode(nodeId);

      if (!rulesResult.success) {
        throw new Error(rulesResult.error || 'Failed to load node rules');
      }

      const rules = rulesResult.rules || [];

      if (rules.length === 0) {
        return {
          success: true,
          message: 'No rules attached to this node',
          executionTrace: [],
          finalContext: context
        };
      }

      // Build computational graph for node rules
      const graphResult = this.graphEngine.buildGraph(rules);

      // Execute rules
      const executionResult = await this.executeRulesInOrder(
        graphResult.executionOrder,
        rules,
        context
      );

      return {
        success: true,
        executionTrace: executionResult.trace,
        finalContext: executionResult.context,
        statistics: {
          totalRules: rules.length,
          rulesExecuted: executionResult.trace.filter(t => t.executed).length,
          rulesFired: executionResult.trace.filter(t => t.fired).length
        }
      };
    } catch (error) {
      console.error('[RulesEvaluator] Error evaluating node rules:', error);
      return {
        success: false,
        error: error.message,
        executionTrace: []
      };
    }
  }

  /**
   * Get execution insights and recommendations
   */
  getExecutionInsights(executionTrace) {
    const insights = [];

    // Find rules that never fired
    const neverFiredRules = executionTrace.filter(t => t.executed && !t.fired);
    if (neverFiredRules.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Rules Never Fired',
        description: `${neverFiredRules.length} rules were evaluated but their conditions never matched`,
        rules: neverFiredRules.map(r => r.ruleName)
      });
    }

    // Find slow-executing rules
    const slowRules = executionTrace
      .filter(t => t.executionTime > 100)
      .sort((a, b) => b.executionTime - a.executionTime);

    if (slowRules.length > 0) {
      insights.push({
        type: 'performance',
        title: 'Slow Rule Execution',
        description: `${slowRules.length} rules took more than 100ms to execute`,
        rules: slowRules.map(r => ({
          name: r.ruleName,
          executionTime: r.executionTime
        }))
      });
    }

    // Calculate parallelization opportunities
    const parallelExecutions = executionTrace.filter(t => t.parallel);
    if (parallelExecutions.length > 0) {
      insights.push({
        type: 'success',
        title: 'Parallel Execution',
        description: `${parallelExecutions.length} rules executed in parallel, improving performance`,
        count: parallelExecutions.length
      });
    }

    return insights;
  }
}

module.exports = RulesEvaluator;
