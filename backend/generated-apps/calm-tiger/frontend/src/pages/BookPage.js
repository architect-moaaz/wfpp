import React, { useState, useEffect } from 'react';
import { dataApi } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

const columns = [{"name":"id","label":"id","type":"string"},{"name":"isbn","label":"isbn","type":"string"},{"name":"title","label":"title","type":"string"},{"name":"author","label":"author","type":"string"},{"name":"category","label":"category","type":"string"},{"name":"totalCopies","label":"totalCopies","type":"number"}];
const formFields = [{"name":"id","label":"id","type":"text","required":true,"placeholder":"Enter id"},{"name":"isbn","label":"isbn","type":"text","required":true,"placeholder":"Enter isbn"},{"name":"title","label":"title","type":"text","required":true,"placeholder":"Enter title"},{"name":"author","label":"author","type":"text","required":true,"placeholder":"Enter author"},{"name":"category","label":"category","type":"text","required":true,"placeholder":"Enter category"},{"name":"totalCopies","label":"totalCopies","type":"text","required":true,"placeholder":"Enter totalCopies"},{"name":"availableCopies","label":"availableCopies","type":"text","required":true,"placeholder":"Enter availableCopies"},{"name":"location","label":"location","type":"text","required":true,"placeholder":"Enter location"}];

export default function BookPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dataApi.list('book');
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
      await dataApi.delete('book', item.id);
      loadData();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editItem) {
        await dataApi.update('book', editItem.id, formData);
      } else {
        await dataApi.create('book', formData);
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
        <h1>Book</h1>
        <p>Core entity representing books in the library catalog with details and real-time availability tracking</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Book Records ({data.length})</h3>
          <button className="btn btn-primary" onClick={handleCreate}>
            + Add Book
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
        title={editItem ? 'Edit Book' : 'Add Book'}
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