/**
 * Badge Component - Small status indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Badge = ({
  text,
  label,
  color,
  backgroundColor,
  style,
  props = {},
  children,
}) => {
  const badgeText = text || label || props.text || props.label || children || 'Badge';
  const bgColor = backgroundColor || props.backgroundColor || props.color || '#3b82f6';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }, style]}>
      <Text style={[styles.text, color && { color }]}>{badgeText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
});

export default Badge;
