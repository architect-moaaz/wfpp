/**
 * Card Component - Container with elevation and rounded corners
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Card = ({ title, children, style, props = {} }) => {
  const cardTitle = title || props.title;

  return (
    <View style={[styles.container, style]}>
      {cardTitle && <Text style={styles.title}>{cardTitle}</Text>}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
});

export default Card;
