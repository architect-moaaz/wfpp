/**
 * WorkflowConfigEnforcer
 *
 * Enforces workflow configuration at runtime:
 * - Event triggers from startProcess nodes
 * - CRON schedule triggers
 * - Event emission on end events
 * - Gateway condition validation
 * - Parallel branch count enforcement
 * - User task assignment
 * - Task due date reminders
 * - Task priority queue ordering
 * - Sub-workflow input/output mapping validation
 * - REST API response/error handling
 */

const cron = require('node-cron');
const eventBus = require('../services/workflow/EventBus');

class WorkflowConfigEnforcer {
  constructor() {
    this.scheduledJobs = new Map(); // workflowId -> cronJob
    this.taskQueue = new Map(); // instanceId -> { tasks: [], sortedByPriority: true }
    this.taskReminders = new Map(); // taskId -> { timeoutId, dueDate }
    this.eventListeners = new Map(); // workflowId -> eventPattern
    this.executionHandler = null;
  }

  /**
   * Set the execution handler for triggering workflows
   */
  setExecutionHandler(handler) {
    this.executionHandler = handler;
  }

  // ============================================
  // EVENT TRIGGERS (Feature #13)
  // ============================================

  /**
   * Setup event trigger for a workflow's start node
   * Connects the event system to actually trigger workflows
   */
  setupEventTrigger(workflowId, workflowDef) {
    // Find startProcess node with event trigger
    const startNode = workflowDef.nodes?.find(n =>
      n.type === 'startProcess' && n.data?.triggerType === 'event'
    );

    if (!startNode || !startNode.data?.listenToEvent) {
      return null;
    }

    const eventPattern = startNode.data.listenToEvent;
    console.log(`[ConfigEnforcer] Setting up event trigger for ${workflowId}: ${eventPattern}`);

    // Subscribe to the event
    const handler = async (event) => {
      console.log(`[ConfigEnforcer] Event trigger fired for ${workflowId}`, {
        eventName: event.name,
        correlationId: event.metadata.correlationId
      });

      if (this.executionHandler) {
        try {
          await this.executionHandler(workflowId, event.payload, {
            triggeredBy: 'event',
            triggerEvent: event.name,
            correlationId: event.metadata.correlationId,
            sourceWorkflowId: event.metadata.sourceWorkflowId
          });
        } catch (error) {
          console.error(`[ConfigEnforcer] Failed to start workflow from event:`, error);
        }
      }
    };

    eventBus.subscribe(eventPattern, workflowId, handler);
    this.eventListeners.set(workflowId, { pattern: eventPattern, handler });

    return { eventPattern, workflowId };
  }

  /**
   * Remove event trigger for a workflow
   */
  removeEventTrigger(workflowId) {
    const listener = this.eventListeners.get(workflowId);
    if (listener) {
      eventBus.unsubscribe(listener.pattern, workflowId, listener.handler);
      this.eventListeners.delete(workflowId);
      console.log(`[ConfigEnforcer] Removed event trigger for ${workflowId}`);
    }
  }

  // ============================================
  // SCHEDULE TRIGGERS - CRON (Feature #14)
  // ============================================

  /**
   * Setup CRON schedule trigger for a workflow
   * Uses proper node-cron for accurate scheduling
   */
  setupScheduleTrigger(workflowId, workflowDef) {
    // Find startProcess node with schedule trigger
    const startNode = workflowDef.nodes?.find(n =>
      n.type === 'startProcess' && n.data?.triggerType === 'schedule'
    );

    if (!startNode || !startNode.data?.cronExpression) {
      return null;
    }

    const cronExpression = startNode.data.cronExpression;

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      console.error(`[ConfigEnforcer] Invalid cron expression for ${workflowId}: ${cronExpression}`);
      return null;
    }

    console.log(`[ConfigEnforcer] Setting up schedule trigger for ${workflowId}: ${cronExpression}`);

    // Stop existing job if any
    this.removeScheduleTrigger(workflowId);

    // Create new cron job
    const job = cron.schedule(cronExpression, async () => {
      console.log(`[ConfigEnforcer] Schedule trigger fired for ${workflowId}`);

      if (this.executionHandler) {
        try {
          await this.executionHandler(workflowId, {
            scheduledAt: new Date().toISOString(),
            cronExpression
          }, {
            triggeredBy: 'schedule',
            scheduleCron: cronExpression,
            scheduledAt: new Date().toISOString()
          });
        } catch (error) {
          console.error(`[ConfigEnforcer] Failed to start scheduled workflow:`, error);
        }
      }
    }, {
      scheduled: true,
      timezone: startNode.data.timezone || 'UTC'
    });

    this.scheduledJobs.set(workflowId, {
      job,
      cronExpression,
      timezone: startNode.data.timezone || 'UTC',
      createdAt: new Date().toISOString()
    });

    return { cronExpression, workflowId };
  }

  /**
   * Remove schedule trigger for a workflow
   */
  removeScheduleTrigger(workflowId) {
    const scheduled = this.scheduledJobs.get(workflowId);
    if (scheduled) {
      scheduled.job.stop();
      this.scheduledJobs.delete(workflowId);
      console.log(`[ConfigEnforcer] Removed schedule trigger for ${workflowId}`);
    }
  }

  /**
   * Get all scheduled workflows
   */
  getScheduledWorkflows() {
    const scheduled = [];
    for (const [workflowId, info] of this.scheduledJobs) {
      scheduled.push({
        workflowId,
        cronExpression: info.cronExpression,
        timezone: info.timezone,
        createdAt: info.createdAt
      });
    }
    return scheduled;
  }

  // ============================================
  // EVENT EMISSION ON END (Feature #15)
  // ============================================

  /**
   * Emit events configured on end event nodes
   * Called by the runtime when workflow completes
   */
  async emitEndEventEvents(endNode, instance, workflowDef) {
    const nodeData = endNode.data || {};

    if (!nodeData.emitEvent) {
      return null;
    }

    const eventName = nodeData.emitEvent;

    // Parse include data configuration
    let payload = {};
    if (nodeData.includeData) {
      try {
        // Parse the include data configuration (YAML-like format)
        const lines = nodeData.includeData.split('\n').filter(l => l.trim());
        for (const line of lines) {
          const [key, value] = line.split(':').map(s => s.trim());
          if (key && value) {
            // Support variable references like ${processData.result}
            if (value.startsWith('${') && value.endsWith('}')) {
              const varPath = value.slice(2, -1);
              payload[key] = this.getNestedValue(instance.processData, varPath);
            } else {
              payload[key] = value;
            }
          }
        }
      } catch (e) {
        console.warn(`[ConfigEnforcer] Error parsing includeData:`, e);
        payload = { ...instance.processData };
      }
    } else {
      // Default: include all process data
      payload = { ...instance.processData };
    }

    console.log(`[ConfigEnforcer] Emitting end event: ${eventName}`, {
      workflowId: workflowDef.id,
      instanceId: instance.id
    });

    // Emit the event
    eventBus.emit(eventName, payload, {
      sourceWorkflowId: workflowDef.id,
      sourceNodeId: endNode.id,
      correlationId: instance.correlationId,
      instanceId: instance.id,
      completedAt: new Date().toISOString()
    });

    return { eventName, payload };
  }

  // ============================================
  // GATEWAY CONDITION VALIDATION (Feature #16)
  // ============================================

  /**
   * Validate gateway conditions before execution
   * Returns validation result with errors if any
   */
  validateGatewayConditions(gatewayNode, workflowDef, variables) {
    const nodeData = gatewayNode.data || {};
    const gatewayType = nodeData.gatewayType || 'exclusive';
    const errors = [];
    const warnings = [];

    // Get outgoing connections for this gateway
    const connections = (workflowDef.connections || workflowDef.edges || [])
      .filter(c => c.source === gatewayNode.id);

    if (connections.length === 0) {
      errors.push(`Gateway ${gatewayNode.id} has no outgoing connections`);
      return { valid: false, errors, warnings };
    }

    // Validate conditions on each connection
    const conditionResults = [];
    let defaultFound = false;

    for (const conn of connections) {
      const condition = conn.data?.condition || conn.condition;
      const isDefault = conn.data?.isDefault || conn.isDefault;

      if (isDefault) {
        defaultFound = true;
        conditionResults.push({ connectionId: conn.id, isDefault: true, valid: true });
        continue;
      }

      if (!condition && !isDefault) {
        if (gatewayType === 'exclusive') {
          warnings.push(`Connection ${conn.id} has no condition - will always evaluate to true`);
        }
        conditionResults.push({ connectionId: conn.id, condition: null, valid: true, alwaysTrue: true });
        continue;
      }

      // Validate condition syntax
      const validationResult = this.validateConditionSyntax(condition, variables);
      conditionResults.push({
        connectionId: conn.id,
        condition,
        ...validationResult
      });

      if (!validationResult.valid) {
        errors.push(`Invalid condition on connection ${conn.id}: ${validationResult.error}`);
      }
    }

    // Check for exclusive gateway requirements
    if (gatewayType === 'exclusive') {
      const validConditions = conditionResults.filter(r => r.valid && !r.isDefault);
      if (validConditions.length === 0 && !defaultFound) {
        errors.push(`Exclusive gateway ${gatewayNode.id} requires at least one condition or default path`);
      }
    }

    // Check for parallel gateway requirements
    if (gatewayType === 'parallel') {
      const branchCount = nodeData.parallelBranchCount;
      if (branchCount && connections.length !== branchCount) {
        warnings.push(`Parallel gateway expects ${branchCount} branches but has ${connections.length} connections`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      conditionResults,
      gatewayType
    };
  }

  /**
   * Validate condition expression syntax
   */
  validateConditionSyntax(condition, variables = {}) {
    if (!condition || typeof condition !== 'string') {
      return { valid: true, warning: 'Empty condition - will always be true' };
    }

    try {
      // Check for common syntax issues
      const trimmed = condition.trim();

      // Check for unbalanced parentheses
      let parenCount = 0;
      for (const char of trimmed) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (parenCount < 0) {
          return { valid: false, error: 'Unbalanced parentheses - extra closing paren' };
        }
      }
      if (parenCount !== 0) {
        return { valid: false, error: 'Unbalanced parentheses - missing closing paren' };
      }

      // Check for undefined variables
      const varPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
      const usedVars = [];
      let match;
      while ((match = varPattern.exec(trimmed)) !== null) {
        const varName = match[1];
        // Skip JavaScript keywords and operators
        const reserved = ['true', 'false', 'null', 'undefined', 'and', 'or', 'not', 'if', 'else'];
        if (!reserved.includes(varName.toLowerCase())) {
          usedVars.push(varName);
        }
      }

      const undefinedVars = usedVars.filter(v => !(v in variables));
      if (undefinedVars.length > 0) {
        return {
          valid: true,
          warning: `Variables may not be defined at runtime: ${undefinedVars.join(', ')}`,
          usedVariables: usedVars
        };
      }

      // Try to compile the expression (but don't evaluate)
      new Function('vars', `with(vars) { return ${trimmed}; }`);

      return { valid: true, usedVariables: usedVars };
    } catch (e) {
      return { valid: false, error: `Syntax error: ${e.message}` };
    }
  }

  // ============================================
  // PARALLEL BRANCH ENFORCEMENT (Feature #17)
  // ============================================

  /**
   * Enforce parallel branch count at runtime
   * Returns the exact number of branches to create
   */
  enforceParallelBranches(gatewayNode, outgoingConnections) {
    const nodeData = gatewayNode.data || {};
    const configuredBranchCount = nodeData.parallelBranchCount;

    if (!configuredBranchCount) {
      // No enforcement - use all available connections
      return {
        enforced: false,
        branchCount: outgoingConnections.length,
        connections: outgoingConnections
      };
    }

    const requestedBranches = parseInt(configuredBranchCount, 10);

    if (requestedBranches <= 0) {
      console.warn(`[ConfigEnforcer] Invalid branch count ${requestedBranches}, using 1`);
      return {
        enforced: true,
        branchCount: 1,
        connections: outgoingConnections.slice(0, 1)
      };
    }

    if (requestedBranches > outgoingConnections.length) {
      console.warn(`[ConfigEnforcer] Requested ${requestedBranches} branches but only ${outgoingConnections.length} available`);
      return {
        enforced: true,
        branchCount: outgoingConnections.length,
        connections: outgoingConnections,
        warning: `Configured for ${requestedBranches} branches but only ${outgoingConnections.length} connections exist`
      };
    }

    // Enforce exact branch count
    return {
      enforced: true,
      branchCount: requestedBranches,
      connections: outgoingConnections.slice(0, requestedBranches)
    };
  }

  // ============================================
  // USER TASK ASSIGNMENT (Feature #18)
  // ============================================

  /**
   * Enforce user task assignment at runtime
   * Returns assigned user/role/group based on assignment type configured in UI
   *
   * Assignment types:
   * - unassigned: Any user can claim the task
   * - user: Assigned to a specific user (assignee field)
   * - role: Assigned to users with a specific role (assigneeRole field)
   * - userAndRole: Assigned to a specific user who must also have the role
   * - expression: Dynamic assignment from process variable (assigneeExpression field)
   */
  enforceTaskAssignment(userTaskNode, instance, identityServices = null) {
    const nodeData = userTaskNode.data || {};
    const assignmentType = nodeData.assignmentType || 'unassigned';

    const assignment = {
      assignedTo: null,
      assignmentType: assignmentType,
      assignedRole: null,
      assignedGroup: null,
      assignedPosition: null,
      candidateUsers: [],
      candidateGroups: [],
      enforced: false,
      // For async resolution (manager, departmentHead)
      requiresResolution: false,
      resolutionType: null
    };

    // Handle different assignment types from UI
    switch (assignmentType) {
      case 'user':
        // Specific user assignment
        if (nodeData.assignee) {
          assignment.assignedTo = this.resolveVariable(nodeData.assignee, instance.processData);
          assignment.enforced = true;
        }
        break;

      case 'role':
        // Role-based assignment - any user with this role can complete
        if (nodeData.assigneeRole) {
          assignment.assignedRole = nodeData.assigneeRole;
          assignment.enforced = true;
        }
        break;

      case 'group':
        // Group-based assignment - any member of this group can complete
        if (nodeData.assigneeGroup) {
          assignment.assignedGroup = nodeData.assigneeGroup;
          assignment.enforced = true;
        }
        break;

      case 'position':
        // Position-based assignment - whoever holds this position
        if (nodeData.assigneePosition) {
          assignment.assignedPosition = nodeData.assigneePosition;
          assignment.enforced = true;
        }
        break;

      case 'userAndRole':
        // Both user AND role required
        if (nodeData.assignee) {
          assignment.assignedTo = this.resolveVariable(nodeData.assignee, instance.processData);
          assignment.enforced = true;
        }
        if (nodeData.assigneeRole) {
          assignment.assignedRole = nodeData.assigneeRole;
          assignment.enforced = true;
        }
        break;

      case 'manager':
        // Assign to submitter's manager - requires async resolution
        assignment.requiresResolution = true;
        assignment.resolutionType = 'manager';
        assignment.enforced = true;
        // Store the reference to resolve later
        assignment.resolveFor = instance.processData?.submittedBy || instance.startedBy;
        break;

      case 'departmentHead':
        // Assign to submitter's department head - requires async resolution
        assignment.requiresResolution = true;
        assignment.resolutionType = 'departmentHead';
        assignment.enforced = true;
        assignment.resolveFor = instance.processData?.submittedBy || instance.startedBy;
        break;

      case 'expression':
        // Dynamic assignment from process variable
        if (nodeData.assigneeExpression) {
          // Expression is like "processData.submittedBy" or "processData.manager"
          const resolvedValue = this.resolveExpression(nodeData.assigneeExpression, instance.processData);
          if (resolvedValue) {
            assignment.assignedTo = resolvedValue;
            assignment.enforced = true;
          }
        }
        break;

      case 'unassigned':
      default:
        // No specific assignment - task goes to pool
        assignment.assignmentType = 'unassigned';
        break;
    }

    // Legacy support: Check direct assignedTo field (for backward compatibility)
    if (!assignment.assignedTo && nodeData.assignedTo && nodeData.assignedTo !== 'unassigned') {
      assignment.assignedTo = this.resolveVariable(nodeData.assignedTo, instance.processData);
      assignment.enforced = true;
    }

    // Check candidate groups (fallback groups)
    if (nodeData.candidateGroups) {
      // Support both comma-separated string and single ID
      if (typeof nodeData.candidateGroups === 'string' && nodeData.candidateGroups.includes(',')) {
        assignment.candidateGroups = nodeData.candidateGroups.split(',').map(g => g.trim()).filter(Boolean);
      } else {
        assignment.candidateGroups = [nodeData.candidateGroups];
      }
    }

    console.log(`[ConfigEnforcer] Task assignment for ${userTaskNode.id}:`, {
      type: assignment.assignmentType,
      assignedTo: assignment.assignedTo,
      assignedRole: assignment.assignedRole,
      assignedGroup: assignment.assignedGroup,
      assignedPosition: assignment.assignedPosition,
      requiresResolution: assignment.requiresResolution,
      candidateGroups: assignment.candidateGroups
    });

    return assignment;
  }

  /**
   * Resolve an expression like "processData.fieldName" to actual value
   */
  resolveExpression(expression, processData) {
    if (!expression) return null;

    try {
      // Handle "processData.fieldName" format
      if (expression.startsWith('processData.')) {
        const fieldPath = expression.replace('processData.', '');
        return this.getNestedValue(processData, fieldPath);
      }
      // Direct field name
      return processData[expression] || expression;
    } catch (error) {
      console.error(`[ConfigEnforcer] Failed to resolve expression: ${expression}`, error);
      return null;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Resolve async assignment types using identity services
   * Called when assignment.requiresResolution is true
   * @param {Object} assignment - The assignment object from enforceTaskAssignment
   * @param {Object} identityServices - Object containing positionService, etc.
   * @param {string} organizationId - The organization ID for lookups
   * @returns {Promise<Object>} - Updated assignment with resolved assignee
   */
  async resolveAsyncAssignment(assignment, identityServices, organizationId) {
    if (!assignment.requiresResolution || !identityServices) {
      return assignment;
    }

    const { positionService, groupService, roleService } = identityServices;
    const userId = assignment.resolveFor;

    if (!userId || !organizationId) {
      console.warn(`[ConfigEnforcer] Cannot resolve ${assignment.resolutionType}: missing userId or organizationId`);
      return assignment;
    }

    try {
      switch (assignment.resolutionType) {
        case 'manager':
          if (positionService) {
            const manager = await positionService.getManager(userId, organizationId);
            if (manager?.manager_user_id) {
              assignment.assignedTo = manager.manager_user_id;
              assignment.resolvedFrom = 'manager';
              console.log(`[ConfigEnforcer] Resolved manager assignment to ${manager.manager_name || manager.manager_user_id}`);
            } else {
              console.warn(`[ConfigEnforcer] No manager found for user ${userId}`);
              // Fall back to candidate groups if available
              assignment.assignmentType = 'unassigned';
            }
          }
          break;

        case 'departmentHead':
          if (positionService) {
            const deptHead = await positionService.getDepartmentHead(userId, organizationId);
            if (deptHead?.head_user_id) {
              assignment.assignedTo = deptHead.head_user_id;
              assignment.resolvedFrom = 'departmentHead';
              console.log(`[ConfigEnforcer] Resolved department head assignment to ${deptHead.head_name || deptHead.head_user_id}`);
            } else {
              console.warn(`[ConfigEnforcer] No department head found for user ${userId}`);
              assignment.assignmentType = 'unassigned';
            }
          }
          break;

        default:
          console.warn(`[ConfigEnforcer] Unknown resolution type: ${assignment.resolutionType}`);
      }
    } catch (error) {
      console.error(`[ConfigEnforcer] Error resolving ${assignment.resolutionType}:`, error);
    }

    assignment.requiresResolution = false;
    return assignment;
  }

  /**
   * Resolve position-based assignment to get the current holder
   * @param {string} positionId - The position ID
   * @param {Object} positionService - The position service
   * @returns {Promise<string|null>} - The user ID holding this position
   */
  async resolvePositionAssignment(positionId, positionService) {
    if (!positionId || !positionService) return null;

    try {
      const position = await positionService.getById(positionId);
      if (position?.user_id) {
        return position.user_id;
      }
      console.warn(`[ConfigEnforcer] Position ${positionId} is vacant or not found`);
      return null;
    } catch (error) {
      console.error(`[ConfigEnforcer] Error resolving position assignment:`, error);
      return null;
    }
  }

  /**
   * Get candidate users from a group
   * @param {string} groupId - The group ID
   * @param {Object} groupService - The group service
   * @returns {Promise<Array>} - Array of user IDs in the group
   */
  async getGroupMembers(groupId, groupService) {
    if (!groupId || !groupService) return [];

    try {
      const members = await groupService.getMembers(groupId);
      return members.map(m => m.id);
    } catch (error) {
      console.error(`[ConfigEnforcer] Error getting group members:`, error);
      return [];
    }
  }

  /**
   * Get candidate users with a specific role
   * @param {string} roleId - The role ID
   * @param {string} organizationId - The organization ID
   * @param {Object} roleService - The role service
   * @returns {Promise<Array>} - Array of user IDs with this role
   */
  async getRoleUsers(roleId, organizationId, roleService) {
    if (!roleId || !roleService) return [];

    try {
      const users = await roleService.getUsersWithOrgRole(roleId, { includeDescendants: true });
      return users.map(u => u.id);
    } catch (error) {
      console.error(`[ConfigEnforcer] Error getting role users:`, error);
      return [];
    }
  }

  // ============================================
  // TASK DUE DATE REMINDERS (Feature #19)
  // ============================================

  /**
   * Setup due date reminder for a task
   */
  setupTaskDueDate(taskId, userTaskNode, instance, reminderCallback) {
    const nodeData = userTaskNode.data || {};

    if (!nodeData.dueDate && !nodeData.dueDuration) {
      return null;
    }

    let dueDate;

    if (nodeData.dueDate) {
      // Absolute due date
      dueDate = new Date(this.resolveVariable(nodeData.dueDate, instance.processData));
    } else if (nodeData.dueDuration) {
      // Relative due date (e.g., "2h", "1d", "30m")
      dueDate = this.calculateDueDate(nodeData.dueDuration);
    }

    if (!dueDate || isNaN(dueDate.getTime())) {
      console.warn(`[ConfigEnforcer] Invalid due date for task ${taskId}`);
      return null;
    }

    const now = Date.now();
    const dueTime = dueDate.getTime();

    if (dueTime <= now) {
      console.warn(`[ConfigEnforcer] Due date already passed for task ${taskId}`);
      return { dueDate, overdue: true };
    }

    // Setup reminder (default: 1 hour before due, or 50% of time remaining)
    const reminderTime = nodeData.reminderBefore
      ? this.parseDuration(nodeData.reminderBefore)
      : Math.min(3600000, (dueTime - now) / 2); // 1 hour or 50% of remaining

    const reminderAt = dueTime - reminderTime;
    const delayUntilReminder = reminderAt - now;

    if (delayUntilReminder > 0) {
      const reminderTimeoutId = setTimeout(() => {
        console.log(`[ConfigEnforcer] Task reminder triggered: ${taskId}`);
        if (reminderCallback) {
          reminderCallback({
            taskId,
            nodeId: userTaskNode.id,
            instanceId: instance.id,
            dueDate,
            reminderType: 'approaching_due'
          });
        }
      }, delayUntilReminder);

      this.taskReminders.set(taskId, {
        timeoutId: reminderTimeoutId,
        dueDate,
        reminderAt: new Date(reminderAt)
      });
    }

    // Setup overdue notification
    const overdueDelay = dueTime - now;
    const overdueTimeoutId = setTimeout(() => {
      console.log(`[ConfigEnforcer] Task overdue: ${taskId}`);
      if (reminderCallback) {
        reminderCallback({
          taskId,
          nodeId: userTaskNode.id,
          instanceId: instance.id,
          dueDate,
          reminderType: 'overdue'
        });
      }
    }, overdueDelay);

    // Store both timeouts
    const existing = this.taskReminders.get(taskId) || {};
    this.taskReminders.set(taskId, {
      ...existing,
      overdueTimeoutId,
      dueDate
    });

    console.log(`[ConfigEnforcer] Due date set for task ${taskId}: ${dueDate.toISOString()}`);

    return { dueDate, reminderAt: new Date(reminderAt) };
  }

  /**
   * Cancel task reminders
   */
  cancelTaskReminders(taskId) {
    const reminder = this.taskReminders.get(taskId);
    if (reminder) {
      if (reminder.timeoutId) clearTimeout(reminder.timeoutId);
      if (reminder.overdueTimeoutId) clearTimeout(reminder.overdueTimeoutId);
      this.taskReminders.delete(taskId);
      console.log(`[ConfigEnforcer] Cancelled reminders for task ${taskId}`);
    }
  }

  /**
   * Calculate due date from duration string
   */
  calculateDueDate(duration) {
    const ms = this.parseDuration(duration);
    return new Date(Date.now() + ms);
  }

  /**
   * Parse duration string to milliseconds
   */
  parseDuration(duration) {
    if (typeof duration === 'number') return duration;

    const match = duration.match(/^(\d+)(m|h|d|w)?$/i);
    if (!match) return 0;

    const value = parseInt(match[1], 10);
    const unit = (match[2] || 'm').toLowerCase();

    const multipliers = {
      'm': 60000,      // minutes
      'h': 3600000,    // hours
      'd': 86400000,   // days
      'w': 604800000   // weeks
    };

    return value * (multipliers[unit] || 60000);
  }

  // ============================================
  // TASK PRIORITY QUEUE ORDERING (Feature #20)
  // ============================================

  /**
   * Add task to priority queue
   */
  addToTaskQueue(instanceId, task) {
    if (!this.taskQueue.has(instanceId)) {
      this.taskQueue.set(instanceId, { tasks: [], sorted: false });
    }

    const queue = this.taskQueue.get(instanceId);
    queue.tasks.push(task);
    queue.sorted = false;

    console.log(`[ConfigEnforcer] Task added to queue: ${task.taskId} (priority: ${task.priority})`);
  }

  /**
   * Get tasks ordered by priority
   * Priority order: critical > high > medium > low
   */
  getTasksByPriority(instanceId) {
    const queue = this.taskQueue.get(instanceId);
    if (!queue) return [];

    if (!queue.sorted) {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      queue.tasks.sort((a, b) => {
        const aPriority = priorityOrder[a.priority] ?? 2;
        const bPriority = priorityOrder[b.priority] ?? 2;

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Secondary sort by due date (if available)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }

        // Tertiary sort by creation time
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      queue.sorted = true;
    }

    return queue.tasks;
  }

  /**
   * Get next task by priority
   */
  getNextTask(instanceId, userId = null) {
    const tasks = this.getTasksByPriority(instanceId);

    if (userId) {
      // Filter by assignment
      return tasks.find(t =>
        t.assignedTo === userId ||
        t.candidateUsers?.includes(userId) ||
        !t.assignedTo
      );
    }

    return tasks[0];
  }

  /**
   * Remove task from queue
   */
  removeFromTaskQueue(instanceId, taskId) {
    const queue = this.taskQueue.get(instanceId);
    if (queue) {
      queue.tasks = queue.tasks.filter(t => t.taskId !== taskId);
    }
  }

  /**
   * Update a task in the queue (e.g., when claimed)
   * @param {string} instanceId - Instance ID
   * @param {Object} updatedTask - Updated task object with taskId
   */
  updateTaskInQueue(instanceId, updatedTask) {
    const queue = this.taskQueue.get(instanceId);
    if (queue) {
      const taskIndex = queue.tasks.findIndex(t => t.taskId === updatedTask.taskId);
      if (taskIndex >= 0) {
        queue.tasks[taskIndex] = { ...queue.tasks[taskIndex], ...updatedTask };
        console.log(`[ConfigEnforcer] Task ${updatedTask.taskId} updated in queue`);
        return true;
      }
    }
    return false;
  }

  /**
   * Setup task escalation timer for group-assigned tasks
   * If a task is not claimed within the timeout, escalate to manager
   * @param {string} taskId - Task ID
   * @param {string} groupId - Group ID the task is assigned to
   * @param {string} timeout - Timeout duration (e.g., '24h', '2d')
   * @param {string} instanceId - Instance ID
   * @param {Function} escalationCallback - Callback to invoke on escalation
   */
  setupTaskEscalation(taskId, groupId, timeout, instanceId, escalationCallback) {
    const timeoutMs = this.parseTimeoutDuration(timeout);

    if (!timeoutMs || timeoutMs <= 0) {
      console.warn(`[ConfigEnforcer] Invalid escalation timeout for task ${taskId}: ${timeout}`);
      return null;
    }

    // Store escalation info
    if (!this.taskEscalations) {
      this.taskEscalations = new Map();
    }

    const timer = setTimeout(async () => {
      console.log(`[ConfigEnforcer] Escalation triggered for task ${taskId}`);
      this.taskEscalations.delete(taskId);

      if (escalationCallback) {
        try {
          await escalationCallback(taskId, groupId, instanceId);
        } catch (error) {
          console.error(`[ConfigEnforcer] Escalation callback failed for task ${taskId}:`, error.message);
        }
      }
    }, timeoutMs);

    this.taskEscalations.set(taskId, {
      timer,
      groupId,
      instanceId,
      escalationAt: new Date(Date.now() + timeoutMs).toISOString()
    });

    console.log(`[ConfigEnforcer] Escalation timer set for task ${taskId}: ${timeout}`);
    return { taskId, escalationAt: this.taskEscalations.get(taskId).escalationAt };
  }

  /**
   * Cancel task escalation timer
   * @param {string} taskId - Task ID
   */
  cancelTaskEscalation(taskId) {
    if (!this.taskEscalations) return false;

    const escalation = this.taskEscalations.get(taskId);
    if (escalation) {
      clearTimeout(escalation.timer);
      this.taskEscalations.delete(taskId);
      console.log(`[ConfigEnforcer] Escalation cancelled for task ${taskId}`);
      return true;
    }
    return false;
  }

  /**
   * Parse timeout duration string to milliseconds
   * Supports: 30m, 1h, 2d, etc.
   * @param {string} duration - Duration string
   * @returns {number} Milliseconds
   */
  parseTimeoutDuration(duration) {
    if (typeof duration === 'number') return duration;
    if (!duration || typeof duration !== 'string') return 0;

    const match = duration.match(/^(\d+)(m|h|d)$/i);
    if (!match) return 0;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'm': return value * 60 * 1000;        // minutes
      case 'h': return value * 60 * 60 * 1000;    // hours
      case 'd': return value * 24 * 60 * 60 * 1000; // days
      default: return 0;
    }
  }

  // ============================================
  // SUB-WORKFLOW INPUT/OUTPUT VALIDATION (Features #21, #22)
  // ============================================

  /**
   * Validate sub-workflow input mapping against target workflow
   */
  validateSubWorkflowInputMapping(subWorkflowNode, sourceVariables, targetWorkflowDef) {
    const nodeData = subWorkflowNode.data || {};
    const inputMapping = nodeData.inputMapping || {};
    const errors = [];
    const warnings = [];

    // Parse input mapping (format: "targetVar: sourceVar" per line)
    const mappings = this.parseMapping(inputMapping);

    // Get expected inputs from target workflow (if available)
    const targetStartNode = targetWorkflowDef?.nodes?.find(n => n.type === 'startProcess');
    const expectedInputs = targetStartNode?.data?.expectedInputs || [];

    // Validate each mapping
    for (const [targetKey, sourceKey] of Object.entries(mappings)) {
      // Check if source variable exists
      const sourceValue = this.getNestedValue(sourceVariables, sourceKey);
      if (sourceValue === undefined) {
        warnings.push(`Source variable "${sourceKey}" may not be defined`);
      }
    }

    // Check for missing required inputs
    for (const input of expectedInputs) {
      if (input.required && !mappings[input.name]) {
        errors.push(`Required input "${input.name}" is not mapped`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      mappings
    };
  }

  /**
   * Validate sub-workflow output mapping
   */
  validateSubWorkflowOutputMapping(subWorkflowNode, subWorkflowResult) {
    const nodeData = subWorkflowNode.data || {};
    const outputMapping = nodeData.outputMapping || {};
    const errors = [];
    const warnings = [];
    const mappedOutput = {};

    // Parse output mapping
    const mappings = this.parseMapping(outputMapping);

    // Apply mapping
    for (const [parentKey, subWorkflowKey] of Object.entries(mappings)) {
      const value = this.getNestedValue(subWorkflowResult, subWorkflowKey);

      if (value === undefined) {
        warnings.push(`Sub-workflow output "${subWorkflowKey}" was not returned`);
      } else {
        mappedOutput[parentKey] = value;
      }
    }

    // If no mapping defined, return all output
    if (Object.keys(mappings).length === 0) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        output: subWorkflowResult
      };
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      output: mappedOutput
    };
  }

  /**
   * Handle async sub-workflow error recovery
   */
  handleAsyncSubWorkflowError(subWorkflowNode, error, context) {
    const nodeData = subWorkflowNode.data || {};
    const errorStrategy = nodeData.errorHandling || 'throw';

    console.log(`[ConfigEnforcer] Handling async sub-workflow error:`, {
      nodeId: subWorkflowNode.id,
      error: error.message,
      strategy: errorStrategy
    });

    switch (errorStrategy) {
      case 'ignore':
        return { handled: true, continue: true, result: null };

      case 'retry':
        const maxRetries = nodeData.maxRetries || 3;
        const currentRetry = context.retryCount || 0;
        if (currentRetry < maxRetries) {
          return {
            handled: true,
            retry: true,
            retryCount: currentRetry + 1,
            delay: Math.pow(2, currentRetry) * 1000 // Exponential backoff
          };
        }
        return { handled: false, error: `Max retries (${maxRetries}) exceeded` };

      case 'fallback':
        const fallbackValue = nodeData.fallbackValue || {};
        return { handled: true, continue: true, result: fallbackValue };

      case 'throw':
      default:
        return { handled: false, error: error.message };
    }
  }

  // ============================================
  // REST API RESPONSE/ERROR HANDLING (Features #23, #24)
  // ============================================

  /**
   * Validate and map REST API response
   */
  validateRestApiResponse(restApiNode, response) {
    const nodeData = restApiNode.data || {};
    const responseMapping = nodeData.responseMapping || {};
    const expectedStatus = nodeData.expectedStatus || [200, 201, 204];
    const errors = [];
    const warnings = [];
    const mappedResponse = {};

    // Validate status code
    const statusCodes = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!statusCodes.includes(response.status)) {
      errors.push(`Unexpected status code: ${response.status} (expected: ${statusCodes.join(', ')})`);
    }

    // Validate response schema if defined
    if (nodeData.responseSchema) {
      const schemaValidation = this.validateSchema(response.data, nodeData.responseSchema);
      if (!schemaValidation.valid) {
        errors.push(...schemaValidation.errors.map(e => `Schema validation: ${e}`));
      }
    }

    // Apply response mapping
    const mappings = this.parseMapping(responseMapping);

    for (const [varName, jsonPath] of Object.entries(mappings)) {
      const value = this.getNestedValue(response.data, jsonPath);
      if (value === undefined) {
        warnings.push(`Response path "${jsonPath}" not found`);
      } else {
        mappedResponse[varName] = value;
      }
    }

    // If no mapping, return entire response
    if (Object.keys(mappings).length === 0) {
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        data: response.data,
        status: response.status
      };
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: mappedResponse,
      status: response.status
    };
  }

  /**
   * Apply REST API error handling strategy
   */
  applyRestApiErrorHandling(restApiNode, error, context) {
    const nodeData = restApiNode.data || {};
    const errorStrategy = nodeData.errorHandling || 'throw';
    const retryConfig = nodeData.retryConfig || {};

    console.log(`[ConfigEnforcer] REST API error handling:`, {
      nodeId: restApiNode.id,
      error: error.message,
      strategy: errorStrategy,
      status: error.response?.status
    });

    // Check if error is retryable
    const retryableStatuses = retryConfig.retryableStatuses || [408, 429, 500, 502, 503, 504];
    const isRetryable = error.response && retryableStatuses.includes(error.response.status);

    switch (errorStrategy) {
      case 'retry':
        if (isRetryable) {
          const maxRetries = retryConfig.maxRetries || 3;
          const currentRetry = context.retryCount || 0;

          if (currentRetry < maxRetries) {
            const backoffType = retryConfig.backoff || 'exponential';
            let delay;

            if (backoffType === 'exponential') {
              delay = Math.pow(2, currentRetry) * 1000;
            } else if (backoffType === 'linear') {
              delay = (currentRetry + 1) * 1000;
            } else {
              delay = retryConfig.delay || 1000;
            }

            // Check for Retry-After header
            if (error.response?.headers?.['retry-after']) {
              delay = parseInt(error.response.headers['retry-after'], 10) * 1000;
            }

            return {
              handled: true,
              retry: true,
              retryCount: currentRetry + 1,
              delay,
              maxRetries
            };
          }
        }
        return { handled: false, error: `API call failed after ${context.retryCount || 0} retries: ${error.message}` };

      case 'fallback':
        const fallbackUrl = nodeData.fallbackUrl;
        if (fallbackUrl && !context.usedFallback) {
          return {
            handled: true,
            useFallback: true,
            fallbackUrl
          };
        }
        const fallbackValue = nodeData.fallbackValue || { error: error.message };
        return { handled: true, continue: true, result: fallbackValue };

      case 'ignore':
        return { handled: true, continue: true, result: null };

      case 'circuit_breaker':
        // Mark circuit as open for this endpoint
        const circuitKey = `${restApiNode.id}:${nodeData.url}`;
        this.openCircuit(circuitKey, nodeData.circuitBreakerTimeout || 30000);
        return { handled: false, error: `Circuit breaker opened for ${nodeData.url}` };

      case 'throw':
      default:
        return { handled: false, error: error.message };
    }
  }

  // Circuit breaker state
  circuitBreakers = new Map();

  openCircuit(key, timeout) {
    this.circuitBreakers.set(key, {
      state: 'open',
      openedAt: Date.now(),
      timeout
    });

    setTimeout(() => {
      this.circuitBreakers.set(key, { state: 'half-open' });
    }, timeout);
  }

  isCircuitOpen(key) {
    const circuit = this.circuitBreakers.get(key);
    return circuit?.state === 'open';
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Parse mapping string to object
   * Format: "key1: value1\nkey2: value2"
   */
  parseMapping(mapping) {
    if (!mapping) return {};
    if (typeof mapping === 'object') return mapping;

    const result = {};
    const lines = mapping.split('\n').filter(l => l.trim());

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    if (!path || !obj) return undefined;

    // Handle direct property
    if (!path.includes('.')) {
      return obj[path];
    }

    return path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, obj);
  }

  /**
   * Resolve variable reference
   */
  resolveVariable(value, processData) {
    if (!value || typeof value !== 'string') return value;

    if (value.startsWith('${') && value.endsWith('}')) {
      const varPath = value.slice(2, -1);
      return this.getNestedValue(processData, varPath);
    }

    return value;
  }

  /**
   * Simple schema validation
   */
  validateSchema(data, schema) {
    const errors = [];

    if (!schema || typeof schema !== 'object') {
      return { valid: true, errors: [] };
    }

    // Check required fields
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (data[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check field types
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (data[field] !== undefined && fieldSchema.type) {
          const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
          if (actualType !== fieldSchema.type) {
            errors.push(`Field ${field} expected ${fieldSchema.type} but got ${actualType}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    // Stop all scheduled jobs
    for (const [workflowId] of this.scheduledJobs) {
      this.removeScheduleTrigger(workflowId);
    }

    // Remove all event listeners
    for (const [workflowId] of this.eventListeners) {
      this.removeEventTrigger(workflowId);
    }

    // Cancel all task reminders
    for (const [taskId] of this.taskReminders) {
      this.cancelTaskReminders(taskId);
    }

    this.taskQueue.clear();
    this.circuitBreakers.clear();

    console.log('[ConfigEnforcer] Cleanup complete');
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      scheduledJobs: this.scheduledJobs.size,
      eventListeners: this.eventListeners.size,
      activeReminders: this.taskReminders.size,
      taskQueues: this.taskQueue.size,
      circuitBreakers: this.circuitBreakers.size
    };
  }
}

// Singleton instance
const configEnforcer = new WorkflowConfigEnforcer();

module.exports = configEnforcer;
module.exports.WorkflowConfigEnforcer = WorkflowConfigEnforcer;
