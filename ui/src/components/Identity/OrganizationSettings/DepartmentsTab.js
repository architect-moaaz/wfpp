import React, { useState, useEffect, useCallback } from 'react';

const DepartmentsTab = ({ organizationId }) => {
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const [deptsRes, positionsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/identity/departments/org/${organizationId}?flat=true&includeStats=true`),
        fetch(`http://localhost:5000/api/identity/positions/org/${organizationId}`)
      ]);

      const deptsData = await deptsRes.json();
      const positionsData = await positionsRes.json();

      setDepartments(deptsData);
      setPositions(positionsData);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleCreateDept = () => {
    setSelectedDept({ isNew: true });
    setShowDeptModal(true);
  };

  const handleEditDept = (dept) => {
    setSelectedDept(dept);
    setShowDeptModal(true);
  };

  const handleSaveDept = async (deptData) => {
    try {
      let response;
      if (deptData.isNew) {
        response = await fetch(`http://localhost:5000/api/identity/departments/org/${organizationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deptData)
        });
      } else {
        response = await fetch(`http://localhost:5000/api/identity/departments/${deptData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deptData)
        });
      }

      if (response.ok) {
        setShowDeptModal(false);
        setSelectedDept(null);
        fetchDepartments();
      }
    } catch (error) {
      console.error('Error saving department:', error);
    }
  };

  const handleDeleteDept = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/identity/departments/${deptId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShowDeptModal(false);
        setSelectedDept(null);
        fetchDepartments();
      }
    } catch (error) {
      console.error('Error deleting department:', error);
    }
  };

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
  ];

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="settings-tab departments-tab">
      <div className="tab-header">
        <div>
          <h3>Departments</h3>
          <p className="tab-description">
            Organize your organization into departments for better structure.
          </p>
        </div>
        <button className="btn-primary" onClick={handleCreateDept}>
          + Add Department
        </button>
      </div>

      <div className="departments-list">
        {departments.map(dept => (
          <div
            key={dept.id}
            className="department-item"
            onClick={() => handleEditDept(dept)}
          >
            <div
              className="dept-color-bar"
              style={{ backgroundColor: dept.color || '#64748b' }}
            />
            <div className="dept-info">
              <div className="dept-header">
                <span className="dept-name">{dept.name}</span>
                {dept.code && <span className="dept-code">{dept.code}</span>}
              </div>
              {dept.description && (
                <p className="dept-description">{dept.description}</p>
              )}
              <div className="dept-stats">
                <span className="stat">
                  <strong>{dept.position_count || 0}</strong> positions
                </span>
                <span className="stat">
                  <strong>{dept.filled_count || 0}</strong> filled
                </span>
                {dept.head_name && (
                  <span className="stat head">
                    Head: <strong>{dept.head_name}</strong>
                  </span>
                )}
              </div>
            </div>
            <div className="dept-actions">
              <span className="chevron">{'>'}</span>
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">D</div>
            <h4>No Departments Yet</h4>
            <p>Create departments to organize your organization structure.</p>
            <button className="btn-primary" onClick={handleCreateDept}>
              Create Department
            </button>
          </div>
        )}
      </div>

      {showDeptModal && (
        <DepartmentModal
          department={selectedDept}
          departments={departments}
          positions={positions}
          colors={colors}
          onSave={handleSaveDept}
          onDelete={handleDeleteDept}
          onClose={() => {
            setShowDeptModal(false);
            setSelectedDept(null);
          }}
        />
      )}
    </div>
  );
};

const DepartmentModal = ({ department, departments, positions, colors, onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    parentDepartmentId: '',
    headPositionId: '',
    color: colors[0]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (department && !department.isNew) {
      setFormData({
        name: department.name || '',
        description: department.description || '',
        code: department.code || '',
        parentDepartmentId: department.parent_department_id || '',
        headPositionId: department.head_position_id || '',
        color: department.color || colors[0]
      });
    }
  }, [department, colors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...department, ...formData });
    setSaving(false);
  };

  // Filter positions that belong to this department
  const deptPositions = positions.filter(p =>
    p.department_id === department?.id || !p.department_id
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content department-modal">
        <div className="modal-header">
          <h3>{department?.isNew ? 'Create Department' : 'Edit Department'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Department Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Engineering"
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., ENG"
                maxLength={5}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What does this department do?"
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Parent Department</label>
              <select
                value={formData.parentDepartmentId}
                onChange={(e) => setFormData(prev => ({ ...prev, parentDepartmentId: e.target.value }))}
              >
                <option value="">None (Top Level)</option>
                {departments.filter(d => d.id !== department?.id).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Department Head</label>
              <select
                value={formData.headPositionId}
                onChange={(e) => setFormData(prev => ({ ...prev, headPositionId: e.target.value }))}
              >
                <option value="">No Head Assigned</option>
                {deptPositions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.user_name ? `(${p.user_name})` : '(Vacant)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            {!department?.isNew && (
              <button
                type="button"
                className="btn-delete"
                onClick={() => onDelete(department.id)}
              >
                Delete
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : department?.isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentsTab;
