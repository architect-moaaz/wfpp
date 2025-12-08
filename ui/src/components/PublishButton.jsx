import React, { useState } from 'react';
import axios from 'axios';
import PublishModal from './PublishModal';
import '../styles/PublishButton.css';

const PublishButton = ({ workflowId, workflowName }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deploymentId, setDeploymentId] = useState(null);
  const [error, setError] = useState(null);

  const handlePublish = async () => {
    try {
      setError(null);
      setIsPublishing(true);

      const response = await axios.post(
        `/api/workflows/${workflowId}/publish`,
        {
          platform: 'vercel', // Default platform
          environmentVars: {},
          customDomain: null
        }
      );

      setDeploymentId(response.data.deploymentId);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start deployment');
      setIsPublishing(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setIsPublishing(false);
    setDeploymentId(null);
  };

  return (
    <>
      <button
        className={`publish-button ${isPublishing ? 'publishing' : ''}`}
        onClick={handlePublish}
        disabled={isPublishing}
      >
        {isPublishing ? (
          <>
            <span className="spinner"></span>
            Publishing...
          </>
        ) : (
          <>
            <svg className="rocket-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
            </svg>
            Publish
          </>
        )}
      </button>

      {error && (
        <div className="publish-error">
          {error}
        </div>
      )}

      {showModal && deploymentId && (
        <PublishModal
          deploymentId={deploymentId}
          workflowName={workflowName}
          onClose={handleModalClose}
        />
      )}
    </>
  );
};

export default PublishButton;
