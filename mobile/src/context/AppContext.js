/**
 * App Context - Global state management for the mobile app
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { fetchAppScreens, fetchAppInfo, setApiBaseUrl } from '../api/client';

// Initial state
const initialState = {
  appId: null,
  appInfo: null,
  screens: [],
  navigation: null,
  currentScreen: null,
  formData: {},
  loading: true,
  error: null,
  serverUrl: 'http://localhost:5000/api',
};

// Action types
const ActionTypes = {
  SET_APP_ID: 'SET_APP_ID',
  SET_SERVER_URL: 'SET_SERVER_URL',
  LOAD_APP_START: 'LOAD_APP_START',
  LOAD_APP_SUCCESS: 'LOAD_APP_SUCCESS',
  LOAD_APP_ERROR: 'LOAD_APP_ERROR',
  SET_CURRENT_SCREEN: 'SET_CURRENT_SCREEN',
  UPDATE_FORM_DATA: 'UPDATE_FORM_DATA',
  CLEAR_FORM_DATA: 'CLEAR_FORM_DATA',
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_APP_ID:
      return { ...state, appId: action.payload };

    case ActionTypes.SET_SERVER_URL:
      return { ...state, serverUrl: action.payload };

    case ActionTypes.LOAD_APP_START:
      return { ...state, loading: true, error: null };

    case ActionTypes.LOAD_APP_SUCCESS:
      return {
        ...state,
        loading: false,
        appInfo: action.payload.appInfo,
        screens: action.payload.screens || [],
        navigation: action.payload.navigation,
      };

    case ActionTypes.LOAD_APP_ERROR:
      return { ...state, loading: false, error: action.payload };

    case ActionTypes.SET_CURRENT_SCREEN:
      return { ...state, currentScreen: action.payload };

    case ActionTypes.UPDATE_FORM_DATA:
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.payload.formId]: {
            ...(state.formData[action.payload.formId] || {}),
            [action.payload.field]: action.payload.value,
          },
        },
      };

    case ActionTypes.CLEAR_FORM_DATA:
      const newFormData = { ...state.formData };
      delete newFormData[action.payload];
      return { ...state, formData: newFormData };

    default:
      return state;
  }
};

// Context
const AppContext = createContext(null);

// Provider component
export const AppProvider = ({ children, initialAppId, initialServerUrl }) => {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    appId: initialAppId,
    serverUrl: initialServerUrl || initialState.serverUrl,
  });

  // Set server URL on init
  useEffect(() => {
    if (state.serverUrl) {
      setApiBaseUrl(state.serverUrl);
    }
  }, [state.serverUrl]);

  // Load app data when appId changes
  useEffect(() => {
    if (state.appId) {
      loadApp(state.appId);
    }
  }, [state.appId]);

  const loadApp = async (appId) => {
    dispatch({ type: ActionTypes.LOAD_APP_START });
    try {
      const [appInfo, screensData] = await Promise.all([
        fetchAppInfo(appId).catch(() => null),
        fetchAppScreens(appId),
      ]);

      dispatch({
        type: ActionTypes.LOAD_APP_SUCCESS,
        payload: {
          appInfo,
          screens: screensData.screens || [],
          navigation: screensData.navigation,
        },
      });
    } catch (error) {
      dispatch({
        type: ActionTypes.LOAD_APP_ERROR,
        payload: error.message,
      });
    }
  };

  const setAppId = (appId) => {
    dispatch({ type: ActionTypes.SET_APP_ID, payload: appId });
  };

  const setServerUrl = (url) => {
    setApiBaseUrl(url);
    dispatch({ type: ActionTypes.SET_SERVER_URL, payload: url });
  };

  const setCurrentScreen = (screenId) => {
    dispatch({ type: ActionTypes.SET_CURRENT_SCREEN, payload: screenId });
  };

  const updateFormField = (formId, field, value) => {
    dispatch({
      type: ActionTypes.UPDATE_FORM_DATA,
      payload: { formId, field, value },
    });
  };

  const getFormData = (formId) => {
    return state.formData[formId] || {};
  };

  const clearFormData = (formId) => {
    dispatch({ type: ActionTypes.CLEAR_FORM_DATA, payload: formId });
  };

  const value = {
    ...state,
    setAppId,
    setServerUrl,
    loadApp,
    setCurrentScreen,
    updateFormField,
    getFormData,
    clearFormData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
