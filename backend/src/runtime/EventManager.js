/**
 * Event Manager
 * Handles event-driven architecture and real-time event broadcasting
 */

const EventEmitter = require('events');

class EventManager extends EventEmitter {
  constructor() {
    super();

    // Event history for replay/debugging
    this.eventHistory = new Map(); // instanceId -> events[]
    this.maxHistorySize = 1000;

    // Event statistics
    this.stats = {
      totalEvents: 0,
      eventsByType: new Map()
    };

    // WebSocket io instance (set externally)
    this.io = null;
  }

  /**
   * Set Socket.IO instance for WebSocket broadcasting
   */
  setSocketIO(io) {
    this.io = io;
    console.log('[EventManager] Socket.IO integration enabled');
  }

  /**
   * Emit a workflow event
   */
  emitWorkflowEvent(eventType, data) {
    const event = {
      type: eventType,
      timestamp: new Date(),
      data
    };

    // Store in history
    if (data.instanceId) {
      this.addToHistory(data.instanceId, event);
    }

    // Update statistics
    this.updateStats(eventType);

    // Emit to local listeners
    this.emit(eventType, event);
    this.emit('*', event); // Wildcard listener

    // Broadcast via WebSocket if available
    if (this.io) {
      this.broadcastEvent(event);
    }

    console.log(`[EventManager] Event: ${eventType} (Instance: ${data.instanceId || 'N/A'})`);

    return event;
  }

  /**
   * Workflow Started Event
   */
  emitWorkflowStarted(instanceId, workflowId, workflowName) {
    return this.emitWorkflowEvent('workflow.started', {
      instanceId,
      workflowId,
      workflowName
    });
  }

  /**
   * Workflow Completed Event
   */
  emitWorkflowCompleted(instanceId, duration, result) {
    return this.emitWorkflowEvent('workflow.completed', {
      instanceId,
      duration,
      result
    });
  }

  /**
   * Workflow Failed Event
   */
  emitWorkflowFailed(instanceId, error) {
    return this.emitWorkflowEvent('workflow.failed', {
      instanceId,
      error: error.message || error
    });
  }

  /**
   * Workflow Paused Event
   */
  emitWorkflowPaused(instanceId, reason) {
    return this.emitWorkflowEvent('workflow.paused', {
      instanceId,
      reason
    });
  }

  /**
   * Workflow Resumed Event
   */
  emitWorkflowResumed(instanceId) {
    return this.emitWorkflowEvent('workflow.resumed', {
      instanceId
    });
  }

  /**
   * Node Execution Started Event
   */
  emitNodeStarted(instanceId, nodeId, nodeType) {
    return this.emitWorkflowEvent('node.started', {
      instanceId,
      nodeId,
      nodeType
    });
  }

  /**
   * Node Execution Completed Event
   */
  emitNodeCompleted(instanceId, nodeId, nodeType, result) {
    return this.emitWorkflowEvent('node.completed', {
      instanceId,
      nodeId,
      nodeType,
      result
    });
  }

  /**
   * Node Execution Failed Event
   */
  emitNodeFailed(instanceId, nodeId, nodeType, error) {
    return this.emitWorkflowEvent('node.failed', {
      instanceId,
      nodeId,
      nodeType,
      error: error.message || error
    });
  }

  /**
   * Gateway Event (split/join)
   */
  emitGatewayEvent(instanceId, gatewayId, gatewayType, action, details) {
    return this.emitWorkflowEvent('gateway.' + action, {
      instanceId,
      gatewayId,
      gatewayType,
      ...details
    });
  }

  /**
   * Token Event
   */
  emitTokenEvent(instanceId, tokenId, action, details) {
    return this.emitWorkflowEvent('token.' + action, {
      instanceId,
      tokenId,
      ...details
    });
  }

  /**
   * State Event (snapshot/transaction)
   */
  emitStateEvent(instanceId, action, details) {
    return this.emitWorkflowEvent('state.' + action, {
      instanceId,
      ...details
    });
  }

  /**
   * Variable Update Event
   */
  emitVariableUpdate(instanceId, variables, source) {
    return this.emitWorkflowEvent('variable.updated', {
      instanceId,
      variables,
      source
    });
  }

  /**
   * Error Event
   */
  emitError(instanceId, error, context) {
    return this.emitWorkflowEvent('error', {
      instanceId,
      error: error.message || error,
      context
    });
  }

  /**
   * Custom Event
   */
  emitCustomEvent(eventType, data) {
    return this.emitWorkflowEvent('custom.' + eventType, data);
  }

  /**
   * Broadcast event via WebSocket
   */
  broadcastEvent(event) {
    if (!this.io) return;

    // Broadcast to all connected clients
    this.io.emit('workflow.event', event);

    // Broadcast to instance-specific room
    if (event.data.instanceId) {
      this.io.to(`instance:${event.data.instanceId}`).emit('workflow.event', event);
    }

    // Broadcast to event type room
    this.io.to(`event:${event.type}`).emit('workflow.event', event);
  }

  /**
   * Add event to history
   */
  addToHistory(instanceId, event) {
    if (!this.eventHistory.has(instanceId)) {
      this.eventHistory.set(instanceId, []);
    }

    const history = this.eventHistory.get(instanceId);
    history.push(event);

    // Trim history if too large
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Get event history for an instance
   */
  getHistory(instanceId, options = {}) {
    const history = this.eventHistory.get(instanceId) || [];

    let filtered = history;

    // Filter by event type
    if (options.type) {
      filtered = filtered.filter(e => e.type === options.type);
    }

    // Filter by time range
    if (options.since) {
      const sinceDate = new Date(options.since);
      filtered = filtered.filter(e => e.timestamp >= sinceDate);
    }

    if (options.until) {
      const untilDate = new Date(options.until);
      filtered = filtered.filter(e => e.timestamp <= untilDate);
    }

    // Limit results
    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Clear history for an instance
   */
  clearHistory(instanceId) {
    this.eventHistory.delete(instanceId);
    console.log(`[EventManager] Cleared history for instance ${instanceId}`);
  }

  /**
   * Update statistics
   */
  updateStats(eventType) {
    this.stats.totalEvents++;

    if (!this.stats.eventsByType.has(eventType)) {
      this.stats.eventsByType.set(eventType, 0);
    }

    this.stats.eventsByType.set(
      eventType,
      this.stats.eventsByType.get(eventType) + 1
    );
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalEvents: this.stats.totalEvents,
      eventsByType: Object.fromEntries(this.stats.eventsByType),
      instancesTracked: this.eventHistory.size
    };
  }

  /**
   * Subscribe to events (for clients)
   */
  subscribe(eventType, callback) {
    this.on(eventType, callback);
    return () => this.off(eventType, callback);
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(callback) {
    this.on('*', callback);
    return () => this.off('*', callback);
  }

  /**
   * Get active listeners count
   */
  getListenersCount(eventType) {
    return this.listenerCount(eventType);
  }

  /**
   * Export events for an instance
   */
  exportEvents(instanceId) {
    return this.getHistory(instanceId);
  }

  /**
   * Import events (for recovery/replay)
   */
  importEvents(instanceId, events) {
    this.eventHistory.set(instanceId, events);
    console.log(`[EventManager] Imported ${events.length} events for instance ${instanceId}`);
  }

  /**
   * Replay events (emit historical events)
   */
  replayEvents(instanceId, options = {}) {
    const events = this.getHistory(instanceId, options);

    events.forEach(event => {
      // Emit with replay flag
      this.emit(event.type, { ...event, isReplay: true });

      if (this.io) {
        this.io.emit('workflow.event', { ...event, isReplay: true });
      }
    });

    return events.length;
  }
}

module.exports = new EventManager();
