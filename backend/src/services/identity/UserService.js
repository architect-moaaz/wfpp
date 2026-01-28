const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class UserService {
  constructor(db) {
    this.db = db;
  }

  // ============================================
  // USER CRUD
  // ============================================

  async createUser(userData) {
    const id = uuidv4();
    const {
      email,
      name,
      firstName,
      lastName,
      password,
      authProvider = 'local',
      authProviderId = null,
      avatarUrl = null,
      phone = null
    } = userData;

    let passwordHash = null;
    if (password && authProvider === 'local') {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const query = `
      INSERT INTO k1.users (id, email, name, first_name, last_name, password_hash,
                         auth_provider, auth_provider_id, avatar_url, phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id, email, name, firstName, lastName, passwordHash,
      authProvider, authProviderId, avatarUrl, phone
    ]);

    return this.sanitizeUser(result.rows[0]);
  }

  async getUserById(userId) {
    const query = 'SELECT * FROM k1.users WHERE id = $1 AND is_active = true';
    const result = await this.db.query(query, [userId]);
    return result.rows[0] ? this.sanitizeUser(result.rows[0]) : null;
  }

  async getUserByEmail(email) {
    const query = 'SELECT * FROM k1.users WHERE email = $1 AND is_active = true';
    const result = await this.db.query(query, [email.toLowerCase()]);
    return result.rows[0] || null;
  }

  async getUserByAuthProvider(provider, providerId) {
    const query = `
      SELECT * FROM k1.users
      WHERE auth_provider = $1 AND auth_provider_id = $2 AND is_active = true
    `;
    const result = await this.db.query(query, [provider, providerId]);
    return result.rows[0] ? this.sanitizeUser(result.rows[0]) : null;
  }

  async updateUser(userId, updates) {
    const allowedFields = ['name', 'first_name', 'last_name', 'avatar_url', 'phone', 'email_verified'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClause.length === 0) return this.getUserById(userId);

    setClause.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE k1.users SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] ? this.sanitizeUser(result.rows[0]) : null;
  }

  async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const query = `
      UPDATE k1.users SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `;
    await this.db.query(query, [passwordHash, userId]);
  }

  async verifyPassword(userId, password) {
    const query = 'SELECT password_hash FROM k1.users WHERE id = $1';
    const result = await this.db.query(query, [userId]);
    if (!result.rows[0]?.password_hash) return false;
    return bcrypt.compare(password, result.rows[0].password_hash);
  }

  async deactivateUser(userId) {
    const query = `
      UPDATE k1.users SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;
    await this.db.query(query, [userId]);
  }

  async recordLogin(userId) {
    const query = `
      UPDATE k1.users SET last_login_at = NOW()
      WHERE id = $1
    `;
    await this.db.query(query, [userId]);
  }

  // ============================================
  // USER ORGANIZATION QUERIES
  // ============================================

  async getUserOrganizations(userId) {
    const query = `
      SELECT o.*, om.status, om.joined_at
      FROM k1.organizations o
      JOIN k1.organization_memberships om ON o.id = om.organization_id
      WHERE om.user_id = $1 AND om.status = 'active' AND o.is_active = true
      ORDER BY om.joined_at
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  async getUsersByOrganization(organizationId, options = {}) {
    const { status = 'active', limit = 100, offset = 0, search = null } = options;

    let query = `
      SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.avatar_url,
             om.status, om.joined_at
      FROM k1.users u
      JOIN k1.organization_memberships om ON u.id = om.user_id
      WHERE om.organization_id = $1 AND om.status = $2 AND u.is_active = true
    `;
    const values = [organizationId, status];
    let paramCount = 3;

    if (search) {
      query += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY u.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return result.rows;
  }

  async getUsersCountByOrganization(organizationId) {
    const query = `
      SELECT COUNT(*) as count
      FROM k1.organization_memberships
      WHERE organization_id = $1 AND status = 'active'
    `;
    const result = await this.db.query(query, [organizationId]);
    return parseInt(result.rows[0].count, 10);
  }

  // ============================================
  // USER ROLE QUERIES
  // ============================================

  async getUsersByOrgRole(organizationId, roleId, options = {}) {
    const { includeInherited = true } = options;

    let query;
    if (includeInherited) {
      // Get users with this role or any child roles in the hierarchy
      query = `
        WITH RECURSIVE role_tree AS (
          SELECT id, parent_role_id FROM k1.org_roles WHERE id = $2
          UNION ALL
          SELECT r.id, r.parent_role_id FROM k1.org_roles r
          JOIN role_tree rt ON r.parent_role_id = rt.id
        )
        SELECT DISTINCT u.id, u.email, u.name, u.first_name, u.last_name, u.avatar_url
        FROM k1.users u
        JOIN k1.user_org_roles uor ON u.id = uor.user_id
        WHERE uor.organization_id = $1
          AND uor.org_role_id IN (SELECT id FROM role_tree)
          AND u.is_active = true
      `;
    } else {
      query = `
        SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.avatar_url
        FROM k1.users u
        JOIN k1.user_org_roles uor ON u.id = uor.user_id
        WHERE uor.organization_id = $1 AND uor.org_role_id = $2 AND u.is_active = true
      `;
    }

    const result = await this.db.query(query, [organizationId, roleId]);
    return result.rows;
  }

  async getUsersByAppRole(appId, roleId) {
    const query = `
      SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.avatar_url
      FROM k1.users u
      JOIN user_app_roles uar ON u.id = uar.user_id
      WHERE uar.app_id = $1 AND uar.app_role_id = $2 AND u.is_active = true
    `;
    const result = await this.db.query(query, [appId, roleId]);
    return result.rows;
  }

  async getUserOrgRoles(userId, organizationId) {
    const query = `
      SELECT r.*
      FROM k1.org_roles r
      JOIN k1.user_org_roles uor ON r.id = uor.org_role_id
      WHERE uor.user_id = $1 AND uor.organization_id = $2
    `;
    const result = await this.db.query(query, [userId, organizationId]);
    return result.rows;
  }

  async getUserAppRoles(userId, appId) {
    const query = `
      SELECT r.*
      FROM app_roles r
      JOIN user_app_roles uar ON r.id = uar.app_role_id
      WHERE uar.user_id = $1 AND uar.app_id = $2
    `;
    const result = await this.db.query(query, [userId, appId]);
    return result.rows;
  }

  async assignOrgRole(userId, roleId, organizationId, assignedBy = null) {
    // Check if assignment already exists
    const checkQuery = `
      SELECT * FROM k1.user_org_roles
      WHERE user_id = $1 AND org_role_id = $2
    `;
    const existing = await this.db.query(checkQuery, [userId, roleId]);
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const query = `
      INSERT INTO k1.user_org_roles (user_id, org_role_id, organization_id, assigned_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await this.db.query(query, [userId, roleId, organizationId, assignedBy]);
    return result.rows[0];
  }

  async removeOrgRole(userId, roleId) {
    const query = 'DELETE FROM k1.user_org_roles WHERE user_id = $1 AND org_role_id = $2';
    await this.db.query(query, [userId, roleId]);
  }

  async assignAppRole(userId, roleId, appId, assignedBy = null) {
    const query = `
      INSERT INTO user_app_roles (user_id, app_role_id, app_id, assigned_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, app_role_id) DO NOTHING
      RETURNING *
    `;
    const result = await this.db.query(query, [userId, roleId, appId, assignedBy]);
    return result.rows[0];
  }

  async removeAppRole(userId, roleId) {
    const query = 'DELETE FROM k1.user_app_roles WHERE user_id = $1 AND app_role_id = $2';
    await this.db.query(query, [userId, roleId]);
  }

  // ============================================
  // USER PERMISSION CHECKS
  // ============================================

  async hasOrgPermission(userId, organizationId, permission) {
    const query = `
      SELECT r.permissions
      FROM k1.org_roles r
      JOIN k1.user_org_roles uor ON r.id = uor.org_role_id
      WHERE uor.user_id = $1 AND uor.organization_id = $2
    `;
    const result = await this.db.query(query, [userId, organizationId]);

    for (const row of result.rows) {
      const permissions = row.permissions || [];
      if (permissions.includes(permission) || permissions.includes('*')) {
        return true;
      }
    }
    return false;
  }

  async hasAppPermission(userId, appId, permission) {
    const query = `
      SELECT r.permissions
      FROM app_roles r
      JOIN user_app_roles uar ON r.id = uar.app_role_id
      WHERE uar.user_id = $1 AND uar.app_id = $2
    `;
    const result = await this.db.query(query, [userId, appId]);

    for (const row of result.rows) {
      const permissions = row.permissions || [];
      if (permissions.includes(permission) || permissions.includes('*')) {
        return true;
      }
    }
    return false;
  }

  // ============================================
  // USER WITH FULL CONTEXT
  // ============================================

  async getUserWithContext(userId, organizationId) {
    const user = await this.getUserById(userId);
    if (!user) return null;

    const [orgRoles, position, groups] = await Promise.all([
      this.getUserOrgRoles(userId, organizationId),
      this.getUserPosition(userId, organizationId),
      this.getUserGroups(userId, organizationId)
    ]);

    return {
      ...user,
      orgRoles,
      position,
      groups
    };
  }

  async getUserPosition(userId, organizationId) {
    const query = `
      SELECT p.*, d.name as department_name
      FROM k1.positions p
      LEFT JOIN k1.departments d ON p.department_id = d.id
      WHERE p.user_id = $1 AND p.organization_id = $2 AND p.is_active = true
    `;
    const result = await this.db.query(query, [userId, organizationId]);
    return result.rows[0] || null;
  }

  async getUserGroups(userId, organizationId) {
    const query = `
      SELECT g.*
      FROM k1.groups g
      JOIN k1.group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1 AND g.organization_id = $2 AND g.is_active = true
    `;
    const result = await this.db.query(query, [userId, organizationId]);
    return result.rows;
  }

  async getUserManager(userId, organizationId) {
    const query = `
      SELECT manager_u.id, manager_u.email, manager_u.name, manager_u.avatar_url,
             manager_p.title as position_title
      FROM k1.positions p
      JOIN k1.positions manager_p ON p.parent_position_id = manager_p.id
      JOIN k1.users manager_u ON manager_p.user_id = manager_u.id
      WHERE p.user_id = $1 AND p.organization_id = $2
        AND p.is_active = true AND manager_p.is_active = true
    `;
    const result = await this.db.query(query, [userId, organizationId]);
    return result.rows[0] || null;
  }

  async getUserDirectReports(userId, organizationId) {
    const query = `
      SELECT u.id, u.email, u.name, u.avatar_url, p.title as position_title
      FROM k1.positions manager_p
      JOIN k1.positions p ON p.parent_position_id = manager_p.id
      JOIN k1.users u ON p.user_id = u.id
      WHERE manager_p.user_id = $1 AND manager_p.organization_id = $2
        AND p.is_active = true AND u.is_active = true
    `;
    const result = await this.db.query(query, [userId, organizationId]);
    return result.rows;
  }

  // ============================================
  // HELPERS
  // ============================================

  sanitizeUser(user) {
    if (!user) return null;
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }

  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = UserService;
