/**
 * Stack Component - Vertical layout container
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

const Stack = ({ children, style, gap, spacing, props = {} }) => {
  const stackGap = gap || spacing || props.gap || props.spacing || 12;

  return (
    <View style={[styles.container, { gap: stackGap }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
});

export default Stack;
