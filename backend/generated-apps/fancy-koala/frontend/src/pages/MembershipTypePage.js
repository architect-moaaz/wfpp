import React, { useState, useEffect } from 'react';
import { dataApi } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

const columns = [{"name":"id","label":"id","type":"string"},{"name":"name","label":"name","type":"string"},{"name":"description","label":"description","type":"string"},{"name":"maxBooksAllowed","label":"maxBooksAllowed","type":"number"},{"name":"loanDurationDays","label":"loanDurationDays","type":"number"},{"name":"renewalLimit","label":"renewalLimit","type":"number"}];
const formFields = [{"name":"id","label":"id","type":"text","required":true,"placeholder":"Enter id"},{"name":"name","label":"name","type":"text","required":true,"placeholder":"Enter name"},{"name":"description","label":"description","type":"text","required":false,"placeholder":"Enter description"},{"name":"maxBooksAllowed","label":"maxBooksAllowed","type":"text","required":true,"placeholder":"Enter maxBooksAllowed"},{"name":"loanDurationDays","label":"loanDurationDays","type":"text","required":true,"placeholder":"Enter loanDurationDays"},{"name":"renewalLimit","label":"renewalLimit","type":"text","required":true,"placeholder":"Enter renewalLimit"},{"name":"annualFee","label":"annualFee","type":"text","required":true,"placeholder":"Enter annualFee"},{"name":"isActive","label":"isActive","type":"checkbox","required":true,"placeholder":"Enter isActive"}];

export default function MembershipTypePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dataApi.list('membershiptype');
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
      await dataApi.delete('membershiptype', item.id);
      loadData();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editItem) {
        await dataApi.update('membershiptype', editItem.id, formData);
      } else {
        await dataApi.create('membershiptype', formData);
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
        <h1>MembershipType</h1>
        <p>Lookup entity defining membership tiers with borrowing privileges, loan duration, and fee structure</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">MembershipType Records ({data.length})</h3>
          <button className="btn btn-primary" onClick={handleCreate}>
            + Add MembershipType
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
        title={editItem ? 'Edit MembershipType' : 'Add MembershipType'}
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