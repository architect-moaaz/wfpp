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
      if (jsonStr) {
        console.error(`Extracted JSON (length ${jsonStr.length}):\n`, jsonStr.substring(0, 500) + '...');
      }
      // Store error details for retry mechanism
      error.jsonStr = jsonStr;
      error.responseText = responseText;
      throw error;
    }
  }

  /**
   * Parse JSON with AI self-correction retry
   * If initial parsing fails, asks the AI to fix its own JSON
   */
  async parseJsonWithRetry(responseText, originalPrompt, maxRetries = 2) {
    let lastError = null;

    // First attempt: Try parsing with repair
    try {
      return this.parseJsonResponse(responseText);
    } catch (error) {
      lastError = error;
      console.log(`[${this.name}] Initial JSON parsing failed, attempting AI self-correction...`);
    }

    // Retry with AI self-correction
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[${this.name}] AI self-correction attempt ${attempt}/${maxRetries}...`);

        const correctedJson = await this.requestJsonCorrection(
          lastError.jsonStr || lastError.responseText,
          lastError.message
        );

        // Try to parse the corrected JSON
        const result = this.parseJsonResponse(correctedJson);
        console.log(`[${this.name}] AI self-correction successful on attempt ${attempt}`);
        return result;

      } catch (retryError) {
        lastError = retryError;
        console.error(`[${this.name}] AI self-correction attempt ${attempt} failed:`, retryError.message);
      }
    }

    // All attempts failed
    console.error(`[${this.name}] All JSON correction attempts failed`);
    throw lastError;
  }

  /**
   * Request AI to correct invalid JSON
   */
  async requestJsonCorrection(invalidJson, errorMessage) {
    const correctionPrompt = `The following JSON has a syntax error. Please fix ONLY the JSON syntax error and return ONLY the corrected JSON with no explanation or markdown.

ERROR: ${errorMessage}

INVALID JSON:
${invalidJson ? invalidJson.substring(0, 8000) : 'No JSON extracted'}

Return ONLY valid JSON. Do not add any explanation, markdown code blocks, or other text. Just the raw corrected JSON.`;

    const messages = [{
      role: 'user',
      content: correctionPrompt
    }];

    // Use network retry for JSON correction requests
    return this.executeWithNetworkRetry(async () => {
      try {
        const response = await this.anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001', // Use fast model for corrections
          max_tokens: 8000,
          messages: messages,
          system: 'You are a JSON syntax corrector. Your only job is to fix JSON syntax errors and return valid JSON. Never add explanations or markdown.'
        });

        return response.content[0].text;
      } catch (error) {
        console.error(`[${this.name}] JSON correction request failed:`, error.message);
        throw error;
      }
    });
  }

  /**
   * Execute with self-healing JSON parsing
   * Wrapper method for experts to use instead of direct parseJsonResponse
   */
  async executeWithSelfHealing(messages, onThinking = null) {
    try {
      const responseText = await this.getResponse(messages);

      // Try normal parsing first
      try {
        return this.parseJsonResponse(responseText);
      } catch (parseError) {
        // If parsing fails, try AI self-correction
        if (onThinking) {
          onThinking({
            agent: this.name,
            step: 'Self-Healing',
            content: 'JSON parsing failed, attempting AI self-correction...'
          });
        }

        console.log(`[${this.name}] Attempting AI self-correction for JSON error: ${parseError.message}`);

        const result = await this.parseJsonWithRetry(
          responseText,
          messages[messages.length - 1]?.content || ''
        );

        if (onThinking) {
          onThinking({
            agent: this.name,
            step: 'Self-Healing Complete',
            content: 'Successfully recovered from JSON error'
          });
        }

        return result;
      }
    } catch (error) {
      console.error(`[${this.name}] executeWithSelfHealing failed:`, error.message);
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
   * Repair common JSON errors with advanced fixing strategies
   */
  repairJson(jsonStr) {
    let original = jsonStr;

    // Strategy 1: Remove trailing commas before ] or }
    jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');

    // Strategy 2: Fix missing commas between array elements or object properties
    jsonStr = jsonStr.replace(/}\s*{/g, '},{');
    jsonStr = jsonStr.replace(/]\s*\[/g, '],[');
    jsonStr = jsonStr.replace(/}(\s*)"(\w+)":/g, '},$1"$2":');
    jsonStr = jsonStr.replace(/](\s*)"(\w+)":/g, '],$1"$2":');

    // Strategy 3: Fix missing commas after values before next key
    // Matches: "value" "nextKey": or number "nextKey": or true/false/null "nextKey":
    jsonStr = jsonStr.replace(/"(\s*)"(\w+)":/g, '",$1"$2":');
    jsonStr = jsonStr.replace(/(\d)(\s*)"(\w+)":/g, '$1,$2"$3":');
    jsonStr = jsonStr.replace(/(true|false|null)(\s*)"(\w+)":/g, '$1,$2"$3":');

    // Strategy 4: Fix missing comma after closing brace/bracket before next key
    jsonStr = jsonStr.replace(/}(\s*)"(\w+)":/g, '},$1"$2":');
    jsonStr = jsonStr.replace(/](\s*)"(\w+)":/g, '],$1"$2":');

    // Strategy 5: Fix double quotes issues (e.g., "value"" -> "value")
    jsonStr = jsonStr.replace(/""+/g, '"');

    // Strategy 6: Fix missing quotes around property names
    // Match unquoted keys followed by colon
    jsonStr = jsonStr.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

    // Strategy 7: Fix single quotes used instead of double quotes
    // Be careful not to replace single quotes inside strings
    jsonStr = this.fixSingleQuotes(jsonStr);

    // Strategy 8: Fix truncated strings (missing closing quote)
    jsonStr = this.fixTruncatedStrings(jsonStr);

    // Strategy 9: Remove any trailing text after the final closing brace/bracket
    const lastBrace = Math.max(jsonStr.lastIndexOf('}'), jsonStr.lastIndexOf(']'));
    if (lastBrace > 0 && lastBrace < jsonStr.length - 1) {
      jsonStr = jsonStr.substring(0, lastBrace + 1);
    }

    // Strategy 10: Balance brackets and braces
    jsonStr = this.balanceBrackets(jsonStr);

    if (jsonStr !== original) {
      console.log(`[${this.name}] JSON repaired with ${this.countRepairs(original, jsonStr)} fix(es)`);
    }

    return jsonStr;
  }

  /**
   * Fix single quotes used instead of double quotes in JSON
   */
  fixSingleQuotes(jsonStr) {
    // This is a simplified fix - replace ' with " when it appears to be a JSON delimiter
    // Pattern: Property names like 'key': or string values like 'value'
    let result = '';
    let inDoubleQuote = false;
    let prevChar = '';

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];

      if (char === '"' && prevChar !== '\\') {
        inDoubleQuote = !inDoubleQuote;
        result += char;
      } else if (char === "'" && !inDoubleQuote) {
        // Check if this looks like a JSON string delimiter
        const before = jsonStr.substring(Math.max(0, i - 5), i);
        const after = jsonStr.substring(i + 1, Math.min(jsonStr.length, i + 6));

        // If it's after : [ { , or at start, and followed by word chars, it's likely a string start
        if (/[:\[{,\s]$/.test(before) || /^[\w]/.test(after)) {
          result += '"';
        } else if (/[\w]$/.test(before) && /^[,}\]:\s]/.test(after)) {
          result += '"';
        } else {
          result += char;
        }
      } else {
        result += char;
      }

      prevChar = char;
    }

    return result;
  }

  /**
   * Fix truncated strings (strings missing closing quote)
   */
  fixTruncatedStrings(jsonStr) {
    // Find strings that start with " but don't have a closing "
    let result = '';
    let inString = false;
    let stringStart = -1;
    let escapeNext = false;

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];

      if (escapeNext) {
        escapeNext = false;
        result += char;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        result += char;
        continue;
      }

      if (char === '"') {
        if (!inString) {
          inString = true;
          stringStart = i;
        } else {
          inString = false;
        }
        result += char;
      } else if (inString && (char === '\n' || char === '\r')) {
        // Newline inside string - close the string and continue
        result += '"' + char;
        inString = false;
      } else {
        result += char;
      }
    }

    // If we're still in a string at the end, close it
    if (inString) {
      result += '"';
    }

    return result;
  }

  /**
   * Balance brackets and braces
   */
  balanceBrackets(jsonStr) {
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
      }
    }

    // Add missing closing brackets/braces
    if (braceCount > 0) {
      jsonStr += '}'.repeat(braceCount);
    }
    if (bracketCount > 0) {
      jsonStr += ']'.repeat(bracketCount);
    }

    return jsonStr;
  }

  /**
   * Count the number of repairs made
   */
  countRepairs(original, repaired) {
    let count = 0;
    const minLen = Math.min(original.length, repaired.length);

    for (let i = 0; i < minLen; i++) {
      if (original[i] !== repaired[i]) count++;
    }

    count += Math.abs(original.length - repaired.length);
    return Math.min(count, 50); // Cap at 50 to avoid huge numbers
  }

  /**
   * Check if error is a network/connection error that should trigger retry
   */
  isNetworkError(error) {
    // Check error code for common network issues
    const networkErrorCodes = [
      'ENOTFOUND',      // DNS lookup failed
      'ECONNRESET',     // Connection reset
      'ECONNREFUSED',   // Connection refused
      'ETIMEDOUT',      // Connection timed out
      'ENETUNREACH',    // Network unreachable
      'EHOSTUNREACH',   // Host unreachable
      'EPIPE',          // Broken pipe
      'EAI_AGAIN',      // DNS temporary failure
      'CERT_HAS_EXPIRED', // SSL cert expired
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE' // SSL issue
    ];

    // Check the error or its cause for network codes
    const errorCode = error.code || error.cause?.code;
    if (errorCode && networkErrorCodes.includes(errorCode)) {
      return true;
    }

    // Check for Anthropic SDK connection errors
    if (error.name === 'APIConnectionError' ||
        error.message?.includes('Connection error') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('getaddrinfo')) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute API call with network retry logic
   * Implements exponential backoff with jitter for network errors
   */
  async executeWithNetworkRetry(apiCall, maxRetries = 5, baseDelayMs = 2000) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;

        // Check if this is a network error that should trigger retry
        if (this.isNetworkError(error)) {
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s with jitter
          const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 1000; // Add 0-1s random jitter
          const delay = Math.min(exponentialDelay + jitter, 60000); // Cap at 60s

          console.warn(`[${this.name}] Network error on attempt ${attempt}/${maxRetries}: ${error.message}`);

          if (attempt < maxRetries) {
            console.log(`[${this.name}] Retrying in ${Math.round(delay)}ms...`);
            await this.sleep(delay);
          } else {
            console.error(`[${this.name}] All ${maxRetries} network retry attempts failed`);
          }
        } else {
          // Non-network error - don't retry, throw immediately
          throw error;
        }
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Stream response from Claude
   */
  async streamResponse(messages, onChunk) {
    return this.executeWithNetworkRetry(async () => {
      const stream = await this.anthropic.messages.stream({
        model: this.model,
        max_tokens: 8000, // Balanced to allow detailed responses while preventing excessive output
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
    });
  }

  /**
   * Get non-streaming response from Claude
   */
  async getResponse(messages) {
    return this.executeWithNetworkRetry(async () => {
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 8000, // Balanced to allow detailed responses while preventing excessive output
        messages: messages,
        system: this.buildSystemPrompt()
      });

      return response.content[0].text;
    });
  }
}

module.exports = BaseAgent;
