import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './ConfirmDialog.css';

const ConfirmDialog = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-header">
          <AlertTriangle size={24} className="confirm-icon" />
          <h3>{title}</h3>
        </div>
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        <div className="confirm-footer">
          <button className="confirm-btn confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-btn confirm-ok" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
