import React from 'react';
import { X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import './ValidationResultsModal.css';

const ValidationResultsModal = ({ validationResult, onClose }) => {
  if (!validationResult) return null;

  const { valid, errors = [], warnings = [] } = validationResult;

  return (
    <div className="validation-modal-overlay" onClick={onClose}>
      <div className="validation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="validation-modal-header">
          <div className="validation-modal-title">
            {valid ? (
              <>
                <CheckCircle className="icon-success" size={24} />
                <h2>Workflow Validation Passed</h2>
              </>
            ) : (
              <>
                <XCircle className="icon-error" size={24} />
                <h2>Workflow Validation Failed</h2>
              </>
            )}
          </div>
          <button className="validation-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="validation-modal-body">
          {/* Success Message */}
          {valid && errors.length === 0 && warnings.length === 0 && (
            <div className="validation-message success">
              <CheckCircle size={20} />
              <p>Your workflow structure is valid! No errors or warnings found.</p>
            </div>
          )}

          {/* Errors Section */}
          {errors.length > 0 && (
            <div className="validation-section">
              <div className="validation-section-header error">
                <XCircle size={20} />
                <h3>Errors ({errors.length})</h3>
              </div>
              <div className="validation-list">
                {errors.map((error, index) => (
                  <div key={`error-${index}`} className="validation-item error">
                    <div className="validation-item-bullet">•</div>
                    <div className="validation-item-content">{error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings Section */}
          {warnings.length > 0 && (
            <div className="validation-section">
              <div className="validation-section-header warning">
                <AlertTriangle size={20} />
                <h3>Warnings ({warnings.length})</h3>
              </div>
              <div className="validation-list">
                {warnings.map((warning, index) => (
                  <div key={`warning-${index}`} className="validation-item warning">
                    <div className="validation-item-bullet">•</div>
                    <div className="validation-item-content">{warning}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="validation-summary">
            {valid ? (
              <p className="summary-text success">
                The workflow can be safely executed without structural issues.
              </p>
            ) : (
              <p className="summary-text error">
                Please fix the errors above before executing this workflow to prevent runtime failures.
              </p>
            )}
          </div>
        </div>

        <div className="validation-modal-footer">
          <button className="btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ValidationResultsModal;
