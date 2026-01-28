/**
 * ListItem Component - Single list item with title and optional subtitle
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';

const ListItem = ({
  title,
  subtitle,
  text,
  onPress,
  style,
  showArrow = true,
  props = {},
  onAction,
  children,
}) => {
  const itemTitle = title || text || props.title || props.text || 'Item';
  const itemSubtitle = subtitle || props.subtitle;

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    if (onAction && props.action) {
      onAction(props.action);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{itemTitle}</Text>
        {itemSubtitle && <Text style={styles.subtitle}>{itemSubtitle}</Text>}
        {children}
      </View>
      {showArrow && <Text style={styles.arrow}>{'>'}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  arrow: {
    fontSize: 16,
    color: '#9ca3af',
    marginLeft: 8,
  },
});

export default ListItem;
