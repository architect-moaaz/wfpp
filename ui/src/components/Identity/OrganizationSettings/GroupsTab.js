import React, { useState, useEffect, useCallback } from 'react';

const GroupsTab = ({ organizationId }) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const [groupsRes, usersRes] = await Promise.all([
        fetch(`http://localhost:5000/api/identity/groups/org/${organizationId}`),
        fetch(`http://localhost:5000/api/identity/users/org/${organizationId}`)
      ]);

      const groupsData = await groupsRes.json();
      const usersData = await usersRes.json();

      setGroups(groupsData);
      setUsers(usersData.users || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateGroup = () => {
    setSelectedGroup({ isNew: true });
    setShowGroupModal(true);
  };

  const handleEditGroup = async (group) => {
    // Fetch group details with members
    try {
      const response = await fetch(`http://localhost:5000/api/identity/groups/${group.id}`);
      const data = await response.json();

      if (!response.ok) {
        console.error('Error fetching group:', data.error);
        return;
      }

      // Explicitly set isNew to false to ensure edit mode
      setSelectedGroup({ ...data, isNew: false });
      setShowGroupModal(true);
    } catch (error) {
      console.error('Error fetching group:', error);
    }
  };

  const handleSaveGroup = async (groupData) => {
    try {
      let response;
      if (groupData.isNew) {
        response = await fetch(`http://localhost:5000/api/identity/groups/org/${organizationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupData)
        });
      } else {
        response = await fetch(`http://localhost:5000/api/identity/groups/${groupData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(groupData)
        });
      }

      if (response.ok) {
        // Update members if changed
        if (!groupData.isNew && groupData.memberIds) {
          await fetch(`http://localhost:5000/api/identity/groups/${groupData.id}/members`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: groupData.memberIds })
          });
        }

        setShowGroupModal(false);
        setSelectedGroup(null);
        fetchGroups();
      }
    } catch (error) {
      console.error('Error saving group:', error);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/identity/groups/${groupId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShowGroupModal(false);
        setSelectedGroup(null);
        fetchGroups();
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      team: 'T',
      department: 'D',
      project: 'P',
      custom: 'G'
    };
    return icons[type] || 'G';
  };

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="settings-tab groups-tab">
      <div className="tab-header">
        <div>
          <h3>Groups</h3>
          <p className="tab-description">
            Organize users into groups for easier permission management and task assignment.
          </p>
        </div>
        <button className="btn-primary" onClick={handleCreateGroup}>
          + Create Group
        </button>
      </div>

      <div className="groups-grid">
        {groups.map(group => (
          <div
            key={group.id}
            className="group-card"
            onClick={() => handleEditGroup(group)}
          >
            <div className="group-icon" data-type={group.type}>
              {getTypeIcon(group.type)}
            </div>
            <div className="group-info">
              <h4>{group.name}</h4>
              {group.description && (
                <p className="group-description">{group.description}</p>
              )}
              <div className="group-meta">
                <span className="member-count">
                  {group.member_count || 0} members
                </span>
                <span className="group-type">{group.type}</span>
              </div>
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">G</div>
            <h4>No Groups Yet</h4>
            <p>Create your first group to organize users.</p>
            <button className="btn-primary" onClick={handleCreateGroup}>
              Create Group
            </button>
          </div>
        )}
      </div>

      {showGroupModal && (
        <GroupModal
          group={selectedGroup}
          users={users}
          onSave={handleSaveGroup}
          onDelete={handleDeleteGroup}
          onClose={() => {
            setShowGroupModal(false);
            setSelectedGroup(null);
          }}
        />
      )}
    </div>
  );
};

const GroupModal = ({ group, users, onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'custom'
  });
  const [memberIds, setMemberIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group && !group.isNew) {
      setFormData({
        name: group.name || '',
        description: group.description || '',
        type: group.type || 'custom'
      });
      setMemberIds((group.members || []).map(m => m.id));
    }
  }, [group]);

  const handleToggleMember = (userId) => {
    setMemberIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...group, ...formData, memberIds });
    setSaving(false);
  };

  const filteredUsers = users.filter(user =>
    (user.name || user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content group-modal">
        <div className="modal-header">
          <h3>{group?.isNew ? 'Create New Group' : 'Edit Group'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Group Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Engineering Team"
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="custom">Custom</option>
                <option value="team">Team</option>
                <option value="department">Department</option>
                <option value="project">Project</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What is this group for?"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Members ({memberIds.length} selected)</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="member-search"
            />

            <div className="members-list">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={`member-item ${memberIds.includes(user.id) ? 'selected' : ''}`}
                  onClick={() => handleToggleMember(user.id)}
                >
                  <div className="member-checkbox">
                    <input
                      type="checkbox"
                      checked={memberIds.includes(user.id)}
                      onChange={() => {}}
                    />
                  </div>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="member-avatar" />
                  ) : (
                    <div className="member-avatar-placeholder">
                      {(user.name || user.email)?.charAt(0)}
                    </div>
                  )}
                  <div className="member-info">
                    <span className="member-name">{user.name || 'Unnamed User'}</span>
                    <span className="member-email">{user.email}</span>
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="no-members">No users found</div>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            {!group?.isNew && (
              <button
                type="button"
                className="btn-delete"
                onClick={() => onDelete(group.id)}
              >
                Delete
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : group?.isNew ? 'Create Group' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupsTab;
