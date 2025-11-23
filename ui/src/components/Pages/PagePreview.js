import React, { useState, useEffect } from 'react';
import './PagePreview.css';

const PagePreview = () => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const pageId = urlParams.get('id');

        if (!pageId) {
          setError('No page ID provided');
          setLoading(false);
          return;
        }

        const response = await fetch(`http://localhost:5000/api/pages/${pageId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch page');
        }

        const data = await response.json();
        setPage(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPage();
  }, []);

  const renderComponent = (component) => {
    const config = component.config || {};

    switch (component.type) {
      case 'heading':
        const HeadingTag = config.level || 'h2';
        return (
          <HeadingTag
            key={component.id}
            style={{
              textAlign: config.align,
              color: config.color,
              margin: '0 0 16px 0',
              fontSize: config.level === 'h1' ? '2.5rem' : config.level === 'h2' ? '2rem' : config.level === 'h3' ? '1.5rem' : '1.25rem'
            }}
          >
            {config.text || 'Heading'}
          </HeadingTag>
        );

      case 'paragraph':
        return (
          <p
            key={component.id}
            style={{
              textAlign: config.align,
              color: config.color,
              lineHeight: '1.6',
              margin: '0 0 16px 0'
            }}
          >
            {config.text || 'Paragraph text'}
          </p>
        );

      case 'textInput':
        return (
          <div key={component.id} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              {config.label || 'Text Input'}
              {config.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
            </label>
            <input
              type="text"
              placeholder={config.placeholder}
              style={{
                width: config.width || '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={component.id} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              {config.label || 'Textarea'}
            </label>
            <textarea
              placeholder={config.placeholder}
              rows={config.rows || 4}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>
        );

      case 'select':
        return (
          <div key={component.id} style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              {config.label || 'Select'}
            </label>
            <select
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              {config.options?.map((opt, i) => (
                <option key={i}>{opt}</option>
              )) || <option>Option 1</option>}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <label key={component.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}>
            <input type="checkbox" style={{ marginRight: '8px' }} />
            <span>{config.label || 'Checkbox'}</span>
          </label>
        );

      case 'button':
        return (
          <button
            key={component.id}
            style={{
              padding: config.size === 'small' ? '6px 12px' : config.size === 'large' ? '12px 24px' : '8px 16px',
              backgroundColor: config.variant === 'secondary' ? '#6b7280' : config.variant === 'danger' ? '#ef4444' : '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              width: config.fullWidth ? '100%' : 'auto',
              marginBottom: '16px'
            }}
          >
            {config.text || 'Button'}
          </button>
        );

      case 'image':
        return (
          <img
            key={component.id}
            src={config.src || 'https://via.placeholder.com/400x300'}
            alt={config.alt || 'Image'}
            style={{
              width: config.width || '100%',
              borderRadius: config.borderRadius || '8px',
              maxWidth: '100%',
              marginBottom: '16px'
            }}
          />
        );

      case 'table':
        return (
          <div key={component.id} style={{ marginBottom: '16px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {config.columns?.map((col, i) => (
                    <th key={i} style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '600' }}>
                      {col}
                    </th>
                  )) || <th style={{ padding: '12px' }}>Column</th>}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {config.columns?.map((col, i) => (
                    <td key={i} style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                      Sample data
                    </td>
                  )) || <td style={{ padding: '12px' }}>Data</td>}
                </tr>
              </tbody>
            </table>
          </div>
        );

      case 'list':
        return (
          <ul key={component.id} style={{ margin: '0 0 16px 0', paddingLeft: '24px' }}>
            {config.items?.map((item, i) => (
              <li key={i} style={{ marginBottom: '8px' }}>{item}</li>
            )) || <li>List item</li>}
          </ul>
        );

      case 'card':
        return (
          <div
            key={component.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '16px',
              backgroundColor: '#ffffff'
            }}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem' }}>{config.title || 'Card Title'}</h3>
            <p style={{ margin: '0', color: '#6b7280', lineHeight: '1.6' }}>{config.content || 'Card content goes here'}</p>
          </div>
        );

      case 'container':
        return (
          <div
            key={component.id}
            style={{
              padding: config.padding || '20px',
              backgroundColor: config.backgroundColor || 'transparent',
              borderRadius: config.borderRadius || '0',
              marginBottom: '16px'
            }}
          >
            {component.children?.map(child => renderComponent(child))}
          </div>
        );

      case 'grid':
        return (
          <div
            key={component.id}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${config.columns || 2}, 1fr)`,
              gap: config.gap || '16px',
              marginBottom: '16px'
            }}
          >
            {component.children?.map(child => renderComponent(child))}
          </div>
        );

      case 'section':
        return (
          <section
            key={component.id}
            style={{
              marginBottom: '32px',
              padding: config.padding || '0'
            }}
          >
            {component.children?.map(child => renderComponent(child))}
          </section>
        );

      default:
        return (
          <div key={component.id} style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px', marginBottom: '16px' }}>
            Unknown component: {component.type}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="page-preview-loading">
        <div className="spinner"></div>
        <p>Loading page...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-preview-error">
        <h2>Error Loading Page</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="page-preview-error">
        <h2>Page Not Found</h2>
        <p>The requested page could not be found.</p>
      </div>
    );
  }

  return (
    <div className="page-preview-container">
      <style>{page.customCSS || ''}</style>
      <div className="page-preview-content">
        {page.sections?.map((section, idx) => (
          <div key={idx} className="page-section">
            {section.components?.map(component => renderComponent(component))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PagePreview;
