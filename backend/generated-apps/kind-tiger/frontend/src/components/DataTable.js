import React from 'react';

export default function DataTable({ columns, data, onEdit, onDelete, onView }) {
  if (!data || data.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Data</h3>
        <p>No records found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i}>{col.label || col.name}</th>
          ))}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={row.id || rowIndex}>
            {columns.map((col, colIndex) => (
              <td key={colIndex}>
                {formatValue(row[col.name], col.type)}
              </td>
            ))}
            <td>
              <div className="action-buttons">
                {onView && (
                  <button className="btn btn-secondary action-btn" onClick={() => onView(row)}>
                    View
                  </button>
                )}
                {onEdit && (
                  <button className="btn btn-primary action-btn" onClick={() => onEdit(row)}>
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button className="btn btn-danger action-btn" onClick={() => onDelete(row)}>
                    Delete
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatValue(value, type) {
  if (value === null || value === undefined) return '-';

  switch (type) {
    case 'date':
    case 'datetime':
      return new Date(value).toLocaleDateString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'json':
      return JSON.stringify(value).substring(0, 50) + '...';
    default:
      return String(value);
  }
}