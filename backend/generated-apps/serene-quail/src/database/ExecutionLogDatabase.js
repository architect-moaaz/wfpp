/**
 * Execution Log Database
 * Stores workflow execution failures and AI-generated fixes for learning
 */

const fs = require('fs');
const path = require('path');

const EXECUTION_LOGS_FILE = path.join(__dirname, '../../data/execution-logs.json');

class ExecutionLogDatabase {
  constructor() {
    this.ensureDataFile();
  }

  ensureDataFile() {
    if (!fs.existsSync(EXECUTION_LOGS_FILE)) {
      const initialData = {
        logs: [],
        fixes: [],
        patterns: []
      };
      fs.writeFileSync(EXECUTION_LOGS_FILE, JSON.stringify(initialData, null, 2));
    }
  }

  loadData() {
    try {
      const data = fs.readFileSync(EXECUTION_LOGS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[ExecutionLogDB] Error loading data:', error);
      return { logs: [], fixes: [], patterns: [] };
    }
  }

  saveData(data) {
    try {
      fs.writeFileSync(EXECUTION_LOGS_FILE, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('[ExecutionLogDB] Error saving data:', error);
      return false;
    }
  }

  /**
   * Log a workflow execution attempt
   */
  logExecution(log) {
    const data = this.loadData();

    const executionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      workflowId: log.workflowId,
      instanceId: log.instanceId,
      nodeId: log.nodeId,
      nodeType: log.nodeType,
      taskLabel: log.taskLabel,
      status: log.status, // 'success', 'failed', 'fixed'
      error: log.error,
      originalScript: log.originalScript,
      fixedScript: log.fixedScript,
      fixMethod: log.fixMethod, // 'ai', 'cached', 'manual'
      executionTime: log.executionTime,
      retryCount: log.retryCount || 0
    };

    data.logs.push(executionLog);

    // Keep only last 1000 logs to prevent file bloat
    if (data.logs.length > 1000) {
      data.logs = data.logs.slice(-1000);
    }

    this.saveData(data);
    return executionLog;
  }

  /**
   * Store a successful AI fix for future reference
   */
  storeFix(fix) {
    const data = this.loadData();

    const fixRecord = {
      id: `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      errorType: fix.errorType,
      errorMessage: fix.errorMessage,
      errorPattern: this.extractErrorPattern(fix.errorMessage),
      originalScript: fix.originalScript,
      fixedScript: fix.fixedScript,
      taskContext: fix.taskContext,
      successCount: 1,
      lastUsed: new Date().toISOString()
    };

    // Check if similar fix already exists
    const existingFix = data.fixes.find(f =>
      f.errorPattern === fixRecord.errorPattern &&
      f.originalScript === fixRecord.originalScript
    );

    if (existingFix) {
      existingFix.successCount++;
      existingFix.lastUsed = new Date().toISOString();
    } else {
      data.fixes.push(fixRecord);
    }

    this.saveData(data);
    return fixRecord;
  }

  /**
   * Extract error pattern for matching similar errors
   */
  extractErrorPattern(errorMessage) {
    // Extract the core error pattern, removing specific variable names
    let pattern = errorMessage
      .replace(/['"`][^'"`]+['"`]/g, 'VAR') // Replace quoted strings
      .replace(/\b\d+\b/g, 'NUM') // Replace numbers
      .replace(/\w+Error:/g, 'ERROR:') // Normalize error types
      .trim();

    return pattern;
  }

  /**
   * Find similar fixes from history
   */
  findSimilarFixes(errorMessage, originalScript, limit = 5) {
    const data = this.loadData();
    const errorPattern = this.extractErrorPattern(errorMessage);

    // Find fixes with matching error patterns
    const matches = data.fixes
      .filter(fix => {
        // Exact pattern match
        if (fix.errorPattern === errorPattern) return true;

        // Fuzzy match - check if error messages are similar
        const similarity = this.calculateSimilarity(errorMessage, fix.errorMessage);
        return similarity > 0.7; // 70% similarity threshold
      })
      .sort((a, b) => {
        // Sort by success count and recency
        if (b.successCount !== a.successCount) {
          return b.successCount - a.successCount;
        }
        return new Date(b.lastUsed) - new Date(a.lastUsed);
      })
      .slice(0, limit);

    return matches;
  }

  /**
   * Calculate similarity between two strings (simple Jaccard similarity)
   */
  calculateSimilarity(str1, str2) {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Get execution statistics
   */
  getStatistics(workflowId = null) {
    const data = this.loadData();
    let logs = data.logs;

    if (workflowId) {
      logs = logs.filter(log => log.workflowId === workflowId);
    }

    const total = logs.length;
    const successful = logs.filter(log => log.status === 'success').length;
    const failed = logs.filter(log => log.status === 'failed').length;
    const fixed = logs.filter(log => log.status === 'fixed').length;

    const errorTypes = {};
    logs.filter(log => log.error).forEach(log => {
      const errorType = this.extractErrorPattern(log.error);
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });

    return {
      total,
      successful,
      failed,
      fixed,
      successRate: total > 0 ? ((successful + fixed) / total * 100).toFixed(2) : 0,
      fixRate: failed > 0 ? (fixed / (failed + fixed) * 100).toFixed(2) : 0,
      errorTypes,
      totalFixes: data.fixes.length,
      mostCommonErrors: Object.entries(errorTypes)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }))
    };
  }

  /**
   * Get recent execution history
   */
  getRecentExecutions(limit = 50, workflowId = null) {
    const data = this.loadData();
    let logs = data.logs;

    if (workflowId) {
      logs = logs.filter(log => log.workflowId === workflowId);
    }

    return logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Get all stored fixes
   */
  getAllFixes() {
    const data = this.loadData();
    return data.fixes.sort((a, b) => b.successCount - a.successCount);
  }

  /**
   * Clear old logs (older than specified days)
   */
  clearOldLogs(daysToKeep = 30) {
    const data = this.loadData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const originalCount = data.logs.length;
    data.logs = data.logs.filter(log => new Date(log.timestamp) > cutoffDate);
    const removed = originalCount - data.logs.length;

    this.saveData(data);
    return { removed, remaining: data.logs.length };
  }
}

module.exports = new ExecutionLogDatabase();
