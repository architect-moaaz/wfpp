import React, { useState, useEffect } from 'react';
import { workflowsApi } from '../api/client';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const [wfRes, instRes] = await Promise.all([
        workflowsApi.list(),
        workflowsApi.getInstances().catch(() => ({ data: [] }))
      ]);
      setWorkflows(wfRes.data || []);
      setInstances(instRes.data || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkflow = async (data) => {
    try {
      await workflowsApi.start(selectedWorkflow.id, data);
      setShowStartModal(false);
      setSelectedWorkflow(null);
      loadWorkflows();
      alert('Workflow started successfully!');
    } catch (error) {
      alert('Error starting workflow: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading workflows...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Workflows</h1>
        <p>Manage and execute your workflows</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Workflows ({workflows.length})</h3>
        </div>
        {workflows.length === 0 ? (
          <div className="empty-state">
            <h3>No Workflows</h3>
            <p>No workflows have been defined yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Nodes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => (
                <tr key={wf.id}>
                  <td><strong>{wf.name}</strong></td>
                  <td>{wf.description || '-'}</td>
                  <td>{wf.nodes?.length || 0}</td>
                  <td>
                    <button
                      className="btn btn-success action-btn"
                      onClick={() => {
                        setSelectedWorkflow(wf);
                        setShowStartModal(true);
                      }}
                    >
                      Start
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3 className="card-title">Recent Instances</h3>
        </div>
        {instances.length === 0 ? (
          <div className="empty-state">
            <p>No workflow instances yet. Start a workflow to see it here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Instance ID</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {instances.slice(0, 10).map((inst) => (
                <tr key={inst.id}>
                  <td>{inst.id.substring(0, 8)}...</td>
                  <td>{inst.workflow_id}</td>
                  <td>
                    <span className={`status-badge status-${inst.status?.toLowerCase()}`}>
                      {inst.status}
                    </span>
                  </td>
                  <td>{new Date(inst.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
        title={`Start: ${selectedWorkflow?.name || 'Workflow'}`}
      >
        <p style={{ marginBottom: '16px', color: '#64748b' }}>
          Enter input data for this workflow (optional):
        </p>
        <FormRenderer
          form={{ fields: [
            { name: 'input', label: 'Input Data (JSON)', type: 'textarea', placeholder: '{"key": "value"}' }
          ]}}
          onSubmit={(data) => {
            const input = data.input ? JSON.parse(data.input) : {};
            handleStartWorkflow(input);
          }}
          onCancel={() => setShowStartModal(false)}
        />
      </Modal>
    </div>
  );
}