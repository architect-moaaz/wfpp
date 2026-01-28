/**
 * Execution Agent
 * Executes workflow tasks based on their type
 * With runtime configuration enforcement
 */

const axios = require('axios');
const formDatabase = require('../../database/FormDatabase');
const executionLogDB = require('../../database/ExecutionLogDatabase');
const Anthropic = require('@anthropic-ai/sdk');
const RulesEvaluator = require('../../services/RulesEvaluator');
const configEnforcer = require('../WorkflowConfigEnforcer');
const rulesEngineEnforcer = require('../RulesEngineEnforcer');
const dataModelEnforcer = require('../DataModelEnforcer');
const eventBus = require('../../services/workflow/EventBus');
const notificationService = require('../../services/NotificationService');
const SafeConditionEvaluator = require('../../utils/SafeConditionEvaluator');

class ExecutionAgent {
  constructor() {
    this.name = 'ExecutionAgent';
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.useLLM = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here';
    this.executionLogDB = executionLogDB;
    this.rulesEvaluator = new RulesEvaluator();
    this.configEnforcer = configEnforcer;
    this.rulesEngineEnforcer = rulesEngineEnforcer;
    this.dataModelEnforcer = dataModelEnforcer;
    this.conditionEvaluator = new SafeConditionEvaluator();

    // Callback for task reminders
    this.taskReminderCallback = null;
  }

  /**
   * Set task reminder callback
   */
  setTaskReminderCallback(callback) {
    this.taskReminderCallback = callback;
  }

  /**
   * Execute a workflow node
   * Enhanced with rule enforcement integration
   */
  async execute(node, instance, workflowDef) {
    console.log(`[ExecutionAgent] Executing ${node.type}: ${node.id}`);

    const nodeData = node.data || {};
    const result = {
      nodeId: node.id,
      type: node.type,
      status: 'COMPLETED',
      output: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Check for pre-execution rules attached to this node
      const preRulesEnforcement = await this.enforcePreExecutionRules(node, instance, workflowDef);

      if (preRulesEnforcement.shouldStop) {
        console.log(`[ExecutionAgent] Pre-execution rules stopped node: ${node.id}`);
        result.status = 'STOPPED_BY_RULE';
        result.output = {
          stoppedByRule: true,
          enforcement: preRulesEnforcement
        };
        return result;
      }

      // Execute the node based on type
      switch (node.type) {
        case 'startProcess':
          result.output = await this.executeStartProcess(node, instance);
          break;

        case 'userTask':
          result.output = await this.executeUserTask(node, instance);
          result.status = 'WAITING'; // Wait for human input
          break;

        case 'scriptTask':
          result.output = await this.executeScriptTask(node, instance);
          break;

        case 'serviceTask':
        case 'dataProcess':
          result.output = await this.executeServiceTask(node, instance);
          break;

        case 'sendTask':
        case 'notification':
          result.output = await this.executeSendTask(node, instance);
          break;

        case 'businessRuleTask':
        case 'validation':
          result.output = await this.executeBusinessRuleTask(node, instance, workflowDef);
          // Handle rule-based stopping
          if (result.output.shouldStop) {
            result.status = 'STOPPED_BY_RULE';
          } else if (!result.output.validationPassed) {
            result.status = 'VALIDATION_FAILED';
          }
          break;

        case 'decision':
          result.output = await this.executeDecisionGateway(node, instance);
          break;

        case 'timerEvent':
          result.output = await this.executeTimerEvent(node, instance);
          result.status = 'WAITING';
          break;

        case 'llmTask':
          result.output = await this.executeLLMTask(node, instance);
          break;

        case 'endEvent':
          result.output = await this.executeEndEvent(node, instance, workflowDef);
          break;

        default:
          result.output = { message: `No handler for node type: ${node.type}` };
      }

      // Apply any pre-execution context updates
      if (preRulesEnforcement.contextUpdates) {
        result.output.ruleContextUpdates = preRulesEnforcement.contextUpdates;
      }

      console.log(`[ExecutionAgent] ${node.id} completed with status: ${result.status}`);
      return result;

    } catch (error) {
      console.error(`[ExecutionAgent] Error executing ${node.id}:`, error);
      result.status = 'FAILED';
      result.error = error.message;
      return result;
    }
  }

  /**
   * Enforce pre-execution rules for any node type
   * This allows rules to be attached to any node and affect execution
   */
  async enforcePreExecutionRules(node, instance, workflowDef) {
    // Skip for businessRuleTask as it handles its own rules
    if (node.type === 'businessRuleTask' || node.type === 'validation') {
      return { enforced: false, shouldStop: false, contextUpdates: {} };
    }

    try {
      const enforcement = await this.rulesEngineEnforcer.enforceNodeRules(
        node.id,
        instance,
        workflowDef
      );

      // Apply context updates to instance
      if (enforcement.enforced && enforcement.contextUpdates) {
        instance.processData = {
          ...instance.processData,
          ...enforcement.contextUpdates
        };
        instance.data = {
          ...instance.data,
          ...enforcement.contextUpdates
        };
      }

      return enforcement;
    } catch (error) {
      console.warn(`[ExecutionAgent] Pre-execution rules error for ${node.id}:`, error.message);
      return { enforced: false, shouldStop: false, contextUpdates: {}, error: error.message };
    }
  }

  /**
   * Execute start process node
   */
  async executeStartProcess(node, instance) {
    const taskData = node.data || {};

    // Try to fetch form metadata if formId is attached to start event
    let formMetadata = null;
    if (taskData.formId) {
      try {
        formMetadata = await formDatabase.getForm(taskData.formId);
      } catch (error) {
        console.error(`[ExecutionAgent] Failed to fetch form ${taskData.formId}:`, error);
      }
    } else if (taskData.formName) {
      try {
        formMetadata = await formDatabase.getFormByName(taskData.formName);
      } catch (error) {
        console.error(`[ExecutionAgent] Failed to fetch form by name ${taskData.formName}:`, error);
      }
    }

    return {
      message: 'Workflow started',
      initiator: instance.initiator,
      startTime: new Date().toISOString(),
      formMetadata: formMetadata, // Include form metadata for workflow initiation
      // PAGE NAVIGATION - Initial page to display when workflow starts
      navigation: {
        initialPageId: taskData.initialPageId || taskData.displayPageId || null,
        showWorkflowProgress: taskData.showWorkflowProgress !== false
      }
    };
  }

  /**
   * Execute user task - generates form and waits
   * Enforces: assignment, priority queue, due date reminders
   *
   * Special handling for process initiator capture:
   * When a task has `captureInitiator: true`, the user who completes this task
   * will be recorded as the process initiator in processData.initiator.
   * This is used as a fallback assignment when no organization data is available.
   */
  async executeUserTask(node, instance) {
    const taskData = node.data || {};
    const taskId = `task_${Date.now()}_${node.id}`;

    // Check if this task should capture the initiator
    const captureInitiator = taskData.captureInitiator === true;

    // Try to fetch form metadata if formId is attached
    let formMetadata = null;
    if (taskData.formId) {
      try {
        formMetadata = await formDatabase.getForm(taskData.formId);
      } catch (error) {
        console.error(`[ExecutionAgent] Failed to fetch form ${taskData.formId}:`, error);
      }
    } else if (taskData.formName) {
      try {
        formMetadata = await formDatabase.getFormByName(taskData.formName);
      } catch (error) {
        console.error(`[ExecutionAgent] Failed to fetch form by name ${taskData.formName}:`, error);
      }
    }

    // ENFORCE ASSIGNMENT (Feature #18)
    const assignment = this.configEnforcer.enforceTaskAssignment(node, instance);

    // ENFORCE DUE DATE & REMINDERS (Feature #19)
    let dueDateInfo = null;
    if (taskData.dueDate || taskData.dueDuration) {
      dueDateInfo = this.configEnforcer.setupTaskDueDate(
        taskId,
        node,
        instance,
        this.taskReminderCallback
      );
    }

    const task = {
      taskId,
      nodeId: node.id,
      taskName: taskData.label || taskData.taskName || 'User Task',
      // Use enforced assignment
      assignedTo: assignment.assignedTo || 'unassigned',
      assignmentType: assignment.assignmentType,
      assignedRole: assignment.assignedRole,
      candidateUsers: assignment.candidateUsers,
      candidateGroups: assignment.candidateGroups,
      // Priority for queue ordering
      priority: taskData.priority || 'medium',
      // Due date info
      dueDate: dueDateInfo?.dueDate?.toISOString() || null,
      reminderAt: dueDateInfo?.reminderAt?.toISOString() || null,
      overdue: dueDateInfo?.overdue || false,
      // Task details
      instructions: taskData.instructions || taskData.description,
      formRequired: true,
      formMetadata: formMetadata,
      fields: formMetadata?.fields || this.generateFormFields(taskData),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      // Initiator capture - when true, completion will record submitter as process initiator
      captureInitiator: captureInitiator,
      // Open to all - allows anyone to complete without specific assignment
      openToAll: taskData.openToAll === true,
      // PAGE NAVIGATION METADATA - Controls which page to display for this task
      navigation: {
        displayPageId: taskData.displayPageId || taskData.pageId || null,
        formInPage: taskData.formInPage !== false, // Default: form is embedded in page
        redirectAfterSubmit: taskData.redirectAfterSubmit || taskData.nextPageId || null,
        pageLayout: taskData.pageLayout || 'full-page', // 'full-page', 'modal', 'sidebar', 'embedded'
        showWorkflowProgress: taskData.showWorkflowProgress !== false,
        allowBackNavigation: taskData.allowBackNavigation !== false
      }
    };

    // ENFORCE PRIORITY QUEUE (Feature #20)
    this.configEnforcer.addToTaskQueue(instance.id, task);

    console.log(`[ExecutionAgent] User task created with enforcement:`, {
      taskId,
      assignedTo: task.assignedTo,
      assignmentType: task.assignmentType,
      priority: task.priority,
      dueDate: task.dueDate
    });

    // Send notifications based on assignment type (async, non-blocking)
    this.sendTaskNotifications(task, instance, node).then(notificationResult => {
      if (notificationResult.sent) {
        console.log(`[ExecutionAgent] Task notifications sent:`, {
          taskId,
          assignmentType: notificationResult.assignmentType,
          recipientCount: notificationResult.userIds.length
        });
      }
    }).catch(err => {
      console.error(`[ExecutionAgent] Task notification error for ${taskId}:`, err.message);
    });

    // Setup escalation timer for group-assigned tasks
    if (task.assignmentType === 'group') {
      const escalationTimeout = taskData.escalationTimeout || '24h'; // Default 24 hours
      const groupId = task.candidateGroups?.[0] || taskData.assigneeGroup;

      if (groupId && escalationTimeout) {
        this.setupGroupTaskEscalation(task, instance, groupId, escalationTimeout);
      }
    }

    return task;
  }

  /**
   * Setup auto-escalation for unclaimed group tasks
   * If the task is not claimed within the timeout, escalate to group admin or manager
   *
   * @param {Object} task - The task to setup escalation for
   * @param {Object} instance - Workflow instance
   * @param {string} groupId - Group ID the task is assigned to
   * @param {string} timeout - Escalation timeout (e.g., '24h', '2d')
   */
  async setupGroupTaskEscalation(task, instance, groupId, timeout) {
    try {
      const escalationResult = this.configEnforcer.setupTaskEscalation(
        task.taskId,
        groupId,
        timeout,
        instance.id,
        async (taskId, gId, instId) => {
          await this.handleTaskEscalation(taskId, gId, instId, task.taskName);
        }
      );

      if (escalationResult) {
        console.log(`[ExecutionAgent] Escalation setup for task ${task.taskId}:`, {
          groupId,
          timeout,
          escalationAt: escalationResult.escalationAt
        });
      }
    } catch (error) {
      console.error(`[ExecutionAgent] Failed to setup escalation for task ${task.taskId}:`, error.message);
    }
  }

  /**
   * Handle task escalation when a group task is not claimed within timeout
   * Resolves the escalation target and reassigns the task
   *
   * @param {string} taskId - Task ID that timed out
   * @param {string} groupId - Group ID the task was assigned to
   * @param {string} instanceId - Workflow instance ID
   * @param {string} taskName - Task name for notification
   */
  async handleTaskEscalation(taskId, groupId, instanceId, taskName) {
    console.log(`[ExecutionAgent] Handling escalation for task ${taskId} in group ${groupId}`);

    try {
      // Find escalation target: group admin -> manager -> org admin
      const escalationTarget = await this.resolveEscalationTarget(groupId);

      if (!escalationTarget) {
        console.warn(`[ExecutionAgent] No escalation target found for group ${groupId}`);
        return;
      }

      // Update task assignment to escalation target
      const taskQueue = this.configEnforcer.getTasksByPriority(instanceId);
      const task = taskQueue.find(t => t.taskId === taskId);

      if (!task) {
        console.warn(`[ExecutionAgent] Task ${taskId} not found in queue for escalation`);
        return;
      }

      // Check if task was claimed in the meantime
      if (task.claimedBy) {
        console.log(`[ExecutionAgent] Task ${taskId} was claimed - skipping escalation`);
        return;
      }

      // Reassign to escalation target
      task.escalatedTo = escalationTarget.userId;
      task.escalatedAt = new Date().toISOString();
      task.escalationReason = `Not claimed within timeout by group ${groupId}`;
      task.assignedTo = escalationTarget.userId;
      task.previousAssignment = { type: 'group', groupId };

      this.configEnforcer.updateTaskInQueue(instanceId, task);

      // Notify the escalation target
      await notificationService.send({
        userId: escalationTarget.userId,
        title: 'Task Escalated to You',
        message: `The task "${taskName}" was not claimed and has been escalated to you for action.`,
        category: 'task_escalation',
        priority: 'high',
        data: {
          taskId,
          instanceId,
          escalationReason: task.escalationReason
        },
        action: {
          type: 'navigate',
          screen: 'TaskDetail',
          params: { taskId, instanceId }
        }
      });

      console.log(`[ExecutionAgent] Task ${taskId} escalated to ${escalationTarget.userId} (${escalationTarget.role})`);

    } catch (error) {
      console.error(`[ExecutionAgent] Escalation handling failed for task ${taskId}:`, error.message);
    }
  }

  /**
   * Resolve the escalation target for a group
   * Priority: Group Admin -> Department Manager -> Org Admin
   *
   * @param {string} groupId - Group ID
   * @returns {Promise<Object|null>} Escalation target { userId, role }
   */
  async resolveEscalationTarget(groupId) {
    try {
      const { GroupService, RoleService } = require('../../services/identity');
      const db = require('../../database/ApplicationDatabase');
      const groupService = new GroupService(db);
      const roleService = new RoleService(db);

      // Try to find group admin
      const groupAdmins = await groupService.getMembers(groupId, { role: 'admin' });
      if (groupAdmins.length > 0) {
        console.log(`[ExecutionAgent] Found group admin for escalation: ${groupAdmins[0].id || groupAdmins[0].user_id}`);
        return {
          userId: groupAdmins[0].id || groupAdmins[0].user_id,
          role: 'group_admin'
        };
      }

      // Try group owner/manager
      const groupManagers = await groupService.getMembers(groupId, { role: 'manager' });
      if (groupManagers.length > 0) {
        console.log(`[ExecutionAgent] Found group manager for escalation: ${groupManagers[0].id || groupManagers[0].user_id}`);
        return {
          userId: groupManagers[0].id || groupManagers[0].user_id,
          role: 'group_manager'
        };
      }

      // Get group details to find organization
      const group = await groupService.getById(groupId);
      if (!group) {
        console.warn(`[ExecutionAgent] Group ${groupId} not found for escalation`);
        return null;
      }

      // Try to find org admin as fallback
      const orgId = group.organization_id;
      if (orgId) {
        // Get the org_admin role for this organization
        const adminRole = await roleService.getOrgRoleByName(orgId, 'org_admin');
        if (adminRole) {
          // Get users with the org_admin role
          const orgAdmins = await roleService.getUsersWithOrgRole(adminRole.id);
          if (orgAdmins.length > 0) {
            console.log(`[ExecutionAgent] Found org admin for escalation: ${orgAdmins[0].id}`);
            return {
              userId: orgAdmins[0].id,
              role: 'org_admin'
            };
          }
        }
      }

      console.warn(`[ExecutionAgent] No escalation target found for group ${groupId} - no group admin, manager, or org admin available`);
      return null;

    } catch (error) {
      console.error(`[ExecutionAgent] Failed to resolve escalation target for group ${groupId}:`, error.message);
      return null;
    }
  }

  /**
   * Generate form fields for user task based on task type
   * Provides task-specific form templates with fallback to custom fields
   */
  generateFormFields(taskData) {
    // If custom form fields are provided, use them
    if (taskData.formFields && taskData.formFields.length > 0) {
      return taskData.formFields;
    }

    // Task type-specific form templates
    const taskType = taskData.taskType || taskData.type || 'approval';
    const formTemplates = {
      approval: [
        { name: 'approved', type: 'boolean', label: 'Approved', required: true },
        { name: 'comments', type: 'textarea', label: 'Comments', required: false }
      ],
      review: [
        { name: 'reviewStatus', type: 'select', label: 'Review Status', required: true,
          options: ['Approved', 'Rejected', 'Needs Revision'] },
        { name: 'feedback', type: 'textarea', label: 'Feedback', required: true },
        { name: 'priority', type: 'select', label: 'Priority',
          options: ['Low', 'Medium', 'High', 'Critical'] }
      ],
      'data-entry': [
        { name: 'data', type: 'textarea', label: 'Enter Data', required: true },
        { name: 'category', type: 'text', label: 'Category', required: false },
        { name: 'notes', type: 'textarea', label: 'Additional Notes', required: false }
      ],
      escalation: [
        { name: 'escalationReason', type: 'select', label: 'Escalation Reason', required: true,
          options: ['Complexity', 'Authority Required', 'Time Sensitive', 'Policy Exception', 'Other'] },
        { name: 'description', type: 'textarea', label: 'Description', required: true },
        { name: 'urgency', type: 'select', label: 'Urgency', required: true,
          options: ['Normal', 'Urgent', 'Critical'] }
      ],
      confirmation: [
        { name: 'confirmed', type: 'boolean', label: 'I confirm this action', required: true },
        { name: 'signature', type: 'text', label: 'Digital Signature (Type your name)', required: true }
      ],
      input: [
        { name: 'userInput', type: 'textarea', label: taskData.inputLabel || 'Your Input', required: true }
      ],
      selection: [
        { name: 'selectedOption', type: 'select', label: taskData.selectionLabel || 'Select an Option', required: true,
          options: taskData.options || ['Option 1', 'Option 2', 'Option 3'] }
      ]
    };

    // Get template for task type, fallback to approval
    const template = formTemplates[taskType] || formTemplates.approval;

    // Merge with any additional custom fields
    const additionalFields = taskData.additionalFields || [];
    return [...template, ...additionalFields];
  }

  /**
   * Send task notifications based on assignment type
   * Implements organization-aware notification logic for Human Tasks
   *
   * Assignment types and notification behavior:
   * - 'user': Notify specific user directly
   * - 'role': Notify all users with that role
   * - 'group': Notify all group members (first to claim will complete)
   * - 'manager': Notify the resolved manager
   * - 'expression': Notify resolved user(s) from expression
   * - 'unassigned' + openToAll: No notification (task in pool for anyone)
   *
   * @param {Object} task - The created task object
   * @param {Object} instance - Workflow instance
   * @param {Object} node - Workflow node definition
   */
  async sendTaskNotifications(task, instance, node) {
    const nodeData = node.data || {};
    const assignmentType = task.assignmentType || nodeData.assignmentType || 'unassigned';
    const openToAll = nodeData.openToAll === true;

    // Skip notification for open-to-all tasks (they appear in task pool)
    if (assignmentType === 'unassigned' && openToAll) {
      console.log(`[ExecutionAgent] Task ${task.taskId} is open to all - no notification sent`);
      return { notified: false, reason: 'open_to_all' };
    }

    const notificationPayload = {
      title: `New Task: ${task.taskName}`,
      message: task.instructions || `You have a new task assigned: ${task.taskName}`,
      category: 'task',
      priority: task.priority === 'high' ? 'high' : 'normal',
      data: {
        taskId: task.taskId,
        nodeId: node.id,
        instanceId: instance.id,
        workflowId: instance.workflowId,
        dueDate: task.dueDate
      },
      action: {
        type: 'navigate',
        screen: 'TaskDetail',
        params: { taskId: task.taskId, instanceId: instance.id }
      }
    };

    const notificationResults = {
      assignmentType,
      userIds: [],
      sent: false
    };

    try {
      switch (assignmentType) {
        case 'user': {
          // Notify specific user
          const userId = task.assignedTo;
          if (userId && userId !== 'unassigned') {
            await notificationService.send({
              userId,
              ...notificationPayload
            });
            notificationResults.userIds.push(userId);
            notificationResults.sent = true;
            console.log(`[ExecutionAgent] Notified user ${userId} for task ${task.taskId}`);
          }
          break;
        }

        case 'role': {
          // Notify all users with the assigned role
          const roleName = task.assignedRole || nodeData.assigneeRole;
          if (roleName && instance.organizationId) {
            const userIds = await this.getUserIdsByRole(instance.organizationId, roleName);
            if (userIds.length > 0) {
              await notificationService.send({
                userId: userIds,
                ...notificationPayload,
                message: `You have a new task assigned to the "${roleName}" role: ${task.taskName}`
              });
              notificationResults.userIds = userIds;
              notificationResults.sent = true;
              console.log(`[ExecutionAgent] Notified ${userIds.length} users with role "${roleName}" for task ${task.taskId}`);
            }
          }
          break;
        }

        case 'group': {
          // Notify all group members (first to claim will complete)
          const groupId = task.candidateGroups?.[0] || nodeData.assigneeGroup;
          if (groupId && instance.organizationId) {
            const userIds = await this.getUserIdsByGroup(groupId);
            if (userIds.length > 0) {
              await notificationService.send({
                userId: userIds,
                ...notificationPayload,
                message: `A new task is available for your group: ${task.taskName}. First to claim will complete it.`
              });
              notificationResults.userIds = userIds;
              notificationResults.sent = true;
              notificationResults.requiresClaim = true;
              console.log(`[ExecutionAgent] Notified ${userIds.length} group members for task ${task.taskId}`);
            }
          }
          break;
        }

        case 'manager': {
          // Notify the resolved manager
          const managerId = task.assignedTo;
          if (managerId && managerId !== 'unassigned') {
            await notificationService.send({
              userId: managerId,
              ...notificationPayload,
              message: `A task requires your managerial attention: ${task.taskName}`
            });
            notificationResults.userIds.push(managerId);
            notificationResults.sent = true;
            console.log(`[ExecutionAgent] Notified manager ${managerId} for task ${task.taskId}`);
          }
          break;
        }

        case 'departmentHead': {
          // Notify department head
          const headId = task.assignedTo;
          if (headId && headId !== 'unassigned') {
            await notificationService.send({
              userId: headId,
              ...notificationPayload,
              message: `A task requires your department head approval: ${task.taskName}`
            });
            notificationResults.userIds.push(headId);
            notificationResults.sent = true;
            console.log(`[ExecutionAgent] Notified department head ${headId} for task ${task.taskId}`);
          }
          break;
        }

        case 'expression': {
          // Expression-based assignment - notify resolved user(s)
          const assignees = Array.isArray(task.candidateUsers)
            ? task.candidateUsers
            : task.assignedTo && task.assignedTo !== 'unassigned'
              ? [task.assignedTo]
              : [];

          if (assignees.length > 0) {
            await notificationService.send({
              userId: assignees,
              ...notificationPayload
            });
            notificationResults.userIds = assignees;
            notificationResults.sent = true;
            console.log(`[ExecutionAgent] Notified ${assignees.length} user(s) from expression for task ${task.taskId}`);
          }
          break;
        }

        case 'unassigned':
        default:
          // No specific assignment - task goes to pool
          console.log(`[ExecutionAgent] Task ${task.taskId} is unassigned - no notification sent`);
          notificationResults.reason = 'unassigned';
          break;
      }
    } catch (error) {
      console.error(`[ExecutionAgent] Failed to send task notifications for ${task.taskId}:`, error.message);
      notificationResults.error = error.message;
    }

    return notificationResults;
  }

  /**
   * Get user IDs by role name
   * @param {string} organizationId - Organization ID
   * @param {string} roleName - Role name to lookup
   * @returns {Promise<string[]>} Array of user IDs
   */
  async getUserIdsByRole(organizationId, roleName) {
    try {
      // Try to load identity services (they require database connection)
      const { RoleService } = require('../../services/identity');
      const db = require('../../database/ApplicationDatabase');
      const roleService = new RoleService(db);

      // First, find the role by name
      const role = await roleService.getOrgRoleByName(organizationId, roleName);
      if (!role) {
        console.warn(`[ExecutionAgent] Role "${roleName}" not found in organization ${organizationId}`);
        return [];
      }

      // Get users with this role
      const users = await roleService.getUsersWithOrgRole(role.id);
      return users.map(u => u.id || u.user_id);
    } catch (error) {
      console.error(`[ExecutionAgent] Failed to get users by role "${roleName}":`, error.message);
      return [];
    }
  }

  /**
   * Get user IDs by group
   * @param {string} groupId - Group ID
   * @returns {Promise<string[]>} Array of user IDs
   */
  async getUserIdsByGroup(groupId) {
    try {
      // Try to load identity services
      const { GroupService } = require('../../services/identity');
      const db = require('../../database/ApplicationDatabase');
      const groupService = new GroupService(db);

      // Get members of this group
      const members = await groupService.getMembers(groupId);
      return members.map(m => m.id || m.user_id);
    } catch (error) {
      console.error(`[ExecutionAgent] Failed to get group members for "${groupId}":`, error.message);
      return [];
    }
  }

  /**
   * Get helper functions library for script execution
   */
  getHelperFunctions() {
    return {
      // Data manipulation
      updateField: (data, field, value) => {
        return { ...data, [field]: value };
      },
      getField: (data, field) => {
        return data[field];
      },
      mergeData: (data, newData) => {
        return { ...data, ...newData };
      },

      // Array operations
      addToArray: (data, field, item) => {
        const arr = data[field] || [];
        return { ...data, [field]: [...arr, item] };
      },
      filterArray: (data, field, predicate) => {
        const arr = data[field] || [];
        return { ...data, [field]: arr.filter(predicate) };
      },

      // Validation
      validateRequired: (data, fields) => {
        const missing = fields.filter(f => !data[f]);
        return { valid: missing.length === 0, missing };
      },

      // String operations
      formatString: (template, data) => {
        return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || '');
      },

      // Date operations
      getCurrentDate: () => new Date().toISOString(),
      formatDate: (date) => new Date(date).toLocaleDateString(),

      // Logging
      log: (...args) => {
        console.log('[ScriptTask]', ...args);
      }
    };
  }

  /**
   * Use AI to fix a broken script with historical learning
   */
  async fixScriptWithAI(originalScript, errorMessage, taskData, processData, workflowId) {
    if (!this.useLLM) {
      console.log('[ExecutionAgent] AI not available for script recovery');
      return { script: null, method: null };
    }

    console.log('[ExecutionAgent] Attempting AI-powered script recovery...');

    // Step 1: Check historical fixes for similar errors
    const similarFixes = this.executionLogDB.findSimilarFixes(errorMessage, originalScript, 3);

    if (similarFixes.length > 0) {
      console.log(`[ExecutionAgent] Found ${similarFixes.length} similar historical fixes`);

      // Try the most successful fix first
      const bestFix = similarFixes[0];
      console.log(`[ExecutionAgent] Using cached fix (success count: ${bestFix.successCount})`);

      return {
        script: bestFix.fixedScript,
        method: 'cached',
        reference: bestFix
      };
    }

    // Step 2: No historical fix found, use AI to generate new fix
    console.log('[ExecutionAgent] No historical fix found, generating AI solution...');

    try {
      // Build prompt with historical context if available
      let historicalContext = '';
      if (similarFixes.length > 0) {
        historicalContext = '\n**Similar Past Errors and Fixes:**\n';
        similarFixes.forEach((fix, idx) => {
          historicalContext += `\nExample ${idx + 1}:\n`;
          historicalContext += `Error: ${fix.errorMessage}\n`;
          historicalContext += `Fix: ${fix.fixedScript}\n`;
        });
      }

      const prompt = `You are a script repair expert with access to historical fixes. A JavaScript script failed during execution and you need to fix it.

**Original Script:**
\`\`\`javascript
${originalScript}
\`\`\`

**Error:**
${errorMessage}

**Task Context:**
- Task Label: ${taskData.label || 'Unknown'}
- Task Description: ${taskData.description || 'No description'}

**Available Data:**
- processData: ${JSON.stringify(processData, null, 2)}

**Available Helper Functions:**
You can ONLY use these pre-defined functions:
- updateField(data, field, value) - Update a single field
- getField(data, field) - Get a field value
- mergeData(data, newData) - Merge objects
- addToArray(data, field, item) - Add item to array field
- filterArray(data, field, predicate) - Filter array field
- validateRequired(data, fields) - Validate required fields
- formatString(template, data) - Format string with placeholders
- getCurrentDate() - Get current ISO date
- formatDate(date) - Format date to locale string
- log(...args) - Log messages
${historicalContext}

**Your Task:**
Fix the script to accomplish the original intent while:
1. Using ONLY the available helper functions (no undefined functions)
2. Working with the processData object
3. Returning a valid result
4. Avoiding the error that occurred
5. Learning from similar past fixes if provided

**Return ONLY the fixed JavaScript code, nothing else. Do not include markdown code blocks or explanations.**`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const fixedScript = response.content[0].text.trim();
      console.log('[ExecutionAgent] AI generated new fixed script');

      return {
        script: fixedScript,
        method: 'ai',
        reference: null
      };
    } catch (aiError) {
      console.error('[ExecutionAgent] AI script recovery failed:', aiError.message);
      return { script: null, method: null };
    }
  }

  /**
   * Execute script task with logging and learning
   */
  async executeScriptTask(node, instance) {
    const taskData = node.data || {};
    const scriptType = taskData.scriptType || 'javascript';
    const startTime = Date.now();
    const workflowId = instance.workflowId || 'unknown';

    if (scriptType.toLowerCase() === 'javascript') {
      const originalScript = taskData.script || 'return { executed: true };';
      const helpers = this.getHelperFunctions();
      let attemptCount = 0;
      let currentScript = originalScript;
      let fixMethod = null;
      let lastError = null;

      // Try up to 3 times: original, cached fix, then AI-generated fix
      while (attemptCount < 3) {
        attemptCount++;

        try {
          console.log(`[ExecutionAgent] Script execution attempt ${attemptCount}`);

          // Create function with processData and helper functions
          const fn = new Function(
            'processData',
            'helpers',
            `
            // Destructure helpers for easy access
            const {
              updateField, getField, mergeData,
              addToArray, filterArray,
              validateRequired, formatString,
              getCurrentDate, formatDate,
              log
            } = helpers;

            // Execute user script
            ${currentScript}
            `
          );

          const result = fn(instance.processData, helpers);
          const executionTime = Date.now() - startTime;

          // Log successful execution
          this.executionLogDB.logExecution({
            workflowId,
            instanceId: instance.id,
            nodeId: node.id,
            nodeType: node.type,
            taskLabel: taskData.label,
            status: attemptCount > 1 ? 'fixed' : 'success',
            originalScript,
            fixedScript: attemptCount > 1 ? currentScript : null,
            fixMethod,
            executionTime,
            retryCount: attemptCount - 1
          });

          // If this was a successful fix, store it for future reference
          if (attemptCount > 1 && fixMethod) {
            this.executionLogDB.storeFix({
              errorType: lastError.name || 'Error',
              errorMessage: lastError.message,
              originalScript,
              fixedScript: currentScript,
              taskContext: {
                label: taskData.label,
                description: taskData.description
              }
            });

            console.log(`[ExecutionAgent] ✓ ${fixMethod === 'cached' ? 'Cached' : 'AI'} fix executed successfully!`);
          }

          return result;
        } catch (error) {
          console.error(`[ExecutionAgent] Script execution attempt ${attemptCount} failed:`, error.message);
          lastError = error;

          // If first attempt failed and AI/cache is available, try to fix it
          if (attemptCount === 1) {
            const fixResult = await this.fixScriptWithAI(
              originalScript,
              error.message,
              taskData,
              instance.processData,
              workflowId
            );

            if (fixResult.script) {
              currentScript = fixResult.script;
              fixMethod = fixResult.method;
              console.log(`[ExecutionAgent] Retrying with ${fixMethod} fix...`);
              continue; // Try again with fixed script
            }
          }

          // If second attempt failed with cached fix, try AI generation
          if (attemptCount === 2 && fixMethod === 'cached') {
            console.log('[ExecutionAgent] Cached fix failed, trying AI generation...');
            const fixResult = await this.fixScriptWithAI(
              originalScript,
              error.message,
              taskData,
              instance.processData,
              workflowId
            );

            if (fixResult.script && fixResult.method === 'ai') {
              currentScript = fixResult.script;
              fixMethod = 'ai';
              console.log('[ExecutionAgent] Retrying with AI-generated fix...');
              continue; // Try again
            }
          }

          // Log failed execution
          const executionTime = Date.now() - startTime;
          this.executionLogDB.logExecution({
            workflowId,
            instanceId: instance.id,
            nodeId: node.id,
            nodeType: node.type,
            taskLabel: taskData.label,
            status: 'failed',
            error: error.message,
            originalScript,
            fixedScript: attemptCount > 1 ? currentScript : null,
            fixMethod,
            executionTime,
            retryCount: attemptCount - 1
          });

          // If we've exhausted attempts, throw error
          throw new Error(`Script execution failed: ${error.message}`);
        }
      }
    }

    return { message: `Script task executed: ${taskData.label}` };
  }

  /**
   * Execute service task - calls external API
   * Enforces: Response validation, error handling strategies (Features #23, #24)
   */
  async executeServiceTask(node, instance, context = {}) {
    const taskData = node.data || {};
    const apiConfig = taskData.apiConfig || {};

    if (!apiConfig.url) {
      return { message: `Service task executed: ${taskData.label}` };
    }

    // Check circuit breaker
    const circuitKey = `${node.id}:${apiConfig.url}`;
    if (this.configEnforcer.isCircuitOpen(circuitKey)) {
      const errorResult = this.configEnforcer.applyRestApiErrorHandling(node, {
        message: 'Circuit breaker is open',
        response: { status: 503 }
      }, context);

      if (errorResult.handled && errorResult.continue) {
        return { apiResponse: errorResult.result, status: 'circuit_breaker', handled: true };
      }
      throw new Error('Circuit breaker is open for this endpoint');
    }

    // Substitute variables in URL and body
    const url = this.substituteVariables(apiConfig.url, instance.processData);
    let body = apiConfig.body;
    if (typeof body === 'string') {
      body = this.substituteVariables(body, instance.processData);
      try {
        body = JSON.parse(body);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    } else if (!body) {
      body = instance.processData;
    }

    // Substitute variables in headers
    const headers = {};
    for (const [key, value] of Object.entries(apiConfig.headers || {})) {
      headers[key] = this.substituteVariables(value, instance.processData);
    }

    try {
      console.log(`[ExecutionAgent] REST API call: ${apiConfig.method || 'POST'} ${url}`);

      const response = await axios({
        method: apiConfig.method || 'POST',
        url,
        headers,
        data: body,
        timeout: apiConfig.timeout || 30000,
        validateStatus: () => true // Don't throw on any status
      });

      // VALIDATE RESPONSE (Feature #23)
      const validation = this.configEnforcer.validateRestApiResponse(node, response);

      if (!validation.valid) {
        console.warn(`[ExecutionAgent] REST API response validation failed:`, validation.errors);
        // Apply error handling for validation failures
        const errorResult = this.configEnforcer.applyRestApiErrorHandling(node, {
          message: validation.errors.join('; '),
          response
        }, context);

        if (errorResult.handled) {
          if (errorResult.retry) {
            // Retry the request
            console.log(`[ExecutionAgent] Retrying REST API call (attempt ${errorResult.retryCount})`);
            await new Promise(resolve => setTimeout(resolve, errorResult.delay));
            return this.executeServiceTask(node, instance, {
              ...context,
              retryCount: errorResult.retryCount
            });
          }
          if (errorResult.useFallback) {
            // Use fallback URL
            console.log(`[ExecutionAgent] Using fallback URL: ${errorResult.fallbackUrl}`);
            const fallbackNode = {
              ...node,
              data: { ...taskData, apiConfig: { ...apiConfig, url: errorResult.fallbackUrl } }
            };
            return this.executeServiceTask(fallbackNode, instance, {
              ...context,
              usedFallback: true
            });
          }
          if (errorResult.continue) {
            return { apiResponse: errorResult.result, status: 'error_handled', validation };
          }
        }
        throw new Error(`REST API validation failed: ${validation.errors.join('; ')}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.warn(`[ExecutionAgent] REST API warnings:`, validation.warnings);
      }

      return {
        apiResponse: validation.data,
        status: validation.status,
        validation: {
          valid: true,
          warnings: validation.warnings
        }
      };

    } catch (error) {
      console.error(`[ExecutionAgent] REST API call failed:`, error.message);

      // APPLY ERROR HANDLING STRATEGY (Feature #24)
      const errorResult = this.configEnforcer.applyRestApiErrorHandling(node, error, context);

      if (errorResult.handled) {
        if (errorResult.retry) {
          console.log(`[ExecutionAgent] Retrying REST API call (attempt ${errorResult.retryCount}/${errorResult.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, errorResult.delay));
          return this.executeServiceTask(node, instance, {
            ...context,
            retryCount: errorResult.retryCount
          });
        }
        if (errorResult.useFallback) {
          console.log(`[ExecutionAgent] Using fallback URL: ${errorResult.fallbackUrl}`);
          const fallbackNode = {
            ...node,
            data: { ...taskData, apiConfig: { ...apiConfig, url: errorResult.fallbackUrl } }
          };
          return this.executeServiceTask(fallbackNode, instance, {
            ...context,
            usedFallback: true
          });
        }
        if (errorResult.continue) {
          return { apiResponse: errorResult.result, status: 'error_handled' };
        }
      }

      throw new Error(`API call failed: ${errorResult.error || error.message}`);
    }
  }

  /**
   * Execute send task - sends notification
   */
  async executeSendTask(node, instance) {
    const taskData = node.data || {};

    return {
      notificationSent: true,
      channel: taskData.channel || 'email',
      recipient: taskData.recipient || instance.initiator,
      subject: taskData.subject || 'Workflow Notification',
      message: taskData.message || taskData.description
    };
  }

  /**
   * Execute business rule task with enhanced enforcement
   * Uses RulesEngineEnforcer for:
   * - Rule-to-Node Enforcement (#25)
   * - Isolated Action Execution (#26)
   * - Cascade Rule Chains (#27)
   * - Workflow Context Variables (#28)
   */
  async executeBusinessRuleTask(node, instance, workflowDef = null) {
    const taskData = node.data || {};
    const nodeId = node.id;

    try {
      console.log(`[ExecutionAgent] Enforcing rules for node: ${nodeId}`);

      // Use RulesEngineEnforcer for full enforcement
      const enforcement = await this.rulesEngineEnforcer.enforceNodeRules(
        nodeId,
        instance,
        workflowDef
      );

      if (!enforcement.enforced) {
        // No rules to enforce, return success
        return {
          validationPassed: true,
          rulesExecuted: 0,
          rulesFired: 0,
          message: enforcement.reason || 'No rules to evaluate'
        };
      }

      // RULE-TO-NODE ENFORCEMENT (#25): Apply context updates to instance
      if (enforcement.contextUpdates && Object.keys(enforcement.contextUpdates).length > 0) {
        console.log(`[ExecutionAgent] Applying rule context updates:`, Object.keys(enforcement.contextUpdates));

        // Merge context updates into instance process data
        instance.processData = {
          ...instance.processData,
          ...enforcement.contextUpdates
        };

        // Also update instance.data for backwards compatibility
        instance.data = {
          ...instance.data,
          ...enforcement.contextUpdates
        };
      }

      // Handle routing decision from rules
      if (enforcement.routingDecision) {
        instance.processData._routingDecision = enforcement.routingDecision;
      }

      // Log rule execution results
      console.log(`[ExecutionAgent] Rules enforcement completed:`, {
        rulesEvaluated: enforcement.statistics?.rulesEvaluated || 0,
        rulesFired: enforcement.statistics?.rulesFired || 0,
        actionsExecuted: enforcement.statistics?.actionsExecuted || 0,
        shouldContinue: enforcement.shouldContinue,
        shouldStop: enforcement.shouldStop,
        hasErrors: enforcement.hasErrors
      });

      return {
        validationPassed: enforcement.validationPassed,
        shouldStop: enforcement.shouldStop,
        shouldContinue: enforcement.shouldContinue,
        rulesExecuted: enforcement.statistics?.rulesEvaluated || 0,
        rulesFired: enforcement.statistics?.rulesFired || 0,
        actionsExecuted: enforcement.statistics?.actionsExecuted || 0,
        executionTrace: enforcement.trace,
        contextUpdates: enforcement.contextUpdates,
        notifications: enforcement.notifications,
        errors: enforcement.errors,
        routingDecision: enforcement.routingDecision,
        insights: this.rulesEvaluator.getExecutionInsights(enforcement.trace || [])
      };

    } catch (error) {
      console.error(`[ExecutionAgent] Error in business rule task:`, error);
      return {
        validationPassed: false,
        error: error.message,
        executionTrace: []
      };
    }
  }

  /**
   * Evaluate application-level rules with computational graph
   */
  async evaluateApplicationRules(applicationId, context = {}) {
    try {
      console.log(`[ExecutionAgent] Evaluating application rules for: ${applicationId}`);

      const evaluationResult = await this.rulesEvaluator.evaluateApplicationRules(applicationId, context);

      if (!evaluationResult.success) {
        console.error(`[ExecutionAgent] Application rule evaluation failed:`, evaluationResult.error);
        return {
          success: false,
          error: evaluationResult.error
        };
      }

      const trace = evaluationResult.executionTrace || [];
      const firedRules = trace.filter(t => t.fired);

      console.log(`[ExecutionAgent] Application rules evaluation completed:`, {
        totalRules: evaluationResult.statistics?.totalRules || 0,
        rulesFired: firedRules.length,
        executionLevels: evaluationResult.statistics?.totalLevels || 0
      });

      return {
        success: true,
        executionTrace: trace,
        finalContext: evaluationResult.finalContext,
        statistics: evaluationResult.statistics,
        graph: evaluationResult.graph,
        insights: this.rulesEvaluator.getExecutionInsights(trace)
      };

    } catch (error) {
      console.error(`[ExecutionAgent] Error evaluating application rules:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute decision gateway - evaluates conditions to determine path
   */
  async executeDecisionGateway(node, instance, workflowDef) {
    const taskData = node.data || {};
    const gatewayType = taskData.gatewayType || 'exclusive';
    const processData = instance.processData || {};

    // Get outgoing flows for this gateway
    const outgoingFlows = this.getOutgoingFlows(node.id, workflowDef);

    // Use SafeConditionEvaluator to evaluate gateway conditions
    const result = this.conditionEvaluator.evaluateGatewayConditions(
      node,
      processData,
      outgoingFlows
    );

    console.log(`[ExecutionAgent] Decision gateway ${node.id}: condition="${taskData.condition}", result=${result.decision}`);

    // Get page navigation for the selected outcome if defined
    const outcomePages = taskData.outcomePages || {};
    const selectedOutcomePage = outcomePages[result.decision] || taskData.defaultPageId || null;

    return {
      gatewayType: result.gatewayType,
      decision: result.decision,
      condition: taskData.condition,
      conditionResult: result.conditionResult,
      selectedFlow: result.selectedFlow,
      selectedFlows: result.selectedFlows,
      matchingFlows: result.matchingFlows,
      // PAGE NAVIGATION - Which page to show based on decision outcome
      navigation: {
        nextPageId: selectedOutcomePage,
        outcomePages: outcomePages,
        shouldNavigate: !!selectedOutcomePage
      }
    };
  }

  /**
   * Get outgoing flows from a gateway node
   */
  getOutgoingFlows(nodeId, workflowDef) {
    if (!workflowDef) return [];

    const connections = workflowDef.connections || workflowDef.edges || [];
    return connections
      .filter(conn => conn.source === nodeId)
      .map(conn => ({
        id: conn.id,
        source: conn.source,
        target: conn.target,
        condition: conn.data?.condition || conn.condition,
        isDefault: conn.data?.isDefault || conn.isDefault
      }));
  }

  /**
   * Execute timer event
   */
  async executeTimerEvent(node, instance) {
    const taskData = node.data || {};

    return {
      timerSet: true,
      duration: taskData.duration || '1h',
      waitUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
  }

  /**
   * Execute LLM task - uses AI to perform intelligent tasks
   */
  async executeLLMTask(node, instance) {
    const taskData = node.data || {};

    if (!this.useLLM) {
      const warningMessage = 'LLM task skipped - ANTHROPIC_API_KEY not configured or invalid. Set the environment variable to enable AI features.';
      console.warn(`[ExecutionAgent] ${warningMessage}`);

      // Emit warning event for frontend notification if eventBus is available
      try {
        eventBus.emit('workflow:warning', {
          instanceId: instance.id,
          nodeId: node.id,
          type: 'llm_not_configured',
          message: warningMessage,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        // Ignore event emission errors
      }

      return {
        llmExecuted: false,
        llmMocked: true,
        warning: warningMessage,
        message: 'LLM task returned mock result - configure ANTHROPIC_API_KEY for real AI responses',
        mockResult: `[Mock Response] Task "${taskData.label || node.id}" would process: ${taskData.prompt?.substring(0, 100) || 'No prompt defined'}...`
      };
    }

    try {
      // Get the prompt template and substitute variables
      const promptTemplate = taskData.prompt || 'Analyze the following data: ${JSON.stringify(processData)}';
      const prompt = this.substituteVariables(promptTemplate, instance.processData);

      console.log(`[ExecutionAgent] Executing LLM task with model: ${taskData.model || 'claude-sonnet-4-5-20250929'}`);

      // Call Anthropic API
      const response = await this.anthropic.messages.create({
        model: taskData.model || 'claude-sonnet-4-5-20250929',
        max_tokens: taskData.maxTokens || 1000,
        temperature: taskData.temperature !== undefined ? taskData.temperature : 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const llmResult = response.content[0].text;

      // Store result in output variable or default location
      const outputVariable = taskData.outputVariable || 'llmResult';
      const output = {
        llmExecuted: true,
        model: taskData.model || 'claude-sonnet-4-5-20250929',
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens
      };

      // Add the LLM result to the output under the specified variable name
      output[outputVariable] = llmResult;

      console.log(`[ExecutionAgent] LLM task completed, result stored in: ${outputVariable}`);
      return output;

    } catch (error) {
      console.error('[ExecutionAgent] LLM task failed:', error);
      throw new Error(`LLM task failed: ${error.message}`);
    }
  }

  /**
   * Convert string to camelCase
   */
  toCamelCase(str) {
    return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase());
  }

  /**
   * Convert string to snake_case
   */
  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Find property in object with flexible naming
   * Tries: original, camelCase, snake_case, lowercase
   */
  findProperty(obj, key) {
    if (obj === null || obj === undefined) return undefined;

    // Try direct match first
    if (key in obj) return obj[key];

    // Try camelCase version
    const camelKey = this.toCamelCase(key);
    if (camelKey !== key && camelKey in obj) return obj[camelKey];

    // Try snake_case version
    const snakeKey = this.toSnakeCase(key);
    if (snakeKey !== key && snakeKey in obj) return obj[snakeKey];

    // Try lowercase
    const lowerKey = key.toLowerCase();
    if (lowerKey !== key && lowerKey in obj) return obj[lowerKey];

    // Case-insensitive search as last resort
    const objKeys = Object.keys(obj);
    const matchingKey = objKeys.find(k => k.toLowerCase() === lowerKey);
    if (matchingKey) return obj[matchingKey];

    return undefined;
  }

  /**
   * Substitute variables in a template string
   * Replaces ${variableName} with values from processData
   * Supports multiple naming conventions: camelCase, snake_case, kebab-case
   */
  substituteVariables(template, processData) {
    return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
      try {
        // Support nested paths like ${processData.user.name}
        const pathParts = path.split('.');

        let value = { processData };

        for (const key of pathParts) {
          if (key === 'processData') {
            value = processData;
          } else {
            // Use flexible property lookup
            value = this.findProperty(value, key);

            if (value === undefined) {
              // Property not found, log warning and return original
              console.warn(`[ExecutionAgent] Variable not found: ${path}, tried variations of key: ${key}`);
              return match;
            }
          }
        }

        // Handle different types of values
        if (value === null) return 'null';
        if (value === undefined) return match;
        if (typeof value === 'object') return JSON.stringify(value);

        return String(value);

      } catch (error) {
        console.error(`[ExecutionAgent] Error substituting variable ${path}:`, error);
        return match;
      }
    });
  }

  /**
   * Execute end event
   * Enforces: Event emission on completion (Feature #15)
   */
  async executeEndEvent(node, instance, workflowDef) {
    const taskData = node.data || {};

    // EMIT EVENT ON COMPLETION (Feature #15)
    let emittedEvent = null;
    if (taskData.emitEvent) {
      emittedEvent = await this.configEnforcer.emitEndEventEvents(node, instance, workflowDef || {});
      console.log(`[ExecutionAgent] End event emitted: ${taskData.emitEvent}`);
    }

    return {
      message: 'Workflow completed',
      result: taskData.result || 'Success',
      endTime: new Date().toISOString(),
      emittedEvent: emittedEvent ? {
        eventName: emittedEvent.eventName,
        payload: emittedEvent.payload
      } : null,
      // PAGE NAVIGATION - Where to redirect when workflow completes
      navigation: {
        completionPageId: taskData.completionPageId || taskData.redirectTo || null,
        showSummary: taskData.showSummary !== false,
        summaryPageId: taskData.summaryPageId || null
      }
    };
  }

  /**
   * Execute sub-workflow node
   * Enforces: Input/Output mapping validation (Features #21, #22)
   */
  async executeSubWorkflow(node, instance, workflowDef, targetWorkflowDef = null) {
    const taskData = node.data || {};
    const SubWorkflowNode = require('../../services/workflow/nodes/SubWorkflowNode');

    // Create sub-workflow node instance
    const subWorkflow = SubWorkflowNode.fromNodeData(node);

    // VALIDATE INPUT MAPPING (Feature #21)
    if (targetWorkflowDef) {
      const inputValidation = this.configEnforcer.validateSubWorkflowInputMapping(
        node,
        instance.processData,
        targetWorkflowDef
      );

      if (!inputValidation.valid) {
        console.error(`[ExecutionAgent] Sub-workflow input validation failed:`, inputValidation.errors);
        throw new Error(`Sub-workflow input validation failed: ${inputValidation.errors.join('; ')}`);
      }

      if (inputValidation.warnings.length > 0) {
        console.warn(`[ExecutionAgent] Sub-workflow input warnings:`, inputValidation.warnings);
      }
    }

    try {
      // Execute sub-workflow
      const result = await subWorkflow.execute({
        variables: instance.processData,
        correlationId: instance.correlationId || instance.id,
        workflowId: workflowDef?.id,
        nodeId: node.id
      });

      // VALIDATE OUTPUT MAPPING (Feature #22)
      if (result.success && result.output) {
        const outputValidation = this.configEnforcer.validateSubWorkflowOutputMapping(
          node,
          result.output
        );

        if (outputValidation.warnings.length > 0) {
          console.warn(`[ExecutionAgent] Sub-workflow output warnings:`, outputValidation.warnings);
        }

        return {
          ...result,
          output: outputValidation.output,
          outputValidation: {
            valid: outputValidation.valid,
            warnings: outputValidation.warnings
          }
        };
      }

      return result;

    } catch (error) {
      // HANDLE ASYNC ERROR (Feature #22)
      if (taskData.async || !taskData.waitForCompletion) {
        const errorHandling = this.configEnforcer.handleAsyncSubWorkflowError(node, error, {
          retryCount: 0
        });

        if (errorHandling.handled) {
          if (errorHandling.retry) {
            console.log(`[ExecutionAgent] Retrying sub-workflow (attempt ${errorHandling.retryCount})`);
            await new Promise(resolve => setTimeout(resolve, errorHandling.delay));
            return this.executeSubWorkflow(node, instance, workflowDef, targetWorkflowDef);
          }
          if (errorHandling.continue) {
            return {
              success: false,
              error: error.message,
              continued: true,
              result: errorHandling.result
            };
          }
        }
      }

      throw error;
    }
  }

  /**
   * Get tasks by priority for an instance
   */
  getTasksByPriority(instanceId) {
    return this.configEnforcer.getTasksByPriority(instanceId);
  }

  /**
   * Get next task by priority
   */
  getNextTask(instanceId, userId = null) {
    return this.configEnforcer.getNextTask(instanceId, userId);
  }

  /**
   * Complete a task and remove from queue
   */
  completeTask(instanceId, taskId) {
    this.configEnforcer.cancelTaskReminders(taskId);
    this.configEnforcer.removeFromTaskQueue(instanceId, taskId);
  }

  // ============================================================
  // DATA MODEL ENFORCEMENT METHODS (Features #29-#32)
  // ============================================================

  /**
   * Validate and coerce a record before saving
   * Enforces: Field Constraints (#29) and Type Coercion (#30)
   * @param {string} modelNameOrId - Data model name or ID
   * @param {Object} record - Record data to validate
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} - Validation result with coerced data
   */
  async validateRecord(modelNameOrId, record, options = {}) {
    return this.dataModelEnforcer.validateAndCoerce(modelNameOrId, record, options);
  }

  /**
   * Validate referential integrity for a record
   * Enforces: Referential Integrity (#31)
   * @param {string} modelNameOrId - Data model name or ID
   * @param {Object} record - Record with reference fields
   * @param {Object} options - Validation options
   * @returns {Promise<Object>} - Reference validation result
   */
  async validateReferences(modelNameOrId, record, options = {}) {
    return this.dataModelEnforcer.validateReferences(modelNameOrId, record, options);
  }

  /**
   * Execute cascade delete for a record
   * Enforces: Cascade Delete (#32)
   * @param {string} modelNameOrId - Data model name or ID
   * @param {string} recordId - ID of record to delete
   * @param {Object} options - Delete options (dryRun, etc.)
   * @returns {Promise<Object>} - Cascade delete result
   */
  async executeCascadeDelete(modelNameOrId, recordId, options = {}) {
    return this.dataModelEnforcer.executeCascadeDelete(modelNameOrId, recordId, options);
  }

  /**
   * Full data operation with all enforcements
   * Use this for workflow data tasks that need complete validation
   * @param {string} operation - 'create', 'update', or 'delete'
   * @param {string} modelNameOrId - Data model name or ID
   * @param {Object} data - Record data or ID for delete
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} - Operation result
   */
  async executeDataOperation(operation, modelNameOrId, data, options = {}) {
    const result = {
      operation,
      model: modelNameOrId,
      success: false,
      timestamp: new Date().toISOString()
    };

    try {
      switch (operation.toLowerCase()) {
        case 'create':
        case 'update': {
          // Step 1: Validate and coerce (Features #29, #30)
          const validation = await this.validateRecord(modelNameOrId, data, {
            coerce: true,
            validateRequired: operation === 'create',
            ...options
          });

          if (!validation.valid) {
            result.errors = validation.errors;
            result.warnings = validation.warnings;
            return result;
          }

          // Step 2: Validate references (Feature #31)
          if (validation.hasReferences) {
            const refValidation = await this.validateReferences(
              modelNameOrId,
              validation.coercedRecord || data,
              options
            );

            if (!refValidation.valid) {
              result.errors = refValidation.errors;
              result.warnings = refValidation.warnings;
              result.brokenReferences = refValidation.brokenReferences;
              return result;
            }
          }

          result.success = true;
          result.data = validation.coercedRecord || data;
          result.coerced = validation.coerced;
          result.warnings = validation.warnings;
          break;
        }

        case 'delete': {
          const recordId = typeof data === 'string' ? data : data.id;

          // Check if cascade delete is needed (Feature #32)
          const cascadeResult = await this.executeCascadeDelete(
            modelNameOrId,
            recordId,
            { dryRun: options.dryRun !== false, ...options }
          );

          result.success = cascadeResult.success;
          result.cascadeDelete = cascadeResult;

          if (!cascadeResult.success) {
            result.errors = cascadeResult.errors;
            result.blockedBy = cascadeResult.blockedBy;
          }
          break;
        }

        default:
          result.errors = [`Unknown operation: ${operation}`];
      }

      return result;

    } catch (error) {
      console.error(`[ExecutionAgent] Data operation error:`, error);
      result.errors = [error.message];
      return result;
    }
  }
}

module.exports = ExecutionAgent;
