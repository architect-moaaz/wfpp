/**
 * DataExplorer - Browse Your Data
 *
 * Visual data exploration interface for non-technical users.
 * Shows data organized by categories with simple, intuitive navigation.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Database,
  ShoppingCart,
  Users,
  Package,
  Briefcase,
  DollarSign,
  MapPin,
  ChevronRight,
  Table2,
  Link2,
  Eye,
  MessageSquare
} from 'lucide-react';
import './DataExplorer.css';

const DataExplorer = ({ onBack, catalogSummary }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelDetails, setModelDetails] = useState(null);

  // Category icons
  const categoryIcons = {
    'Sales': ShoppingCart,
    'Customers': Users,
    'Products': Package,
    'HR & People': Briefcase,
    'Finance': DollarSign,
    'Locations': MapPin,
    'Reference Data': Database,
    'Other': Database
  };

  // Filter categories and models by search term
  const getFilteredCategories = () => {
    if (!catalogSummary?.categories) return [];

    const term = searchTerm.toLowerCase();
    if (!term) return catalogSummary.categories;

    return catalogSummary.categories.map(category => ({
      ...category,
      models: category.models.filter(model =>
        model.name.toLowerCase().includes(term) ||
        category.name.toLowerCase().includes(term)
      )
    })).filter(category => category.models.length > 0);
  };

  // Fetch model details when selected
  const handleModelClick = async (model) => {
    setSelectedModel(model);
    setLoading(true);

    try {
      const res = await fetch(`/api/analytics/catalog/models/${model.id}`, {
        headers: { 'x-org-id': 'default' }
      });

      if (res.ok) {
        const data = await res.json();
        setModelDetails(data.data);
      }
    } catch (error) {
      console.error('Error fetching model details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render category list
  const renderCategories = () => {
    const categories = getFilteredCategories();

    return (
      <div className="explorer-categories">
        <p className="explorer-intro">Your organization has data in these areas:</p>

        <div className="category-grid">
          {categories.map((category) => {
            const Icon = categoryIcons[category.name] || Database;
            return (
              <div
                key={category.name}
                className="explorer-category-card"
                onClick={() => setSelectedCategory(category)}
              >
                <div className="category-card-icon">
                  <Icon size={28} />
                </div>
                <div className="category-card-info">
                  <h3>{category.name}</h3>
                  <span>{category.modelCount} {category.modelCount === 1 ? 'model' : 'models'}</span>
                </div>
                <ChevronRight size={20} className="category-arrow" />
              </div>
            );
          })}
        </div>

        {categories.length === 0 && (
          <div className="no-results">
            <p>No data found matching "{searchTerm}"</p>
          </div>
        )}
      </div>
    );
  };

  // Render models in a category
  const renderCategoryModels = () => {
    if (!selectedCategory) return null;

    return (
      <div className="explorer-models">
        <button className="breadcrumb-back" onClick={() => setSelectedCategory(null)}>
          <ArrowLeft size={18} />
          All Categories
        </button>

        <h2>{selectedCategory.name}</h2>
        <p className="models-intro">The {selectedCategory.name} area contains:</p>

        <div className="models-list">
          {selectedCategory.models.map((model) => (
            <div
              key={model.id}
              className="model-card"
              onClick={() => handleModelClick(model)}
            >
              <div className="model-card-header">
                <Table2 size={20} />
                <span className="model-name">{model.name}</span>
                <span className="model-count">{model.rowCount?.toLocaleString() || 'N/A'} records</span>
              </div>
              <div className="model-card-fields">
                <span>{model.fieldCount} fields</span>
                <span className="model-app">From: {model.appName}</span>
              </div>
              <div className="model-card-actions">
                <button className="model-action">
                  <Eye size={14} />
                  View Sample
                </button>
                <button className="model-action">
                  <MessageSquare size={14} />
                  Ask Question
                </button>
                <button className="model-action">
                  <Link2 size={14} />
                  Use in Lookup
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render model details
  const renderModelDetails = () => {
    if (!selectedModel || !modelDetails) return null;

    const { model, relationships } = modelDetails;

    return (
      <div className="explorer-model-details">
        <button
          className="breadcrumb-back"
          onClick={() => {
            setSelectedModel(null);
            setModelDetails(null);
          }}
        >
          <ArrowLeft size={18} />
          Back to {selectedCategory?.name || 'Models'}
        </button>

        <div className="model-details-header">
          <Table2 size={24} />
          <div>
            <h2>{model.displayName}</h2>
            <p>From {model.appName}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="details-section">
          <h3>What's in {model.displayName}:</h3>
          <div className="fields-grid">
            {model.fields.map((field) => (
              <div key={field.id} className="field-item">
                <span className="field-name">{field.displayName}</span>
                <span className="field-type">{field.type}</span>
                {field.foreignKey && (
                  <span className="field-link">
                    <Link2 size={12} />
                    linked
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Relationships */}
        {relationships && relationships.length > 0 && (
          <div className="details-section">
            <h3>Connections:</h3>
            <div className="relationships-list">
              {relationships.map((rel) => (
                <div key={rel.id} className="relationship-item">
                  <Link2 size={16} />
                  <span>
                    {rel.type === 'belongsTo' ? 'Belongs to' : 'Has many'}:{' '}
                    <strong>{rel.targetModelName}</strong>
                    {rel.crossApp && <span className="cross-app-badge">Different App</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        {model.statistics && (
          <div className="details-section">
            <h3>Statistics:</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{model.statistics.rowCount?.toLocaleString()}</span>
                <span className="stat-label">Records</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{model.fields.length}</span>
                <span className="stat-label">Fields</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{model.statistics.recommendedUI}</span>
                <span className="stat-label">Recommended UI</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="details-actions">
          <button className="action-btn primary">
            <MessageSquare size={16} />
            Ask a Question
          </button>
          <button className="action-btn">
            <Eye size={16} />
            View Sample Data
          </button>
          <button className="action-btn">
            <Link2 size={16} />
            Create Lookup
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="data-explorer">
      {/* Header */}
      <div className="explorer-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>Browse Your Data</h1>
      </div>

      {/* Search */}
      <div className="explorer-search">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search for data..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="explorer-content">
        {loading ? (
          <div className="explorer-loading">
            <div className="loading-spinner" />
            <p>Loading...</p>
          </div>
        ) : selectedModel && modelDetails ? (
          renderModelDetails()
        ) : selectedCategory ? (
          renderCategoryModels()
        ) : (
          renderCategories()
        )}
      </div>
    </div>
  );
};

export default DataExplorer;
