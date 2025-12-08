/**
 * AIResourceGenerator - AI-powered resource generation for data consistency
 * Handles orphan formIds, dataModelIds, workflowIds, and pageIds
 * Uses Claude to generate contextual resources based on application context
 */

const Anthropic = require('@anthropic-ai/sdk');

class AIResourceGenerator {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-haiku-4-5-20251001'; // Fast model for resource generation
  }

  // =====================================================
  // MASTER DATA CONSISTENCY METHOD
  // =====================================================

  /**
   * Fix data consistency across all resource types
   * @param {object} application - The full application object
   * @param {string} userRequirements - Original user requirements
   * @returns {object} Fixed application with generated resources
   */
  async fixDataConsistency(application, userRequirements = '') {
    console.log('[AIResourceGenerator] Starting data consistency check...');

    const resources = application.resources || {};
    const forms = resources.forms || [];
    const dataModels = resources.dataModels || [];
    const workflows = resources.workflows || [];
    const pages = resources.pages || [];

    const fixes = {
      forms: [],
      dataModels: [],
      workflows: [],
      pages: []
    };

    // 1. Find orphan formIds in workflows
    const orphanFormIds = this.findOrphanFormIds(workflows, forms);
    if (orphanFormIds.length > 0) {
      console.log(`[AIResourceGenerator] Found ${orphanFormIds.length} orphan formIds`);
      const generatedForms = await this.generateForms(orphanFormIds, {
        workflows, dataModels, userRequirements
      });
      fixes.forms = generatedForms;
    }

    // 2. Find orphan dataModelIds in forms and workflows
    const orphanDataModelIds = this.findOrphanDataModelIds(forms, workflows, dataModels);
    if (orphanDataModelIds.length > 0) {
      console.log(`[AIResourceGenerator] Found ${orphanDataModelIds.length} orphan dataModelIds`);
      const generatedDataModels = await this.generateDataModels(orphanDataModelIds, {
        forms, workflows, userRequirements
      });
      fixes.dataModels = generatedDataModels;
    }

    // 3. Find orphan workflowIds (sub-workflow references)
    const orphanWorkflowIds = this.findOrphanWorkflowIds(workflows);
    if (orphanWorkflowIds.length > 0) {
      console.log(`[AIResourceGenerator] Found ${orphanWorkflowIds.length} orphan workflowIds`);
      const generatedWorkflows = await this.generateWorkflows(orphanWorkflowIds, {
        workflows, dataModels, forms, userRequirements
      });
      fixes.workflows = generatedWorkflows;
    }

    // 4. Find orphan pageIds in workflows and navigation
    const orphanPageIds = this.findOrphanPageIds(workflows, pages);
    if (orphanPageIds.length > 0) {
      console.log(`[AIResourceGenerator] Found ${orphanPageIds.length} orphan pageIds`);
      const generatedPages = await this.generatePages(orphanPageIds, {
        workflows, forms, dataModels, userRequirements
      });
      fixes.pages = generatedPages;
    }

    console.log(`[AIResourceGenerator] Data consistency complete: ${fixes.forms.length} forms, ${fixes.dataModels.length} dataModels, ${fixes.workflows.length} workflows, ${fixes.pages.length} pages generated`);

    return fixes;
  }

  // =====================================================
  // ORPHAN DETECTION METHODS
  // =====================================================

  findOrphanFormIds(workflows, existingForms) {
    const existingFormIds = new Set(existingForms.map(f => f.id));
    const orphanFormData = [];

    workflows.forEach(workflow => {
      workflow.nodes?.forEach(node => {
        if (node.data?.formId && !existingFormIds.has(node.data.formId)) {
          orphanFormData.push({
            formId: node.data.formId,
            node,
            workflow
          });
        }
      });
    });

    return orphanFormData;
  }

  findOrphanDataModelIds(forms, workflows, existingDataModels) {
    const existingIds = new Set(existingDataModels.map(dm => dm.id));
    const orphanData = [];

    // Check forms for dataModelId references
    forms.forEach(form => {
      if (form.dataModelId && !existingIds.has(form.dataModelId)) {
        orphanData.push({
          dataModelId: form.dataModelId,
          source: 'form',
          sourceItem: form
        });
      }
    });

    // Check workflow nodes for dataModelId references
    workflows.forEach(workflow => {
      workflow.nodes?.forEach(node => {
        if (node.data?.dataModelId && !existingIds.has(node.data.dataModelId)) {
          // Avoid duplicates
          if (!orphanData.find(o => o.dataModelId === node.data.dataModelId)) {
            orphanData.push({
              dataModelId: node.data.dataModelId,
              source: 'workflow',
              sourceItem: { workflow, node }
            });
          }
        }
      });
    });

    return orphanData;
  }

  findOrphanWorkflowIds(workflows) {
    const existingIds = new Set(workflows.map(w => w.id));
    const orphanData = [];

    workflows.forEach(workflow => {
      workflow.nodes?.forEach(node => {
        // Check for sub-workflow/call activity references
        if (node.type === 'callActivity' || node.type === 'subProcess') {
          const targetWorkflowId = node.data?.workflowId || node.data?.calledWorkflowId;
          if (targetWorkflowId && !existingIds.has(targetWorkflowId)) {
            orphanData.push({
              workflowId: targetWorkflowId,
              callerWorkflow: workflow,
              callerNode: node
            });
          }
        }
      });
    });

    return orphanData;
  }

  findOrphanPageIds(workflows, existingPages) {
    const existingIds = new Set(existingPages.map(p => p.id));
    const orphanData = [];

    workflows.forEach(workflow => {
      workflow.nodes?.forEach(node => {
        // Check for page navigation references
        if (node.data?.pageId && !existingIds.has(node.data.pageId)) {
          orphanData.push({
            pageId: node.data.pageId,
            workflow,
            node
          });
        }
        // Check for navigateTo action
        if (node.data?.action?.type === 'navigateTo' && node.data?.action?.pageId) {
          if (!existingIds.has(node.data.action.pageId)) {
            orphanData.push({
              pageId: node.data.action.pageId,
              workflow,
              node
            });
          }
        }
      });
    });

    return orphanData;
  }

  // =====================================================
  // FORM GENERATION
  // =====================================================

  async generateForms(orphanFormData, context) {
    const forms = [];
    const batchSize = 3;

    for (let i = 0; i < orphanFormData.length; i += batchSize) {
      const batch = orphanFormData.slice(i, i + batchSize);
      const batchPromises = batch.map(({ formId, node, workflow }) =>
        this.generateForm(formId, { ...context, node, workflow })
      );
      const batchResults = await Promise.all(batchPromises);
      forms.push(...batchResults);
    }

    return forms;
  }

  async generateForm(formId, context) {
    const { workflow, node, dataModels = [], userRequirements = '' } = context;
    const nodeLabel = node?.data?.label || this.extractLabelFromId(formId, 'form');
    const nodeDataModelId = node?.data?.dataModelId;
    const relatedDataModel = dataModels.find(dm => dm.id === nodeDataModelId);

    try {
      console.log(`[AIResourceGenerator] Generating form: ${formId} (${nodeLabel})`);

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: this.getFormSystemPrompt(),
        messages: [{ role: 'user', content: this.buildFormPrompt(formId, nodeLabel, workflow, relatedDataModel, userRequirements) }]
      });

      const form = this.parseJsonResponse(response.content[0].text);
      form.id = formId;
      form.workflowId = workflow?.id;
      form.createdAt = new Date().toISOString();
      form.aiGenerated = true;

      console.log(`[AIResourceGenerator] Generated form with ${form.fields?.length || 0} fields`);
      return form;

    } catch (error) {
      console.error(`[AIResourceGenerator] Form generation failed:`, error.message);
      return this.generateFallbackForm(formId, nodeLabel, workflow, relatedDataModel);
    }
  }

  // =====================================================
  // DATA MODEL GENERATION
  // =====================================================

  async generateDataModels(orphanDataModelData, context) {
    const dataModels = [];
    const batchSize = 3;

    for (let i = 0; i < orphanDataModelData.length; i += batchSize) {
      const batch = orphanDataModelData.slice(i, i + batchSize);
      const batchPromises = batch.map(data =>
        this.generateDataModel(data.dataModelId, { ...context, source: data.source, sourceItem: data.sourceItem })
      );
      const batchResults = await Promise.all(batchPromises);
      dataModels.push(...batchResults);
    }

    return dataModels;
  }

  async generateDataModel(dataModelId, context) {
    const { forms = [], workflows = [], source, sourceItem, userRequirements = '' } = context;
    const label = this.extractLabelFromId(dataModelId, 'datamodel');

    try {
      console.log(`[AIResourceGenerator] Generating data model: ${dataModelId} (${label})`);

      // Gather context from related forms
      const relatedForm = forms.find(f => f.dataModelId === dataModelId);
      const formFields = relatedForm?.fields?.map(f => ({ name: f.name, type: f.type, label: f.label })) || [];

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: this.getDataModelSystemPrompt(),
        messages: [{ role: 'user', content: this.buildDataModelPrompt(dataModelId, label, formFields, sourceItem, userRequirements) }]
      });

      const dataModel = this.parseJsonResponse(response.content[0].text);
      dataModel.id = dataModelId;
      dataModel.createdAt = new Date().toISOString();
      dataModel.aiGenerated = true;

      console.log(`[AIResourceGenerator] Generated data model with ${dataModel.fields?.length || 0} fields`);
      return dataModel;

    } catch (error) {
      console.error(`[AIResourceGenerator] Data model generation failed:`, error.message);
      return this.generateFallbackDataModel(dataModelId, label, context);
    }
  }

  getDataModelSystemPrompt() {
    return `You are a Data Model Design Expert AI. You generate database entity definitions for workflow management systems.

## Field Types Available:
- string: Short text (max 255 chars)
- text: Long text
- integer: Whole numbers
- float: Decimal numbers
- boolean: True/false
- date: Date only
- datetime: Date and time
- email: Email address
- phone: Phone number
- enum: Fixed set of values
- reference: Foreign key to another entity

## Output Format:
Return ONLY valid JSON:
{
  "name": "Entity Name",
  "description": "Brief description",
  "tableName": "entity_name",
  "fields": [
    {
      "name": "fieldName",
      "type": "string",
      "label": "Field Label",
      "required": true,
      "unique": false,
      "indexed": false,
      "defaultValue": null,
      "validation": {}
    }
  ],
  "indexes": [],
  "relationships": []
}

## Guidelines:
1. Generate 5-10 fields based on the entity purpose
2. Always include an 'id' field as primary key
3. Add createdAt and updatedAt timestamp fields
4. Use appropriate types for each field
5. Mark essential fields as required
6. Add indexes for frequently queried fields`;
  }

  buildDataModelPrompt(dataModelId, label, formFields, sourceItem, userRequirements) {
    let prompt = `Generate a data model definition for a database entity.

## Data Model Context:
- ID: ${dataModelId}
- Entity Name: ${label}
`;

    if (userRequirements) {
      prompt += `- Original Requirements: ${userRequirements}\n`;
    }

    if (formFields.length > 0) {
      prompt += `
## Related Form Fields (align data model with these):
${JSON.stringify(formFields, null, 2)}
`;
    }

    if (sourceItem?.workflow) {
      prompt += `
## Workflow Context:
- Workflow: ${sourceItem.workflow.name || 'Unknown'}
- Node: ${sourceItem.node?.data?.label || 'Unknown'}
`;
    }

    prompt += `
## Task:
Generate a complete data model for "${label}".
Include all fields needed to store the data for this entity.
Return ONLY the JSON object, no explanation.`;

    return prompt;
  }

  generateFallbackDataModel(dataModelId, label, context) {
    const timestamp = Date.now();
    const fields = [
      { name: 'id', type: 'string', label: 'ID', required: true, unique: true, indexed: true },
      { name: 'name', type: 'string', label: 'Name', required: true },
      { name: 'description', type: 'text', label: 'Description', required: false },
      { name: 'status', type: 'enum', label: 'Status', required: true, options: ['draft', 'active', 'completed', 'archived'] },
      { name: 'createdAt', type: 'datetime', label: 'Created At', required: true },
      { name: 'updatedAt', type: 'datetime', label: 'Updated At', required: true },
      { name: 'createdBy', type: 'string', label: 'Created By', required: false }
    ];

    return {
      id: dataModelId,
      name: label,
      description: `Data model for ${label}`,
      tableName: label.toLowerCase().replace(/\s+/g, '_'),
      fields,
      indexes: [{ fields: ['status'], unique: false }],
      relationships: [],
      createdAt: new Date().toISOString(),
      aiGenerated: false,
      fallbackGenerated: true
    };
  }

  // =====================================================
  // WORKFLOW GENERATION (Sub-workflows)
  // =====================================================

  async generateWorkflows(orphanWorkflowData, context) {
    const workflows = [];
    const batchSize = 2; // Workflows are more complex

    for (let i = 0; i < orphanWorkflowData.length; i += batchSize) {
      const batch = orphanWorkflowData.slice(i, i + batchSize);
      const batchPromises = batch.map(data =>
        this.generateWorkflow(data.workflowId, { ...context, callerWorkflow: data.callerWorkflow, callerNode: data.callerNode })
      );
      const batchResults = await Promise.all(batchPromises);
      workflows.push(...batchResults);
    }

    return workflows;
  }

  async generateWorkflow(workflowId, context) {
    const { callerWorkflow, callerNode, dataModels = [], forms = [], userRequirements = '' } = context;
    const label = this.extractLabelFromId(workflowId, 'workflow');

    try {
      console.log(`[AIResourceGenerator] Generating sub-workflow: ${workflowId} (${label})`);

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: this.getWorkflowSystemPrompt(),
        messages: [{ role: 'user', content: this.buildWorkflowPrompt(workflowId, label, callerWorkflow, callerNode, userRequirements) }]
      });

      const workflow = this.parseJsonResponse(response.content[0].text);
      workflow.id = workflowId;
      workflow.createdAt = new Date().toISOString();
      workflow.aiGenerated = true;
      workflow.isSubWorkflow = true;

      console.log(`[AIResourceGenerator] Generated workflow with ${workflow.nodes?.length || 0} nodes`);
      return workflow;

    } catch (error) {
      console.error(`[AIResourceGenerator] Workflow generation failed:`, error.message);
      return this.generateFallbackWorkflow(workflowId, label, callerWorkflow, callerNode);
    }
  }

  getWorkflowSystemPrompt() {
    return `You are a Workflow Design Expert AI. You generate BPMN-style workflow definitions.

## Node Types Available:
- startProcess: Start event (trigger: user_action, event, schedule)
- endEvent: End event
- userTask: User task requiring form input
- serviceTask: Automated service/script task
- exclusiveGateway: XOR decision gateway
- parallelGateway: AND parallel gateway
- timer: Wait/delay timer
- sendEmail: Email notification
- callActivity: Call another workflow

## Output Format:
Return ONLY valid JSON:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "nodes": [
    {
      "id": "node_1",
      "type": "startProcess",
      "position": { "x": 250, "y": 50 },
      "data": { "label": "Start", "trigger": "user_action" }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2",
      "label": ""
    }
  ],
  "triggers": [{ "type": "direct_call" }]
}

## Guidelines:
1. Always start with startProcess and end with endEvent
2. Use logical flow from start to end
3. Position nodes in a clear visual layout
4. Add appropriate labels to nodes and decision edges
5. For sub-workflows, use trigger type "direct_call"
6. Keep sub-workflows focused (3-7 nodes)`;
  }

  buildWorkflowPrompt(workflowId, label, callerWorkflow, callerNode, userRequirements) {
    let prompt = `Generate a sub-workflow definition.

## Sub-Workflow Context:
- ID: ${workflowId}
- Name: ${label}
- Called from: ${callerWorkflow?.name || 'Unknown workflow'}
- Calling node: ${callerNode?.data?.label || 'Unknown'}
`;

    if (userRequirements) {
      prompt += `- Original Requirements: ${userRequirements}\n`;
    }

    if (callerNode?.data?.description) {
      prompt += `- Purpose: ${callerNode.data.description}\n`;
    }

    prompt += `
## Task:
Generate a focused sub-workflow for "${label}".
This should be a reusable workflow component called by the parent workflow.
Return ONLY the JSON object, no explanation.`;

    return prompt;
  }

  generateFallbackWorkflow(workflowId, label, callerWorkflow, callerNode) {
    const timestamp = Date.now();

    return {
      id: workflowId,
      name: label,
      description: `Sub-workflow for ${label}`,
      isSubWorkflow: true,
      nodes: [
        {
          id: `start_${timestamp}`,
          type: 'startProcess',
          position: { x: 250, y: 50 },
          data: { label: 'Start', trigger: 'direct_call' }
        },
        {
          id: `task_${timestamp}`,
          type: 'serviceTask',
          position: { x: 250, y: 150 },
          data: { label: `Process ${label}`, script: '// Add implementation' }
        },
        {
          id: `end_${timestamp}`,
          type: 'endEvent',
          position: { x: 250, y: 250 },
          data: { label: 'End' }
        }
      ],
      edges: [
        { id: `edge_1_${timestamp}`, source: `start_${timestamp}`, target: `task_${timestamp}` },
        { id: `edge_2_${timestamp}`, source: `task_${timestamp}`, target: `end_${timestamp}` }
      ],
      triggers: [{ type: 'direct_call' }],
      createdAt: new Date().toISOString(),
      aiGenerated: false,
      fallbackGenerated: true
    };
  }

  // =====================================================
  // PAGE GENERATION
  // =====================================================

  async generatePages(orphanPageData, context) {
    const pages = [];
    const batchSize = 3;

    for (let i = 0; i < orphanPageData.length; i += batchSize) {
      const batch = orphanPageData.slice(i, i + batchSize);
      const batchPromises = batch.map(data =>
        this.generatePage(data.pageId, { ...context, workflow: data.workflow, node: data.node })
      );
      const batchResults = await Promise.all(batchPromises);
      pages.push(...batchResults);
    }

    return pages;
  }

  async generatePage(pageId, context) {
    const { workflow, node, forms = [], dataModels = [], userRequirements = '' } = context;
    const label = this.extractLabelFromId(pageId, 'page');

    try {
      console.log(`[AIResourceGenerator] Generating page: ${pageId} (${label})`);

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: this.getPageSystemPrompt(),
        messages: [{ role: 'user', content: this.buildPagePrompt(pageId, label, workflow, node, forms, userRequirements) }]
      });

      const page = this.parseJsonResponse(response.content[0].text);
      page.id = pageId;
      page.createdAt = new Date().toISOString();
      page.aiGenerated = true;

      console.log(`[AIResourceGenerator] Generated page with ${page.sections?.length || page.components?.length || 0} sections/components`);
      return page;

    } catch (error) {
      console.error(`[AIResourceGenerator] Page generation failed:`, error.message);
      return this.generateFallbackPage(pageId, label, workflow, node);
    }
  }

  getPageSystemPrompt() {
    return `You are a UI Page Design Expert AI. You generate page definitions for workflow applications.

## Component Types Available:
- header: Page header with title
- form: Embedded form component
- table: Data table
- chart: Visualization chart
- card: Information card
- text: Text/paragraph block
- button: Action button
- navigation: Navigation menu

## Output Format:
Return ONLY valid JSON:
{
  "name": "Page Name",
  "title": "Page Title",
  "description": "Brief description",
  "route": "/page-route",
  "layout": {
    "type": "single-column",
    "padding": "24px",
    "maxWidth": "1200px"
  },
  "sections": [
    {
      "id": "section_1",
      "type": "header",
      "content": { "title": "Page Title", "subtitle": "Description" }
    }
  ],
  "navigation": {
    "showInMenu": true,
    "menuLabel": "Page",
    "icon": "file"
  }
}

## Guidelines:
1. Create logical page structure with header and content sections
2. Include appropriate navigation settings
3. Reference forms if this is a form-based page
4. Use meaningful route paths
5. Add helpful descriptions`;
  }

  buildPagePrompt(pageId, label, workflow, node, forms, userRequirements) {
    let prompt = `Generate a page definition for a workflow application.

## Page Context:
- ID: ${pageId}
- Name: ${label}
`;

    if (workflow) {
      prompt += `- Workflow: ${workflow.name || 'Unknown'}\n`;
    }

    if (node) {
      prompt += `- Referenced by node: ${node.data?.label || 'Unknown'}\n`;
    }

    if (userRequirements) {
      prompt += `- Original Requirements: ${userRequirements}\n`;
    }

    // Check for related forms
    const relatedForms = forms.filter(f =>
      f.name?.toLowerCase().includes(label.toLowerCase()) ||
      label.toLowerCase().includes(f.name?.toLowerCase() || '')
    );

    if (relatedForms.length > 0) {
      prompt += `
## Related Forms:
${JSON.stringify(relatedForms.map(f => ({ id: f.id, name: f.name })), null, 2)}
`;
    }

    prompt += `
## Task:
Generate a complete page definition for "${label}".
Create a user-friendly page layout appropriate for the workflow context.
Return ONLY the JSON object, no explanation.`;

    return prompt;
  }

  generateFallbackPage(pageId, label, workflow, node) {
    const timestamp = Date.now();
    const route = '/' + label.toLowerCase().replace(/\s+/g, '-');

    return {
      id: pageId,
      name: label,
      title: label,
      description: `Page for ${label}`,
      route,
      workflowId: workflow?.id,
      layout: {
        type: 'single-column',
        padding: '24px',
        maxWidth: '1200px',
        backgroundColor: '#f9fafb'
      },
      sections: [
        {
          id: `section_header_${timestamp}`,
          type: 'header',
          content: {
            title: label,
            subtitle: workflow ? `Part of ${workflow.name}` : ''
          }
        },
        {
          id: `section_content_${timestamp}`,
          type: 'card',
          content: {
            title: 'Content',
            body: 'Add your page content here.'
          }
        }
      ],
      navigation: {
        showInMenu: true,
        menuLabel: label,
        icon: 'file'
      },
      createdAt: new Date().toISOString(),
      aiGenerated: false,
      fallbackGenerated: true
    };
  }

  // =====================================================
  // FORM-SPECIFIC PROMPTS AND FALLBACKS
  // =====================================================

  getFormSystemPrompt() {
    return `You are a Form Design Expert AI. You generate professional form definitions for workflow management systems.

## Form Field Types Available:
- text: Single-line text input
- textarea: Multi-line text input
- email: Email address input
- number: Numeric input
- date: Date picker
- select: Dropdown selection
- checkbox: Boolean checkbox
- radio: Radio button group
- file: File upload
- phone: Phone number input

## Output Format:
Return ONLY valid JSON:
{
  "name": "Form Name",
  "title": "Form Title",
  "description": "Brief description",
  "type": "simple",
  "layout": { "type": "grid", "columns": 1, "gap": "24px", "maxWidth": "800px", "padding": "32px" },
  "styling": {
    "form": { "padding": "32px", "maxWidth": "1200px", "margin": "0 auto", "backgroundColor": "#ffffff" },
    "buttons": { "gap": "12px", "marginTop": "32px" }
  },
  "fields": [
    {
      "id": "field_1",
      "type": "text",
      "name": "fieldName",
      "label": "Field Label",
      "required": true,
      "placeholder": "Enter value"
    }
  ],
  "gridLayout": [
    { "i": "field_1", "x": 0, "y": 0, "w": 24, "h": 8, "minW": 6, "minH": 6 }
  ]
}

## Guidelines:
1. Generate 4-8 fields based on the form purpose
2. Use appropriate field types for each data type
3. Include proper validation (required fields)
4. Add helpful placeholders
5. Use wizard type for forms with 6+ fields`;
  }

  buildFormPrompt(formId, nodeLabel, workflow, dataModel, userRequirements) {
    let prompt = `Generate a form definition for a workflow form.

## Form Context:
- Form ID: ${formId}
- Form Purpose: ${nodeLabel}
- Workflow: ${workflow?.name || 'Unknown'}
`;

    if (userRequirements) {
      prompt += `- Original Requirements: ${userRequirements}\n`;
    }

    if (dataModel) {
      prompt += `
## Related Data Model:
- Name: ${dataModel.name}
- Fields: ${JSON.stringify(dataModel.fields?.map(f => ({ name: f.name, type: f.type })) || [], null, 2)}
`;
    }

    prompt += `
## Task:
Generate a complete form for "${nodeLabel}".
Return ONLY the JSON object, no explanation.`;

    return prompt;
  }

  generateFallbackForm(formId, nodeLabel, workflow, dataModel) {
    const timestamp = Date.now();
    const fields = this.getContextualFields(nodeLabel);
    const gridLayout = [];
    let yPosition = 0;

    fields.forEach((field, index) => {
      field.id = `field_${timestamp}_${index + 1}`;
      field.styling = this.getDefaultFieldStyling(field.type);

      gridLayout.push({
        i: field.id,
        x: 0,
        y: yPosition,
        w: 24,
        h: field.type === 'textarea' ? 12 : 8,
        minW: 6,
        minH: 6
      });
      yPosition += field.type === 'textarea' ? 12 : 8;
    });

    return {
      id: formId,
      name: nodeLabel,
      title: nodeLabel,
      description: `Form for ${nodeLabel}`,
      workflowId: workflow?.id,
      type: fields.length > 5 ? 'wizard' : 'simple',
      dataModelId: dataModel?.id || null,
      layout: { type: 'grid', columns: 1, gap: '24px', maxWidth: '800px', padding: '32px' },
      styling: {
        form: { padding: '32px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#ffffff' },
        buttons: { gap: '12px', marginTop: '32px' }
      },
      fields,
      gridLayout,
      createdAt: new Date().toISOString(),
      aiGenerated: false,
      fallbackGenerated: true
    };
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  extractLabelFromId(id, type) {
    // Remove common prefixes and suffixes
    let cleanId = id
      .replace(new RegExp(`^${type}_`, 'i'), '')
      .replace(/-\d+.*$/, '') // Remove timestamp suffix
      .replace(/_\d+$/, '');  // Remove numeric suffix

    // Split by camelCase, hyphen, or underscore
    const words = cleanId.split(/(?=[A-Z])|[-_]/);
    return words
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .trim() || type.charAt(0).toUpperCase() + type.slice(1);
  }

  parseJsonResponse(responseText) {
    try {
      let jsonText = responseText.trim();

      // Remove markdown code blocks
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('[AIResourceGenerator] JSON parse failed:', error.message);
      throw error;
    }
  }

  getContextualFields(nodeLabel) {
    const label = nodeLabel.toLowerCase();

    if (label.includes('employee') || label.includes('staff') || label.includes('onboard')) {
      return [
        { type: 'text', name: 'firstName', label: 'First Name', required: true, placeholder: 'Enter first name' },
        { type: 'text', name: 'lastName', label: 'Last Name', required: true, placeholder: 'Enter last name' },
        { type: 'email', name: 'email', label: 'Email Address', required: true, placeholder: 'Enter email' },
        { type: 'text', name: 'department', label: 'Department', required: false, placeholder: 'Enter department' },
        { type: 'date', name: 'startDate', label: 'Start Date', required: true, placeholder: 'Select date' }
      ];
    }

    if (label.includes('leave') || label.includes('vacation') || label.includes('absence')) {
      return [
        { type: 'select', name: 'leaveType', label: 'Leave Type', required: true, options: [
          { label: 'Annual Leave', value: 'annual' },
          { label: 'Sick Leave', value: 'sick' },
          { label: 'Personal Leave', value: 'personal' }
        ]},
        { type: 'date', name: 'startDate', label: 'Start Date', required: true },
        { type: 'date', name: 'endDate', label: 'End Date', required: true },
        { type: 'textarea', name: 'reason', label: 'Reason', required: true, placeholder: 'Enter reason' }
      ];
    }

    if (label.includes('approval') || label.includes('review')) {
      return [
        { type: 'select', name: 'decision', label: 'Decision', required: true, options: [
          { label: 'Approve', value: 'approve' },
          { label: 'Reject', value: 'reject' },
          { label: 'Request Info', value: 'more_info' }
        ]},
        { type: 'textarea', name: 'comments', label: 'Comments', required: false, placeholder: 'Enter comments' }
      ];
    }

    // Default
    return [
      { type: 'text', name: 'title', label: 'Title', required: true, placeholder: 'Enter title' },
      { type: 'textarea', name: 'description', label: 'Description', required: false, placeholder: 'Enter description' },
      { type: 'date', name: 'date', label: 'Date', required: false }
    ];
  }

  getDefaultFieldStyling(fieldType) {
    const baseInput = {
      padding: '10px 14px',
      borderRadius: '6px',
      border: '1px solid #d1d5db',
      backgroundColor: '#ffffff',
      fontSize: '14px'
    };

    if (fieldType === 'textarea') {
      return {
        container: { marginBottom: '24px' },
        label: { fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' },
        input: { ...baseInput, minHeight: '100px' }
      };
    }

    return {
      container: { marginBottom: '24px' },
      label: { fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' },
      input: { ...baseInput, height: '40px' }
    };
  }

  // =====================================================
  // BACKWARD COMPATIBILITY - Form generation exports
  // =====================================================

  // Keep backward compatibility with existing AIFormGenerator usage
  async generateForms_legacy(orphanFormData, context) {
    return this.generateForms(orphanFormData, context);
  }
}

module.exports = new AIResourceGenerator();
