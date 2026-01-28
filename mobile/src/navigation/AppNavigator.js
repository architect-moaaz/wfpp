/**
 * AppNavigator - Dynamic navigation setup from JSON configuration
 *
 * Creates navigation structure based on the app definition from the backend.
 * Supports Stack, Tab, and Drawer navigation types.
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DynamicScreen from '../screens/DynamicScreen';
import { useApp } from '../context/AppContext';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Loading screen while app data is being fetched
 */
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#3b82f6" />
    <Text style={styles.loadingText}>Loading app...</Text>
  </View>
);

/**
 * Error screen when app fails to load
 */
const ErrorScreen = ({ error }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Failed to Load App</Text>
    <Text style={styles.errorText}>{error}</Text>
  </View>
);

/**
 * Configuration screen when no app is loaded
 */
const ConfigScreen = ({ onConnect }) => (
  <View style={styles.configContainer}>
    <Text style={styles.configTitle}>Workflow++ Mobile</Text>
    <Text style={styles.configSubtitle}>
      Scan a QR code from the web platform to connect to an app
    </Text>
  </View>
);

/**
 * Tab Navigator - Creates bottom tab navigation
 */
const TabNavigator = ({ screens, navigation: navConfig }) => {
  // Get tab screens (screens marked as tab items or first few screens)
  const tabScreens = screens.filter(s => s.isTabItem || s.showInTabs) || screens.slice(0, 5);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        headerStyle: { backgroundColor: '#3b82f6' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {tabScreens.map((screen) => (
        <Tab.Screen
          key={screen.id || screen.name}
          name={screen.name}
          component={DynamicScreen}
          initialParams={{ screenDefinition: screen }}
          options={{
            title: screen.tabTitle || screen.name,
            tabBarIcon: ({ color, size }) => (
              <Text style={{ color, fontSize: size }}>
                {screen.tabIcon || '[]'}
              </Text>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

/**
 * Stack Navigator - Creates stack-based navigation
 */
const StackNavigator = ({ screens, navigation: navConfig }) => {
  // Get initial screen (first screen or one marked as initial)
  const initialScreen = screens.find(s => s.isInitial) || screens[0];
  const initialRouteName = initialScreen?.name;

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: '#3b82f6' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitleVisible: false,
        cardStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      {screens.map((screen) => (
        <Stack.Screen
          key={screen.id || screen.name}
          name={screen.name}
          component={DynamicScreen}
          initialParams={{ screenDefinition: screen }}
          options={{
            title: screen.navigation?.headerTitle || screen.name,
            headerShown: screen.navigation?.showHeader !== false,
          }}
        />
      ))}
    </Stack.Navigator>
  );
};

/**
 * Hybrid Navigator - Tab navigator with stack for each tab
 */
const HybridNavigator = ({ screens, navigation: navConfig }) => {
  // Group screens by their tab/section
  const tabScreens = screens.filter(s => s.isTabItem || s.showInTabs);
  const stackScreens = screens.filter(s => !s.isTabItem && !s.showInTabs);

  // If no tabs defined, use stack navigation
  if (tabScreens.length === 0) {
    return <StackNavigator screens={screens} navigation={navConfig} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs">
        {() => <TabNavigator screens={tabScreens} navigation={navConfig} />}
      </Stack.Screen>
      {/* Add stack screens that can be navigated to from tabs */}
      {stackScreens.map((screen) => (
        <Stack.Screen
          key={screen.id || screen.name}
          name={screen.name}
          component={DynamicScreen}
          initialParams={{ screenDefinition: screen }}
          options={{
            headerShown: true,
            title: screen.navigation?.headerTitle || screen.name,
            headerStyle: { backgroundColor: '#3b82f6' },
            headerTintColor: '#ffffff',
          }}
        />
      ))}
    </Stack.Navigator>
  );
};

/**
 * Main App Navigator
 */
const AppNavigator = () => {
  const { screens, navigation, loading, error, appId } = useApp();

  // Show loading state
  if (loading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading" component={LoadingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Show error state
  if (error) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Error">
            {() => <ErrorScreen error={error} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Show config screen if no app loaded
  if (!appId || screens.length === 0) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Config" component={ConfigScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Determine navigation type and render appropriate navigator
  const navigationType = navigation?.type || 'stack';

  return (
    <NavigationContainer>
      {navigationType === 'tab' ? (
        <TabNavigator screens={screens} navigation={navigation} />
      ) : navigationType === 'hybrid' ? (
        <HybridNavigator screens={screens} navigation={navigation} />
      ) : (
        <StackNavigator screens={screens} navigation={navigation} />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
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
  configContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  configTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  configSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 300,
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e5e7eb',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
});

export default AppNavigator;
