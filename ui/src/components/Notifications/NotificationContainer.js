import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';
import './NotificationContainer.css';

const NotificationContainer = () => {
  const { toast, confirmDialog } = useNotification();

  return (
    <>
      {toast && (
        <div className="toast-container">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => {}}
          />
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </>
  );
};

export default NotificationContainer;
