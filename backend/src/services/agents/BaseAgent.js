/**
 * Base Agent Class
 * All specialized agents extend this base class
 */

const Anthropic = require('@anthropic-ai/sdk');

class BaseAgent {
  constructor(name, knowledgeBase, model = 'claude-haiku-4-5-20251001') {
    this.name = name;
    this.knowledgeBase = knowledgeBase;
    this.model = model;
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Build system prompt with agent-specific knowledge base
   */
  buildSystemPrompt() {
    return `You are the ${this.name}, a specialized AI agent.

Your Knowledge Base:
${this.knowledgeBase}

Guidelines:
- You are part of a multi-agent system
- Focus only on your specialized domain
- Return structured JSON output
- Be concise and precise
- Use the knowledge base to inform your decisions`;
  }

  /**
   * Execute agent with shared context
   */
  async execute(sharedContext, agentSpecificPrompt) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Parse JSON from Claude response with error recovery
   */
  parseJsonResponse(responseText) {
    let jsonStr = null; // Declare outside try block so it's accessible in catch block
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText.trim();

      // Remove markdown code blocks if present
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) jsonText = match[1].trim();
      }

      // Try to parse directly first
      try {
        return JSON.parse(jsonText);
      } catch (e) {
        // If direct parse fails, try to extract JSON
      }

      // Extract JSON using a more sophisticated approach
      // Try to find a JSON array first (for experts that return arrays)
      if (jsonText.startsWith('[')) {
        jsonStr = this.extractBalancedJson(jsonText, '[', ']');
      }
      // Otherwise try to find a JSON object
      else if (jsonText.startsWith('{')) {
        jsonStr = this.extractBalancedJson(jsonText, '{', '}');
      }
      // Search for JSON within the text
      else {
        const arrayMatch = jsonText.indexOf('[');
        const objectMatch = jsonText.indexOf('{');

        if (arrayMatch >= 0 && (arrayMatch < objectMatch || objectMatch < 0)) {
          jsonStr = this.extractBalancedJson(jsonText.substring(arrayMatch), '[', ']');
        } else if (objectMatch >= 0) {
          jsonStr = this.extractBalancedJson(jsonText.substring(objectMatch), '{', '}');
        }
      }

      if (!jsonStr) {
        throw new Error('No valid JSON found in response');
      }

      // Try to fix common JSON issues
      jsonStr = this.repairJson(jsonStr);

      return JSON.parse(jsonStr);
    } catch (error) {
      console.error(`${this.name} JSON parsing failed:`, error);
      console.error(`Response length: ${responseText.length} chars`);
      console.error(`Full response text:\n`, responseText);
      if (jsonStr) {
        console.error(`Extracted JSON (length ${jsonStr.length}):\n`, jsonStr);
      }
      throw error;
    }
  }

  /**
   * Extract balanced JSON (matching opening and closing brackets/braces)
   */
  extractBalancedJson(text, openChar, closeChar) {
    let depth = 0;
    let start = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === openChar) {
        if (depth === 0) start = i;
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0 && start >= 0) {
          return text.substring(start, i + 1);
        }
      }
    }

    // If we didn't find a complete match, try to fix incomplete JSON
    if (start >= 0 && depth > 0) {
      console.warn(`${this.name}: Fixing incomplete JSON (depth: ${depth})`);
      let result = text.substring(start);
      result += closeChar.repeat(depth);
      return result;
    }

    return null;
  }

  /**
   * Repair common JSON errors
   */
  repairJson(jsonStr) {
    // Remove trailing commas before ] or }
    jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');

    // Fix missing commas between array elements or object properties
    jsonStr = jsonStr.replace(/}\s*{/g, '},{');
    jsonStr = jsonStr.replace(/]\s*\[/g, '],[');
    jsonStr = jsonStr.replace(/}(\s*)"(\w+)":/g, '},$1"$2":');
    jsonStr = jsonStr.replace(/](\s*)"(\w+)":/g, '],$1"$2":');

    // Fix unescaped quotes in strings (basic attempt)
    // This is tricky and may not catch all cases

    // Remove any trailing text after the final closing brace/bracket
    const lastBrace = Math.max(jsonStr.lastIndexOf('}'), jsonStr.lastIndexOf(']'));
    if (lastBrace > 0 && lastBrace < jsonStr.length - 1) {
      jsonStr = jsonStr.substring(0, lastBrace + 1);
    }

    return jsonStr;
  }

  /**
   * Stream response from Claude
   */
  async streamResponse(messages, onChunk) {
    const stream = await this.anthropic.messages.stream({
      model: this.model,
      max_tokens: 16384, // Increased for complex forms/models/screens with many nodes
      messages: messages,
      system: this.buildSystemPrompt()
    });

    let fullResponse = '';

    stream.on('text', (text) => {
      fullResponse += text;
      if (onChunk) onChunk(text);
    });

    await stream.finalMessage();
    return fullResponse;
  }

  /**
   * Get non-streaming response from Claude
   */
  async getResponse(messages) {
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 16384, // Increased for complex forms/models/screens with many nodes
      messages: messages,
      system: this.buildSystemPrompt()
    });

    return response.content[0].text;
  }
}

module.exports = BaseAgent;
