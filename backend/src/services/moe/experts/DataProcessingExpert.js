/**
 * DataProcessingExpert - Specialized in data processing and ETL workflows
 */

const BaseAgent = require('../../agents/BaseAgent');
const { workflowKnowledgeBase } = require('../../../utils/workflow-knowledge-base');

class DataProcessingExpert extends BaseAgent {
  constructor() {
    const knowledgeBase = `
# Data Processing Expert

## Specialization:
I am an expert in **data processing workflows** including:
- ETL (Extract, Transform, Load) pipelines
- Data validation and cleansing
- Batch processing
- Data aggregation and calculations
- Data enrichment and normalization
- Data migration workflows
- Real-time data streaming processes
- Data quality checks

## Workflow Patterns I Excel At:

### 1. ETL Pipeline
Start → Extract Data → Validate → Transform → {
  Valid: Load to Target
  Invalid: Error Log + Notification
} → End

### 2. Batch Processing
Start → Fetch Batch → Loop {
  Process Record → Transform → Validate → {
    Valid: Accumulate
    Invalid: Reject Log
  }
} → Commit Batch → End

### 3. Data Validation & Cleansing
Start → Load Data → Validate {
  Schema Check
  Business Rules
  Duplicate Detection
  Referential Integrity
} → Cleanse → Output Clean Data → End

### 4. Data Aggregation
Start → Fetch Data → Group By → Calculate {
  Sum, Average, Count, Min, Max
} → Store Results → End

### 5. Data Enrichment
Start → Fetch Base Data → Lookup Related Data → Merge → {
  Complete: Continue
  Missing: Flag for Review
} → Enrich → Store → End

### 6. Data Migration
Start → Extract from Source → Transform Schema → Map Fields → {
  Validate → Load to Target
  Error → Rollback + Log
} → Verify → End

## Best Practices:
- Always validate data at entry points
- Include error handling for bad data
- Log rejected records for review
- Use batch processing for large datasets
- Implement rollback mechanisms
- Add data quality checks
- Monitor processing metrics
- Handle duplicates appropriately

## Data Processing Concepts:
- **Validation**: Schema, type, format, business rules
- **Transformation**: Mapping, conversion, calculation
- **Aggregation**: Sum, count, average, grouping
- **Filtering**: Conditional selection
- **Enrichment**: Adding related data
- **Deduplication**: Removing duplicates
- **Normalization**: Standardizing formats
- **Error Handling**: Reject logs, dead letter queues

${JSON.stringify(workflowKnowledgeBase, null, 2)}

## Output Format:
{
  "id": "workflow_xxx",
  "name": "Data Processing Workflow",
  "complexity": "medium|complex",
  "domain": "dataProcessing",
  "nodes": [...],
  "connections": [...],
  "dataSource": "...",
  "dataTarget": "...",
  "transformations": [...],
  "validations": [...],
  "errorHandling": {...}
}
`;

    super('DataProcessingExpert', knowledgeBase, 'claude-sonnet-4-20250514'); // Sonnet for data logic
  }

  async execute(sharedContext, onThinking) {
    const { userRequirements } = sharedContext;

    if (onThinking) {
      onThinking({
        agent: this.name,
        step: 'Generating Data Processing Workflow',
        content: 'Designing ETL pipeline with validation, transformation, and error handling...'
      });
    }

    const prompt = `Generate a data processing workflow for: "${userRequirements}"

Include:
1. Data extraction/input node
2. Validation nodes with rules
3. Transformation/processing nodes
4. Error handling and rejection paths
5. Data loading/output nodes
6. Quality checks and logging

Consider:
- What data sources are involved?
- What transformations are needed?
- What validation rules apply?
- How should errors be handled?
- Is batch or real-time processing needed?
- What are the data quality requirements?

IMPORTANT: Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "id": "workflow_<timestamp>",
  "name": "Data Processing Workflow",
  "complexity": "medium",
  "domain": "dataProcessing",
  "nodes": [
    {
      "id": "node_1",
      "type": "startProcess",
      "position": {"x": 0, "y": 0},
      "data": {
        "label": "Extract Data",
        "trigger": "...",
        "description": "..."
      }
    },
    // ... more nodes including validation, dataProcess, decision for error handling, etc.
  ],
  "connections": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    },
    // ... ALL connections including error paths, validation branches
  ],
  "dataSource": "...",
  "dataTarget": "...",
  "transformations": [],
  "validations": []
}

Ensure:
- Every node has complete data properties
- connections array includes ALL paths (main flow + error/validation branches)
- Decision/validation nodes have multiple outgoing connections for different outcomes
- Each connection has: id, source, target
- Focus on data integrity and error recovery`;

    const messages = [{
      role: 'user',
      content: prompt
    }];

    const responseText = await this.getResponse(messages);
    const workflow = this.parseJsonResponse(responseText);

    workflow.expertType = 'DataProcessingExpert';
    workflow.domain = 'dataProcessing';

    return workflow;
  }
}

module.exports = DataProcessingExpert;
