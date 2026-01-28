import React, { useState, useEffect } from 'react';

const PositionPanel = ({
  position,
  departments,
  users,
  organizationId,
  onSave,
  onDelete,
  onAssignUser,
  onUserCreated,
  onClose
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    departmentId: '',
    level: 1,
    userId: ''
  });
  const [saving, setSaving] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    avatarUrl: ''
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    if (position && !position.isNew) {
      setFormData({
        title: position.title || '',
        description: position.description || '',
        departmentId: position.department_id || '',
        level: position.level || 1,
        userId: position.user_id || ''
      });
    } else if (position?.parentPositionId) {
      setFormData({
        title: '',
        description: '',
        departmentId: '',
        level: (position.parentLevel || 1) + 1,
        userId: ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        departmentId: '',
        level: 1,
        userId: ''
      });
    }
  }, [position]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        ...position,
        ...formData,
        parentPositionId: position?.parentPositionId
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkVacant = async () => {
    if (position?.id) {
      await onAssignUser(position.id, null);
      onClose();
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name.trim()) return;

    setCreatingUser(true);
    try {
      const orgId = organizationId || position?.organization_id;
      const response = await fetch(`http://localhost:5000/api/identity/users/org/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        const createdUser = await response.json();
        // Set the newly created user as the assigned user
        setFormData(prev => ({ ...prev, userId: createdUser.id }));
        setShowNewUserForm(false);
        setNewUser({ name: '', email: '', avatarUrl: '' });
        // Notify parent to refresh users list
        if (onUserCreated) {
          onUserCreated(createdUser);
        }
      } else {
        const error = await response.json();
        alert('Failed to create user: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const levelOptions = [
    { value: 1, label: 'Executive (C-Suite)' },
    { value: 2, label: 'Vice President / Director' },
    { value: 3, label: 'Manager' },
    { value: 4, label: 'Team Lead' },
    { value: 5, label: 'Individual Contributor' }
  ];

  // Sample avatar URLs for quick selection
  const sampleAvatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  ];

  return (
    <div className="position-panel-overlay">
      <div className="position-panel">
        <div className="panel-header">
          <h3>{position?.isNew ? 'Add New Position' : 'Edit Position'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="panel-content">
          {position?.parentTitle && (
            <div className="parent-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              Reports to: <strong>{position.parentTitle}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} id="position-form">
          <div className="form-group">
            <label>Position Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Software Engineer, Product Manager"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Role responsibilities and requirements..."
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Level</label>
              <select
                value={formData.level}
                onChange={(e) => handleChange('level', parseInt(e.target.value))}
              >
                {levelOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Department</label>
              <select
                value={formData.departmentId}
                onChange={(e) => handleChange('departmentId', e.target.value)}
              >
                <option value="">No Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* User Assignment Section */}
          <div className="form-group user-assignment-section">
            <label>Assigned Employee</label>

            {!showNewUserForm ? (
              <>
                <div className="user-select-wrapper">
                  <select
                    value={formData.userId}
                    onChange={(e) => handleChange('userId', e.target.value)}
                    className="user-select"
                  >
                    <option value="">Vacant (No one assigned)</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-add-user"
                    onClick={() => setShowNewUserForm(true)}
                    title="Create new employee"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    New
                  </button>
                </div>
              </>
            ) : (
              <div className="new-user-form">
                <div className="new-user-header">
                  <span>Create New Employee</span>
                  <button
                    type="button"
                    className="btn-cancel-small"
                    onClick={() => setShowNewUserForm(false)}
                  >
                    Cancel
                  </button>
                </div>

                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Sarah Williams"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g., sarah@company.com"
                  />
                </div>

                <div className="form-group">
                  <label>Profile Picture URL</label>
                  <input
                    type="url"
                    value={newUser.avatarUrl}
                    onChange={(e) => setNewUser(prev => ({ ...prev, avatarUrl: e.target.value }))}
                    placeholder="https://example.com/photo.jpg"
                  />

                  {/* Avatar Preview */}
                  {newUser.avatarUrl && (
                    <div className="avatar-preview">
                      <img
                        src={newUser.avatarUrl}
                        alt="Preview"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}

                  {/* Quick Avatar Selection */}
                  <div className="quick-avatars">
                    <span className="quick-avatars-label">Or choose a sample:</span>
                    <div className="avatar-grid">
                      {sampleAvatars.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`avatar-option ${newUser.avatarUrl === url ? 'selected' : ''}`}
                          onClick={() => setNewUser(prev => ({ ...prev, avatarUrl: url }))}
                        >
                          <img src={url} alt={`Avatar ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-create-user"
                  onClick={handleCreateUser}
                  disabled={creatingUser || !newUser.name.trim()}
                >
                  {creatingUser ? 'Creating...' : 'Create & Assign Employee'}
                </button>
              </div>
            )}
          </div>

          {/* Current Assignment Display */}
          {!position?.isNew && position?.user_id && (
            <div className="current-assignment">
              <div className="assignment-info">
                <span className="label">Currently Assigned:</span>
                <div className="user-badge">
                  {position.user_avatar ? (
                    <img src={position.user_avatar} alt="" className="mini-avatar" />
                  ) : (
                    <span className="mini-avatar-placeholder">
                      {position.user_name?.charAt(0)}
                    </span>
                  )}
                  <span>{position.user_name}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-mark-vacant"
                onClick={handleMarkVacant}
              >
                Mark as Vacant
              </button>
            </div>
          )}

          </form>
        </div>

        <div className="panel-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>

          {!position?.isNew && (
            <button
              type="button"
              className="btn-delete"
              onClick={() => onDelete(position.id)}
            >
              Delete
            </button>
          )}

          <button type="submit" form="position-form" className="btn-save" disabled={saving}>
            {saving ? 'Saving...' : position?.isNew ? 'Create Position' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PositionPanel;
