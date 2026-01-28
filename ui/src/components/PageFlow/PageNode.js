import React from 'react';
import { Handle, Position } from 'reactflow';
import { Layout, FileText, Grid, Lock, CheckCircle, LayoutDashboard, Table, FormInput, CreditCard, Navigation, Database, Link2 } from 'lucide-react';

const PageNode = ({ data, selected }) => {
  const getPageIcon = (type) => {
    switch (type) {
      case 'list':
        return Grid;
      case 'detail':
        return FileText;
      case 'form':
        return Layout;
      case 'dashboard':
        return LayoutDashboard;
      case 'auth':
        return Lock;
      case 'confirmation':
        return CheckCircle;
      default:
        return Layout;
    }
  };

  const getPageColor = (type) => {
    const colors = {
      list: '#3b82f6',
      detail: '#10b981',
      form: '#f59e0b',
      dashboard: '#8b5cf6',
      auth: '#ef4444',
      confirmation: '#06b6d4'
    };
    return colors[type] || '#6b7280';
  };

  // Extract component types from page sections
  const getComponentInfo = () => {
    const pageData = data.pageData;
    if (!pageData || !pageData.sections) return { components: [], forms: [], dataBindings: [], navCount: 0 };

    const components = new Set();
    const forms = [];
    const dataBindings = new Set();
    let navCount = 0;

    // Check page-level forms
    if (pageData.forms && pageData.forms.length > 0) {
      pageData.forms.forEach(f => forms.push(typeof f === 'string' ? f : f.id || f.name));
    }

    // Check navigation
    if (pageData.navigation) {
      if (pageData.navigation.onAction) {
        navCount += Object.keys(pageData.navigation.onAction).length;
      }
      if (pageData.navigation.menu) {
        navCount += pageData.navigation.menu.length;
      }
    }

    // Extract from sections
    pageData.sections.forEach(section => {
      if (section.components) {
        section.components.forEach(comp => {
          // Track component types
          if (comp.type) {
            components.add(comp.type);
          }

          // Track form references
          if (comp.formRef) {
            forms.push(comp.formRef);
          }

          // Track data bindings
          if (comp.dataBinding) {
            const binding = comp.dataBinding.split('.')[0];
            dataBindings.add(binding);
          }

          // Check for navigation actions in components
          if (comp.action && comp.action.type === 'navigate') {
            navCount++;
          }
          if (comp.events) {
            Object.values(comp.events).forEach(event => {
              if (event.type === 'navigate') navCount++;
            });
          }
          if (comp.config && comp.config.actions) {
            comp.config.actions.forEach(action => {
              if (action.type === 'navigate') navCount++;
            });
          }
        });
      }
    });

    return {
      components: Array.from(components),
      forms: [...new Set(forms)],
      dataBindings: Array.from(dataBindings),
      navCount
    };
  };

  const getComponentIcon = (type) => {
    switch (type) {
      case 'table':
        return Table;
      case 'form':
        return FormInput;
      case 'card':
        return CreditCard;
      case 'list':
        return Grid;
      default:
        return Layout;
    }
  };

  const getComponentColor = (type) => {
    const colors = {
      table: '#3b82f6',
      form: '#f59e0b',
      card: '#8b5cf6',
      list: '#10b981',
      button: '#ef4444',
      text: '#6b7280'
    };
    return colors[type] || '#6b7280';
  };

  const Icon = getPageIcon(data.type);
  const color = getPageColor(data.type);
  const { components, forms, dataBindings, navCount } = getComponentInfo();

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '8px',
        background: '#ffffff',
        border: selected ? `2px solid ${color}` : '2px solid #e5e7eb',
        minWidth: '240px',
        maxWidth: '280px',
        boxShadow: selected ? `0 4px 12px ${color}20` : '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s'
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: color,
          width: '10px',
          height: '10px',
          border: '2px solid #fff'
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon size={20} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
            {data.label}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>
            {data.type} Page
          </div>
        </div>
      </div>

      {data.route && (
        <div
          style={{
            fontSize: '11px',
            color: '#6b7280',
            fontFamily: 'monospace',
            background: '#f9fafb',
            padding: '4px 8px',
            borderRadius: '4px',
            marginTop: '8px'
          }}
        >
          {data.route}
        </div>
      )}

      {/* Component Types */}
      {components.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Components
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {components.slice(0, 4).map((comp, idx) => {
              const CompIcon = getComponentIcon(comp);
              const compColor = getComponentColor(comp);
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    background: `${compColor}10`,
                    border: `1px solid ${compColor}30`,
                    borderRadius: '4px',
                    fontSize: '10px',
                    color: compColor
                  }}
                >
                  <CompIcon size={10} />
                  {comp}
                </div>
              );
            })}
            {components.length > 4 && (
              <div style={{ fontSize: '10px', color: '#9ca3af', padding: '2px 4px' }}>
                +{components.length - 4}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Integrations */}
      {(forms.length > 0 || dataBindings.length > 0 || navCount > 0) && (
        <div style={{ marginTop: '10px', borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {forms.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: '#b45309'
                }}
                title={`Forms: ${forms.join(', ')}`}
              >
                <FormInput size={10} />
                {forms.length} form{forms.length !== 1 ? 's' : ''}
              </div>
            )}
            {dataBindings.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  background: '#dbeafe',
                  border: '1px solid #93c5fd',
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: '#1d4ed8'
                }}
                title={`Data: ${dataBindings.join(', ')}`}
              >
                <Database size={10} />
                {dataBindings.length} data
              </div>
            )}
            {navCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  background: '#dcfce7',
                  border: '1px solid #86efac',
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: '#166534'
                }}
                title={`${navCount} navigation link(s)`}
              >
                <Link2 size={10} />
                {navCount} nav
              </div>
            )}
          </div>
        </div>
      )}

      {data.platform && data.platform !== 'both' && (
        <div
          style={{
            fontSize: '10px',
            color: '#6b7280',
            marginTop: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {data.platform} only
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: color,
          width: '10px',
          height: '10px',
          border: '2px solid #fff'
        }}
      />
    </div>
  );
};

export default PageNode;
