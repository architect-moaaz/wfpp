/**
 * DynamicScreen - Renders any screen from JSON definition
 *
 * This screen component receives a screen definition from navigation params
 * and uses ComponentRenderer to render the actual UI.
 */

import React, { useState, useLayoutEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ComponentRenderer } from '../components/ComponentRenderer';
import { useApp } from '../context/AppContext';
import { submitForm, executeWorkflowAction } from '../api/client';

const DynamicScreen = ({ route, navigation }) => {
  const { screenDefinition } = route.params || {};
  const { appId, updateFormField, getFormData, clearFormData } = useApp();

  // Local form data state for this screen
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  // Configure navigation header from screen definition
  useLayoutEffect(() => {
    if (screenDefinition?.navigation) {
      const navConfig = screenDefinition.navigation;
      navigation.setOptions({
        title: navConfig.headerTitle || screenDefinition.name || 'Screen',
        headerShown: navConfig.showHeader !== false,
        headerStyle: navConfig.headerStyle || { backgroundColor: '#3b82f6' },
        headerTintColor: navConfig.headerTintColor || '#ffffff',
        headerTitleStyle: { fontWeight: '600' },
      });
    } else {
      navigation.setOptions({
        title: screenDefinition?.name || 'Screen',
      });
    }
  }, [screenDefinition, navigation]);

  /**
   * Handle actions from components (button clicks, navigation, form submissions)
   */
  const handleAction = useCallback(async (action) => {
    if (!action) return;

    console.log('[DynamicScreen] Action:', action);

    switch (action.type) {
      case 'navigate':
        // Navigate to another screen
        if (action.target) {
          navigation.navigate(action.target, action.params || {});
        }
        break;

      case 'goBack':
        navigation.goBack();
        break;

      case 'submit':
        // Submit form data
        await handleFormSubmit(action);
        break;

      case 'fieldChange':
        // Update form field value
        setFormData(prev => ({
          ...prev,
          [action.field]: action.value,
        }));
        // Also update in global context if needed
        if (action.formId) {
          updateFormField(action.formId, action.field, action.value);
        }
        break;

      case 'workflow':
        // Execute workflow action
        await handleWorkflowAction(action);
        break;

      case 'listItemPress':
        // Handle list item press
        if (action.item?.action) {
          handleAction(action.item.action);
        } else if (action.item?.screenId) {
          navigation.navigate(action.item.screenId);
        }
        break;

      case 'search':
        // Handle search (implement search logic)
        console.log('Search query:', action.query);
        break;

      default:
        console.log('Unhandled action type:', action.type);
    }
  }, [navigation, appId]);

  /**
   * Handle form submission
   */
  const handleFormSubmit = async (action) => {
    const formId = action.formId || screenDefinition?.formId;
    if (!formId) {
      Alert.alert('Error', 'No form ID specified');
      return;
    }

    setLoading(true);
    try {
      const result = await submitForm(appId, formId, formData);
      Alert.alert('Success', 'Form submitted successfully');

      // Clear form data after successful submission
      setFormData({});
      clearFormData(formId);

      // Navigate if specified
      if (action.onSuccess?.navigate) {
        navigation.navigate(action.onSuccess.navigate);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle workflow action execution
   */
  const handleWorkflowAction = async (action) => {
    if (!action.workflowId || !action.actionId) {
      Alert.alert('Error', 'Workflow or action ID missing');
      return;
    }

    setLoading(true);
    try {
      const result = await executeWorkflowAction(
        appId,
        action.workflowId,
        action.actionId,
        { ...formData, ...action.data }
      );

      if (action.onSuccess) {
        handleAction(action.onSuccess);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to execute action');
    } finally {
      setLoading(false);
    }
  };

  // Handle missing screen definition
  if (!screenDefinition) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Screen Not Found</Text>
          <Text style={styles.errorText}>
            No screen definition was provided.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Get components from screen definition
  const { components = [], type, name } = screenDefinition;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Render custom header if navigation header is hidden */}
          {screenDefinition.navigation?.showHeader === false &&
            screenDefinition.customHeader && (
              <ComponentRenderer
                component={screenDefinition.customHeader}
                onAction={handleAction}
                formData={formData}
              />
            )}

          {/* Render all components from the screen definition */}
          {components.map((component, index) => (
            <ComponentRenderer
              key={component.id || index}
              component={component}
              onAction={handleAction}
              formData={formData}
            />
          ))}
        </ScrollView>

        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingText: {
    fontSize: 14,
    color: '#374151',
  },
});

export default DynamicScreen;
