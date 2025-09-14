import { Deal, Service, BranchService, DetailedOrder } from '../types/schema';
import { PaginationResponse } from '../types/pagination';

// Generic API Repository with error handling and token management
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface ApiConfig {
  baseUrl: string;
  endpoints: {
    [key: string]: string;
  };
  headers?: {
    [key: string]: string;
  };
}

export class ApiRepository {
  private config: ApiConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(config: ApiConfig) {
    this.config = config;
    this.loadTokensFromStorage();
  }

  // Load tokens from localStorage
  private loadTokensFromStorage() {
    this.accessToken = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  // Save tokens to localStorage
  private saveTokensToStorage(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    localStorage.setItem('access_token', accessToken);
    
    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  // Clear tokens from localStorage
  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}${this.config.endpoints.refreshToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.saveTokensToStorage(data.accessToken, data.refreshToken);
        return true;
      } else {
        this.clearTokens();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  // Generic API call method with support for FormData
  async call<T>(
    endpointKey: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
    data?: any,
    customHeaders?: { [key: string]: string },
    requiresAuth: boolean = true,
    pathParams?: { [key: string]: string | number }
  ): Promise<ApiResponse<T>> {
    let endpoint = this.config.endpoints[endpointKey];
    if (!endpoint) {
      return {
        error: `Endpoint '${endpointKey}' not found in configuration`,
        status: 404,
      };
    }

    // Replace path parameters if provided
    if (pathParams) {
      Object.entries(pathParams).forEach(([key, value]) => {
        endpoint = endpoint.replace(`{${key}}`, String(value));
      });
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    
    // Prepare headers
    const headers: { [key: string]: string } = {
      'accept': '*/*',
      ...this.config.headers,
      ...customHeaders,
    };

    // Don't set Content-Type for FormData - browser will set it with boundary
    const isFormData = data instanceof FormData;
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    } else {
      // Explicitly remove Content-Type for FormData to let browser set it with boundary
      delete headers['Content-Type'];
      console.log('FormData detected - Content-Type header removed for multipart/form-data');
    }

    // Add authorization header if required and token exists
    if (requiresAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      if (isFormData) {
        requestOptions.body = data;
      } else {
        requestOptions.body = JSON.stringify(data);
      }
    }

    try {
      let response = await fetch(url, requestOptions);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && requiresAuth && this.refreshToken) {
        console.log('Token expired, attempting to refresh...');
        
        const refreshSuccess = await this.refreshAccessToken();
        if (refreshSuccess) {
          // Update authorization header with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          requestOptions.headers = headers;
          
          // Retry the original request
          response = await fetch(url, requestOptions);
        } else {
          // Refresh failed, redirect to login
          this.handleAuthenticationFailure();
          return {
            error: 'Authentication failed. Please login again.',
            status: 401,
          };
        }
      }

      // Handle response based on status
      if (response.ok) {
        // Handle 204 No Content responses
        if (response.status === 204) {
          return {
            data: null as T,
            status: response.status,
          };
        }
        
        // Try to parse JSON response
        try {
          const responseData = await response.json();
          return {
            data: responseData,
            status: response.status,
          };
        } catch {
          // If JSON parsing fails, return null data for successful responses
          return {
            data: null as T,
            status: response.status,
          };
        }
      } else {
        let errorMessage = `Request failed with status ${response.status}`;
        
        try {
          const errorData = await response.text();
          if (errorData) {
            // Try to parse JSON error response
            try {
              const parsedError = JSON.parse(errorData);
              
              // Handle 422 validation errors specifically
              if (response.status === 422 && parsedError.errors && parsedError.errors['Validation Error']) {
                const validationErrors = parsedError.errors['Validation Error'];
                if (Array.isArray(validationErrors)) {
                  errorMessage = validationErrors.join('. ');
                } else {
                  errorMessage = validationErrors;
                }
              } else {
                errorMessage = parsedError.message || parsedError.error || parsedError.title || errorData;
              }
            } catch {
              errorMessage = errorData;
            }
          }
        } catch {
          // Use default error message if response body can't be read
        }

        // Handle specific status codes
        switch (response.status) {
          case 400:
            console.error('Bad Request:', errorMessage);
            break;
          case 401:
            console.error('Unauthorized:', errorMessage);
            this.handleAuthenticationFailure();
            break;
          case 403:
            console.error('Forbidden:', errorMessage);
            break;
          case 404:
            console.error('Not Found:', errorMessage);
            break;
          case 422:
            console.error('Validation Error:', errorMessage);
            // Handle 422 validation errors with array processing
            try {
              const errorData = await response.clone().json();
              if (errorData.errors && errorData.errors['Validation Error']) {
                const validationErrors = errorData.errors['Validation Error'];
                if (Array.isArray(validationErrors)) {
                  errorMessage = validationErrors.join('. ');
                }
              }
            } catch {
              // Use default error message if JSON parsing fails
            }
            break;
          case 500:
            console.error('Internal Server Error:', errorMessage);
            break;
          default:
            console.error('API Error:', errorMessage);
        }

        return {
          error: errorMessage,
          status: response.status,
        };
      }
    } catch (error) {
      console.error('Network error:', error);
      return {
        error: error instanceof Error ? error.message : 'Network error occurred',
        status: 0,
      };
    }
  }

  // Handle authentication failure
  private handleAuthenticationFailure() {
    this.clearTokens();
    // You can implement additional logic here like redirecting to login page
    // For now, we'll just clear the tokens
    console.log('Authentication failed. Tokens cleared.');
  }

  // Update configuration
  updateConfig(newConfig: Partial<ApiConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Update specific endpoint
  updateEndpoint(key: string, endpoint: string) {
    this.config.endpoints[key] = endpoint;
  }

  // Get current configuration
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  // Set tokens (useful for login)
  setTokens(accessToken: string, refreshToken?: string) {
    this.saveTokensToStorage(accessToken, refreshToken);
  }

  // Get current access token
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // GET request
  async get(endpoint: string) {
    return this.call(endpoint, 'GET');
  }

  // POST request with FormData
  async postFormData(endpoint: string, formData: FormData) {
    return this.call(endpoint, 'POST', formData);
  }

  // PUT request with FormData
  async putFormData(endpoint: string, formData: FormData) {
    return this.call(endpoint, 'PUT', formData);
  }

  // DELETE request
  async delete(endpoint: string) {
    return this.call(endpoint, 'DELETE');
  }
}

// API Base URL and Endpoints
export const API_BASE_URL = 'https://5dtrtpzg-7261.inc1.devtunnels.ms';

export const API_ENDPOINTS = {
  // Authentication endpoints
  LOGIN: '/api/User/login',
  SIGNUP: '/api/User/restaurant-owner',
  REFRESH_TOKEN: '/api/auth/refresh',
  
  // User endpoints
  USERS: '/api/User/users',
  USER_BY_ID: '/api/User/user/{id}',
  CREATE_USER: '/api/User/user',
  UPDATE_USER: '/api/User/user',
  DELETE_USER: '/api/User/user/{id}',
  
  // Generic endpoints
  ROLES: '/api/Generic/roles',
  ENTITIES_AND_BRANCHES: '/api/Generic/entities-and-branches',
  CURRENCIES: '/api/Generic/currencies',
  TIMEZONES: '/api/Generic/timezones',
  ORDER_STATUS_TYPES: '/api/Generic/orderstatustype',
  
  // Entity endpoints
  ENTITIES: '/api/Entity',
  ENTITY_BY_ID: '/api/Entity/{id}',
  ENTITY_PRIMARY_COLOR: '/api/Entity/{id}/primary-color',
  
  // Branch endpoints
  BRANCHES: '/api/Branch',
  BRANCH_BY_ID: '/api/Branch/{id}',
  BRANCHES_BY_ENTITY: '/api/Branch/entity/{entityId}',
  BRANCH_CONFIGURATION: '/api/Branch/{id}/configuration',
  
  // Location/Table endpoints
  LOCATIONS: '/api/Location',
  LOCATION_BY_ID: '/api/Location/{id}',
  LOCATIONS_BY_BRANCH: '/api/Location/branch/{branchId}',
  
  // Menu endpoints
  MENU_ITEMS: '/api/menu-items',
  CREATE_MENU_ITEM: '/api/MenuItem',
  UPDATE_MENU_ITEM: '/api/MenuItem/{id}',
  DELETE_MENU_ITEM: '/api/MenuItem/{id}',
  
  // Order endpoints
  ORDERS: '/api/orders',
  ORDER_BY_ID: '/api/orders/{id}',
  ORDERS_BY_BRANCH: '/api/Order/ByBranch',
  ordersByBranch: '/api/Order/ByBranch',
  UPDATE_ORDER_STATUS: '/api/Order',
  
  // MenuCategory endpoints
  MENU_CATEGORIES: '/api/MenuCategory',
  MENU_CATEGORY_BY_ID: '/api/MenuCategory/{id}',
  MENU_CATEGORIES_BY_BRANCH: '/api/MenuCategory/branch/{branchId}',

  // SubMenu endpoints
  SUBMENUS: '/api/SubMenuItems',
  SUBMENU_BY_ID: '/api/SubMenuItems/{id}',
  SUBMENUS_BY_BRANCH: '/api/SubMenuItems/branch/{branchId}',
  SUBMENUS_SIMPLE_BY_BRANCH: '/api/SubMenuItems/branch/{branchId}/simple',
  UPDATE_SUBMENU: '/api/SubMenuItems/{id}',
  DELETE_SUBMENU: '/api/SubMenuItems/{id}',

  // MenuItem endpoints
  MENU_ITEMS_BY_BRANCH: '/api/MenuItem/branch/{branchId}',
  MENU_ITEMS_SIMPLE_BY_BRANCH: '/api/MenuItem/branch/{branchId}/simple',
  MENU_ITEM_BY_ID: '/api/MenuItem/{id}',
  UPDATE_MENU_ITEM_STOCK_STATUS: '/api/MenuItem/{id}/stock-status',

  // Deals endpoints
  DEALS: '/api/Deals',
  DEAL_BY_ID: '/api/Deals/{id}',
  DEALS_BY_BRANCH: '/api/Deals/branch/{branchId}',
  DEALS_SIMPLE_BY_BRANCH: '/api/Deals/branch/{branchId}/simple',
  
  // Discount endpoints
  DISCOUNTS: '/api/Discount',
  DISCOUNT_BY_ID: '/api/Discount/{id}',
  DISCOUNTS_BY_BRANCH: '/api/Discount/branch/{branchId}',
  DISCOUNTS_SIMPLE_BY_BRANCH: '/api/Discount/branch/{branchId}/simple',
  BULK_DISCOUNT_DEALS: '/api/Deals/bulk-discount',
  BULK_DISCOUNT_MENU: '/api/MenuItem/bulk-discount',
  
  // Services endpoints
  SERVICES_BY_TYPE: '/api/Generic/services/{entityType}',
  BRANCH_SERVICES: '/api/BranchServices/{branchId}/services',
  
  // Other endpoints
  ANALYTICS: '/api/analytics',
  FEEDBACKS: '/api/feedbacks',
  TICKETS: '/api/tickets',
};

// Default API configuration
export const defaultApiConfig: ApiConfig = {
  baseUrl: API_BASE_URL,
  headers: {
    'Accept': '*/*',
    // No Content-Type header here - let API repository handle it dynamically
  },
  endpoints: {
    // Authentication endpoints
    login: API_ENDPOINTS.LOGIN,
    signup: API_ENDPOINTS.SIGNUP,
    refreshToken: API_ENDPOINTS.REFRESH_TOKEN,
    
    // User endpoints
    getUsers: API_ENDPOINTS.USERS,
    getUserById: API_ENDPOINTS.USER_BY_ID,
    createUser: API_ENDPOINTS.CREATE_USER,
    updateUser: API_ENDPOINTS.UPDATE_USER,
    deleteUser: API_ENDPOINTS.DELETE_USER,
    
    // Generic endpoints
    getRoles: API_ENDPOINTS.ROLES,
    getEntitiesAndBranches: API_ENDPOINTS.ENTITIES_AND_BRANCHES,
    getCurrencies: API_ENDPOINTS.CURRENCIES,
    getTimezones: API_ENDPOINTS.TIMEZONES,
    getOrderStatusTypes: API_ENDPOINTS.ORDER_STATUS_TYPES,
    getServicesByType: API_ENDPOINTS.SERVICES_BY_TYPE,
    getBranchServices: API_ENDPOINTS.BRANCH_SERVICES,
    updateBranchServices: API_ENDPOINTS.BRANCH_SERVICES,
    
    // Entity endpoints
    getEntities: API_ENDPOINTS.ENTITIES,
    createEntity: API_ENDPOINTS.ENTITIES,
    getEntityById: API_ENDPOINTS.ENTITY_BY_ID,
    updateEntity: API_ENDPOINTS.ENTITY_BY_ID,
    deleteEntity: API_ENDPOINTS.ENTITY_BY_ID,
    getEntityPrimaryColor: API_ENDPOINTS.ENTITY_PRIMARY_COLOR,
    updateEntityPrimaryColor: API_ENDPOINTS.ENTITY_PRIMARY_COLOR,
    
    // Branch endpoints
    getBranches: API_ENDPOINTS.BRANCHES,
    getBranchesByEntity: API_ENDPOINTS.BRANCHES_BY_ENTITY,
    getBranchById: API_ENDPOINTS.BRANCH_BY_ID,
    createBranch: API_ENDPOINTS.BRANCHES,
    updateBranch: API_ENDPOINTS.BRANCH_BY_ID,
    deleteBranch: API_ENDPOINTS.BRANCH_BY_ID,
    getBranchConfiguration: API_ENDPOINTS.BRANCH_CONFIGURATION,
    updateBranchConfiguration: API_ENDPOINTS.BRANCH_CONFIGURATION,
    
    // Location/Table endpoints
    getLocations: API_ENDPOINTS.LOCATIONS,
    createLocation: API_ENDPOINTS.LOCATIONS,
    getLocationById: API_ENDPOINTS.LOCATION_BY_ID,
    getLocationsByBranch: API_ENDPOINTS.LOCATIONS_BY_BRANCH,
    updateLocation: API_ENDPOINTS.LOCATION_BY_ID,
    deleteLocation: API_ENDPOINTS.LOCATION_BY_ID,
    
    // Menu endpoints
    getMenuItems: API_ENDPOINTS.MENU_ITEMS,
    createMenuItem: API_ENDPOINTS.CREATE_MENU_ITEM,
    menuItemCreate: API_ENDPOINTS.CREATE_MENU_ITEM,
    
    // Order endpoints
    getOrders: API_ENDPOINTS.ORDERS,
    createOrder: API_ENDPOINTS.ORDERS,
    updateOrder: API_ENDPOINTS.ORDER_BY_ID,
    updateOrderStatus: API_ENDPOINTS.UPDATE_ORDER_STATUS,
    deleteOrder: API_ENDPOINTS.ORDER_BY_ID,
    getOrdersByBranch: API_ENDPOINTS.ORDERS_BY_BRANCH,
    
    // MenuCategory endpoints
    getMenuCategories: API_ENDPOINTS.MENU_CATEGORIES,
    createMenuCategory: API_ENDPOINTS.MENU_CATEGORIES,
    getMenuCategoryById: API_ENDPOINTS.MENU_CATEGORY_BY_ID,
    updateMenuCategory: API_ENDPOINTS.MENU_CATEGORY_BY_ID,
    deleteMenuCategory: API_ENDPOINTS.MENU_CATEGORY_BY_ID,
    getMenuCategoriesByBranch: API_ENDPOINTS.MENU_CATEGORIES_BY_BRANCH,

    // SubMenu endpoints
    getSubMenus: API_ENDPOINTS.SUBMENUS,
    createSubMenu: API_ENDPOINTS.SUBMENUS,
    getSubMenuById: API_ENDPOINTS.SUBMENU_BY_ID,
    updateSubMenu: API_ENDPOINTS.UPDATE_SUBMENU,
    deleteSubMenu: API_ENDPOINTS.DELETE_SUBMENU,
    getSubMenusByBranch: API_ENDPOINTS.SUBMENUS_BY_BRANCH,
    getSubMenusSimpleByBranch: API_ENDPOINTS.SUBMENUS_SIMPLE_BY_BRANCH,

    // MenuItem endpoints
    getMenuItemsByBranch: API_ENDPOINTS.MENU_ITEMS_BY_BRANCH,
    getMenuItemsSimpleByBranch: API_ENDPOINTS.MENU_ITEMS_SIMPLE_BY_BRANCH,
    getMenuItemById: API_ENDPOINTS.MENU_ITEM_BY_ID,
    updateMenuItem: API_ENDPOINTS.UPDATE_MENU_ITEM,
    deleteMenuItem: API_ENDPOINTS.DELETE_MENU_ITEM,
    updateMenuItemStockStatus: API_ENDPOINTS.UPDATE_MENU_ITEM_STOCK_STATUS,

    // Deals endpoints
    getDeals: API_ENDPOINTS.DEALS,
    createDeal: API_ENDPOINTS.DEALS,
    getDealById: API_ENDPOINTS.DEAL_BY_ID,
    updateDeal: API_ENDPOINTS.DEAL_BY_ID,
    deleteDeal: API_ENDPOINTS.DEAL_BY_ID,
    getDealsByBranch: API_ENDPOINTS.DEALS_BY_BRANCH,
    getDealsSimpleByBranch: API_ENDPOINTS.DEALS_SIMPLE_BY_BRANCH,
    
    // Discount endpoints
    getDiscounts: API_ENDPOINTS.DISCOUNTS,
    createDiscount: API_ENDPOINTS.DISCOUNTS,
    getDiscountById: API_ENDPOINTS.DISCOUNT_BY_ID,
    updateDiscount: API_ENDPOINTS.DISCOUNT_BY_ID,
    deleteDiscount: API_ENDPOINTS.DISCOUNT_BY_ID,
    getDiscountsByBranch: API_ENDPOINTS.DISCOUNTS_BY_BRANCH,
    getDiscountsSimpleByBranch: API_ENDPOINTS.DISCOUNTS_SIMPLE_BY_BRANCH,
    bulkDiscountDeals: API_ENDPOINTS.BULK_DISCOUNT_DEALS,
    bulkDiscountMenu: API_ENDPOINTS.BULK_DISCOUNT_MENU,
    
    // Other endpoints
    getAnalytics: API_ENDPOINTS.ANALYTICS,
    getFeedbacks: API_ENDPOINTS.FEEDBACKS,
    getTickets: API_ENDPOINTS.TICKETS,
  },
};

// Create singleton instance
export const apiRepository = new ApiRepository(defaultApiConfig);

// Authentication token will be set dynamically from login response
// No hardcoded tokens - the apiRepository will load tokens from localStorage automatically

// Branch API Helper Functions
export const branchApi = {
  // Get all branches by entity ID
  getBranchesByEntity: async (entityId: number): Promise<any[]> => {
    const response = await apiRepository.call('getBranchesByEntity', 'GET', undefined, {}, true, { entityId });
    return Array.isArray(response.data) ? response.data : [];
  },

  // Get branch by ID
  getBranchById: async (branchId: number) => {
    const response = await apiRepository.call('getBranchById', 'GET', undefined, {}, true, { id: branchId });
    return response.data;
  },

  // Create new branch with FormData
  createBranch: async (branchData: any, logoFile?: File, bannerFile?: File) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(branchData).forEach(key => {
      if (branchData[key] !== undefined && branchData[key] !== null) {
        formData.append(key, branchData[key].toString());
      }
    });

    // Add files if provided
    if (logoFile) {
      formData.append('RestaurantLogo', logoFile);
    }
    if (bannerFile) {
      formData.append('RestaurantBanner', bannerFile);
    }

    const response = await apiRepository.call('createBranch', 'POST', formData);
    return response.data;
  },

  // Update branch with FormData
  updateBranch: async (branchId: number, branchData: any, logoFile?: File, bannerFile?: File) => {
    console.log('updateBranch called with:', { branchId, branchData, logoFile, bannerFile });
    
    const formData = new FormData();
    
    // Add text fields - Make sure EntityId is included
    Object.keys(branchData).forEach(key => {
      if (branchData[key] !== undefined && branchData[key] !== null) {
        console.log(`Adding field ${key}:`, branchData[key]);
        formData.append(key, branchData[key].toString());
      }
    });

    // Add files if provided - for updates, these should be optional but backend requires them
    // If no new files provided, we should not include empty file fields
    if (logoFile) {
      formData.append('RestaurantLogo', logoFile);
      console.log('Added logo file to form data');
    }
    if (bannerFile) {
      formData.append('RestaurantBanner', bannerFile);
      console.log('Added banner file to form data');
    }

    console.log('Sending PUT request to update branch...');
    console.log('FormData being sent for update branch:');
    // Log formData contents for debugging
    console.log('Number of form entries:', Array.from(formData.entries()).length);
    
    const response = await apiRepository.call('updateBranch', 'PUT', formData, {}, true, { id: branchId });
    console.log('Update branch response:', response);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  },

  // Delete branch
  deleteBranch: async (branchId: number) => {
    const response = await apiRepository.call('deleteBranch', 'DELETE', undefined, {}, true, { id: branchId });
    return response.data;
  },

  // Get branch configuration
  getBranchConfiguration: async (branchId: number) => {
    const response = await apiRepository.call('getBranchConfiguration', 'GET', undefined, {}, true, { id: branchId });
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Update branch configuration
  updateBranchConfiguration: async (branchId: number, configData: any) => {
    const response = await apiRepository.call('updateBranchConfiguration', 'PUT', configData, {}, true, { id: branchId });
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },
};

// Entity API Helper Functions
export const entityApi = {
  // Get entity primary color - using generic API repository with dynamic Bearer token
  getEntityPrimaryColor: async (entityId: number) => {
    const response = await apiRepository.call('getEntityPrimaryColor', 'GET', undefined, {}, true, { id: entityId });
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Update entity primary color - using generic API repository with dynamic Bearer token
  updateEntityPrimaryColor: async (entityId: number, primaryColor: string) => {
    const requestData = { primaryColor };
    const response = await apiRepository.call('updateEntityPrimaryColor', 'PUT', requestData, {}, true, { id: entityId });
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },
};

// User API Helper Functions
export const userApi = {
  // Get users with pagination
  getUsers: async (queryString: string) => {
    // For query parameters, we need to modify the endpoint temporarily
    const originalEndpoint = apiRepository.getConfig().endpoints['getUsers'];
    apiRepository.updateEndpoint('getUsers', `${originalEndpoint}?${queryString}`);
    
    const response = await apiRepository.call('getUsers', 'GET', undefined, {}, true);
    
    // Restore original endpoint
    apiRepository.updateEndpoint('getUsers', originalEndpoint);
    
    return response;
  },

  // Get user by ID
  getUserById: async (userId: string) => {
    return await apiRepository.call('getUserById', 'GET', undefined, {}, true, { id: userId });
  },

  // Create user with FormData
  createUser: async (formData: FormData) => {
    return await apiRepository.call('createUser', 'POST', formData);
  },

  // Update user with JSON
  updateUser: async (userData: any) => {
    return await apiRepository.call('updateUser', 'PUT', userData);
  },

  // Delete user
  deleteUser: async (userId: string) => {
    return await apiRepository.call('deleteUser', 'DELETE', undefined, {}, true, { id: userId });
  },
};

// Generic API Helper Functions  
export const genericApi = {
  // Get roles
  getRoles: async () => {
    return await apiRepository.call('getRoles', 'GET', undefined, {}, false);
  },

  // Get entities and branches
  getEntitiesAndBranches: async () => {
    return await apiRepository.call('getEntitiesAndBranches', 'GET');
  },

  // Get currencies
  getCurrencies: async () => {
    return await apiRepository.call('getCurrencies', 'GET', undefined, {}, false);
  },

  // Get timezones
  getTimezones: async () => {
    return await apiRepository.call('getTimezones', 'GET', undefined, {}, false);
  },
};

// Location/Table API Helper Functions
export const locationApi = {
  // Create a new table/location
  createLocation: async (locationData: { branchId: number; name: string; capacity: number }) => {
    return await apiRepository.call('createLocation', 'POST', locationData);
  },

  // Get location by ID
  getLocationById: async (locationId: string) => {
    return await apiRepository.call('getLocationById', 'GET', undefined, {}, true, { id: locationId });
  },

  // Get locations by branch ID
  getLocationsByBranch: async (branchId: number) => {
    return await apiRepository.call('getLocationsByBranch', 'GET', undefined, {}, true, { branchId: branchId.toString() });
  },

  // Update location
  updateLocation: async (locationId: string, locationData: { branchId?: number; name?: string; capacity?: number }) => {
    return await apiRepository.call('updateLocation', 'PUT', locationData, {}, true, { id: locationId });
  },

  // Delete location
  deleteLocation: async (locationId: string) => {
    return await apiRepository.call('deleteLocation', 'DELETE', undefined, {}, true, { id: locationId });
  },
};

// Auth API Helper Functions
export const authApi = {
  // Login
  login: async (credentials: { email: string; password: string }) => {
    return await apiRepository.call('login', 'POST', credentials, undefined, false);
  },

  // Signup  
  signup: async (userData: any) => {
    return await apiRepository.call('signup', 'POST', userData, undefined, false);
  },
};

// MenuItem API Helper Functions
export const menuItemApi = {
  // Get simple menu items by branch ID (for deals)
  getSimpleMenuItemsByBranch: async (branchId: number) => {
    return await apiRepository.call('getMenuItemsSimpleByBranch', 'GET', undefined, {}, true, { branchId });
  },

  // Get detailed menu items by branch ID
  getMenuItemsByBranch: async (branchId: number) => {
    return await apiRepository.call('getMenuItemsByBranch', 'GET', undefined, {}, true, { branchId });
  },

  // Get menu item by ID
  getMenuItemById: async (menuItemId: number) => {
    return await apiRepository.call('getMenuItemById', 'GET', undefined, {}, true, { id: menuItemId });
  },
};

// SubMenuItems API Helper Functions
export const subMenuItemApi = {
  // Get simple SubMenuItems by branch ID (for modifiers)
  getSimpleSubMenuItemsByBranch: async (branchId: number) => {
    return await apiRepository.call('getSubMenusSimpleByBranch', 'GET', undefined, {}, true, { branchId });
  },

  // Get detailed SubMenuItems by branch ID
  getSubMenuItemsByBranch: async (branchId: number) => {
    return await apiRepository.call('getSubMenusByBranch', 'GET', undefined, {}, true, { branchId });
  },

  // Get SubMenuItem by ID
  getSubMenuItemById: async (subMenuItemId: number) => {
    return await apiRepository.call('getSubMenuById', 'GET', undefined, {}, true, { id: subMenuItemId });
  },

  // Update SubMenuItem
  updateSubMenuItem: async (subMenuItemId: number, subMenuItemData: { name: string; price: number }) => {
    return await apiRepository.call('updateSubMenu', 'PUT', subMenuItemData, {}, true, { id: subMenuItemId });
  },

  // Delete SubMenuItem
  deleteSubMenuItem: async (subMenuItemId: number) => {
    return await apiRepository.call('deleteSubMenu', 'DELETE', undefined, {}, true, { id: subMenuItemId });
  },
};

// Deals API Helper Functions
export const dealsApi = {
  // Create a new deal
  createDeal: async (dealData: any) => {
    return await apiRepository.call('createDeal', 'POST', dealData);
  },

  // Get deals by branch with pagination (using Generic API repository)
  getDealsByBranch: async (branchId: number, queryParams?: { [key: string]: string }) => {
    const response = await apiRepository.call<{
      items: Deal[];
      pageNumber: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      hasPrevious: boolean;
      hasNext: boolean;
    }>(
      'getDealsByBranch',
      'GET',
      undefined,
      queryParams,
      true,
      { branchId }
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  },

  // Get all deals with pagination (legacy method - kept for compatibility)
  getDeals: async (branchId: number, queryString?: string) => {
    if (!branchId) {
      throw new Error('Branch ID is required');
    }
    const endpoint = queryString 
      ? `/api/Deals/branch/${branchId}?${queryString}`
      : `/api/Deals/branch/${branchId}`;
    return await apiRepository.get(endpoint);
  },

  // Get deal by ID (using Generic API repository)
  getDealById: async (dealId: number) => {
    const response = await apiRepository.call<Deal>(
      'getDealById',
      'GET',
      undefined,
      {},
      true,
      { id: dealId }
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  },

  // Update deal (using Generic API repository)
  updateDeal: async (dealId: number, dealData: any) => {
    const response = await apiRepository.call<void>(
      'updateDeal',
      'PUT',
      dealData,
      {},
      true,
      { id: dealId }
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  },

  // Delete deal (using Generic API repository)
  deleteDeal: async (dealId: number) => {
    const response = await apiRepository.call<void>(
      'deleteDeal',
      'DELETE',
      undefined,
      {},
      true,
      { id: dealId }
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  },
};

// Discount API endpoints using Generic API repository with new pagination format
export const discountsApi = {
  // Get discounts by branch with pagination (matching new API format)
  getDiscountsByBranch: async (branchId: number, queryParams?: { 
    PageNumber?: number; 
    PageSize?: number; 
    SortBy?: string; 
    IsAscending?: boolean; 
    SearchTerm?: string; 
  }) => {
    const params = new URLSearchParams({
      PageNumber: (queryParams?.PageNumber || 1).toString(),
      PageSize: (queryParams?.PageSize || 10).toString(),
    });

    if (queryParams?.SortBy) {
      params.append('SortBy', queryParams.SortBy);
    }
    
    if (queryParams?.IsAscending !== undefined) {
      params.append('IsAscending', queryParams.IsAscending.toString());
    }
    
    if (queryParams?.SearchTerm) {
      params.append('SearchTerm', queryParams.SearchTerm);
    }

    // For query parameters, modify the endpoint temporarily
    const originalEndpoint = apiRepository.getConfig().endpoints['getDiscountsByBranch'];
    apiRepository.updateEndpoint('getDiscountsByBranch', `${originalEndpoint}?${params.toString()}`);
    
    const response = await apiRepository.call('getDiscountsByBranch', 'GET', undefined, {}, true, { branchId });
    
    // Restore original endpoint
    apiRepository.updateEndpoint('getDiscountsByBranch', originalEndpoint);
    
    return response;
  },

  // Get discount by ID
  getDiscountById: async (discountId: number) => {
    const response = await apiRepository.call('getDiscountById', 'GET', undefined, {}, true, { id: discountId });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  },

  // Create discount using Generic API repository
  createDiscount: async (discountData: any) => {
    const response = await apiRepository.call('createDiscount', 'POST', discountData, {}, true);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response;
  },

  // Update discount using Generic API repository
  updateDiscount: async (discountId: number, discountData: any) => {
    const response = await apiRepository.call('updateDiscount', 'PUT', discountData, {}, true, { id: discountId });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response;
  },

  // Delete discount using Generic API repository
  deleteDiscount: async (discountId: number) => {
    const response = await apiRepository.call('deleteDiscount', 'DELETE', undefined, {}, true, { id: discountId });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response;
  },

  // Get simple menu items by branch using Generic API repository
  getMenuItemsSimpleByBranch: async (branchId: number) => {
    const response = await apiRepository.call('getMenuItemsSimpleByBranch', 'GET', undefined, {}, true, { branchId });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  },

  // Get simple deals by branch using Generic API repository
  getDealsSimpleByBranch: async (branchId: number) => {
    const response = await apiRepository.call('getDealsSimpleByBranch', 'GET', undefined, {}, true, { branchId });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  },

  // Get simple discounts by branch using Generic API repository
  getDiscountsSimpleByBranch: async (branchId: number) => {
    const response = await apiRepository.call('getDiscountsSimpleByBranch', 'GET', undefined, {}, true, { branchId });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  },

  // Apply bulk discount to deals
  applyBulkDiscountToDeals: async (dealIds: number[], discountId: number) => {
    const response = await apiRepository.call(
      'bulkDiscountDeals',
      'PUT',
      {
        dealIds,
        discountId
      },
      {},
      true
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response;
  },

  // Apply bulk discount to menu items
  applyBulkDiscountToMenu: async (menuItemIds: number[], discountId: number) => {
    const response = await apiRepository.call(
      'bulkDiscountMenu',
      'PUT',
      {
        menuItemIds,
        discountId
      },
      {},
      true
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response;
  },
};

// Orders API Helper Functions
export const ordersApi = {
  // Get orders by branch with pagination using Generic API repository
  getOrdersByBranch: async (
    branchId: number,
    pageNumber: number = 1,
    pageSize: number = 10,
    sortBy: string = 'createdAt',
    isAscending: boolean = false,
    searchTerm: string = ''
  ) => {
    const params = new URLSearchParams({
      BranchId: branchId.toString(),
      PageNumber: pageNumber.toString(),
      PageSize: pageSize.toString(),
      SortBy: sortBy,
      IsAscending: isAscending.toString(),
    });

    if (searchTerm) {
      params.append('SearchTerm', searchTerm);
    }

    // For query parameters, modify the endpoint temporarily
    const originalEndpoint = apiRepository.getConfig().endpoints['getOrdersByBranch'];
    apiRepository.updateEndpoint('getOrdersByBranch', `${originalEndpoint}?${params.toString()}`);
    
    const response = await apiRepository.call<PaginationResponse<DetailedOrder>>(
      'getOrdersByBranch',
      'GET',
      undefined,
      {},
      true
    );
    
    // Restore original endpoint
    apiRepository.updateEndpoint('getOrdersByBranch', originalEndpoint);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data;
  },

  // Get order status types from API
  getOrderStatusTypes: async () => {
    const response = await apiRepository.call<Array<{id: number, name: string}>>(
      'getOrderStatusTypes',
      'GET'
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data || [];
  },

  // Update order status
  updateOrderStatus: async (orderId: number, statusId: number, comments: string = 'No') => {
    const response = await apiRepository.call<{orderId: number, orderStatus: string}>(
      'updateOrderStatus',
      'PUT',
      {
        orderId: orderId,
        status: statusId,
        comments: comments
      }
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },
};

// Services API Helper Functions
export const servicesApi = {
  // Get services by entity type (2 for restaurant)
  getServicesByType: async (entityType: number): Promise<Service[]> => {
    const response = await apiRepository.call<Service[]>(
      'getServicesByType',
      'GET',
      undefined,
      {},
      true,
      { entityType }
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || [];
  },

  // Get branch services
  getBranchServices: async (branchId: number): Promise<BranchService[]> => {
    const response = await apiRepository.call<BranchService[]>(
      'getBranchServices',
      'GET',
      undefined,
      {},
      true,
      { branchId }
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || [];
  },

  // Update branch services (PUT with array of service objects with price)
  updateBranchServices: async (branchId: number, services: Array<{ serviceId: number; price: number }>) => {
    const response = await apiRepository.call(
      'updateBranchServices',
      'PUT',
      services,
      {},
      true,
      { branchId }
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response;
  },
};

// Helper to get full URL for images
export const getImageUrl = (relativePath: string): string => {
  if (!relativePath) return '';
  return `${API_BASE_URL}/${relativePath}`;
};