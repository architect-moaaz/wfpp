/**
 * Token Manager
 * Manages execution tokens for parallel and concurrent workflow flows
 */

const { v4: uuidv4 } = require('uuid');

class TokenManager {
  constructor() {
    // Token storage: instanceId -> tokens[]
    this.tokens = new Map();
  }

  /**
   * Create initial token for workflow instance
   */
  createInitialToken(instanceId, startNodeId) {
    const token = {
      id: uuidv4(),
      instanceId,
      position: startNodeId,
      status: 'active',
      parentTokenId: null,
      childTokens: [],
      variables: {},
      createdAt: new Date(),
      history: [{
        nodeId: startNodeId,
        timestamp: new Date(),
        status: 'created'
      }]
    };

    if (!this.tokens.has(instanceId)) {
      this.tokens.set(instanceId, []);
    }

    this.tokens.get(instanceId).push(token);
    console.log(`[TokenManager] Created initial token ${token.id} at ${startNodeId}`);

    return token;
  }

  /**
   * Fork token into multiple tokens (for parallel gateway split)
   */
  forkToken(instanceId, parentTokenId, targetNodeIds) {
    const parentToken = this.getToken(instanceId, parentTokenId);

    if (!parentToken) {
      throw new Error(`Parent token ${parentTokenId} not found`);
    }

    // Mark parent as split
    parentToken.status = 'split';

    // Create child tokens
    const childTokens = targetNodeIds.map(nodeId => {
      const childToken = {
        id: uuidv4(),
        instanceId,
        position: nodeId,
        status: 'active',
        parentTokenId: parentToken.id,
        childTokens: [],
        variables: { ...parentToken.variables }, // Copy parent variables
        createdAt: new Date(),
        history: [{
          nodeId,
          timestamp: new Date(),
          status: 'created_from_fork'
        }]
      };

      this.tokens.get(instanceId).push(childToken);
      return childToken;
    });

    // Update parent's child references
    parentToken.childTokens = childTokens.map(t => t.id);

    console.log(`[TokenManager] Forked token ${parentTokenId} into ${childTokens.length} children`);

    return childTokens;
  }

  /**
   * Merge multiple tokens into one (for parallel gateway join)
   */
  mergeTokens(instanceId, tokenIds, targetNodeId) {
    const tokensToMerge = tokenIds.map(id => this.getToken(instanceId, id));

    if (tokensToMerge.some(t => !t)) {
      throw new Error('Some tokens not found for merging');
    }

    // Create merged token
    const mergedToken = {
      id: uuidv4(),
      instanceId,
      position: targetNodeId,
      status: 'active',
      parentTokenId: null,
      childTokens: [],
      variables: this.mergeVariables(tokensToMerge),
      createdAt: new Date(),
      history: [{
        nodeId: targetNodeId,
        timestamp: new Date(),
        status: 'created_from_merge',
        mergedFrom: tokenIds
      }]
    };

    // Mark merged tokens as completed
    tokensToMerge.forEach(token => {
      token.status = 'merged';
      token.completedAt = new Date();
    });

    this.tokens.get(instanceId).push(mergedToken);

    console.log(`[TokenManager] Merged ${tokenIds.length} tokens into ${mergedToken.id}`);

    return mergedToken;
  }

  /**
   * Merge variables from multiple tokens
   */
  mergeVariables(tokens) {
    const merged = {};

    // Later tokens override earlier ones
    tokens.forEach(token => {
      Object.assign(merged, token.variables);
    });

    return merged;
  }

  /**
   * Move token to new position
   */
  moveToken(instanceId, tokenId, newNodeId) {
    const token = this.getToken(instanceId, tokenId);

    if (!token) {
      throw new Error(`Token ${tokenId} not found`);
    }

    token.position = newNodeId;
    token.history.push({
      nodeId: newNodeId,
      timestamp: new Date(),
      status: 'moved'
    });

    console.log(`[TokenManager] Moved token ${tokenId} to ${newNodeId}`);

    return token;
  }

  /**
   * Update token variables
   */
  updateTokenVariables(instanceId, tokenId, variables) {
    const token = this.getToken(instanceId, tokenId);

    if (!token) {
      throw new Error(`Token ${tokenId} not found`);
    }

    Object.assign(token.variables, variables);

    return token;
  }

  /**
   * Mark token as completed
   */
  completeToken(instanceId, tokenId) {
    const token = this.getToken(instanceId, tokenId);

    if (!token) {
      throw new Error(`Token ${tokenId} not found`);
    }

    token.status = 'completed';
    token.completedAt = new Date();

    console.log(`[TokenManager] Completed token ${tokenId}`);

    return token;
  }

  /**
   * Get specific token
   */
  getToken(instanceId, tokenId) {
    const instanceTokens = this.tokens.get(instanceId);

    if (!instanceTokens) {
      return null;
    }

    return instanceTokens.find(t => t.id === tokenId);
  }

  /**
   * Get all tokens for instance
   */
  getInstanceTokens(instanceId) {
    return this.tokens.get(instanceId) || [];
  }

  /**
   * Get all active tokens for instance
   */
  getActiveTokens(instanceId) {
    const tokens = this.tokens.get(instanceId) || [];
    return tokens.filter(t => t.status === 'active');
  }

  /**
   * Get tokens at specific position
   */
  getTokensAtPosition(instanceId, nodeId) {
    const tokens = this.tokens.get(instanceId) || [];
    return tokens.filter(t => t.position === nodeId && t.status === 'active');
  }

  /**
   * Clean up instance tokens
   */
  clearInstanceTokens(instanceId) {
    this.tokens.delete(instanceId);
    console.log(`[TokenManager] Cleared tokens for instance ${instanceId}`);
  }

  /**
   * Get token statistics
   */
  getTokenStats(instanceId) {
    const tokens = this.tokens.get(instanceId) || [];

    return {
      total: tokens.length,
      active: tokens.filter(t => t.status === 'active').length,
      completed: tokens.filter(t => t.status === 'completed').length,
      split: tokens.filter(t => t.status === 'split').length,
      merged: tokens.filter(t => t.status === 'merged').length
    };
  }

  /**
   * Export tokens for persistence
   */
  exportTokens(instanceId) {
    return this.tokens.get(instanceId) || [];
  }

  /**
   * Import tokens from persistence
   */
  importTokens(instanceId, tokens) {
    this.tokens.set(instanceId, tokens);
    console.log(`[TokenManager] Imported ${tokens.length} tokens for instance ${instanceId}`);
  }
}

module.exports = new TokenManager();
