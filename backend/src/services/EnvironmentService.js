/**
 * EnvironmentService
 *
 * Manages deployment environments (local, development, staging, production)
 */

const { v4: uuidv4 } = require('uuid');

class EnvironmentService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all environments
   */
  async getAll() {
    const result = await this.db.query(`
      SELECT
        id, name, type, description, host, port, base_url,
        config, resources, auto_scaling, env_vars,
        status, is_default, created_by, created_at, updated_at
      FROM k1.environments
      ORDER BY
        CASE type
          WHEN 'local' THEN 1
          WHEN 'development' THEN 2
          WHEN 'staging' THEN 3
          WHEN 'production' THEN 4
          ELSE 5
        END
    `);
    return result.rows;
  }

  /**
   * Get environment by ID
   */
  async getById(id) {
    const result = await this.db.query(
      'SELECT * FROM k1.environments WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get environment by type
   */
  async getByType(type) {
    const result = await this.db.query(
      'SELECT * FROM k1.environments WHERE type = $1',
      [type]
    );
    return result.rows;
  }

  /**
   * Get default environment
   */
  async getDefault() {
    const result = await this.db.query(
      'SELECT * FROM k1.environments WHERE is_default = true LIMIT 1'
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new environment
   */
  async create(environmentData) {
    const id = environmentData.id || `env-${uuidv4().slice(0, 8)}`;
    const {
      name,
      type,
      description = null,
      host = null,
      port = null,
      base_url = null,
      config = {},
      resources = { cpu: '1', memory: '512Mi', replicas: 1 },
      auto_scaling = { enabled: false, min_replicas: 1, max_replicas: 10, target_cpu_utilization: 70 },
      env_vars = {},
      created_by = null
    } = environmentData;

    // If setting as default, unset other defaults first
    if (environmentData.is_default) {
      await this.db.query(
        'UPDATE k1.environments SET is_default = false WHERE is_default = true'
      );
    }

    const result = await this.db.query(`
      INSERT INTO k1.environments (
        id, name, type, description, host, port, base_url,
        config, resources, auto_scaling, env_vars,
        is_default, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id, name, type, description, host, port, base_url,
      JSON.stringify(config),
      JSON.stringify(resources),
      JSON.stringify(auto_scaling),
      JSON.stringify(env_vars),
      environmentData.is_default || false,
      created_by
    ]);

    return result.rows[0];
  }

  /**
   * Update an environment
   */
  async update(id, updates) {
    const allowedFields = [
      'name', 'description', 'host', 'port', 'base_url',
      'config', 'resources', 'auto_scaling', 'env_vars',
      'status', 'is_default'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        // JSON fields need to be stringified
        const value = ['config', 'resources', 'auto_scaling', 'env_vars'].includes(field)
          ? JSON.stringify(updates[field])
          : updates[field];

        setClause.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      return this.getById(id);
    }

    // If setting as default, unset other defaults first
    if (updates.is_default) {
      await this.db.query(
        'UPDATE k1.environments SET is_default = false WHERE is_default = true AND id != $1',
        [id]
      );
    }

    values.push(id);
    const result = await this.db.query(`
      UPDATE k1.environments
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  /**
   * Delete an environment
   */
  async delete(id) {
    // Check for active deployments
    const deploymentsResult = await this.db.query(
      `SELECT COUNT(*) as count FROM k1.deployments
       WHERE environment_id = $1 AND status = 'completed'`,
      [id]
    );

    if (parseInt(deploymentsResult.rows[0].count) > 0) {
      throw new Error('Cannot delete environment with active deployments. Stop all deployments first.');
    }

    const result = await this.db.query(
      'DELETE FROM k1.environments WHERE id = $1 RETURNING *',
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Get environment statistics
   */
  async getStats(id) {
    const result = await this.db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as successful_deployments,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_deployments,
        COUNT(*) FILTER (WHERE status IN ('pending', 'building', 'deploying')) as pending_deployments,
        MAX(completed_at) as last_deployment_at
      FROM k1.deployments
      WHERE environment_id = $1
    `, [id]);

    return result.rows[0];
  }

  /**
   * Get active deployments for an environment
   */
  async getActiveDeployments(id) {
    const result = await this.db.query(`
      SELECT
        d.id, d.application_id, a.name as application_name,
        d.version, d.status, d.urls, d.runtime, d.started_at
      FROM k1.deployments d
      JOIN k1.applications a ON d.application_id = a.id
      WHERE d.environment_id = $1
      AND d.status = 'completed'
      AND d.id = (
        SELECT id FROM k1.deployments
        WHERE application_id = d.application_id
        AND environment_id = $1
        AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1
      )
    `, [id]);

    return result.rows;
  }

  /**
   * Validate environment configuration
   */
  validateConfig(type, config) {
    const errors = [];

    if (type === 'production') {
      if (!config.require_tests) {
        errors.push('Production environment should require tests');
      }
      if (!config.require_approval) {
        errors.push('Production environment should require approval');
      }
    }

    if (type === 'staging') {
      if (!config.require_tests) {
        errors.push('Staging environment should require tests');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate URL for an environment
   */
  generateUrl(environment, appSlug, port) {
    if (environment.type === 'local') {
      return `http://localhost:${port}`;
    }

    if (environment.base_url) {
      return `${environment.base_url}/${appSlug}`;
    }

    if (environment.host) {
      const protocol = environment.type === 'production' ? 'https' : 'http';
      const portSuffix = environment.port ? `:${environment.port}` : '';
      return `${protocol}://${appSlug}.${environment.host}${portSuffix}`;
    }

    return null;
  }
}

module.exports = EnvironmentService;
