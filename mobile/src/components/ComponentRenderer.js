/**
 * ComponentRenderer - Core JSON-to-React Native component mapper
 *
 * This component interprets JSON screen definitions from CrossPlatformExpert
 * and renders them as actual React Native components.
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
} from 'react-native';

// Import custom components
import { Header, Card, FormInput, Button, Badge, ListItem } from './primitives';
import { Stack, Row, Section, Divider } from './layout';
import { parseStyle, mergeStyles } from '../utils/styleParser';

/**
 * Text display component
 */
const TextComponent = ({ props = {}, style, children }) => {
  const text = props.text || props.children || props.title || children || '';
  const textStyle = [
    styles.text,
    props.bold && { fontWeight: '600' },
    props.color && { color: props.color },
    props.size && { fontSize: props.size },
    style,
  ];

  return <Text style={textStyle}>{text}</Text>;
};

/**
 * Heading component
 */
const HeadingComponent = ({ props = {}, style, children }) => {
  const text = props.text || props.title || props.children || children || 'Heading';
  const level = props.level || 2;
  const fontSize = { 1: 28, 2: 24, 3: 20, 4: 18, 5: 16, 6: 14 }[level] || 20;

  return (
    <Text style={[styles.heading, { fontSize }, style]}>
      {text}
    </Text>
  );
};

/**
 * Label component
 */
const LabelComponent = ({ props = {}, style, children }) => {
  const text = props.text || props.label || props.children || children || '';
  return <Text style={[styles.label, style]}>{text}</Text>;
};

/**
 * Image component with placeholder
 */
const ImageComponent = ({ props = {}, style }) => {
  const source = props.source || props.uri || props.src;
  const width = props.width || '100%';
  const height = props.height || 200;

  if (!source) {
    return (
      <View style={[styles.imagePlaceholder, { width, height }, style]}>
        <Text style={styles.imagePlaceholderText}>Image</Text>
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

/**
 * TextArea component (multiline input)
 */
const TextAreaInput = (props) => (
  <FormInput {...props} multiline numberOfLines={4} />
);

/**
 * Switch/Toggle component
 */
const SwitchComponent = ({ props = {}, style, onAction }) => {
  const [value, setValue] = React.useState(props.value || false);
  const label = props.label || props.title;

  const handleChange = (newValue) => {
    setValue(newValue);
    if (onAction && props.name) {
      onAction({ type: 'fieldChange', field: props.name, value: newValue });
    }
  };

  return (
    <View style={[styles.switchContainer, style]}>
      {label && <Text style={styles.switchLabel}>{label}</Text>}
      <Switch
        value={value}
        onValueChange={handleChange}
        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
        thumbColor={value ? '#3b82f6' : '#f4f3f4'}
      />
    </View>
  );
};

/**
 * Checkbox component
 */
const CheckboxComponent = ({ props = {}, style, onAction }) => {
  const [checked, setChecked] = React.useState(props.checked || props.value || false);
  const label = props.label || props.title || 'Option';

  const handleToggle = () => {
    const newValue = !checked;
    setChecked(newValue);
    if (onAction && props.name) {
      onAction({ type: 'fieldChange', field: props.name, value: newValue });
    }
  };

  return (
    <TouchableOpacity style={[styles.checkboxContainer, style]} onPress={handleToggle}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>x</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

/**
 * Search bar component
 */
const SearchBar = ({ props = {}, style, onAction }) => {
  const [value, setValue] = React.useState(props.value || '');
  const placeholder = props.placeholder || 'Search...';

  const handleChange = (text) => {
    setValue(text);
    if (onAction && props.name) {
      onAction({ type: 'search', query: text });
    }
  };

  return (
    <View style={[styles.searchContainer, style]}>
      <Text style={styles.searchIcon}>O</Text>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        value={value}
        onChangeText={handleChange}
      />
    </View>
  );
};

/**
 * FAB (Floating Action Button) component
 */
const FAB = ({ props = {}, style, onAction }) => {
  const icon = props.icon || '+';

  const handlePress = () => {
    if (onAction && props.action) {
      onAction(props.action);
    }
  };

  return (
    <TouchableOpacity style={[styles.fab, style]} onPress={handlePress}>
      <Text style={styles.fabIcon}>{icon}</Text>
    </TouchableOpacity>
  );
};

/**
 * Icon Button component
 */
const IconButton = ({ props = {}, style, onAction }) => {
  const icon = props.icon || '...';

  const handlePress = () => {
    if (onAction && props.action) {
      onAction(props.action);
    }
  };

  return (
    <TouchableOpacity style={[styles.iconButton, style]} onPress={handlePress}>
      <Text style={styles.iconButtonText}>{icon}</Text>
    </TouchableOpacity>
  );
};

/**
 * List component using FlatList
 */
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

/**
 * Picker/Dropdown placeholder (requires native module)
 */
const PickerComponent = ({ props = {}, style }) => {
  const placeholder = props.placeholder || 'Select an option...';
  const options = props.options || [];

  return (
    <View style={[styles.picker, style]}>
      <Text style={styles.pickerText}>{placeholder}</Text>
      <Text style={styles.pickerArrow}>v</Text>
    </View>
  );
};

/**
 * Component mapping registry
 */
const COMPONENT_MAP = {
  // Layout containers
  'screen': ScrollView,
  'safeareaview': SafeAreaView,
  'scrollview': ScrollView,
  'view': View,
  'stack': Stack,
  'row': Row,
  'section': Section,
  'card': Card,

  // Display components
  'header': Header,
  'heading': HeadingComponent,
  'text': TextComponent,
  'label': LabelComponent,
  'badge': Badge,
  'image': ImageComponent,
  'divider': Divider,

  // Input components
  'textinput': FormInput,
  'input': FormInput,
  'textarea': TextAreaInput,
  'picker': PickerComponent,
  'dropdown': PickerComponent,
  'switch': SwitchComponent,
  'checkbox': CheckboxComponent,
  'searchbar': SearchBar,

  // Action components
  'button': Button,
  'iconbutton': IconButton,
  'fab': FAB,

  // List components
  'list': ListComponent,
  'listitem': ListItem,
  'flatlist': ListComponent,

  // Loading
  'activityindicator': ActivityIndicator,
  'spinner': ActivityIndicator,
  'loading': ActivityIndicator,
};

/**
 * Main ComponentRenderer
 * Recursively renders JSON component definitions as React Native components
 */
export const ComponentRenderer = ({ component, onAction, formData = {} }) => {
  if (!component) return null;

  const {
    type,
    props = {},
    children = [],
    style = {},
    layout = {},
  } = component;

  // Get the component from registry
  const componentType = type?.toLowerCase();
  const Component = COMPONENT_MAP[componentType];

  // If no mapping found, try to render children in a View
  if (!Component) {
    if (children && children.length > 0) {
      return (
        <View style={parseStyle(style)}>
          {children.map((child, idx) => (
            <ComponentRenderer
              key={idx}
              component={child}
              onAction={onAction}
              formData={formData}
            />
          ))}
        </View>
      );
    }
    // Unknown component with no children - skip
    console.warn(`Unknown component type: ${type}`);
    return null;
  }

  // Parse styles
  const parsedStyle = mergeStyles(parseStyle(style), parseStyle(layout));

  // Build props for the component
  const componentProps = {
    ...props,
    style: parsedStyle,
    props, // Pass original props for custom components
    onAction,
  };

  // For input components, inject current form value
  if (['textinput', 'input', 'textarea'].includes(componentType)) {
    if (props.name && formData[props.name] !== undefined) {
      componentProps.value = formData[props.name];
    }
  }

  // Render children recursively
  const renderedChildren = children.map((child, idx) => (
    <ComponentRenderer
      key={child.id || idx}
      component={child}
      onAction={onAction}
      formData={formData}
    />
  ));

  // Special handling for ScrollView (needs contentContainerStyle)
  if (componentType === 'scrollview' || componentType === 'screen') {
    return (
      <ScrollView
        contentContainerStyle={parsedStyle}
        showsVerticalScrollIndicator={false}
      >
        {renderedChildren}
      </ScrollView>
    );
  }

  // Render the component
  return (
    <Component {...componentProps}>
      {renderedChildren.length > 0 ? renderedChildren : null}
    </Component>
  );
};

/**
 * Styles for internal components
 */
const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    color: '#374151',
  },
  heading: {
    fontWeight: '600',
    color: '#111827',
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  imagePlaceholder: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#374151',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    color: '#6b7280',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '300',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: '#374151',
    fontSize: 16,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
  },
  pickerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  pickerArrow: {
    color: '#6b7280',
  },
});

export default ComponentRenderer;
