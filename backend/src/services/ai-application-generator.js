const Anthropic = require('@anthropic-ai/sdk');
const ApplicationDatabase = require('../database/ApplicationDatabase');
const MoEOrchestrator = require('./moe/MoEOrchestrator');

/**
 * AI Application Generator Service
 * Generates complete applications from natural language using LLM + MOE
 */

class AIApplicationGenerator {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'your_api_key_here'
    });
    this.useLLM = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here';
    this.moeOrchestrator = new MoEOrchestrator();
    this.appDatabase = new ApplicationDatabase();
  }

  /**
   * Analyze user intent using LLM
   * Determines if user wants to create app, open app, edit workflow, etc.
   */
  async analyzeIntent(requirements, conversationHistory = []) {
    if (!this.useLLM) {
      // Fallback: simple keyword matching
      const lower = requirements.toLowerCase();
      if (lower.includes('create') || lower.includes('build') || lower.includes('new')) {
        return {
          intent: 'create_application',
          appType: this.extractAppType(requirements),
          description: requirements
        };
      } else if (lower.includes('open') || lower.includes('load')) {
        return {
          intent: 'open_application',
          appName: this.extractAppName(requirements)
        };
      } else {
        return {
          intent: 'edit_workflow',
          modification: requirements
        };
      }
    }

    // Use LLM for intent detection
    const prompt = this.buildIntentAnalysisPrompt(requirements, conversationHistory);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });

      // Clean the response text - remove markdown code blocks if present
      let responseText = response.content[0].text.trim();

      // Remove ```json and ``` markers if present
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      const result = JSON.parse(responseText.trim());
      return result;
    } catch (error) {
      console.error('Intent analysis error:', error);
      // Fallback to keyword matching
      return {
        intent: 'create_application',
        appType: this.extractAppType(requirements),
        description: requirements
      };
    }
  }

  /**
   * Build prompt for intent analysis
   */
  buildIntentAnalysisPrompt(requirements, conversationHistory) {
    const history = conversationHistory.slice(-5).map(msg =>
      `${msg.role}: ${msg.content}`
    ).join('\n');

    return `You are ARES, an intelligent application assistant. Analyze the user's intent.

Conversation History:
${history}

Current User Message: "${requirements}"

Determine the user's intent and respond with ONLY a JSON object (no other text):

{
  "intent": "create_application" | "open_application" | "edit_workflow" | "conversational",
  "appType": "the type of app (e.g., 'expense management', 'customer onboarding')",
  "appName": "name for the application",
  "description": "detailed description of what to build",
  "components": ["workflow", "forms", "dataModels", "pages", "mobileUI"] // which to generate
}

Examples:
- "Create an expense approval app" -> {"intent": "create_application", "appType": "expense management", "appName": "Expense Approval System", "description": "...", "components": [...]}
- "Open my customer portal" -> {"intent": "open_application", "appName": "customer portal"}
- "Add a notification step" -> {"intent": "edit_workflow", "modification": "add notification step"}
- "How are you?" -> {"intent": "conversational"}`;
  }

  /**
   * Extract app type from requirements (fallback)
   */
  extractAppType(requirements) {
    const keywords = {
      'expense': 'Expense Management',
      'approval': 'Approval System',
      'customer': 'Customer Management',
      'onboarding': 'Onboarding System',
      'leave': 'Leave Management',
      'project': 'Project Management',
      'ticket': 'Ticketing System',
      'inventory': 'Inventory Management'
    };

    const lower = requirements.toLowerCase();
    for (const [key, value] of Object.entries(keywords)) {
      if (lower.includes(key)) return value;
    }

    return 'Business Application';
  }

  /**
   * Extract app name from requirements (fallback)
   */
  extractAppName(requirements) {
    // Simple extraction - just take the text after "open" or "load"
    const match = requirements.match(/(?:open|load)\s+(?:the\s+)?(.+)/i);
    return match ? match[1].trim() : requirements;
  }

  /**
   * Generate complete application with streaming progress
   */
  async generateApplicationStream(requirements, emitEvent, conversationHistory = [], designInput = null) {
    const thinking = [];

    // Step 1: Analyze intent
    emitEvent({
      type: 'thinking-step',
      data: {
        step: 'Analyzing Intent',
        content: 'Understanding what you want to build...'
      }
    });

    const intent = await this.analyzeIntent(requirements, conversationHistory);
    thinking.push({
      step: 'Intent Analysis',
      content: `Intent: ${intent.intent}\nApp Type: ${intent.appType || 'N/A'}\nComponents to generate: ${intent.components?.join(', ') || 'All'}`
    });

    emitEvent({
      type: 'thinking-step',
      data: thinking[thinking.length - 1]
    });

    // If conversational, just respond
    if (intent.intent === 'conversational') {
      emitEvent({
        type: 'application-complete',
        data: {
          thinking,
          application: null,
          summary: {
            description: "I'm here to help! Please describe the application you'd like to create, or ask me to open an existing application."
          }
        }
      });
      return;
    }

    // If opening application, load it
    if (intent.intent === 'open_application') {
      await this.handleOpenApplication(intent.appName, emitEvent, thinking);
      return;
    }

    // If editing workflow, delegate to workflow generator
    if (intent.intent === 'edit_workflow') {
      emitEvent({
        type: 'application-complete',
        data: {
          thinking,
          shouldDelegateToWorkflow: true,
          summary: {
            description: "I'll help you edit the workflow. Switching to workflow editing mode..."
          }
        }
      });
      return;
    }

    // Step 2: Create application scaffold
    // Extract app name with fallback
    const appName = intent.appName || this.extractAppName(requirements) || 'Generated Application';

    emitEvent({
      type: 'thinking-step',
      data: {
        step: 'Creating Application',
        content: `Creating ${appName}...`
      }
    });

    const application = await this.appDatabase.create({
      name: appName,
      description: intent.description || requirements,
      type: intent.appType || 'Business Application',
      createdAt: new Date(),
      resources: {
        workflows: [],
        forms: [],
        dataModels: [],
        pages: [],
        mobileUI: null
      }
    });

    thinking.push({
      step: 'Application Created',
      content: `Application scaffold created with ID: ${application.id}`
    });

    emitEvent({
      type: 'thinking-step',
      data: thinking[thinking.length - 1]
    });

    // Signal mode transition (modal -> sidebar)
    emitEvent({
      type: 'transition-to-sidebar',
      data: {
        applicationId: application.id,
        applicationName: application.name
      }
    });

    // Step 3: Generate components using MOE
    const componentsToGenerate = intent.components || ['workflow', 'forms', 'dataModels', 'pages', 'mobileUI'];

    emitEvent({
      type: 'thinking-step',
      data: {
        step: 'Generating Components',
        content: `Using MOE Orchestrator to generate: ${componentsToGenerate.join(', ')}`
      }
    });

    const generatedComponents = await this.generateAllComponents(
      requirements,
      componentsToGenerate,
      emitEvent,
      thinking,
      designInput
    );

    // Step 4: Update application with generated components
    application.resources = generatedComponents;
    await this.appDatabase.update(application.id, application);

    thinking.push({
      step: 'Application Complete',
      content: `All components generated and saved to application ${application.name}`
    });

    emitEvent({
      type: 'thinking-step',
      data: thinking[thinking.length - 1]
    });

    // Step 5: Emit completion
    emitEvent({
      type: 'application-complete',
      data: {
        thinking,
        application: application,
        summary: {
          description: `Successfully created ${application.name} with all components!`,
          componentsGenerated: Object.keys(generatedComponents).length,
          applicationId: application.id
        }
      }
    });
  }

  /**
   * Generate all application components using MOE
   */
  async generateAllComponents(requirements, componentsToGenerate, emitEvent, thinking, designInput = null) {
    const components = {};

    // Generate workflow first (it includes forms, dataModels, pages, and mobileUI)
    if (componentsToGenerate.includes('workflow')) {
      emitEvent({
        type: 'component-progress',
        data: {
          component: 'workflow',
          status: 'generating',
          message: `Generating workflow with all components...`
        }
      });

      try {
        // Create a wrapper for emitEvent that forwards thinking steps
        const moeEmitEvent = (event) => {
          emitEvent({
            type: 'thinking-step',
            data: {
              step: event.step || 'Processing',
              content: event.content || JSON.stringify(event)
            }
          });
        };

        const result = await this.moeOrchestrator.generateWorkflow(
          requirements,
          null,
          [],
          moeEmitEvent,
          designInput
        );

        // The workflow contains all components embedded
        components.workflows = [result];
        components.forms = result.forms || [];
        components.dataModels = result.dataModels || [];
        components.pages = result.pages || [];
        components.mobileUI = result.mobileUI || null;

        thinking.push({
          step: `Application Components Generated`,
          content: `Successfully generated workflow with ${components.forms.length} forms, ${components.dataModels.length} data models, and ${components.pages.length} pages`
        });

        emitEvent({
          type: 'component-progress',
          data: {
            component: 'workflow',
            status: 'completed',
            message: `All components generated successfully`
          }
        });

        emitEvent({
          type: 'thinking-step',
          data: thinking[thinking.length - 1]
        });

      } catch (error) {
        console.error(`Error generating components:`, error);

        emitEvent({
          type: 'component-progress',
          data: {
            component: 'workflow',
            status: 'error',
            message: `Failed to generate components: ${error.message}`
          }
        });
      }
    }

    return components;
  }

  /**
   * Handle opening an existing application
   */
  async handleOpenApplication(appName, emitEvent, thinking) {
    emitEvent({
      type: 'thinking-step',
      data: {
        step: 'Loading Application',
        content: `Searching for application: ${appName}`
      }
    });

    try {
      const applications = await this.appDatabase.findByName(appName);

      if (applications.length === 0) {
        emitEvent({
          type: 'application-complete',
          data: {
            thinking,
            application: null,
            summary: {
              description: `I couldn't find an application named "${appName}". Would you like me to create it?`
            }
          }
        });
        return;
      }

      const application = applications[0];

      thinking.push({
        step: 'Application Loaded',
        content: `Found application: ${application.name} (ID: ${application.id})`
      });

      emitEvent({
        type: 'thinking-step',
        data: thinking[thinking.length - 1]
      });

      // Signal mode transition
      emitEvent({
        type: 'transition-to-sidebar',
        data: {
          applicationId: application.id,
          applicationName: application.name
        }
      });

      emitEvent({
        type: 'application-complete',
        data: {
          thinking,
          application: application,
          summary: {
            description: `Loaded ${application.name}. What would you like to do with it?`,
            applicationId: application.id
          }
        }
      });

    } catch (error) {
      console.error('Error loading application:', error);
      emitEvent({
        type: 'error',
        data: {
          message: `Failed to load application: ${error.message}`
        }
      });
    }
  }
}

module.exports = new AIApplicationGenerator();
