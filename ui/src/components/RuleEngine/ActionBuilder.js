import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import './RuleEngine.css';

const ACTION_TYPES = [
  { value: 'setVariable', label: 'Set Variable' },
  { value: 'sendEmail', label: 'Send Email' },
  { value: 'sendNotification', label: 'Send Notification' },
  { value: 'callWebhook', label: 'Call Webhook' },
  { value: 'updateRecord', label: 'Update Record' },
  { value: 'createRecord', label: 'Create Record' },
  { value: 'log', label: 'Log Message' },
  { value: 'stopWorkflow', label: 'Stop Workflow' },
  { value: 'throwError', label: 'Throw Error' }
];

const ActionBuilder = ({ actions, onChange }) => {
  const [actionList, setActionList] = React.useState(
    Array.isArray(actions) ? actions : actions?.actions || []
  );

  React.useEffect(() => {
    if (onChange) {
      onChange({ actions: actionList });
    }
  }, [actionList]);

  const addAction = () => {
    setActionList([
      ...actionList,
      { type: 'setVariable', params: {} }
    ]);
  };

  const removeAction = (index) => {
    setActionList(actionList.filter((_, i) => i !== index));
  };

  const updateAction = (index, field, value) => {
    const updated = [...actionList];
    if (field === 'type') {
      updated[index] = { type: value, params: {} };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setActionList(updated);
  };

  const updateActionParam = (index, paramKey, paramValue) => {
    const updated = [...actionList];
    updated[index] = {
      ...updated[index],
      params: {
        ...updated[index].params,
        [paramKey]: paramValue
      }
    };
    setActionList(updated);
  };

  const renderActionParams = (action, index) => {
    switch (action.type) {
      case 'setVariable':
        return (
          <>
            <div className="action-param">
              <label>Variable Name</label>
              <input
                type="text"
                value={action.params?.name || ''}
                onChange={(e) => updateActionParam(index, 'name', e.target.value)}
                placeholder="variableName"
              />
            </div>
            <div className="action-param">
              <label>Value</label>
              <input
                type="text"
                value={action.params?.value || ''}
                onChange={(e) => updateActionParam(index, 'value', e.target.value)}
                placeholder="value or expression"
              />
            </div>
          </>
        );

      case 'sendEmail':
        return (
          <>
            <div className="action-param">
              <label>To</label>
              <input
                type="text"
                value={action.params?.to || ''}
                onChange={(e) => updateActionParam(index, 'to', e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="action-param">
              <label>Subject</label>
              <input
                type="text"
                value={action.params?.subject || ''}
                onChange={(e) => updateActionParam(index, 'subject', e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div className="action-param">
              <label>Body</label>
              <textarea
                value={action.params?.body || ''}
                onChange={(e) => updateActionParam(index, 'body', e.target.value)}
                placeholder="Email body content"
                rows={3}
              />
            </div>
          </>
        );

      case 'sendNotification':
        return (
          <>
            <div className="action-param">
              <label>Message</label>
              <input
                type="text"
                value={action.params?.message || ''}
                onChange={(e) => updateActionParam(index, 'message', e.target.value)}
                placeholder="Notification message"
              />
            </div>
            <div className="action-param">
              <label>Type</label>
              <select
                value={action.params?.notificationType || 'info'}
                onChange={(e) => updateActionParam(index, 'notificationType', e.target.value)}
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
          </>
        );

      case 'callWebhook':
        return (
          <>
            <div className="action-param">
              <label>URL</label>
              <input
                type="text"
                value={action.params?.url || ''}
                onChange={(e) => updateActionParam(index, 'url', e.target.value)}
                placeholder="https://api.example.com/webhook"
              />
            </div>
            <div className="action-param">
              <label>Method</label>
              <select
                value={action.params?.method || 'POST'}
                onChange={(e) => updateActionParam(index, 'method', e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="action-param">
              <label>Body (JSON)</label>
              <textarea
                value={action.params?.body || ''}
                onChange={(e) => updateActionParam(index, 'body', e.target.value)}
                placeholder='{"key": "value"}'
                rows={3}
              />
            </div>
          </>
        );

      case 'updateRecord':
      case 'createRecord':
        return (
          <>
            <div className="action-param">
              <label>Entity Type</label>
              <input
                type="text"
                value={action.params?.entity || ''}
                onChange={(e) => updateActionParam(index, 'entity', e.target.value)}
                placeholder="e.g., customer, order"
              />
            </div>
            {action.type === 'updateRecord' && (
              <div className="action-param">
                <label>Record ID</label>
                <input
                  type="text"
                  value={action.params?.id || ''}
                  onChange={(e) => updateActionParam(index, 'id', e.target.value)}
                  placeholder="Record ID or expression"
                />
              </div>
            )}
            <div className="action-param">
              <label>Data (JSON)</label>
              <textarea
                value={action.params?.data || ''}
                onChange={(e) => updateActionParam(index, 'data', e.target.value)}
                placeholder='{"field": "value"}'
                rows={3}
              />
            </div>
          </>
        );

      case 'log':
        return (
          <div className="action-param">
            <label>Message</label>
            <input
              type="text"
              value={action.params?.message || ''}
              onChange={(e) => updateActionParam(index, 'message', e.target.value)}
              placeholder="Log message"
            />
          </div>
        );

      case 'throwError':
        return (
          <>
            <div className="action-param">
              <label>Error Message</label>
              <input
                type="text"
                value={action.params?.message || ''}
                onChange={(e) => updateActionParam(index, 'message', e.target.value)}
                placeholder="Error message"
              />
            </div>
            <div className="action-param">
              <label>Error Code (optional)</label>
              <input
                type="text"
                value={action.params?.code || ''}
                onChange={(e) => updateActionParam(index, 'code', e.target.value)}
                placeholder="ERROR_CODE"
              />
            </div>
          </>
        );

      case 'stopWorkflow':
        return (
          <div className="action-param">
            <label>Reason (optional)</label>
            <input
              type="text"
              value={action.params?.reason || ''}
              onChange={(e) => updateActionParam(index, 'reason', e.target.value)}
              placeholder="Reason for stopping"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="action-builder">
      <div className="action-header">
        <h4>Actions</h4>
        <p className="help-text">Define what happens when conditions are met</p>
      </div>

      <div className="actions-list">
        {actionList.length === 0 ? (
          <div className="empty-state">
            <p>No actions defined. Click "Add Action" to get started.</p>
          </div>
        ) : (
          actionList.map((action, index) => (
            <div key={index} className="action-row">
              <div className="action-number">{index + 1}</div>

              <div className="action-content">
                <div className="action-type">
                  <label>Action Type</label>
                  <select
                    value={action.type}
                    onChange={(e) => updateAction(index, 'type', e.target.value)}
                  >
                    {ACTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="action-params">
                  {renderActionParams(action, index)}
                </div>
              </div>

              <button
                type="button"
                className="remove-btn"
                onClick={() => removeAction(index)}
                title="Remove action"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        className="add-action-btn"
        onClick={addAction}
      >
        <Plus size={16} />
        Add Action
      </button>
    </div>
  );
};

export default ActionBuilder;
