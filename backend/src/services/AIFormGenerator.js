/**
 * AIFormGenerator - AI-powered form generation for orphan formIds
 * Uses Claude to generate contextual forms based on workflow context
 */

const Anthropic = require('@anthropic-ai/sdk');

class AIFormGenerator {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.model = 'claude-haiku-4-5-20251001'; // Fast model for form generation
  }

  /**
   * Generate a form using AI based on context
   * @param {string} formId - The orphan form ID
   * @param {object} context - Context including workflow, node, dataModels
   * @returns {object} Generated form object
   */
  async generateForm(formId, context) {
    const { workflow, node, dataModels = [], userRequirements = '' } = context;

    const nodeLabel = node?.data?.label || this.extractLabelFromFormId(formId);
    const nodeDataModelId = node?.data?.dataModelId;
    const relatedDataModel = dataModels.find(dm => dm.id === nodeDataModelId);

    const prompt = this.buildPrompt(formId, nodeLabel, workflow, relatedDataModel, userRequirements);

    try {
      console.log(`[AIFormGenerator] Generating form for: ${formId} (${nodeLabel})`);

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: prompt }]
      });

      const responseText = response.content[0].text;
      const form = this.parseJsonResponse(responseText);

      // Ensure the form has the correct ID
      form.id = formId;
      form.workflowId = workflow?.id;
      form.createdAt = new Date().toISOString();
      form.aiGenerated = true;

      console.log(`[AIFormGenerator] Generated form with ${form.fields?.length || 0} fields`);
      return form;

    } catch (error) {
      console.error(`[AIFormGenerator] Failed to generate form:`, error);
      // Return a fallback form
      return this.generateFallbackForm(formId, nodeLabel, workflow, relatedDataModel);
    }
  }

  /**
   * Generate multiple forms in batch
   * @param {array} orphanFormData - Array of { formId, node } objects
   * @param {object} context - Shared context
   * @returns {array} Generated forms
   */
  async generateForms(orphanFormData, context) {
    const forms = [];

    // Process forms in parallel batches of 3 to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < orphanFormData.length; i += batchSize) {
      const batch = orphanFormData.slice(i, i + batchSize);
      const batchPromises = batch.map(({ formId, node }) =>
        this.generateForm(formId, { ...context, node })
      );
      const batchResults = await Promise.all(batchPromises);
      forms.push(...batchResults);
    }

    return forms;
  }

  getSystemPrompt() {
    return `You are a Form Design Expert AI. You generate professional form definitions for workflow management systems.

Your task is to generate form JSON definitions with appropriate fields based on the context provided.

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
Return ONLY valid JSON matching this structure:
{
  "name": "Form Name",
  "title": "Form Title",
  "description": "Brief description",
  "type": "simple|wizard",
  "layout": {
    "type": "grid",
    "columns": 1,
    "gap": "24px",
    "maxWidth": "800px",
    "padding": "32px"
  },
  "styling": {
    "form": {
      "padding": "32px",
      "maxWidth": "1200px",
      "margin": "0 auto",
      "backgroundColor": "#ffffff"
    },
    "buttons": {
      "gap": "12px",
      "marginTop": "32px"
    }
  },
  "fields": [
    {
      "id": "field_1",
      "type": "text",
      "name": "fieldName",
      "label": "Field Label",
      "required": true,
      "placeholder": "Enter value",
      "helpText": "Optional help text",
      "styling": {
        "container": { "marginBottom": "24px" },
        "label": { "fontSize": "14px", "fontWeight": "500", "color": "#374151" },
        "input": { "height": "40px", "padding": "10px 14px", "borderRadius": "6px", "border": "1px solid #d1d5db" }
      }
    }
  ],
  "gridLayout": [
    { "i": "field_1", "x": 0, "y": 0, "w": 24, "h": 8, "minW": 6, "minH": 6 }
  ]
}

## Guidelines:
1. Generate 4-8 fields based on the form purpose
2. Use appropriate field types for each data type
3. Include proper validation (required fields, appropriate types)
4. Add helpful placeholders and help text
5. Use clear, professional labels
6. If a data model is provided, align field names with data model fields
7. For select fields, provide sensible options arrays
8. Use wizard type for forms with 6+ fields, simple for fewer`;
  }

  buildPrompt(formId, nodeLabel, workflow, dataModel, userRequirements) {
    let prompt = `Generate a form definition for a workflow form.

## Form Context:
- Form ID: ${formId}
- Form Purpose: ${nodeLabel}
- Workflow: ${workflow?.name || 'Unknown'}
- Workflow Description: ${workflow?.description || 'N/A'}
`;

    if (userRequirements) {
      prompt += `- Original User Requirements: ${userRequirements}\n`;
    }

    if (dataModel) {
      prompt += `
## Related Data Model:
- Name: ${dataModel.name}
- Fields: ${JSON.stringify(dataModel.fields?.map(f => ({ name: f.name, type: f.type })) || [], null, 2)}

Please align form fields with the data model fields where appropriate. Add a "binding" property to fields that map to data model fields:
"binding": { "dataModelId": "${dataModel.id}", "fieldName": "fieldName" }
`;
    }

    // Add workflow context
    if (workflow?.nodes?.length) {
      const relevantNodes = workflow.nodes.filter(n =>
        n.type === 'userTask' || n.type === 'startProcess'
      ).slice(0, 5);

      prompt += `
## Workflow Nodes Context:
${JSON.stringify(relevantNodes.map(n => ({ id: n.id, type: n.type, label: n.data?.label })), null, 2)}
`;
    }

    prompt += `
## Task:
Generate a complete, professional form definition for "${nodeLabel}".
The form should collect all information logically required for this workflow step.
Return ONLY the JSON object, no explanation.`;

    return prompt;
  }

  extractLabelFromFormId(formId) {
    // Extract readable label from formId like "newemployeeinformationform-xxx"
    const cleanId = formId.replace(/-\d+.*$/, ''); // Remove timestamp suffix
    const words = cleanId.replace(/form$/i, '').split(/(?=[A-Z])|[-_]/);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ').trim();
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
      console.error('[AIFormGenerator] JSON parse failed:', error);
      throw error;
    }
  }

  /**
   * Generate a fallback form when AI generation fails
   */
  generateFallbackForm(formId, nodeLabel, workflow, dataModel) {
    const timestamp = Date.now();
    const fields = [];
    let yPosition = 0;
    const gridLayout = [];

    // If we have a data model, use its fields
    if (dataModel?.fields?.length) {
      dataModel.fields.forEach((dmField, index) => {
        const fieldId = `field_${timestamp}_${index + 1}`;
        const fieldType = this.mapDataModelTypeToFormType(dmField.type);

        fields.push({
          id: fieldId,
          type: fieldType,
          name: dmField.name,
          label: this.formatLabel(dmField.name),
          required: dmField.required || false,
          placeholder: `Enter ${this.formatLabel(dmField.name).toLowerCase()}`,
          binding: {
            dataModelId: dataModel.id,
            fieldName: dmField.name
          },
          styling: this.getDefaultFieldStyling(fieldType)
        });

        gridLayout.push({
          i: fieldId,
          x: 0,
          y: yPosition,
          w: 24,
          h: fieldType === 'textarea' ? 12 : 8,
          minW: 6,
          minH: 6
        });
        yPosition += fieldType === 'textarea' ? 12 : 8;
      });
    } else {
      // Generate context-aware default fields based on nodeLabel
      const defaultFields = this.getContextualFields(nodeLabel);

      defaultFields.forEach((field, index) => {
        const fieldId = `field_${timestamp}_${index + 1}`;

        fields.push({
          id: fieldId,
          ...field,
          styling: this.getDefaultFieldStyling(field.type)
        });

        gridLayout.push({
          i: fieldId,
          x: 0,
          y: yPosition,
          w: 24,
          h: field.type === 'textarea' ? 12 : 8,
          minW: 6,
          minH: 6
        });
        yPosition += field.type === 'textarea' ? 12 : 8;
      });
    }

    return {
      id: formId,
      name: nodeLabel,
      title: nodeLabel,
      description: `Form for ${nodeLabel}`,
      workflowId: workflow?.id,
      type: fields.length > 5 ? 'wizard' : 'simple',
      dataModelId: dataModel?.id || null,
      layout: {
        type: 'grid',
        columns: 1,
        gap: '24px',
        maxWidth: '800px',
        padding: '32px'
      },
      styling: {
        form: {
          padding: '32px',
          maxWidth: '1200px',
          margin: '0 auto',
          backgroundColor: '#ffffff'
        },
        buttons: {
          gap: '12px',
          marginTop: '32px'
        }
      },
      fields,
      gridLayout,
      createdAt: new Date().toISOString(),
      aiGenerated: false,
      fallbackGenerated: true
    };
  }

  getContextualFields(nodeLabel) {
    const label = nodeLabel.toLowerCase();

    // Employee/HR related
    if (label.includes('employee') || label.includes('staff') || label.includes('personnel') || label.includes('onboard')) {
      return [
        { type: 'text', name: 'firstName', label: 'First Name', required: true, placeholder: 'Enter first name' },
        { type: 'text', name: 'lastName', label: 'Last Name', required: true, placeholder: 'Enter last name' },
        { type: 'email', name: 'email', label: 'Email Address', required: true, placeholder: 'Enter email address' },
        { type: 'text', name: 'department', label: 'Department', required: false, placeholder: 'Enter department' },
        { type: 'text', name: 'position', label: 'Position/Title', required: false, placeholder: 'Enter position' },
        { type: 'date', name: 'startDate', label: 'Start Date', required: true, placeholder: 'Select start date' },
        { type: 'phone', name: 'phone', label: 'Phone Number', required: false, placeholder: 'Enter phone number' }
      ];
    }

    // Leave/Vacation
    if (label.includes('leave') || label.includes('vacation') || label.includes('absence') || label.includes('time off')) {
      return [
        { type: 'select', name: 'leaveType', label: 'Leave Type', required: true, options: [
          { label: 'Annual Leave', value: 'annual' },
          { label: 'Sick Leave', value: 'sick' },
          { label: 'Personal Leave', value: 'personal' },
          { label: 'Parental Leave', value: 'parental' },
          { label: 'Other', value: 'other' }
        ]},
        { type: 'date', name: 'startDate', label: 'Start Date', required: true, placeholder: 'Select start date' },
        { type: 'date', name: 'endDate', label: 'End Date', required: true, placeholder: 'Select end date' },
        { type: 'textarea', name: 'reason', label: 'Reason', required: true, placeholder: 'Enter reason for leave' },
        { type: 'text', name: 'emergencyContact', label: 'Emergency Contact', required: false, placeholder: 'Enter emergency contact' }
      ];
    }

    // Approval/Review
    if (label.includes('approval') || label.includes('approve') || label.includes('review') || label.includes('decision')) {
      return [
        { type: 'select', name: 'decision', label: 'Decision', required: true, options: [
          { label: 'Approve', value: 'approve' },
          { label: 'Reject', value: 'reject' },
          { label: 'Request More Information', value: 'more_info' }
        ]},
        { type: 'textarea', name: 'comments', label: 'Comments', required: false, placeholder: 'Enter your comments' },
        { type: 'textarea', name: 'conditions', label: 'Conditions (if any)', required: false, placeholder: 'Enter any conditions' }
      ];
    }

    // Document/Upload
    if (label.includes('document') || label.includes('upload') || label.includes('file') || label.includes('attachment')) {
      return [
        { type: 'text', name: 'documentTitle', label: 'Document Title', required: true, placeholder: 'Enter document title' },
        { type: 'select', name: 'documentType', label: 'Document Type', required: true, options: [
          { label: 'Contract', value: 'contract' },
          { label: 'Report', value: 'report' },
          { label: 'Certificate', value: 'certificate' },
          { label: 'ID Document', value: 'id' },
          { label: 'Other', value: 'other' }
        ]},
        { type: 'file', name: 'documentFile', label: 'Upload Document', required: true, placeholder: 'Select file to upload' },
        { type: 'textarea', name: 'notes', label: 'Notes', required: false, placeholder: 'Enter any notes' }
      ];
    }

    // Training/Learning
    if (label.includes('training') || label.includes('course') || label.includes('learning') || label.includes('certification')) {
      return [
        { type: 'text', name: 'trainingName', label: 'Training Program', required: true, placeholder: 'Enter training program name' },
        { type: 'date', name: 'trainingDate', label: 'Training Date', required: true, placeholder: 'Select training date' },
        { type: 'text', name: 'trainer', label: 'Trainer/Instructor', required: false, placeholder: 'Enter trainer name' },
        { type: 'select', name: 'status', label: 'Completion Status', required: true, options: [
          { label: 'Not Started', value: 'not_started' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Completed', value: 'completed' }
        ]},
        { type: 'textarea', name: 'feedback', label: 'Feedback', required: false, placeholder: 'Enter feedback' }
      ];
    }

    // Equipment/IT
    if (label.includes('equipment') || label.includes('it') || label.includes('hardware') || label.includes('device')) {
      return [
        { type: 'text', name: 'equipmentName', label: 'Equipment Name', required: true, placeholder: 'Enter equipment name' },
        { type: 'select', name: 'equipmentType', label: 'Equipment Type', required: true, options: [
          { label: 'Laptop', value: 'laptop' },
          { label: 'Desktop', value: 'desktop' },
          { label: 'Monitor', value: 'monitor' },
          { label: 'Phone', value: 'phone' },
          { label: 'Accessories', value: 'accessories' },
          { label: 'Other', value: 'other' }
        ]},
        { type: 'textarea', name: 'specifications', label: 'Specifications', required: false, placeholder: 'Enter specifications' },
        { type: 'number', name: 'quantity', label: 'Quantity', required: true, placeholder: 'Enter quantity' }
      ];
    }

    // Request/Order
    if (label.includes('request') || label.includes('order') || label.includes('requisition')) {
      return [
        { type: 'text', name: 'title', label: 'Request Title', required: true, placeholder: 'Enter request title' },
        { type: 'textarea', name: 'description', label: 'Description', required: true, placeholder: 'Describe your request' },
        { type: 'select', name: 'priority', label: 'Priority', required: true, options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Critical', value: 'critical' }
        ]},
        { type: 'date', name: 'neededBy', label: 'Needed By Date', required: false, placeholder: 'Select date needed' }
      ];
    }

    // Default generic form
    return [
      { type: 'text', name: 'title', label: 'Title', required: true, placeholder: 'Enter title' },
      { type: 'textarea', name: 'description', label: 'Description', required: true, placeholder: 'Enter description' },
      { type: 'text', name: 'reference', label: 'Reference Number', required: false, placeholder: 'Enter reference' },
      { type: 'date', name: 'date', label: 'Date', required: false, placeholder: 'Select date' },
      { type: 'textarea', name: 'notes', label: 'Additional Notes', required: false, placeholder: 'Enter any additional notes' }
    ];
  }

  mapDataModelTypeToFormType(dataModelType) {
    const typeMap = {
      'string': 'text',
      'text': 'text',
      'longtext': 'textarea',
      'number': 'number',
      'integer': 'number',
      'float': 'number',
      'decimal': 'number',
      'boolean': 'checkbox',
      'date': 'date',
      'datetime': 'date',
      'email': 'email',
      'phone': 'phone',
      'file': 'file',
      'enum': 'select',
      'array': 'select'
    };
    return typeMap[dataModelType?.toLowerCase()] || 'text';
  }

  formatLabel(fieldName) {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
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
        input: { ...baseInput, minHeight: '100px' },
        helpText: { fontSize: '13px', color: '#6b7280', marginTop: '6px' }
      };
    }

    return {
      container: { marginBottom: '24px' },
      label: { fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' },
      input: { ...baseInput, height: '40px' },
      helpText: { fontSize: '13px', color: '#6b7280', marginTop: '6px' }
    };
  }
}

module.exports = new AIFormGenerator();
