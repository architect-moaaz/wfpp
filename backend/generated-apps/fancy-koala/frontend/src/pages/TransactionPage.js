import React, { useState, useEffect } from 'react';
import { dataApi } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

const columns = [{"name":"id","label":"id","type":"string"},{"name":"bookId","label":"bookId","type":"string"},{"name":"memberId","label":"memberId","type":"string"},{"name":"checkoutDate","label":"checkoutDate","type":"date"},{"name":"dueDate","label":"dueDate","type":"date"},{"name":"returnDate","label":"returnDate","type":"date"}];
const formFields = [{"name":"id","label":"id","type":"text","required":true,"placeholder":"Enter id"},{"name":"bookId","label":"bookId","type":"text","required":true,"placeholder":"Enter bookId"},{"name":"memberId","label":"memberId","type":"text","required":true,"placeholder":"Enter memberId"},{"name":"checkoutDate","label":"checkoutDate","type":"date","required":true,"placeholder":"Enter checkoutDate"},{"name":"dueDate","label":"dueDate","type":"date","required":true,"placeholder":"Enter dueDate"},{"name":"returnDate","label":"returnDate","type":"date","required":false,"placeholder":"Enter returnDate"},{"name":"status","label":"status","type":"text","required":true,"placeholder":"Enter status"},{"name":"fineAmount","label":"fineAmount","type":"text","required":false,"placeholder":"Enter fineAmount"}];

export default function TransactionPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dataApi.list('transaction');
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
      await dataApi.delete('transaction', item.id);
      loadData();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editItem) {
        await dataApi.update('transaction', editItem.id, formData);
      } else {
        await dataApi.create('transaction', formData);
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
        <h1>Transaction</h1>
        <p>Records book borrowing transactions including checkout, due dates, returns, and fines</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Transaction Records ({data.length})</h3>
          <button className="btn btn-primary" onClick={handleCreate}>
            + Add Transaction
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
        title={editItem ? 'Edit Transaction' : 'Add Transaction'}
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