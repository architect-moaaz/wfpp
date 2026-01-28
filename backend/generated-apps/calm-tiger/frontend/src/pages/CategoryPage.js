import React, { useState, useEffect } from 'react';
import { dataApi } from '../api/client';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FormRenderer from '../components/FormRenderer';

const columns = [{"name":"id","label":"id","type":"string"},{"name":"name","label":"name","type":"string"},{"name":"description","label":"description","type":"string"},{"name":"parentCategoryId","label":"parentCategoryId","type":"string"},{"name":"isActive","label":"isActive","type":"boolean"},{"name":"createdAt","label":"createdAt","type":"date"}];
const formFields = [{"name":"id","label":"id","type":"text","required":true,"placeholder":"Enter id"},{"name":"name","label":"name","type":"text","required":true,"placeholder":"Enter name"},{"name":"description","label":"description","type":"text","required":false,"placeholder":"Enter description"},{"name":"parentCategoryId","label":"parentCategoryId","type":"text","required":false,"placeholder":"Enter parentCategoryId"},{"name":"isActive","label":"isActive","type":"checkbox","required":true,"placeholder":"Enter isActive"},{"name":"createdAt","label":"createdAt","type":"date","required":true,"placeholder":"Enter createdAt"},{"name":"updatedAt","label":"updatedAt","type":"date","required":true,"placeholder":"Enter updatedAt"}];

export default function CategoryPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dataApi.list('category');
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
      await dataApi.delete('category', item.id);
      loadData();
    } catch (error) {
      alert('Error deleting: ' + error.message);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editItem) {
        await dataApi.update('category', editItem.id, formData);
      } else {
        await dataApi.create('category', formData);
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
        <h1>Category</h1>
        <p>Lookup entity for book categories enabling classification and filtered searching</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Category Records ({data.length})</h3>
          <button className="btn btn-primary" onClick={handleCreate}>
            + Add Category
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
        title={editItem ? 'Edit Category' : 'Add Category'}
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