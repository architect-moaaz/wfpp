# Publish Button Integration Guide

## The Components Are Ready!

All files have been created:
- ✅ `ui/src/components/PublishButton.jsx`
- ✅ `ui/src/components/PublishModal.jsx`
- ✅ `ui/src/styles/PublishButton.css`
- ✅ `ui/src/styles/PublishModal.css`
- ✅ Backend APIs are integrated

## How to Add the Publish Button to Your UI

### Option 1: Test with Demo Page

I created `ui/src/components/PublishDemo.jsx` for you. To use it:

1. Open `/Users/m/Work/code/workflowpp/ui/src/App.js`

2. Import the demo:
```javascript
import PublishDemo from './components/PublishDemo';
```

3. Temporarily render it instead of your current content:
```javascript
return <PublishDemo />;
```

4. Visit http://localhost:3000 and you'll see the publish button demo

###Option 2: Add to Application Details Page

Find where you display application/workflow details and add:

```jsx
import PublishButton from './components/PublishButton';

// In your component:
<PublishButton
  workflowId={application.id}
  workflowName={application.name}
/>
```

### Option 3: Add to Toolbar/Header

If you have a toolbar or header component:

```jsx
import PublishButton from './components/PublishButton';

// In your Toolbar component:
<div className="toolbar">
  {/* Your other buttons */}
  <PublishButton
    workflowId={currentWorkflow?.id}
    workflowName={currentWorkflow?.name}
  />
</div>
```

## Testing the Button

Once integrated:

1. Click the "Publish" button
2. A modal will appear showing deployment progress
3. Watch the real-time logs update
4. After ~7 seconds, you'll see "Deployment Successful!"
5. Click "View Deployment" to see the mock URL

## What's Actually Happening

When you click Publish:

1. **Frontend** sends `POST /api/workflows/{id}/publish` with:
   ```json
   {
     "platform": "vercel",
     "environmentVars": {},
     "customDomain": null
   }
   ```

2. **Backend** responds immediately with:
   ```json
   {
     "deploymentId": "uuid-123",
     "status": "building",
     "streamUrl": "/api/deployments/uuid-123/stream"
   }
   ```

3. **Frontend** opens SSE connection to stream endpoint

4. **Backend** starts deployment process:
   - Validates workflow
   - Generates React + Express code
   - Simulates deployment to Vercel/Railway/Render
   - Streams logs in real-time

5. **Frontend** updates progress UI with each log

6. When complete, shows deployment URL

## Console Errors?

If you see errors about missing modules, you need to install axios:

```bash
cd ui
npm install axios
```

## Where is the Publish Button visible?

Currently **nowhere** - you need to add it to a component! Choose one of the options above.

For the quickest test, add this to your App.js temporarily:

```javascript
import PublishDemo from './components/PublishDemo';

// Replace your current return with:
return (
  <NotificationProvider>
    <PublishDemo />
  </NotificationProvider>
);
```

Then visit http://localhost:3000 to see it working!

## Need Help?

Tell me:
1. Which component/page you want the button on
2. Do you want it in a toolbar, sidebar, or main content area?
3. Should it only appear for certain applications/workflows?

I'll help you integrate it exactly where you need it!
