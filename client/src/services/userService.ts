// Example service using the generic API repository
import { apiRepository, ApiResponse } from '../lib/apiRepository';
import { apiGet, apiPost, apiPut, apiDelete, updateEndpointWithParams, getErrorMessage, getSuccessMessage, isResponseSuccessful } from '../lib/apiHelpers';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  phoneNumber: string;
  role: string;
  status: string;
}

export class UserService {
  // Get all users
  static async getUsers(): Promise<{ users?: User[]; error?: string }> {
    const response = await apiGet<User[]>('getUsers');
    
    if (isResponseSuccessful(response)) {
      return { users: response.data };
    } else {
      return { error: getErrorMessage(response) };
    }
  }

  // Get user by ID
  static async getUserById(id: string): Promise<{ user?: User; error?: string }> {
    // Update endpoint with ID parameter
    updateEndpointWithParams('getUsers', { id });
    
    const response = await apiGet<User>('getUsers');
    
    if (isResponseSuccessful(response)) {
      return { user: response.data };
    } else {
      return { error: getErrorMessage(response) };
    }
  }

  // Create new user
  static async createUser(userData: Partial<User>): Promise<{ user?: User; error?: string; success?: string }> {
    const response = await apiPost<User>('createUser', userData);
    
    if (isResponseSuccessful(response)) {
      return { 
        user: response.data,
        success: getSuccessMessage('create')
      };
    } else {
      return { error: getErrorMessage(response) };
    }
  }

  // Update user
  static async updateUser(id: string, userData: Partial<User>): Promise<{ user?: User; error?: string; success?: string }> {
    // Update endpoint with ID parameter
    updateEndpointWithParams('updateUser', { id });
    
    const response = await apiPut<User>('updateUser', userData);
    
    if (isResponseSuccessful(response)) {
      return { 
        user: response.data,
        success: getSuccessMessage('update')
      };
    } else {
      return { error: getErrorMessage(response) };
    }
  }

  // Delete user
  static async deleteUser(id: string): Promise<{ error?: string; success?: string }> {
    // Update endpoint with ID parameter
    updateEndpointWithParams('deleteUser', { id });
    
    const response = await apiDelete<void>('deleteUser');
    
    if (isResponseSuccessful(response)) {
      return { success: getSuccessMessage('delete') };
    } else {
      return { error: getErrorMessage(response) };
    }
  }
}

// Authentication service
export class AuthService {
  // Login user
  static async login(username: string, password: string): Promise<{ user?: any; error?: string; success?: string }> {
    const response = await apiRepository.call<any>(
      'login',
      'POST',
      { username, password },
      {},
      false // login doesn't require existing authentication
    );
    
    if (isResponseSuccessful(response)) {
      // Store tokens if they exist in response
      if (response.data?.accessToken) {
        apiRepository.setTokens(response.data.accessToken, response.data.refreshToken);
      }
      
      return { 
        user: response.data?.user || response.data,
        success: getSuccessMessage('login')
      };
    } else {
      return { error: getErrorMessage(response) };
    }
  }

  // Signup user
  static async signup(userData: any): Promise<{ user?: any; error?: string; success?: string }> {
    const response = await apiRepository.call<any>(
      'signup',
      'POST',
      {
        email: userData.email,
        name: userData.username,
        password: userData.password,
        mobileNumber: userData.phone,
        Name: "Owner"
      },
      {},
      false // signup doesn't require authentication
    );
    
    if (isResponseSuccessful(response)) {
      // Store tokens if they exist in response
      if (response.data?.accessToken) {
        apiRepository.setTokens(response.data.accessToken, response.data.refreshToken);
      }
      
      return { 
        user: response.data,
        success: getSuccessMessage('signup')
      };
    } else {
      return { error: getErrorMessage(response) };
    }
  }

  // Logout user
  static logout() {
    apiRepository.setTokens(''); // Clear tokens
    // Additional logout logic here
  }
}

// Configuration service
export class ConfigService {
  // Update base URL
  static updateBaseUrl(newBaseUrl: string) {
    apiRepository.updateConfig({ baseUrl: newBaseUrl });
  }

  // Update specific endpoint
  static updateEndpoint(key: string, endpoint: string) {
    apiRepository.updateEndpoint(key, endpoint);
  }

  // Get current configuration
  static getConfig() {
    return apiRepository.getConfig();
  }

  // Example: Update all endpoints for a different API version
  static updateToApiV2() {
    const config = apiRepository.getConfig();
    const updatedEndpoints = Object.keys(config.endpoints).reduce((acc, key) => {
      acc[key] = config.endpoints[key].replace('/api/', '/api/v2/');
      return acc;
    }, {} as { [key: string]: string });
    
    apiRepository.updateConfig({ endpoints: updatedEndpoints });
  }
}