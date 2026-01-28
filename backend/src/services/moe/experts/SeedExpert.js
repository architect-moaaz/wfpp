/**
 * SeedExpert - Sample Data Generation Expert
 *
 * Analyzes data models and generates realistic sample data for testing
 */

const Anthropic = require('@anthropic-ai/sdk');

class SeedExpert {
  constructor() {
    this.name = 'SeedExpert';
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.useLLM = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here';
  }

  /**
   * Generate sample data for all data models
   * @param {Object} application - The application object with data models
   * @param {Object} options - Options for data generation
   * @returns {Object} Generated sample data organized by model
   */
  async generateSampleData(application, options = {}) {
    const {
      recordsPerModel = 15,
      onProgress = null
    } = options;

    console.log('[SeedExpert] Generating sample data for:', application.name);

    if (onProgress) {
      onProgress({
        step: 'Analyzing Data Models',
        content: 'Understanding database schema and relationships...'
      });
    }

    // Extract data models from application
    const dataModels = application.resources?.dataModels || [];

    if (dataModels.length === 0) {
      console.log('[SeedExpert] No data models found, skipping seed data generation');
      return { models: [], totalRecords: 0 };
    }

    console.log(`[SeedExpert] Found ${dataModels.length} data models`);

    if (!this.useLLM) {
      console.log('[SeedExpert] No API key, generating basic fallback data');
      return this.generateFallbackData(dataModels, recordsPerModel);
    }

    if (onProgress) {
      onProgress({
        step: 'Generating Sample Data',
        content: `Creating realistic data for ${dataModels.length} models...`
      });
    }

    try {
      const sampleData = await this.generateWithLLM(
        application.name,
        application.description || '',
        dataModels,
        recordsPerModel,
        onProgress
      );

      console.log(`[SeedExpert] Generated ${sampleData.totalRecords} total records across ${sampleData.models.length} models`);

      return sampleData;
    } catch (error) {
      console.error('[SeedExpert] LLM generation failed, using fallback:', error.message);
      return this.generateFallbackData(dataModels, recordsPerModel);
    }
  }

  /**
   * Generate sample data using LLM
   */
  async generateWithLLM(appName, appDescription, dataModels, recordsPerModel, onProgress) {
    const prompt = this.buildPrompt(appName, appDescription, dataModels, recordsPerModel);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      temperature: 0.7, // Higher temperature for more varied data
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Parse LLM response
    let responseText = response.content[0].text.trim();

    // Remove markdown code blocks if present
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const result = JSON.parse(responseText.trim());

    // Validate and count records
    let totalRecords = 0;
    result.models.forEach(model => {
      totalRecords += model.records.length;
    });

    return {
      models: result.models,
      totalRecords
    };
  }

  /**
   * Build prompt for LLM to generate sample data
   */
  buildPrompt(appName, appDescription, dataModels, recordsPerModel) {
    // Build data model descriptions
    const modelDescriptions = dataModels.map(dm => {
      const fields = dm.fields.map(f =>
        `    - ${f.name} (${f.type}${f.required ? ', required' : ''}${f.unique ? ', unique' : ''})${f.description ? ': ' + f.description : ''}`
      ).join('\n');

      return `**${dm.name}** (${dm.description || 'No description'}):
${fields}`;
    }).join('\n\n');

    return `You are a data generation expert. Generate realistic sample data for testing an application.

**Application**: ${appName}
**Description**: ${appDescription || 'No description provided'}

**Data Models**:
${modelDescriptions}

**Your Task**:
Generate ${recordsPerModel} realistic sample records for EACH data model above.

**Critical Requirements**:
1. **Contextual Data**: Generate data that makes sense for "${appName}".
   - For HR apps: realistic employee names, departments, salaries
   - For E-commerce: realistic product names, prices, categories
   - For CRM: realistic customer names, companies, contacts
   - Etc.

2. **Field Type Accuracy**:
   - email: Valid email format (name@example.com)
   - phone: Valid phone format (XXX-XXX-XXXX or +1-XXX-XXX-XXXX)
   - date/datetime: ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)
   - boolean: true or false
   - number/integer: Appropriate numeric values
   - string: Contextually appropriate text
   - enum: Pick from allowed values
   - JSON: Valid JSON objects

3. **Unique Fields**: Ensure unique values for fields marked as unique (emails, IDs, usernames, etc.)

4. **Required Fields**: Always provide values for required fields

5. **Relationships**: If models reference each other (foreign keys), ensure IDs match between related records

6. **Realistic Variety**: Don't repeat the same values - create diverse, realistic data

7. **Reasonable Values**:
   - Salaries: Realistic ranges (30000-150000)
   - Dates: Recent dates, not too far in past/future
   - Status fields: Mix of different statuses
   - Prices: Reasonable for product type

**Example Output Format**:
{
  "models": [
    {
      "modelName": "Employee",
      "tableName": "employees",
      "records": [
        {
          "id": 1,
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@company.com",
          "department": "Engineering",
          "salary": 85000,
          "hireDate": "2023-03-15",
          "isActive": true
        },
        {
          "id": 2,
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane.smith@company.com",
          "department": "Marketing",
          "salary": 72000,
          "hireDate": "2023-06-20",
          "isActive": true
        }
        // ... ${recordsPerModel - 2} more records
      ]
    }
    // ... more models
  ]
}

**IMPORTANT**:
- Return ONLY valid JSON (no explanatory text)
- Generate exactly ${recordsPerModel} records per model
- Ensure all data is realistic and contextually appropriate for "${appName}"
- Use the exact field names from the data models above
- Include an "id" field for each record (auto-incrementing starting from 1)`;
  }

  /**
   * Generate basic fallback data when LLM is not available
   */
  generateFallbackData(dataModels, recordsPerModel) {
    console.log('[SeedExpert] Generating fallback sample data');

    const models = dataModels.map(dm => {
      const records = [];

      for (let i = 1; i <= recordsPerModel; i++) {
        const record = { id: i };

        dm.fields.forEach(field => {
          if (field.name === 'id') return; // Skip ID, already added

          record[field.name] = this.generateFallbackFieldValue(field, i);
        });

        records.push(record);
      }

      return {
        modelName: dm.name,
        tableName: dm.name.toLowerCase().replace(/\s+/g, '_'),
        records
      };
    });

    const totalRecords = models.reduce((sum, m) => sum + m.records.length, 0);

    return { models, totalRecords };
  }

  /**
   * Generate a fallback value for a field based on its type
   */
  generateFallbackFieldValue(field, index) {
    const type = field.type.toLowerCase();

    if (field.unique || field.name.toLowerCase().includes('email')) {
      return `user${index}@example.com`;
    }

    if (field.name.toLowerCase().includes('name')) {
      return `Name ${index}`;
    }

    if (field.name.toLowerCase().includes('phone')) {
      return `555-${String(index).padStart(4, '0')}`;
    }

    switch (type) {
      case 'string':
      case 'text':
        return `Sample ${field.name} ${index}`;
      case 'email':
        return `user${index}@example.com`;
      case 'number':
      case 'integer':
        return index * 10;
      case 'float':
      case 'decimal':
        return index * 10.5;
      case 'boolean':
        return index % 2 === 0;
      case 'date':
        const date = new Date();
        date.setDate(date.getDate() - index);
        return date.toISOString().split('T')[0];
      case 'datetime':
      case 'timestamp':
        const datetime = new Date();
        datetime.setDate(datetime.getDate() - index);
        return datetime.toISOString();
      case 'json':
        return { value: index };
      default:
        return `Value ${index}`;
    }
  }

  /**
   * Insert sample data into the application's database
   * @param {string} appPath - Path to the generated application
   * @param {Object} sampleData - Sample data to insert
   * @param {Function} onProgress - Progress callback
   */
  async insertSampleData(appPath, sampleData, onProgress = null) {
    console.log(`[SeedExpert] Inserting sample data into ${appPath}`);

    if (onProgress) {
      onProgress({
        step: 'Inserting Data',
        content: `Inserting ${sampleData.totalRecords} records into database...`
      });
    }

    try {
      // Load the application's database module
      const dbPath = require('path').join(appPath, 'src/database/index.js');
      const db = require(dbPath);

      let insertedCount = 0;

      for (const model of sampleData.models) {
        console.log(`[SeedExpert] Inserting ${model.records.length} records into ${model.tableName}`);

        for (const record of model.records) {
          try {
            await db.insert(model.tableName, record);
            insertedCount++;

            if (onProgress && insertedCount % 10 === 0) {
              onProgress({
                step: 'Inserting Data',
                content: `Inserted ${insertedCount}/${sampleData.totalRecords} records...`
              });
            }
          } catch (error) {
            console.error(`[SeedExpert] Failed to insert record into ${model.tableName}:`, error.message);
          }
        }
      }

      console.log(`[SeedExpert] Successfully inserted ${insertedCount}/${sampleData.totalRecords} records`);

      if (onProgress) {
        onProgress({
          step: 'Data Seeding Complete',
          content: `Successfully inserted ${insertedCount} records across ${sampleData.models.length} tables`
        });
      }

      return {
        success: true,
        insertedCount,
        totalRecords: sampleData.totalRecords
      };

    } catch (error) {
      console.error('[SeedExpert] Failed to insert sample data:', error);

      if (onProgress) {
        onProgress({
          step: 'Seeding Failed',
          content: `Error: ${error.message}`
        });
      }

      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SeedExpert;
