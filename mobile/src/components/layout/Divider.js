/**
 * Divider Component - Horizontal separator
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

const Divider = ({ style, color, props = {} }) => {
  const dividerColor = color || props.color || '#e5e7eb';

  return (
    <View style={[styles.container, { backgroundColor: dividerColor }, style]} />
  );
};

const styles = StyleSheet.create({
  container: {
    height: 1,
    marginVertical: 16,
  },
});

export default Divider;
