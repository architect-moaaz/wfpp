import React, { useState, useEffect } from 'react';
import './PagePreview.css';

const PagePreview = () => {
  const [page, setPage] = useState(null);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const pageId = urlParams.get('id');
        const appId = urlParams.get('appId');

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
        setPage(data.page);

        // Fetch forms if appId is provided
        if (appId) {
          try {
            const appResponse = await fetch(`http://localhost:5000/api/applications/${appId}`);
            if (appResponse.ok) {
              const appData = await appResponse.json();
              const app = appData.application || appData;
              const formsMap = {};
              (app.resources?.forms || []).forEach(form => {
                formsMap[form.id] = form;
              });
              setForms(formsMap);
            }
          } catch (appErr) {
            console.error('Failed to fetch forms:', appErr);
          }
        }

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
        const containerChildren = config.children || component.children || [];
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
            {Array.isArray(containerChildren) && containerChildren.length > 0
              ? containerChildren.map((child, idx) => renderComponent({ ...child, id: child.id || `container-${idx}` }))
              : null
            }
          </div>
        );

      case 'spacer':
        return <div key={component.id} style={{ height: config.height || '24px' }} />;

      case 'divider':
        return <hr key={component.id} style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />;

      case 'text':
        return (
          <p key={component.id} style={{ color: '#374151', lineHeight: '1.6', margin: '0 0 16px 0' }}>
            {config.text || config.content || 'Text content'}
          </p>
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

      case 'form':
        const formId = component.formRef || config.formId || config.formRef;
        const form = formId ? forms[formId] : null;

        if (!form) {
          return (
            <div key={component.id} style={{
              padding: '20px',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <p style={{ margin: 0, color: '#92400e' }}>Form: {formId || 'No form ID'} (not loaded)</p>
            </div>
          );
        }

        return (
          <div key={component.id} style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: '600' }}>
              {form.title || form.name}
            </h3>
            {form.description && (
              <p style={{ margin: '0 0 20px 0', color: '#6b7280' }}>{form.description}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(form.fields || []).map((field, idx) => (
                <div key={field.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontWeight: '500', fontSize: '14px', color: '#374151' }}>
                    {field.label || field.name}
                    {field.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      placeholder={field.placeholder}
                      rows={4}
                      style={{
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  ) : field.type === 'select' || field.type === 'dropdown' ? (
                    <select style={{
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: '#fff'
                    }}>
                      <option value="">{field.placeholder || 'Select...'}</option>
                      {(field.options || []).map((opt, i) => (
                        <option key={i} value={typeof opt === 'string' ? opt : opt.value}>
                          {typeof opt === 'string' ? opt : opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" />
                      <span>{field.placeholder || field.label}</span>
                    </label>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      style={{
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            {form.submitButton && (
              <div style={{ marginTop: '24px', textAlign: form.submitButton.position === 'center' ? 'center' : form.submitButton.position === 'left' ? 'left' : 'right' }}>
                <button style={{
                  padding: '10px 24px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}>
                  {form.submitButton.label || 'Submit'}
                </button>
              </div>
            )}
          </div>
        );

      case 'tabs':
        const tabsList = config.tabs || [];
        const isVertical = config.orientation === 'vertical';
        const tabVariant = config.variant || 'underline';
        const firstTab = tabsList[0];
        const firstTabContent = typeof firstTab === 'object' ? (firstTab.content || []) : [];

        return (
          <div key={component.id} style={{ display: isVertical ? 'flex' : 'block', gap: isVertical ? '24px' : '0', marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              flexDirection: isVertical ? 'column' : 'row',
              borderBottom: !isVertical && tabVariant === 'underline' ? '2px solid #e5e7eb' : 'none',
              gap: tabVariant === 'pills' ? '8px' : '0',
              minWidth: isVertical ? '180px' : 'auto',
              borderRight: isVertical ? '1px solid #e5e7eb' : 'none',
              paddingRight: isVertical ? '24px' : '0'
            }}>
              {tabsList.map((tab, i) => {
                const tabLabel = typeof tab === 'string' ? tab : tab.label;
                const isActive = i === 0;
                return (
                  <div key={i} style={{
                    padding: tabVariant === 'pills' ? '10px 16px' : '12px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: isActive ? (tabVariant === 'pills' ? '#fff' : '#3b82f6') : '#6b7280',
                    backgroundColor: tabVariant === 'pills' ? (isActive ? '#3b82f6' : '#f3f4f6') : 'transparent',
                    borderRadius: tabVariant === 'pills' ? '8px' : '0',
                    borderBottom: !isVertical && tabVariant === 'underline' && isActive ? '2px solid #3b82f6' : 'none',
                    marginBottom: !isVertical && tabVariant === 'underline' ? '-2px' : '0',
                    cursor: 'pointer'
                  }}>
                    {tabLabel}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '20px 0', flex: 1 }}>
              {Array.isArray(firstTabContent) && firstTabContent.length > 0
                ? firstTabContent.map((child, idx) => renderComponent({ ...child, id: child.id || `tab-content-${idx}` }))
                : <div style={{ color: '#9ca3af', fontSize: '14px' }}>Tab content</div>
              }
            </div>
          </div>
        );

      case 'progress':
        const progressVariant = config.variant || 'bar';
        const progressSteps = config.steps || [];
        const currentStep = config.currentStep || 1;
        const progressValue = config.value || 60;

        if (progressVariant === 'steps' && progressSteps.length > 0) {
          return (
            <div key={component.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0', marginBottom: '16px' }}>
              {progressSteps.map((step, idx) => {
                const stepNum = idx + 1;
                const isCompleted = stepNum < currentStep;
                const isActive = stepNum === currentStep;
                const isLast = idx === progressSteps.length - 1;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: '600',
                        backgroundColor: isCompleted ? '#3b82f6' : isActive ? '#fff' : '#f3f4f6',
                        color: isCompleted ? '#fff' : isActive ? '#3b82f6' : '#9ca3af',
                        border: isActive ? '2px solid #3b82f6' : 'none'
                      }}>
                        {isCompleted ? '\u2713' : stepNum}
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '8px', color: isActive ? '#3b82f6' : '#9ca3af', fontWeight: isActive ? '600' : '400' }}>
                        {step}
                      </div>
                    </div>
                    {!isLast && <div style={{ width: '60px', height: '2px', backgroundColor: isCompleted ? '#3b82f6' : '#e5e7eb', margin: '0 8px', marginBottom: '24px' }} />}
                  </div>
                );
              })}
            </div>
          );
        }
        return (
          <div key={component.id} style={{ marginBottom: '16px' }}>
            {config.label && <div style={{ fontSize: '14px', marginBottom: '6px', color: '#374151' }}>{config.label}</div>}
            <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progressValue}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: '4px' }} />
            </div>
            {config.showPercent && <div style={{ fontSize: '12px', marginTop: '4px', color: '#6b7280' }}>{progressValue}%</div>}
          </div>
        );

      case 'spinner':
        const spinnerSizes = { small: '20px', medium: '32px', large: '48px' };
        const spinnerSize = spinnerSizes[config.size] || '32px';
        return (
          <div key={component.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '12px' }}>
            <div style={{ width: spinnerSize, height: spinnerSize, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            {config.label && <div style={{ fontSize: '14px', color: '#6b7280' }}>{config.label}</div>}
          </div>
        );

      case 'alert':
        const alertVariant = config.variant || config.type || 'info';
        const alertColors = {
          info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
          success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
          warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
          error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' }
        };
        const colors = alertColors[alertVariant] || alertColors.info;
        return (
          <div key={component.id} style={{
            padding: '16px',
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            {config.title && <div style={{ fontWeight: '600', color: colors.text, marginBottom: '4px' }}>{config.title}</div>}
            <div style={{ color: colors.text, fontSize: '14px' }}>{config.message || 'Alert message'}</div>
          </div>
        );

      case 'toggle':
        return (
          <label key={component.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}>
            <div style={{
              width: '44px', height: '24px', backgroundColor: '#e5e7eb', borderRadius: '12px', position: 'relative', transition: 'background 0.2s'
            }}>
              <div style={{
                width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '50%',
                position: 'absolute', top: '2px', left: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
            <span style={{ fontSize: '14px', color: '#374151' }}>{config.label || 'Toggle'}</span>
          </label>
        );

      case 'stat-card':
        return (
          <div key={component.id} style={{
            padding: '20px', backgroundColor: '#fff', borderRadius: '12px',
            border: '1px solid #e5e7eb', marginBottom: '16px'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>{config.title || config.label || 'Metric'}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }}>{config.value || '0'}</div>
            {config.trend && (
              <div style={{ fontSize: '12px', color: config.trendDirection === 'up' ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                {config.trend}
              </div>
            )}
          </div>
        );

      case 'badge':
        const badgeVariants = {
          success: { bg: '#dcfce7', color: '#166534' },
          warning: { bg: '#fef3c7', color: '#92400e' },
          error: { bg: '#fee2e2', color: '#991b1b' },
          info: { bg: '#dbeafe', color: '#1e40af' }
        };
        const badgeColors = badgeVariants[config.variant] || badgeVariants.info;
        return (
          <span key={component.id} style={{
            display: 'inline-block', padding: '4px 12px', fontSize: '12px', fontWeight: '500',
            backgroundColor: badgeColors.bg, color: badgeColors.color, borderRadius: '9999px'
          }}>
            {config.text || 'Badge'}
          </span>
        );

      case 'navbar':
        return (
          <nav key={component.id} style={{
            padding: '12px 24px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'
          }}>
            <div style={{ fontWeight: '600', fontSize: '18px', color: '#3b82f6' }}>{config.brand || 'Brand'}</div>
            <div style={{ display: 'flex', gap: '24px' }}>
              {(config.items || []).map((item, i) => (
                <span key={i} style={{ fontSize: '14px', color: '#6b7280', cursor: 'pointer' }}>
                  {typeof item === 'string' ? item : item.label}
                </span>
              ))}
            </div>
          </nav>
        );

      case 'hero':
        return (
          <div key={component.id} style={{
            padding: '64px 24px', textAlign: 'center', backgroundColor: '#f9fafb',
            borderRadius: '12px', marginBottom: '16px'
          }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 16px 0' }}>
              {config.title || 'Welcome'}
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#6b7280', margin: '0 0 24px 0' }}>
              {config.subtitle || 'Description text'}
            </p>
            {config.ctaLabel && (
              <button style={{
                padding: '12px 32px', backgroundColor: '#3b82f6', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '500', cursor: 'pointer'
              }}>
                {config.ctaLabel}
              </button>
            )}
          </div>
        );

      case 'header':
        return (
          <header key={component.id} style={{
            padding: '16px 24px', backgroundColor: '#1a1a2e', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'
          }}>
            <div style={{ fontWeight: '600', fontSize: '18px' }}>{config.title || 'Page Header'}</div>
          </header>
        );

      case 'footer':
        return (
          <footer key={component.id} style={{
            padding: '16px 24px', backgroundColor: '#1f2937', color: '#9ca3af',
            textAlign: 'center', fontSize: '14px', marginTop: '16px'
          }}>
            {config.text || 'Footer content'}
          </footer>
        );

      case 'accordion':
        return (
          <div key={component.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
            {(config.items || []).map((item, i) => (
              <div key={i} style={{ borderBottom: i < (config.items?.length || 0) - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <div style={{
                  padding: '14px 16px', backgroundColor: '#f9fafb', fontWeight: '500', fontSize: '14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'
                }}>
                  {item.title || `Section ${i + 1}`}
                  <span style={{ color: '#9ca3af' }}>+</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'chart':
        return (
          <div key={component.id} style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>{config.title || 'Chart'}</div>
            <div style={{ height: config.height || '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', backgroundColor: '#fff', borderRadius: '8px' }}>
              [{config.chartType || 'bar'} chart]
            </div>
          </div>
        );

      default:
        // Try to render children if present
        const defaultChildren = config.children || component.children || [];
        if (Array.isArray(defaultChildren) && defaultChildren.length > 0) {
          return (
            <div key={component.id} style={{ marginBottom: '16px' }}>
              {defaultChildren.map((child, idx) => renderComponent({ ...child, id: child.id || `child-${idx}` }))}
            </div>
          );
        }
        return (
          <div key={component.id} style={{ padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px', marginBottom: '16px' }}>
            {config.text || config.title || config.content || `${component.type || 'Unknown'} component`}
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
