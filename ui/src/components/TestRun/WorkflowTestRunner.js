import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import './WorkflowTestRunner.css';
import { Play, Pause, RotateCcw, CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';

// Custom node components with status styling
const TestRunNode = ({ data, id }) => {
  const getNodeStyle = () => {
    if (data.status === 'COMPLETED') {
      return {
        background: '#d1d5db',
        borderColor: '#9ca3af',
        color: '#6b7280',
        opacity: 0.6
      };
    }
    if (data.status === 'RUNNING' || data.status === 'CURRENT') {
      return {
        background: '#dbeafe',
        borderColor: '#3b82f6',
        color: '#1e40af',
        boxShadow: '0 0 0 2px #3b82f6'
      };
    }
    if (data.status === 'WAITING') {
      return {
        background: '#fef3c7',
        borderColor: '#f59e0b',
        color: '#92400e'
      };
    }
    if (data.status === 'FAILED') {
      return {
        background: '#fee2e2',
        borderColor: '#ef4444',
        color: '#991b1b'
      };
    }
    return {
      background: '#ffffff',
      borderColor: '#d1d5db',
      color: '#374151'
    };
  };

  const style = getNodeStyle();

  return (
    <div
      className="test-run-node"
      style={{
        background: style.background,
        borderColor: style.borderColor,
        color: style.color,
        opacity: style.opacity || 1,
        boxShadow: style.boxShadow || 'none'
      }}
    >
      <div className="node-header">
        {data.status === 'COMPLETED' && <CheckCircle size={14} />}
        {data.status === 'RUNNING' && <Loader size={14} className="spinning" />}
        {data.status === 'WAITING' && <Clock size={14} />}
        {data.status === 'FAILED' && <AlertCircle size={14} />}
        <span className="node-type">{data.type || data.label}</span>
      </div>
      <div className="node-label">{data.label}</div>
      {data.status && <div className="node-status">{data.status}</div>}
    </div>
  );
};

const nodeTypes = {
  startProcess: TestRunNode,
  validation: TestRunNode,
  decision: TestRunNode,
  notification: TestRunNode,
  dataProcess: TestRunNode,
  endEvent: TestRunNode,
  userTask: TestRunNode,
  scriptTask: TestRunNode,
  timerEvent: TestRunNode,
  serviceTask: TestRunNode,
  sendTask: TestRunNode,
  businessRuleTask: TestRunNode,
};

const WorkflowTestRunner = ({ workflow, onClose }) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [instance, setInstance] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showUserTaskForm, setShowUserTaskForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [inputData, setInputData] = useState({});
  const [startForm, setStartForm] = useState(null);
  const [error, setError] = useState(null);
  const pollInterval = useRef(null);
  const currentTaskId = useRef(null);

  // Initialize workflow visualization and fetch start form
  useEffect(() => {
    if (workflow && workflow.nodes) {
      // Reset ALL state when workflow changes
      setInstance(null);
      setExecutionHistory([]);
      setIsRunning(false);
      setShowUserTaskForm(false);
      setFormData({});
      setStartForm(null);
      setError(null);
      currentTaskId.current = null;

      // Clear any existing polling
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }

      const initialNodes = workflow.nodes.map(node => ({
        ...node,
        type: node.type || 'default',
        data: {
          ...node.data,
          status: null
        }
      }));
      setNodes(initialNodes);

      // Format edges for ReactFlow (need source, target, id)
      const connections = workflow.connections || workflow.edges || [];
      console.log('[TestRunner] Workflow connections/edges:', connections);
      console.log('[TestRunner] Workflow has connections?', !!workflow.connections, 'Has edges?', !!workflow.edges);

      const formattedEdges = connections.map(conn => {
        const edge = {
          id: conn.id || `edge-${conn.source}-${conn.target}`,
          source: conn.source,
          target: conn.target,
          label: conn.label || '',
          type: 'smoothstep',
          animated: false
        };
        // Only include sourceHandle and targetHandle if they're actually defined and not the string "undefined"
        if (conn.sourceHandle !== undefined && conn.sourceHandle !== null && conn.sourceHandle !== "undefined" && conn.sourceHandle !== "") {
          edge.sourceHandle = conn.sourceHandle;
        }
        if (conn.targetHandle !== undefined && conn.targetHandle !== null && conn.targetHandle !== "undefined" && conn.targetHandle !== "") {
          edge.targetHandle = conn.targetHandle;
        }
        return edge;
      });

      console.log('[TestRunner] Formatted edges for ReactFlow:', formattedEdges);
      setEdges(formattedEdges);

      // Fetch start form if startProcess node has a formId
      const startNode = workflow.nodes.find(node => node.type === 'startProcess');
      if (startNode && startNode.data && startNode.data.formId) {
        fetch(`http://localhost:5000/api/forms/${startNode.data.formId}`)
          .then(res => res.json())
          .then(result => {
            if (result.success && result.form) {
              setStartForm(result.form);
              // Initialize input data with empty values
              const initialInput = {};
              if (result.form.fields && Array.isArray(result.form.fields)) {
                result.form.fields.forEach(field => {
                  const fieldKey = field.name || field.fieldName || field.id;
                  initialInput[fieldKey] = '';
                });
              }
              setInputData(initialInput);
            }
          })
          .catch(err => {
            console.error('Error fetching start form:', err);
          });
      }
    }
  }, [workflow]);

  // Poll for instance updates
  const pollInstanceStatus = useCallback(async (instanceId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/runtime/instance/${instanceId}`);
      const result = await response.json();

      if (result.success) {
        setInstance(result.instance);
        console.log('[TestRunner] Execution History:', result.instance.executionHistory);
        setExecutionHistory(result.instance.executionHistory || []);

        // Update node statuses based on execution history
        setNodes(prevNodes => prevNodes.map(node => {
          const history = result.instance.executionHistory.find(h => h.nodeId === node.id);
          let status = null;

          if (history && history.result) {
            status = history.result.status;
          }

          // Mark current node
          if (result.instance.currentNodeId === node.id && result.instance.status === 'PAUSED') {
            status = 'CURRENT';
          }

          return {
            ...node,
            data: {
              ...node.data,
              status,
              type: node.type
            }
          };
        }));

        // Update edge styles based on execution progress
        setEdges(prevEdges => prevEdges.map(edge => {
          // Check if source node is completed
          const sourceHistory = result.instance.executionHistory.find(h => h.nodeId === edge.source);
          const targetHistory = result.instance.executionHistory.find(h => h.nodeId === edge.target);

          // Edge is completed if both source and target are completed
          const isCompleted = sourceHistory?.result?.status === 'COMPLETED' && targetHistory?.result?.status === 'COMPLETED';

          // Edge is active if source is completed and target is current/running
          const isActive = sourceHistory?.result?.status === 'COMPLETED' &&
                          (result.instance.currentNodeId === edge.target ||
                           targetHistory?.result?.status === 'RUNNING' ||
                           targetHistory?.result?.status === 'CURRENT');

          if (isCompleted) {
            return {
              ...edge,
              animated: false,
              style: { stroke: '#10b981', strokeWidth: 2 }, // Green for completed
              type: 'smoothstep'
            };
          } else if (isActive) {
            return {
              ...edge,
              animated: true,
              style: { stroke: '#3b82f6', strokeWidth: 3 }, // Blue animated for active
              type: 'smoothstep'
            };
          } else {
            return {
              ...edge,
              animated: false,
              style: { stroke: '#d1d5db', strokeWidth: 1.5 }, // Gray for pending
              type: 'smoothstep'
            };
          }
        }));

        // Check if user task is waiting
        if (result.instance.status === 'PAUSED' && result.instance.processData?.taskId) {
          setShowUserTaskForm(true);
          // Initialize form data ONLY if this is a NEW task (different taskId)
          if (result.instance.processData.taskId !== currentTaskId.current) {
            currentTaskId.current = result.instance.processData.taskId;
            if (result.instance.processData.fields && Array.isArray(result.instance.processData.fields)) {
              const initialFormData = {};
              result.instance.processData.fields.forEach(field => {
                const fieldKey = field.name || field.fieldName || field.id;
                initialFormData[fieldKey] = '';
              });
              setFormData(initialFormData);
            }
          }
        }

        // Stop polling if completed or failed
        if (result.instance.status === 'COMPLETED' || result.instance.status === 'FAILED') {
          setIsRunning(false);
          if (pollInterval.current) {
            clearInterval(pollInterval.current);
          }
        }
      }
    } catch (err) {
      console.error('Error polling instance:', err);
      setError(`Failed to poll workflow status: ${err.message}`);
    }
  }, []);

  // Start workflow execution
  const handleStartWorkflow = useCallback(async () => {
    setError(null);
    setIsRunning(true);
    setShowUserTaskForm(false);
    currentTaskId.current = null;

    try {
      // Prepare workflow definition for runtime engine
      const workflowDef = {
        id: workflow.id,
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections || workflow.edges || []
      };

      const response = await fetch('http://localhost:5000/api/runtime/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowDef,
          inputData,
          initiator: 'test-runner'
        })
      });

      const result = await response.json();

      if (result.success) {
        setInstance(result.instance);

        // Start polling for updates every 500ms
        pollInterval.current = setInterval(() => {
          pollInstanceStatus(result.instance.id);
        }, 500);
      } else {
        setError(result.error || 'Failed to start workflow');
        setIsRunning(false);
      }
    } catch (err) {
      console.error('Error starting workflow:', err);
      setError(`Failed to start workflow: ${err.message}`);
      setIsRunning(false);
    }
  }, [workflow, inputData, pollInstanceStatus]);

  // Complete user task
  const handleCompleteTask = useCallback(async () => {
    if (!instance || !instance.processData?.taskId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/runtime/complete-task/${instance.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: instance.processData.taskId,
          formData,
          completedBy: 'test-runner'
        })
      });

      const result = await response.json();

      if (result.success) {
        setShowUserTaskForm(false);
        setFormData({});
        // Continue polling to see workflow progress
      } else {
        setError(result.error || 'Failed to complete task');
      }
    } catch (err) {
      console.error('Error completing task:', err);
      setError(`Failed to complete task: ${err.message}`);
    }
  }, [instance, formData]);

  // Reset workflow
  const handleReset = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }
    setInstance(null);
    setExecutionHistory([]);
    setIsRunning(false);
    setShowUserTaskForm(false);
    setFormData({});
    setError(null);
    currentTaskId.current = null;

    // Reset node statuses
    setNodes(prevNodes => prevNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        status: null
      }
    })));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  return (
    <div className="workflow-test-runner">
      <div className="test-runner-header">
        <div className="header-left">
          <h2>Test Run: {workflow?.name || 'Workflow'}</h2>
          {instance && (
            <span className={`status-badge ${(instance.status || 'unknown').toLowerCase()}`}>
              {instance.status || 'UNKNOWN'}
            </span>
          )}
        </div>
        <div className="header-right">
          {!isRunning && !instance && (
            <button className="primary-btn" onClick={handleStartWorkflow}>
              <Play size={16} />
              Start Test
            </button>
          )}
          {instance && (
            <button className="secondary-btn" onClick={handleReset}>
              <RotateCcw size={16} />
              Reset
            </button>
          )}
          <button className="secondary-btn" onClick={onClose}>Close</button>
        </div>
      </div>

      <div className="test-runner-content">
        {/* Workflow Visualization */}
        <div className="workflow-visualization">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            panOnScroll={false}
          >
            <Background color="#e5e7eb" gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {/* Right Panel: Input Data & Forms */}
        <div className="test-runner-sidebar">
          {/* Input Data Section - Dynamic Form */}
          {!instance && startForm && (
            <div className="sidebar-section">
              <h3>{startForm.name || 'Input Data'}</h3>
              {startForm.description && (
                <p className="form-description">{startForm.description}</p>
              )}
              <div className="form-fields">
                {startForm.fields && startForm.fields.map((field, index) => (
                  <div key={`start-${field.name || field.fieldName || index}`} className="form-field">
                    {(() => {
                      const fieldKey = field.name || field.fieldName || field.id;
                      return (
                        <>
                          <label>
                            {field.label || fieldKey || 'Field'}
                            {field.required && <span className="required">*</span>}
                          </label>
                          {field.type === 'boolean' ? (
                            <select
                              value={inputData[fieldKey] || ''}
                              onChange={(e) => setInputData(prev => ({ ...prev, [fieldKey]: e.target.value === 'true' }))}
                              required={field.required}
                            >
                              <option value="">Select...</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : field.type === 'text' ? (
                            <textarea
                              value={inputData[fieldKey] || ''}
                              onChange={(e) => setInputData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                              placeholder={`Enter ${(field.label || fieldKey || 'value').toLowerCase()}`}
                              rows={3}
                            />
                          ) : field.type === 'number' ? (
                            <input
                              type="number"
                              value={inputData[fieldKey] || ''}
                              onChange={(e) => setInputData(prev => ({ ...prev, [fieldKey]: parseInt(e.target.value) || 0 }))}
                              placeholder={`Enter ${(field.label || fieldKey || 'value').toLowerCase()}`}
                              required={field.required}
                            />
                          ) : field.type === 'file' ? (
                            <input
                              type="file"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                setInputData(prev => ({ ...prev, [fieldKey]: file ? file.name : '' }));
                              }}
                              required={field.required}
                            />
                          ) : (
                            <input
                              type={field.type || 'text'}
                              value={inputData[fieldKey] || ''}
                              onChange={(e) => setInputData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                              placeholder={`Enter ${(field.label || fieldKey || 'value').toLowerCase()}`}
                              required={field.required}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback to empty state if no form */}
          {!instance && !startForm && (
            <div className="sidebar-section">
              <h3>Input Data</h3>
              <p className="info-message">No start form configured. Workflow will start with empty data.</p>
            </div>
          )}

          {/* User Task Form */}
          {showUserTaskForm && instance && instance.processData?.fields && Array.isArray(instance.processData.fields) && (
            <div className="sidebar-section">
              <h3>{instance.processData.taskName || 'User Task'}</h3>
              <div className="form-fields">
                {instance.processData.fields.map((field, index) => (
                  <div key={`task-${field.name || field.fieldName || index}`} className="form-field">
                    {(() => {
                      const fieldKey = field.name || field.fieldName || field.id;
                      return (
                        <>
                          <label>
                            {field.label || fieldKey || 'Field'}
                            {field.required && <span className="required">*</span>}
                          </label>
                          {field.type === 'boolean' ? (
                            <select
                              value={formData[fieldKey] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [fieldKey]: e.target.value === 'true' }))}
                              required={field.required}
                            >
                              <option value="">Select...</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : field.type === 'text' ? (
                            <textarea
                              value={formData[fieldKey] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                              placeholder={`Enter ${(field.label || fieldKey || 'value').toLowerCase()}`}
                              rows={3}
                            />
                          ) : field.type === 'number' ? (
                            <input
                              type="number"
                              value={formData[fieldKey] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [fieldKey]: parseInt(e.target.value) || 0 }))}
                              placeholder={`Enter ${(field.label || fieldKey || 'value').toLowerCase()}`}
                              required={field.required}
                            />
                          ) : (
                            <input
                              type={field.type || 'text'}
                              value={formData[fieldKey] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                              placeholder={`Enter ${(field.label || fieldKey || 'value').toLowerCase()}`}
                              required={field.required}
                            />
                          )}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
              <button className="primary-btn" onClick={handleCompleteTask}>
                Submit
              </button>
            </div>
          )}

          {/* Execution History */}
          {executionHistory.length > 0 && (
            <div className="sidebar-section">
              <h3>Execution History</h3>
              <div className="execution-timeline">
                {executionHistory
                  .filter(entry => {
                    // Filter out entries without proper status
                    if (!entry.result || !entry.result.status) {
                      console.log('[TestRunner] Filtered out entry without status:', entry);
                      return false;
                    }
                    // Filter out GATEWAY actions (they create duplicates)
                    if (entry.action === 'GATEWAY') {
                      return false;
                    }
                    return true;
                  })
                  .map((entry, index) => {
                    // Find the node to get its label and type
                    const node = workflow.nodes.find(n => n.id === entry.nodeId);
                    const nodeLabel = node?.data?.label || node?.data?.taskName || entry.nodeId;
                    const nodeType = node?.type || entry.action;

                    return (
                      <div key={`${entry.nodeId}-${entry.timestamp}-${index}`} className={`timeline-item ${(entry.result?.status || 'unknown').toLowerCase()}`}>
                        <div className="timeline-marker">
                          {entry.result?.status === 'COMPLETED' && <CheckCircle size={16} />}
                          {entry.result?.status === 'WAITING' && <Clock size={16} />}
                          {entry.result?.status === 'FAILED' && <AlertCircle size={16} />}
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div className="timeline-title">{nodeLabel}</div>
                            <div className="timeline-type">{nodeType}</div>
                          </div>
                          <div className="timeline-status-bar">
                            <span className={`status-badge ${(entry.result?.status || 'unknown').toLowerCase()}`}>
                              {entry.result?.status || 'UNKNOWN'}
                            </span>
                            <div className="timeline-time">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          {entry.result?.output && (
                            <details className="timeline-details">
                              <summary>View Details</summary>
                              <div className="timeline-output">
                                {typeof entry.result.output === 'object' ? (
                                  <div className="output-fields">
                                    {Object.entries(entry.result.output).map(([key, value]) => (
                                      <div key={key} className="output-field">
                                        <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <pre>{JSON.stringify(entry.result.output, null, 2)}</pre>
                                )}
                              </div>
                            </details>
                          )}
                          {entry.result?.dataChanges && Object.keys(entry.result.dataChanges).length > 0 && (
                            <div className="timeline-data-changes">
                              <div className="data-changes-label">Data Changes:</div>
                              {Object.entries(entry.result.dataChanges).map(([key, value]) => (
                                <div key={key} className="data-change-item">
                                  <span className="data-key">{key}:</span> <span className="data-value">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Process Data */}
          {instance && instance.processData && (
            <div className="sidebar-section">
              <h3>Process Data</h3>
              <pre className="process-data">
                {JSON.stringify(instance.processData, null, 2)}
              </pre>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="sidebar-section error-section">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowTestRunner;
