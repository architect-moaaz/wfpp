/**
 * SafeConditionEvaluator - Safe condition evaluation without eval()
 *
 * Supports both structured conditions and simple expression parsing.
 * Based on RulesEngineEnforcer pattern.
 */

class SafeConditionEvaluator {
  constructor() {
    this.operatorMap = {
      '===': 'strictEquals',
      '==': 'equals',
      '=': 'equals',
      '!==': 'notEquals',
      '!=': 'notEquals',
      '<>': 'notEquals',
      '>': 'greaterThan',
      '<': 'lessThan',
      '>=': 'greaterThanOrEqual',
      '<=': 'lessThanOrEqual'
    };
  }

  /**
   * Evaluate a condition against variables
   * @param {string|object} condition - Condition to evaluate
   * @param {object} variables - Variables to use in evaluation
   * @returns {boolean} Result of condition evaluation
   */
  evaluate(condition, variables = {}) {
    if (!condition) {
      return true;
    }

    try {
      // Handle structured condition object
      if (typeof condition === 'object' && condition !== null) {
        return this.evaluateStructured(condition, variables);
      }

      // Handle string expression
      if (typeof condition === 'string') {
        return this.evaluateExpression(condition.trim(), variables);
      }

      return Boolean(condition);
    } catch (error) {
      console.error(`[SafeConditionEvaluator] Error evaluating condition:`, error);
      return false;
    }
  }

  /**
   * Evaluate structured condition { field, operator, value }
   */
  evaluateStructured(condition, variables) {
    const { field, operator, value, conditions, logic } = condition;

    // Handle compound conditions (AND/OR groups)
    if (conditions && Array.isArray(conditions)) {
      const logicType = (logic || 'AND').toUpperCase();

      if (logicType === 'AND') {
        return conditions.every(c => this.evaluateStructured(c, variables));
      } else if (logicType === 'OR') {
        return conditions.some(c => this.evaluateStructured(c, variables));
      }
    }

    // Simple condition
    if (!field || !operator) {
      console.warn('[SafeConditionEvaluator] Missing field or operator in structured condition');
      return false;
    }

    const fieldValue = this.getNestedValue(variables, field);
    const resolvedValue = this.resolveValue(value, variables);

    return this.compareValues(fieldValue, operator, resolvedValue);
  }

  /**
   * Evaluate string expression like "amount > 1000" or "status == 'approved'"
   */
  evaluateExpression(expression, variables) {
    if (!expression || expression.trim() === '') {
      return true;
    }

    // Try to parse as a simple comparison expression
    const parsed = this.parseSimpleExpression(expression);

    if (parsed) {
      const fieldValue = this.getNestedValue(variables, parsed.field);
      return this.compareValues(fieldValue, parsed.operator, parsed.value);
    }

    // Try compound expressions with AND/OR
    const compoundResult = this.evaluateCompoundExpression(expression, variables);
    if (compoundResult !== null) {
      return compoundResult;
    }

    // Handle simple boolean variable references
    const boolValue = this.getNestedValue(variables, expression);
    if (boolValue !== undefined) {
      return Boolean(boolValue);
    }

    console.warn(`[SafeConditionEvaluator] Could not parse expression: ${expression}`);
    return false;
  }

  /**
   * Parse simple expression like "amount > 1000" or "status == 'approved'"
   */
  parseSimpleExpression(expression) {
    // Match patterns: field operator value
    // Operators: ===, ==, !==, !=, >=, <=, >, <, =
    const operatorPattern = /^(.+?)\s*(===|!==|==|!=|>=|<=|>|<|=|<>)\s*(.+)$/;
    const match = expression.match(operatorPattern);

    if (!match) {
      return null;
    }

    const [, fieldPart, operator, valuePart] = match;
    const field = fieldPart.trim();
    let value = valuePart.trim();

    // Parse the value
    value = this.parseValue(value);

    // Map operator to internal name
    const operatorName = this.operatorMap[operator] || operator;

    return { field, operator: operatorName, value };
  }

  /**
   * Evaluate compound expressions with AND/OR
   */
  evaluateCompoundExpression(expression, variables) {
    // Check for AND
    if (expression.includes(' AND ') || expression.includes(' && ')) {
      const parts = expression.split(/\s+(?:AND|&&)\s+/i);
      return parts.every(part => this.evaluateExpression(part.trim(), variables));
    }

    // Check for OR
    if (expression.includes(' OR ') || expression.includes(' || ')) {
      const parts = expression.split(/\s+(?:OR|\|\|)\s+/i);
      return parts.some(part => this.evaluateExpression(part.trim(), variables));
    }

    return null;
  }

  /**
   * Parse a value from string representation
   */
  parseValue(valueStr) {
    // Remove quotes for string literals
    if ((valueStr.startsWith("'") && valueStr.endsWith("'")) ||
        (valueStr.startsWith('"') && valueStr.endsWith('"'))) {
      return valueStr.slice(1, -1);
    }

    // Parse boolean
    if (valueStr.toLowerCase() === 'true') return true;
    if (valueStr.toLowerCase() === 'false') return false;

    // Parse null/undefined
    if (valueStr.toLowerCase() === 'null') return null;
    if (valueStr.toLowerCase() === 'undefined') return undefined;

    // Parse number
    const num = Number(valueStr);
    if (!isNaN(num)) return num;

    // Return as string
    return valueStr;
  }

  /**
   * Compare values with operator - based on RulesEngineEnforcer pattern
   */
  compareValues(fieldValue, operator, comparisonValue) {
    switch (operator) {
      case 'equals':
      case 'eq':
        return fieldValue == comparisonValue;

      case 'notEquals':
      case 'neq':
        return fieldValue != comparisonValue;

      case 'strictEquals':
        return fieldValue === comparisonValue;

      case 'greaterThan':
      case 'gt':
        return Number(fieldValue) > Number(comparisonValue);

      case 'lessThan':
      case 'lt':
        return Number(fieldValue) < Number(comparisonValue);

      case 'greaterThanOrEqual':
      case 'gte':
        return Number(fieldValue) >= Number(comparisonValue);

      case 'lessThanOrEqual':
      case 'lte':
        return Number(fieldValue) <= Number(comparisonValue);

      case 'contains':
        return String(fieldValue).includes(String(comparisonValue));

      case 'notContains':
        return !String(fieldValue).includes(String(comparisonValue));

      case 'startsWith':
        return String(fieldValue).startsWith(String(comparisonValue));

      case 'endsWith':
        return String(fieldValue).endsWith(String(comparisonValue));

      case 'matches':
        try {
          return new RegExp(comparisonValue).test(String(fieldValue));
        } catch {
          return false;
        }

      case 'isEmpty':
        return !fieldValue || fieldValue === '' ||
               (Array.isArray(fieldValue) && fieldValue.length === 0);

      case 'isNotEmpty':
        return fieldValue && fieldValue !== '' &&
               (!Array.isArray(fieldValue) || fieldValue.length > 0);

      case 'isNull':
        return fieldValue === null || fieldValue === undefined;

      case 'isNotNull':
        return fieldValue !== null && fieldValue !== undefined;

      case 'in':
        const inArray = Array.isArray(comparisonValue)
          ? comparisonValue
          : String(comparisonValue).split(',').map(v => v.trim());
        return inArray.includes(String(fieldValue));

      case 'notIn':
        const notInArray = Array.isArray(comparisonValue)
          ? comparisonValue
          : String(comparisonValue).split(',').map(v => v.trim());
        return !notInArray.includes(String(fieldValue));

      case 'between':
        if (Array.isArray(comparisonValue) && comparisonValue.length === 2) {
          const num = Number(fieldValue);
          return num >= Number(comparisonValue[0]) && num <= Number(comparisonValue[1]);
        }
        return false;

      case 'isTrue':
        return fieldValue === true || fieldValue === 'true' || fieldValue === 1;

      case 'isFalse':
        return fieldValue === false || fieldValue === 'false' || fieldValue === 0;

      default:
        console.warn(`[SafeConditionEvaluator] Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Resolve a value that might be a variable reference
   */
  resolveValue(value, context) {
    if (typeof value !== 'string') {
      return value;
    }

    // Check for variable reference (${varName} or {{varName}})
    if (value.startsWith('${') && value.endsWith('}')) {
      const varPath = value.slice(2, -1);
      return this.getNestedValue(context, varPath);
    }

    if (value.startsWith('{{') && value.endsWith('}}')) {
      const varPath = value.slice(2, -2).trim();
      return this.getNestedValue(context, varPath);
    }

    return value;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    if (!path || !obj) return undefined;

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
   * Evaluate gateway conditions and return decision
   * @param {object} node - Gateway node with conditions
   * @param {object} variables - Process data variables
   * @param {array} outgoingFlows - Outgoing connection flows
   * @returns {object} Decision result with path selection
   */
  evaluateGatewayConditions(node, variables, outgoingFlows = []) {
    const taskData = node.data || {};
    const gatewayType = taskData.gatewayType || 'exclusive';

    // If there's a simple condition on the node
    if (taskData.condition) {
      const result = this.evaluate(taskData.condition, variables);
      return {
        gatewayType,
        decision: result ? 'approved' : 'rejected',
        conditionResult: result,
        condition: taskData.condition
      };
    }

    // Evaluate flow conditions to find matching paths
    const matchingFlows = [];
    let defaultFlow = null;

    for (const flow of outgoingFlows) {
      const flowCondition = flow.condition || flow.data?.condition;

      // Track default flow
      if (flow.isDefault || flow.data?.isDefault) {
        defaultFlow = flow;
        continue;
      }

      // No condition means always matches
      if (!flowCondition) {
        matchingFlows.push(flow);
        continue;
      }

      // Evaluate the condition
      if (this.evaluate(flowCondition, variables)) {
        matchingFlows.push(flow);
      }
    }

    // Determine decision based on gateway type
    if (gatewayType === 'exclusive') {
      // XOR: Take first matching flow or default
      const selectedFlow = matchingFlows[0] || defaultFlow;
      return {
        gatewayType,
        decision: selectedFlow ? 'approved' : 'rejected',
        selectedFlow: selectedFlow?.id || selectedFlow?.target,
        conditionResult: matchingFlows.length > 0,
        matchingFlows: matchingFlows.map(f => f.id || f.target)
      };
    } else if (gatewayType === 'parallel') {
      // AND: All paths are taken
      return {
        gatewayType,
        decision: 'approved',
        selectedFlows: outgoingFlows.map(f => f.id || f.target),
        conditionResult: true
      };
    } else if (gatewayType === 'inclusive') {
      // OR: All matching paths are taken
      const flows = matchingFlows.length > 0 ? matchingFlows : (defaultFlow ? [defaultFlow] : []);
      return {
        gatewayType,
        decision: flows.length > 0 ? 'approved' : 'rejected',
        selectedFlows: flows.map(f => f.id || f.target),
        conditionResult: matchingFlows.length > 0,
        matchingFlows: matchingFlows.map(f => f.id || f.target)
      };
    }

    // Default fallback
    return {
      gatewayType,
      decision: 'approved',
      conditionResult: true
    };
  }
}

module.exports = SafeConditionEvaluator;
