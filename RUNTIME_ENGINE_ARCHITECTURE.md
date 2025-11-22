# Workflow Runtime Engine Architecture

## Overview
Multi-agent workflow runtime engine with LLM intelligence, state management, failure recovery, and dynamic execution.

## Architecture Components

### 1. Database Layer ✅
- **WorkflowInstance Model** - State representation
- **WorkflowDatabase** - File-based persistence (can upgrade to PostgreSQL/MongoDB)
- **State Storage** - Process data, execution history, checkpoints

### 2. Runtime Agents

#### ExecutionAgent
- Executes workflow tasks based on type
- Handles: userTask, scriptTask, serviceTask, sendTask, businessRuleTask
- API integration for service tasks
- Form generation for human tasks

#### StateManagementAgent
- Persists instance state to database
- Creates checkpoints for recovery
- Manages process variables
- Tracks execution history

#### RulesValidationAgent
- Evaluates business rules using LLM
- Validates data against conditions
- Gateway decision logic
- Conditional routing

#### NotificationAgent
- Email/SMS/Webhook notifications
- Event-driven alerts
- Task assignment notifications
- Process completion notices

#### FormAgent
- Dynamic form generation for human tasks
- Form submission handling
- Field validation
- User assignment

#### RecoveryAgent
- Detects failed instances
- Restores from last checkpoint
- Retry failed tasks
- Dead letter queue management

### 3. LLM Intelligence Layer
- **Dynamic Orchestration** - Claude AI decides next steps
- **Contextual Execution** - Understands workflow intent
- **Adaptive Routing** - Intelligent gateway decisions
- **Error Resolution** - Suggests recovery strategies

### 4. Workflow Runtime Engine (Orchestrator)
- Coordinates all agents
- Manages workflow lifecycle
- Handles parallel/sequential execution
- Event loop for async operations

### 5. API Layer
- `POST /api/runtime/start` - Start workflow instance
- `POST /api/runtime/complete-task` - Complete human task
- `GET /api/runtime/instance/:id` - Get instance status
- `POST /api/runtime/recover/:id` - Recover failed instance
- `GET /api/runtime/tasks` - Get pending tasks

## Execution Flow

```
1. Parse Workflow JSON
2. Create Instance → Save to DB
3. Find Start Node
4. Execute Node (Task-specific logic)
   - Script Task → Run code
   - User Task → Generate form, wait
   - Service Task → Call API
   - Decision Gateway → LLM evaluation
5. Save State Checkpoint
6. Determine Next Node
7. Repeat until End Event
8. Mark Complete → Save final state
```

## State Management

```javascript
{
  instanceId: "instance_123",
  status: "RUNNING",
  currentNodeId: "node_5",
  processData: {
    // User variables
    amount: 5000,
    approved: false
  },
  executionHistory: [
    { nodeId: "node_1", action: "START", timestamp: "..." },
    { nodeId: "node_2", action: "EXECUTE", result: {...} }
  ],
  checkpoints: [...]
}
```

## Failure Recovery

1. Detect failed instance (status = FAILED)
2. Load last checkpoint
3. Resume from currentNodeId
4. Retry with exponential backoff
5. Move to dead letter queue if max retries exceeded

## Form Integration

Human tasks automatically generate forms:
- Field types from task data
- Validation rules
- Assignment to users/groups
- Task inbox UI

## Notification System

Triggered on:
- Workflow start
- Task assignment
- Process completion
- Errors/failures
- SLA violations

## Implementation Status

✅ Database Models Created
✅ Database Service Created
⏳ Runtime Agents (Next step)
⏳ Orchestrator Engine (Next step)
⏳ API Endpoints (Next step)
⏳ LLM Integration (Next step)

## Next Steps

Would you like me to:
1. Implement the complete multi-agent runtime system (requires significant code)
2. Create a simplified version focusing on core execution
3. Prioritize specific features (e.g., LLM intelligence, forms, recovery)

The full implementation requires ~2000-3000 lines of code across multiple files.
