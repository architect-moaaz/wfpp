# Multi-Agent Workflow Generation System

## Overview

This multi-agent system generates complete workflow applications including:
- **Workflow structure** (nodes and connections)
- **Data models** (database schemas)
- **Forms** (with 64 component types)
- **Mobile UI** (screens and navigation)

## Architecture

```
User Request
     ↓
AgentOrchestrator
     ├─→ [Phase 1] WorkflowAgent (Sequential)
     │
     └─→ [Phase 2] Parallel Execution:
         ├─→ DataModelAgent
         ├─→ FormsAgent
         └─→ MobileDesignAgent
     ↓
Complete Workflow Package
```

## Agents

### 1. WorkflowAgent
- **Model**: Claude Sonnet 4
- **Purpose**: Generate workflow structure
- **Knowledge Base**: BPMN patterns, workflow components
- **Output**: Nodes and connections

### 2. DataModelAgent
- **Model**: Claude Sonnet 4
- **Purpose**: Design data schemas
- **Knowledge Base**: Database design, validation rules
- **Output**: Data models with fields and relationships

### 3. FormsAgent
- **Model**: Claude Haiku 4.5
- **Purpose**: Create forms with appropriate components
- **Knowledge Base**: 64-component catalog
- **Output**: Forms with fields mapped to data models

### 4. MobileDesignAgent
- **Model**: Claude Sonnet 4
- **Purpose**: Generate mobile UI
- **Knowledge Base**: Mobile components, navigation patterns
- **Output**: Screens, components, and navigation structure

## Configuration

### Enable Multi-Agent Mode

Add to `/backend/.env`:

```bash
# Enable Multi-Agent System
USE_MULTI_AGENT=true

# Required: Anthropic API Key
ANTHROPIC_API_KEY=your_api_key_here
```

### Disable Multi-Agent Mode

```bash
# Use single-agent (default)
USE_MULTI_AGENT=false
```

## Execution Flow

### Phase 1: Workflow Structure (Sequential)
1. WorkflowAgent analyzes requirements
2. Generates workflow nodes and connections
3. Validates BPMN compliance

### Phase 2: Parallel Generation
Run simultaneously for 3x speed improvement:
- **DataModelAgent**: Creates data schemas
- **FormsAgent**: Generates forms
- **MobileDesignAgent**: Designs mobile UI

### Phase 3: Integration
1. Bind data models to forms
2. Link forms to workflow nodes
3. Connect mobile screens to workflow steps

### Phase 4: Persistence
1. Save forms to FormDatabase
2. Save data models to DataModelDatabase

### Phase 5: Final Assembly
1. Embed all artifacts into workflow
2. Generate summary
3. Return complete package

## Output Structure

```javascript
{
  workflow: {
    id: "workflow_xxx",
    nodes: [...],
    connections: [...],
    forms: [...],           // Embedded
    dataModels: [...],      // Embedded
    mobileUI: {             // Embedded
      screens: [...],
      navigation: {...}
    },
    metadata: {
      workflowId: "...",
      generatedBy: "multi-agent-system",
      agents: {
        workflow: "WorkflowAgent",
        dataModels: "DataModelAgent",
        forms: "FormsAgent",
        mobileUI: "MobileDesignAgent"
      }
    }
  },
  thinking: [...],          // Agent reasoning steps
  summary: {...}            // Generation summary
}
```

## Benefits

### Specialization
Each agent has deep expertise in its domain with specialized knowledge bases.

### Parallel Processing
Data models, forms, and mobile UI generate simultaneously, reducing total time.

### Better Quality
Domain-specific prompts and validation produce higher quality outputs.

### Scalability
Easy to add new agents (e.g., API agent, documentation agent, testing agent).

### Maintainability
Clear separation of concerns makes debugging and updates easier.

## Performance

### Single-Agent (Current Default)
- Time: ~5-8 seconds
- API Calls: 2
- Cost: Low

### Multi-Agent (Opt-in)
- Time: ~6-10 seconds (despite 3x parallelization, more API calls)
- API Calls: 4 (sequential) + 3 (parallel) = ~7 total
- Cost: Medium-High
- Quality: Higher

## Error Handling

The system includes automatic fallback:

```
Multi-Agent → Single-Agent LLM → Rule-Based
```

If multi-agent fails, it falls back to the original single-agent system.

## Usage Example

```javascript
const generator = new AIWorkflowGenerator();

// Multi-agent mode (if USE_MULTI_AGENT=true)
await generator.generateWorkflowStream(
  "Create an expense approval workflow",
  emitEvent,
  existingWorkflow,
  conversationHistory
);

// Result includes:
// - Workflow with 5 nodes
// - 2 data models (ExpenseRequest, Approval)
// - 2 forms (Expense Submission, Manager Review)
// - 4 mobile screens (List, Form, Detail, Dashboard)
```

## Extending the System

### Add New Agent

1. Create agent class extending `BaseAgent`:

```javascript
const BaseAgent = require('./BaseAgent');

class APIAgent extends BaseAgent {
  constructor() {
    super('APIAgent', knowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    // Implementation
  }
}
```

2. Add to orchestrator:

```javascript
this.apiAgent = new APIAgent();

// In orchestration:
const apiSpec = await this.apiAgent.execute(sharedContext, emitThinking);
```

3. Update output structure:

```javascript
workflow.apiSpec = apiSpec;
```

## Monitoring

The system emits real-time thinking steps:

```javascript
emitEvent({
  type: 'thinking-step',
  data: {
    agent: 'WorkflowAgent',
    step: 'Generating Workflow',
    content: 'Creating nodes and connections...'
  }
});
```

Monitor in the frontend to show agent progress.

## Troubleshooting

### Multi-Agent Not Running

Check:
1. `USE_MULTI_AGENT=true` in `.env`
2. Valid `ANTHROPIC_API_KEY`
3. Backend logs show "Using Multi-Agent System"

### Agent Failures

Agents fail gracefully and return empty results. Check:
1. API key validity
2. Model availability
3. Network connectivity
4. Rate limiting

### Fallback Behavior

System automatically falls back:
- Multi-Agent fails → Single-Agent LLM
- Single-Agent fails → Rule-Based
- Ensures generation always completes

## Future Enhancements

- **API Agent**: Generate REST API specs
- **Documentation Agent**: Create user guides
- **Testing Agent**: Generate test cases
- **Deployment Agent**: Create deployment configs
- **Analytics Agent**: Add tracking and metrics

---

**Questions?** Check the main README or open an issue.
