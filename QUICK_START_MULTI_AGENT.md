# Quick Start: Multi-Agent System

## Enable Multi-Agent Mode

### 1. Update Backend Environment

Create or edit `/backend/.env`:

```bash
# Anthropic API Key (required)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Enable Multi-Agent System
USE_MULTI_AGENT=true
```

### 2. Restart Backend

```bash
cd backend
npm start
```

You should see:
```
✓ Backend server running on port 5000
✓ WebSocket ready
```

### 3. Start Frontend (if not already running)

```bash
cd ui
npm start
```

---

## Test the System

### Example 1: Expense Approval Workflow

1. Open the application in your browser
2. Click the AI assistant (sparkle icon)
3. Type:

```
Create an expense approval workflow
```

4. Watch the multi-agent system work:

```
✓ Orchestrator: Initializing Multi-Agent System...
✓ WorkflowAgent: Analyzing Requirements...
✓ WorkflowAgent: Generating Workflow...
✓ WorkflowAgent: Workflow Generated (5 nodes, 4 connections)
✓ Orchestrator: Phase 2 - Parallel Generation...
✓ DataModelAgent: Generating Data Models...
✓ FormsAgent: Generating Forms...
✓ MobileDesignAgent: Generating Mobile UI...
✓ DataModelAgent: Data Models Generated (2 model(s))
✓ FormsAgent: Forms Generated (2 form(s) with 12 total fields)
✓ MobileDesignAgent: Mobile UI Generated (4 screen(s) with tab_bar navigation)
✓ Orchestrator: Integration...
✓ Orchestrator: Saving Artifacts...
✓ Orchestrator: Final Assembly...
✓ Orchestrator: Generation Complete
  ✓ Workflow: 5 nodes
  ✓ Data Models: 2
  ✓ Forms: 2 with 12 fields
  ✓ Mobile Screens: 4
```

5. Result:
   - ✅ Workflow on canvas with 5 nodes
   - ✅ 2 forms (Expense Submission, Manager Approval)
   - ✅ 2 data models (ExpenseRequest, Approval)
   - ✅ 4 mobile screens (List, Form, Detail, Dashboard)

### Example 2: Leave Request Workflow

```
Create a leave request approval workflow with calendar integration
```

Result:
- Workflow with calendar date selection
- Leave request form
- Manager approval form
- Mobile app with calendar view

### Example 3: Customer Onboarding

```
Design a customer onboarding workflow with document verification
```

Result:
- Multi-step onboarding workflow
- Document upload forms
- Verification tasks
- Customer portal mobile app

---

## Verify Multi-Agent Mode

### Check Backend Logs

When you generate a workflow, you should see:

```
Using Multi-Agent System for workflow generation
Multi-Agent Generation Started: {
  hasExistingWorkflow: false,
  conversationLength: 1
}
Multi-Agent Generation Complete: {
  nodes: 5,
  forms: 2,
  dataModels: 2,
  mobileScreens: 4
}
```

### Check Frontend

The thinking panel should show:
- **Orchestrator** messages
- **WorkflowAgent** messages
- **DataModelAgent** messages
- **FormsAgent** messages
- **MobileDesignAgent** messages

### Inspect Output

Click on a workflow node and check:
- `data.formId` → Should reference a generated form
- `data.dataModel` → Should reference a data model
- Workflow should have `mobileUI` property

---

## Disable Multi-Agent Mode

If you want to go back to single-agent:

```bash
# In /backend/.env
USE_MULTI_AGENT=false
```

Or just remove the line entirely (defaults to false).

---

## Troubleshooting

### Multi-Agent Not Running

**Symptom**: Backend logs show "Using Claude AI" instead of "Using Multi-Agent System"

**Fixes**:
1. Check `.env` file exists in `/backend/`
2. Verify `USE_MULTI_AGENT=true`
3. Restart backend server
4. Clear any caching (`rm -rf node_modules/.cache`)

### Agent Failures

**Symptom**: Some agents show errors in logs

**Fixes**:
1. Check API key validity
2. Verify internet connection
3. Check Anthropic API status
4. System will fallback automatically to single-agent

### No Mobile UI Generated

**Symptom**: Workflow generated but no `mobileUI` property

**Possible Causes**:
1. MobileDesignAgent failed (check logs)
2. Using single-agent mode
3. API rate limiting

**Fix**: Agent failures are graceful - mobile UI will be empty but workflow still works

### Performance Issues

**Symptom**: Generation takes too long (>15s)

**Causes**:
1. Network latency
2. API rate limits
3. Large workflows

**Optimization**:
- Reduce workflow complexity in prompt
- Check network speed
- Verify API key tier limits

---

## Next Steps

### 1. Explore Generated Mobile UI

Check the workflow object:

```javascript
console.log(workflow.mobileUI);
// {
//   screens: [...],
//   navigation: {...}
// }
```

### 2. Customize Agent Behavior

Edit agent knowledge bases:
- `/backend/src/services/agents/WorkflowAgent.js`
- `/backend/src/services/agents/DataModelAgent.js`
- `/backend/src/services/agents/FormsAgent.js`
- `/backend/src/services/agents/MobileDesignAgent.js`

### 3. Add New Agents

Follow the pattern in `/backend/src/services/agents/README.md`

Example - API Agent:

```javascript
const BaseAgent = require('./BaseAgent');

class APIAgent extends BaseAgent {
  constructor() {
    super('APIAgent', apiKnowledgeBase, 'claude-sonnet-4-20250514');
  }

  async execute(sharedContext, onThinking) {
    // Generate REST API specification
    // Return OpenAPI/Swagger spec
  }
}
```

Then add to orchestrator:

```javascript
this.apiAgent = new APIAgent();

// In parallel phase:
const apiSpec = await this.apiAgent.execute(sharedContext, emitThinking);
workflow.apiSpec = apiSpec;
```

---

## Questions?

- Check `/backend/src/services/agents/README.md`
- Check `MULTI_AGENT_IMPLEMENTATION.md`
- Review agent source code
- Check backend console logs

---

🎉 **Enjoy your new multi-agent workflow generation system!**
