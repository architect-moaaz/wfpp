/**
 * AuthService - Authentication and Authorization Service
 * Handles user registration, login, JWT token management, and RBAC
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'workflow-pp-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const BCRYPT_ROUNDS = 12;

class AuthService {
  /**
   * Register a new user
   */
  async register(email, password, userData = {}) {
    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (!this.isValidPassword(password)) {
      throw new Error('Password must be at least 8 characters with at least one number and one letter');
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM k1.users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const userId = uuidv4();
    const result = await db.query(
      `INSERT INTO k1.users (id, email, password_hash, first_name, last_name, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, status, created_at`,
      [
        userId,
        email.toLowerCase(),
        passwordHash,
        userData.firstName || null,
        userData.lastName || null,
        'active',
        JSON.stringify(userData.metadata || {})
      ]
    );

    const user = result.rows[0];

    // Assign default role (Viewer) for global access
    await this.assignRole(userId, 'role_viewer', null);

    // Log registration
    await this.logAudit(userId, 'user.register', 'user', userId, { email });

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      status: user.status,
      createdAt: user.created_at
    };
  }

  /**
   * Login user and return tokens
   */
  async login(email, password, metadata = {}) {
    // Find user
    const result = await db.query(
      `SELECT id, email, password_hash, first_name, last_name, status, metadata
       FROM k1.users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Check if user is active
    if (user.status !== 'active') {
      throw new Error(`Account is ${user.status}. Please contact support.`);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Get user roles and permissions
    const roles = await this.getUserRoles(user.id);
    const permissions = await this.getUserPermissions(user.id);

    // Generate tokens
    const accessToken = this.generateAccessToken(user, roles, permissions);
    const refreshToken = this.generateRefreshToken();

    // Store session
    const sessionId = uuidv4();
    const tokenHash = this.hashToken(accessToken);
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN);

    await db.query(
      `INSERT INTO k1.sessions (id, user_id, token_hash, refresh_token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, user.id, tokenHash, refreshTokenHash, expiresAt, metadata.ipAddress, metadata.userAgent]
    );

    // Update last login
    await db.query(
      'UPDATE k1.users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Log login
    await this.logAudit(user.id, 'user.login', 'session', sessionId, { ipAddress: metadata.ipAddress });

    return {
      accessToken,
      refreshToken,
      expiresIn: JWT_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: roles.map(r => r.name),
        permissions
      }
    };
  }

  /**
   * Logout user and invalidate session
   */
  async logout(token) {
    const tokenHash = this.hashToken(token);

    // Get session before revoking
    const sessionResult = await db.query(
      'SELECT id, user_id FROM k1.sessions WHERE token_hash = $1',
      [tokenHash]
    );

    if (sessionResult.rows.length > 0) {
      const session = sessionResult.rows[0];

      // Revoke session
      await db.query(
        'UPDATE k1.sessions SET is_revoked = true WHERE token_hash = $1',
        [tokenHash]
      );

      // Log logout
      await this.logAudit(session.user_id, 'user.logout', 'session', session.id, {});
    }

    return { success: true };
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token) {
    try {
      // Verify JWT signature
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if session is valid
      const tokenHash = this.hashToken(token);
      const sessionResult = await db.query(
        `SELECT id, user_id, expires_at, is_revoked
         FROM k1.sessions WHERE token_hash = $1`,
        [tokenHash]
      );

      // For JWTs that weren't stored (e.g., from previous implementation)
      // Just validate the token itself
      if (sessionResult.rows.length === 0) {
        // Get fresh user data
        const userResult = await db.query(
          'SELECT id, email, first_name, last_name, status FROM k1.users WHERE id = $1',
          [decoded.userId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
          throw new Error('User not found or inactive');
        }

        const user = userResult.rows[0];
        const roles = await this.getUserRoles(user.id);
        const permissions = await this.getUserPermissions(user.id);

        return {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          roles: roles.map(r => r.name),
          permissions
        };
      }

      const session = sessionResult.rows[0];

      if (session.is_revoked) {
        throw new Error('Session has been revoked');
      }

      if (new Date(session.expires_at) < new Date()) {
        throw new Error('Session has expired');
      }

      // Return decoded user with fresh permissions
      const roles = await this.getUserRoles(decoded.userId);
      const permissions = await this.getUserPermissions(decoded.userId);

      return {
        id: decoded.userId,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
        roles: roles.map(r => r.name),
        permissions
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken) {
    const refreshTokenHash = this.hashToken(refreshToken);

    // Find valid session with this refresh token
    const sessionResult = await db.query(
      `SELECT s.id, s.user_id, s.expires_at, s.is_revoked,
              u.email, u.first_name, u.last_name, u.status
       FROM k1.sessions s
       JOIN k1.users u ON s.user_id = u.id
       WHERE s.refresh_token_hash = $1`,
      [refreshTokenHash]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Invalid refresh token');
    }

    const session = sessionResult.rows[0];

    if (session.is_revoked) {
      throw new Error('Session has been revoked');
    }

    if (new Date(session.expires_at) < new Date()) {
      throw new Error('Refresh token has expired');
    }

    if (session.status !== 'active') {
      throw new Error('User account is not active');
    }

    // Get roles and permissions
    const roles = await this.getUserRoles(session.user_id);
    const permissions = await this.getUserPermissions(session.user_id);

    // Generate new access token
    const user = {
      id: session.user_id,
      email: session.email,
      first_name: session.first_name,
      last_name: session.last_name
    };
    const newAccessToken = this.generateAccessToken(user, roles, permissions);

    // Update session with new token hash
    const newTokenHash = this.hashToken(newAccessToken);
    await db.query(
      'UPDATE k1.sessions SET token_hash = $1 WHERE id = $2',
      [newTokenHash, session.id]
    );

    return {
      accessToken: newAccessToken,
      expiresIn: JWT_EXPIRES_IN
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId, oldPassword, newPassword) {
    // Validate new password
    if (!this.isValidPassword(newPassword)) {
      throw new Error('New password must be at least 8 characters with at least one number and one letter');
    }

    // Get current password hash
    const result = await db.query(
      'SELECT password_hash FROM k1.users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash and update new password
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await db.query(
      'UPDATE k1.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Revoke all sessions (force re-login)
    await db.query(
      'UPDATE k1.sessions SET is_revoked = true WHERE user_id = $1',
      [userId]
    );

    // Log password change
    await this.logAudit(userId, 'user.password_change', 'user', userId, {});

    return { success: true };
  }

  /**
   * Assign role to user for an application (or globally if applicationId is null)
   */
  async assignRole(userId, roleId, applicationId, grantedBy = null) {
    // Use a placeholder for global roles
    const appId = applicationId || 'global';

    await db.query(
      `INSERT INTO k1.user_roles (user_id, role_id, application_id, granted_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, role_id, application_id) DO NOTHING`,
      [userId, roleId, appId, grantedBy]
    );

    // Log role assignment
    await this.logAudit(grantedBy, 'role.assign', 'user_role', `${userId}:${roleId}:${appId}`, {
      userId, roleId, applicationId
    });

    return { success: true };
  }

  /**
   * Revoke role from user
   */
  async revokeRole(userId, roleId, applicationId, revokedBy = null) {
    const appId = applicationId || 'global';

    await db.query(
      'DELETE FROM k1.user_roles WHERE user_id = $1 AND role_id = $2 AND application_id = $3',
      [userId, roleId, appId]
    );

    // Log role revocation
    await this.logAudit(revokedBy, 'role.revoke', 'user_role', `${userId}:${roleId}:${appId}`, {
      userId, roleId, applicationId
    });

    return { success: true };
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(userId, applicationId = null) {
    let query = `
      SELECT r.id, r.name, r.description, r.permissions, ur.application_id
      FROM k1.user_roles ur
      JOIN k1.roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
    `;
    const params = [userId];

    if (applicationId) {
      query += ' AND (ur.application_id = $2 OR ur.application_id = $3)';
      params.push(applicationId, 'global');
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get all permissions for a user (aggregated from all roles)
   */
  async getUserPermissions(userId, applicationId = null) {
    const roles = await this.getUserRoles(userId, applicationId);

    const permissionSet = new Set();
    for (const role of roles) {
      const permissions = role.permissions || [];
      permissions.forEach(p => permissionSet.add(p));
    }

    return Array.from(permissionSet);
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId, permission, applicationId = null) {
    const permissions = await this.getUserPermissions(userId, applicationId);

    // Check for exact match or wildcard
    if (permissions.includes('*')) return true;
    if (permissions.includes(permission)) return true;

    // Check for resource wildcard (e.g., "workflow:*" matches "workflow:read")
    const [resource, action] = permission.split(':');
    if (permissions.includes(`${resource}:*`)) return true;

    return false;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, status, avatar_url, metadata, created_at, updated_at, last_login_at
       FROM k1.users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    const roles = await this.getUserRoles(userId);
    const permissions = await this.getUserPermissions(userId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      status: user.status,
      avatarUrl: user.avatar_url,
      metadata: user.metadata,
      roles: roles.map(r => ({ id: r.id, name: r.name, applicationId: r.application_id })),
      permissions,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at
    };
  }

  /**
   * List all users (admin only)
   */
  async listUsers(filters = {}) {
    let query = `
      SELECT id, email, first_name, last_name, status, created_at, last_login_at
      FROM k1.users
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      query += ` AND (email ILIKE $${params.length} OR first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }

    if (filters.offset) {
      params.push(filters.offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await db.query(query, params);
    return result.rows.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      status: u.status,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at
    }));
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  generateAccessToken(user, roles, permissions) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: roles.map(r => r.name),
        permissions
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPassword(password) {
    // At least 8 characters, one letter, one number
    return password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  }

  async logAudit(userId, action, resourceType, resourceId, details) {
    try {
      await db.query(
        `INSERT INTO k1.audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, resourceType, resourceId, JSON.stringify(details)]
      );
    } catch (error) {
      console.error('[AuthService] Failed to log audit:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new AuthService();
