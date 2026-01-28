/**
 * Row Component - Horizontal layout container
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

const Row = ({
  children,
  style,
  gap,
  spacing,
  justify,
  align,
  wrap,
  props = {}
}) => {
  const rowGap = gap || spacing || props.gap || props.spacing || 12;
  const justifyContent = justify || props.justifyContent || 'flex-start';
  const alignItems = align || props.alignItems || 'center';
  const flexWrap = wrap || props.wrap ? 'wrap' : 'nowrap';

  return (
    <View
      style={[
        styles.container,
        { gap: rowGap, justifyContent, alignItems, flexWrap },
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
});

export default Row;
