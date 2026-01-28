/**
 * Socket Session Manager
 * Tracks socket connections by session ID to survive reconnections
 *
 * When a socket reconnects, it can resume receiving events by
 * registering with the same sessionId.
 */

class SocketSessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> { socketId, socket, lastActivity }
    this.socketToSession = new Map(); // socketId -> sessionId (reverse lookup)

    // Clean up stale sessions every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupStaleSessions(), 5 * 60 * 1000);
  }

  /**
   * Register a socket with a session ID
   * @param {string} sessionId - Unique session identifier (persisted on client)
   * @param {string} socketId - Current socket.io socket ID
   * @param {Socket} socket - The socket.io socket object
   */
  register(sessionId, socketId, socket) {
    // Remove old socket mapping if exists
    const oldSession = this.sessions.get(sessionId);
    if (oldSession && oldSession.socketId !== socketId) {
      this.socketToSession.delete(oldSession.socketId);
      console.log(`[SocketSessionManager] Session ${sessionId} reconnected: ${oldSession.socketId} -> ${socketId}`);
    }

    this.sessions.set(sessionId, {
      socketId,
      socket,
      lastActivity: Date.now()
    });
    this.socketToSession.set(socketId, sessionId);

    console.log(`[SocketSessionManager] Registered session ${sessionId} with socket ${socketId}`);
  }

  /**
   * Unregister a socket when it disconnects
   * Keep the session for potential reconnection
   * @param {string} socketId - The disconnected socket ID
   */
  unregister(socketId) {
    const sessionId = this.socketToSession.get(socketId);
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session && session.socketId === socketId) {
        // Mark as disconnected but keep session for reconnection
        session.socket = null;
        session.disconnectedAt = Date.now();
        console.log(`[SocketSessionManager] Socket ${socketId} disconnected, session ${sessionId} kept for reconnection`);
      }
      this.socketToSession.delete(socketId);
    }
  }

  /**
   * Get the current socket for a session
   * @param {string} sessionId - Session ID
   * @returns {Socket|null} The current socket or null if disconnected
   */
  getSocket(sessionId) {
    const session = this.sessions.get(sessionId);
    return session?.socket || null;
  }

  /**
   * Get the current socket ID for a session
   * @param {string} sessionId - Session ID
   * @returns {string|null} The current socket ID or null
   */
  getSocketId(sessionId) {
    const session = this.sessions.get(sessionId);
    return session?.socketId || null;
  }

  /**
   * Get session ID from socket ID
   * @param {string} socketId - Socket ID
   * @returns {string|null} The session ID or null
   */
  getSessionId(socketId) {
    return this.socketToSession.get(socketId) || null;
  }

  /**
   * Emit an event to a session (handles reconnection)
   * @param {Object} io - Socket.io server instance
   * @param {string} sessionId - Session ID to emit to
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @returns {boolean} True if emitted successfully
   */
  emitToSession(io, sessionId, event, data) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.warn(`[SocketSessionManager] No session found for ${sessionId}`);
      return false;
    }

    if (session.socket && session.socket.connected) {
      session.socket.emit(event, data);
      session.lastActivity = Date.now();
      return true;
    }

    // Try to emit via socket ID if socket object is stale
    if (session.socketId && io) {
      io.to(session.socketId).emit(event, data);
      session.lastActivity = Date.now();
      return true;
    }

    console.warn(`[SocketSessionManager] Session ${sessionId} has no active socket`);
    return false;
  }

  /**
   * Update session activity timestamp
   * @param {string} sessionId - Session ID
   */
  touch(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Clean up sessions that have been disconnected for too long
   * Keeps sessions for 30 minutes after disconnect to allow reconnection
   */
  cleanupStaleSessions() {
    const staleTimeout = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.disconnectedAt && (now - session.disconnectedAt) > staleTimeout) {
        this.sessions.delete(sessionId);
        if (session.socketId) {
          this.socketToSession.delete(session.socketId);
        }
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SocketSessionManager] Cleaned up ${cleaned} stale sessions`);
    }
  }

  /**
   * Get stats about current sessions
   */
  getStats() {
    let connected = 0;
    let disconnected = 0;

    for (const session of this.sessions.values()) {
      if (session.socket && session.socket.connected) {
        connected++;
      } else {
        disconnected++;
      }
    }

    return {
      total: this.sessions.size,
      connected,
      disconnected
    };
  }

  /**
   * Destroy the manager (cleanup)
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    this.socketToSession.clear();
  }
}

// Singleton instance
const socketSessionManager = new SocketSessionManager();

module.exports = socketSessionManager;
