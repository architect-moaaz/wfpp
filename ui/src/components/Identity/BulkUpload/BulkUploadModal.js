import React, { useState, useRef } from 'react';
import './BulkUpload.css';

const BulkUploadModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState('upload'); // upload, preview, processing, result
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/identity/bulk-upload/template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'organization-template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError('Failed to download template');
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      // Preview the file
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:5000/api/identity/bulk-upload/preview', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const previewData = await response.json();
        setPreview(previewData);
        setStep('preview');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to preview file');
      }
    } catch (err) {
      setError('Failed to preview file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setStep('processing');
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5000/api/identity/bulk-upload/process', {
        method: 'POST',
        body: formData
      });

      const resultData = await response.json();
      setResult(resultData);
      setStep('result');

      if (resultData.success && onSuccess) {
        onSuccess(resultData);
      }
    } catch (err) {
      setError('Failed to process file: ' + err.message);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      const event = { target: { files: [droppedFile] } };
      handleFileSelect(event);
    } else {
      setError('Please upload an Excel file (.xlsx or .xls)');
    }
  };

  const renderUploadStep = () => (
    <div className="bulk-upload-content">
      <div className="template-section">
        <div className="template-info">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <div>
            <h4>Download Template</h4>
            <p>Start with our Excel template that includes all required sheets and sample data</p>
          </div>
        </div>
        <button className="btn-download-template" onClick={handleDownloadTemplate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download Template
        </button>
      </div>

      <div className="divider">
        <span>or</span>
      </div>

      <div
        className="drop-zone"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".xlsx,.xls"
          hidden
        />
        <div className="drop-zone-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        <p className="drop-zone-text">Drag and drop your Excel file here</p>
        <p className="drop-zone-subtext">or click to browse</p>
        <span className="file-types">Supported: .xlsx, .xls</span>
      </div>

      {error && (
        <div className="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Reading file...</span>
        </div>
      )}
    </div>
  );

  const renderPreviewStep = () => (
    <div className="bulk-upload-content">
      <div className="file-info">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span>{file?.name}</span>
        <button className="btn-change-file" onClick={() => { setStep('upload'); setFile(null); setPreview(null); }}>
          Change
        </button>
      </div>

      {preview && (
        <div className="preview-content">
          <h4>Preview</h4>

          {preview.organization && (
            <div className="preview-section">
              <div className="preview-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                </svg>
                Organization
              </div>
              <div className="preview-item">
                <strong>{preview.organization.name}</strong>
                {preview.organization.description && <p>{preview.organization.description}</p>}
              </div>
            </div>
          )}

          <div className="preview-summary">
            <div className="summary-card">
              <span className="summary-count">{preview.summary.totalDepartments}</span>
              <span className="summary-label">Departments</span>
            </div>
            <div className="summary-card">
              <span className="summary-count">{preview.summary.totalRoles}</span>
              <span className="summary-label">Roles</span>
            </div>
            <div className="summary-card">
              <span className="summary-count">{preview.summary.totalGroups}</span>
              <span className="summary-label">Groups</span>
            </div>
            <div className="summary-card">
              <span className="summary-count">{preview.summary.totalEmployees}</span>
              <span className="summary-label">Employees</span>
            </div>
          </div>

          {preview.employees.length > 0 && (
            <div className="preview-section">
              <div className="preview-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Employees ({preview.employees.length})
              </div>
              <div className="preview-list">
                {preview.employees.slice(0, 5).map((emp, idx) => (
                  <div key={idx} className="preview-list-item">
                    <span className="emp-name">{emp.name || emp.email}</span>
                    <span className="emp-position">{emp.position}</span>
                    {emp.department && <span className="emp-dept">{emp.department}</span>}
                  </div>
                ))}
                {preview.employees.length > 5 && (
                  <div className="preview-more">
                    +{preview.employees.length - 5} more employees
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          {error}
        </div>
      )}

      <div className="preview-actions">
        <button className="btn-secondary" onClick={() => { setStep('upload'); setFile(null); setPreview(null); }}>
          Cancel
        </button>
        <button className="btn-primary" onClick={handleProcess} disabled={loading}>
          Create Organization
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="bulk-upload-content processing-state">
      <div className="processing-animation">
        <div className="processing-spinner"></div>
      </div>
      <h4>Creating Organization...</h4>
      <p>This may take a moment. Please don't close this window.</p>
      <div className="processing-steps">
        <div className="processing-step done">Creating organization</div>
        <div className="processing-step active">Creating departments & roles</div>
        <div className="processing-step">Creating groups</div>
        <div className="processing-step">Creating employees</div>
        <div className="processing-step">Setting up org chart</div>
      </div>
    </div>
  );

  const renderResultStep = () => (
    <div className="bulk-upload-content">
      {result?.success ? (
        <div className="result-success">
          <div className="success-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h4>Organization Created Successfully!</h4>
          <p>{result.message}</p>

          <div className="result-summary">
            <div className="result-stat">
              <span className="stat-value">{result.departments?.created || 0}</span>
              <span className="stat-label">Departments</span>
            </div>
            <div className="result-stat">
              <span className="stat-value">{result.roles?.created || 0}</span>
              <span className="stat-label">Roles</span>
            </div>
            <div className="result-stat">
              <span className="stat-value">{result.groups?.created || 0}</span>
              <span className="stat-label">Groups</span>
            </div>
            <div className="result-stat">
              <span className="stat-value">{result.employees?.created || 0}</span>
              <span className="stat-label">Employees</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="result-error">
          <div className="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <h4>Some Issues Occurred</h4>
          <p>{result?.message || result?.error}</p>

          {result?.organization && (
            <div className="partial-success-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Organization was created but some items had errors
            </div>
          )}

          {(result?.departments?.errors?.length > 0 ||
            result?.roles?.errors?.length > 0 ||
            result?.groups?.errors?.length > 0 ||
            result?.employees?.errors?.length > 0) && (
            <div className="error-details">
              <h5>Error Details</h5>
              {result?.departments?.errors?.map((err, idx) => (
                <div key={`dept-${idx}`} className="error-item">
                  <span className="error-type">Department:</span> {err.row} - {err.error}
                </div>
              ))}
              {result?.roles?.errors?.map((err, idx) => (
                <div key={`role-${idx}`} className="error-item">
                  <span className="error-type">Role:</span> {err.row} - {err.error}
                </div>
              ))}
              {result?.groups?.errors?.map((err, idx) => (
                <div key={`group-${idx}`} className="error-item">
                  <span className="error-type">Group:</span> {err.row} - {err.error}
                </div>
              ))}
              {result?.employees?.errors?.map((err, idx) => (
                <div key={`emp-${idx}`} className="error-item">
                  <span className="error-type">Employee:</span> {err.row} - {err.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="result-actions">
        <button className="btn-primary" onClick={onClose}>
          {result?.success ? 'Done' : 'Close'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bulk-upload-overlay">
      <div className="bulk-upload-modal">
        <div className="bulk-upload-header">
          <h3>
            {step === 'upload' && 'Bulk Upload Organization'}
            {step === 'preview' && 'Review Data'}
            {step === 'processing' && 'Processing...'}
            {step === 'result' && (result?.success ? 'Success' : 'Completed')}
          </h3>
          {step !== 'processing' && (
            <button className="close-btn" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {step === 'upload' && renderUploadStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'processing' && renderProcessingStep()}
        {step === 'result' && renderResultStep()}
      </div>
    </div>
  );
};

export default BulkUploadModal;
