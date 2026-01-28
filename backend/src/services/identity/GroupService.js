const { v4: uuidv4 } = require('uuid');

class GroupService {
  constructor(db) {
    this.db = db;
  }

  // ============================================
  // GROUP CRUD
  // ============================================

  async createGroup(orgId, groupData) {
    const id = uuidv4();
    const {
      name,
      description = null,
      type = 'custom'
    } = groupData;

    const query = `
      INSERT INTO k1.groups (id, organization_id, name, description, type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.db.query(query, [id, orgId, name, description, type]);
    return result.rows[0];
  }

  async getById(groupId) {
    const query = 'SELECT * FROM k1.groups WHERE id = $1 AND is_active = true';
    const result = await this.db.query(query, [groupId]);
    return result.rows[0] || null;
  }

  async getByName(orgId, name) {
    const query = 'SELECT * FROM k1.groups WHERE organization_id = $1 AND name = $2 AND is_active = true';
    const result = await this.db.query(query, [orgId, name]);
    return result.rows[0] || null;
  }

  async update(groupId, updates) {
    const allowedFields = ['name', 'description', 'type'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (setClause.length === 0) return this.getById(groupId);

    setClause.push(`updated_at = NOW()`);
    values.push(groupId);

    const query = `
      UPDATE k1.groups SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async delete(groupId) {
    // Remove all members first
    await this.db.query('DELETE FROM k1.group_members WHERE group_id = $1', [groupId]);

    // Soft delete the group
    const query = `
      UPDATE k1.groups SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;
    await this.db.query(query, [groupId]);
  }

  async list(orgId, options = {}) {
    const { type = null, search = null, limit = 100, offset = 0 } = options;

    let query = 'SELECT g.*, COUNT(gm.user_id) as member_count FROM k1.groups g LEFT JOIN k1.group_members gm ON g.id = gm.group_id WHERE g.organization_id = $1 AND g.is_active = true';
    const values = [orgId];
    let paramCount = 2;

    if (type) {
      query += ` AND g.type = $${paramCount}`;
      values.push(type);
      paramCount++;
    }

    if (search) {
      query += ` AND (g.name ILIKE $${paramCount} OR g.description ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }

    query += ` GROUP BY g.id ORDER BY g.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return result.rows;
  }

  // ============================================
  // MEMBERSHIP
  // ============================================

  async addMember(groupId, userId, role = 'member', addedBy = null) {
    const query = `
      INSERT INTO k1.group_members (group_id, user_id, role, added_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (group_id, user_id) DO UPDATE SET role = $3
      RETURNING *
    `;
    const result = await this.db.query(query, [groupId, userId, role, addedBy]);
    return result.rows[0];
  }

  async removeMember(groupId, userId) {
    const query = 'DELETE FROM k1.group_members WHERE group_id = $1 AND user_id = $2';
    await this.db.query(query, [groupId, userId]);
  }

  async updateMemberRole(groupId, userId, role) {
    const query = `
      UPDATE group_members SET role = $3
      WHERE group_id = $1 AND user_id = $2
      RETURNING *
    `;
    const result = await this.db.query(query, [groupId, userId, role]);
    return result.rows[0];
  }

  async getMembers(groupId, options = {}) {
    const { role = null, limit = 100, offset = 0 } = options;

    let query = `
      SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.avatar_url,
             gm.role, gm.added_at
      FROM k1.users u
      JOIN k1.group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = $1 AND u.is_active = true
    `;
    const values = [groupId];
    let paramCount = 2;

    if (role) {
      query += ` AND gm.role = $${paramCount}`;
      values.push(role);
      paramCount++;
    }

    query += ` ORDER BY u.name LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await this.db.query(query, values);
    return result.rows;
  }

  async getMemberCount(groupId) {
    const query = 'SELECT COUNT(*) FROM k1.group_members WHERE group_id = $1';
    const result = await this.db.query(query, [groupId]);
    return parseInt(result.rows[0].count, 10);
  }

  async isMember(groupId, userId) {
    const query = 'SELECT 1 FROM k1.group_members WHERE group_id = $1 AND user_id = $2';
    const result = await this.db.query(query, [groupId, userId]);
    return result.rows.length > 0;
  }

  async getMemberRole(groupId, userId) {
    const query = 'SELECT role FROM k1.group_members WHERE group_id = $1 AND user_id = $2';
    const result = await this.db.query(query, [groupId, userId]);
    return result.rows[0]?.role || null;
  }

  // ============================================
  // USER'S GROUPS
  // ============================================

  async getUserGroups(userId, orgId) {
    const query = `
      SELECT g.*, gm.role as member_role
      FROM k1.groups g
      JOIN k1.group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = $1 AND g.organization_id = $2 AND g.is_active = true
      ORDER BY g.name
    `;
    const result = await this.db.query(query, [userId, orgId]);
    return result.rows;
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async addMembers(groupId, userIds, addedBy = null) {
    if (!userIds.length) return;

    const values = userIds.map((userId, idx) => {
      const base = idx * 4;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    }).join(', ');

    const params = userIds.flatMap(userId => [groupId, userId, 'member', addedBy]);

    const query = `
      INSERT INTO k1.group_members (group_id, user_id, role, added_by)
      VALUES ${values}
      ON CONFLICT (group_id, user_id) DO NOTHING
    `;

    await this.db.query(query, params);
  }

  async removeMembers(groupId, userIds) {
    if (!userIds.length) return;

    const query = `
      DELETE FROM k1.group_members
      WHERE group_id = $1 AND user_id = ANY($2)
    `;
    await this.db.query(query, [groupId, userIds]);
  }

  async setMembers(groupId, userIds, addedBy = null) {
    // Remove all current members
    await this.db.query('DELETE FROM k1.group_members WHERE group_id = $1', [groupId]);

    // Add new members
    if (userIds.length > 0) {
      await this.addMembers(groupId, userIds, addedBy);
    }
  }

  // ============================================
  // GROUP WITH DETAILS
  // ============================================

  async getWithDetails(groupId) {
    const group = await this.getById(groupId);
    if (!group) return null;

    const members = await this.getMembers(groupId);

    return {
      ...group,
      members,
      memberCount: members.length
    };
  }
}

module.exports = GroupService;
