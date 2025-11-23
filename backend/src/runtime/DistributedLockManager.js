/**
 * Distributed Lock Manager
 * Provides distributed locking mechanism for horizontal scaling
 * File-based implementation (can be extended to use Redis/etcd for production)
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DistributedLockManager {
  constructor() {
    // Instance ID for this runtime engine instance
    this.instanceId = uuidv4();

    // Lock directory
    this.lockDir = path.join(__dirname, '../../data/locks');

    // Active locks held by this instance
    this.activeLocks = new Map(); // lockKey -> lock data

    // Lock configuration
    this.config = {
      lockTTL: 30000, // 30 seconds
      heartbeatInterval: 10000, // 10 seconds
      acquireTimeout: 5000, // 5 seconds to acquire lock
      retryDelay: 100 // 100ms between retry attempts
    };

    // Heartbeat timers
    this.heartbeats = new Map(); // lockKey -> interval

    // Statistics
    this.stats = {
      locksAcquired: 0,
      locksReleased: 0,
      locksFailed: 0,
      locksExpired: 0
    };

    // Initialize lock directory
    this.initialize();
  }

  /**
   * Initialize lock manager
   */
  async initialize() {
    try {
      await fs.mkdir(this.lockDir, { recursive: true });
      console.log(`[DistributedLockManager] Initialized (Instance: ${this.instanceId})`);
    } catch (error) {
      console.error('[DistributedLockManager] Initialization error:', error);
    }
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(lockKey, options = {}) {
    const config = { ...this.config, ...options };
    const startTime = Date.now();
    const lockFile = this.getLockFilePath(lockKey);

    while (Date.now() - startTime < config.acquireTimeout) {
      try {
        // Try to acquire lock
        const lockData = {
          lockKey,
          instanceId: this.instanceId,
          acquiredAt: new Date(),
          expiresAt: new Date(Date.now() + config.lockTTL),
          metadata: options.metadata || {}
        };

        // Check if lock file exists
        try {
          const existingLockContent = await fs.readFile(lockFile, 'utf8');
          const existingLock = JSON.parse(existingLockContent);

          // Check if lock has expired
          if (new Date(existingLock.expiresAt) > new Date()) {
            // Lock is still valid, cannot acquire
            await this.sleep(config.retryDelay);
            continue;
          } else {
            // Lock has expired, clean it up
            console.log(`[DistributedLockManager] Lock ${lockKey} has expired, cleaning up`);
            await fs.unlink(lockFile);
            this.stats.locksExpired++;
          }
        } catch (error) {
          // Lock file doesn't exist or is invalid, can proceed to acquire
        }

        // Write lock file atomically
        await fs.writeFile(lockFile, JSON.stringify(lockData, null, 2), { flag: 'wx' });

        // Lock acquired successfully
        this.activeLocks.set(lockKey, lockData);
        this.stats.locksAcquired++;

        // Start heartbeat to renew lock
        this.startHeartbeat(lockKey, config);

        console.log(`[DistributedLockManager] Lock acquired: ${lockKey} by ${this.instanceId}`);

        return {
          success: true,
          lockKey,
          instanceId: this.instanceId,
          acquiredAt: lockData.acquiredAt
        };

      } catch (error) {
        if (error.code === 'EEXIST') {
          // File already exists, lock is held by another instance
          await this.sleep(config.retryDelay);
          continue;
        }

        // Other error
        console.error(`[DistributedLockManager] Error acquiring lock ${lockKey}:`, error);
        this.stats.locksFailed++;
        throw error;
      }
    }

    // Timeout acquiring lock
    console.warn(`[DistributedLockManager] Timeout acquiring lock ${lockKey}`);
    this.stats.locksFailed++;

    return {
      success: false,
      lockKey,
      error: 'Acquisition timeout'
    };
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(lockKey) {
    const lockFile = this.getLockFilePath(lockKey);

    try {
      // Read lock file
      const lockContent = await fs.readFile(lockFile, 'utf8');
      const lock = JSON.parse(lockContent);

      // Verify this instance owns the lock
      if (lock.instanceId !== this.instanceId) {
        console.warn(`[DistributedLockManager] Cannot release lock ${lockKey}: owned by ${lock.instanceId}`);
        return {
          success: false,
          error: 'Lock owned by another instance'
        };
      }

      // Delete lock file
      await fs.unlink(lockFile);

      // Stop heartbeat
      this.stopHeartbeat(lockKey);

      // Remove from active locks
      this.activeLocks.delete(lockKey);
      this.stats.locksReleased++;

      console.log(`[DistributedLockManager] Lock released: ${lockKey}`);

      return {
        success: true,
        lockKey
      };

    } catch (error) {
      if (error.code === 'ENOENT') {
        // Lock file doesn't exist
        this.stopHeartbeat(lockKey);
        this.activeLocks.delete(lockKey);

        return {
          success: true,
          lockKey,
          note: 'Lock already released'
        };
      }

      console.error(`[DistributedLockManager] Error releasing lock ${lockKey}:`, error);
      throw error;
    }
  }

  /**
   * Start heartbeat to renew lock
   */
  startHeartbeat(lockKey, config) {
    // Stop existing heartbeat if any
    this.stopHeartbeat(lockKey);

    const heartbeatInterval = setInterval(async () => {
      try {
        await this.renewLock(lockKey, config);
      } catch (error) {
        console.error(`[DistributedLockManager] Heartbeat error for ${lockKey}:`, error);
        this.stopHeartbeat(lockKey);
      }
    }, config.heartbeatInterval);

    this.heartbeats.set(lockKey, heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(lockKey) {
    const interval = this.heartbeats.get(lockKey);

    if (interval) {
      clearInterval(interval);
      this.heartbeats.delete(lockKey);
    }
  }

  /**
   * Renew lock (extend expiration)
   */
  async renewLock(lockKey, config) {
    const lockFile = this.getLockFilePath(lockKey);

    try {
      // Read current lock
      const lockContent = await fs.readFile(lockFile, 'utf8');
      const lock = JSON.parse(lockContent);

      // Verify this instance owns the lock
      if (lock.instanceId !== this.instanceId) {
        console.warn(`[DistributedLockManager] Cannot renew lock ${lockKey}: owned by ${lock.instanceId}`);
        this.stopHeartbeat(lockKey);
        this.activeLocks.delete(lockKey);
        return false;
      }

      // Update expiration
      lock.expiresAt = new Date(Date.now() + config.lockTTL);
      lock.renewedAt = new Date();

      // Write updated lock
      await fs.writeFile(lockFile, JSON.stringify(lock, null, 2));

      console.log(`[DistributedLockManager] Lock renewed: ${lockKey}`);

      return true;

    } catch (error) {
      console.error(`[DistributedLockManager] Error renewing lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Execute operation with distributed lock
   */
  async executeWithLock(lockKey, operation, options = {}) {
    const lockResult = await this.acquireLock(lockKey, options);

    if (!lockResult.success) {
      throw new Error(`Failed to acquire lock: ${lockKey}`);
    }

    try {
      // Execute operation
      const result = await operation();

      // Release lock
      await this.releaseLock(lockKey);

      return result;

    } catch (error) {
      // Release lock on error
      await this.releaseLock(lockKey);
      throw error;
    }
  }

  /**
   * Check if lock is held by this instance
   */
  hasLock(lockKey) {
    return this.activeLocks.has(lockKey);
  }

  /**
   * Get lock information
   */
  async getLockInfo(lockKey) {
    const lockFile = this.getLockFilePath(lockKey);

    try {
      const lockContent = await fs.readFile(lockFile, 'utf8');
      const lock = JSON.parse(lockContent);

      return {
        exists: true,
        ...lock,
        isExpired: new Date(lock.expiresAt) <= new Date(),
        ownedByThis: lock.instanceId === this.instanceId
      };

    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          exists: false
        };
      }

      throw error;
    }
  }

  /**
   * Clean up expired locks
   */
  async cleanupExpiredLocks() {
    try {
      const files = await fs.readdir(this.lockDir);
      let cleaned = 0;

      for (const file of files) {
        if (file.endsWith('.lock')) {
          const lockFile = path.join(this.lockDir, file);

          try {
            const lockContent = await fs.readFile(lockFile, 'utf8');
            const lock = JSON.parse(lockContent);

            // Check if expired
            if (new Date(lock.expiresAt) <= new Date()) {
              await fs.unlink(lockFile);
              cleaned++;
              this.stats.locksExpired++;
              console.log(`[DistributedLockManager] Cleaned expired lock: ${lock.lockKey}`);
            }
          } catch (error) {
            // Ignore errors for individual files
            console.warn(`[DistributedLockManager] Error checking lock file ${file}:`, error.message);
          }
        }
      }

      if (cleaned > 0) {
        console.log(`[DistributedLockManager] Cleaned ${cleaned} expired locks`);
      }

      return cleaned;

    } catch (error) {
      console.error('[DistributedLockManager] Error cleaning expired locks:', error);
      return 0;
    }
  }

  /**
   * Release all locks held by this instance
   */
  async releaseAllLocks() {
    const lockKeys = Array.from(this.activeLocks.keys());

    console.log(`[DistributedLockManager] Releasing ${lockKeys.length} locks`);

    for (const lockKey of lockKeys) {
      try {
        await this.releaseLock(lockKey);
      } catch (error) {
        console.error(`[DistributedLockManager] Error releasing lock ${lockKey}:`, error);
      }
    }
  }

  /**
   * Get lock file path
   */
  getLockFilePath(lockKey) {
    // Sanitize lock key for filename
    const sanitized = lockKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.lockDir, `${sanitized}.lock`);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      instanceId: this.instanceId,
      activeLocks: this.activeLocks.size,
      activeHeartbeats: this.heartbeats.size
    };
  }

  /**
   * Get active locks
   */
  getActiveLocks() {
    return Array.from(this.activeLocks.entries()).map(([key, data]) => ({
      lockKey: key,
      ...data
    }));
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set configuration
   */
  setConfig(config) {
    this.config = {
      ...this.config,
      ...config
    };

    console.log('[DistributedLockManager] Configuration updated:', this.config);
  }

  /**
   * Shutdown - release all locks
   */
  async shutdown() {
    console.log('[DistributedLockManager] Shutting down');

    // Release all locks
    await this.releaseAllLocks();

    // Stop all heartbeats
    for (const [lockKey, interval] of this.heartbeats.entries()) {
      clearInterval(interval);
    }

    this.heartbeats.clear();

    console.log('[DistributedLockManager] Shutdown complete');
  }
}

module.exports = new DistributedLockManager();
