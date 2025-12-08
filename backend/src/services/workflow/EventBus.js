/**
 * EventBus - Central event communication hub for multi-workflow architecture
 *
 * Supports:
 * - Event publishing and subscribing
 * - Direct workflow calls
 * - Wildcard subscriptions (e.g., "order.*")
 * - Event history for replay
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class EventBus {
  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Allow many workflow subscribers

    this.subscriptions = new Map(); // workflowId -> [{ event, handler }]
    this.eventHistory = [];
    this.maxHistorySize = 1000;

    // Direct call registry: workflowId -> handler function
    this.directCallHandlers = new Map();

    // Pending direct calls awaiting response
    this.pendingCalls = new Map();
  }

  /**
   * Emit an event to all subscribers
   * @param {string} eventName - Event name (e.g., "order.completed")
   * @param {object} payload - Event data
   * @param {object} metadata - Source workflow info
   */
  emit(eventName, payload, metadata = {}) {
    const event = {
      id: uuidv4(),
      name: eventName,
      payload,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        sourceWorkflowId: metadata.sourceWorkflowId || null,
        sourceNodeId: metadata.sourceNodeId || null,
        correlationId: metadata.correlationId || uuidv4()
      }
    };

    // Store in history
    this.addToHistory(event);

    // Emit to exact subscribers
    this.emitter.emit(eventName, event);

    // Emit to wildcard subscribers (e.g., "order.*" matches "order.completed")
    const parts = eventName.split('.');
    if (parts.length > 1) {
      const wildcardEvent = `${parts[0]}.*`;
      this.emitter.emit(wildcardEvent, event);
    }

    // Emit to global subscribers (listen to all events)
    this.emitter.emit('*', event);

    console.log(`[EventBus] Emitted: ${eventName}`, {
      eventId: event.id,
      correlationId: event.metadata.correlationId
    });

    return event;
  }

  /**
   * Subscribe to events
   * @param {string} eventName - Event to subscribe to (supports wildcards)
   * @param {string} workflowId - Subscribing workflow ID
   * @param {function} handler - Handler function (receives event object)
   */
  subscribe(eventName, workflowId, handler) {
    // Store subscription for management
    if (!this.subscriptions.has(workflowId)) {
      this.subscriptions.set(workflowId, []);
    }
    this.subscriptions.get(workflowId).push({ event: eventName, handler });

    // Register with emitter
    this.emitter.on(eventName, handler);

    console.log(`[EventBus] Workflow ${workflowId} subscribed to: ${eventName}`);

    return () => this.unsubscribe(eventName, workflowId, handler);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventName, workflowId, handler) {
    this.emitter.off(eventName, handler);

    const subs = this.subscriptions.get(workflowId);
    if (subs) {
      const index = subs.findIndex(s => s.event === eventName && s.handler === handler);
      if (index !== -1) {
        subs.splice(index, 1);
      }
    }

    console.log(`[EventBus] Workflow ${workflowId} unsubscribed from: ${eventName}`);
  }

  /**
   * Unsubscribe all events for a workflow
   */
  unsubscribeAll(workflowId) {
    const subs = this.subscriptions.get(workflowId);
    if (subs) {
      subs.forEach(({ event, handler }) => {
        this.emitter.off(event, handler);
      });
      this.subscriptions.delete(workflowId);
    }

    console.log(`[EventBus] Workflow ${workflowId} unsubscribed from all events`);
  }

  /**
   * Register a workflow for direct calls
   * @param {string} workflowId - Workflow ID
   * @param {function} handler - Handler function that processes calls and returns result
   */
  registerForDirectCalls(workflowId, handler) {
    this.directCallHandlers.set(workflowId, handler);
    console.log(`[EventBus] Workflow ${workflowId} registered for direct calls`);
  }

  /**
   * Unregister workflow from direct calls
   */
  unregisterFromDirectCalls(workflowId) {
    this.directCallHandlers.delete(workflowId);
    console.log(`[EventBus] Workflow ${workflowId} unregistered from direct calls`);
  }

  /**
   * Make a direct call to another workflow (sync-like, returns result)
   * @param {string} targetWorkflowId - Target workflow ID
   * @param {object} payload - Input data for the workflow
   * @param {object} options - Call options (timeout, etc.)
   * @returns {Promise<object>} - Workflow result
   */
  async callWorkflow(targetWorkflowId, payload, options = {}) {
    const callId = uuidv4();
    const timeout = options.timeout || 30000; // 30 second default

    const handler = this.directCallHandlers.get(targetWorkflowId);
    if (!handler) {
      throw new Error(`Workflow ${targetWorkflowId} is not registered for direct calls`);
    }

    console.log(`[EventBus] Direct call to ${targetWorkflowId}`, { callId });

    const callContext = {
      callId,
      sourceWorkflowId: options.sourceWorkflowId,
      sourceNodeId: options.sourceNodeId,
      correlationId: options.correlationId || uuidv4(),
      timestamp: new Date().toISOString()
    };

    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Direct call to ${targetWorkflowId} timed out after ${timeout}ms`));
      }, timeout);
    });

    try {
      const result = await Promise.race([
        handler(payload, callContext),
        timeoutPromise
      ]);

      console.log(`[EventBus] Direct call completed: ${targetWorkflowId}`, { callId });
      return result;
    } catch (error) {
      console.error(`[EventBus] Direct call failed: ${targetWorkflowId}`, { callId, error: error.message });
      throw error;
    }
  }

  /**
   * Add event to history
   */
  addToHistory(event) {
    this.eventHistory.push(event);

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get event history
   * @param {object} filters - Optional filters
   */
  getHistory(filters = {}) {
    let history = [...this.eventHistory];

    if (filters.eventName) {
      history = history.filter(e => e.name === filters.eventName);
    }

    if (filters.correlationId) {
      history = history.filter(e => e.metadata.correlationId === filters.correlationId);
    }

    if (filters.sourceWorkflowId) {
      history = history.filter(e => e.metadata.sourceWorkflowId === filters.sourceWorkflowId);
    }

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      history = history.filter(e => new Date(e.metadata.timestamp) >= sinceDate);
    }

    if (filters.limit) {
      history = history.slice(-filters.limit);
    }

    return history;
  }

  /**
   * Replay events to a subscriber (for recovery)
   * @param {string} workflowId - Workflow to replay events to
   * @param {object} filters - Event filters
   */
  async replayEvents(workflowId, filters = {}) {
    const subs = this.subscriptions.get(workflowId);
    if (!subs || subs.length === 0) {
      console.warn(`[EventBus] No subscriptions found for ${workflowId}`);
      return;
    }

    const events = this.getHistory(filters);
    console.log(`[EventBus] Replaying ${events.length} events to ${workflowId}`);

    for (const event of events) {
      for (const { event: eventName, handler } of subs) {
        if (this.matchesEvent(event.name, eventName)) {
          await handler({ ...event, isReplay: true });
        }
      }
    }
  }

  /**
   * Check if event name matches subscription pattern
   */
  matchesEvent(eventName, pattern) {
    if (pattern === '*') return true;
    if (pattern === eventName) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventName.startsWith(prefix + '.');
    }
    return false;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalSubscriptions: Array.from(this.subscriptions.values())
        .reduce((sum, subs) => sum + subs.length, 0),
      workflowsSubscribed: this.subscriptions.size,
      directCallHandlers: this.directCallHandlers.size,
      eventHistorySize: this.eventHistory.length
    };
  }

  /**
   * Clear all state (for testing)
   */
  clear() {
    this.emitter.removeAllListeners();
    this.subscriptions.clear();
    this.directCallHandlers.clear();
    this.pendingCalls.clear();
    this.eventHistory = [];
  }
}

// Singleton instance
const eventBus = new EventBus();

module.exports = eventBus;
module.exports.EventBus = EventBus;
