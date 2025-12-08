/**
 * Workflow Instance Model
 */

const { v4: uuidv4 } = require('uuid');

class WorkflowInstance {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.workflowId = data.workflowId;
    this.workflow = data.workflow;
    this.status = data.status || 'pending';
    this.input = data.input || {};
    this.data = data.data || {};
    this.currentNodeId = data.currentNodeId || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.completedAt = data.completedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      workflowId: this.workflowId,
      status: this.status,
      input: this.input,
      data: this.data,
      currentNodeId: this.currentNodeId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt
    };
  }
}

module.exports = WorkflowInstance;
