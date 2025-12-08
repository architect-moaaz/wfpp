/**
 * RuleService
 *
 * Manages business rules: create, read, update, delete, execute
 * Uses PostgreSQL k1.rules table
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class RuleService {
  /**
   * Create a new rule
   */
  async createRule(ruleData) {
    const {
      application_id,
      workflow_id = null,
      node_id = null,
      name,
      description = '',
      type = 'validation',
      conditions = {},
      actions = {},
      priority = 0,
      is_active = true,
      metadata = {}
    } = ruleData;

    const id = `rule_${Date.now()}`;

    try {
      const result = await db.query(
        `INSERT INTO k1.rules (
          id, application_id, workflow_id, node_id, name, description,
          type, conditions, actions, priority, is_active, metadata,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *`,
        [
          id,
          application_id,
          workflow_id,
          node_id,
          name,
          description,
          type,
          JSON.stringify(conditions),
          JSON.stringify(actions),
          priority,
          is_active,
          JSON.stringify(metadata)
        ]
      );

      return {
        success: true,
        rule: this.formatRule(result.rows[0])
      };
    } catch (error) {
      console.error('[RuleService] Error creating rule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get rule by ID
   */
  async getRuleById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM k1.rules WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Rule not found'
        };
      }

      return {
        success: true,
        rule: this.formatRule(result.rows[0])
      };
    } catch (error) {
      console.error('[RuleService] Error getting rule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all rules for an application
   */
  async getRulesByApplication(applicationId, filters = {}) {
    try {
      let query = 'SELECT * FROM k1.rules WHERE application_id = $1';
      const params = [applicationId];
      let paramIndex = 2;

      // Apply filters
      if (filters.workflow_id) {
        query += ` AND workflow_id = $${paramIndex}`;
        params.push(filters.workflow_id);
        paramIndex++;
      }

      if (filters.node_id) {
        query += ` AND node_id = $${paramIndex}`;
        params.push(filters.node_id);
        paramIndex++;
      }

      if (filters.type) {
        query += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.is_active !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        params.push(filters.is_active);
        paramIndex++;
      }

      query += ' ORDER BY priority DESC, created_at DESC';

      const result = await db.query(query, params);

      return {
        success: true,
        rules: result.rows.map(row => this.formatRule(row)),
        count: result.rows.length
      };
    } catch (error) {
      console.error('[RuleService] Error getting rules:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get rules by workflow ID
   */
  async getRulesByWorkflow(workflowId) {
    try {
      const result = await db.query(
        'SELECT * FROM k1.rules WHERE workflow_id = $1 ORDER BY priority DESC, created_at DESC',
        [workflowId]
      );

      return {
        success: true,
        rules: result.rows.map(row => this.formatRule(row)),
        count: result.rows.length
      };
    } catch (error) {
      console.error('[RuleService] Error getting workflow rules:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get rules by node ID
   */
  async getRulesByNode(nodeId) {
    try {
      const result = await db.query(
        'SELECT * FROM k1.rules WHERE node_id = $1 ORDER BY priority DESC, created_at DESC',
        [nodeId]
      );

      return {
        success: true,
        rules: result.rows.map(row => this.formatRule(row)),
        count: result.rows.length
      };
    } catch (error) {
      console.error('[RuleService] Error getting node rules:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update a rule
   */
  async updateRule(id, updates) {
    try {
      const allowedUpdates = [
        'name', 'description', 'type', 'conditions', 'actions',
        'priority', 'is_active', 'metadata', 'workflow_id', 'node_id'
      ];

      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);

          // JSON fields need to be stringified
          if (['conditions', 'actions', 'metadata'].includes(key)) {
            params.push(JSON.stringify(updates[key]));
          } else {
            params.push(updates[key]);
          }
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return {
          success: false,
          error: 'No valid fields to update'
        };
      }

      updateFields.push(`updated_at = NOW()`);
      params.push(id);

      const query = `
        UPDATE k1.rules
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Rule not found'
        };
      }

      return {
        success: true,
        rule: this.formatRule(result.rows[0])
      };
    } catch (error) {
      console.error('[RuleService] Error updating rule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(id) {
    try {
      const result = await db.query(
        'DELETE FROM k1.rules WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Rule not found'
        };
      }

      return {
        success: true,
        message: 'Rule deleted successfully'
      };
    } catch (error) {
      console.error('[RuleService] Error deleting rule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Attach rule to workflow node
   */
  async attachRuleToNode(ruleId, nodeId) {
    try {
      const result = await db.query(
        'UPDATE k1.rules SET node_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [nodeId, ruleId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Rule not found'
        };
      }

      return {
        success: true,
        rule: this.formatRule(result.rows[0])
      };
    } catch (error) {
      console.error('[RuleService] Error attaching rule to node:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detach rule from workflow node
   */
  async detachRuleFromNode(ruleId) {
    try {
      const result = await db.query(
        'UPDATE k1.rules SET node_id = NULL, updated_at = NOW() WHERE id = $1 RETURNING *',
        [ruleId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Rule not found'
        };
      }

      return {
        success: true,
        rule: this.formatRule(result.rows[0])
      };
    } catch (error) {
      console.error('[RuleService] Error detaching rule from node:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Evaluate a rule against data
   */
  async evaluateRule(ruleId, context = {}) {
    try {
      const ruleResult = await this.getRuleById(ruleId);

      if (!ruleResult.success) {
        return ruleResult;
      }

      const rule = ruleResult.rule;

      if (!rule.is_active) {
        return {
          success: false,
          error: 'Rule is not active'
        };
      }

      // Evaluate conditions
      const conditionsMet = this.evaluateConditions(rule.conditions, context);

      return {
        success: true,
        conditionsMet,
        actionsToExecute: conditionsMet ? rule.actions : [],
        rule
      };
    } catch (error) {
      console.error('[RuleService] Error evaluating rule:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Evaluate conditions against context
   */
  evaluateConditions(conditions, context) {
    if (!conditions || !conditions.all) {
      return true; // No conditions means always true
    }

    // Support for 'all' (AND) logic
    if (conditions.all && Array.isArray(conditions.all)) {
      return conditions.all.every(condition => this.evaluateSingleCondition(condition, context));
    }

    // Support for 'any' (OR) logic
    if (conditions.any && Array.isArray(conditions.any)) {
      return conditions.any.some(condition => this.evaluateSingleCondition(condition, context));
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
      case '==':
        return fieldValue == value;
      case 'notEquals':
      case '!=':
        return fieldValue != value;
      case 'greaterThan':
      case '>':
        return fieldValue > value;
      case 'lessThan':
      case '<':
        return fieldValue < value;
      case 'greaterThanOrEqual':
      case '>=':
        return fieldValue >= value;
      case 'lessThanOrEqual':
      case '<=':
        return fieldValue <= value;
      case 'contains':
        return String(fieldValue).includes(value);
      case 'notContains':
        return !String(fieldValue).includes(value);
      case 'startsWith':
        return String(fieldValue).startsWith(value);
      case 'endsWith':
        return String(fieldValue).endsWith(value);
      case 'isEmpty':
        return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'isNotEmpty':
        return !!fieldValue && fieldValue !== '' && !(Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'notIn':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        console.warn(`[RuleService] Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Format rule for response
   */
  formatRule(row) {
    return {
      id: row.id,
      application_id: row.application_id,
      workflow_id: row.workflow_id,
      node_id: row.node_id,
      name: row.name,
      description: row.description,
      type: row.type,
      conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions,
      actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions,
      priority: row.priority,
      is_active: row.is_active,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

module.exports = RuleService;
