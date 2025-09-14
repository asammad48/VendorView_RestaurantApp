import { QueryClient } from "@tanstack/react-query";
import { STORAGE_KEYS } from "../data/mockData";

// Client-side data operations using localStorage
export async function getLocalData(key: string): Promise<any> {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

export async function setLocalData(key: string, data: any): Promise<void> {
  localStorage.setItem(key, JSON.stringify(data));
}

export async function addLocalData(key: string, newItem: any): Promise<any> {
  const data = await getLocalData(key);
  const item = { ...newItem, id: newItem.id || `${key}-${Date.now()}` };
  const updatedData = [...data, item];
  await setLocalData(key, updatedData);
  return item;
}

export async function updateLocalData(key: string, id: string, updates: any): Promise<any> {
  const data = await getLocalData(key);
  const index = data.findIndex((item: any) => item.id === id);
  if (index !== -1) {
    data[index] = { ...data[index], ...updates };
    await setLocalData(key, data);
    return data[index];
  }
  throw new Error('Item not found');
}

export async function deleteLocalData(key: string, id: string): Promise<void> {
  const data = await getLocalData(key);
  const filteredData = data.filter((item: any) => item.id !== id);
  await setLocalData(key, filteredData);
}

// Real API functions for authentication
import { authApi } from './apiRepository';

export async function mockLogin(email: string, password: string) {
  try {
    const response = await authApi.login({ email, password });

    if (response.error) {
      throw new Error(response.error);
    }

    const data = response.data as any;
    
    // Extract user ID from multiple possible sources
    let userId = null;
    
    // Try to get user ID from direct API response fields
    if (data.userId) {
      userId = data.userId;
    } else if (data.id) {
      userId = data.id;
    } else if (data.user?.id) {
      userId = data.user.id;
    } else {
      // If no direct ID, try to decode JWT token to get the nameid (user ID)
      try {
        const tokenPayload = JSON.parse(atob(data.token.split('.')[1]));
        userId = tokenPayload.nameid || tokenPayload.sub || tokenPayload.userId;
      } catch (e) {
        console.warn('Could not decode JWT token for user ID');
      }
    }
    
    // Store all user data in localStorage
    const userData = {
      token: data.token,
      email: data.email,
      mobileNumber: data.mobileNumber,
      fullName: data.fullName,
      profilePicture: data.profilePicture,
      roles: data.roles,
      // Keep compatibility with existing code
      username: data.email,
      name: data.fullName,
      id: userId ? userId.toString() : Date.now().toString()
    };
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userData));
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user_email', data.email);
    localStorage.setItem('user_mobile', data.mobileNumber);
    localStorage.setItem('user_fullname', data.fullName);
    localStorage.setItem('user_profile_picture', data.profilePicture || '');
    localStorage.setItem('user_roles', JSON.stringify(data.roles));
    
    return userData;
  } catch (error) {
    console.error('Login error:', error);
    throw new Error('Login failed. Please check your credentials.');
  }
}

export async function mockSignup(userData: any) {
  try {
    // Use the AuthService for signup
    const { AuthService } = await import('../services/userService');
    
    const result = await AuthService.signup(userData);
    
    if (result.error) {
      throw new Error(result.error);
    }

    const externalUser = result.user;
    
    // Create local user object with external API response data
    const newUser = {
      id: externalUser.id,
      username: userData.username,
      email: externalUser.email,
      name: externalUser.name,
      phoneNumber: externalUser.mobileNumber || userData.phone,
      profilePicture: externalUser.profilePicture,
      role: "manager", // Set as manager for restaurant owners
      assignedTable: null,
      assignedBranch: null,
      status: "active",
      createdAt: new Date(),
      externalId: externalUser.id, // Store external API ID for reference
    };
    
    // Store user locally for session management
    await addLocalData(STORAGE_KEYS.USERS, newUser);
    const userWithoutPassword = newUser;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(userWithoutPassword));
    return userWithoutPassword;
    
  } catch (error) {
    // If external API fails, show specific error
    console.error('External API signup error:', error);
    throw new Error(`Signup failed: ${error instanceof Error ? error.message : 'Unable to connect to signup service'}`);
  }
}

export async function getCurrentUser() {
  const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return userStr ? JSON.parse(userStr) : null;
}

export async function logout() {
  // Clear all authentication related data from localStorage
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_mobile');
  localStorage.removeItem('user_fullname');
  localStorage.removeItem('user_profile_picture');
  localStorage.removeItem('user_roles');
}

// API request function for mutations
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Mock API responses based on URL patterns
  if (url.includes('/auth/login')) {
    const result = await mockLogin((data as any).username, (data as any).password);
    return new Response(JSON.stringify({ user: result }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (url.includes('/auth/signup')) {
    try {
      const result = await mockSignup(data);
      return new Response(JSON.stringify({ user: result }), { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        message: error instanceof Error ? error.message : 'Signup failed' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Handle other API calls by mapping URLs to storage operations
  if (method === 'POST') {
    let storageKey = '';
    if (url.includes('/users')) storageKey = STORAGE_KEYS.USERS;
    else if (url.includes('/entities')) storageKey = STORAGE_KEYS.ENTITIES;
    else if (url.includes('/restaurants')) storageKey = STORAGE_KEYS.RESTAURANTS;
    else if (url.includes('/branches')) storageKey = STORAGE_KEYS.BRANCHES;
    else if (url.includes('/categories')) storageKey = STORAGE_KEYS.CATEGORIES;
    else if (url.includes('/menu-items')) storageKey = STORAGE_KEYS.MENU_ITEMS;
    else if (url.includes('/orders')) storageKey = STORAGE_KEYS.ORDERS;
    else if (url.includes('/tables')) storageKey = STORAGE_KEYS.TABLES;
    else if (url.includes('/deals')) storageKey = STORAGE_KEYS.DEALS;
    else if (url.includes('/services')) storageKey = STORAGE_KEYS.SERVICES;
    else if (url.includes('/feedbacks')) storageKey = STORAGE_KEYS.FEEDBACKS;
    else if (url.includes('/tickets')) storageKey = STORAGE_KEYS.TICKETS;
    
    if (storageKey) {
      const result = await addLocalData(storageKey, data);
      return new Response(JSON.stringify(result), { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Default success response
  return new Response(JSON.stringify({ success: true }), { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey.join('/');
        
        // Map API URLs to localStorage keys
        if (url.includes('/api/users')) {
          const users = await getLocalData(STORAGE_KEYS.USERS);
          return users.map(({ password, ...user }: any) => user);
        }
        if (url.includes('/api/entities')) {
          return await getLocalData(STORAGE_KEYS.ENTITIES);
        }
        if (url.includes('/api/restaurants')) {
          return await getLocalData(STORAGE_KEYS.RESTAURANTS);
        }
        if (url.includes('/api/branches')) {
          return await getLocalData(STORAGE_KEYS.BRANCHES);
        }
        if (url.includes('/api/analytics')) {
          return await getLocalData(STORAGE_KEYS.ANALYTICS);
        }
        if (url.includes('/api/categories')) {
          return await getLocalData(STORAGE_KEYS.CATEGORIES);
        }
        if (url.includes('/api/menu-items')) {
          return await getLocalData(STORAGE_KEYS.MENU_ITEMS);
        }
        if (url.includes('/api/orders')) {
          return await getLocalData(STORAGE_KEYS.ORDERS);
        }
        if (url.includes('/api/tables')) {
          return await getLocalData(STORAGE_KEYS.TABLES);
        }
        if (url.includes('/api/deals')) {
          return await getLocalData(STORAGE_KEYS.DEALS);
        }
        if (url.includes('/api/services')) {
          return await getLocalData(STORAGE_KEYS.SERVICES);
        }
        if (url.includes('/api/feedbacks')) {
          return await getLocalData(STORAGE_KEYS.FEEDBACKS);
        }
        if (url.includes('/api/tickets')) {
          return await getLocalData(STORAGE_KEYS.TICKETS);
        }
        
        return [];
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
