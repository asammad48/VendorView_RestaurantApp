// API Helper functions for common operations
import { apiRepository, ApiResponse } from './apiRepository';

// Generic CRUD operations
export async function apiGet<T>(endpointKey: string, params?: any): Promise<ApiResponse<T>> {
  return await apiRepository.call<T>(endpointKey, 'GET', undefined, undefined, true);
}

export async function apiPost<T>(endpointKey: string, data: any): Promise<ApiResponse<T>> {
  return await apiRepository.call<T>(endpointKey, 'POST', data, undefined, true);
}

export async function apiPut<T>(endpointKey: string, data: any): Promise<ApiResponse<T>> {
  return await apiRepository.call<T>(endpointKey, 'PUT', data, undefined, true);
}

export async function apiDelete<T>(endpointKey: string): Promise<ApiResponse<T>> {
  return await apiRepository.call<T>(endpointKey, 'DELETE', undefined, undefined, true);
}

// Authentication specific operations
export async function apiLogin(credentials: { username: string; password: string }): Promise<ApiResponse<any>> {
  return await apiRepository.call('login', 'POST', credentials, undefined, false);
}

export async function apiSignup(userData: any): Promise<ApiResponse<any>> {
  return await apiRepository.call('signup', 'POST', userData, undefined, false);
}

// Helper to replace endpoint parameters
export function replaceEndpointParams(endpoint: string, params: { [key: string]: string | number }): string {
  let result = endpoint;
  Object.keys(params).forEach(key => {
    result = result.replace(`{${key}}`, String(params[key]));
  });
  return result;
}

// Update endpoint with parameters
export function updateEndpointWithParams(endpointKey: string, params: { [key: string]: string | number }) {
  const config = apiRepository.getConfig();
  const originalEndpoint = config.endpoints[endpointKey];
  if (originalEndpoint) {
    const updatedEndpoint = replaceEndpointParams(originalEndpoint, params);
    apiRepository.updateEndpoint(endpointKey, updatedEndpoint);
  }
}

// Error message helper
export function getErrorMessage(response: ApiResponse<any>): string {
  if (response.error) {
    return response.error;
  }
  
  switch (response.status) {
    case 400:
      return 'Bad request. Please check your input.';
    case 401:
      return 'Authentication required. Please login again.';
    case 403:
      return 'Access forbidden. You don\'t have permission for this action.';
    case 404:
      return 'Resource not found.';
    case 422:
      return 'Validation failed. Please check your input.';
    case 500:
      return 'Server error. Please try again later.';
    default:
      return 'An unexpected error occurred.';
  }
}

// Success message helper
export function getSuccessMessage(operation: string): string {
  switch (operation) {
    case 'create':
      return 'Created successfully!';
    case 'update':
      return 'Updated successfully!';
    case 'delete':
      return 'Deleted successfully!';
    case 'login':
      return 'Logged in successfully!';
    case 'signup':
      return 'Account created successfully!';
    default:
      return 'Operation completed successfully!';
  }
}

// Check if response is successful
export function isResponseSuccessful(response: ApiResponse<any>): boolean {
  return !response.error && response.status >= 200 && response.status < 300;
}