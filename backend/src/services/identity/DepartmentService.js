const { v4: uuidv4 } = require('uuid');

class DepartmentService {
  constructor(db) {
    this.db = db;
  }

  // ============================================
  // DEPARTMENT CRUD
  // ============================================

  async createDepartment(orgId, deptData) {
    const id = uuidv4();
    const {
      name,
      description = null,
      code = null,
      parentDepartmentId = null,
      headPositionId = null,
      color = null
    } = deptData;

    // Generate code if not provided
    const deptCode = code || this.generateCode(name);

    // Convert empty strings to null for UUID fields
    const parentId = parentDepartmentId || null;
    const headId = headPositionId || null;

    const query = `
      INSERT INTO k1.departments (id, organization_id, name, description, code,
                               parent_department_id, head_position_id, color)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id, orgId, name, description, deptCode,
      parentId, headId, color
    ]);

    return result.rows[0];
  }

  async getById(deptId) {
    const query = `
      SELECT d.*,
             pd.name as parent_department_name,
             p.title as head_position_title,
             u.name as head_name, u.email as head_email, u.avatar_url as head_avatar
      FROM k1.departments d
      LEFT JOIN k1.departments pd ON d.parent_department_id = pd.id
      LEFT JOIN k1.positions p ON d.head_position_id = p.id
      LEFT JOIN k1.users u ON p.user_id = u.id
      WHERE d.id = $1 AND d.is_active = true
    `;
    const result = await this.db.query(query, [deptId]);
    return result.rows[0] || null;
  }

  async getByCode(orgId, code) {
    const query = `
      SELECT * FROM k1.departments
      WHERE organization_id = $1 AND code = $2 AND is_active = true
    `;
    const result = await this.db.query(query, [orgId, code.toUpperCase()]);
    return result.rows[0] || null;
  }

  async update(deptId, updates) {
    const allowedFields = ['name', 'description', 'code', 'parent_department_id', 'head_position_id', 'color'];
    const uuidFields = ['parent_department_id', 'head_position_id'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = this.toSnakeCase(key);
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = $${paramCount}`);
        // Convert empty strings to null for UUID fields
        const sanitizedValue = uuidFields.includes(dbKey) && value === '' ? null : value;
        values.push(sanitizedValue);
        paramCount++;
      }
    }

    if (setClause.length === 0) return this.getById(deptId);

    setClause.push(`updated_at = NOW()`);
    values.push(deptId);

    const query = `
      UPDATE k1.departments SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async delete(deptId) {
    // Update child departments to have no parent
    await this.db.query(
      'UPDATE k1.departments SET parent_department_id = NULL WHERE parent_department_id = $1',
      [deptId]
    );

    // Update positions to have no department
    await this.db.query(
      'UPDATE k1.positions SET department_id = NULL WHERE department_id = $1',
      [deptId]
    );

    // Soft delete
    const query = `
      UPDATE k1.departments SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `;
    await this.db.query(query, [deptId]);
  }

  // ============================================
  // LIST & HIERARCHY
  // ============================================

  async list(orgId, options = {}) {
    const { flat = false, includeStats = false } = options;

    let query = `
      SELECT d.*,
             pd.name as parent_department_name,
             p.title as head_position_title,
             u.name as head_name, u.email as head_email, u.avatar_url as head_avatar
    `;

    if (includeStats) {
      query += `,
             (SELECT COUNT(*) FROM k1.positions WHERE department_id = d.id AND is_active = true) as position_count,
             (SELECT COUNT(*) FROM k1.positions WHERE department_id = d.id AND is_active = true AND is_vacant = false) as filled_count
      `;
    }

    query += `
      FROM k1.departments d
      LEFT JOIN k1.departments pd ON d.parent_department_id = pd.id
      LEFT JOIN k1.positions p ON d.head_position_id = p.id
      LEFT JOIN k1.users u ON p.user_id = u.id
      WHERE d.organization_id = $1 AND d.is_active = true
      ORDER BY d.name
    `;

    const result = await this.db.query(query, [orgId]);

    if (flat) {
      return result.rows;
    }

    return this.buildHierarchy(result.rows);
  }

  buildHierarchy(departments) {
    const deptMap = new Map();
    const roots = [];

    // First pass: create map
    for (const dept of departments) {
      deptMap.set(dept.id, { ...dept, children: [] });
    }

    // Second pass: build tree
    for (const dept of departments) {
      const node = deptMap.get(dept.id);
      if (dept.parent_department_id && deptMap.has(dept.parent_department_id)) {
        deptMap.get(dept.parent_department_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getSubdepartments(deptId) {
    const query = `
      WITH RECURSIVE subdepts AS (
        SELECT * FROM k1.departments WHERE parent_department_id = $1 AND is_active = true
        UNION ALL
        SELECT d.* FROM k1.departments d
        JOIN subdepts s ON d.parent_department_id = s.id
        WHERE d.is_active = true
      )
      SELECT * FROM subdepts ORDER BY name
    `;
    const result = await this.db.query(query, [deptId]);
    return result.rows;
  }

  async getAncestors(deptId) {
    const query = `
      WITH RECURSIVE ancestors AS (
        SELECT *, 0 as depth FROM k1.departments WHERE id = $1
        UNION ALL
        SELECT d.*, a.depth + 1 FROM k1.departments d
        JOIN ancestors a ON d.id = a.parent_department_id
        WHERE d.is_active = true
      )
      SELECT * FROM ancestors WHERE id != $1 ORDER BY depth DESC
    `;
    const result = await this.db.query(query, [deptId]);
    return result.rows;
  }

  // ============================================
  // DEPARTMENT MEMBERS
  // ============================================

  async getMembers(deptId, options = {}) {
    const { includeSubdepts = false, limit = 100, offset = 0 } = options;

    let query;
    const values = [deptId];

    if (includeSubdepts) {
      query = `
        WITH RECURSIVE dept_tree AS (
          SELECT id FROM k1.departments WHERE id = $1
          UNION ALL
          SELECT d.id FROM k1.departments d
          JOIN dept_tree dt ON d.parent_department_id = dt.id
          WHERE d.is_active = true
        )
        SELECT DISTINCT u.id, u.email, u.name, u.first_name, u.last_name, u.avatar_url,
               p.title as position_title, d.name as department_name
        FROM k1.users u
        JOIN k1.positions p ON u.id = p.user_id
        JOIN k1.departments d ON p.department_id = d.id
        WHERE p.department_id IN (SELECT id FROM dept_tree)
          AND p.is_active = true AND u.is_active = true
        ORDER BY u.name
        LIMIT $2 OFFSET $3
      `;
      values.push(limit, offset);
    } else {
      query = `
        SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.avatar_url,
               p.title as position_title
        FROM k1.users u
        JOIN k1.positions p ON u.id = p.user_id
        WHERE p.department_id = $1 AND p.is_active = true AND u.is_active = true
        ORDER BY u.name
        LIMIT $2 OFFSET $3
      `;
      values.push(limit, offset);
    }

    const result = await this.db.query(query, values);
    return result.rows;
  }

  async getMemberCount(deptId, includeSubdepts = false) {
    let query;

    if (includeSubdepts) {
      query = `
        WITH RECURSIVE dept_tree AS (
          SELECT id FROM k1.departments WHERE id = $1
          UNION ALL
          SELECT d.id FROM k1.departments d
          JOIN dept_tree dt ON d.parent_department_id = dt.id
          WHERE d.is_active = true
        )
        SELECT COUNT(DISTINCT p.user_id)
        FROM k1.positions p
        WHERE p.department_id IN (SELECT id FROM dept_tree)
          AND p.is_active = true AND p.user_id IS NOT NULL
      `;
    } else {
      query = `
        SELECT COUNT(*)
        FROM k1.positions
        WHERE department_id = $1 AND is_active = true AND user_id IS NOT NULL
      `;
    }

    const result = await this.db.query(query, [deptId]);
    return parseInt(result.rows[0].count, 10);
  }

  // ============================================
  // DEPARTMENT HEAD
  // ============================================

  async setHead(deptId, positionId) {
    const query = `
      UPDATE k1.departments SET head_position_id = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [deptId, positionId]);
    return result.rows[0];
  }

  async getHead(deptId) {
    const query = `
      SELECT p.*, u.name as user_name, u.email as user_email, u.avatar_url as user_avatar
      FROM k1.departments d
      JOIN k1.positions p ON d.head_position_id = p.id
      LEFT JOIN k1.users u ON p.user_id = u.id
      WHERE d.id = $1 AND p.is_active = true
    `;
    const result = await this.db.query(query, [deptId]);
    return result.rows[0] || null;
  }

  // ============================================
  // MOVE DEPARTMENT
  // ============================================

  async moveDepartment(deptId, newParentId) {
    // Validate that we're not creating a cycle
    if (newParentId) {
      const subdepts = await this.getSubdepartments(deptId);
      const subdeptIds = subdepts.map(s => s.id);
      if (subdeptIds.includes(newParentId)) {
        throw new Error('Cannot move department under its own subdepartment');
      }
    }

    return this.update(deptId, { parentDepartmentId: newParentId });
  }

  // ============================================
  // STATS
  // ============================================

  async getStats(deptId) {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM k1.positions WHERE department_id = $1 AND is_active = true) as position_count,
        (SELECT COUNT(*) FROM k1.positions WHERE department_id = $1 AND is_active = true AND is_vacant = false) as filled_count,
        (SELECT COUNT(*) FROM k1.positions WHERE department_id = $1 AND is_active = true AND is_vacant = true) as vacant_count,
        (SELECT COUNT(*) FROM k1.departments WHERE parent_department_id = $1 AND is_active = true) as subdepartment_count
    `;
    const result = await this.db.query(query, [deptId]);
    return result.rows[0];
  }

  // ============================================
  // HELPERS
  // ============================================

  generateCode(name) {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 5);
  }

  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

module.exports = DepartmentService;
