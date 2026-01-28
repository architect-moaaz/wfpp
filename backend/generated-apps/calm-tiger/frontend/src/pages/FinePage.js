import React, { useState, useEffect } from 'react';
import { dataApi } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

const columns = [{"name":"id","label":"id","type":"string"},{"name":"transactionId","label":"transactionId","type":"string"},{"name":"memberId","label":"memberId","type":"string"},{"name":"amount","label":"amount","type":"number"},{"name":"fineDate","label":"fineDate","type":"date"},{"name":"paymentStatus","label":"paymentStatus","type":"string"}];
const formFields = [{"name":"id","label":"id","type":"text","required":true,"placeholder":"Enter id"},{"name":"transactionId","label":"transactionId","type":"text","required":true,"placeholder":"Enter transactionId"},{"name":"memberId","label":"memberId","type":"text","required":true,"placeholder":"Enter memberId"},{"name":"amount","label":"amount","type":"text","required":true,"placeholder":"Enter amount"},{"name":"fineDate","label":"fineDate","type":"date","required":true,"placeholder":"Enter fineDate"},{"name":"paymentStatus","label":"paymentStatus","type":"text","required":true,"placeholder":"Enter paymentStatus"},{"name":"paymentDate","label":"paymentDate","type":"date","required":false,"placeholder":"Enter paymentDate"},{"name":"paymentMethod","label":"paymentMethod","type":"text","required":false,"placeholder":"Enter paymentMethod"}];

export default function FinePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dataApi.list('fine');
      setData(res.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await dataApi.delete('fine', item.id);
      loadData();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editItem) {
        await dataApi.update('fine', editItem.id, formData);
      } else {
        await dataApi.create('fine', formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      alert('Error saving: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Fine</h1>
        <p>Entity managing financial penalties for overdue books including fine calculation, payment tracking, and waiver management</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Fine Records ({data.length})</h3>
          <button className="btn btn-primary" onClick={handleCreate}>
            + Add Fine
          </button>
        </div>
        <DataTable
          columns={columns}
          data={data}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Fine' : 'Add Fine'}
      >
        <FormRenderer
          form={{ fields: formFields }}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}