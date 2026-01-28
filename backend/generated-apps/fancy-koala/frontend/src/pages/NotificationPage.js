import React, { useState, useEffect } from 'react';
import { dataApi } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

const columns = [{"name":"id","label":"id","type":"string"},{"name":"type","label":"type","type":"string"},{"name":"recipientId","label":"recipientId","type":"string"},{"name":"recipientEmail","label":"recipientEmail","type":"string"},{"name":"subject","label":"subject","type":"string"},{"name":"message","label":"message","type":"string"}];
const formFields = [{"name":"id","label":"id","type":"text","required":true,"placeholder":"Enter id"},{"name":"type","label":"type","type":"text","required":true,"placeholder":"Enter type"},{"name":"recipientId","label":"recipientId","type":"text","required":true,"placeholder":"Enter recipientId"},{"name":"recipientEmail","label":"recipientEmail","type":"text","required":true,"placeholder":"Enter recipientEmail"},{"name":"subject","label":"subject","type":"text","required":true,"placeholder":"Enter subject"},{"name":"message","label":"message","type":"text","required":true,"placeholder":"Enter message"},{"name":"status","label":"status","type":"text","required":true,"placeholder":"Enter status"},{"name":"sentDate","label":"sentDate","type":"date","required":false,"placeholder":"Enter sentDate"}];

export default function NotificationPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dataApi.list('notification');
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
      await dataApi.delete('notification', item.id);
      loadData();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editItem) {
        await dataApi.update('notification', editItem.id, formData);
      } else {
        await dataApi.create('notification', formData);
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
        <h1>Notification</h1>
        <p>Tracks all system notifications sent to members and librarians including delivery status and history</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Notification Records ({data.length})</h3>
          <button className="btn btn-primary" onClick={handleCreate}>
            + Add Notification
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
        title={editItem ? 'Edit Notification' : 'Add Notification'}
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