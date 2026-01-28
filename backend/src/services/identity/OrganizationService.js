const { v4: uuidv4 } = require('uuid');

class OrganizationService {
  constructor(db) {
    this.db = db;
  }

  // ============================================
  // ORGANIZATION CRUD
  // ============================================

  async createOrganization(orgData, creatorUserId) {
    const id = uuidv4();
    const {
      name,
      slug,
      description = null,
      logoUrl = null,
      industry = null,
      website = null,
      settings = {},
      authProviders = ['local']
    } = orgData;

    // Validate slug uniqueness
    const existing = await this.getBySlug(slug);
    if (existing) {
      throw new Error(`Organization with slug '${slug}' already exists`);
    }

    const query = `
      INSERT INTO k1.organizations (id, name, slug, description, logo_url, industry, website, settings, auth_providers)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id, name, slug, description, logoUrl, industry, website,
      JSON.stringify(settings),
      JSON.stringify(authProviders)
    ]);

    const org = result.rows[0];

    // Add creator as org admin
    if (creatorUserId) {
      await this.addMember(org.id, creatorUserId, 'active');

      // Create default system roles and assign admin to creator
      await this.createDefaultRoles(org.id);
      const adminRole = await this.getOrgRoleByName(org.id, 'org_admin');
      if (adminRole) {
        await this.db.query(
          `INSERT INTO k1.user_org_roles (user_id, org_role_id, organization_id) VALUES ($1, $2, $3)`,
          [creatorUserId, adminRole.id, org.id]
        );
      }
    }

    return org;
  }

  async getById(orgId) {
    const query = 'SELECT * FROM k1.organizations WHERE id = $1 AND is_active = true';
    const result = await this.db.query(query, [orgId]);
    return result.rows[0] || null;
  }

  async getBySlug(slug) {
    const query = 'SELECT * FROM k1.organizations WHERE slug = $1 AND is_active = true';
    const result = await this.db.query(query, [slug.toLowerCase()]);
    return result.rows[0] || null;
  }

  async update(orgId, updates) {
    const allowedFields = ['name', 'description', 'logo_url', 'industry', 'website', 'settings', 'auth_providers'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey)) {
        const val = (dbKey === 'settings' || dbKey === 'auth_providers')
          ? JSON.stringify(value)
          : value;
        setClause.push(`${dbKey} = $${paramCount}`);
        values.push(val);
        paramCount++;
      }
    }

    if (setClause.length === 0) return this.getById(orgId);

    setClause.push(`updated_at = NOW()`);
    values.push(orgId);

    const query = `
      UPDATE k1.organizations SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async deactivate(orgId) {
    const query = `
      UPDATE k1.organizations SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;
    await this.db.query(query, [orgId]);
  }

  async list(options = {}) {
    const { limit = 50, offset = 0, search = null } = options;

    let query = 'SELECT * FROM k1.organizations WHERE is_active = true';
    const values = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR slug ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return result.rows;
  }

  // ============================================
  // MEMBERSHIP MANAGEMENT
  // ============================================

  async addMember(orgId, userId, status = 'active', invitedBy = null) {
    const query = `
      INSERT INTO k1.organization_memberships (organization_id, user_id, status, invited_by, invited_at, joined_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, organization_id) DO UPDATE SET status = $3, updated_at = NOW()
      RETURNING *
    `;
    const invitedAt = invitedBy ? new Date() : null;
    const joinedAt = status === 'active' ? new Date() : null;

    const result = await this.db.query(query, [orgId, userId, status, invitedBy, invitedAt, joinedAt]);
    return result.rows[0];
  }

  async removeMember(orgId, userId) {
    const query = `
      DELETE FROM k1.organization_memberships
      WHERE organization_id = $1 AND user_id = $2
    `;
    await this.db.query(query, [orgId, userId]);

    // Also remove any org roles
    await this.db.query(
      `DELETE FROM k1.user_org_roles WHERE organization_id = $1 AND user_id = $2`,
      [orgId, userId]
    );
  }

  async updateMemberStatus(orgId, userId, status) {
    const query = `
      UPDATE organization_memberships
      SET status = $3, joined_at = CASE WHEN $3 = 'active' THEN NOW() ELSE joined_at END, updated_at = NOW()
      WHERE organization_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.db.query(query, [orgId, userId, status]);
    return result.rows[0];
  }

  async getMembership(orgId, userId) {
    const query = `
      SELECT om.*, u.email, u.name, u.avatar_url
      FROM k1.organization_memberships om
      JOIN k1.users u ON om.user_id = u.id
      WHERE om.organization_id = $1 AND om.user_id = $2
    `;
    const result = await this.db.query(query, [orgId, userId]);
    return result.rows[0] || null;
  }

  async isMember(orgId, userId) {
    const membership = await this.getMembership(orgId, userId);
    return membership?.status === 'active';
  }

  // ============================================
  // INVITATION MANAGEMENT
  // ============================================

  async createInvitation(orgId, email, invitedBy, roleId = null) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const query = `
      INSERT INTO invitations (organization_id, email, invited_by, org_role_id, token, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.db.query(query, [orgId, email.toLowerCase(), invitedBy, roleId, token, expiresAt]);
    return result.rows[0];
  }

  async getInvitationByToken(token) {
    const query = `
      SELECT i.*, o.name as organization_name, o.slug as organization_slug
      FROM invitations i
      JOIN k1.organizations o ON i.organization_id = o.id
      WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()
    `;
    const result = await this.db.query(query, [token]);
    return result.rows[0] || null;
  }

  async acceptInvitation(token, userId) {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Update invitation status
    await this.db.query(
      `UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [invitation.id]
    );

    // Add member
    await this.addMember(invitation.organization_id, userId, 'active', invitation.invited_by);

    // Assign role if specified
    if (invitation.org_role_id) {
      await this.db.query(
        `INSERT INTO k1.user_org_roles (user_id, org_role_id, organization_id, assigned_by)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [userId, invitation.org_role_id, invitation.organization_id, invitation.invited_by]
      );
    }

    return invitation;
  }

  async getPendingInvitations(orgId) {
    const query = `
      SELECT i.*, u.name as invited_by_name
      FROM invitations i
      LEFT JOIN k1.users u ON i.invited_by = u.id
      WHERE i.organization_id = $1 AND i.status = 'pending' AND i.expires_at > NOW()
      ORDER BY i.created_at DESC
    `;
    const result = await this.db.query(query, [orgId]);
    return result.rows;
  }

  async cancelInvitation(invitationId) {
    const query = `UPDATE invitations SET status = 'cancelled' WHERE id = $1`;
    await this.db.query(query, [invitationId]);
  }

  // ============================================
  // DEFAULT ROLES
  // ============================================

  async createDefaultRoles(orgId) {
    const defaultRoles = [
      {
        name: 'org_admin',
        displayName: 'Organization Admin',
        description: 'Full administrative access to the organization',
        isSystem: true,
        level: 0,
        permissions: ['org:manage', 'users:manage', 'roles:manage', 'apps:manage', 'billing:manage']
      },
      {
        name: 'org_manager',
        displayName: 'Organization Manager',
        description: 'Can manage users and apps but not billing or org settings',
        isSystem: true,
        level: 1,
        permissions: ['users:manage', 'apps:manage', 'apps:create']
      },
      {
        name: 'org_member',
        displayName: 'Organization Member',
        description: 'Standard member with access to assigned apps',
        isSystem: true,
        level: 2,
        isDefault: true,
        permissions: ['apps:access', 'profile:manage']
      },
      {
        name: 'org_viewer',
        displayName: 'Organization Viewer',
        description: 'Read-only access',
        isSystem: true,
        level: 3,
        permissions: ['apps:view', 'profile:view']
      }
    ];

    for (const role of defaultRoles) {
      await this.db.query(
        `INSERT INTO k1.org_roles (organization_id, name, display_name, description, is_system, level, is_default, permissions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (organization_id, name) DO NOTHING`,
        [orgId, role.name, role.displayName, role.description, role.isSystem, role.level, role.isDefault || false, JSON.stringify(role.permissions)]
      );
    }
  }

  async getOrgRoleByName(orgId, roleName) {
    const query = 'SELECT * FROM k1.org_roles WHERE organization_id = $1 AND name = $2';
    const result = await this.db.query(query, [orgId, roleName]);
    return result.rows[0] || null;
  }

  // ============================================
  // ORGANIZATION STATS
  // ============================================

  async getStats(orgId) {
    const queries = await Promise.all([
      this.db.query(
        `SELECT COUNT(*) FROM k1.organization_memberships WHERE organization_id = $1 AND status = 'active'`,
        [orgId]
      ),
      this.db.query(
        `SELECT COUNT(*) FROM k1.departments WHERE organization_id = $1 AND is_active = true`,
        [orgId]
      ),
      this.db.query(
        `SELECT COUNT(*) FROM k1.positions WHERE organization_id = $1 AND is_active = true`,
        [orgId]
      ),
      this.db.query(
        `SELECT COUNT(*) FROM k1.groups WHERE organization_id = $1 AND is_active = true`,
        [orgId]
      ),
      this.db.query(
        `SELECT COUNT(*) FROM applications WHERE organization_id = $1`,
        [orgId]
      ).catch(() => ({ rows: [{ count: 0 }] })) // In case applications table doesn't have org_id yet
    ]);

    return {
      memberCount: parseInt(queries[0].rows[0].count, 10),
      departmentCount: parseInt(queries[1].rows[0].count, 10),
      positionCount: parseInt(queries[2].rows[0].count, 10),
      groupCount: parseInt(queries[3].rows[0].count, 10),
      appCount: parseInt(queries[4].rows[0].count, 10)
    };
  }

  // ============================================
  // AUTH PROVIDERS
  // ============================================

  async updateAuthProviders(orgId, providers) {
    const query = `
      UPDATE k1.organizations SET auth_providers = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [orgId, JSON.stringify(providers)]);
    return result.rows[0];
  }

  async getAuthProviders(orgId) {
    const org = await this.getById(orgId);
    return org?.auth_providers || ['local'];
  }

  // ============================================
  // HELPERS
  // ============================================

  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

module.exports = OrganizationService;
