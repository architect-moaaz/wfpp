const { workflowKnowledgeBase, searchComponents, getRecommendedPattern } = require('../utils/workflow-knowledge-base');
const { FORM_COMPONENT_CATALOG } = require('../utils/form-components-knowledge-base');
const Anthropic = require('@anthropic-ai/sdk');
const formDatabase = require('../database/FormDatabase');
const dataModelDatabase = require('../database/DataModelDatabase');
const pageDatabase = require('../database/PageDatabase');
const applicationService = require('./ApplicationService');
const AgentOrchestrator = require('./agents/AgentOrchestrator');
const MoEOrchestrator = require('./moe/MoEOrchestrator');

/**
 * AI Workflow Generator Service
 * Generates workflows from natural language requirements using RAG + Claude
 */

class AIWorkflowGenerator {
  constructor() {
    this.knowledgeBase = workflowKnowledgeBase;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'your_api_key_here'
    });
    this.useLLM = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here';
    this.useMoE = process.env.USE_MOE === 'true' || false; // Enable Mixture of Experts via env var
    this.useMultiAgent = process.env.USE_MULTI_AGENT === 'true' || false; // Enable via env var
    this.moeOrchestrator = new MoEOrchestrator();
    this.orchestrator = new AgentOrchestrator();
  }

  /**
   * Check if message is a greeting or conversational (not a workflow request)
   */
  isConversational(message) {
    const lowerMsg = message.toLowerCase().trim();
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    const questions = ['how are you', 'what can you do', 'help', 'who are you'];

    return greetings.some(g => lowerMsg === g) ||
           questions.some(q => lowerMsg.includes(q)) ||
           lowerMsg.length < 10; // Very short messages are likely conversational
  }

  /**
   * Generate workflow from user requirements
   * @param {string} userRequirements - Natural language description
   * @returns {object} Generated workflow with thinking process
   */
  async generateWorkflow(userRequirements) {
    const thinking = [];

    // Check if this is just a greeting or conversational message
    if (this.isConversational(userRequirements)) {
      thinking.push({
        step: "Understanding Message",
        content: `This appears to be a conversational message rather than a workflow request.`
      });

      return {
        thinking,
        workflow: { nodes: [], connections: [] },
        summary: {
          title: "Ready to Help!",
          description: "I understand you'd like to chat! To create a workflow, please describe what you want to build. For example:\n\n• 'Build an expense approval workflow'\n• 'Create a customer onboarding process'\n• 'Design an automated data processing workflow'\n\nWhat workflow would you like to create?",
          nodeCount: 0,
          connectionCount: 0,
          components: "No workflow generated yet"
        }
      };
    }

    const nodes = [];
    const connections = [];

    // Step 1: Analyze requirements
    thinking.push({
      step: "Analyzing Requirements",
      content: `Understanding the user's request: "${userRequirements}"`
    });

    const analysis = this.analyzeRequirements(userRequirements);
    thinking.push({
      step: "Analysis Complete",
      content: `Identified workflow type: ${analysis.workflowType}\nKey components needed: ${analysis.components.join(', ')}`
    });

    // Step 2: Search knowledge base for relevant components
    thinking.push({
      step: "Searching Knowledge Base",
      content: "Finding relevant workflow components using RAG..."
    });

    const relevantComponents = this.findRelevantComponents(userRequirements);
    thinking.push({
      step: "Components Retrieved",
      content: `Found ${relevantComponents.length} relevant components:\n${relevantComponents.map(c => `- ${c.name}: ${c.description}`).join('\n')}`
    });

    // Step 3: Get recommended pattern
    const pattern = getRecommendedPattern(userRequirements);
    thinking.push({
      step: "Pattern Selection",
      content: `Recommended pattern: ${pattern.name}\n${pattern.description}`
    });

    // Step 4: Generate workflow structure
    thinking.push({
      step: "Generating Workflow",
      content: "Creating workflow nodes and connections..."
    });

    const workflow = this.buildWorkflow(userRequirements, analysis, relevantComponents, pattern);

    thinking.push({
      step: "Workflow Created",
      content: `Successfully generated workflow with ${workflow.nodes.length} nodes and ${workflow.connections.length} connections`
    });

    return {
      thinking,
      workflow,
      summary: this.generateSummary(workflow, userRequirements)
    };
  }

  /**
   * Analyze user requirements and extract key information
   */
  analyzeRequirements(requirements) {
    const lowerReq = requirements.toLowerCase();

    let workflowType = "sequential";
    const components = [];
    const keywords = [];

    // Detect workflow type
    if (lowerReq.includes('approval') || lowerReq.includes('review')) {
      workflowType = "approval";
      components.push('userTask', 'decision');
      keywords.push('approval', 'review');
    }

    if (lowerReq.includes('notification') || lowerReq.includes('email') || lowerReq.includes('notify')) {
      components.push('notification');
      keywords.push('notification');
    }

    if (lowerReq.includes('validate') || lowerReq.includes('check') || lowerReq.includes('verify')) {
      components.push('validation');
      keywords.push('validation');
    }

    if (lowerReq.includes('process') || lowerReq.includes('transform') || lowerReq.includes('calculate')) {
      components.push('dataProcess', 'scriptTask');
      keywords.push('processing');
    }

    if (lowerReq.includes('wait') || lowerReq.includes('delay') || lowerReq.includes('schedule')) {
      components.push('timerEvent');
      keywords.push('timing');
    }

    if (lowerReq.includes('if') || lowerReq.includes('condition') || lowerReq.includes('based on')) {
      components.push('decision');
      keywords.push('conditional');
    }

    if (lowerReq.includes('parallel') || lowerReq.includes('multiple') || lowerReq.includes('concurrent')) {
      workflowType = "parallel";
      components.push('decision');
      keywords.push('parallel');
    }

    return {
      workflowType,
      components: [...new Set(components)],
      keywords,
      requiresApproval: lowerReq.includes('approval') || lowerReq.includes('approve'),
      requiresNotification: lowerReq.includes('notification') || lowerReq.includes('notify') || lowerReq.includes('email'),
      requiresValidation: lowerReq.includes('validate') || lowerReq.includes('verify') || lowerReq.includes('check'),
      isAutomated: lowerReq.includes('automated') || lowerReq.includes('automatic')
    };
  }

  /**
   * Find relevant components from knowledge base
   */
  findRelevantComponents(requirements) {
    const words = requirements.toLowerCase().split(/\s+/);
    const relevantComponents = [];
    const seen = new Set();

    // Search for each word
    words.forEach(word => {
      if (word.length > 3) { // Skip short words
        const found = searchComponents(word);
        found.forEach(comp => {
          if (!seen.has(comp.type)) {
            relevantComponents.push(comp);
            seen.add(comp.type);
          }
        });
      }
    });

    // Ensure we always have start and end events
    if (!seen.has('startProcess')) {
      relevantComponents.unshift(
        this.knowledgeBase.components.find(c => c.type === 'startProcess')
      );
    }
    if (!seen.has('endEvent')) {
      relevantComponents.push(
        this.knowledgeBase.components.find(c => c.type === 'endEvent')
      );
    }

    return relevantComponents;
  }

  /**
   * Build actual workflow structure
   */
  buildWorkflow(requirements, analysis, relevantComponents, pattern) {
    const nodes = [];
    const connections = [];
    let yPos = 100;
    const xPos = 300;
    const yGap = 250; // Increased from 180 to prevent node overlap

    // Helper to create node
    const createNode = (type, label, data = {}) => {
      const nodeId = `node_${nodes.length + 1}`;
      nodes.push({
        id: nodeId,
        type,
        position: { x: xPos, y: yPos },
        data: { label, ...data }
      });
      yPos += yGap;
      return nodeId;
    };

    // Start Event
    const startId = createNode('startProcess', 'Start Process', {
      trigger: 'User Request',
      description: requirements
    });
    let previousId = startId;

    // Add validation if needed
    if (analysis.requiresValidation) {
      const validationId = createNode('validation', 'Validate Input', {
        ruleType: 'Data Validation',
        description: 'Validate required fields and data integrity'
      });
      connections.push({
        id: `edge_${connections.length + 1}`,
        source: previousId,
        target: validationId
      });
      previousId = validationId;
    }

    // Add data processing if needed
    if (analysis.components.includes('dataProcess') || analysis.components.includes('scriptTask')) {
      if (analysis.isAutomated) {
        // Generate actual JavaScript code for the script task
        const scriptCode = `// Automated data processing
processData.processed = true;
processData.processedAt = new Date().toISOString();
console.log('Data processing completed');`;

        const scriptId = createNode('scriptTask', 'Process Data', {
          scriptType: 'JavaScript',
          description: 'Automated data processing',
          script: scriptCode
        });
        connections.push({
          id: `edge_${connections.length + 1}`,
          source: previousId,
          target: scriptId
        });
        previousId = scriptId;
      } else {
        const processId = createNode('dataProcess', 'Process Data', {
          operation: 'Transform',
          description: 'Process and transform data'
        });
        connections.push({
          id: `edge_${connections.length + 1}`,
          source: previousId,
          target: processId
        });
        previousId = processId;
      }
    }

    // Add approval if needed
    if (analysis.requiresApproval) {
      const taskId = createNode('userTask', 'Review & Approve', {
        taskName: 'Approval Required',
        assignedTo: 'Manager',
        priority: 'High',
        instructions: 'Please review and approve this request'
      });
      connections.push({
        id: `edge_${connections.length + 1}`,
        source: previousId,
        target: taskId
      });
      previousId = taskId;

      // Add decision after approval
      const decisionId = createNode('decision', 'Approved?', {
        gatewayType: 'exclusive',
        condition: 'Approval Status',
        description: 'Check if request was approved'
      });
      connections.push({
        id: `edge_${connections.length + 1}`,
        source: previousId,
        target: decisionId
      });
      previousId = decisionId;
    } else if (analysis.components.includes('decision')) {
      const decisionId = createNode('decision', 'Decision Point', {
        gatewayType: analysis.workflowType === 'parallel' ? 'parallel' : 'exclusive',
        condition: 'Evaluate condition',
        description: 'Route based on condition'
      });
      connections.push({
        id: `edge_${connections.length + 1}`,
        source: previousId,
        target: decisionId
      });
      previousId = decisionId;
    }

    // Add notification if needed
    if (analysis.requiresNotification) {
      const notificationId = createNode('notification', 'Send Notification', {
        channel: 'Email',
        recipient: 'User',
        description: 'Send status notification'
      });
      connections.push({
        id: `edge_${connections.length + 1}`,
        source: previousId,
        target: notificationId
      });
      previousId = notificationId;
    }

    // End Event
    const endId = createNode('endEvent', 'Process Complete', {
      result: 'Success',
      description: 'Workflow completed successfully'
    });
    connections.push({
      id: `edge_${connections.length + 1}`,
      source: previousId,
      target: endId
    });

    return { nodes, connections };
  }

  /**
   * Generate form using Claude AI with form components knowledge base
   */
  async generateFormWithAI(node, workflowId, workflowName) {
    try {
      const nodeLabel = node.data.label || node.data.taskName || 'Form';
      const nodeType = node.type === 'startProcess' ? 'start/initiation' : 'user task';

      const prompt = `Generate a form for a ${nodeType} node in a "${workflowName}" workflow.

Node Details:
- Label: ${nodeLabel}
- Description: ${node.data.description || 'No description'}
- Context: ${JSON.stringify(node.data, null, 2)}

${FORM_COMPONENT_CATALOG}

Generate an appropriate form using the component catalog above. Return ONLY valid JSON in this format:
{
  "name": "descriptive_form_name",
  "title": "Human Readable Form Title",
  "description": "Brief description",
  "fields": [
    {
      "id": "unique_field_id",
      "name": "field_name",
      "label": "Field Label",
      "type": "component_type_from_catalog",
      "required": true/false,
      "placeholder": "helpful placeholder",
      "properties": {
        // component-specific properties from catalog
      }
    }
  ]
}

Guidelines:
1. Use appropriate component types from the catalog for the data being collected
2. Generate 3-7 relevant fields based on the workflow context
3. Use descriptive field names (snake_case)
4. Set reasonable validation rules
5. Add helpful placeholders and tooltips
6. For start forms: include requestor info, date, description, priority
7. For user tasks: include approval/decision fields, comments, reviewer info

Return ONLY the JSON, no markdown or explanations.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const formSpec = JSON.parse(jsonMatch[0]);

        // Create form with proper structure
        return {
          id: `form_${workflowId}_${node.id}`,
          name: formSpec.name || `${node.id}_form`,
          title: formSpec.title || nodeLabel,
          description: formSpec.description || '',
          nodeType: node.type,
          workflowId: workflowId,
          fields: formSpec.fields || [],
          version: '1.0',
          createdAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('AI form generation failed:', error);
      // Fallback to rule-based generation
      return this.generateFormForNode(node, workflowId, workflowName);
    }

    return null;
  }

  /**
   * Generate and save forms for workflow nodes
   */
  async generateAndSaveForms(workflow, workflowId, workflowName) {
    const forms = [];

    // Process all nodes that can have forms (startProcess, userTask)
    for (const node of workflow.nodes) {
      if (node.type === 'startProcess' || node.type === 'userTask') {
        // Use AI if available, otherwise fallback to rule-based
        const form = this.useLLM
          ? await this.generateFormWithAI(node, workflowId, workflowName)
          : this.generateFormForNode(node, workflowId, workflowName);

        if (form) {
          forms.push(form);
          // Attach form reference to node
          node.data.formId = form.id;
          node.data.formName = form.name;
        }
      }
    }

    // Save forms to database
    if (forms.length > 0) {
      await formDatabase.saveForms(forms);
      console.log(`[AIWorkflowGenerator] Generated and saved ${forms.length} forms`);
    }

    return forms;
  }

  /**
   * Generate form definition for a node
   */
  generateFormForNode(node, workflowId, workflowName) {
    let formName, formTitle, fields;

    if (node.type === 'startProcess') {
      formName = `${workflowName.replace(/\s+/g, '_')}_Start_Form`;
      formTitle = `${workflowName} - Initiation Form`;
      fields = [
        {
          id: 'requestor_name',
          name: 'requestor_name',
          label: 'Requestor Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your name'
        },
        {
          id: 'requestor_email',
          name: 'requestor_email',
          label: 'Email',
          type: 'email',
          required: true,
          placeholder: 'your.email@company.com'
        },
        {
          id: 'request_date',
          name: 'request_date',
          label: 'Request Date',
          type: 'date',
          required: true,
          defaultValue: new Date().toISOString().split('T')[0]
        },
        {
          id: 'description',
          name: 'description',
          label: 'Description',
          type: 'textarea',
          required: true,
          placeholder: 'Enter description',
          rows: 4
        },
        {
          id: 'priority',
          name: 'priority',
          label: 'Priority',
          type: 'select',
          required: true,
          options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' }
          ],
          defaultValue: 'medium'
        }
      ];
    } else if (node.type === 'userTask') {
      const taskName = node.data.label || node.data.taskName || 'User Task';
      formName = `${taskName.replace(/\s+/g, '_')}_Form`;
      formTitle = taskName;

      // Generate fields based on task type
      fields = node.data.formFields || [
        {
          id: 'approved',
          name: 'approved',
          label: 'Approved',
          type: 'radio',
          required: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' }
          ]
        },
        {
          id: 'comments',
          name: 'comments',
          label: 'Comments',
          type: 'textarea',
          required: false,
          placeholder: 'Add your comments here',
          rows: 3
        },
        {
          id: 'reviewer_name',
          name: 'reviewer_name',
          label: 'Reviewer Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your name'
        },
        {
          id: 'review_date',
          name: 'review_date',
          label: 'Review Date',
          type: 'date',
          required: true,
          defaultValue: new Date().toISOString().split('T')[0]
        }
      ];
    } else {
      return null;
    }

    return {
      id: `form_${workflowId}_${node.id}`,
      name: formName,
      title: formTitle,
      description: node.data.description || `Form for ${formTitle}`,
      workflowId: workflowId,
      nodeId: node.id,
      nodeType: node.type,
      fields: fields,
      version: '1.0'
    };
  }

  /**
   * Generate and save data models for workflow
   */
  async generateAndSaveDataModels(workflow, workflowId, workflowName) {
    const dataModels = this.generateDataModelsFromWorkflow(workflow, workflowId, workflowName);

    if (dataModels.length > 0) {
      await dataModelDatabase.saveDataModels(dataModels);
      console.log(`[AIWorkflowGenerator] Generated and saved ${dataModels.length} data models`);
    }

    return dataModels;
  }

  /**
   * Generate data models based on workflow analysis
   */
  generateDataModelsFromWorkflow(workflow, workflowId, workflowName) {
    const dataModels = [];
    const baseEntityName = workflowName.replace(/\s+Workflow$/i, '').replace(/\s+/g, '');

    // Main entity based on workflow type
    const mainEntity = {
      id: `model_${workflowId}_main`,
      name: baseEntityName,
      displayName: workflowName.replace(/\s+Workflow$/i, ''),
      workflowId: workflowId,
      description: `Main entity for ${workflowName}`,
      fields: [
        {
          name: 'id',
          type: 'string',
          required: true,
          primaryKey: true,
          description: 'Unique identifier'
        },
        {
          name: 'status',
          type: 'string',
          required: true,
          description: 'Current status of the process'
        },
        {
          name: 'createdAt',
          type: 'datetime',
          required: true,
          description: 'Creation timestamp'
        },
        {
          name: 'updatedAt',
          type: 'datetime',
          required: true,
          description: 'Last update timestamp'
        },
        {
          name: 'createdBy',
          type: 'string',
          required: true,
          description: 'User who created the record'
        }
      ],
      relationships: [],
      version: '1.0'
    };

    // Add fields based on form data if available
    for (const node of workflow.nodes) {
      if (node.type === 'startProcess' && node.data.formName) {
        // Add fields from start form to main entity
        mainEntity.fields.push(
          {
            name: 'requestorName',
            type: 'string',
            required: true,
            description: 'Name of the requestor'
          },
          {
            name: 'requestorEmail',
            type: 'string',
            required: true,
            description: 'Email of the requestor'
          },
          {
            name: 'priority',
            type: 'string',
            required: false,
            description: 'Priority level'
          }
        );
      }
    }

    dataModels.push(mainEntity);

    // Generate TaskHistory entity for tracking
    const taskHistoryEntity = {
      id: `model_${workflowId}_taskhistory`,
      name: `${baseEntityName}TaskHistory`,
      displayName: `${workflowName.replace(/\s+Workflow$/i, '')} Task History`,
      workflowId: workflowId,
      description: 'Task execution history',
      fields: [
        {
          name: 'id',
          type: 'string',
          required: true,
          primaryKey: true,
          description: 'Unique identifier'
        },
        {
          name: `${baseEntityName.toLowerCase()}Id`,
          type: 'string',
          required: true,
          foreignKey: true,
          references: mainEntity.name,
          description: `Reference to ${mainEntity.displayName}`
        },
        {
          name: 'taskName',
          type: 'string',
          required: true,
          description: 'Name of the task'
        },
        {
          name: 'taskType',
          type: 'string',
          required: true,
          description: 'Type of task'
        },
        {
          name: 'assignedTo',
          type: 'string',
          required: false,
          description: 'User assigned to the task'
        },
        {
          name: 'completedAt',
          type: 'datetime',
          required: false,
          description: 'Task completion timestamp'
        },
        {
          name: 'result',
          type: 'json',
          required: false,
          description: 'Task execution result'
        }
      ],
      relationships: [
        {
          type: 'manyToOne',
          targetModel: mainEntity.name,
          foreignKey: `${baseEntityName.toLowerCase()}Id`,
          description: `Each task history belongs to one ${mainEntity.displayName}`
        }
      ],
      version: '1.0'
    };

    dataModels.push(taskHistoryEntity);

    // Add relationship to main entity
    mainEntity.relationships.push({
      type: 'oneToMany',
      targetModel: taskHistoryEntity.name,
      foreignKey: `${baseEntityName.toLowerCase()}Id`,
      description: `One ${mainEntity.displayName} has many task histories`
    });

    // Generate Document entity if workflow involves document management
    const hasDocumentHandling = workflow.nodes.some(node =>
      node.data.label?.toLowerCase().includes('document') ||
      node.data.label?.toLowerCase().includes('file') ||
      node.data.label?.toLowerCase().includes('upload')
    );

    if (hasDocumentHandling) {
      const documentEntity = {
        id: `model_${workflowId}_document`,
        name: `${baseEntityName}Document`,
        displayName: `${workflowName.replace(/\s+Workflow$/i, '')} Document`,
        workflowId: workflowId,
        description: 'Documents associated with the workflow',
        fields: [
          {
            name: 'id',
            type: 'string',
            required: true,
            primaryKey: true,
            description: 'Unique identifier'
          },
          {
            name: `${baseEntityName.toLowerCase()}Id`,
            type: 'string',
            required: true,
            foreignKey: true,
            references: mainEntity.name,
            description: `Reference to ${mainEntity.displayName}`
          },
          {
            name: 'fileName',
            type: 'string',
            required: true,
            description: 'Name of the file'
          },
          {
            name: 'fileType',
            type: 'string',
            required: true,
            description: 'MIME type of the file'
          },
          {
            name: 'fileSize',
            type: 'number',
            required: true,
            description: 'Size in bytes'
          },
          {
            name: 'filePath',
            type: 'string',
            required: true,
            description: 'Storage path or URL'
          },
          {
            name: 'uploadedBy',
            type: 'string',
            required: true,
            description: 'User who uploaded the file'
          },
          {
            name: 'uploadedAt',
            type: 'datetime',
            required: true,
            description: 'Upload timestamp'
          }
        ],
        relationships: [
          {
            type: 'manyToOne',
            targetModel: mainEntity.name,
            foreignKey: `${baseEntityName.toLowerCase()}Id`,
            description: `Each document belongs to one ${mainEntity.displayName}`
          }
        ],
        version: '1.0'
      };

      dataModels.push(documentEntity);

      // Add relationship to main entity
      mainEntity.relationships.push({
        type: 'oneToMany',
        targetModel: documentEntity.name,
        foreignKey: `${baseEntityName.toLowerCase()}Id`,
        description: `One ${mainEntity.displayName} has many documents`
      });
    }

    return dataModels;
  }

  /**
   * Bind data models to workflow nodes
   */
  bindDataModelsToWorkflow(workflow, dataModels) {
    if (!dataModels || dataModels.length === 0) return;

    // Find main entity (not task history or document)
    const mainEntity = dataModels.find(dm =>
      !dm.name.includes('TaskHistory') && !dm.name.includes('Document')
    );

    const taskHistoryEntity = dataModels.find(dm => dm.name.includes('TaskHistory'));
    const documentEntity = dataModels.find(dm => dm.name.includes('Document'));

    // Bind data models to nodes
    workflow.nodes.forEach(node => {
      switch (node.type) {
        case 'startProcess':
          // Start process creates main entity
          if (mainEntity) {
            node.data.dataModel = mainEntity.name;
            node.data.dataModelId = mainEntity.id;
            node.data.dataModelAction = 'create';
          }
          break;

        case 'userTask':
          // User tasks read and update main entity
          if (mainEntity) {
            node.data.dataModel = mainEntity.name;
            node.data.dataModelId = mainEntity.id;
            node.data.dataModelAction = 'update';
          }
          // Also create task history
          if (taskHistoryEntity) {
            node.data.taskHistoryModel = taskHistoryEntity.name;
            node.data.taskHistoryModelId = taskHistoryEntity.id;
          }
          break;

        case 'dataProcess':
          // Data process nodes work with main entity
          if (mainEntity) {
            node.data.dataModel = mainEntity.name;
            node.data.dataModelId = mainEntity.id;
            node.data.dataModelAction = 'transform';
          }
          break;

        case 'validation':
          // Validation reads main entity
          if (mainEntity) {
            node.data.dataModel = mainEntity.name;
            node.data.dataModelId = mainEntity.id;
            node.data.dataModelAction = 'read';
          }
          break;

        case 'scriptTask':
          // Script tasks might work with any entity
          if (mainEntity) {
            node.data.dataModel = mainEntity.name;
            node.data.dataModelId = mainEntity.id;
            node.data.dataModelAction = 'process';
          }
          break;

        default:
          // Other node types might not need data models
          break;
      }

      // If node mentions documents, attach document entity
      const nodeLabel = (node.data.label || '').toLowerCase();
      if (documentEntity && (
        nodeLabel.includes('document') ||
        nodeLabel.includes('file') ||
        nodeLabel.includes('upload')
      )) {
        node.data.documentModel = documentEntity.name;
        node.data.documentModelId = documentEntity.id;
      }
    });

    // Add data models list to workflow metadata
    workflow.dataModels = dataModels.map(dm => ({
      id: dm.id,
      name: dm.name,
      displayName: dm.displayName
    }));

    console.log(`[AIWorkflowGenerator] Bound ${dataModels.length} data model(s) to workflow nodes`);
  }

  /**
   * Extract workflow name from requirements
   */
  extractWorkflowName(requirements) {
    // Simple extraction - take first few words and capitalize
    const words = requirements.split(' ').slice(0, 4);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Workflow';
  }

  /**
   * Generate summary of the workflow
   */
  generateSummary(workflow, requirements) {
    return {
      title: "Workflow Generated Successfully",
      description: `Created a workflow based on: "${requirements}"`,
      nodeCount: workflow.nodes.length,
      connectionCount: workflow.connections.length,
      components: workflow.nodes.map(n => n.data.label).join(' → ')
    };
  }

  /**
   * Generate workflow with real-time streaming updates (LLM-powered)
   * @param {string} userRequirements - Natural language description
   * @param {function} emitEvent - Callback to emit events in real-time
   * @param {object} existingWorkflow - Optional existing workflow to modify
   * @param {array} conversationHistory - Optional conversation history for context
   */
  async generateWorkflowStreamWithLLM(userRequirements, emitEvent, existingWorkflow = null, conversationHistory = []) {
    try {
      // Emit start event
      emitEvent({
        type: 'workflow-generation-started',
        data: { message: 'Connecting to Claude AI...' }
      });

      await this.sleep(200);

      // Inform about existing workflow if present
      if (existingWorkflow && existingWorkflow.nodes && existingWorkflow.nodes.length > 0) {
        emitEvent({
          type: 'thinking-step',
          data: {
            step: 'Analyzing Existing Workflow',
            content: `Detected existing workflow with ${existingWorkflow.nodes.length} nodes and ${existingWorkflow.connections?.length || 0} connections.\n\nExisting nodes:\n${existingWorkflow.nodes.map((n, i) => `${i + 1}. ${n.data.label} (${n.type}, id: ${n.id})`).join('\n')}\n\nI will intelligently edit this workflow, preserving unchanged nodes and their positions.`
          }
        });
        await this.sleep(400);
      }

      // Step 1: Retrieve relevant components from knowledge base (RAG)
      emitEvent({
        type: 'thinking-step',
        data: {
          step: 'Searching Knowledge Base',
          content: 'Finding relevant workflow components using RAG...'
        }
      });

      const relevantComponents = this.findRelevantComponents(userRequirements);
      const pattern = getRecommendedPattern(userRequirements);

      await this.sleep(300);

      emitEvent({
        type: 'thinking-step',
        data: {
          step: 'Components Retrieved',
          content: `Found ${relevantComponents.length} relevant components:\n${relevantComponents.map(c => `- ${c.name}: ${c.description}`).slice(0, 5).join('\n')}`
        }
      });

      await this.sleep(200);

      // Prepare context for Claude
      const componentsContext = JSON.stringify(relevantComponents, null, 2);
      const patternsContext = JSON.stringify(this.knowledgeBase.workflowPatterns, null, 2);

      let existingWorkflowContext = '';
      let taskDescription = 'generate a workflow';
      let conversationContext = '';

      // Add conversation context if history exists
      if (conversationHistory && conversationHistory.length > 1) {
        conversationContext = `\n\nCONVERSATION CONTEXT:
You are having an ongoing conversation with the user. Previous messages are included in the chat history.
- Remember what was discussed previously
- Build upon previous workflows if the user asks for modifications
- Understand references to "it", "that workflow", "the previous one" etc.
- Maintain consistency with earlier decisions unless explicitly asked to change`;
      }

      if (existingWorkflow && existingWorkflow.nodes && existingWorkflow.nodes.length > 0) {
        existingWorkflowContext = `\n\n⚠️ CRITICAL: EXISTING WORKFLOW ON CANVAS ⚠️
${JSON.stringify(existingWorkflow, null, 2)}

🚨 MANDATORY EDITING RULES - YOU MUST FOLLOW THESE 🚨

The user has an existing workflow with ${existingWorkflow.nodes.length} nodes. When they ask to "add", "modify", or "edit", you MUST preserve the existing workflow and make incremental changes.

🔴 DEFAULT BEHAVIOR: PRESERVE EVERYTHING 🔴
Unless explicitly told to delete/remove/replace something, KEEP ALL EXISTING NODES EXACTLY AS THEY ARE.

RULE 1: ADDING NEW COMPONENTS (keywords: "add", "include", "also add", "insert")
When user says "add X" or "also add X":
✅ DO: Copy ALL existing nodes to your output (same IDs, same positions, same data)
✅ DO: Add new nodes AFTER the existing ones with new IDs
✅ DO: Keep all existing connections
✅ DO: Add new connections for the new nodes
❌ DON'T: Delete any existing nodes
❌ DON'T: Change existing node IDs or positions
❌ DON'T: Generate a completely new workflow

RULE 2: REMOVING COMPONENTS (keywords: "remove", "delete", "take out")
When user says "remove X":
✅ DO: Copy all nodes EXCEPT the one being removed
✅ DO: Remove connections to/from the deleted node
✅ DO: Update connections to maintain flow
❌ DON'T: Remove unrelated nodes

RULE 3: MODIFYING COMPONENTS (keywords: "change", "update", "modify", "edit")
When user says "change X to Y":
✅ DO: Keep the same node ID and position
✅ DO: Only update the specific property mentioned
❌ DON'T: Create a new node
❌ DON'T: Change other properties

RULE 4: COMPLETE REPLACEMENT (keywords: "start over", "create new", "replace everything", "completely new")
ONLY generate a completely new workflow if user explicitly says:
- "start over"
- "create a new workflow"
- "replace everything"
- "start fresh"
- "completely new workflow"

📝 DETAILED EXAMPLES:

Example 1 - ADDING:
User: "Add document verification"
Existing: [Start → Approval → End]
Correct Output: [Start → Approval → Document Verification → End]
❌ Wrong: [Start → Document Verification → End] (deleted Approval!)

Example 2 - ADDING TO EXISTING FLOW:
User: "Add the flow for document verification as well"
Existing: [Start → Loan Processing → Credit Check → End]
Correct Output: [Start → Loan Processing → Credit Check → Document Verification → End]
✅ ALL original nodes preserved, document verification ADDED

Example 3 - MODIFYING:
User: "Change approval to manager"
Existing: node_2 with assignedTo: "Supervisor"
Correct Output: Same node_2, same position, only assignedTo: "Manager"

Example 4 - REMOVING:
User: "Remove the validation step"
Existing: [Start → Validation → Process → End]
Correct Output: [Start → Process → End]

🎯 HOW TO PROCESS THE REQUEST:
1. Look at the existing workflow nodes and their IDs
2. Determine the highest node ID number (e.g., if "node_5" exists, highest is 5)
3. Keep ALL existing nodes in your output
4. Add new nodes with IDs starting from highest + 1
5. Preserve existing node positions
6. Position new nodes with y-spacing of 180px from related nodes
7. Keep all existing connections
8. Add new connections for new nodes

💡 REMEMBER: The user spent time creating this workflow. Respect their work by preserving it unless explicitly told to delete/replace.`;
        taskDescription = 'intelligently edit and modify the existing workflow based on';
      }

      const systemPrompt = `You are an expert workflow designer. Your task is to ${taskDescription} user requirements.${conversationContext}

Available Workflow Components:
${componentsContext}

Common Workflow Patterns:
${patternsContext}${existingWorkflowContext}

Instructions:
1. Analyze the user's requirements carefully
2. If there's an existing workflow, decide whether to modify it or create a new one
3. Select appropriate components from the available list
4. Generate a workflow with nodes and connections
5. Return ONLY valid JSON in this exact format:
{
  "nodes": [
    {
      "id": "node_1",
      "type": "startProcess|endEvent|userTask|scriptTask|decision|validation|notification|dataProcess|timerEvent",
      "position": { "x": 250, "y": 100 },
      "data": {
        "label": "Node Label",
        "description": "Node description",
        // Additional properties specific to node type
      }
    }
  ],
  "connections": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    }
  ]
}

IMPORTANT:
- Use vertical layout with y increment of 180 between nodes (proper spacing to prevent overlap)
- Keep x at 300 for all nodes (centered layout)
- Start first node at y: 100
- Every workflow MUST start with "startProcess" type and end with "endEvent" type
- Ensure nodes are not stacked on top of each other
- Return ONLY the JSON, no explanations or markdown

CRITICAL - Script Task Requirements:
For scriptTask nodes, you MUST include valid, executable JavaScript code in the "script" field:
- The script field must contain actual JavaScript code that can be executed
- Use 'processData' object to read and modify workflow data
- Example valid script:
  "script": "processData.category = 'high_priority';\\nprocessData.processed = true;\\nconsole.log('Processing completed');"
- DO NOT use descriptions or pseudo-code - only valid JavaScript
- Common patterns:
  * Set values: processData.fieldName = 'value';
  * Read values: const value = processData.fieldName;
  * Conditionals: if (processData.amount > 1000) { processData.requiresApproval = true; }
  * Calculations: processData.total = processData.price * processData.quantity;
- Always end statements with semicolons
- Use \\n for line breaks in the JSON string`;

      emitEvent({
        type: 'thinking-step',
        data: {
          step: 'Consulting Claude AI',
          content: 'Generating workflow using Claude 3.5 Sonnet with conversation memory...'
        }
      });

      // Build messages array with conversation history
      const messages = [];

      // Add previous conversation messages (excluding system/initial greeting)
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.forEach(msg => {
          // Skip initial assistant greeting
          if (msg.role === 'assistant' && conversationHistory.indexOf(msg) === 0) {
            return;
          }
          messages.push({
            role: msg.role,
            content: msg.content
          });
        });
      }

      // Add current user request
      messages.push({
        role: 'user',
        content: `Generate a workflow for: ${userRequirements}`
      });

      // Stream from Claude
      const stream = await this.anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: messages,
        system: systemPrompt
      });

      let fullResponse = '';
      let thinkingContent = '';

      stream.on('text', (text) => {
        fullResponse += text;
        thinkingContent += text;

        // Emit thinking updates periodically
        if (thinkingContent.length > 100) {
          emitEvent({
            type: 'thinking-step',
            data: {
              step: 'AI Generating Workflow',
              content: `Processing: ${thinkingContent.substring(0, 200)}...`
            }
          });
          thinkingContent = '';
        }
      });

      await stream.finalMessage();

      emitEvent({
        type: 'thinking-step',
        data: {
          step: 'Parsing AI Response',
          content: 'Converting AI response to workflow structure...'
        }
      });

      // Parse the JSON response
      let workflow;
      try {
        // Extract JSON from response (in case Claude adds explanation text)
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          workflow = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse Claude response:', fullResponse);
        // Fallback to rule-based generation
        emitEvent({
          type: 'thinking-step',
          data: {
            step: 'Fallback to Rule-Based',
            content: 'AI response parsing failed, using rule-based generation...'
          }
        });
        workflow = this.buildWorkflow(userRequirements, this.analyzeRequirements(userRequirements), relevantComponents, pattern);
      }

      await this.sleep(200);

      emitEvent({
        type: 'thinking-step',
        data: {
          step: 'Workflow Created',
          content: `Successfully generated workflow with ${workflow.nodes?.length || 0} nodes and ${workflow.connections?.length || 0} connections`
        }
      });

      await this.sleep(200);

      // Generate forms for the workflow
      emitEvent({
        type: 'thinking-step',
        data: {
          step: 'Generating Forms',
          content: 'Creating form definitions for start events and user tasks...'
        }
      });

      const workflowId = workflow.id || `workflow_${Date.now()}`;
      const workflowName = workflow.name || this.extractWorkflowName(userRequirements);
      const forms = await this.generateAndSaveForms(workflow, workflowId, workflowName);

      await this.sleep(200);

      if (forms.length > 0) {
        emitEvent({
          type: 'thinking-step',
          data: {
            step: 'Forms Created',
            content: `Generated ${forms.length} form(s):\n${forms.map(f => `- ${f.title} (${f.fields.length} fields)`).join('\n')}`
          }
        });
      }

      await this.sleep(200);

      // Generate data models for the workflow
      emitEvent({
        type: 'thinking-step',
        data: {
          step: 'Generating Data Models',
          content: 'Creating data model definitions for workflow data structures...'
        }
      });

      const dataModels = await this.generateAndSaveDataModels(workflow, workflowId, workflowName);

      await this.sleep(200);

      if (dataModels.length > 0) {
        emitEvent({
          type: 'thinking-step',
          data: {
            step: 'Data Models Created',
            content: `Generated ${dataModels.length} data model(s):\n${dataModels.map(dm => `- ${dm.displayName} (${dm.fields.length} fields)`).join('\n')}`
          }
        });

        // Bind data models to workflow nodes
        this.bindDataModelsToWorkflow(workflow, dataModels);

        emitEvent({
          type: 'thinking-step',
          data: {
            step: 'Data Models Bound',
            content: 'Attached data models to relevant workflow nodes'
          }
        });
      }

      await this.sleep(200);

      // Embed forms and data models into the workflow object
      // Making workflow the central piece
      workflow.forms = forms || [];
      workflow.dataModels = dataModels || [];
      workflow.metadata = {
        ...workflow.metadata,
        workflowId: workflowId,
        workflowName: workflowName,
        generatedAt: new Date().toISOString(),
        formsCount: forms.length,
        dataModelsCount: dataModels.length
      };

      // Send final workflow
      const summary = this.generateSummary(workflow, userRequirements);
      emitEvent({
        type: 'workflow-complete',
        data: {
          thinking: [], // Already sent via real-time events
          workflow,  // Now contains forms and dataModels embedded
          summary
        }
      });

    } catch (error) {
      console.error('LLM Generation Error:', error);
      emitEvent({
        type: 'error',
        data: {
          message: `AI Error: ${error.message}. Falling back to rule-based generation...`
        }
      });

      // Fallback to rule-based
      await this.generateWorkflowStreamRuleBased(userRequirements, emitEvent);
    }
  }

  /**
   * Generate workflow with real-time streaming updates (Rule-based fallback)
   * @param {string} userRequirements - Natural language description
   * @param {function} emitEvent - Callback to emit events in real-time
   * @param {object} existingWorkflow - Optional existing workflow to modify
   */
  async generateWorkflowStreamRuleBased(userRequirements, emitEvent, existingWorkflow = null) {
    // Emit start event
    emitEvent({
      type: 'workflow-generation-started',
      data: { message: 'Starting workflow generation...' }
    });

    // Small delay to simulate processing
    await this.sleep(300);

    // Check if conversational
    if (this.isConversational(userRequirements)) {
      emitEvent({
        type: 'thinking-step',
        data: {
          step: 'Understanding Message',
          content: 'This appears to be a conversational message rather than a workflow request.'
        }
      });

      await this.sleep(200);

      emitEvent({
        type: 'workflow-complete',
        data: {
          thinking: [{
            step: 'Understanding Message',
            content: 'This appears to be a conversational message rather than a workflow request.'
          }],
          workflow: { nodes: [], connections: [] },
          summary: {
            title: "Ready to Help!",
            description: "I understand you'd like to chat! To create a workflow, please describe what you want to build. For example:\n\n• 'Build an expense approval workflow'\n• 'Create a customer onboarding process'\n• 'Design an automated data processing workflow'\n\nWhat workflow would you like to create?",
            nodeCount: 0,
            connectionCount: 0,
            components: "No workflow generated yet"
          }
        }
      });

      return;
    }

    const allThinking = [];

    // Check if there's an existing workflow
    if (existingWorkflow && existingWorkflow.nodes && existingWorkflow.nodes.length > 0) {
      const contextStep = {
        step: 'Existing Workflow Detected',
        content: `Found existing workflow with ${existingWorkflow.nodes.length} nodes on canvas.\nNote: This rule-based system will generate a new workflow. For intelligent editing, Claude AI (LLM) is recommended.`
      };
      allThinking.push(contextStep);
      emitEvent({ type: 'thinking-step', data: contextStep });
      await this.sleep(300);
    }

    // Step 1: Analyzing
    const step1 = {
      step: 'Analyzing Requirements',
      content: `Understanding the user's request: "${userRequirements}"`
    };
    allThinking.push(step1);
    emitEvent({ type: 'thinking-step', data: step1 });
    await this.sleep(400);

    const analysis = this.analyzeRequirements(userRequirements);
    const step2 = {
      step: 'Analysis Complete',
      content: `Identified workflow type: ${analysis.workflowType}\nKey components needed: ${analysis.components.join(', ')}`
    };
    allThinking.push(step2);
    emitEvent({ type: 'thinking-step', data: step2 });
    await this.sleep(300);

    // Step 2: Searching knowledge base
    const step3 = {
      step: 'Searching Knowledge Base',
      content: 'Finding relevant workflow components using RAG...'
    };
    allThinking.push(step3);
    emitEvent({ type: 'thinking-step', data: step3 });
    await this.sleep(400);

    const relevantComponents = this.findRelevantComponents(userRequirements);
    const step4 = {
      step: 'Components Retrieved',
      content: `Found ${relevantComponents.length} relevant components:\n${relevantComponents.map(c => `- ${c.name}: ${c.description}`).join('\n')}`
    };
    allThinking.push(step4);
    emitEvent({ type: 'thinking-step', data: step4 });
    await this.sleep(300);

    // Step 3: Pattern selection
    const pattern = getRecommendedPattern(userRequirements);
    const step5 = {
      step: 'Pattern Selection',
      content: `Recommended pattern: ${pattern.name}\n${pattern.description}`
    };
    allThinking.push(step5);
    emitEvent({ type: 'thinking-step', data: step5 });
    await this.sleep(300);

    // Step 4: Building workflow
    const step6 = {
      step: 'Generating Workflow',
      content: 'Creating workflow nodes and connections...'
    };
    allThinking.push(step6);
    emitEvent({ type: 'thinking-step', data: step6 });
    await this.sleep(500);

    const workflow = this.buildWorkflow(userRequirements, analysis, relevantComponents, pattern);

    const step7 = {
      step: 'Workflow Created',
      content: `Successfully generated workflow with ${workflow.nodes.length} nodes and ${workflow.connections.length} connections`
    };
    allThinking.push(step7);
    emitEvent({ type: 'thinking-step', data: step7 });
    await this.sleep(200);

    // Generate forms for the workflow
    const step8 = {
      step: 'Generating Forms',
      content: 'Creating form definitions for start events and user tasks...'
    };
    allThinking.push(step8);
    emitEvent({ type: 'thinking-step', data: step8 });

    const workflowId = workflow.id || `workflow_${Date.now()}`;
    const workflowName = workflow.name || this.extractWorkflowName(userRequirements);
    const forms = await this.generateAndSaveForms(workflow, workflowId, workflowName);

    await this.sleep(200);

    if (forms.length > 0) {
      const step9 = {
        step: 'Forms Created',
        content: `Generated ${forms.length} form(s):\n${forms.map(f => `- ${f.title} (${f.fields.length} fields)`).join('\n')}`
      };
      allThinking.push(step9);
      emitEvent({ type: 'thinking-step', data: step9 });
    }

    await this.sleep(200);

    // Generate data models for the workflow
    const step10 = {
      step: 'Generating Data Models',
      content: 'Creating data model definitions for workflow data structures...'
    };
    allThinking.push(step10);
    emitEvent({ type: 'thinking-step', data: step10 });

    const dataModels = await this.generateAndSaveDataModels(workflow, workflowId, workflowName);

    await this.sleep(200);

    if (dataModels.length > 0) {
      const step11 = {
        step: 'Data Models Created',
        content: `Generated ${dataModels.length} data model(s):\n${dataModels.map(dm => `- ${dm.displayName} (${dm.fields.length} fields)`).join('\n')}`
      };
      allThinking.push(step11);
      emitEvent({ type: 'thinking-step', data: step11 });

      // Bind data models to workflow nodes
      this.bindDataModelsToWorkflow(workflow, dataModels);

      const step12 = {
        step: 'Data Models Bound',
        content: 'Attached data models to relevant workflow nodes'
      };
      allThinking.push(step12);
      emitEvent({ type: 'thinking-step', data: step12 });
    }

    await this.sleep(200);

    // Embed forms and data models into the workflow object
    // Making workflow the central piece
    workflow.forms = forms || [];
    workflow.dataModels = dataModels || [];
    workflow.metadata = {
      ...workflow.metadata,
      workflowId: workflowId,
      workflowName: workflowName,
      generatedAt: new Date().toISOString(),
      formsCount: forms.length,
      dataModelsCount: dataModels.length
    };

    // Final event with complete workflow
    const summary = this.generateSummary(workflow, userRequirements);
    emitEvent({
      type: 'workflow-complete',
      data: {
        thinking: allThinking,
        workflow,  // Now contains forms and dataModels embedded
        summary
      }
    });
  }

  /**
   * Main entry point - routes to LLM or rule-based generation
   * @param {string} userRequirements - Natural language description
   * @param {function} emitEvent - Callback to emit events in real-time
   * @param {object} existingWorkflow - Optional existing workflow to modify
   * @param {array} conversationHistory - Optional conversation history for context
   * @param {object} designInput - Optional design input (PDF, Figma, etc.)
   * @param {string} applicationId - Optional application ID to link resources
   */
  async generateWorkflowStream(userRequirements, emitEvent, existingWorkflow = null, conversationHistory = [], designInput = null, applicationId = null) {
    // Check generation mode priority: MoE > Multi-Agent > Single-Agent > Rule-Based
    if (this.useMoE && this.useLLM) {
      console.log('Using Mixture of Experts (MoE) for workflow generation');
      await this.generateWorkflowStreamMoE(userRequirements, emitEvent, existingWorkflow, conversationHistory, designInput, applicationId);
    } else if (this.useMultiAgent && this.useLLM) {
      console.log('Using Multi-Agent System for workflow generation');
      await this.generateWorkflowStreamMultiAgent(userRequirements, emitEvent, existingWorkflow, conversationHistory, applicationId);
    } else if (this.useLLM) {
      console.log('Using Claude AI for workflow generation with conversation history');
      await this.generateWorkflowStreamWithLLM(userRequirements, emitEvent, existingWorkflow, conversationHistory, applicationId);
    } else {
      console.log('Using rule-based generation (no API key configured)');
      await this.generateWorkflowStreamRuleBased(userRequirements, emitEvent, existingWorkflow, applicationId);
    }
  }

  /**
   * Generate workflow using Multi-Agent System
   * @param {string} userRequirements - Natural language description
   * @param {function} emitEvent - Callback to emit events in real-time
   * @param {object} existingWorkflow - Optional existing workflow to modify
   * @param {array} conversationHistory - Optional conversation history for context
   */
  async generateWorkflowStreamMultiAgent(userRequirements, emitEvent, existingWorkflow = null, conversationHistory = []) {
    try {
      console.log('Multi-Agent Generation Started:', {
        hasExistingWorkflow: !!existingWorkflow,
        conversationLength: conversationHistory.length
      });

      // Emit start event
      emitEvent({
        type: 'workflow-generation-started',
        data: { message: 'Initializing Multi-Agent System...' }
      });

      // Use the orchestrator to generate the complete workflow
      const result = await this.orchestrator.generateWorkflow(
        userRequirements,
        existingWorkflow,
        conversationHistory,
        emitEvent
      );

      // Emit completion event
      emitEvent({
        type: 'workflow-complete',
        data: result
      });

      console.log('Multi-Agent Generation Complete:', {
        nodes: result.workflow.nodes.length,
        forms: result.workflow.forms.length,
        dataModels: result.workflow.dataModels.length,
        mobileScreens: result.workflow.mobileUI?.screens?.length || 0
      });

    } catch (error) {
      console.error('Multi-Agent generation failed:', error);

      // Emit error event
      emitEvent({
        type: 'error',
        data: { message: error.message }
      });

      // Fallback to single-agent LLM generation
      console.log('Falling back to single-agent LLM generation...');
      await this.generateWorkflowStreamWithLLM(userRequirements, emitEvent, existingWorkflow, conversationHistory);
    }
  }

  /**
   * Generate workflow using Mixture of Experts (MoE) System
   * @param {string} userRequirements - Natural language description
   * @param {function} emitEvent - Callback to emit events in real-time
   * @param {object} existingWorkflow - Optional existing workflow to modify
   * @param {array} conversationHistory - Optional conversation history for context
   * @param {object} designInput - Optional design input
   * @param {string} applicationId - Optional application ID to link resources
   */
  async generateWorkflowStreamMoE(userRequirements, emitEvent, existingWorkflow = null, conversationHistory = [], designInput = null, applicationId = null) {
    try {
      console.log('MoE Generation Started:', {
        hasExistingWorkflow: !!existingWorkflow,
        conversationLength: conversationHistory.length,
        hasDesignInput: !!designInput
      });

      // Emit start event
      emitEvent({
        type: 'workflow-generation-started',
        data: { message: designInput ? 'Initializing Mixture of Experts with Design Analysis...' : 'Initializing Mixture of Experts System...' }
      });

      // Use the MoE orchestrator to generate the complete workflow
      const result = await this.moeOrchestrator.generateWorkflow(
        userRequirements,
        existingWorkflow,
        conversationHistory,
        emitEvent,
        designInput
      );

      // Save forms, data models, and pages to database
      if (result.workflow.forms && result.workflow.forms.length > 0) {
        // Make form IDs globally unique by prefixing with workflow ID
        const workflowId = result.workflow.id;
        const formIdMap = new Map(); // Map old form IDs to new unique IDs

        result.workflow.forms.forEach(form => {
          const oldFormId = form.id;
          const newFormId = `${workflowId}_${oldFormId}`;
          formIdMap.set(oldFormId, newFormId);
          form.id = newFormId;
          form.workflowId = workflowId;
        });

        // Update form IDs in workflow nodes to match the new unique IDs
        result.workflow.nodes.forEach(node => {
          if (node.data && node.data.formId && formIdMap.has(node.data.formId)) {
            node.data.formId = formIdMap.get(node.data.formId);
          }
        });

        await formDatabase.saveForms(result.workflow.forms);
        console.log(`[MoE] Saved ${result.workflow.forms.length} forms to database with unique IDs`);

        // Also add forms to application resources if applicationId is provided
        if (applicationId) {
          try {
            for (const form of result.workflow.forms) {
              await applicationService.addForm(applicationId, form);
            }
            console.log(`[MoE] Added ${result.workflow.forms.length} forms to application ${applicationId} resources`);
          } catch (error) {
            console.error(`[MoE] Failed to add forms to application resources:`, error);
          }
        }
      }

      if (result.workflow.dataModels && result.workflow.dataModels.length > 0) {
        await dataModelDatabase.saveDataModels(result.workflow.dataModels);
        console.log(`[MoE] Saved ${result.workflow.dataModels.length} data models to database`);

        // Also add data models to application resources if applicationId is provided
        if (applicationId) {
          try {
            for (const model of result.workflow.dataModels) {
              await applicationService.addDataModel(applicationId, model);
            }
            console.log(`[MoE] Added ${result.workflow.dataModels.length} data models to application ${applicationId} resources`);
          } catch (error) {
            console.error(`[MoE] Failed to add data models to application resources:`, error);
          }
        }
      }

      if (result.workflow.pages && result.workflow.pages.length > 0) {
        await pageDatabase.savePages(result.workflow.pages);
        console.log(`[MoE] Saved ${result.workflow.pages.length} pages to database`);

        // Also add pages to application resources if applicationId is provided
        if (applicationId) {
          try {
            for (const page of result.workflow.pages) {
              await applicationService.addPage(applicationId, page);
            }
            console.log(`[MoE] Added ${result.workflow.pages.length} pages to application ${applicationId} resources`);
          } catch (error) {
            console.error(`[MoE] Failed to add pages to application resources:`, error);
          }
        }
      }

      // Emit completion event
      emitEvent({
        type: 'workflow-complete',
        data: result
      });

      console.log('MoE Generation Complete:', {
        nodes: result.workflow.nodes?.length || 0,
        dataModels: result.workflow.dataModels?.length || 0,
        forms: result.workflow.forms?.length || 0,
        mobileScreens: result.workflow.mobileUI?.screens?.length || 0
      });

    } catch (error) {
      console.error('MoE generation failed:', error);

      // Don't emit error to user - instead emit fallback notification
      emitEvent({
        type: 'workflow-generation-started',
        data: { message: 'Optimizing workflow structure...' }
      });

      // Fallback to multi-agent generation silently
      console.log('Falling back to multi-agent generation...');
      await this.generateWorkflowStreamMultiAgent(userRequirements, emitEvent, existingWorkflow, conversationHistory);
    }
  }

  /**
   * Sleep helper for simulating processing time
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new AIWorkflowGenerator();
