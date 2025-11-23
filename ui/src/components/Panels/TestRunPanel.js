import React, { useState } from 'react';
import './PanelStyles.css';
import { Play, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';
import WorkflowTestRunner from '../TestRun/WorkflowTestRunner';

const TestRunPanel = () => {
  const { currentWorkflow } = useWorkflow();
  const [showTestRunner, setShowTestRunner] = useState(false);

  const [testData, setTestData] = useState({
    email: 'test@example.com',
    phone: '+1-555-0123',
    creditScore: '750'
  });

  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const handleRunTest = () => {
    // Check if workflow has nodes
    if (!currentWorkflow || !currentWorkflow.nodes || currentWorkflow.nodes.length === 0) {
      alert('Please create a workflow before running a test');
      return;
    }

    // Launch the test runner in full-screen mode
    setShowTestRunner(true);
  };

  const handleRunLegacyTest = () => {
    setIsRunning(true);
    setTestResults(null);

    // Simulate test execution
    setTimeout(() => {
      setTestResults({
        status: 'success',
        steps: [
          { name: 'Start Process', status: 'passed', duration: '120ms' },
          { name: 'Validate Information', status: 'passed', duration: '250ms' },
          { name: 'Decision Point', status: 'passed', duration: '180ms' }
        ],
        totalDuration: '550ms'
      });
      setIsRunning(false);
    }, 2000);
  };

  // Show full-screen test runner
  if (showTestRunner) {
    return (
      <WorkflowTestRunner
        workflow={currentWorkflow}
        onClose={() => setShowTestRunner(false)}
      />
    );
  }

  return (
    <div className="panel-container">
      <div className="panel-header">
        <div className="panel-title">
          <Play size={24} />
          <div>
            <h2>Test Run</h2>
            <p>Test your workflow with live execution and visual progress</p>
          </div>
        </div>
        <button
          className="primary-btn"
          onClick={handleRunTest}
        >
          <Play size={16} />
          Launch Test Runner
        </button>
      </div>

      <div className="panel-content">
        <div className="test-section">
          <h3 className="section-title">Test Data Input</h3>
          <div className="form-grid">
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                value={testData.email}
                onChange={(e) => setTestData({ ...testData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div className="form-field">
              <label>Phone Number</label>
              <input
                type="text"
                value={testData.phone}
                onChange={(e) => setTestData({ ...testData, phone: e.target.value })}
                placeholder="Enter phone"
              />
            </div>
            <div className="form-field">
              <label>Credit Score</label>
              <input
                type="text"
                value={testData.creditScore}
                onChange={(e) => setTestData({ ...testData, creditScore: e.target.value })}
                placeholder="Enter credit score"
              />
            </div>
          </div>
        </div>

        {testResults && (
          <div className="test-section">
            <h3 className="section-title">Test Results</h3>
            <div className={`result-banner ${testResults.status}`}>
              {testResults.status === 'success' ? (
                <>
                  <CheckCircle size={24} />
                  <span>All tests passed successfully</span>
                </>
              ) : (
                <>
                  <XCircle size={24} />
                  <span>Test failed</span>
                </>
              )}
            </div>

            <div className="steps-list">
              {testResults.steps.map((step, index) => (
                <div key={index} className="step-result">
                  <div className="step-status">
                    {step.status === 'passed' ? (
                      <CheckCircle size={18} className="status-passed" />
                    ) : (
                      <XCircle size={18} className="status-failed" />
                    )}
                  </div>
                  <div className="step-info">
                    <div className="step-name">{step.name}</div>
                    <div className="step-duration">
                      <Clock size={12} />
                      {step.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="result-summary">
              Total execution time: <strong>{testResults.totalDuration}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestRunPanel;
