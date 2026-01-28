/**
 * Authentication Routes
 * Handles user registration, login, logout, and token management
 */

const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');
const { authenticate } = require('../api/middleware/auth');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, metadata } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    const user = await AuthService.register(email, password, {
      firstName,
      lastName,
      metadata
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: user
    });
  } catch (error) {
    console.error('[Auth Routes] Registration error:', error.message);

    // Handle specific errors
    if (error.message === 'Email already registered') {
      return res.status(409).json({
        success: false,
        error: 'Email exists',
        message: error.message
      });
    }

    if (error.message.includes('password') || error.message.includes('email')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Login user and return JWT tokens
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    const result = await AuthService.login(email, password, {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    console.error('[Auth Routes] Login error:', error.message);

    if (error.message === 'Invalid email or password') {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: error.message
      });
    }

    if (error.message.includes('Account is')) {
      return res.status(403).json({
        success: false,
        error: 'Account inactive',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    await AuthService.logout(req.token);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('[Auth Routes] Logout error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing token',
        message: 'Refresh token is required'
      });
    }

    const result = await AuthService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed',
      data: result
    });
  } catch (error) {
    console.error('[Auth Routes] Refresh error:', error.message);

    if (error.message.includes('expired') || error.message.includes('Invalid') || error.message.includes('revoked')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await AuthService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('[Auth Routes] Get user error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: error.message
    });
  }
});

/**
 * PUT /api/auth/password
 * Change user password
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing fields',
        message: 'Current password and new password are required'
      });
    }

    await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  } catch (error) {
    console.error('[Auth Routes] Password change error:', error.message);

    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        success: false,
        error: 'Invalid password',
        message: error.message
      });
    }

    if (error.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Password change failed',
      message: error.message
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, avatarUrl, metadata } = req.body;
    const db = require('../config/database');

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(lastName);
    }
    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatarUrl);
    }
    if (metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(metadata));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided',
        message: 'Please provide at least one field to update'
      });
    }

    values.push(req.user.id);
    await db.query(
      `UPDATE k1.users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    // Return updated user
    const user = await AuthService.getUserById(req.user.id);

    res.json({
      success: true,
      message: 'Profile updated',
      data: user
    });
  } catch (error) {
    console.error('[Auth Routes] Profile update error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Profile update failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/roles/assign
 * Assign role to user (admin only)
 */
router.post('/roles/assign', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.permissions?.includes('*') && !req.user.roles?.includes('Administrator')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only administrators can assign roles'
      });
    }

    const { userId, roleId, applicationId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing fields',
        message: 'User ID and role ID are required'
      });
    }

    await AuthService.assignRole(userId, roleId, applicationId, req.user.id);

    res.json({
      success: true,
      message: 'Role assigned successfully'
    });
  } catch (error) {
    console.error('[Auth Routes] Role assign error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Role assignment failed',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/roles/revoke
 * Revoke role from user (admin only)
 */
router.post('/roles/revoke', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.permissions?.includes('*') && !req.user.roles?.includes('Administrator')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only administrators can revoke roles'
      });
    }

    const { userId, roleId, applicationId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({
        success: false,
        error: 'Missing fields',
        message: 'User ID and role ID are required'
      });
    }

    await AuthService.revokeRole(userId, roleId, applicationId, req.user.id);

    res.json({
      success: true,
      message: 'Role revoked successfully'
    });
  } catch (error) {
    console.error('[Auth Routes] Role revoke error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Role revocation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/users
 * List all users (admin only)
 */
router.get('/users', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.permissions?.includes('*') && !req.user.roles?.includes('Administrator')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only administrators can list users'
      });
    }

    const { status, search, limit, offset } = req.query;

    const users = await AuthService.listUsers({
      status,
      search,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('[Auth Routes] List users error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to list users',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/roles
 * List all available roles
 */
router.get('/roles', authenticate, async (req, res) => {
  try {
    const db = require('../config/database');
    const result = await db.query(
      'SELECT id, name, description, is_system, permissions FROM k1.roles ORDER BY name'
    );

    res.json({
      success: true,
      data: result.rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.is_system,
        permissions: r.permissions
      }))
    });
  } catch (error) {
    console.error('[Auth Routes] List roles error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to list roles',
      message: error.message
    });
  }
});

module.exports = router;
