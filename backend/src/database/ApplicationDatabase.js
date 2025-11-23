/**
 * Application Database
 * Manages application definitions and metadata using PostgreSQL (k1 schema)
 */

const db = require('../config/database');

class ApplicationDatabase {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize database (verify connection)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Test the connection
      await db.query('SELECT 1');
      this.initialized = true;
      console.log('[ApplicationDatabase] PostgreSQL initialized successfully');
    } catch (error) {
      console.error('[ApplicationDatabase] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load all applications with their resources
   */
  async loadApplications() {
    await this.initialize();

    try {
      const result = await db.query(`
        SELECT
          a.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', w.id,
                'name', w.name,
                'description', w.description,
                'version', w.version,
                'nodes', w.nodes,
                'edges', w.edges,
                'connections', w.connections,
                'metadata', w.metadata,
                'is_active', w.is_active,
                'created_at', w.created_at,
                'updated_at', w.updated_at
              )
            ) FILTER (WHERE w.id IS NOT NULL),
            '[]'
          ) as workflows,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', f.id,
                'name', f.name,
                'description', f.description,
                'fields', f.fields,
                'layout', f.layout,
                'validation', f.validation,
                'data_model_id', f.data_model_id,
                'config', f.config,
                'styling', f.styling,
                'metadata', f.metadata
              )
            ) FILTER (WHERE f.id IS NOT NULL),
            '[]'
          ) as forms,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', dm.id,
                'name', dm.name,
                'description', dm.description,
                'fields', dm.fields,
                'relationships', dm.relationships,
                'indexes', dm.indexes,
                'constraints', dm.constraints,
                'config', dm.config,
                'metadata', dm.metadata
              )
            ) FILTER (WHERE dm.id IS NOT NULL),
            '[]'
          ) as data_models,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'title', p.title,
                'description', p.description,
                'route', p.route,
                'components', p.components,
                'layout', p.layout,
                'forms', p.forms,
                'workflows', p.workflows,
                'data_sources', p.data_sources,
                'config', p.config,
                'styling', p.styling,
                'metadata', p.metadata
              )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'
          ) as pages,
          row_to_json(m.*) as mobile_ui
        FROM k1.applications a
        LEFT JOIN k1.workflows w ON a.id = w.application_id
        LEFT JOIN k1.forms f ON a.id = f.application_id
        LEFT JOIN k1.data_models dm ON a.id = dm.application_id
        LEFT JOIN k1.pages p ON a.id = p.application_id
        LEFT JOIN k1.mobile_ui m ON a.id = m.application_id
        GROUP BY a.id, m.id
        ORDER BY a.created_at DESC
      `);

      // Format the results
      const applications = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        domain: row.domain,
        industry: row.industry,
        version: row.version,
        status: row.status,
        icon: row.icon,
        theme: row.theme,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resources: {
          workflows: row.workflows,
          forms: row.forms,
          dataModels: row.data_models,
          pages: row.pages,
          mobileUI: row.mobile_ui
        },
        metadata: row.metadata
      }));

      return applications;
    } catch (error) {
      console.error('[ApplicationDatabase] Failed to load applications:', error);
      return [];
    }
  }

  /**
   * Create a new application
   */
  async create(application) {
    await this.initialize();

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      const appId = application.id || `app_${Date.now()}`;
      const createdAt = application.createdAt || new Date().toISOString();

      // Insert application
      await client.query(`
        INSERT INTO k1.applications (
          id, name, description, type, domain, industry, version, status, icon,
          theme, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        appId,
        application.name,
        application.description || '',
        application.type || 'Business Application',
        application.domain || null,
        application.industry || null,
        application.version || '1.0.0',
        application.status || 'development',
        application.icon || null,
        JSON.stringify(application.theme || {}),
        JSON.stringify(application.metadata || {}),
        createdAt,
        new Date().toISOString()
      ]);

      // Insert resources if provided
      const resources = application.resources || {};

      // Insert workflows
      if (resources.workflows && resources.workflows.length > 0) {
        for (const workflow of resources.workflows) {
          await this.insertWorkflow(client, appId, workflow);
        }
      }

      // Insert forms
      if (resources.forms && resources.forms.length > 0) {
        for (const form of resources.forms) {
          await this.insertForm(client, appId, form);
        }
      }

      // Insert data models
      if (resources.dataModels && resources.dataModels.length > 0) {
        for (const model of resources.dataModels) {
          await this.insertDataModel(client, appId, model);
        }
      }

      // Insert pages
      if (resources.pages && resources.pages.length > 0) {
        for (const page of resources.pages) {
          await this.insertPage(client, appId, page);
        }
      }

      // Insert mobile UI
      if (resources.mobileUI) {
        await this.insertMobileUI(client, appId, resources.mobileUI);
      }

      // Update statistics
      await client.query(`
        UPDATE k1.applications
        SET workflow_count = $1, form_count = $2, model_count = $3, page_count = $4
        WHERE id = $5
      `, [
        resources.workflows?.length || 0,
        resources.forms?.length || 0,
        resources.dataModels?.length || 0,
        resources.pages?.length || 0,
        appId
      ]);

      await client.query('COMMIT');

      console.log('[ApplicationDatabase] Created application:', application.name, `(${appId})`);

      // Return the full application
      return await this.findById(appId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ApplicationDatabase] Failed to create application:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Helper: Insert workflow
   */
  async insertWorkflow(client, applicationId, workflow) {
    const workflowId = workflow.id || `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await client.query(`
      INSERT INTO k1.workflows (
        id, application_id, name, description, version, nodes, edges, connections,
        metadata, node_count, edge_count, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      workflowId,
      applicationId,
      workflow.name || 'Untitled Workflow',
      workflow.description || '',
      workflow.version || '1.0.0',
      JSON.stringify(workflow.nodes || []),
      JSON.stringify(workflow.edges || []),
      JSON.stringify(workflow.connections || []),
      JSON.stringify(workflow.metadata || {}),
      workflow.nodes?.length || 0,
      (workflow.edges?.length || 0) + (workflow.connections?.length || 0),
      workflow.is_active !== undefined ? workflow.is_active : true,
      workflow.createdAt || new Date().toISOString(),
      new Date().toISOString()
    ]);

    return workflowId;
  }

  /**
   * Helper: Insert form
   */
  async insertForm(client, applicationId, form) {
    // Generate unique ID by appending application ID to avoid conflicts
    const baseId = form.id || `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const formId = `${applicationId}_${baseId}`;

    await client.query(`
      INSERT INTO k1.forms (
        id, application_id, name, description, fields, layout, validation,
        data_model_id, config, styling, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        fields = EXCLUDED.fields,
        layout = EXCLUDED.layout,
        validation = EXCLUDED.validation,
        data_model_id = EXCLUDED.data_model_id,
        config = EXCLUDED.config,
        styling = EXCLUDED.styling,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    `, [
      formId,
      applicationId,
      form.name || 'Untitled Form',
      form.description || '',
      JSON.stringify(form.fields || []),
      JSON.stringify(form.layout || {}),
      JSON.stringify(form.validation || {}),
      form.dataModelId || null,
      JSON.stringify(form.config || {}),
      JSON.stringify(form.styling || {}),
      JSON.stringify(form.metadata || {}),
      form.createdAt || new Date().toISOString(),
      new Date().toISOString()
    ]);

    return formId;
  }

  /**
   * Helper: Insert data model
   */
  async insertDataModel(client, applicationId, model) {
    // Generate unique ID by appending application ID and timestamp to avoid conflicts
    const baseId = model.id || `dm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const modelId = `${applicationId}_${baseId}`;

    await client.query(`
      INSERT INTO k1.data_models (
        id, application_id, name, description, fields, relationships, indexes,
        constraints, config, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        fields = EXCLUDED.fields,
        relationships = EXCLUDED.relationships,
        indexes = EXCLUDED.indexes,
        constraints = EXCLUDED.constraints,
        config = EXCLUDED.config,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    `, [
      modelId,
      applicationId,
      model.name || 'Untitled Model',
      model.description || '',
      JSON.stringify(model.fields || []),
      JSON.stringify(model.relationships || []),
      JSON.stringify(model.indexes || []),
      JSON.stringify(model.constraints || []),
      JSON.stringify(model.config || {}),
      JSON.stringify(model.metadata || {}),
      model.createdAt || new Date().toISOString(),
      new Date().toISOString()
    ]);

    return modelId;
  }

  /**
   * Helper: Insert page
   */
  async insertPage(client, applicationId, page) {
    // Generate unique ID by appending application ID to avoid conflicts
    const baseId = page.id || `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pageId = `${applicationId}_${baseId}`;

    await client.query(`
      INSERT INTO k1.pages (
        id, application_id, name, title, description, route, components, layout,
        forms, workflows, data_sources, config, styling, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        route = EXCLUDED.route,
        components = EXCLUDED.components,
        layout = EXCLUDED.layout,
        forms = EXCLUDED.forms,
        workflows = EXCLUDED.workflows,
        data_sources = EXCLUDED.data_sources,
        config = EXCLUDED.config,
        styling = EXCLUDED.styling,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    `, [
      pageId,
      applicationId,
      page.name || 'Untitled Page',
      page.title || '',
      page.description || '',
      page.route || '',
      JSON.stringify(page.components || []),
      JSON.stringify(page.layout || {}),
      JSON.stringify(page.forms || []),
      JSON.stringify(page.workflows || []),
      JSON.stringify(page.dataSources || []),
      JSON.stringify(page.config || {}),
      JSON.stringify(page.styling || {}),
      JSON.stringify(page.metadata || {}),
      page.createdAt || new Date().toISOString(),
      new Date().toISOString()
    ]);

    return pageId;
  }

  /**
   * Helper: Insert mobile UI
   */
  async insertMobileUI(client, applicationId, mobileUI) {
    const mobileUIId = mobileUI.id || `mui_${Date.now()}`;

    await client.query(`
      INSERT INTO k1.mobile_ui (
        id, application_id, screens, navigation, theme, config, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      mobileUIId,
      applicationId,
      JSON.stringify(mobileUI.screens || []),
      JSON.stringify(mobileUI.navigation || {}),
      JSON.stringify(mobileUI.theme || {}),
      JSON.stringify(mobileUI.config || {}),
      JSON.stringify(mobileUI.metadata || {}),
      mobileUI.createdAt || new Date().toISOString(),
      new Date().toISOString()
    ]);

    return mobileUIId;
  }

  /**
   * Update an existing application
   */
  async update(id, updates) {
    await this.initialize();

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Check if application exists
      const checkResult = await client.query('SELECT id FROM k1.applications WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        throw new Error(`Application not found: ${id}`);
      }

      // Build update query dynamically
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.type !== undefined) {
        updateFields.push(`type = $${paramIndex++}`);
        values.push(updates.type);
      }
      if (updates.domain !== undefined) {
        updateFields.push(`domain = $${paramIndex++}`);
        values.push(updates.domain);
      }
      if (updates.industry !== undefined) {
        updateFields.push(`industry = $${paramIndex++}`);
        values.push(updates.industry);
      }
      if (updates.version !== undefined) {
        updateFields.push(`version = $${paramIndex++}`);
        values.push(updates.version);
      }
      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.theme !== undefined) {
        updateFields.push(`theme = $${paramIndex++}`);
        values.push(JSON.stringify(updates.theme));
      }
      if (updates.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata));
      }

      // Always update updated_at
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(new Date().toISOString());

      // Add id as final parameter
      values.push(id);

      if (updateFields.length > 1) { // More than just updated_at
        const query = `
          UPDATE k1.applications
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
        `;
        await client.query(query, values);
      }

      // Handle resources updates
      if (updates.resources) {
        // Delete and re-insert resources (simpler than selective updates)
        if (updates.resources.workflows !== undefined) {
          await client.query('DELETE FROM k1.workflows WHERE application_id = $1', [id]);
          for (const workflow of updates.resources.workflows) {
            await this.insertWorkflow(client, id, workflow);
          }
        }

        if (updates.resources.forms !== undefined) {
          await client.query('DELETE FROM k1.forms WHERE application_id = $1', [id]);
          for (const form of updates.resources.forms) {
            await this.insertForm(client, id, form);
          }
        }

        if (updates.resources.dataModels !== undefined) {
          await client.query('DELETE FROM k1.data_models WHERE application_id = $1', [id]);
          for (const model of updates.resources.dataModels) {
            await this.insertDataModel(client, id, model);
          }
        }

        if (updates.resources.pages !== undefined) {
          await client.query('DELETE FROM k1.pages WHERE application_id = $1', [id]);
          for (const page of updates.resources.pages) {
            await this.insertPage(client, id, page);
          }
        }

        if (updates.resources.mobileUI !== undefined) {
          await client.query('DELETE FROM k1.mobile_ui WHERE application_id = $1', [id]);
          if (updates.resources.mobileUI) {
            await this.insertMobileUI(client, id, updates.resources.mobileUI);
          }
        }

        // Update statistics
        const countsResult = await client.query(`
          SELECT
            (SELECT COUNT(*) FROM k1.workflows WHERE application_id = $1) as workflow_count,
            (SELECT COUNT(*) FROM k1.forms WHERE application_id = $1) as form_count,
            (SELECT COUNT(*) FROM k1.data_models WHERE application_id = $1) as model_count,
            (SELECT COUNT(*) FROM k1.pages WHERE application_id = $1) as page_count
        `, [id]);

        const counts = countsResult.rows[0];
        await client.query(`
          UPDATE k1.applications
          SET workflow_count = $1, form_count = $2, model_count = $3, page_count = $4
          WHERE id = $5
        `, [counts.workflow_count, counts.form_count, counts.model_count, counts.page_count, id]);
      }

      await client.query('COMMIT');

      console.log('[ApplicationDatabase] Updated application:', id);

      // Return the updated application
      return await this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ApplicationDatabase] Failed to update application:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find an application by ID
   */
  async findById(id) {
    await this.initialize();

    try {
      const result = await db.query(`
        SELECT
          a.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', w.id,
                'name', w.name,
                'description', w.description,
                'version', w.version,
                'nodes', w.nodes,
                'edges', w.edges,
                'connections', w.connections,
                'metadata', w.metadata,
                'is_active', w.is_active,
                'created_at', w.created_at,
                'updated_at', w.updated_at
              )
            ) FILTER (WHERE w.id IS NOT NULL),
            '[]'
          ) as workflows,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', f.id,
                'name', f.name,
                'description', f.description,
                'fields', f.fields,
                'layout', f.layout,
                'validation', f.validation,
                'data_model_id', f.data_model_id,
                'config', f.config,
                'styling', f.styling,
                'metadata', f.metadata
              )
            ) FILTER (WHERE f.id IS NOT NULL),
            '[]'
          ) as forms,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', dm.id,
                'name', dm.name,
                'description', dm.description,
                'fields', dm.fields,
                'relationships', dm.relationships,
                'indexes', dm.indexes,
                'constraints', dm.constraints,
                'config', dm.config,
                'metadata', dm.metadata
              )
            ) FILTER (WHERE dm.id IS NOT NULL),
            '[]'
          ) as data_models,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', p.id,
                'name', p.name,
                'title', p.title,
                'description', p.description,
                'route', p.route,
                'components', p.components,
                'layout', p.layout,
                'forms', p.forms,
                'workflows', p.workflows,
                'data_sources', p.data_sources,
                'config', p.config,
                'styling', p.styling,
                'metadata', p.metadata
              )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'
          ) as pages,
          row_to_json(m.*) as mobile_ui
        FROM k1.applications a
        LEFT JOIN k1.workflows w ON a.id = w.application_id
        LEFT JOIN k1.forms f ON a.id = f.application_id
        LEFT JOIN k1.data_models dm ON a.id = dm.application_id
        LEFT JOIN k1.pages p ON a.id = p.application_id
        LEFT JOIN k1.mobile_ui m ON a.id = m.application_id
        WHERE a.id = $1
        GROUP BY a.id, m.id
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        domain: row.domain,
        industry: row.industry,
        version: row.version,
        status: row.status,
        icon: row.icon,
        theme: row.theme,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resources: {
          workflows: row.workflows,
          forms: row.forms,
          dataModels: row.data_models,
          pages: row.pages,
          mobileUI: row.mobile_ui
        },
        metadata: row.metadata
      };
    } catch (error) {
      console.error('[ApplicationDatabase] Failed to find application by ID:', error);
      return null;
    }
  }

  /**
   * Find applications by name (case-insensitive search)
   */
  async findByName(name) {
    await this.initialize();

    try {
      const result = await db.query(`
        SELECT id, name, description, type, created_at, updated_at
        FROM k1.applications
        WHERE LOWER(name) LIKE LOWER($1)
        ORDER BY created_at DESC
      `, [`%${name}%`]);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('[ApplicationDatabase] Failed to find applications by name:', error);
      return [];
    }
  }

  /**
   * Delete an application
   */
  async delete(id) {
    await this.initialize();

    try {
      const result = await db.query('DELETE FROM k1.applications WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        throw new Error(`Application not found: ${id}`);
      }

      console.log('[ApplicationDatabase] Deleted application:', id);
      return true;
    } catch (error) {
      console.error('[ApplicationDatabase] Failed to delete application:', error);
      throw error;
    }
  }

  /**
   * Get all applications
   */
  async getAll() {
    return await this.loadApplications();
  }

  /**
   * Add a resource to an application
   */
  async addResource(applicationId, resourceType, resource) {
    await this.initialize();

    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // Check if application exists
      const checkResult = await client.query('SELECT id FROM k1.applications WHERE id = $1', [applicationId]);
      if (checkResult.rows.length === 0) {
        throw new Error(`Application not found: ${applicationId}`);
      }

      // Insert resource based on type
      let resourceId;
      switch (resourceType) {
        case 'workflows':
          resourceId = await this.insertWorkflow(client, applicationId, resource);
          break;
        case 'forms':
          resourceId = await this.insertForm(client, applicationId, resource);
          break;
        case 'dataModels':
          resourceId = await this.insertDataModel(client, applicationId, resource);
          break;
        case 'pages':
          resourceId = await this.insertPage(client, applicationId, resource);
          break;
        case 'mobileUI':
          resourceId = await this.insertMobileUI(client, applicationId, resource);
          break;
        default:
          throw new Error(`Invalid resource type: ${resourceType}`);
      }

      // Update statistics
      if (resourceType !== 'mobileUI') {
        const columnName = resourceType === 'dataModels' ? 'model_count' : `${resourceType.replace(/s$/, '')}_count`;
        await client.query(`
          UPDATE k1.applications
          SET ${columnName} = ${columnName} + 1
          WHERE id = $1
        `, [applicationId]);
      }

      await client.query('COMMIT');

      console.log(`[ApplicationDatabase] Added ${resourceType} resource to application ${applicationId}`);

      // Return the updated application
      return await this.findById(applicationId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ApplicationDatabase] Failed to add resource:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search applications by criteria
   */
  async search(criteria) {
    await this.initialize();

    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (criteria.type) {
        conditions.push(`type = $${paramIndex++}`);
        values.push(criteria.type);
      }

      if (criteria.name) {
        conditions.push(`LOWER(name) LIKE LOWER($${paramIndex++})`);
        values.push(`%${criteria.name}%`);
      }

      if (criteria.createdAfter) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(criteria.createdAfter);
      }

      if (criteria.createdBefore) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(criteria.createdBefore);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await db.query(`
        SELECT id, name, description, type, domain, created_at, updated_at
        FROM k1.applications
        ${whereClause}
        ORDER BY created_at DESC
      `, values);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type,
        domain: row.domain,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('[ApplicationDatabase] Failed to search applications:', error);
      return [];
    }
  }

  /**
   * Save applications to file (legacy compatibility - not used with PostgreSQL)
   */
  async saveApplications(applications) {
    // This method is kept for API compatibility but doesn't do anything
    // since PostgreSQL handles persistence automatically
    console.log('[ApplicationDatabase] saveApplications() called - no-op with PostgreSQL');
  }
}

module.exports = ApplicationDatabase;
