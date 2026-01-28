import React, { useState, useEffect } from 'react';
import { dataApi } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

const columns = [{"name":"id","label":"id","type":"string"},{"name":"firstName","label":"firstName","type":"string"},{"name":"lastName","label":"lastName","type":"string"},{"name":"email","label":"email","type":"string"},{"name":"phone","label":"phone","type":"string"},{"name":"membershipType","label":"membershipType","type":"string"}];
const formFields = [{"name":"id","label":"id","type":"text","required":true,"placeholder":"Enter id"},{"name":"firstName","label":"firstName","type":"text","required":true,"placeholder":"Enter firstName"},{"name":"lastName","label":"lastName","type":"text","required":true,"placeholder":"Enter lastName"},{"name":"email","label":"email","type":"text","required":true,"placeholder":"Enter email"},{"name":"phone","label":"phone","type":"text","required":false,"placeholder":"Enter phone"},{"name":"membershipType","label":"membershipType","type":"text","required":true,"placeholder":"Enter membershipType"},{"name":"membershipStatus","label":"membershipStatus","type":"text","required":true,"placeholder":"Enter membershipStatus"},{"name":"expiryDate","label":"expiryDate","type":"date","required":true,"placeholder":"Enter expiryDate"}];

export default function MemberPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dataApi.list('member');
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
      await dataApi.delete('member', item.id);
      loadData();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editItem) {
        await dataApi.update('member', editItem.id, formData);
      } else {
        await dataApi.create('member', formData);
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
        <h1>Member</h1>
        <p>Library member with personal details, membership status, and borrowing privileges</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Member Records ({data.length})</h3>
          <button className="btn btn-primary" onClick={handleCreate}>
            + Add Member
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
        title={editItem ? 'Edit Member' : 'Add Member'}
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