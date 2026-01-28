/**
 * Section Component - Grouped content with optional title
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Section = ({ title, children, style, props = {} }) => {
  const sectionTitle = title || props.title;

  return (
    <View style={[styles.container, style]}>
      {sectionTitle && <Text style={styles.title}>{sectionTitle}</Text>}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6b7280',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
});

export default Section;
