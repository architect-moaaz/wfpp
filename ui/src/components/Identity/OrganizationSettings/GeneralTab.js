import React, { useState, useEffect } from 'react';

const GeneralTab = ({ organization, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: ''
  });
  const [authProviders, setAuthProviders] = useState(['local']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        description: organization.description || '',
        logoUrl: organization.logo_url || ''
      });
      setAuthProviders(organization.auth_providers || ['local']);
    }
  }, [organization]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleAuthProviderToggle = (provider) => {
    setAuthProviders(prev => {
      if (prev.includes(provider)) {
        // Don't allow removing all providers
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== provider);
      }
      return [...prev, provider];
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onUpdate({
      name: formData.name,
      description: formData.description,
      logoUrl: formData.logoUrl,
      authProviders
    });
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const availableProviders = [
    { id: 'local', name: 'Email & Password', description: 'Traditional email/password login' },
    { id: 'google', name: 'Google', description: 'Sign in with Google accounts' },
    { id: 'microsoft', name: 'Microsoft', description: 'Sign in with Microsoft/Azure AD' },
    { id: 'saml', name: 'SAML SSO', description: 'Enterprise single sign-on' }
  ];

  return (
    <div className="settings-tab general-tab">
      <section className="settings-section">
        <h3>Organization Details</h3>

        <div className="form-group">
          <label>Organization Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter organization name"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Brief description of your organization"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Logo URL</label>
          <input
            type="url"
            value={formData.logoUrl}
            onChange={(e) => handleChange('logoUrl', e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          {formData.logoUrl && (
            <div className="logo-preview">
              <img src={formData.logoUrl} alt="Logo preview" />
            </div>
          )}
        </div>
      </section>

      <section className="settings-section">
        <h3>Authentication Providers</h3>
        <p className="section-description">
          Choose how users can sign in to your organization.
        </p>

        <div className="auth-providers-list">
          {availableProviders.map(provider => (
            <div
              key={provider.id}
              className={`auth-provider-item ${authProviders.includes(provider.id) ? 'enabled' : ''}`}
              onClick={() => handleAuthProviderToggle(provider.id)}
            >
              <div className="provider-checkbox">
                <input
                  type="checkbox"
                  checked={authProviders.includes(provider.id)}
                  onChange={() => {}}
                />
              </div>
              <div className="provider-info">
                <span className="provider-name">{provider.name}</span>
                <span className="provider-description">{provider.description}</span>
              </div>
              {provider.id !== 'local' && authProviders.includes(provider.id) && (
                <button className="configure-btn">Configure</button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h3>Danger Zone</h3>

        <div className="danger-zone">
          <div className="danger-item">
            <div className="danger-info">
              <span className="danger-title">Transfer Ownership</span>
              <span className="danger-description">
                Transfer this organization to another user
              </span>
            </div>
            <button className="btn-danger-outline">Transfer</button>
          </div>

          <div className="danger-item">
            <div className="danger-info">
              <span className="danger-title">Delete Organization</span>
              <span className="danger-description">
                Permanently delete this organization and all its data
              </span>
            </div>
            <button className="btn-danger">Delete Organization</button>
          </div>
        </div>
      </section>

      <div className="settings-actions">
        {saved && <span className="save-success">Changes saved!</span>}
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default GeneralTab;
