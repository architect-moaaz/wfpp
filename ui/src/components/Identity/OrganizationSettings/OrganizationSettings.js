import React, { useState, useEffect, useCallback } from 'react';
import OrgChartCanvas from '../OrgChart/OrgChartCanvas';
import GeneralTab from './GeneralTab';
import RolesTab from './RolesTab';
import GroupsTab from './GroupsTab';
import DepartmentsTab from './DepartmentsTab';
import BulkUploadModal from '../BulkUpload/BulkUploadModal';
import './OrganizationSettings.css';

const OrganizationSettings = ({ organizationId, initialTab = 'general', onClose }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [currentOrgId, setCurrentOrgId] = useState(organizationId);
  const [organization, setOrganization] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchOrganization = useCallback(async () => {
    try {
      setLoading(true);

      // If no organizationId provided, fetch the default/first organization
      let orgId = currentOrgId;
      if (!orgId) {
        const orgsRes = await fetch('http://localhost:5000/api/identity/organizations');
        if (orgsRes.ok) {
          const data = await orgsRes.json();
          const orgs = data.organizations || data;
          if (orgs && orgs.length > 0) {
            orgId = orgs[0].id;
            setCurrentOrgId(orgId);
          } else {
            // No organizations exist yet, show empty state
            setLoading(false);
            return;
          }
        }
      }

      const [orgRes, statsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/identity/organizations/${orgId}`),
        fetch(`http://localhost:5000/api/identity/organizations/${orgId}/stats`)
      ]);

      const orgData = await orgRes.json();
      const statsData = await statsRes.json();

      setOrganization(orgData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const handleUpdateOrg = async (updates) => {
    try {
      const response = await fetch(`http://localhost:5000/api/identity/organizations/${currentOrgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updated = await response.json();
        setOrganization(updated);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating organization:', error);
      return false;
    }
  };

  const handleCreateOrg = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/identity/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'My Organization',
          slug: 'my-org'
        })
      });

      if (response.ok) {
        const newOrg = await response.json();
        setCurrentOrgId(newOrg.id);
        setOrganization(newOrg);
      }
    } catch (error) {
      console.error('Error creating organization:', error);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'orgchart', label: 'Org Chart', icon: 'hierarchy' },
    { id: 'departments', label: 'Departments', icon: 'folder' },
    { id: 'roles', label: 'Roles', icon: 'shield' },
    { id: 'groups', label: 'Groups', icon: 'users' }
  ];

  if (loading) {
    return (
      <div className="org-settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading organization settings...</p>
      </div>
    );
  }

  const handleBulkUploadSuccess = (result) => {
    if (result.organization) {
      setCurrentOrgId(result.organization.id);
      setOrganization(result.organization);
      fetchOrganization();
    }
    setShowBulkUpload(false);
  };

  const handleExportData = async () => {
    if (!currentOrgId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/identity/bulk-upload/export/${currentOrgId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
        a.download = filenameMatch ? filenameMatch[1] : `${organization?.name || 'organization'}-export.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  // Empty state when no organization exists
  if (!organization && !loading) {
    return (
      <div className="org-settings-empty">
        <div className="empty-state-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
            <path d="M9 9v.01" />
            <path d="M9 12v.01" />
            <path d="M9 15v.01" />
            <path d="M9 18v.01" />
          </svg>
        </div>
        <h2>No Organization Yet</h2>
        <p>Create an organization to manage your team, roles, and org chart.</p>

        <div className="empty-state-actions">
          <button className="create-org-btn" onClick={handleCreateOrg}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Manually
          </button>

          <span className="actions-divider">or</span>

          <button className="bulk-upload-btn" onClick={() => setShowBulkUpload(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Bulk Upload from Excel
          </button>
        </div>

        {showBulkUpload && (
          <BulkUploadModal
            onClose={() => setShowBulkUpload(false)}
            onSuccess={handleBulkUploadSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="org-settings-container">
      <div className="org-settings-header">
        <div className="header-info">
          {organization?.logo_url && (
            <img src={organization.logo_url} alt="" className="org-logo" />
          )}
          <div className="org-details">
            <h1>{organization?.name}</h1>
            <span className="org-slug">@{organization?.slug}</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="header-export-btn" onClick={() => handleExportData()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export
          </button>
          <button className="header-bulk-upload-btn" onClick={() => setShowBulkUpload(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Import
          </button>
          {onClose && (
            <button className="close-settings-btn" onClick={onClose}>
              &times;
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="org-stats-bar">
          <div className="stat-item">
            <span className="stat-value">{stats.memberCount}</span>
            <span className="stat-label">Members</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.departmentCount}</span>
            <span className="stat-label">Departments</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.positionCount}</span>
            <span className="stat-label">Positions</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.groupCount}</span>
            <span className="stat-label">Groups</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.appCount}</span>
            <span className="stat-label">Apps</span>
          </div>
        </div>
      )}

      <div className="org-settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={`tab-icon icon-${tab.icon}`}></span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="org-settings-content">
        {activeTab === 'general' && (
          <GeneralTab
            organization={organization}
            onUpdate={handleUpdateOrg}
          />
        )}

        {activeTab === 'orgchart' && (
          <OrgChartCanvas organizationId={currentOrgId} />
        )}

        {activeTab === 'departments' && (
          <DepartmentsTab organizationId={currentOrgId} />
        )}

        {activeTab === 'roles' && (
          <RolesTab organizationId={currentOrgId} />
        )}

        {activeTab === 'groups' && (
          <GroupsTab organizationId={currentOrgId} />
        )}
      </div>

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={handleBulkUploadSuccess}
        />
      )}
    </div>
  );
};

export default OrganizationSettings;
