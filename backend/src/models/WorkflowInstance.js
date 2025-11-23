/**
 * Workflow Instance Model
 * Represents a running instance of a workflow
 */

class WorkflowInstance {
  constructor(data) {
    this.id = data.id || `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.workflowId = data.workflowId;
    this.workflowName = data.workflowName;
    this.status = data.status || 'PENDING'; // PENDING, RUNNING, COMPLETED, FAILED, PAUSED
    this.currentNodeId = data.currentNodeId || null;
    this.processData = data.processData || {};
    this.executionHistory = data.executionHistory || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.completedAt = data.completedAt || null;
    this.error = data.error || null;
    this.initiator = data.initiator || 'system';
  }

  /**
   * Update instance state
   */
  updateState(updates) {
    Object.assign(this, updates);
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Add execution history entry
   */
  addHistoryEntry(entry) {
    this.executionHistory.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Mark as completed
   */
  complete() {
    this.status = 'COMPLETED';
    this.completedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Mark as failed
   */
  fail(error) {
    this.status = 'FAILED';
    this.error = error;
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      workflowId: this.workflowId,
      workflowName: this.workflowName,
      status: this.status,
      currentNodeId: this.currentNodeId,
      processData: this.processData,
      executionHistory: this.executionHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      completedAt: this.completedAt,
      error: this.error,
      initiator: this.initiator
    };
  }
}

module.exports = WorkflowInstance;
