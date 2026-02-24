/**
 * ComponentRenderer - Core JSON-to-React Native component mapper
 *
 * Interprets JSON screen definitions and renders them as React Native components.
 * Handles styles from both component.style and props.style (CrossPlatformExpert
 * puts styles in props.style).
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Switch,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Header, Card, FormInput, Button, Badge, ListItem } from './primitives';
import { Stack, Row, Section, Divider } from './layout';
import { parseStyle, mergeStyles } from '../utils/styleParser';

// ============================================================================
// Gradient helper - parses CSS linear-gradient into expo-linear-gradient props
// ============================================================================
function parseGradient(bg) {
  if (!bg || typeof bg !== 'string' || !bg.includes('linear-gradient')) return null;
  try {
    // linear-gradient(225deg, #2fdaff 0%, #0e33f3 100%)
    const inner = bg.match(/linear-gradient\((.+)\)/)?.[1];
    if (!inner) return null;
    const parts = inner.split(',').map(s => s.trim());
    let angle = 180;
    let colorStrs = parts;
    if (parts[0].includes('deg')) {
      angle = parseFloat(parts[0]);
      colorStrs = parts.slice(1);
    }
    const colors = colorStrs.map(s => s.split(/\s+/)[0]).filter(c => c.startsWith('#') || c.startsWith('rgb'));
    if (colors.length < 2) return null;
    // Convert CSS angle to start/end points
    const rad = ((angle - 90) * Math.PI) / 180;
    const start = { x: 0.5 - Math.cos(rad) * 0.5, y: 0.5 - Math.sin(rad) * 0.5 };
    const end = { x: 0.5 + Math.cos(rad) * 0.5, y: 0.5 + Math.sin(rad) * 0.5 };
    return { colors, start, end };
  } catch {
    return null;
  }
}

// ============================================================================
// GradientWrapper - wraps children in LinearGradient if background is a gradient
// ============================================================================
const GradientWrapper = ({ style, children }) => {
  const bg = style?.background || style?.backgroundColor;
  const gradient = parseGradient(bg);
  if (!gradient) return null;

  // Remove the gradient background from the style passed to the View
  const cleanStyle = { ...style };
  delete cleanStyle.background;
  delete cleanStyle.backgroundColor;

  return (
    <LinearGradient
      colors={gradient.colors}
      start={gradient.start}
      end={gradient.end}
      style={cleanStyle}
    >
      {children}
    </LinearGradient>
  );
};

// ============================================================================
// Smart View - renders as LinearGradient if bg is a gradient, else plain View
// ============================================================================
const SmartView = ({ style, children, ...rest }) => {
  const bg = style?.background || style?.backgroundColor;
  const gradient = parseGradient(bg);
  if (gradient) {
    const cleanStyle = { ...style };
    delete cleanStyle.background;
    delete cleanStyle.backgroundColor;
    return (
      <LinearGradient
        colors={gradient.colors}
        start={gradient.start}
        end={gradient.end}
        style={cleanStyle}
      >
        {children}
      </LinearGradient>
    );
  }
  // Convert 'background' to 'backgroundColor' for RN
  const rnStyle = style ? { ...style } : {};
  if (rnStyle.background && !rnStyle.backgroundColor) {
    rnStyle.backgroundColor = rnStyle.background;
    delete rnStyle.background;
  }
  return <View style={rnStyle} {...rest}>{children}</View>;
};

// ============================================================================
// Display Components
// ============================================================================

const TextComponent = ({ props = {}, style, children }) => {
  const text = props.text || props.children || props.title || children || '';
  // Merge component-level style with props.style
  const textStyle = [
    { fontSize: 14, color: '#374151' },
    props.bold && { fontWeight: '600' },
    props.color && { color: props.color },
    props.size && { fontSize: props.size },
    style,
  ];
  return <Text style={textStyle}>{text}</Text>;
};

const HeadingComponent = ({ props = {}, style, children }) => {
  const text = props.text || props.title || props.children || children || '';
  const level = props.level || props.variant === 'h1' ? 1 : props.variant === 'h3' ? 3 : 2;
  const fontSize = { 1: 32, 2: 24, 3: 20, 4: 18, 5: 16, 6: 14 }[level] || 24;
  return (
    <Text style={[{ fontWeight: '700', color: '#111827', marginVertical: 8, fontSize }, style]}>
      {text}
    </Text>
  );
};

const LabelComponent = ({ props = {}, style, children }) => {
  const text = props.text || props.label || props.children || children || '';
  return <Text style={[{ fontSize: 14, color: '#6b7280' }, style]}>{text}</Text>;
};

const ImageComponent = ({ props = {}, style }) => {
  const source = props.source || props.uri || props.src;
  const width = typeof props.width === 'string' ? parseInt(props.width) || '100%' : (props.width || '100%');
  const height = typeof props.height === 'string' ? parseInt(props.height) || 200 : (props.height || 200);

  if (!source) {
    // Render a styled placeholder for illustrations
    const bg = style?.background || style?.backgroundColor || '#f3f4f6';
    const gradient = parseGradient(bg);
    const placeholderStyle = {
      width,
      height,
      borderRadius: style?.borderRadius || 16,
      alignItems: 'center',
      justifyContent: 'center',
      margin: style?.margin,
      alignSelf: style?.margin === '0 auto' ? 'center' : undefined,
    };

    if (gradient) {
      return (
        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={placeholderStyle}
        >
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600', opacity: 0.8 }}>
            {props.alt || props.variant || ''}
          </Text>
        </LinearGradient>
      );
    }

    return (
      <View style={[placeholderStyle, { backgroundColor: bg }]}>
        <Text style={{ color: '#9ca3af', fontSize: 14 }}>{props.alt || 'Image'}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: source }}
      style={[{ width, height, borderRadius: 8 }, style]}
      resizeMode={props.resizeMode || 'cover'}
    />
  );
};

// Illustration component - renders a gradient placeholder with label
const IllustrationComponent = ({ props = {}, style }) => {
  const width = parseInt(props.width) || 320;
  const height = parseInt(props.height) || 280;
  const variant = props.variant || '';
  const bg = style?.background || 'linear-gradient(225deg, #2fdaff 0%, #0e33f3 100%)';
  const gradient = parseGradient(bg);
  const containerStyle = {
    width,
    height,
    borderRadius: style?.borderRadius || 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  };

  if (gradient) {
    return (
      <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={containerStyle}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' }}>
          {variant.replace(/-/g, ' ')}
        </Text>
      </LinearGradient>
    );
  }
  return (
    <View style={[containerStyle, { backgroundColor: bg }]}>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>{variant.replace(/-/g, ' ')}</Text>
    </View>
  );
};

// Indicator component - carousel dot
const IndicatorComponent = ({ props = {}, style }) => {
  const active = props.active;
  const bg = style?.background;
  const gradient = active ? parseGradient(bg) : null;
  const dotStyle = {
    width: parseInt(style?.width) || (active ? 24 : 8),
    height: parseInt(style?.height) || 8,
    borderRadius: parseInt(style?.borderRadius) || 4,
    marginHorizontal: 3,
  };

  if (gradient) {
    return <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={dotStyle} />;
  }
  return <View style={[dotStyle, { backgroundColor: bg || (active ? '#3b82f6' : '#d1d5db') }]} />;
};

// Progress bar component
const ProgressBarComponent = ({ props = {}, style }) => {
  const progress = props.progress || props.value || 0.5;
  const color = props.color || '#3b82f6';
  const trackColor = props.trackColor || '#e5e7eb';
  const height = style?.height || 8;
  const borderRadius = style?.borderRadius || 4;

  return (
    <View style={[{ height, borderRadius, backgroundColor: trackColor, overflow: 'hidden' }, style]}>
      <View style={{ width: `${progress * 100}%`, height, borderRadius, backgroundColor: color }} />
    </View>
  );
};

// ============================================================================
// Input Components
// ============================================================================

const TextAreaInput = (allProps) => (
  <FormInput {...allProps} multiline numberOfLines={4} />
);

const SwitchComponent = ({ props = {}, style, onAction }) => {
  const [value, setValue] = React.useState(props.value || false);
  const label = props.label || props.title;
  const handleChange = (v) => {
    setValue(v);
    if (onAction && props.name) onAction({ type: 'fieldChange', field: props.name, value: v });
  };
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }, style]}>
      {label && <Text style={{ fontSize: 14, color: '#374151' }}>{label}</Text>}
      <Switch value={value} onValueChange={handleChange} trackColor={{ false: '#d1d5db', true: '#93c5fd' }} thumbColor={value ? '#3b82f6' : '#f4f3f4'} />
    </View>
  );
};

const CheckboxComponent = ({ props = {}, style, onAction }) => {
  const [checked, setChecked] = React.useState(props.checked || props.value || false);
  const label = props.label || props.title || 'Option';
  const handleToggle = () => {
    const v = !checked;
    setChecked(v);
    if (onAction && props.name) onAction({ type: 'fieldChange', field: props.name, value: v });
  };
  return (
    <TouchableOpacity style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }, style]} onPress={handleToggle}>
      <View style={[{ width: 20, height: 20, borderWidth: 2, borderColor: '#d1d5db', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, checked && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}>
        {checked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>x</Text>}
      </View>
      <Text style={{ fontSize: 14, color: '#374151' }}>{label}</Text>
    </TouchableOpacity>
  );
};

const SearchBar = ({ props = {}, style, onAction }) => {
  const [value, setValue] = React.useState(props.value || '');
  const placeholder = props.placeholder || 'Search...';
  const handleChange = (text) => {
    setValue(text);
    if (onAction) onAction({ type: 'search', query: text });
  };
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }, style]}>
      <TextInput style={{ flex: 1, fontSize: 14, color: '#111827', padding: 0 }} placeholder={placeholder} placeholderTextColor="#9ca3af" value={value} onChangeText={handleChange} />
    </View>
  );
};

const PickerComponent = ({ props = {}, style }) => {
  const placeholder = props.placeholder || 'Select an option...';
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14 }, style]}>
      <Text style={{ fontSize: 14, color: '#9ca3af' }}>{placeholder}</Text>
      <Text style={{ color: '#6b7280', fontSize: 12 }}>v</Text>
    </View>
  );
};

// ============================================================================
// Action Components
// ============================================================================

const FAB = ({ props = {}, style, onAction }) => {
  const icon = props.icon || '+';
  return (
    <TouchableOpacity
      style={[{ position: 'absolute', right: 16, bottom: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }, style]}
      onPress={() => onAction && props.action && onAction(props.action)}
    >
      <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '300' }}>{icon}</Text>
    </TouchableOpacity>
  );
};

const IconButton = ({ props = {}, style, onAction }) => {
  const icon = props.icon || '...';
  return (
    <TouchableOpacity
      style={[{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }, style]}
      onPress={() => onAction && props.action && onAction(props.action)}
    >
      <Text style={{ color: '#374151', fontSize: 16 }}>{icon}</Text>
    </TouchableOpacity>
  );
};

// ============================================================================
// Touchable component - handles the generated touchableopacity type
// Uses LinearGradient when background is a gradient string
// ============================================================================
const TouchableComponent = ({ props = {}, style, children, onAction }) => {
  const handlePress = () => {
    if (onAction && props.action) onAction(props.action);
    if (onAction && props.onPress) onAction(props.onPress);
  };

  const bg = style?.background || style?.backgroundColor;
  const gradient = parseGradient(bg);

  if (gradient) {
    const cleanStyle = { ...style };
    delete cleanStyle.background;
    delete cleanStyle.backgroundColor;
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <LinearGradient colors={gradient.colors} start={gradient.start} end={gradient.end} style={cleanStyle}>
          {children}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Convert 'background' to 'backgroundColor' for RN
  const rnStyle = style ? { ...style } : {};
  if (rnStyle.background && !rnStyle.backgroundColor) {
    rnStyle.backgroundColor = rnStyle.background;
    delete rnStyle.background;
  }

  return (
    <TouchableOpacity style={rnStyle} onPress={handlePress} activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
};

// List component using FlatList
const ListComponent = ({ props = {}, style, children, onAction }) => {
  const data = props.data || props.items || [];
  if (data.length === 0 && React.Children.count(children) > 0) {
    return <View style={style}>{children}</View>;
  }
  return (
    <FlatList
      data={data}
      style={style}
      keyExtractor={(item, index) => item.id || String(index)}
      renderItem={({ item }) => (
        <ListItem
          title={item.title || item.name}
          subtitle={item.subtitle || item.description}
          onPress={() => onAction && onAction({ type: 'listItemPress', item })}
        />
      )}
    />
  );
};

// ============================================================================
// Icon Component - renders Ionicons from @expo/vector-icons
// ============================================================================
const IconComponent = ({ props = {}, style }) => {
  const name = props.name || 'ellipse-outline';
  const size = props.size || 24;
  const color = props.color || '#374151';
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
};

// ============================================================================
// Component Registry
// ============================================================================
const COMPONENT_MAP = {
  // Layout containers
  'view': SmartView,
  'container': SmartView,
  'stack': Stack,
  'row': Row,
  'section': Section,
  'card': Card,
  'screen': ScrollView,

  // Redundant wrappers (DynamicScreen already provides these)
  // Render as passthrough Views so children still display
  'safeareaview': View,
  'scrollview': 'scrollview', // special-cased below

  // Display components
  'header': Header,
  'heading': HeadingComponent,
  'text': TextComponent,
  'label': LabelComponent,
  'badge': Badge,
  'image': ImageComponent,
  'illustration': IllustrationComponent,
  'indicator': IndicatorComponent,
  'progress': ProgressBarComponent,
  'progressbar': ProgressBarComponent,
  'divider': Divider,

  // Input components
  'textinput': FormInput,
  'input': FormInput,
  'textarea': TextAreaInput,
  'picker': PickerComponent,
  'dropdown': PickerComponent,
  'select': PickerComponent,
  'switch': SwitchComponent,
  'checkbox': CheckboxComponent,
  'searchbar': SearchBar,
  'search': SearchBar,

  // Icon component
  'icon': IconComponent,

  // Action components
  'button': Button,
  'touchableopacity': TouchableComponent,
  'pressable': TouchableComponent,
  'iconbutton': IconButton,
  'fab': FAB,
  'link': TouchableComponent,

  // List components
  'list': ListComponent,
  'listitem': ListItem,
  'flatlist': ListComponent,

  // Loading
  'activityindicator': ActivityIndicator,
  'spinner': ActivityIndicator,
  'loading': ActivityIndicator,

  // Gradient container
  'lineargradient': 'lineargradient', // special-cased below
};

// ============================================================================
// Error Boundary
// ============================================================================

const ComponentErrorFallback = ({ type, error }) => (
  <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginVertical: 4 }}>
    <Text style={{ color: '#991b1b', fontSize: 13, fontWeight: '500' }}>
      Failed to render {type || 'component'}
    </Text>
    {__DEV__ && error && (
      <Text style={{ color: '#b91c1c', fontSize: 11, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
        {String(error).slice(0, 120)}
      </Text>
    )}
  </View>
);

class SafeComponentWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error) {
    console.warn(`[ComponentRenderer] Render error in "${this.props.componentType}":`, error.message);
  }
  render() {
    if (this.state.hasError) {
      return <ComponentErrorFallback type={this.props.componentType} error={this.state.error} />;
    }
    return this.props.children;
  }
}

// ============================================================================
// Resolve final style: merges component.style + component.layout + props.style
// props.style takes priority (CrossPlatformExpert puts actual styles there)
// ============================================================================
function resolveStyle(componentStyle, componentLayout, propsStyle) {
  const base = mergeStyles(parseStyle(componentStyle), parseStyle(componentLayout));
  // props.style is already in RN format (numbers, not px strings) from CrossPlatformExpert
  if (propsStyle && typeof propsStyle === 'object') {
    return mergeStyles(base, propsStyle);
  }
  return base;
}

// Strip CSS-only properties that crash React Native
// IMPORTANT: preserve 'background' when it's a gradient string -- SmartView/TouchableComponent parse it
function sanitizeRNStyle(style) {
  if (!style || typeof style !== 'object') return style;
  const clean = { ...style };
  // Remove CSS-only properties
  delete clean.boxShadow;
  delete clean.transition;
  delete clean.cursor;
  delete clean.textDecoration;
  // Handle 'background' property:
  // - If it's a gradient string, KEEP it (SmartView/TouchableComponent will parse and render it)
  // - If it's a simple color, convert to backgroundColor
  // - Otherwise delete it
  if (style.background && typeof style.background === 'string') {
    if (style.background.includes('gradient')) {
      // Keep as-is for gradient components to parse
    } else {
      // Simple color string -> convert to backgroundColor
      clean.backgroundColor = style.background;
      delete clean.background;
    }
  } else {
    delete clean.background;
  }
  // borderRadius: "50%" -> large number for circle
  if (clean.borderRadius === '50%') clean.borderRadius = 999;
  // Convert string px values
  for (const key of Object.keys(clean)) {
    if (typeof clean[key] === 'string' && clean[key].endsWith('px')) {
      clean[key] = parseInt(clean[key], 10);
    }
  }
  return clean;
}

// ============================================================================
// Main ComponentRenderer
// ============================================================================
export const ComponentRenderer = ({ component, onAction, formData = {} }) => {
  if (!component) return null;
  if (typeof component !== 'object') return null;

  const {
    type,
    props = {},
    children = [],
    style = {},
    layout = {},
    config = {},
  } = component;

  if (!type) {
    if (children && children.length > 0) {
      return (
        <View>
          {children.map((child, idx) => (
            <ComponentRenderer key={idx} component={child} onAction={onAction} formData={formData} />
          ))}
        </View>
      );
    }
    return null;
  }

  const componentType = type.toLowerCase();

  // Resolve the final style: component.style + component.layout + props.style + config styling
  let finalStyle = resolveStyle(style, layout, props.style);
  // Also merge config.styling if it exists (pages.json format)
  if (component.styling) {
    finalStyle = mergeStyles(finalStyle, parseStyle(component.styling));
  }
  finalStyle = sanitizeRNStyle(finalStyle);

  // Also support config-based props (pages.json uses config instead of props)
  const mergedProps = { ...config, ...props };

  // Check for gradient background
  const hasBgGradient = finalStyle?.background && typeof finalStyle.background === 'string' && finalStyle.background.includes('gradient');

  // Build children
  const childArray = Array.isArray(children) ? children : [];
  // Also check config.children and component.components (pages.json sections have components array)
  const allChildren = [
    ...childArray,
    ...(Array.isArray(config.children) ? config.children : []),
    ...(Array.isArray(component.components) ? component.components : []),
  ];

  const renderedChildren = allChildren.map((child, idx) => (
    <ComponentRenderer key={child?.id || idx} component={child} onAction={onAction} formData={formData} />
  ));

  // Get component from registry
  const Component = COMPONENT_MAP[componentType];

  // Special case: scrollview - render as ScrollView with contentContainerStyle
  if (componentType === 'scrollview' || componentType === 'screen') {
    const containerStyle = mergedProps.contentContainerStyle || finalStyle;
    return (
      <SafeComponentWrapper componentType={type}>
        <ScrollView contentContainerStyle={sanitizeRNStyle(containerStyle)} showsVerticalScrollIndicator={false}>
          {renderedChildren}
        </ScrollView>
      </SafeComponentWrapper>
    );
  }

  // Special case: lineargradient
  if (componentType === 'lineargradient') {
    const colors = mergedProps.colors || ['#2fdaff', '#0e33f3'];
    const start = mergedProps.start || { x: 0, y: 0 };
    const end = mergedProps.end || { x: 1, y: 1 };
    return (
      <SafeComponentWrapper componentType={type}>
        <LinearGradient colors={colors} start={start} end={end} style={finalStyle}>
          {renderedChildren}
        </LinearGradient>
      </SafeComponentWrapper>
    );
  }

  // If no mapping found, render as SmartView with children
  if (!Component) {
    if (allChildren.length > 0 || renderedChildren.length > 0) {
      return (
        <SafeComponentWrapper componentType={type}>
          <SmartView style={finalStyle}>
            {renderedChildren}
          </SmartView>
        </SafeComponentWrapper>
      );
    }
    return null;
  }

  // Build final component props
  const componentProps = {
    ...mergedProps,
    style: finalStyle,
    props: mergedProps,
    onAction,
  };

  // For input components, inject current form value
  if (['textinput', 'input', 'textarea'].includes(componentType)) {
    if (mergedProps.name && formData[mergedProps.name] !== undefined) {
      componentProps.value = formData[mergedProps.name];
    }
  }

  return (
    <SafeComponentWrapper componentType={type}>
      <Component {...componentProps}>
        {renderedChildren.length > 0 ? renderedChildren : null}
      </Component>
    </SafeComponentWrapper>
  );
};

export default ComponentRenderer;
