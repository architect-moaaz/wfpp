import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import './RuleEngine.css';

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'greaterThan', label: 'Greater Than' },
  { value: 'lessThan', label: 'Less Than' },
  { value: 'greaterThanOrEqual', label: 'Greater Than or Equal' },
  { value: 'lessThanOrEqual', label: 'Less Than or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does Not Contain' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'isEmpty', label: 'Is Empty' },
  { value: 'isNotEmpty', label: 'Is Not Empty' },
  { value: 'in', label: 'In List' },
  { value: 'notIn', label: 'Not In List' }
];

const ConditionBuilder = ({ conditions, onChange, dataModels = [] }) => {
  const [logicType, setLogicType] = React.useState(conditions?.all ? 'all' : 'any');
  const [conditionList, setConditionList] = React.useState(
    conditions?.all || conditions?.any || []
  );

  React.useEffect(() => {
    if (onChange) {
      onChange({
        [logicType]: conditionList
      });
    }
  }, [logicType, conditionList]);

  const addCondition = () => {
    setConditionList([
      ...conditionList,
      { field: '', operator: 'equals', value: '' }
    ]);
  };

  const removeCondition = (index) => {
    setConditionList(conditionList.filter((_, i) => i !== index));
  };

  const updateCondition = (index, field, value) => {
    const updated = [...conditionList];
    updated[index] = { ...updated[index], [field]: value };
    setConditionList(updated);
  };

  // Extract fields from data models for autocomplete
  const getAvailableFields = () => {
    const fields = [];
    dataModels.forEach(model => {
      if (model.fields) {
        model.fields.forEach(field => {
          fields.push({
            value: field.name,
            label: `${model.name}.${field.name}`,
            type: field.type
          });
        });
      }
    });
    return fields;
  };

  const availableFields = getAvailableFields();

  return (
    <div className="condition-builder">
      <div className="condition-header">
        <h4>Conditions</h4>
        <div className="logic-selector">
          <label>Match:</label>
          <select
            value={logicType}
            onChange={(e) => setLogicType(e.target.value)}
          >
            <option value="all">All conditions (AND)</option>
            <option value="any">Any condition (OR)</option>
          </select>
        </div>
      </div>

      <div className="conditions-list">
        {conditionList.length === 0 ? (
          <div className="empty-state">
            <p>No conditions defined. Click "Add Condition" to get started.</p>
          </div>
        ) : (
          conditionList.map((condition, index) => (
            <div key={index} className="condition-row">
              <div className="condition-number">{index + 1}</div>

              <div className="condition-field">
                <label>Field</label>
                {availableFields.length > 0 ? (
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(index, 'field', e.target.value)}
                  >
                    <option value="">Select field...</option>
                    {availableFields.map(field => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={condition.field}
                    onChange={(e) => updateCondition(index, 'field', e.target.value)}
                    placeholder="e.g., customer.email"
                  />
                )}
              </div>

              <div className="condition-operator">
                <label>Operator</label>
                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                >
                  {OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="condition-value">
                <label>Value</label>
                <input
                  type="text"
                  value={condition.value}
                  onChange={(e) => updateCondition(index, 'value', e.target.value)}
                  placeholder="Enter value..."
                  disabled={['isEmpty', 'isNotEmpty'].includes(condition.operator)}
                />
              </div>

              <button
                type="button"
                className="remove-btn"
                onClick={() => removeCondition(index)}
                title="Remove condition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        className="add-condition-btn"
        onClick={addCondition}
      >
        <Plus size={16} />
        Add Condition
      </button>
    </div>
  );
};

export default ConditionBuilder;
