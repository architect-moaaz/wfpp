import React, { useEffect, useState, useCallback } from 'react';
import { useSimulator } from './SimulatorContext';
import { submitForm, fetchModelData, executeWorkflowAction } from './SimulatorApiClient';

// Convert React Native style object to web CSS
function toWebStyle(s) {
  if (!s || typeof s !== 'object') return {};
  const web = { ...s };
  if (web.marginVertical !== undefined) {
    web.marginTop = web.marginVertical;
    web.marginBottom = web.marginVertical;
    delete web.marginVertical;
  }
  if (web.marginHorizontal !== undefined) {
    web.marginLeft = web.marginHorizontal;
    web.marginRight = web.marginHorizontal;
    delete web.marginHorizontal;
  }
  if (web.paddingVertical !== undefined) {
    web.paddingTop = web.paddingVertical;
    web.paddingBottom = web.paddingVertical;
    delete web.paddingVertical;
  }
  if (web.paddingHorizontal !== undefined) {
    web.paddingLeft = web.paddingHorizontal;
    web.paddingRight = web.paddingHorizontal;
    delete web.paddingHorizontal;
  }
  // Shadow conversion
  if (web.shadowColor) {
    const opacity = web.shadowOpacity || 0.2;
    const ox = web.shadowOffset?.width || 0;
    const oy = web.shadowOffset?.height || 2;
    const r = web.shadowRadius || 4;
    web.boxShadow = `${ox}px ${oy}px ${r}px rgba(0,0,0,${opacity})`;
    delete web.shadowColor;
    delete web.shadowOpacity;
    delete web.shadowOffset;
    delete web.shadowRadius;
    delete web.elevation;
  }
  return web;
}

const SimulatorComponentRenderer = ({ component, screenId, appId, depth = 0 }) => {
  if (!component) return null;

  const { type, props = {}, children = [] } = component;
  const text = component.text || props.text || props.title || props.label || '';
  const rnStyle = { ...(component.style || {}), ...(props.style || {}) };
  const webStyle = toWebStyle(rnStyle);
  const typeLower = (type || '').toLowerCase();

  const renderChildren = (childArr) => {
    if (!childArr || childArr.length === 0) return null;
    return childArr.map((child, idx) => (
      <SimulatorComponentRenderer
        key={child.id || idx}
        component={child}
        screenId={screenId}
        appId={appId}
        depth={depth + 1}
      />
    ));
  };

  switch (typeLower) {
    case 'safeareaview':
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {renderChildren(children)}
        </div>
      );

    case 'scrollview':
      return (
        <div style={{ flex: 1, overflowY: 'auto', ...webStyle }}>
          {renderChildren(children)}
        </div>
      );

    case 'view':
    case 'stack':
    case 'row':
    case 'section':
    case 'card':
      return (
        <div style={{ ...webStyle, boxSizing: 'border-box' }}>
          {renderChildren(children)}
        </div>
      );

    case 'text':
    case 'label':
    case 'heading':
    case 'header':
      return <TextComponent text={text} webStyle={webStyle} children={children} screenId={screenId} appId={appId} depth={depth} />;

    case 'textinput':
    case 'input':
    case 'textarea':
      return <TextInputComponent component={component} webStyle={webStyle} screenId={screenId} />;

    case 'touchableopacity':
    case 'touchablehighlight':
    case 'pressable':
      return <TouchableComponent component={component} webStyle={webStyle} screenId={screenId} appId={appId} depth={depth} />;

    case 'button':
    case 'iconbutton':
    case 'fab':
      return <ButtonComponent component={component} webStyle={webStyle} screenId={screenId} appId={appId} />;

    case 'switch':
      return <SwitchComponent component={component} webStyle={webStyle} screenId={screenId} />;

    case 'picker':
    case 'dropdown':
      return <PickerComponent component={component} webStyle={webStyle} screenId={screenId} />;

    case 'checkbox':
      return <CheckboxComponent component={component} webStyle={webStyle} screenId={screenId} />;

    case 'flatlist':
    case 'list':
    case 'sectionlist':
      return <FlatListComponent component={component} webStyle={webStyle} screenId={screenId} appId={appId} depth={depth} />;

    case 'image':
      return (
        <div style={{
          width: webStyle.width || '100%',
          height: webStyle.height || 120,
          backgroundColor: '#f3f4f6',
          borderRadius: webStyle.borderRadius || 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: 13,
          ...webStyle,
        }}>
          {props.source?.uri ? (
            <img src={props.source.uri} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: webStyle.borderRadius || 8 }} />
          ) : 'Image'}
        </div>
      );

    case 'activityindicator':
    case 'spinner':
    case 'loading':
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16, ...webStyle }}>
          <div className="sim-spinner" />
        </div>
      );

    case 'divider':
      return <div style={{ height: 1, backgroundColor: '#e5e7eb', margin: '8px 0', ...webStyle }} />;

    case 'badge':
      return (
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: '500',
          backgroundColor: webStyle.backgroundColor || '#e0e7ff',
          color: webStyle.color || '#3730a3',
          ...webStyle,
        }}>
          {text}
        </span>
      );

    case 'searchbar':
      return <SearchBarComponent component={component} webStyle={webStyle} screenId={screenId} />;

    case 'modal':
      return (
        <div style={{
          padding: 16,
          backgroundColor: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          margin: '8px 0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          ...webStyle,
        }}>
          {renderChildren(children)}
        </div>
      );

    case 'navigationbar':
    case 'tabbar':
      // Handled by SimulatorTabBar, skip rendering inline
      return null;

    default:
      if (children && children.length > 0) {
        return <div style={{ ...webStyle, boxSizing: 'border-box' }}>{renderChildren(children)}</div>;
      }
      if (text) {
        return <div style={{ fontSize: 14, color: '#374151', ...webStyle }}>{text}</div>;
      }
      return null;
  }
};

// --- Sub-components ---

function TextComponent({ text, webStyle, children, screenId, appId, depth }) {
  const fontSize = webStyle.fontSize || 14;
  const isHeading = fontSize >= 20 || webStyle.fontWeight === 'bold' || webStyle.fontWeight === '700';
  return (
    <div style={{
      margin: isHeading ? '4px 0 2px' : '2px 0',
      fontSize,
      fontWeight: webStyle.fontWeight || '400',
      color: webStyle.color || '#111827',
      textAlign: webStyle.textAlign || 'left',
      ...webStyle,
    }}>
      {text || (children && children.length > 0 ? children.map((child, idx) => (
        <SimulatorComponentRenderer
          key={child.id || idx}
          component={child}
          screenId={screenId}
          appId={appId}
          depth={depth + 1}
        />
      )) : null)}
    </div>
  );
}

function TextInputComponent({ component, webStyle, screenId }) {
  const { props = {} } = component;
  const { setFormField, formData } = useSimulator();
  const fieldKey = props.name || props.field || props.placeholder || 'input';
  const currentValue = (formData[screenId] || {})[fieldKey] || '';
  const placeholder = props.placeholder || component.text || props.text || 'Enter text...';
  const isMultiline = props.multiline || (props.numberOfLines && props.numberOfLines > 1);

  const handleChange = (e) => {
    setFormField(screenId, fieldKey, e.target.value);
  };

  const baseStyle = {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: webStyle.borderRadius || 8,
    fontSize: 14,
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.15s',
    backgroundColor: '#fff',
    ...webStyle,
    borderColor: webStyle.borderColor || '#d1d5db',
    borderWidth: undefined,
    borderStyle: 'solid',
  };

  if (isMultiline) {
    return (
      <textarea
        placeholder={placeholder}
        value={currentValue}
        onChange={handleChange}
        rows={props.numberOfLines || 3}
        style={{ ...baseStyle, resize: 'vertical' }}
        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
        onBlur={(e) => { e.target.style.borderColor = webStyle.borderColor || '#d1d5db'; }}
      />
    );
  }

  return (
    <input
      type={props.secureTextEntry ? 'password' : props.keyboardType === 'email-address' ? 'email' : props.keyboardType === 'numeric' ? 'number' : 'text'}
      placeholder={placeholder}
      value={currentValue}
      onChange={handleChange}
      style={baseStyle}
      onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; }}
      onBlur={(e) => { e.target.style.borderColor = webStyle.borderColor || '#d1d5db'; }}
    />
  );
}

function TouchableComponent({ component, webStyle, screenId, appId, depth }) {
  const { props = {}, children = [] } = component;
  const [pressed, setPressed] = useState(false);
  const { pushScreen, popScreen, findScreenIndex, showToast, formData, clearFormData, setLoading } = useSimulator();

  const handlePress = useCallback(async () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);

    const action = props.onPress || props.action;
    if (!action) return;

    await handleAction(action, {
      pushScreen, popScreen, findScreenIndex, showToast,
      formData, clearFormData, setLoading, screenId, appId,
    });
  }, [props.onPress, props.action, pushScreen, popScreen, findScreenIndex, showToast, formData, clearFormData, setLoading, screenId, appId]);

  // Detect button-like touchable
  const childTexts = (children || []).filter(c => (c.type || '').toLowerCase() === 'text');
  const btnText = childTexts.length === 1 ? (childTexts[0].text || childTexts[0].props?.title || childTexts[0].props?.text || '') : '';
  const bgColor = webStyle.backgroundColor;
  const isButton = btnText && (bgColor || webStyle.borderRadius);

  if (isButton) {
    const textStyle = childTexts[0]?.props?.style ? toWebStyle(childTexts[0].props.style) : {};
    return (
      <button
        onClick={handlePress}
        style={{
          padding: webStyle.padding || '12px 24px',
          backgroundColor: bgColor || '#3b82f6',
          color: textStyle.color || (bgColor ? '#ffffff' : '#374151'),
          border: bgColor ? 'none' : '1px solid #d1d5db',
          borderRadius: webStyle.borderRadius || 8,
          fontSize: textStyle.fontSize || 14,
          fontWeight: textStyle.fontWeight || '500',
          cursor: 'pointer',
          width: webStyle.flex ? '100%' : undefined,
          textAlign: textStyle.textAlign || 'center',
          opacity: pressed ? 0.7 : 1,
          transition: 'opacity 0.15s, transform 0.1s',
          transform: pressed ? 'scale(0.97)' : 'scale(1)',
          ...webStyle,
          flex: undefined,
        }}
      >
        {btnText}
      </button>
    );
  }

  return (
    <div
      onClick={handlePress}
      style={{
        cursor: 'pointer',
        ...webStyle,
        boxSizing: 'border-box',
        opacity: pressed ? 0.7 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      {children.map((child, idx) => (
        <SimulatorComponentRenderer
          key={child.id || idx}
          component={child}
          screenId={screenId}
          appId={appId}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

function ButtonComponent({ component, webStyle, screenId, appId }) {
  const { props = {} } = component;
  const text = component.text || props.text || props.title || props.label || 'Button';
  const [pressed, setPressed] = useState(false);
  const { pushScreen, popScreen, findScreenIndex, showToast, formData, clearFormData, setLoading } = useSimulator();

  const handlePress = useCallback(async () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 150);

    const action = props.onPress || props.action;
    if (!action) return;

    await handleAction(action, {
      pushScreen, popScreen, findScreenIndex, showToast,
      formData, clearFormData, setLoading, screenId, appId,
    });
  }, [props.onPress, props.action, pushScreen, popScreen, findScreenIndex, showToast, formData, clearFormData, setLoading, screenId, appId]);

  return (
    <button
      onClick={handlePress}
      style={{
        padding: '12px 24px',
        backgroundColor: props.color || webStyle.backgroundColor || '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: '500',
        cursor: 'pointer',
        width: '100%',
        opacity: pressed ? 0.7 : 1,
        transition: 'opacity 0.15s, transform 0.1s',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        ...webStyle,
      }}
    >
      {text}
    </button>
  );
}

function SwitchComponent({ component, webStyle, screenId }) {
  const { props = {} } = component;
  const { setFormField, formData } = useSimulator();
  const fieldKey = props.name || props.field || 'switch';
  const isOn = (formData[screenId] || {})[fieldKey] ?? (props.value || false);

  const toggle = () => {
    setFormField(screenId, fieldKey, !isOn);
  };

  return (
    <div
      onClick={toggle}
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', ...webStyle }}
    >
      {props.label && <span style={{ fontSize: 14, color: '#374151' }}>{props.label}</span>}
      <div style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: isOn ? '#3b82f6' : '#d1d5db',
        position: 'relative',
        transition: 'background-color 0.2s',
        flexShrink: 0,
      }}>
        <div style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#fff',
          position: 'absolute',
          top: 2,
          left: isOn ? 22 : 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}

function PickerComponent({ component, webStyle, screenId }) {
  const { props = {} } = component;
  const { setFormField, formData } = useSimulator();
  const fieldKey = props.name || props.field || 'picker';
  const currentValue = (formData[screenId] || {})[fieldKey] || props.selectedValue || '';
  const items = props.items || props.options || [];

  return (
    <select
      value={currentValue}
      onChange={(e) => setFormField(screenId, fieldKey, e.target.value)}
      style={{
        padding: '10px 14px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        fontSize: 14,
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#fff',
        outline: 'none',
        cursor: 'pointer',
        ...webStyle,
      }}
    >
      <option value="">{props.placeholder || 'Select...'}</option>
      {items.map((item, i) => {
        const val = typeof item === 'string' ? item : (item.value || item.id || '');
        const label = typeof item === 'string' ? item : (item.label || item.name || val);
        return <option key={i} value={val}>{label}</option>;
      })}
    </select>
  );
}

function CheckboxComponent({ component, webStyle, screenId }) {
  const { props = {} } = component;
  const { setFormField, formData } = useSimulator();
  const fieldKey = props.name || props.field || 'checkbox';
  const checked = (formData[screenId] || {})[fieldKey] ?? (props.checked || false);

  return (
    <label
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#374151', ...webStyle }}
      onClick={() => setFormField(screenId, fieldKey, !checked)}
    >
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        border: checked ? 'none' : '2px solid #d1d5db',
        backgroundColor: checked ? '#3b82f6' : '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}>
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      {props.label && <span>{props.label}</span>}
    </label>
  );
}

function FlatListComponent({ component, webStyle, screenId, appId, depth }) {
  const { props = {} } = component;
  const { setFetchedData, fetchedData, showToast } = useSimulator();
  const modelId = props.dataSource || props.modelId;
  const [localData, setLocalData] = useState(props.data || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (modelId && appId) {
      setLoading(true);
      fetchModelData(appId, modelId)
        .then((result) => {
          const data = result.data || result.items || result || [];
          setLocalData(Array.isArray(data) ? data : []);
          setFetchedData(modelId, data, result.pagination || null);
        })
        .catch((err) => {
          console.error('[FlatList] Fetch error:', err);
          showToast('Failed to load data', 'error');
        })
        .finally(() => setLoading(false));
    }
  }, [modelId, appId]);

  const items = localData.length > 0 ? localData : props.data || [];
  const displayItems = items.length > 0 ? items.slice(0, 20) : Array.from({ length: 3 }, (_, i) => ({ _placeholder: true, _index: i }));

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', ...webStyle }}>
        <div className="sim-spinner" style={{ margin: '0 auto' }} />
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>Loading data...</div>
      </div>
    );
  }

  return (
    <div style={{ ...webStyle, boxSizing: 'border-box' }}>
      {displayItems.map((item, i) => {
        if (item._placeholder) {
          return (
            <div key={i} style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: '#e8eaf0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: '#6b7280', flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: '#374151', fontWeight: '500' }}>Item {i + 1}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Tap to view details</div>
              </div>
              <div style={{ fontSize: 16, color: '#d1d5db' }}>{'\u203A'}</div>
            </div>
          );
        }

        // Render with renderItem template if available
        if (props.renderItem && typeof props.renderItem === 'object') {
          const templateComp = JSON.parse(JSON.stringify(props.renderItem));
          interpolateDataIntoComponent(templateComp, item);
          return (
            <div key={item.id || i} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <SimulatorComponentRenderer
                component={templateComp}
                screenId={screenId}
                appId={appId}
                depth={depth + 1}
              />
            </div>
          );
        }

        // Default list item rendering
        const title = item.title || item.name || item.label || `Item ${i + 1}`;
        const subtitle = item.description || item.subtitle || item.email || '';
        return (
          <div key={item.id || i} style={{
            padding: '14px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: '#e8eaf0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#6b7280', flexShrink: 0,
            }}>
              {(title[0] || '').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: '#374151', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </div>
              {subtitle && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subtitle}
                </div>
              )}
            </div>
            <div style={{ fontSize: 16, color: '#d1d5db' }}>{'\u203A'}</div>
          </div>
        );
      })}
    </div>
  );
}

function SearchBarComponent({ component, webStyle, screenId }) {
  const { props = {} } = component;
  const { setFormField, formData } = useSimulator();
  const fieldKey = props.name || 'search';
  const currentValue = (formData[screenId] || {})[fieldKey] || '';

  return (
    <div style={{ position: 'relative', ...webStyle }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        placeholder={props.placeholder || 'Search...'}
        value={currentValue}
        onChange={(e) => setFormField(screenId, fieldKey, e.target.value)}
        style={{
          padding: '10px 14px 10px 36px',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          fontSize: 14,
          width: '100%',
          boxSizing: 'border-box',
          backgroundColor: '#f9fafb',
          outline: 'none',
        }}
        onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.backgroundColor = '#fff'; }}
        onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.backgroundColor = '#f9fafb'; }}
      />
    </div>
  );
}

// --- Shared action handler ---

async function handleAction(action, ctx) {
  if (!action) return;
  const { pushScreen, popScreen, findScreenIndex, showToast, formData, clearFormData, setLoading, screenId, appId } = ctx;

  switch (action.type) {
    case 'navigate': {
      if (action.target) {
        const idx = findScreenIndex(action.target);
        if (idx >= 0) {
          pushScreen(idx, action.params);
        } else {
          console.warn('[Simulator] Screen not found:', action.target);
        }
      }
      break;
    }
    case 'goBack':
      popScreen();
      break;

    case 'submit': {
      const formId = action.formId;
      if (!formId || !appId) {
        showToast('No form ID specified', 'error');
        return;
      }
      setLoading(screenId, true);
      try {
        const data = formData[screenId] || {};
        await submitForm(appId, formId, data);
        showToast('Form submitted successfully', 'success');
        clearFormData(screenId);
        if (action.onSuccess?.navigate) {
          const idx = findScreenIndex(action.onSuccess.navigate);
          if (idx >= 0) pushScreen(idx);
        }
      } catch (err) {
        showToast(err.message || 'Failed to submit form', 'error');
      } finally {
        setLoading(screenId, false);
      }
      break;
    }

    case 'workflow': {
      if (!action.workflowId || !action.actionId || !appId) {
        showToast('Missing workflow configuration', 'error');
        return;
      }
      setLoading(screenId, true);
      try {
        const data = { ...(formData[screenId] || {}), ...(action.data || {}) };
        await executeWorkflowAction(appId, action.workflowId, action.actionId, data);
        showToast('Action executed', 'success');
        if (action.onSuccess) {
          await handleAction(action.onSuccess, ctx);
        }
      } catch (err) {
        showToast(err.message || 'Failed to execute action', 'error');
      } finally {
        setLoading(screenId, false);
      }
      break;
    }

    default:
      break;
  }
}

// Helper to interpolate data values into component template
function interpolateDataIntoComponent(comp, data) {
  if (!comp || !data) return;
  if (comp.text && typeof comp.text === 'string' && comp.text.includes('{{')) {
    comp.text = comp.text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
  }
  if (comp.props) {
    for (const key of Object.keys(comp.props)) {
      if (typeof comp.props[key] === 'string' && comp.props[key].includes('{{')) {
        comp.props[key] = comp.props[key].replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
      }
    }
  }
  if (comp.children) {
    comp.children.forEach((child) => interpolateDataIntoComponent(child, data));
  }
}

export default SimulatorComponentRenderer;
