const Anthropic = require('@anthropic-ai/sdk');
const SelfHealingOrchestrator = require('./moe/SelfHealingOrchestrator');

/**
 * ARES Conversational AI Service
 * Intelligent requirement gathering and workflow/app generation using Self-Healing MoE
 */
class AresService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'your_api_key_here'
    });
    this.useLLM = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here';
    this.modelName = 'claude-sonnet-4-5-20250929'; // Claude Sonnet 4.5
    this.moeOrchestrator = new SelfHealingOrchestrator();

    // Conversation state management (in-memory, could be moved to Redis/DB)
    this.conversationStates = new Map();
  }

  /**
   * Generate conversational response from ARES
   * @param {Array} conversationHistory - Array of message objects with role and content
   * @param {Object} context - Additional context (currentApplication, conversationId, etc.)
   * @returns {Object} Response with content, suggested actions, and metadata
   */
  async generateResponse(conversationHistory, context = {}) {
    if (!this.useLLM) {
      return this.getFallbackResponse(conversationHistory);
    }

    try {
      // Get or create conversation state
      const conversationId = context.conversationId || 'default';
      const state = this.getConversationState(conversationId);

      const systemPrompt = this.buildSystemPrompt(context, state);
      const messages = this.formatConversationHistory(conversationHistory);

      console.log('[ARES] System Prompt Length:', systemPrompt.length);
      console.log('[ARES] Messages being sent:', JSON.stringify(messages, null, 2));

      // Call Claude API with structured output for intent detection
      const response = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 3000,
        system: systemPrompt,
        messages: messages,
        temperature: 0.7
      });

      console.log('[ARES] API Response:', JSON.stringify(response, null, 2));

      // Safely extract the assistant message with error handling
      if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
        console.error('[ARES] Invalid response structure:', response);
        throw new Error('Invalid response from Claude API');
      }

      const assistantMessage = response.content[0].text;

      // Parse and extract action_suggestions tags from response
      const { cleanContent, parsedSuggestions } = this.parseActionSuggestions(assistantMessage);

      // Analyze intent and extract structured data
      const analysis = await this.analyzeIntent(conversationHistory, cleanContent, context);

      // Update conversation state
      this.updateConversationState(conversationId, analysis);

      // Generate appropriate suggestions based on intent and state
      let suggestions = this.generateSmartSuggestions(analysis, state, context);

      // If Claude provided suggestions in the response, use those instead
      if (parsedSuggestions && parsedSuggestions.length > 0) {
        suggestions = parsedSuggestions;
      }

      return {
        content: cleanContent,
        suggestions: suggestions,
        metadata: {
          intent: analysis.intent,
          stage: analysis.stage,
          requirements: analysis.requirements,
          readyToGenerate: analysis.readyToGenerate
        },
        raw: response
      };
    } catch (error) {
      console.error('Error generating ARES response:', error);
      throw error;
    }
  }

  /**
   * Build enhanced system prompt for requirement gathering
   */
  buildSystemPrompt(context, state) {
    const { currentApplication } = context;

    let prompt = `You are ARES (Adaptive Requirement Engineering System), an expert AI assistant for the Tentoro AI Designer workflow platform.

Your PRIMARY MISSION is to help users create powerful workflow applications through intelligent requirement gathering.

CORE CAPABILITIES:
1. **Requirement Gathering**: Ask smart, relevant questions to understand what the user wants to build
2. **Intent Detection**: Understand if user wants to create apps, workflows, forms, or manage existing resources
3. **MoE Integration**: Use our Mixture of Experts system to generate workflows, forms, and data models
4. **Guided Creation**: Lead users through a conversational process from idea to implementation

CONVERSATION STAGES:
- INITIAL: Understanding user's high-level goal
- GATHERING: Asking clarifying questions about requirements
- CONFIRMATION: Confirming understanding before generation
- GENERATING: Triggering MoE system for creation
- COMPLETE: App/workflow created, offering next steps

REQUIREMENT GATHERING STRATEGY:

**Phase 1 - Initial Understanding (First Questions):**
When user mentions wanting to build something, immediately ask 2-3 specific questions:
- "What's the main purpose of this [workflow/app]? What problem does it solve?"
- "Who will be using this system? What are their roles?"
- "What are the key actions or features users need?"

**Phase 2 - Detailed Requirements (Follow-up Questions):**
After getting initial answers, dig deeper with 2-3 targeted questions:
- "What's the step-by-step process? Walk me through how it should work."
- "Are there any approval steps or decision points in the workflow?"
- "What data needs to be collected at each step?"
- "What information should be displayed to users?"

**Phase 3 - Technical Details (Final Questions):**
Before generating, clarify technical aspects:
- "What forms or input screens are needed?"
- "Should there be email notifications? When?"
- "Does it integrate with other systems?"
- "Are there different user roles with different permissions?"

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. When asking questions, do NOT offer action buttons like "Continue with questions" - users will type their answers naturally
2. Use conversational, friendly language (not formal)
3. Ask 2-3 specific questions at a time, then wait for user's typed response
4. Build on what they've already told you - don't ask questions they've already answered
5. After getting good answers to 6-8 questions total, offer to generate
6. When offering to generate, provide a button with action "generate_with_moe"
7. ONLY provide action buttons for: create_application, open_application, generate_with_moe, view_workflow
8. Do NOT provide action buttons for: gather_requirements, confirm_requirements, edit_requirements

SPECIAL CASE - PROCEED WITH ASSUMPTIONS:
If the user says phrases like "answer the questions yourself", "generate best suited answers", "proceed with assumptions", "use defaults", "just build it", etc., then:
1. Acknowledge you'll proceed with reasonable assumptions
2. Generate sensible default requirements based on the domain they mentioned (e.g., "library management system")
3. Briefly list 3-4 key assumptions you're making
4. IMMEDIATELY offer the "Generate with AI" button (action: generate_with_moe)
5. Do NOT ask more questions - the user wants you to be proactive

Example: If user says "Library management system" then "proceed with assumptions", respond like:
"Got it! I'll build a library management system with these assumptions:
- Public library for general use
- Basic features: book checkout/return, catalog search, member registration
- Users: librarians and library members
- Simple overdue tracking

Ready to generate this for you!"
[Show "Generate with AI" button]

Current context:`;

    if (currentApplication) {
      prompt += `\n- User has application "${currentApplication.name}" open`;
      if (currentApplication.resources) {
        prompt += `\n- Application has ${currentApplication.resources.workflows?.length || 0} workflows`;
        prompt += `\n- Application has ${currentApplication.resources.forms?.length || 0} forms`;
        prompt += `\n- Application has ${currentApplication.resources.dataModels?.length || 0} data models`;
      }
    } else {
      prompt += `\n- No application currently open (welcome screen)`;
    }

    if (state.intent) {
      prompt += `\n- User intent: ${state.intent}`;
    }
    if (state.stage) {
      prompt += `\n- Conversation stage: ${state.stage}`;
    }
    if (state.requirements && Object.keys(state.requirements).length > 0) {
      prompt += `\n- Gathered requirements: ${JSON.stringify(state.requirements)}`;
    }

    prompt += `\n\nACTION TYPES for suggestions:
- "create_application" - Create a new application container
- "open_application" - Open existing application
- "gather_requirements" - Continue asking requirement questions
- "confirm_requirements" - User confirms, ready to generate
- "generate_with_moe" - Trigger MoE system to generate workflow/app
- "edit_requirements" - User wants to modify requirements
- "view_workflow" - View the generated workflow
- "help" - Show help information

IMPORTANT:
- Respond with natural conversational text only
- Do NOT include XML tags like <action_suggestions> in your response
- The system will automatically generate appropriate action buttons based on the conversation stage
- Focus on asking good questions and providing clear, helpful responses`;

    return prompt;
  }

  /**
   * Parse and extract <action_suggestions> tags from Claude's response
   * Returns clean content and parsed suggestions
   */
  parseActionSuggestions(text) {
    const actionSuggestionsRegex = /<action_suggestions>\s*([\s\S]*?)\s*<\/action_suggestions>/g;
    let parsedSuggestions = [];
    let cleanContent = text;

    // Find all action_suggestions blocks
    const matches = [...text.matchAll(actionSuggestionsRegex)];

    for (const match of matches) {
      try {
        // Extract JSON content between tags
        const jsonContent = match[1].trim();
        const suggestions = JSON.parse(jsonContent);

        if (Array.isArray(suggestions)) {
          // Transform to expected format with id field
          parsedSuggestions = suggestions.map((sug, index) => ({
            id: sug.action || `action-${index}`,
            label: sug.label,
            action: sug.action,
            description: sug.description,
            requirements: sug.requirements
          }));
        }
      } catch (error) {
        console.warn('[ARES] Failed to parse action_suggestions:', error);
      }
    }

    // Remove all action_suggestions tags from content
    cleanContent = cleanContent.replace(actionSuggestionsRegex, '').trim();

    return { cleanContent, parsedSuggestions };
  }

  /**
   * Analyze user intent and extract requirements using LLM
   */
  async analyzeIntent(conversationHistory, assistantResponse, context) {
    try {
      const lastUserMessage = conversationHistory
        .filter(m => m.role === 'user')
        .slice(-1)[0]?.content || '';

      const analysisPrompt = `Analyze this conversation and extract:
1. User's primary intent (create_app, create_workflow, manage_existing, ask_question, etc.)
2. Current conversation stage (initial, gathering, confirmation, generating, complete)
3. Any requirements mentioned (domain, purpose, features, users, data, workflow_steps, etc.)
4. Whether we have enough information to generate (true/false)

IMPORTANT STAGE DEFINITIONS:
- "gathering": Actively collecting requirements through questions
- "confirmation": User has provided requirements and confirmed they want to generate (use this when user says "generate", "create it", "go ahead", etc.)
- "generating": ONLY use this AFTER actual generation has started (NOT when user requests generation)
- "complete": Generation finished successfully

SPECIAL CASE - PROCEED WITH ASSUMPTIONS:
If user says phrases like "answer the questions yourself", "generate best suited answers", "proceed with assumptions", "use defaults", "just build it", "proceed with general system", etc.:
- Set stage to "confirmation"
- Set readyToGenerate to true
- Extract the domain from previous context (e.g., "library management system")
- Generate reasonable default requirements based on the domain

Conversation:
User: ${lastUserMessage}
Assistant: ${assistantResponse}

Previous context: ${JSON.stringify(context)}

Respond in JSON format:
{
  "intent": "create_app|create_workflow|manage_existing|ask_question",
  "stage": "initial|gathering|confirmation|generating|complete",
  "requirements": {
    "domain": "...",
    "purpose": "...",
    "features": ["...", "..."],
    "users": "...",
    "data": ["..."],
    "workflow_steps": ["..."],
    "forms_needed": ["..."],
    "integrations": ["..."]
  },
  "readyToGenerate": false,
  "nextQuestions": ["...", "..."]
}`;

      const response = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 1500,
        system: 'You are an expert at analyzing conversations and extracting structured requirements. Always respond with valid JSON.',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3
      });

      const jsonMatch = response.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        intent: 'ask_question',
        stage: 'initial',
        requirements: {},
        readyToGenerate: false,
        nextQuestions: []
      };
    } catch (error) {
      console.error('Error analyzing intent:', error);
      return {
        intent: 'unknown',
        stage: 'initial',
        requirements: {},
        readyToGenerate: false,
        nextQuestions: []
      };
    }
  }

  /**
   * Generate smart suggestions based on intent and conversation state
   */
  generateSmartSuggestions(analysis, state, context) {
    const suggestions = [];

    switch (analysis.stage) {
      case 'initial':
        suggestions.push(
          { id: 'create-app', label: 'Create new application', action: 'create_application' },
          { id: 'open-app', label: 'Open existing application', action: 'open_application' },
          { id: 'help', label: 'Show me examples', action: 'help' }
        );
        break;

      case 'gathering':
        // Don't offer confusing action buttons during gathering
        // Users should type their answers naturally
        // Only show buttons if we have enough requirements to generate
        if (analysis.readyToGenerate) {
          suggestions.push(
            { id: 'generate', label: 'Generate it now', action: 'generate_with_moe', requirements: analysis.requirements }
          );
        }
        break;

      case 'confirmation':
        if (analysis.readyToGenerate) {
          suggestions.push(
            { id: 'generate', label: 'Yes, generate it now!', action: 'generate_with_moe', requirements: analysis.requirements },
            { id: 'edit', label: 'Let me add more details', action: 'edit_requirements' },
            { id: 'cancel', label: 'Cancel', action: 'help' }
          );
        } else {
          suggestions.push(
            { id: 'continue', label: 'Tell me more', action: 'gather_requirements' },
            { id: 'cancel', label: 'Cancel', action: 'help' }
          );
        }
        break;

      case 'generating':
        suggestions.push(
          { id: 'view', label: 'View workflow canvas', action: 'view_workflow' },
          { id: 'create-another', label: 'Create another', action: 'create_application' }
        );
        break;

      case 'complete':
        if (context.currentApplication) {
          suggestions.push(
            { id: 'view', label: 'View workflow', action: 'view_workflow' },
            { id: 'add-more', label: 'Add another workflow', action: 'create_workflow' },
            { id: 'forms', label: 'Design forms', action: 'design_forms' }
          );
        } else {
          suggestions.push(
            { id: 'create-app', label: 'Create new application', action: 'create_application' },
            { id: 'open-app', label: 'Open application', action: 'open_application' }
          );
        }
        break;

      default:
        suggestions.push(
          { id: 'create-app', label: 'Create new application', action: 'create_application' },
          { id: 'help', label: 'Help', action: 'help' }
        );
    }

    return suggestions.slice(0, 4);
  }

  /**
   * Get conversation state
   */
  getConversationState(conversationId) {
    if (!this.conversationStates.has(conversationId)) {
      this.conversationStates.set(conversationId, {
        intent: null,
        stage: 'initial',
        requirements: {},
        createdAt: Date.now()
      });
    }
    return this.conversationStates.get(conversationId);
  }

  /**
   * Update conversation state
   */
  updateConversationState(conversationId, analysis) {
    const state = this.getConversationState(conversationId);
    state.intent = analysis.intent || state.intent;
    state.stage = analysis.stage || state.stage;
    state.requirements = { ...state.requirements, ...analysis.requirements };
    state.updatedAt = Date.now();
    this.conversationStates.set(conversationId, state);
  }

  /**
   * Clear conversation state
   */
  clearConversationState(conversationId) {
    this.conversationStates.delete(conversationId);
  }

  /**
   * Generate workflow/app using MoE system
   */
  async generateWithMoE(requirements, context, progressCallback = null) {
    try {
      console.log('[ARES] Triggering MoE generation with requirements:', requirements);
      console.log('[ARES] Context:', context);

      // Build comprehensive prompt from requirements
      // If requirements is structured, use buildMoEPrompt
      // Otherwise, create a simple prompt
      let prompt;
      if (requirements && typeof requirements === 'object' && Object.keys(requirements).length > 0) {
        prompt = this.buildMoEPrompt(requirements);
      } else if (typeof requirements === 'string') {
        // If requirements is already a string, use it directly
        prompt = requirements;
      } else {
        // Fallback: create generic prompt
        prompt = "Create a business workflow application based on the requirements we've discussed.";
      }

      console.log('[ARES] Built MoE prompt:', prompt);

      // Build conversation history for MoE
      const conversationHistory = [
        { role: 'user', content: prompt }
      ];

      // Event emitter for progress updates
      const emitEvent = (event) => {
        console.log('[ARES MoE Event]:', event);

        // Forward to progress callback if provided
        if (progressCallback) {
          // Pass through specific event types that need their original structure preserved
          const preserveEventTypes = [
            'thinking-step',
            'component-generating',
            'component-completed',
            'component-error',
            'started',
            'completed',
            'error',
            'failed'
          ];

          if (event && event.type && preserveEventTypes.includes(event.type)) {
            // Pass through these events with their original structure
            progressCallback({
              ...event,
              timestamp: event.timestamp || Date.now()
            });
            return;
          }

          // Map other MoE events to ARES progress format
          let progressEvent = {
            type: 'progress',
            message: '',
            timestamp: Date.now()
          };

          // Extract message from different event formats
          if (typeof event === 'string') {
            progressEvent.message = event;
          } else if (event.data && event.data.content) {
            // Other structured events
            progressEvent.message = `${event.data.agent || 'System'}: ${event.data.content}`;
          } else if (event.thinking) {
            progressEvent.message = event.thinking;
          } else if (event.message) {
            progressEvent.message = event.message;
          } else if (event.content) {
            progressEvent.message = event.content;
          } else {
            // Fallback: stringify the event
            progressEvent.message = JSON.stringify(event);
          }

          progressCallback(progressEvent);
        }
      };

      // Use MoE Orchestrator to generate
      // generateWorkflow(userRequirements, existingWorkflow, conversationHistory, emitEvent, designInput = null)
      const result = await this.moeOrchestrator.generateWorkflow(
        prompt,
        null, // existingWorkflow
        conversationHistory,
        emitEvent,
        null // designInput
      );

      console.log('[ARES] MoE generation complete:', result);

      return {
        success: true,
        result: result,
        message: 'Application generated successfully!'
      };
    } catch (error) {
      console.error('[ARES] Error generating with MoE:', error);

      // Send error event if callback provided
      if (progressCallback) {
        progressCallback({
          type: 'error',
          message: error.message,
          timestamp: Date.now()
        });
      }

      throw error;
    }
  }

  /**
   * Build MoE prompt from requirements
   */
  buildMoEPrompt(requirements) {
    let prompt = `Create a ${requirements.domain || 'business'} application`;

    if (requirements.purpose) {
      prompt += ` for ${requirements.purpose}`;
    }

    if (requirements.features && requirements.features.length > 0) {
      prompt += `\n\nKey features:\n${requirements.features.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
    }

    if (requirements.workflow_steps && requirements.workflow_steps.length > 0) {
      prompt += `\n\nWorkflow steps:\n${requirements.workflow_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    }

    if (requirements.users) {
      prompt += `\n\nUsers: ${requirements.users}`;
    }

    if (requirements.data && requirements.data.length > 0) {
      prompt += `\n\nData to collect: ${requirements.data.join(', ')}`;
    }

    if (requirements.forms_needed && requirements.forms_needed.length > 0) {
      prompt += `\n\nForms needed: ${requirements.forms_needed.join(', ')}`;
    }

    if (requirements.integrations && requirements.integrations.length > 0) {
      prompt += `\n\nIntegrations: ${requirements.integrations.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Estimate complexity level
   */
  estimateComplexity(requirements) {
    let score = 0;

    if (requirements.features) score += requirements.features.length;
    if (requirements.workflow_steps) score += requirements.workflow_steps.length * 2;
    if (requirements.forms_needed) score += requirements.forms_needed.length;
    if (requirements.integrations) score += requirements.integrations.length * 3;

    if (score < 5) return 'simple';
    if (score < 12) return 'medium';
    return 'complex';
  }

  /**
   * Format conversation history for Claude API
   * Ensures messages start with user and alternate properly
   */
  formatConversationHistory(history) {
    const messages = history
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

    // Remove messages from the start until we find a user message
    while (messages.length > 0 && messages[0].role === 'assistant') {
      messages.shift();
    }

    // Remove consecutive messages with the same role
    const alternating = [];
    for (let i = 0; i < messages.length; i++) {
      if (i === 0 || messages[i].role !== alternating[alternating.length - 1].role) {
        alternating.push(messages[i]);
      }
    }

    return alternating;
  }

  /**
   * Fallback response when LLM is not available
   */
  getFallbackResponse(conversationHistory) {
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    const userMessage = lastMessage?.content?.toLowerCase() || '';

    let content = "I'm here to help you create workflows and applications.";
    let suggestions = [
      { id: 'create-app', label: 'Create new application', action: 'create_application' },
      { id: 'open-app', label: 'Open existing application', action: 'open_application' },
      { id: 'build-workflow', label: 'Build a workflow', action: 'build_workflow' }
    ];

    if (userMessage.includes('help') || userMessage.includes('what can you do')) {
      content = 'I can help you with:\n\n• Creating new applications\n• Opening existing applications\n• Building workflows using AI\n• Designing forms and data models\n• Creating mobile interfaces\n\nWhat would you like to do?';
    } else if (userMessage.includes('create') || userMessage.includes('new')) {
      content = 'I can help you create a new application. Once created, you can start building workflows with AI assistance.';
      suggestions = [
        { id: 'create', label: 'Create new application', action: 'create_application' },
        { id: 'help', label: 'Tell me more', action: 'help' }
      ];
    } else if (userMessage.includes('workflow')) {
      content = 'I can help you build workflows using AI. Just describe what you want to build, and I\'ll generate the workflow for you.';
      suggestions = [
        { id: 'build', label: 'Build a workflow', action: 'build_workflow' },
        { id: 'create', label: 'Create new application first', action: 'create_application' }
      ];
    }

    return {
      content,
      suggestions,
      metadata: {
        intent: 'unknown',
        stage: 'initial',
        requirements: {},
        readyToGenerate: false
      }
    };
  }

  /**
   * Stream responses (for future real-time streaming)
   */
  async streamResponse(conversationHistory, context, onChunk) {
    if (!this.useLLM) {
      const response = this.getFallbackResponse(conversationHistory);
      onChunk({ type: 'content', data: response.content });
      onChunk({ type: 'suggestions', data: response.suggestions });
      return;
    }

    try {
      const conversationId = context.conversationId || 'default';
      const state = this.getConversationState(conversationId);
      const systemPrompt = this.buildSystemPrompt(context, state);
      const messages = this.formatConversationHistory(conversationHistory);

      const stream = await this.anthropic.messages.stream({
        model: this.modelName,
        max_tokens: 3000,
        system: systemPrompt,
        messages: messages,
        temperature: 0.7
      });

      let fullContent = '';

      stream.on('text', (text) => {
        fullContent += text;
        onChunk({ type: 'content_delta', data: text });
      });

      stream.on('message', async (message) => {
        const analysis = await this.analyzeIntent(conversationHistory, fullContent, context);
        this.updateConversationState(conversationId, analysis);
        const suggestions = this.generateSmartSuggestions(analysis, state, context);

        onChunk({ type: 'suggestions', data: suggestions });
        onChunk({
          type: 'done',
          data: {
            content: fullContent,
            suggestions,
            metadata: {
              intent: analysis.intent,
              stage: analysis.stage,
              requirements: analysis.requirements,
              readyToGenerate: analysis.readyToGenerate
            }
          }
        });
      });

      stream.on('error', (error) => {
        console.error('Stream error:', error);
        onChunk({ type: 'error', data: error.message });
      });

    } catch (error) {
      console.error('Error streaming ARES response:', error);
      onChunk({ type: 'error', data: error.message });
    }
  }
}

module.exports = new AresService();
