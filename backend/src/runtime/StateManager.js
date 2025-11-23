/**
 * State Manager
 * Handles state snapshots, transactions, and rollback capability
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class StateManager {
  constructor() {
    // Snapshots: instanceId -> [snapshots]
    this.snapshots = new Map();

    // Active transactions: transactionId -> transaction data
    this.transactions = new Map();

    // Snapshot storage directory
    this.snapshotDir = path.join(__dirname, '../../data/snapshots');

    // Configuration
    this.maxSnapshots = 50; // Max snapshots per instance
    this.autoSnapshotInterval = null; // Auto-snapshot interval (null = disabled)
  }

  /**
   * Initialize state manager (create directories)
   */
  async initialize() {
    try {
      await fs.mkdir(this.snapshotDir, { recursive: true });
      console.log('[StateManager] Initialized');
    } catch (error) {
      console.error('[StateManager] Initialization error:', error);
    }
  }

  /**
   * Create a state snapshot
   */
  async createSnapshot(instanceId, state, metadata = {}) {
    const snapshot = {
      id: uuidv4(),
      instanceId,
      timestamp: new Date(),
      state: this.deepClone(state),
      metadata: {
        ...metadata,
        createdBy: metadata.createdBy || 'system',
        reason: metadata.reason || 'checkpoint',
        nodeId: state.instance?.currentNodeId || null
      }
    };

    // Store in memory
    if (!this.snapshots.has(instanceId)) {
      this.snapshots.set(instanceId, []);
    }

    const instanceSnapshots = this.snapshots.get(instanceId);
    instanceSnapshots.push(snapshot);

    // Enforce max snapshots limit
    if (instanceSnapshots.length > this.maxSnapshots) {
      const removed = instanceSnapshots.shift();
      await this.deleteSnapshotFile(removed.id);
    }

    // Persist to disk
    await this.saveSnapshotToDisk(snapshot);

    console.log(`[StateManager] Created snapshot ${snapshot.id} for instance ${instanceId} (${metadata.reason})`);

    return snapshot;
  }

  /**
   * Get snapshot by ID
   */
  async getSnapshot(snapshotId) {
    // Check memory first
    for (const [instanceId, snapshots] of this.snapshots.entries()) {
      const snapshot = snapshots.find(s => s.id === snapshotId);
      if (snapshot) {
        return snapshot;
      }
    }

    // Try loading from disk
    return await this.loadSnapshotFromDisk(snapshotId);
  }

  /**
   * Get all snapshots for an instance
   */
  getInstanceSnapshots(instanceId) {
    return this.snapshots.get(instanceId) || [];
  }

  /**
   * Get latest snapshot for an instance
   */
  getLatestSnapshot(instanceId) {
    const snapshots = this.getInstanceSnapshots(instanceId);
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }

  /**
   * Get snapshot at specific time
   */
  getSnapshotAtTime(instanceId, timestamp) {
    const snapshots = this.getInstanceSnapshots(instanceId);

    // Find the latest snapshot before or at the given timestamp
    let bestSnapshot = null;
    for (const snapshot of snapshots) {
      if (snapshot.timestamp <= timestamp) {
        if (!bestSnapshot || snapshot.timestamp > bestSnapshot.timestamp) {
          bestSnapshot = snapshot;
        }
      }
    }

    return bestSnapshot;
  }

  /**
   * Rollback to a specific snapshot
   */
  async rollbackToSnapshot(snapshotId) {
    const snapshot = await this.getSnapshot(snapshotId);

    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    console.log(`[StateManager] Rolling back instance ${snapshot.instanceId} to snapshot ${snapshotId}`);

    // Return cloned state to prevent mutations
    return {
      instanceId: snapshot.instanceId,
      snapshotId: snapshot.id,
      timestamp: snapshot.timestamp,
      state: this.deepClone(snapshot.state),
      metadata: snapshot.metadata
    };
  }

  /**
   * Start a transaction
   */
  beginTransaction(instanceId, metadata = {}) {
    const transaction = {
      id: uuidv4(),
      instanceId,
      startTime: new Date(),
      operations: [],
      baseSnapshot: null,
      metadata,
      status: 'active'
    };

    // Create base snapshot for rollback
    const latestSnapshot = this.getLatestSnapshot(instanceId);
    if (latestSnapshot) {
      transaction.baseSnapshot = latestSnapshot.id;
    }

    this.transactions.set(transaction.id, transaction);

    console.log(`[StateManager] Transaction ${transaction.id} started for instance ${instanceId}`);

    return transaction.id;
  }

  /**
   * Record an operation in a transaction
   */
  recordOperation(transactionId, operation) {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'active') {
      throw new Error(`Transaction ${transactionId} is ${transaction.status}`);
    }

    transaction.operations.push({
      timestamp: new Date(),
      operation
    });
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(transactionId, finalState) {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'active') {
      throw new Error(`Transaction ${transactionId} is already ${transaction.status}`);
    }

    // Create commit snapshot
    const snapshot = await this.createSnapshot(
      transaction.instanceId,
      finalState,
      {
        reason: 'transaction_commit',
        transactionId: transaction.id,
        operationCount: transaction.operations.length
      }
    );

    // Mark transaction as committed
    transaction.status = 'committed';
    transaction.endTime = new Date();
    transaction.commitSnapshot = snapshot.id;

    console.log(`[StateManager] Transaction ${transactionId} committed with ${transaction.operations.length} operations`);

    return snapshot;
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transactionId) {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'active') {
      throw new Error(`Transaction ${transactionId} is already ${transaction.status}`);
    }

    // Rollback to base snapshot
    let rollbackState = null;

    if (transaction.baseSnapshot) {
      const rollbackResult = await this.rollbackToSnapshot(transaction.baseSnapshot);
      rollbackState = rollbackResult.state;
    }

    // Mark transaction as rolled back
    transaction.status = 'rolled_back';
    transaction.endTime = new Date();

    console.log(`[StateManager] Transaction ${transactionId} rolled back`);

    return rollbackState;
  }

  /**
   * Get transaction info
   */
  getTransaction(transactionId) {
    return this.transactions.get(transactionId);
  }

  /**
   * Clear old snapshots
   */
  async pruneSnapshots(instanceId, keepCount = 10) {
    const snapshots = this.getInstanceSnapshots(instanceId);

    if (snapshots.length <= keepCount) {
      return;
    }

    const toRemove = snapshots.length - keepCount;
    const removed = snapshots.splice(0, toRemove);

    // Delete from disk
    for (const snapshot of removed) {
      await this.deleteSnapshotFile(snapshot.id);
    }

    console.log(`[StateManager] Pruned ${removed.length} old snapshots for instance ${instanceId}`);
  }

  /**
   * Clear all snapshots for an instance
   */
  async clearInstanceSnapshots(instanceId) {
    const snapshots = this.getInstanceSnapshots(instanceId);

    // Delete from disk
    for (const snapshot of snapshots) {
      await this.deleteSnapshotFile(snapshot.id);
    }

    this.snapshots.delete(instanceId);

    console.log(`[StateManager] Cleared all snapshots for instance ${instanceId}`);
  }

  /**
   * Get state statistics
   */
  getStats(instanceId) {
    const snapshots = this.getInstanceSnapshots(instanceId);
    const transactions = Array.from(this.transactions.values())
      .filter(t => t.instanceId === instanceId);

    return {
      snapshotCount: snapshots.length,
      oldestSnapshot: snapshots.length > 0 ? snapshots[0].timestamp : null,
      latestSnapshot: snapshots.length > 0 ? snapshots[snapshots.length - 1].timestamp : null,
      activeTransactions: transactions.filter(t => t.status === 'active').length,
      totalTransactions: transactions.length
    };
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(snapshot1Id, snapshot2Id) {
    const snapshot1 = this.getSnapshot(snapshot1Id);
    const snapshot2 = this.getSnapshot(snapshot2Id);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    const differences = {
      instanceState: this.diffObjects(snapshot1.state.instance, snapshot2.state.instance),
      tokenChanges: this.diffObjects(snapshot1.state.tokens, snapshot2.state.tokens),
      gatewayChanges: this.diffObjects(snapshot1.state.gateways, snapshot2.state.gateways),
      timeDifference: snapshot2.timestamp - snapshot1.timestamp
    };

    return differences;
  }

  /**
   * Deep clone an object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Diff two objects
   */
  diffObjects(obj1, obj2) {
    const changes = {
      added: [],
      removed: [],
      modified: []
    };

    // Check for added and modified
    if (obj2) {
      for (const key in obj2) {
        if (!obj1 || !(key in obj1)) {
          changes.added.push(key);
        } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
          changes.modified.push(key);
        }
      }
    }

    // Check for removed
    if (obj1) {
      for (const key in obj1) {
        if (!obj2 || !(key in obj2)) {
          changes.removed.push(key);
        }
      }
    }

    return changes;
  }

  /**
   * Save snapshot to disk
   */
  async saveSnapshotToDisk(snapshot) {
    try {
      const filename = `${snapshot.id}.json`;
      const filepath = path.join(this.snapshotDir, filename);

      await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2));
    } catch (error) {
      console.error(`[StateManager] Error saving snapshot ${snapshot.id}:`, error);
    }
  }

  /**
   * Load snapshot from disk
   */
  async loadSnapshotFromDisk(snapshotId) {
    try {
      const filename = `${snapshotId}.json`;
      const filepath = path.join(this.snapshotDir, filename);

      const data = await fs.readFile(filepath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`[StateManager] Error loading snapshot ${snapshotId}:`, error);
      return null;
    }
  }

  /**
   * Delete snapshot file
   */
  async deleteSnapshotFile(snapshotId) {
    try {
      const filename = `${snapshotId}.json`;
      const filepath = path.join(this.snapshotDir, filename);

      await fs.unlink(filepath);
    } catch (error) {
      // Ignore errors (file might not exist)
    }
  }

  /**
   * Load snapshots from disk on startup
   */
  async loadSnapshotsFromDisk() {
    try {
      const files = await fs.readdir(this.snapshotDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.snapshotDir, file);
          const data = await fs.readFile(filepath, 'utf8');
          const snapshot = JSON.parse(data);

          if (!this.snapshots.has(snapshot.instanceId)) {
            this.snapshots.set(snapshot.instanceId, []);
          }

          this.snapshots.get(snapshot.instanceId).push(snapshot);
        }
      }

      console.log(`[StateManager] Loaded snapshots from disk`);
    } catch (error) {
      console.error('[StateManager] Error loading snapshots from disk:', error);
    }
  }

  /**
   * Export all snapshots for an instance
   */
  exportSnapshots(instanceId) {
    return this.getInstanceSnapshots(instanceId).map(snapshot => ({
      id: snapshot.id,
      timestamp: snapshot.timestamp,
      metadata: snapshot.metadata
    }));
  }

  /**
   * Create automatic snapshots
   */
  enableAutoSnapshots(interval = 60000) {
    if (this.autoSnapshotInterval) {
      clearInterval(this.autoSnapshotInterval);
    }

    this.autoSnapshotInterval = setInterval(() => {
      console.log('[StateManager] Auto-snapshot timer fired (implement in runtime engine)');
    }, interval);

    console.log(`[StateManager] Auto-snapshots enabled (interval: ${interval}ms)`);
  }

  /**
   * Disable automatic snapshots
   */
  disableAutoSnapshots() {
    if (this.autoSnapshotInterval) {
      clearInterval(this.autoSnapshotInterval);
      this.autoSnapshotInterval = null;
      console.log('[StateManager] Auto-snapshots disabled');
    }
  }
}

module.exports = new StateManager();
