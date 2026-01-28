/**
 * Workflow++ Mobile App
 *
 * Main entry point for the Expo mobile application.
 * Renders dynamic screens from JSON definitions fetched from the backend.
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

/**
 * App Configuration Screen
 * Shows when no app is connected - allows entering server URL and app ID
 */
const AppConfigScreen = () => {
  const { setAppId, setServerUrl, serverUrl, loading, error } = useApp();
  const [inputUrl, setInputUrl] = useState(serverUrl);
  const [inputAppId, setInputAppId] = useState('');

  const handleConnect = () => {
    if (!inputUrl) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }
    if (!inputAppId) {
      Alert.alert('Error', 'Please enter an App ID');
      return;
    }

    setServerUrl(inputUrl.replace(/\/$/, '')); // Remove trailing slash
    setAppId(inputAppId);
  };

  return (
    <View style={styles.configContainer}>
      <View style={styles.configContent}>
        <Text style={styles.logo}>W++</Text>
        <Text style={styles.configTitle}>Workflow++ Mobile</Text>
        <Text style={styles.configSubtitle}>
          Connect to your Workflow++ application
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Server URL</Text>
          <TextInput
            style={styles.input}
            placeholder="http://192.168.1.x:5000/api"
            placeholderTextColor="#9ca3af"
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>App ID</Text>
          <TextInput
            style={styles.input}
            placeholder="app_123456789"
            placeholderTextColor="#9ca3af"
            value={inputAppId}
            onChangeText={setInputAppId}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.connectButton, loading && styles.connectButtonDisabled]}
          onPress={handleConnect}
          disabled={loading}
        >
          <Text style={styles.connectButtonText}>
            {loading ? 'Connecting...' : 'Connect'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Find your App ID in the Workflow++ web platform under Application Settings
        </Text>
      </View>
    </View>
  );
};

/**
 * Main App Content
 * Decides whether to show config screen or the actual app
 */
const AppContent = () => {
  const { appId, screens, loading } = useApp();

  // Show config screen if no app is loaded
  if (!appId || (screens.length === 0 && !loading)) {
    return <AppConfigScreen />;
  }

  // Show the app navigator
  return <AppNavigator />;
};

/**
 * Root App Component
 */
export default function App() {
  // You can pass initial values from deep link or QR code scan
  const initialAppId = null; // Set from QR code scan
  const initialServerUrl = 'http://localhost:5000/api';

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="auto" />
      <AppProvider initialAppId={initialAppId} initialServerUrl={initialServerUrl}>
        <AppContent />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  configContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  configContent: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: '#3b82f6',
    marginBottom: 8,
  },
  configTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  configSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  connectButton: {
    width: '100%',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  connectButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
});
