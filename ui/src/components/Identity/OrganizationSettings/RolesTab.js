import React, { useState, useEffect, useCallback } from 'react';

const RolesTab = ({ organizationId }) => {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/identity/roles/org/${organizationId}?flat=true`);
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleCreateRole = () => {
    setSelectedRole({ isNew: true });
    setShowRoleModal(true);
  };

  const handleEditRole = (role) => {
    setSelectedRole(role);
    setShowRoleModal(true);
  };

  const handleSaveRole = async (roleData) => {
    try {
      let response;
      if (roleData.isNew) {
        response = await fetch(`http://localhost:5000/api/identity/roles/org/${organizationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roleData)
        });
      } else {
        response = await fetch(`http://localhost:5000/api/identity/roles/org/role/${roleData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roleData)
        });
      }

      if (response.ok) {
        setShowRoleModal(false);
        setSelectedRole(null);
        fetchRoles();
      }
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/identity/roles/org/role/${roleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShowRoleModal(false);
        setSelectedRole(null);
        fetchRoles();
      }
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const getLevelBadge = (level) => {
    const badges = {
      0: { label: 'Admin', color: '#dc2626' },
      1: { label: 'Manager', color: '#ea580c' },
      2: { label: 'Member', color: '#2563eb' },
      3: { label: 'Viewer', color: '#64748b' }
    };
    return badges[level] || { label: `Level ${level}`, color: '#64748b' };
  };

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="settings-tab roles-tab">
      <div className="tab-header">
        <div>
          <h3>Organization Roles</h3>
          <p className="tab-description">
            Define roles and permissions for your organization members.
          </p>
        </div>
        <button className="btn-primary" onClick={handleCreateRole}>
          + Add Role
        </button>
      </div>

      <div className="roles-list">
        {roles.map(role => {
          const badge = getLevelBadge(role.level);
          return (
            <div
              key={role.id}
              className={`role-item ${role.is_system ? 'system-role' : ''}`}
              onClick={() => handleEditRole(role)}
            >
              <div className="role-info">
                <div className="role-header">
                  <span className="role-name">{role.display_name || role.name}</span>
                  <span
                    className="role-level-badge"
                    style={{ backgroundColor: badge.color }}
                  >
                    {badge.label}
                  </span>
                  {role.is_system && (
                    <span className="system-badge">System</span>
                  )}
                </div>
                <p className="role-description">{role.description}</p>
                <div className="role-permissions">
                  {(role.permissions || []).slice(0, 5).map((perm, idx) => (
                    <span key={idx} className="permission-tag">{perm}</span>
                  ))}
                  {(role.permissions || []).length > 5 && (
                    <span className="permission-more">
                      +{role.permissions.length - 5} more
                    </span>
                  )}
                </div>
              </div>
              <div className="role-actions">
                <span className="chevron">{'>'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {showRoleModal && (
        <RoleModal
          role={selectedRole}
          roles={roles}
          onSave={handleSaveRole}
          onDelete={handleDeleteRole}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedRole(null);
          }}
        />
      )}
    </div>
  );
};

const RoleModal = ({ role, roles, onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    parentRoleId: '',
    permissions: [],
    level: 2
  });
  const [newPermission, setNewPermission] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role && !role.isNew) {
      setFormData({
        name: role.name || '',
        displayName: role.display_name || '',
        description: role.description || '',
        parentRoleId: role.parent_role_id || '',
        permissions: role.permissions || [],
        level: role.level || 2
      });
    }
  }, [role]);

  const handleAddPermission = () => {
    if (newPermission && !formData.permissions.includes(newPermission)) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, newPermission]
      }));
      setNewPermission('');
    }
  };

  const handleRemovePermission = (perm) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.filter(p => p !== perm)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...role, ...formData });
    setSaving(false);
  };

  const commonPermissions = [
    'org:manage', 'users:manage', 'users:view', 'roles:manage',
    'apps:manage', 'apps:create', 'apps:access', 'apps:view',
    'data:manage', 'data:read', 'data:write', 'profile:manage'
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content role-modal">
        <div className="modal-header">
          <h3>{role?.isNew ? 'Create New Role' : 'Edit Role'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Role Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., project_manager"
                disabled={role?.is_system}
                required
              />
            </div>
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="e.g., Project Manager"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this role can do..."
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) }))}
              >
                <option value={0}>Admin Level</option>
                <option value={1}>Manager Level</option>
                <option value={2}>Member Level</option>
                <option value={3}>Viewer Level</option>
              </select>
            </div>
            <div className="form-group">
              <label>Parent Role (Inherits from)</label>
              <select
                value={formData.parentRoleId}
                onChange={(e) => setFormData(prev => ({ ...prev, parentRoleId: e.target.value }))}
              >
                <option value="">None (Root Role)</option>
                {roles.filter(r => r.id !== role?.id).map(r => (
                  <option key={r.id} value={r.id}>{r.display_name || r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Permissions</label>
            <div className="permissions-input">
              <input
                type="text"
                value={newPermission}
                onChange={(e) => setNewPermission(e.target.value)}
                placeholder="Enter permission or select below"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPermission())}
              />
              <button type="button" onClick={handleAddPermission}>Add</button>
            </div>

            <div className="common-permissions">
              <span className="label">Common:</span>
              {commonPermissions.filter(p => !formData.permissions.includes(p)).slice(0, 6).map(perm => (
                <button
                  key={perm}
                  type="button"
                  className="suggestion-btn"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    permissions: [...prev.permissions, perm]
                  }))}
                >
                  + {perm}
                </button>
              ))}
            </div>

            <div className="selected-permissions">
              {formData.permissions.map((perm, idx) => (
                <span key={idx} className="permission-chip">
                  {perm}
                  <button type="button" onClick={() => handleRemovePermission(perm)}>&times;</button>
                </span>
              ))}
              {formData.permissions.length === 0 && (
                <span className="no-permissions">No permissions assigned</span>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            {!role?.isNew && !role?.is_system && (
              <button
                type="button"
                className="btn-delete"
                onClick={() => onDelete(role.id)}
              >
                Delete
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : role?.isNew ? 'Create Role' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RolesTab;
