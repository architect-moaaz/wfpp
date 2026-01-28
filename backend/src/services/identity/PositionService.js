const { v4: uuidv4 } = require('uuid');

class PositionService {
  constructor(db) {
    this.db = db;
  }

  // ============================================
  // POSITION CRUD
  // ============================================

  async createPosition(orgId, positionData) {
    const id = uuidv4();
    const {
      title,
      description = null,
      departmentId = null,
      parentPositionId = null,
      level = null,
      userId = null
    } = positionData;

    // Convert empty strings to null for foreign key fields
    const cleanUserId = userId || null;
    const cleanDepartmentId = departmentId || null;
    const cleanParentPositionId = parentPositionId || null;

    // Calculate level based on parent if not provided
    let calculatedLevel = level;
    if (cleanParentPositionId && level === null) {
      const parent = await this.getById(cleanParentPositionId);
      calculatedLevel = (parent?.level || 0) + 1;
    } else if (level === null) {
      calculatedLevel = 1; // Root level
    }

    const isVacant = !cleanUserId;

    const query = `
      INSERT INTO k1.positions (id, organization_id, title, description, department_id,
                             parent_position_id, level, user_id, is_vacant)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id, orgId, title, description || null, cleanDepartmentId,
      cleanParentPositionId, calculatedLevel, cleanUserId, isVacant
    ]);

    return result.rows[0];
  }

  async getById(positionId) {
    const query = `
      SELECT p.*, d.name as department_name, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
      FROM k1.positions p
      LEFT JOIN k1.departments d ON p.department_id = d.id
      LEFT JOIN k1.users u ON p.user_id = u.id
      WHERE p.id = $1 AND p.is_active = true
    `;
    const result = await this.db.query(query, [positionId]);
    return result.rows[0] || null;
  }

  async getByUserId(userId, orgId) {
    const query = `
      SELECT p.*, d.name as department_name
      FROM k1.positions p
      LEFT JOIN k1.departments d ON p.department_id = d.id
      WHERE p.user_id = $1 AND p.organization_id = $2 AND p.is_active = true
    `;
    const result = await this.db.query(query, [userId, orgId]);
    return result.rows[0] || null;
  }

  async update(positionId, updates) {
    const allowedFields = ['title', 'description', 'department_id', 'parent_position_id', 'level', 'user_id'];
    const foreignKeyFields = ['department_id', 'parent_position_id', 'user_id'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    // Normalize updates to snake_case and deduplicate
    const normalizedUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey)) {
        normalizedUpdates[dbKey] = value;
      }
    }

    for (const [dbKey, value] of Object.entries(normalizedUpdates)) {
      setClause.push(`${dbKey} = $${paramCount}`);
      // Convert empty strings to null for foreign key fields
      const cleanValue = foreignKeyFields.includes(dbKey) ? (value || null) : value;
      values.push(cleanValue);
      paramCount++;
    }

    // Update is_vacant based on user_id
    if (normalizedUpdates.user_id !== undefined) {
      setClause.push(`is_vacant = $${paramCount}`);
      values.push(!normalizedUpdates.user_id); // true if userId is empty/null
      paramCount++;
    }

    if (setClause.length === 0) return this.getById(positionId);

    setClause.push(`updated_at = NOW()`);
    values.push(positionId);

    const query = `
      UPDATE k1.positions SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async delete(positionId) {
    // Update children to have no parent
    await this.db.query(
      'UPDATE k1.positions SET parent_position_id = NULL WHERE parent_position_id = $1',
      [positionId]
    );

    // Soft delete
    const query = `
      UPDATE k1.positions SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;
    await this.db.query(query, [positionId]);
  }

  async assignUser(positionId, userId) {
    // First, unassign any previous position for this user in the same org
    const position = await this.getById(positionId);
    if (position && userId) {
      await this.db.query(
        `UPDATE k1.positions SET user_id = NULL, is_vacant = true
         WHERE organization_id = $1 AND user_id = $2 AND id != $3`,
        [position.organization_id, userId, positionId]
      );
    }

    return this.update(positionId, { userId });
  }

  async unassignUser(positionId) {
    return this.update(positionId, { userId: null });
  }

  // ============================================
  // ORG CHART QUERIES
  // ============================================

  async list(orgId, options = {}) {
    const { departmentId = null, includeVacant = true, flat = false } = options;

    let query = `
      SELECT p.*, d.name as department_name, d.color as department_color,
             u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
      FROM k1.positions p
      LEFT JOIN k1.departments d ON p.department_id = d.id
      LEFT JOIN k1.users u ON p.user_id = u.id
      WHERE p.organization_id = $1 AND p.is_active = true
    `;
    const values = [orgId];
    let paramCount = 2;

    if (departmentId) {
      query += ` AND p.department_id = $${paramCount}`;
      values.push(departmentId);
      paramCount++;
    }

    if (!includeVacant) {
      query += ' AND p.is_vacant = false';
    }

    query += ' ORDER BY p.level, p.title';

    const result = await this.db.query(query, values);

    if (flat) {
      return result.rows;
    }

    // Build hierarchical structure for org chart
    return this.buildOrgChart(result.rows);
  }

  buildOrgChart(positions) {
    const positionMap = new Map();
    const roots = [];

    // First pass: create map
    for (const position of positions) {
      positionMap.set(position.id, { ...position, children: [], directReports: [] });
    }

    // Second pass: build tree
    for (const position of positions) {
      const node = positionMap.get(position.id);
      if (position.parent_position_id && positionMap.has(position.parent_position_id)) {
        const parent = positionMap.get(position.parent_position_id);
        parent.children.push(node);
        parent.directReports.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getDirectReports(positionId) {
    const query = `
      SELECT p.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
      FROM k1.positions p
      LEFT JOIN k1.users u ON p.user_id = u.id
      WHERE p.parent_position_id = $1 AND p.is_active = true
      ORDER BY p.title
    `;
    const result = await this.db.query(query, [positionId]);
    return result.rows;
  }

  async getReportingChain(positionId) {
    // Get all ancestors up to root
    const query = `
      WITH RECURSIVE chain AS (
        SELECT *, 0 as depth FROM k1.positions WHERE id = $1
        UNION ALL
        SELECT p.*, c.depth + 1 FROM k1.positions p
        JOIN chain c ON p.id = c.parent_position_id
        WHERE p.is_active = true
      )
      SELECT c.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
      FROM chain c
      LEFT JOIN k1.users u ON c.user_id = u.id
      ORDER BY c.depth DESC
    `;
    const result = await this.db.query(query, [positionId]);
    return result.rows;
  }

  async getAllDescendants(positionId) {
    const query = `
      WITH RECURSIVE descendants AS (
        SELECT * FROM k1.positions WHERE parent_position_id = $1 AND is_active = true
        UNION ALL
        SELECT p.* FROM k1.positions p
        JOIN descendants d ON p.parent_position_id = d.id
        WHERE p.is_active = true
      )
      SELECT d.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
      FROM descendants d
      LEFT JOIN k1.users u ON d.user_id = u.id
      ORDER BY d.level, d.title
    `;
    const result = await this.db.query(query, [positionId]);
    return result.rows;
  }

  // ============================================
  // MANAGER QUERIES (for workflow assignment)
  // ============================================

  async getManager(userId, orgId) {
    const query = `
      SELECT manager_p.*, manager_u.id as manager_user_id, manager_u.name as manager_name,
             manager_u.email as manager_email, manager_u.avatar_url as manager_avatar
      FROM k1.positions p
      JOIN k1.positions manager_p ON p.parent_position_id = manager_p.id
      LEFT JOIN k1.users manager_u ON manager_p.user_id = manager_u.id
      WHERE p.user_id = $1 AND p.organization_id = $2
        AND p.is_active = true AND manager_p.is_active = true
    `;
    const result = await this.db.query(query, [userId, orgId]);
    return result.rows[0] || null;
  }

  async getSkipLevelManager(userId, orgId) {
    // Manager's manager
    const query = `
      WITH user_chain AS (
        SELECT p.id, p.parent_position_id, 0 as depth
        FROM k1.positions p WHERE p.user_id = $1 AND p.organization_id = $2 AND p.is_active = true
        UNION ALL
        SELECT p.id, p.parent_position_id, uc.depth + 1
        FROM k1.positions p
        JOIN user_chain uc ON p.id = uc.parent_position_id
        WHERE p.is_active = true AND uc.depth < 2
      )
      SELECT p.*, u.id as manager_user_id, u.name as manager_name,
             u.email as manager_email, u.avatar_url as manager_avatar
      FROM user_chain uc
      JOIN k1.positions p ON uc.id = p.id
      LEFT JOIN k1.users u ON p.user_id = u.id
      WHERE uc.depth = 2
    `;
    const result = await this.db.query(query, [userId, orgId]);
    return result.rows[0] || null;
  }

  async getUserDirectReports(userId, orgId) {
    const query = `
      SELECT p.*, u.id as user_id, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
      FROM k1.positions manager_p
      JOIN k1.positions p ON p.parent_position_id = manager_p.id
      LEFT JOIN k1.users u ON p.user_id = u.id
      WHERE manager_p.user_id = $1 AND manager_p.organization_id = $2
        AND p.is_active = true AND manager_p.is_active = true
    `;
    const result = await this.db.query(query, [userId, orgId]);
    return result.rows;
  }

  // ============================================
  // DEPARTMENT HEAD QUERIES
  // ============================================

  async getDepartmentHead(userId, orgId) {
    const query = `
      SELECT head_p.*, head_u.id as head_user_id, head_u.name as head_name,
             head_u.email as head_email, head_u.avatar_url as head_avatar
      FROM k1.positions p
      JOIN k1.departments d ON p.department_id = d.id
      JOIN k1.positions head_p ON d.head_position_id = head_p.id
      LEFT JOIN k1.users head_u ON head_p.user_id = head_u.id
      WHERE p.user_id = $1 AND p.organization_id = $2
        AND p.is_active = true AND head_p.is_active = true
    `;
    const result = await this.db.query(query, [userId, orgId]);
    return result.rows[0] || null;
  }

  // ============================================
  // MOVE POSITION IN ORG CHART
  // ============================================

  async movePosition(positionId, newParentId) {
    // Validate that we're not creating a cycle
    if (newParentId) {
      const descendants = await this.getAllDescendants(positionId);
      const descendantIds = descendants.map(d => d.id);
      if (descendantIds.includes(newParentId)) {
        throw new Error('Cannot move position under its own descendant');
      }
    }

    // Calculate new level
    let newLevel = 1;
    if (newParentId) {
      const newParent = await this.getById(newParentId);
      newLevel = (newParent?.level || 0) + 1;
    }

    // Update the position
    await this.update(positionId, {
      parentPositionId: newParentId,
      level: newLevel
    });

    // Update levels of all descendants
    await this.recalculateDescendantLevels(positionId, newLevel);

    return this.getById(positionId);
  }

  async recalculateDescendantLevels(positionId, parentLevel) {
    const children = await this.getDirectReports(positionId);
    for (const child of children) {
      const newLevel = parentLevel + 1;
      await this.db.query(
        'UPDATE k1.positions SET level = $1, updated_at = NOW() WHERE id = $2',
        [newLevel, child.id]
      );
      await this.recalculateDescendantLevels(child.id, newLevel);
    }
  }

  // ============================================
  // STATS
  // ============================================

  async getStats(orgId) {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_vacant = true) as vacant,
        COUNT(*) FILTER (WHERE is_vacant = false) as filled,
        COUNT(DISTINCT department_id) as departments
      FROM k1.positions
      WHERE organization_id = $1 AND is_active = true
    `;
    const result = await this.db.query(query, [orgId]);
    return result.rows[0];
  }

  // ============================================
  // HELPERS
  // ============================================

  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = PositionService;
