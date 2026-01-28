/**
 * Button Component - Touchable button with variants
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

const Button = ({
  title,
  text,
  label,
  onPress,
  style,
  primary,
  secondary,
  danger,
  disabled,
  loading,
  props = {},
  onAction,
  children,
}) => {
  const buttonText = title || text || label || props.title || props.text || props.label || 'Button';
  const isPrimary = primary || props.primary;
  const isSecondary = secondary || props.secondary;
  const isDanger = danger || props.danger;
  const isDisabled = disabled || props.disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;

    if (onPress) {
      onPress();
    }
    if (onAction && props.action) {
      onAction(props.action);
    }
  };

  const buttonStyle = [
    styles.button,
    isPrimary && styles.primaryButton,
    isSecondary && styles.secondaryButton,
    isDanger && styles.dangerButton,
    isDisabled && styles.disabledButton,
    style,
  ];

  const textStyle = [
    styles.text,
    isPrimary && styles.primaryText,
    isSecondary && styles.secondaryText,
    isDanger && styles.dangerText,
    isDisabled && styles.disabledText,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#ffffff' : '#3b82f6'} />
      ) : (
        <Text style={textStyle}>{children || buttonText}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#374151',
  },
  dangerText: {
    color: '#ffffff',
  },
  disabledText: {
    color: '#9ca3af',
  },
});

export default Button;
