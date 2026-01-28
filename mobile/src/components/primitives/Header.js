/**
 * Header Component - Screen header with title and optional back button
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const Header = ({
  title,
  headerTitle,
  showBackButton,
  onBack,
  style,
  children,
  props = {}
}) => {
  const displayTitle = title || headerTitle || props.title || props.headerTitle || 'Header';

  return (
    <View style={[styles.container, style]}>
      {showBackButton && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{displayTitle}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3b82f6',
    minHeight: 56,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default Header;
