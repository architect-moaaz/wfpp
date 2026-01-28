const { v4: uuidv4 } = require('uuid');

class RoleService {
  constructor(db) {
    this.db = db;
  }

  // ============================================
  // ORG ROLE CRUD
  // ============================================

  async createOrgRole(orgId, roleData) {
    const id = uuidv4();
    const {
      name,
      displayName = null,
      description = null,
      parentRoleId = null,
      permissions = [],
      isSystem = false,
      isDefault = false,
      level = 0
    } = roleData;

    // Calculate level based on parent if not provided
    let calculatedLevel = level;
    if (parentRoleId && level === 0) {
      const parent = await this.getOrgRoleById(parentRoleId);
      calculatedLevel = (parent?.level || 0) + 1;
    }

    const query = `
      INSERT INTO k1.org_roles (id, organization_id, name, display_name, description,
                             parent_role_id, permissions, is_system, is_default, level)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id, orgId, name, displayName || name, description,
      parentRoleId, JSON.stringify(permissions), isSystem, isDefault, calculatedLevel
    ]);

    return result.rows[0];
  }

  async getOrgRoleById(roleId) {
    const query = 'SELECT * FROM k1.org_roles WHERE id = $1';
    const result = await this.db.query(query, [roleId]);
    return result.rows[0] || null;
  }

  async getOrgRoleByName(orgId, name) {
    const query = 'SELECT * FROM k1.org_roles WHERE organization_id = $1 AND name = $2';
    const result = await this.db.query(query, [orgId, name]);
    return result.rows[0] || null;
  }

  async updateOrgRole(roleId, updates) {
    const role = await this.getOrgRoleById(roleId);
    if (!role) return null;
    if (role.is_system) {
      // Only allow updating permissions for system roles
      const allowedFields = ['permissions'];
      updates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowedFields.includes(key))
      );
    }

    const allowedFields = ['name', 'display_name', 'description', 'parent_role_id', 'permissions', 'is_default', 'level'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey)) {
        const val = dbKey === 'permissions' ? JSON.stringify(value) : value;
        setClause.push(`${dbKey} = $${paramCount}`);
        values.push(val);
        paramCount++;
      }
    }

    if (setClause.length === 0) return role;

    setClause.push(`updated_at = NOW()`);
    values.push(roleId);

    const query = `
      UPDATE k1.org_roles SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async deleteOrgRole(roleId) {
    const role = await this.getOrgRoleById(roleId);
    if (role?.is_system) {
      throw new Error('Cannot delete system roles');
    }

    // Remove all user assignments first
    await this.db.query('DELETE FROM k1.user_org_roles WHERE org_role_id = $1', [roleId]);

    // Update children to have no parent
    await this.db.query(
      'UPDATE k1.org_roles SET parent_role_id = NULL WHERE parent_role_id = $1',
      [roleId]
    );

    // Delete the role
    await this.db.query('DELETE FROM k1.org_roles WHERE id = $1', [roleId]);
  }

  async listOrgRoles(orgId, options = {}) {
    const { includeSystem = true, flat = false } = options;

    let query = 'SELECT * FROM k1.org_roles WHERE organization_id = $1';
    const values = [orgId];

    if (!includeSystem) {
      query += ' AND is_system = false';
    }

    query += ' ORDER BY level, name';

    const result = await this.db.query(query, values);

    if (flat) {
      return result.rows;
    }

    // Build hierarchical structure
    return this.buildRoleHierarchy(result.rows);
  }

  // ============================================
  // APP ROLE CRUD
  // ============================================

  async createAppRole(appId, orgId, roleData) {
    const id = uuidv4();
    const {
      name,
      displayName = null,
      description = null,
      parentRoleId = null,
      permissions = [],
      isSystem = false
    } = roleData;

    const query = `
      INSERT INTO app_roles (id, app_id, organization_id, name, display_name,
                             description, parent_role_id, permissions, is_system)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id, appId, orgId, name, displayName || name,
      description, parentRoleId, JSON.stringify(permissions), isSystem
    ]);

    return result.rows[0];
  }

  async getAppRoleById(roleId) {
    const query = 'SELECT * FROM app_roles WHERE id = $1';
    const result = await this.db.query(query, [roleId]);
    return result.rows[0] || null;
  }

  async updateAppRole(roleId, updates) {
    const role = await this.getAppRoleById(roleId);
    if (!role) return null;
    if (role.is_system) return role;

    const allowedFields = ['name', 'display_name', 'description', 'parent_role_id', 'permissions'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey)) {
        const val = dbKey === 'permissions' ? JSON.stringify(value) : value;
        setClause.push(`${dbKey} = $${paramCount}`);
        values.push(val);
        paramCount++;
      }
    }

    if (setClause.length === 0) return role;

    setClause.push(`updated_at = NOW()`);
    values.push(roleId);

    const query = `
      UPDATE app_roles SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async deleteAppRole(roleId) {
    const role = await this.getAppRoleById(roleId);
    if (role?.is_system) {
      throw new Error('Cannot delete system roles');
    }

    await this.db.query('DELETE FROM k1.user_app_roles WHERE app_role_id = $1', [roleId]);
    await this.db.query(
      'UPDATE app_roles SET parent_role_id = NULL WHERE parent_role_id = $1',
      [roleId]
    );
    await this.db.query('DELETE FROM k1.app_roles WHERE id = $1', [roleId]);
  }

  async listAppRoles(appId, options = {}) {
    const { flat = false } = options;

    const query = 'SELECT * FROM app_roles WHERE app_id = $1 ORDER BY name';
    const result = await this.db.query(query, [appId]);

    if (flat) {
      return result.rows;
    }

    return this.buildRoleHierarchy(result.rows);
  }

  // ============================================
  // ROLE HIERARCHY
  // ============================================

  buildRoleHierarchy(roles) {
    const roleMap = new Map();
    const roots = [];

    // First pass: create map
    for (const role of roles) {
      roleMap.set(role.id, { ...role, children: [] });
    }

    // Second pass: build tree
    for (const role of roles) {
      const node = roleMap.get(role.id);
      if (role.parent_role_id && roleMap.has(role.parent_role_id)) {
        roleMap.get(role.parent_role_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getRoleAncestors(roleId, isAppRole = false) {
    const table = isAppRole ? 'app_roles' : 'org_roles';

    const query = `
      WITH RECURSIVE role_ancestors AS (
        SELECT * FROM ${table} WHERE id = $1
        UNION ALL
        SELECT r.* FROM ${table} r
        JOIN role_ancestors ra ON r.id = ra.parent_role_id
      )
      SELECT * FROM role_ancestors ORDER BY level DESC
    `;

    const result = await this.db.query(query, [roleId]);
    return result.rows;
  }

  async getRoleDescendants(roleId, isAppRole = false) {
    const table = isAppRole ? 'app_roles' : 'org_roles';

    const query = `
      WITH RECURSIVE role_descendants AS (
        SELECT * FROM ${table} WHERE id = $1
        UNION ALL
        SELECT r.* FROM ${table} r
        JOIN role_descendants rd ON r.parent_role_id = rd.id
      )
      SELECT * FROM role_descendants WHERE id != $1
    `;

    const result = await this.db.query(query, [roleId]);
    return result.rows;
  }

  // ============================================
  // PERMISSION RESOLUTION
  // ============================================

  async getEffectivePermissions(roleId, isAppRole = false) {
    // Get all ancestor roles (including self)
    const ancestors = await this.getRoleAncestors(roleId, isAppRole);

    // Merge permissions from all ancestors (child permissions override parent)
    const permissionSet = new Set();

    // Start from root (highest level) and work down
    for (const role of ancestors) {
      const permissions = role.permissions || [];
      for (const perm of permissions) {
        permissionSet.add(perm);
      }
    }

    return Array.from(permissionSet);
  }

  async getUserEffectiveOrgPermissions(userId, orgId) {
    const query = `
      SELECT DISTINCT r.permissions
      FROM k1.org_roles r
      JOIN k1.user_org_roles uor ON r.id = uor.org_role_id
      WHERE uor.user_id = $1 AND uor.organization_id = $2
    `;

    const result = await this.db.query(query, [userId, orgId]);

    const permissionSet = new Set();
    for (const row of result.rows) {
      const permissions = row.permissions || [];
      for (const perm of permissions) {
        permissionSet.add(perm);
      }
    }

    return Array.from(permissionSet);
  }

  async getUserEffectiveAppPermissions(userId, appId) {
    const query = `
      SELECT DISTINCT r.permissions
      FROM app_roles r
      JOIN user_app_roles uar ON r.id = uar.app_role_id
      WHERE uar.user_id = $1 AND uar.app_id = $2
    `;

    const result = await this.db.query(query, [userId, appId]);

    const permissionSet = new Set();
    for (const row of result.rows) {
      const permissions = row.permissions || [];
      for (const perm of permissions) {
        permissionSet.add(perm);
      }
    }

    return Array.from(permissionSet);
  }

  // ============================================
  // ROLE ASSIGNMENT
  // ============================================

  async assignOrgRoleToUser(userId, roleId, orgId, assignedBy = null) {
    const query = `
      INSERT INTO k1.user_org_roles (user_id, org_role_id, organization_id, assigned_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, org_role_id) DO NOTHING
      RETURNING *
    `;
    const result = await this.db.query(query, [userId, roleId, orgId, assignedBy]);
    return result.rows[0];
  }

  async removeOrgRoleFromUser(userId, roleId) {
    await this.db.query(
      'DELETE FROM k1.user_org_roles WHERE user_id = $1 AND org_role_id = $2',
      [userId, roleId]
    );
  }

  async assignAppRoleToUser(userId, roleId, appId, assignedBy = null) {
    const query = `
      INSERT INTO user_app_roles (user_id, app_role_id, app_id, assigned_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, app_role_id) DO NOTHING
      RETURNING *
    `;
    const result = await this.db.query(query, [userId, roleId, appId, assignedBy]);
    return result.rows[0];
  }

  async removeAppRoleFromUser(userId, roleId) {
    await this.db.query(
      'DELETE FROM k1.user_app_roles WHERE user_id = $1 AND app_role_id = $2',
      [userId, roleId]
    );
  }

  async getUsersWithOrgRole(roleId, options = {}) {
    const { includeDescendants = false } = options;

    let roleIds = [roleId];

    if (includeDescendants) {
      const descendants = await this.getRoleDescendants(roleId, false);
      roleIds = roleIds.concat(descendants.map(r => r.id));
    }

    const query = `
      SELECT DISTINCT u.id, u.email, u.name, u.first_name, u.last_name, u.avatar_url,
             r.name as role_name, r.display_name as role_display_name
      FROM k1.users u
      JOIN k1.user_org_roles uor ON u.id = uor.user_id
      JOIN org_roles r ON uor.org_role_id = r.id
      WHERE uor.org_role_id = ANY($1) AND u.is_active = true
    `;

    const result = await this.db.query(query, [roleIds]);
    return result.rows;
  }

  async getUsersWithAppRole(roleId, options = {}) {
    const { includeDescendants = false } = options;

    let roleIds = [roleId];

    if (includeDescendants) {
      const descendants = await this.getRoleDescendants(roleId, true);
      roleIds = roleIds.concat(descendants.map(r => r.id));
    }

    const query = `
      SELECT DISTINCT u.id, u.email, u.name, u.first_name, u.last_name, u.avatar_url,
             r.name as role_name, r.display_name as role_display_name
      FROM k1.users u
      JOIN user_app_roles uar ON u.id = uar.user_id
      JOIN app_roles r ON uar.app_role_id = r.id
      WHERE uar.app_role_id = ANY($1) AND u.is_active = true
    `;

    const result = await this.db.query(query, [roleIds]);
    return result.rows;
  }

  // ============================================
  // DEFAULT APP ROLES
  // ============================================

  async createDefaultAppRoles(appId, orgId) {
    const defaultRoles = [
      {
        name: 'app_admin',
        displayName: 'App Admin',
        description: 'Full access to the application',
        permissions: ['app:manage', 'app:configure', 'data:manage', 'users:manage']
      },
      {
        name: 'app_user',
        displayName: 'App User',
        description: 'Standard user access',
        permissions: ['app:access', 'data:read', 'data:write']
      },
      {
        name: 'app_viewer',
        displayName: 'App Viewer',
        description: 'Read-only access',
        permissions: ['app:access', 'data:read']
      }
    ];

    for (const role of defaultRoles) {
      await this.createAppRole(appId, orgId, { ...role, isSystem: true });
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = RoleService;
