import React, { useState, useEffect } from 'react';
import { formsApi } from '../api/client';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

export default function FormsPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const res = await formsApi.list();
      setForms(res.data || []);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async (data) => {
    try {
      await formsApi.submit(selectedForm.id, data);
      setShowFormModal(false);
      setSelectedForm(null);
      alert('Form submitted successfully!');
    } catch (error) {
      alert('Error submitting form: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading forms...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Forms</h1>
        <p>View and fill out available forms</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Available Forms ({forms.length})</h3>
        </div>
        {forms.length === 0 ? (
          <div className="empty-state">
            <h3>No Forms</h3>
            <p>No forms have been defined yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {forms.map((form) => (
              <div key={form.id} className="card" style={{ margin: 0 }}>
                <h4 style={{ marginBottom: '8px' }}>{form.name || form.title}</h4>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
                  {form.description || `${form.fields?.length || 0} fields`}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedForm(form);
                    setShowFormModal(true);
                  }}
                >
                  Open Form
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={selectedForm?.name || selectedForm?.title || 'Form'}
      >
        {selectedForm && (
          <FormRenderer
            form={selectedForm}
            onSubmit={handleSubmitForm}
            onCancel={() => setShowFormModal(false)}
          />
        )}
      </Modal>
    </div>
  );
}