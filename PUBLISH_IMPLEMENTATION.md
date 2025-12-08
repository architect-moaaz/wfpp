# Publish Button Implementation

## Overview

The Publish button feature allows users to deploy their workflow applications directly from the WorkflowPP UI to cloud platforms like Vercel, Railway, and Render.

## What Was Implemented

### Backend Components

#### 1. API Routes (`backend/src/api/routes/publish.routes.js`)
- `POST /api/workflows/:workflowId/publish` - Publish a workflow
- `GET /api/workflows/:workflowId/deployments` - List deployments
- `GET /api/deployments/:deploymentId/status` - Get deployment status
- `GET /api/deployments/:deploymentId/stream` - Stream real-time logs (SSE)
- `DELETE /api/deployments/:deploymentId` - Stop a deployment

#### 2. Controllers (`backend/src/api/controllers/PublishController.js`)
Handles all deployment-related business logic including:
- Workflow validation and quota checks
- Deployment creation and management
- Real-time log streaming via Server-Sent Events (SSE)

#### 3. Services

**PublishService** (`backend/src/services/PublishService.js`)
- Core deployment orchestration
- User quota management
- Deployment lifecycle management
- Log broadcasting to subscribers

**WorkflowCodeGenerator** (`backend/src/services/WorkflowCodeGenerator.js`)
- Generates deployable React frontend code
- Generates Express backend API code
- Creates platform configuration files (vercel.json, render.yaml)
- Validates generated code for security

#### 4. Platform Adapters

**VercelPlatform** (`backend/src/services/deployment-platforms/VercelPlatform.js`)
- Deploys to Vercel serverless platform
- Best for: Static sites and serverless APIs
- Cost: $0-5/month per deployment

**RailwayPlatform** (`backend/src/services/deployment-platforms/RailwayPlatform.js`)
- Deploys to Railway container platform
- Best for: Full-stack applications with databases
- Cost: $5-15/month per deployment

**RenderPlatform** (`backend/src/services/deployment-platforms/RenderPlatform.js`)
- Deploys to Render.com
- Best for: Production-grade deployments
- Cost: $25-75/month per deployment

### Frontend Components

#### 1. PublishButton Component (`ui/src/components/PublishButton.jsx`)
- Clean, gradient-styled button
- Handles publish workflow
- Shows loading states
- Displays error messages

#### 2. PublishModal Component (`ui/src/components/PublishModal.jsx`)
- Real-time deployment progress display
- 4-step progress indicator:
  1. Validating Workflow
  2. Generating Code
  3. Building Application
  4. Deploying to Platform
- Live log streaming
- Success/failure states with deployment URLs

#### 3. Styles
- `ui/src/styles/PublishButton.css` - Button styling
- `ui/src/styles/PublishModal.css` - Modal and progress UI

## How It Works

### Deployment Flow

```
User clicks "Publish" button
  ↓
Frontend sends POST /api/workflows/:id/publish
  ↓
Backend validates workflow & user quota
  ↓
Create deployment record (status: 'building')
  ↓
Generate React + Express code from workflow
  ↓
Validate generated code for security
  ↓
Deploy to selected platform (Vercel/Railway/Render)
  ↓
Stream logs back to frontend via SSE
  ↓
Update deployment status to 'active' or 'failed'
  ↓
Return deployment URL to user
```

### Real-Time Log Streaming

The deployment process uses Server-Sent Events (SSE) for real-time log streaming:

1. Frontend connects to `/api/deployments/:id/stream`
2. Backend emits logs as they occur
3. Frontend updates UI with each log entry
4. Connection closes when deployment completes

### Security Features

- **Code validation**: Blocks dangerous patterns like `eval()`, `require()`, file system access
- **User quotas**: Limits deployments per user based on tier (free/pro/enterprise)
- **Authentication**: All endpoints require user authentication
- **Request validation**: Platform and environment variables are validated

## Usage Example

### In Your UI Component

```jsx
import React from 'react';
import PublishButton from './components/PublishButton';

function WorkflowEditor({ workflowId, workflowName }) {
  return (
    <div>
      <h1>{workflowName}</h1>
      {/* ... workflow editor UI ... */}

      <PublishButton
        workflowId={workflowId}
        workflowName={workflowName}
      />
    </div>
  );
}
```

### API Usage

#### Publish a Workflow

```bash
curl -X POST http://localhost:5000/api/workflows/workflow-123/publish \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "vercel",
    "environmentVars": {
      "API_URL": "https://api.example.com"
    },
    "customDomain": "myapp.com"
  }'
```

Response:
```json
{
  "deploymentId": "uuid-123",
  "status": "building",
  "message": "Deployment started",
  "streamUrl": "/api/deployments/uuid-123/stream"
}
```

#### Stream Deployment Logs

```javascript
const eventSource = new EventSource('/api/deployments/uuid-123/stream');

eventSource.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log(log.message);

  if (log.type === 'complete') {
    console.log('Deployment URL:', log.frontendUrl);
    eventSource.close();
  }
};
```

#### Get Deployment Status

```bash
curl http://localhost:5000/api/deployments/uuid-123/status
```

Response:
```json
{
  "id": "uuid-123",
  "status": "active",
  "frontendUrl": "https://workflow-123.vercel.app",
  "backendUrl": "https://workflow-123.vercel.app/api",
  "platform": "vercel",
  "deployedAt": "2025-01-20T10:30:00Z"
}
```

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Vercel
VERCEL_TOKEN=your-vercel-token

# Railway
RAILWAY_TOKEN=your-railway-token

# Render
RENDER_API_KEY=your-render-api-key
```

### User Quotas

Quotas are defined in `PublishService.js`:

```javascript
quotas = {
  free: {
    maxDeployments: 3,
    maxBuildsPerDay: 5
  },
  pro: {
    maxDeployments: 10,
    maxBuildsPerDay: 20
  },
  enterprise: {
    maxDeployments: 100,
    maxBuildsPerDay: 100
  }
}
```

## Next Steps for Production

1. **Replace Mock Authentication**
   - Update `backend/src/api/middleware/auth.js` with real JWT/session validation

2. **Add Database Integration**
   - Store deployments in PostgreSQL instead of in-memory Map
   - Track user quotas in database

3. **Implement Platform APIs**
   - Replace mock deployments with real Vercel/Railway/Render API calls
   - Handle webhooks for deployment status updates

4. **Add GitHub Integration**
   - Create temporary GitHub repos for deployments
   - Push generated code to repos
   - Link platforms to GitHub repos

5. **Enhance Code Generator**
   - Support more workflow types (data workflows, API workflows, etc.)
   - Generate more sophisticated applications based on workflow complexity
   - Add database migrations

6. **Add Monitoring**
   - Track deployment success/failure rates
   - Monitor resource usage
   - Alert on quota exhaustion

7. **Implement Billing**
   - Charge for deployments
   - Upgrade user tiers
   - Track costs per deployment

## Cost Estimates

### Per Deployment

- **Serverless (Vercel)**: $0-5/month
  - Best for: Simple frontends, light APIs
  - Auto-scales to zero

- **Container (Railway)**: $5-15/month
  - Best for: Full-stack with database
  - Always-on, persistent

- **Full-stack (Render)**: $25-75/month
  - Best for: Production applications
  - Highest reliability

### Infrastructure

- **Build Server**: $50-100/month (Railway/Render worker)
- **Storage**: $10-20/month (S3 for deployment packages)
- **Database**: $5-10/month overhead for deployment metadata

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                        Frontend                           │
│  ┌──────────────┐        ┌─────────────────────────┐    │
│  │ PublishButton│───────▶│    PublishModal         │    │
│  └──────────────┘        │  - Progress Steps       │    │
│                          │  - Live Logs (SSE)      │    │
│                          │  - Deployment URL       │    │
│                          └─────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
                                 │
                                 │ HTTP POST
                                 ▼
┌──────────────────────────────────────────────────────────┐
│                        Backend API                        │
│  ┌──────────────┐        ┌─────────────────────────┐    │
│  │ Publish      │───────▶│  PublishService         │    │
│  │ Controller   │        │  - Quota Check          │    │
│  └──────────────┘        │  - Create Deployment    │    │
│                          │  - Stream Logs (SSE)    │    │
│                          └────────┬────────────────┘    │
│                                   │                       │
│                          ┌────────▼────────────────┐    │
│                          │ WorkflowCodeGenerator   │    │
│                          │  - Generate React App   │    │
│                          │  - Generate Express API │    │
│                          │  - Validate Code        │    │
│                          └────────┬────────────────┘    │
│                                   │                       │
│               ┌───────────────────┼───────────────────┐ │
│               │                   │                   │ │
│        ┌──────▼───────┐  ┌───────▼────────┐ ┌───────▼──────┐
│        │ Vercel       │  │ Railway         │ │ Render       │
│        │ Platform     │  │ Platform        │ │ Platform     │
│        └──────────────┘  └─────────────────┘ └──────────────┘
└──────────────────────────────────────────────────────────┘
                                 │
                                 │ Deploy
                                 ▼
┌──────────────────────────────────────────────────────────┐
│                    Cloud Platforms                        │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │ Vercel       │  │ Railway         │  │ Render     │ │
│  │ (Serverless) │  │ (Containers)    │  │ (Managed)  │ │
│  └──────────────┘  └─────────────────┘  └────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Files Created

### Backend
- `backend/src/api/routes/publish.routes.js` - API routes
- `backend/src/api/controllers/PublishController.js` - Request handlers
- `backend/src/api/middleware/auth.js` - Authentication middleware
- `backend/src/api/middleware/validation.js` - Request validation
- `backend/src/services/PublishService.js` - Core deployment service
- `backend/src/services/WorkflowCodeGenerator.js` - Code generation
- `backend/src/services/deployment-platforms/VercelPlatform.js` - Vercel adapter
- `backend/src/services/deployment-platforms/RailwayPlatform.js` - Railway adapter
- `backend/src/services/deployment-platforms/RenderPlatform.js` - Render adapter

### Frontend
- `ui/src/components/PublishButton.jsx` - Publish button component
- `ui/src/components/PublishModal.jsx` - Deployment progress modal
- `ui/src/styles/PublishButton.css` - Button styles
- `ui/src/styles/PublishModal.css` - Modal styles

### Documentation
- `PUBLISH_STRATEGY.md` - Detailed strategy and planning
- `PUBLISH_IMPLEMENTATION.md` - This file

## Testing

To test the publish feature:

1. Start the backend server:
   ```bash
   cd backend && npm start
   ```

2. Start the frontend:
   ```bash
   cd ui && npm start
   ```

3. Navigate to a workflow editor

4. Click the "Publish" button

5. Watch the deployment progress in the modal

6. The mock deployment will complete after ~7 seconds

7. You'll see a deployment URL (mock URL for now)

## Troubleshooting

**Issue**: "Deployment quota exceeded"
- **Solution**: Increase user quota in `PublishService.js` or upgrade user tier

**Issue**: "Platform not found"
- **Solution**: Ensure platform is one of: 'vercel', 'railway', 'render'

**Issue**: "Code validation failed"
- **Solution**: Check workflow for dangerous code patterns (eval, require, etc.)

**Issue**: SSE connection fails
- **Solution**: Ensure CORS is configured correctly for SSE requests

---

For more details, see:
- `PUBLISH_STRATEGY.md` - Full strategy and architecture decisions
- `DEPLOYMENT.md` - Production deployment guide
- `ONE_CLICK_DEPLOY.md` - Platform deployment options
