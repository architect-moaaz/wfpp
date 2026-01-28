import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from './DataTable';
import Modal from './Modal';
import { dataApi } from '../api/client';

export default function PageRenderer({ page, forms }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submittingForm, setSubmittingForm] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (page) {
      loadPageData();
    }
  }, [page?.id]);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const bindings = findDataBindings(page.sections || []);
      const dataPromises = {};

      for (const binding of bindings) {
        const [model] = binding.split('.');
        if (model && !dataPromises[model]) {
          dataPromises[model] = dataApi.list(model.toLowerCase())
            .then(res => res.data || [])
            .catch(() => []);
        }
      }

      const results = await Promise.all(
        Object.entries(dataPromises).map(async ([model, promise]) => [model, await promise])
      );

      const dataMap = {};
      results.forEach(([model, modelData]) => {
        dataMap[model] = modelData;
      });

      setData(dataMap);
    } catch (error) {
      console.error('Error loading page data:', error);
    } finally {
      setLoading(false);
    }
  };

  const findDataBindings = (sections) => {
    const bindings = new Set();
    const traverse = (items) => {
      if (!items) return;
      for (const item of items) {
        if (item.dataBinding) bindings.add(item.dataBinding);
        if (item.components) traverse(item.components);
        if (item.children) traverse(item.children);
      }
    };
    traverse(sections);
    return Array.from(bindings);
  };

  const handleFormChange = (formId, fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        [fieldName]: value
      }
    }));
    // Clear error on change
    if (formErrors[formId]?.[fieldName]) {
      setFormErrors(prev => ({
        ...prev,
        [formId]: {
          ...prev[formId],
          [fieldName]: null
        }
      }));
    }
  };

  const handleFormSubmit = async (form) => {
    const formValues = formData[form.id] || {};
    const errors = {};

    // Validate required fields
    (form.fields || []).forEach(field => {
      if (field.required && !formValues[field.name]) {
        errors[field.name] = `${field.label} is required`;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(prev => ({ ...prev, [form.id]: errors }));
      return;
    }

    setSubmittingForm(form.id);
    try {
      const modelMatch = form?.id?.match(/^([a-z]+)form/i);
      const model = modelMatch ? modelMatch[1] : form.dataModelName?.toLowerCase() || 'record';
      await dataApi.create(model.toLowerCase(), formValues);

      // Clear form and reload data
      setFormData(prev => ({ ...prev, [form.id]: {} }));
      setFormErrors(prev => ({ ...prev, [form.id]: {} }));
      loadPageData();
    } catch (error) {
      alert('Error submitting form: ' + error.message);
    } finally {
      setSubmittingForm(null);
    }
  };

  const handleAction = (action, context) => {
    if (!action) return;
    switch (action.type) {
      case 'navigate':
        navigate(action.target);
        break;
      default:
        console.log('Action:', action);
    }
  };

  // Render a form field with styling
  const renderFormField = (field, form, styling) => {
    const formValues = formData[form.id] || {};
    const errors = formErrors[form.id] || {};
    const inputStyle = styling?.components?.input || {};
    const colors = styling?.colors || {};
    const typography = styling?.typography || {};

    const baseInputStyle = {
      width: '100%',
      padding: styling?.spacing?.inputPadding || '10px 12px',
      fontFamily: typography?.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: typography?.fontSize?.input || '14px',
      fontWeight: typography?.fontWeight?.input || '400',
      color: colors?.text || '#1e293b',
      backgroundColor: colors?.background || '#ffffff',
      border: `${inputStyle?.borderWidth || '1px'} solid ${errors[field.name] ? '#ef4444' : (colors?.border || '#e2e8f0')}`,
      borderRadius: inputStyle?.borderRadius || '6px',
      height: inputStyle?.height || '40px',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxSizing: 'border-box'
    };

    const labelStyle = {
      display: 'block',
      marginBottom: '6px',
      fontFamily: typography?.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: typography?.fontSize?.label || '14px',
      fontWeight: typography?.fontWeight?.label || '500',
      color: colors?.text || '#1e293b'
    };

    const renderInput = () => {
      switch (field.type) {
        case 'textarea':
          return (
            <textarea
              style={{ ...baseInputStyle, height: 'auto', minHeight: '100px', resize: 'vertical' }}
              placeholder={field.placeholder}
              value={formValues[field.name] || ''}
              onChange={(e) => handleFormChange(form.id, field.name, e.target.value)}
            />
          );
        case 'select':
        case 'dropdown':
          return (
            <select
              style={baseInputStyle}
              value={formValues[field.name] || ''}
              onChange={(e) => handleFormChange(form.id, field.name, e.target.value)}
            >
              <option value="">{field.placeholder || 'Select...'}</option>
              {(field.options || []).map((opt, i) => {
                const value = typeof opt === 'object' ? opt.value : opt;
                const label = typeof opt === 'object' ? opt.label : opt;
                return <option key={i} value={value}>{label}</option>;
              })}
            </select>
          );
        case 'checkbox':
          return (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formValues[field.name] || false}
                onChange={(e) => handleFormChange(form.id, field.name, e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: colors?.primary || '#2563eb' }}
              />
              <span style={{ fontSize: '14px', color: colors?.text || '#1e293b' }}>{field.label}</span>
            </label>
          );
        case 'date':
          return (
            <input
              type="date"
              style={baseInputStyle}
              value={formValues[field.name] || ''}
              onChange={(e) => handleFormChange(form.id, field.name, e.target.value)}
            />
          );
        case 'number':
          return (
            <input
              type="number"
              style={baseInputStyle}
              placeholder={field.placeholder}
              value={formValues[field.name] || ''}
              onChange={(e) => handleFormChange(form.id, field.name, e.target.value)}
              min={field.validation?.min}
              max={field.validation?.max}
            />
          );
        case 'email':
          return (
            <input
              type="email"
              style={baseInputStyle}
              placeholder={field.placeholder}
              value={formValues[field.name] || ''}
              onChange={(e) => handleFormChange(form.id, field.name, e.target.value)}
            />
          );
        default:
          return (
            <input
              type="text"
              style={baseInputStyle}
              placeholder={field.placeholder}
              value={formValues[field.name] || ''}
              onChange={(e) => handleFormChange(form.id, field.name, e.target.value)}
            />
          );
      }
    };

    if (field.type === 'checkbox') {
      return (
        <div key={field.id} style={{ marginBottom: styling?.spacing?.fieldGap || '16px' }}>
          {renderInput()}
          {errors[field.name] && (
            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors[field.name]}</p>
          )}
        </div>
      );
    }

    return (
      <div key={field.id} style={{ marginBottom: styling?.spacing?.fieldGap || '16px' }}>
        <label style={labelStyle}>
          {field.label}
          {field.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
        {renderInput()}
        {errors[field.name] && (
          <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors[field.name]}</p>
        )}
      </div>
    );
  };

  // Render an inline form within a card
  const renderInlineForm = (formId, cardStyle) => {
    const form = forms.find(f => f.id === formId);
    if (!form) return <p style={{ color: '#666' }}>Form not found: {formId}</p>;

    const styling = form.styling || {};
    const colors = styling?.colors || {};
    const buttonStyle = styling?.components?.button?.primary || {};
    const layout = form.layout;

    const submitBtnStyle = {
      backgroundColor: buttonStyle.background || colors?.primary || '#2563eb',
      color: buttonStyle.color || '#ffffff',
      padding: buttonStyle.padding || '10px 24px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s, transform 0.1s',
      opacity: submittingForm === form.id ? 0.7 : 1
    };

    // Group fields by section if layout exists
    const renderFields = () => {
      if (layout?.sections && layout.sections.length > 0) {
        return layout.sections.map((section, sIdx) => {
          const sectionFields = section.fieldIds
            .map(fid => form.fields.find(f => f.id === fid || f.name === fid))
            .filter(Boolean);

          return (
            <div key={sIdx} style={{ marginBottom: styling?.spacing?.sectionGap || '24px' }}>
              {section.title && (
                <h4 style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '16px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  {section.title}
                </h4>
              )}
              <div style={{
                display: 'grid',
                gridTemplateColumns: layout.type === 'two-column' ? 'repeat(2, 1fr)' : '1fr',
                gap: '16px'
              }}>
                {sectionFields.map(field => (
                  <div key={field.id} style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
                    {renderFormField(field, form, styling)}
                  </div>
                ))}
              </div>
            </div>
          );
        });
      }

      // Default: render all fields
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {(form.fields || []).map(field => (
            <div key={field.id} style={{ gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
              {renderFormField(field, form, styling)}
            </div>
          ))}
        </div>
      );
    };

    return (
      <div style={{ marginTop: '16px' }}>
        {renderFields()}
        <div style={{
          display: 'flex',
          justifyContent: form.submitButton?.position === 'right' ? 'flex-end' : 'flex-start',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <button
            style={submitBtnStyle}
            onClick={() => handleFormSubmit(form)}
            disabled={submittingForm === form.id}
          >
            {submittingForm === form.id ? 'Submitting...' : (form.submitButton?.label || 'Submit')}
          </button>
        </div>
      </div>
    );
  };

  const renderComponent = (component, index) => {
    if (!component) return null;

    const { type, config, formRef, dataBinding, children } = component;
    const designStyle = config?.style || {};

    switch (type) {
      case 'text':
        const TextTag = config?.variant === 'h1' ? 'h1' :
                        config?.variant === 'h2' ? 'h2' :
                        config?.variant === 'h3' ? 'h3' :
                        config?.variant === 'subtitle' ? 'p' : 'p';

        const textStyle = {
          fontFamily: designStyle.fontFamily || config?.fontFamily || 'Inter, system-ui, sans-serif',
          fontSize: designStyle.fontSize || config?.fontSize || (config?.variant === 'h1' ? '28px' : '14px'),
          fontWeight: designStyle.fontWeight || config?.fontWeight || (config?.variant === 'h1' ? '700' : '400'),
          color: designStyle.color || config?.color || '#1a1a1a',
          marginBottom: designStyle.marginBottom || config?.marginBottom || '0',
          lineHeight: designStyle.lineHeight || config?.lineHeight || '1.5',
          margin: 0
        };

        return (
          <TextTag key={index} style={textStyle}>
            {config?.text}
          </TextTag>
        );

      case 'card':
        const cardStyle = {
          backgroundColor: designStyle.backgroundColor || config?.backgroundColor || '#ffffff',
          borderRadius: designStyle.borderRadius || config?.borderRadius || '12px',
          padding: designStyle.padding || config?.padding || '24px',
          boxShadow: designStyle.boxShadow || config?.boxShadow || '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: designStyle.marginBottom || config?.marginBottom || '24px',
          border: designStyle.border || config?.border || '1px solid #e5e5e5',
          ...designStyle
        };

        const cardTitleStyle = {
          fontSize: '18px',
          fontWeight: '600',
          color: '#1a1a1a',
          marginTop: 0,
          marginBottom: '8px'
        };

        const cardDescStyle = {
          fontSize: '14px',
          color: '#666666',
          marginTop: 0,
          marginBottom: formRef ? '0' : '16px',
          lineHeight: '1.5'
        };

        return (
          <div key={index} style={cardStyle}>
            {config?.title && <h3 style={cardTitleStyle}>{config.title}</h3>}
            {config?.description && <p style={cardDescStyle}>{config.description}</p>}

            {/* Render card fields if present */}
            {config?.fields && (
              <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
                {config.fields.map((field, fIdx) => (
                  <div key={fIdx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: fIdx < config.fields.length - 1 ? '1px solid #f1f5f9' : 'none'
                  }}>
                    <span style={{
                      color: field.labelColor || '#666666',
                      fontWeight: field.labelWeight || '500',
                      fontSize: '14px'
                    }}>
                      {field.label}
                    </span>
                    {field.badge ? (
                      <span style={{
                        backgroundColor: field.badgeColor || '#e5e7eb',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {field.value}
                      </span>
                    ) : (
                      <span style={{
                        color: field.valueColor || '#1a1a1a',
                        fontWeight: field.valueWeight || '400',
                        fontSize: '14px'
                      }}>
                        {field.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Render inline form if formRef exists */}
            {formRef && renderInlineForm(formRef, cardStyle)}

            {/* Render nested components */}
            {component.components && component.components.map((c, i) => renderComponent(c, i))}
            {children && children.map((c, i) => renderComponent(c, i))}
          </div>
        );

      case 'button':
        const isSecondary = config?.variant === 'secondary';
        const btnStyle = {
          backgroundColor: isSecondary ? 'transparent' : (designStyle.backgroundColor || '#2563eb'),
          color: isSecondary ? '#2563eb' : (designStyle.color || '#ffffff'),
          padding: designStyle.padding || '10px 20px',
          border: isSecondary ? '1px solid #2563eb' : 'none',
          borderRadius: designStyle.borderRadius || '6px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s',
          ...designStyle
        };

        return (
          <button
            key={index}
            style={btnStyle}
            onClick={() => handleAction(component.action)}
          >
            {config?.text || config?.label}
          </button>
        );

      case 'table':
        const [tableModel] = (dataBinding || '').split('.');
        const tableData = data[tableModel] || [];
        const columns = (config?.columns || []).map(col => ({
          name: col.key,
          label: col.label,
          type: col.type || 'text'
        }));

        const tableContainerStyle = {
          backgroundColor: designStyle.backgroundColor || '#ffffff',
          borderRadius: designStyle.borderRadius || '12px',
          padding: designStyle.padding || '24px',
          boxShadow: designStyle.boxShadow || '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: designStyle.border || '1px solid #e5e5e5',
          fontFamily: designStyle.fontFamily || 'Inter, system-ui, sans-serif',
          ...designStyle
        };

        return (
          <div key={index} style={tableContainerStyle}>
            {config?.title && (
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1a1a1a',
                marginTop: 0,
                marginBottom: '16px'
              }}>
                {config.title}
              </h3>
            )}
            <DataTable
              columns={columns}
              data={tableData}
              onView={(row) => console.log('View:', row)}
            />
          </div>
        );

      case 'metric':
        const [metricModel] = (dataBinding || '').split('.');
        const metricData = data[metricModel] || [];
        const metricValue = config?.aggregation === 'count' ? metricData.length :
                          config?.aggregation === 'sum' ? metricData.reduce((sum, r) => sum + (r[config.field] || 0), 0) :
                          metricData.length;

        const metricCardStyle = {
          backgroundColor: designStyle.backgroundColor || '#ffffff',
          borderRadius: designStyle.borderRadius || '12px',
          padding: designStyle.padding || '24px',
          boxShadow: designStyle.boxShadow || '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: designStyle.border || '1px solid #e5e5e5',
          textAlign: 'center',
          ...designStyle
        };

        return (
          <div key={index} style={metricCardStyle}>
            <div style={{
              fontSize: '36px',
              fontWeight: '700',
              color: designStyle.valueColor || '#2563eb',
              lineHeight: '1'
            }}>
              {metricValue}
            </div>
            <div style={{
              fontSize: '14px',
              color: designStyle.labelColor || '#666666',
              marginTop: '8px',
              fontWeight: '500'
            }}>
              {config?.label || config?.title}
            </div>
          </div>
        );

      case 'badge':
        const badgeColors = {
          green: { bg: '#dcfce7', text: '#166534' },
          red: { bg: '#fee2e2', text: '#991b1b' },
          blue: { bg: '#dbeafe', text: '#1e40af' },
          yellow: { bg: '#fef9c3', text: '#854d0e' },
          gray: { bg: '#f3f4f6', text: '#374151' },
          default: { bg: '#e5e7eb', text: '#374151' }
        };
        const badgeColor = badgeColors[config?.color] || badgeColors.default;

        return (
          <span key={index} style={{
            backgroundColor: designStyle.backgroundColor || badgeColor.bg,
            color: designStyle.color || badgeColor.text,
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'inline-block',
            ...designStyle
          }}>
            {config?.text}
          </span>
        );

      case 'form':
        // Render form component (can be inline or referenced)
        if (formRef) {
          return <div key={index}>{renderInlineForm(formRef, designStyle)}</div>;
        }
        return null;

      case 'search':
        const searchStyle = {
          width: '100%',
          padding: designStyle.padding || '10px 16px',
          fontSize: designStyle.fontSize || '14px',
          fontFamily: designStyle.fontFamily || 'Inter, system-ui, sans-serif',
          border: designStyle.border || '1px solid #d1d5db',
          borderRadius: designStyle.borderRadius || '8px',
          outline: 'none',
          boxSizing: 'border-box',
          ...designStyle
        };

        return (
          <input
            key={index}
            type="search"
            placeholder={config?.placeholder || 'Search...'}
            style={searchStyle}
          />
        );

      case 'filter':
        const filterContainerStyle = {
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          ...designStyle
        };

        return (
          <div key={index} style={filterContainerStyle}>
            {(config?.filters || []).map((filter, fIdx) => (
              <div key={fIdx} style={{ minWidth: '150px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  {filter.label}
                </label>
                <select style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}>
                  <option value="">All</option>
                  {(filter.options || []).map((opt, oIdx) => (
                    <option key={oIdx} value={opt.value || opt}>{opt.label || opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );

      case 'chart':
        // Placeholder for chart components
        const chartStyle = {
          backgroundColor: designStyle.backgroundColor || '#ffffff',
          borderRadius: designStyle.borderRadius || '12px',
          padding: designStyle.padding || '24px',
          border: designStyle.border || '1px solid #e5e5e5',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...designStyle
        };

        return (
          <div key={index} style={chartStyle}>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              {config?.title && <h4 style={{ marginBottom: '8px' }}>{config.title}</h4>}
              <p style={{ fontSize: '14px' }}>Chart: {config?.chartType || 'bar'}</p>
            </div>
          </div>
        );

      case 'grid':
        const gridStyle = {
          display: 'grid',
          gridTemplateColumns: `repeat(${config?.columns || 3}, 1fr)`,
          gap: designStyle.gap || '16px',
          ...designStyle
        };

        return (
          <div key={index} style={gridStyle}>
            {(component.components || children || []).map((c, i) => renderComponent(c, i))}
          </div>
        );

      case 'list':
        const listStyle = {
          listStyle: 'none',
          padding: 0,
          margin: 0,
          ...designStyle
        };

        return (
          <ul key={index} style={listStyle}>
            {(config?.items || []).map((item, iIdx) => (
              <li key={iIdx} style={{
                padding: '12px 0',
                borderBottom: iIdx < (config.items.length - 1) ? '1px solid #e5e7eb' : 'none'
              }}>
                {typeof item === 'string' ? item : item.text || item.label}
              </li>
            ))}
          </ul>
        );

      default:
        // Try to render nested components for unknown types
        if (component.components || children) {
          return (
            <div key={index} style={designStyle}>
              {(component.components || children || []).map((c, i) => renderComponent(c, i))}
            </div>
          );
        }
        return null;
    }
  };

  const renderSection = (section, index) => {
    if (!section) return null;

    const sectionStyles = {
      header: {
        marginBottom: '32px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      },
      main: {
        display: 'grid',
        gap: '24px'
      },
      sidebar: {
        backgroundColor: '#f9fafb',
        padding: '20px',
        borderRadius: '12px'
      }
    };

    const style = sectionStyles[section.type] || {};

    return (
      <div key={index} style={style}>
        {(section.components || []).map((component, i) => renderComponent(component, i))}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px',
        color: '#666'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#2563eb',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!page) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#666'
      }}>
        <h2 style={{ color: '#374151', marginBottom: '8px' }}>Page Not Found</h2>
        <p>The requested page could not be found.</p>
      </div>
    );
  }

  // Check if page has a header section with styled components
  const hasStyledHeader = page.sections?.some(s => s.type === 'header' && s.components?.length > 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      {/* Only show default header if no styled header section exists */}
      {!hasStyledHeader && (
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '8px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            {page.title || page.name}
          </h1>
          {page.description && (
            <p style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.5',
              margin: 0
            }}>
              {page.description}
            </p>
          )}
        </div>
      )}

      {/* Page Sections */}
      <div>
        {(page.sections || []).map((section, index) => renderSection(section, index))}
      </div>
    </div>
  );
}
