/**
 * FormInput Component - Text input with label
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

const FormInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  style,
  multiline,
  numberOfLines,
  secureTextEntry,
  keyboardType,
  editable = true,
  props = {},
  onAction,
}) => {
  const inputLabel = label || props.label;
  const inputPlaceholder = placeholder || props.placeholder || 'Enter text...';

  const handleChange = (text) => {
    if (onChangeText) {
      onChangeText(text);
    }
    if (onAction && props.name) {
      onAction({ type: 'fieldChange', field: props.name, value: text });
    }
  };

  return (
    <View style={[styles.container, style]}>
      {inputLabel && <Text style={styles.label}>{inputLabel}</Text>}
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          !editable && styles.disabled,
        ]}
        placeholder={inputPlaceholder}
        placeholderTextColor="#9ca3af"
        value={value}
        onChangeText={handleChange}
        multiline={multiline || props.multiline}
        numberOfLines={numberOfLines || props.numberOfLines || (multiline ? 4 : 1)}
        secureTextEntry={secureTextEntry || props.secureTextEntry}
        keyboardType={keyboardType || props.keyboardType || 'default'}
        editable={editable}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  disabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
});

export default FormInput;
