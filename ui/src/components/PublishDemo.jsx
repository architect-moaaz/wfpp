import React from 'react';
import PublishButton from './PublishButton';

const PublishDemo = () => {
  return (
    <div style={{
      padding: '40px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1>Publish Button Demo</h1>
      <p>Click the button below to test the workflow publishing feature:</p>

      <div style={{ marginTop: '24px' }}>
        <PublishButton
          workflowId="demo-workflow-123"
          workflowName="Demo Workflow"
        />
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>How it works:</h3>
        <ol>
          <li>Click the "Publish" button</li>
          <li>The system will start a mock deployment process</li>
          <li>You'll see a modal with real-time progress</li>
          <li>After about 7 seconds, deployment will complete</li>
          <li>You'll see a success message with a deployment URL</li>
        </ol>

        <h3 style={{ marginTop: '20px' }}>What's happening:</h3>
        <ul>
          <li>POST request to /api/workflows/demo-workflow-123/publish</li>
          <li>Server-Sent Events (SSE) stream deployment logs</li>
          <li>Mock Vercel deployment simulation</li>
          <li>Real-time UI updates</li>
        </ul>
      </div>
    </div>
  );
};

export default PublishDemo;
