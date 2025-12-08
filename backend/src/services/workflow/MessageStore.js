/**
 * MessageStore - Persistent message store for workflow state passing
 *
 * Supports:
 * - Message storage with correlation tracking
 * - Message retrieval by workflow, correlation ID, or filters
 * - Message expiration (TTL)
 * - Audit trail for debugging
 */

const { v4: uuidv4 } = require('uuid');

class MessageStore {
  constructor() {
    // In-memory store (can be replaced with Redis/DB in production)
    this.messages = new Map();

    // Index by correlation ID for fast lookup
    this.correlationIndex = new Map(); // correlationId -> [messageId]

    // Index by workflow for fast lookup
    this.workflowIndex = new Map(); // workflowId -> [messageId]

    // Default TTL: 24 hours
    this.defaultTTL = 24 * 60 * 60 * 1000;

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Store a message
   * @param {object} message - Message to store
   * @returns {object} - Stored message with ID
   */
  store(message) {
    const storedMessage = {
      id: message.id || uuidv4(),
      source: message.source, // Source workflow ID
      target: message.target, // Target workflow ID (optional)
      correlationId: message.correlationId || uuidv4(),
      type: message.type || 'data', // data, event, response, error
      payload: message.payload,
      metadata: {
        ...message.metadata,
        storedAt: new Date().toISOString(),
        expiresAt: message.expiresAt || new Date(Date.now() + this.defaultTTL).toISOString()
      }
    };

    // Store message
    this.messages.set(storedMessage.id, storedMessage);

    // Update correlation index
    if (!this.correlationIndex.has(storedMessage.correlationId)) {
      this.correlationIndex.set(storedMessage.correlationId, []);
    }
    this.correlationIndex.get(storedMessage.correlationId).push(storedMessage.id);

    // Update workflow index (for source)
    if (storedMessage.source) {
      if (!this.workflowIndex.has(storedMessage.source)) {
        this.workflowIndex.set(storedMessage.source, []);
      }
      this.workflowIndex.get(storedMessage.source).push(storedMessage.id);
    }

    // Update workflow index (for target)
    if (storedMessage.target) {
      if (!this.workflowIndex.has(storedMessage.target)) {
        this.workflowIndex.set(storedMessage.target, []);
      }
      this.workflowIndex.get(storedMessage.target).push(storedMessage.id);
    }

    console.log(`[MessageStore] Stored message: ${storedMessage.id}`, {
      source: storedMessage.source,
      target: storedMessage.target,
      correlationId: storedMessage.correlationId
    });

    return storedMessage;
  }

  /**
   * Get a message by ID
   * @param {string} messageId - Message ID
   * @returns {object|null} - Message or null
   */
  get(messageId) {
    return this.messages.get(messageId) || null;
  }

  /**
   * Get all messages for a correlation ID
   * @param {string} correlationId - Correlation ID
   * @returns {object[]} - Array of messages
   */
  getByCorrelation(correlationId) {
    const messageIds = this.correlationIndex.get(correlationId) || [];
    return messageIds
      .map(id => this.messages.get(id))
      .filter(msg => msg && !this.isExpired(msg))
      .sort((a, b) => new Date(a.metadata.storedAt) - new Date(b.metadata.storedAt));
  }

  /**
   * Get all messages for a workflow
   * @param {string} workflowId - Workflow ID
   * @param {object} options - Filter options
   * @returns {object[]} - Array of messages
   */
  getByWorkflow(workflowId, options = {}) {
    const messageIds = this.workflowIndex.get(workflowId) || [];
    let messages = messageIds
      .map(id => this.messages.get(id))
      .filter(msg => msg && !this.isExpired(msg));

    if (options.type) {
      messages = messages.filter(msg => msg.type === options.type);
    }

    if (options.direction === 'incoming') {
      messages = messages.filter(msg => msg.target === workflowId);
    } else if (options.direction === 'outgoing') {
      messages = messages.filter(msg => msg.source === workflowId);
    }

    return messages.sort((a, b) =>
      new Date(a.metadata.storedAt) - new Date(b.metadata.storedAt)
    );
  }

  /**
   * Get the latest message in a correlation chain
   * @param {string} correlationId - Correlation ID
   * @returns {object|null} - Latest message or null
   */
  getLatest(correlationId) {
    const messages = this.getByCorrelation(correlationId);
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }

  /**
   * Pass state from one workflow to another
   * @param {string} sourceWorkflowId - Source workflow
   * @param {string} targetWorkflowId - Target workflow
   * @param {object} payload - Data to pass
   * @param {string} correlationId - Optional correlation ID
   * @returns {object} - Stored message
   */
  passState(sourceWorkflowId, targetWorkflowId, payload, correlationId = null) {
    return this.store({
      source: sourceWorkflowId,
      target: targetWorkflowId,
      correlationId: correlationId || uuidv4(),
      type: 'data',
      payload
    });
  }

  /**
   * Store a response from a sub-workflow
   * @param {string} workflowId - Workflow that produced the response
   * @param {object} result - Result data
   * @param {string} correlationId - Correlation ID from the call
   * @returns {object} - Stored message
   */
  storeResponse(workflowId, result, correlationId) {
    return this.store({
      source: workflowId,
      correlationId,
      type: 'response',
      payload: result
    });
  }

  /**
   * Store an error from a workflow
   * @param {string} workflowId - Workflow that produced the error
   * @param {Error|object} error - Error details
   * @param {string} correlationId - Correlation ID
   * @returns {object} - Stored message
   */
  storeError(workflowId, error, correlationId) {
    return this.store({
      source: workflowId,
      correlationId,
      type: 'error',
      payload: {
        message: error.message || String(error),
        stack: error.stack,
        code: error.code
      }
    });
  }

  /**
   * Get the full message chain for a correlation
   * Useful for debugging and audit trails
   * @param {string} correlationId - Correlation ID
   * @returns {object} - Chain information
   */
  getMessageChain(correlationId) {
    const messages = this.getByCorrelation(correlationId);

    return {
      correlationId,
      messageCount: messages.length,
      startedAt: messages[0]?.metadata.storedAt,
      lastMessageAt: messages[messages.length - 1]?.metadata.storedAt,
      workflows: [...new Set(messages.flatMap(m => [m.source, m.target].filter(Boolean)))],
      messages: messages.map(m => ({
        id: m.id,
        type: m.type,
        source: m.source,
        target: m.target,
        timestamp: m.metadata.storedAt,
        payloadPreview: JSON.stringify(m.payload).substring(0, 100)
      }))
    };
  }

  /**
   * Check if a message is expired
   */
  isExpired(message) {
    if (!message.metadata.expiresAt) return false;
    return new Date(message.metadata.expiresAt) < new Date();
  }

  /**
   * Delete a message
   * @param {string} messageId - Message ID
   */
  delete(messageId) {
    const message = this.messages.get(messageId);
    if (!message) return;

    // Remove from main store
    this.messages.delete(messageId);

    // Remove from correlation index
    const corrMsgs = this.correlationIndex.get(message.correlationId);
    if (corrMsgs) {
      const idx = corrMsgs.indexOf(messageId);
      if (idx !== -1) corrMsgs.splice(idx, 1);
      if (corrMsgs.length === 0) this.correlationIndex.delete(message.correlationId);
    }

    // Remove from workflow index
    [message.source, message.target].filter(Boolean).forEach(wfId => {
      const wfMsgs = this.workflowIndex.get(wfId);
      if (wfMsgs) {
        const idx = wfMsgs.indexOf(messageId);
        if (idx !== -1) wfMsgs.splice(idx, 1);
        if (wfMsgs.length === 0) this.workflowIndex.delete(wfId);
      }
    });
  }

  /**
   * Delete all messages for a correlation
   * @param {string} correlationId - Correlation ID
   */
  deleteByCorrelation(correlationId) {
    const messageIds = [...(this.correlationIndex.get(correlationId) || [])];
    messageIds.forEach(id => this.delete(id));
  }

  /**
   * Cleanup expired messages
   */
  cleanup() {
    let cleaned = 0;
    for (const [messageId, message] of this.messages) {
      if (this.isExpired(message)) {
        this.delete(messageId);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[MessageStore] Cleaned up ${cleaned} expired messages`);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalMessages: this.messages.size,
      correlationChains: this.correlationIndex.size,
      workflowsWithMessages: this.workflowIndex.size
    };
  }

  /**
   * Clear all messages (for testing)
   */
  clear() {
    this.messages.clear();
    this.correlationIndex.clear();
    this.workflowIndex.clear();
  }

  /**
   * Stop cleanup interval
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
const messageStore = new MessageStore();

module.exports = messageStore;
module.exports.MessageStore = MessageStore;
