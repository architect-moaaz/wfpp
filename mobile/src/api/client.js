/**
 * API Client for Workflow++ Mobile
 * Handles communication with the backend server
 */

// Default to localhost, can be overridden
let API_BASE = 'http://localhost:5000/api';

/**
 * Set the API base URL (call this on app init with device IP)
 */
export const setApiBaseUrl = (url) => {
  API_BASE = url;
};

/**
 * Get the current API base URL
 */
export const getApiBaseUrl = () => API_BASE;

/**
 * Generic fetch wrapper with error handling
 */
const fetchWithError = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API Error [${url}]:`, error.message);
    throw error;
  }
};

/**
 * Fetch all screens for an application
 */
export const fetchAppScreens = async (appId) => {
  return fetchWithError(`${API_BASE}/mobile/apps/${appId}/screens`);
};

/**
 * Fetch a single screen by ID
 */
export const fetchScreen = async (appId, screenId) => {
  return fetchWithError(`${API_BASE}/mobile/apps/${appId}/screens/${screenId}`);
};

/**
 * Fetch application metadata
 */
export const fetchAppInfo = async (appId) => {
  return fetchWithError(`${API_BASE}/mobile/apps/${appId}`);
};

/**
 * Submit form data
 */
export const submitForm = async (appId, formId, data) => {
  return fetchWithError(`${API_BASE}/mobile/apps/${appId}/forms/${formId}/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Fetch data for a data model
 */
export const fetchModelData = async (appId, modelId, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE}/mobile/apps/${appId}/data/${modelId}${queryString ? `?${queryString}` : ''}`;
  return fetchWithError(url);
};

/**
 * Create a new record in a data model
 */
export const createRecord = async (appId, modelId, data) => {
  return fetchWithError(`${API_BASE}/mobile/apps/${appId}/data/${modelId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Update a record in a data model
 */
export const updateRecord = async (appId, modelId, recordId, data) => {
  return fetchWithError(`${API_BASE}/mobile/apps/${appId}/data/${modelId}/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * Delete a record from a data model
 */
export const deleteRecord = async (appId, modelId, recordId) => {
  return fetchWithError(`${API_BASE}/mobile/apps/${appId}/data/${modelId}/${recordId}`, {
    method: 'DELETE',
  });
};

/**
 * Execute a workflow action
 */
export const executeWorkflowAction = async (appId, workflowId, actionId, data = {}) => {
  return fetchWithError(`${API_BASE}/mobile/apps/${appId}/workflows/${workflowId}/actions/${actionId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export default {
  setApiBaseUrl,
  getApiBaseUrl,
  fetchAppScreens,
  fetchScreen,
  fetchAppInfo,
  submitForm,
  fetchModelData,
  createRecord,
  updateRecord,
  deleteRecord,
  executeWorkflowAction,
};
