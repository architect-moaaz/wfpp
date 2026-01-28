import React, { useState, useEffect } from 'react';
import { dataApi } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

const columns = [{"name":"id","label":"id","type":"string"},{"name":"bookId","label":"bookId","type":"string"},{"name":"memberId","label":"memberId","type":"string"},{"name":"reservationDate","label":"reservationDate","type":"date"},{"name":"expiryDate","label":"expiryDate","type":"date"},{"name":"status","label":"status","type":"string"}];
const formFields = [{"name":"id","label":"id","type":"text","required":true,"placeholder":"Enter id"},{"name":"bookId","label":"bookId","type":"text","required":true,"placeholder":"Enter bookId"},{"name":"memberId","label":"memberId","type":"text","required":true,"placeholder":"Enter memberId"},{"name":"reservationDate","label":"reservationDate","type":"date","required":true,"placeholder":"Enter reservationDate"},{"name":"expiryDate","label":"expiryDate","type":"date","required":true,"placeholder":"Enter expiryDate"},{"name":"status","label":"status","type":"text","required":true,"placeholder":"Enter status"},{"name":"notificationSent","label":"notificationSent","type":"checkbox","required":true,"placeholder":"Enter notificationSent"},{"name":"fulfilledDate","label":"fulfilledDate","type":"date","required":false,"placeholder":"Enter fulfilledDate"}];

export default function ReservationPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dataApi.list('reservation');
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
      await dataApi.delete('reservation', item.id);
      loadData();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editItem) {
        await dataApi.update('reservation', editItem.id, formData);
      } else {
        await dataApi.create('reservation', formData);
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
        <h1>Reservation</h1>
        <p>Tracks book reservation requests from members when books are unavailable, managing reservation queue and fulfillment</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Reservation Records ({data.length})</h3>
          <button className="btn btn-primary" onClick={handleCreate}>
            + Add Reservation
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
        title={editItem ? 'Edit Reservation' : 'Add Reservation'}
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