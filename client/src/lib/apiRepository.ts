import {
  Deal,
  Service,
  BranchService,
  DetailedOrder,
  Recipe,
  RecipeDetail,
  InsertRecipe,
  MenuCategory,
} from "../types/schema";
import { PaginationResponse } from "../types/pagination";
import { signalRService } from "../services/signalRService";

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
    this.accessToken = localStorage.getItem("access_token");
    this.refreshToken = localStorage.getItem("refresh_token");
  }

  // Save tokens to localStorage
  private saveTokensToStorage(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    localStorage.setItem("access_token", accessToken);

    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem("refresh_token", refreshToken);
    }
  }

  // Clear tokens from localStorage
  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}${this.config.endpoints.refreshToken}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.config.headers,
          },
          body: JSON.stringify({
            refreshToken: this.refreshToken,
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        this.saveTokensToStorage(data.accessToken, data.refreshToken);
        return true;
      } else {
        this.clearTokens();
        return false;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.clearTokens();
      return false;
    }
  }

  // Generic API call method with support for FormData
  async call<T>(
    endpointKey: string,
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" = "GET",
    data?: any,
    customHeaders?: { [key: string]: string },
    requiresAuth: boolean = true,
    pathParams?: { [key: string]: string | number },
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
      accept: "*/*",
      ...this.config.headers,
      ...customHeaders,
    };

    // Don't set Content-Type for FormData - browser will set it with boundary
    const isFormData = data instanceof FormData;
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    } else {
      // Explicitly remove Content-Type for FormData to let browser set it with boundary
      delete headers["Content-Type"];
      console.log(
        "FormData detected - Content-Type header removed for multipart/form-data",
      );
    }

    // Add authorization header if required and token exists
    if (requiresAuth && this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
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
        console.log("Token expired, attempting to refresh...");

        const refreshSuccess = await this.refreshAccessToken();
        if (refreshSuccess) {
          // Update authorization header with new token
          headers["Authorization"] = `Bearer ${this.accessToken}`;
          requestOptions.headers = headers;

          // Retry the original request
          response = await fetch(url, requestOptions);
        } else {
          // Refresh failed, redirect to login
          await this.handleAuthenticationFailure();
          return {
            error: "Authentication failed. Please login again.",
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
              if (
                response.status === 422 &&
                parsedError.errors &&
                parsedError.errors["Validation Error"]
              ) {
                const validationErrors = parsedError.errors["Validation Error"];
                if (Array.isArray(validationErrors)) {
                  errorMessage = validationErrors.join(". ");
                } else {
                  errorMessage = validationErrors;
                }
              } else {
                errorMessage =
                  parsedError.message ||
                  parsedError.error ||
                  parsedError.title ||
                  errorData;
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
            console.error("Bad Request:", errorMessage);
            break;
          case 401:
            console.error("Unauthorized:", errorMessage);
            await this.handleAuthenticationFailure();
            break;
          case 403:
            console.error("Forbidden:", errorMessage);
            break;
          case 404:
            console.error("Not Found:", errorMessage);
            break;
          case 422:
            console.error("Validation Error:", errorMessage);
            // Handle 422 validation errors with array processing
            try {
              const errorData = await response.clone().json();
              if (errorData.errors && errorData.errors["Validation Error"]) {
                const validationErrors = errorData.errors["Validation Error"];
                if (Array.isArray(validationErrors)) {
                  errorMessage = validationErrors.join(". ");
                }
              }
            } catch {
              // Use default error message if JSON parsing fails
            }
            break;
          case 500:
            console.error("Internal Server Error:", errorMessage);
            break;
          default:
            console.error("API Error:", errorMessage);
        }

        return {
          error: errorMessage,
          status: response.status,
        };
      }
    } catch (error) {
      console.error("Network error:", error);
      return {
        error:
          error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
    }
  }

  // Handle authentication failure
  private async handleAuthenticationFailure() {
    // Disconnect from SignalR first to avoid connection issues
    try {
      await signalRService.disconnect();
      console.log("SignalR disconnected due to authentication failure");
    } catch (error) {
      console.error("Error disconnecting SignalR on auth failure:", error);
    }

    this.clearTokens();
    // You can implement additional logic here like redirecting to login page
    // For now, we'll just clear the tokens
    console.log("Authentication failed. Tokens cleared.");
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

  // Clear tokens (useful for logout)
  logout() {
    this.clearTokens();
  }

  // Get current access token
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // SignalR Methods
  // Connect to SignalR using current access token
  async connectSignalR(): Promise<void> {
    if (!this.accessToken) {
      throw new Error("No access token available for SignalR connection");
    }

    try {
      await signalRService.connect(() => this.getAccessToken());
    } catch (error) {
      console.error("Failed to connect to SignalR:", error);
      throw error;
    }
  }

  // Disconnect from SignalR
  async disconnectSignalR(): Promise<void> {
    try {
      await signalRService.disconnect();
    } catch (error) {
      console.error("Error disconnecting from SignalR:", error);
    }
  }

  // Check SignalR connection status
  isSignalRConnected(): boolean {
    return signalRService.isConnected();
  }

  // Get SignalR connection state
  getSignalRConnectionState() {
    return signalRService.getConnectionState();
  }

  // GET request
  async get(endpoint: string) {
    return this.call(endpoint, "GET");
  }

  // POST request with FormData
  async postFormData(endpoint: string, formData: FormData) {
    return this.call(endpoint, "POST", formData);
  }

  // PUT request with FormData
  async putFormData(endpoint: string, formData: FormData) {
    return this.call(endpoint, "PUT", formData);
  }

  // DELETE request
  async delete(endpoint: string) {
    return this.call(endpoint, "DELETE");
  }
}

// Import environment configuration
import { apiBaseUrl } from "@/config/environment";

// API Base URL and Endpoints
export const API_BASE_URL = apiBaseUrl;

export const API_ENDPOINTS = {
  // Authentication endpoints
  LOGIN: "/api/User/login",
  SIGNUP: "/api/User/restaurant-owner",
  REFRESH_TOKEN: "/api/auth/refresh",
  FORGOT_PASSWORD: "/api/User/forgot-password",
  RESET_PASSWORD: "/api/User/reset-password",

  // User endpoints
  USERS: "/api/User/users",
  USER_BY_ID: "/api/User/user/{id}",
  CREATE_USER: "/api/User/user",
  UPDATE_USER: "/api/User/user",
  DELETE_USER: "/api/User/user/{id}",
  CHEF_BRANCH: "/api/User/chef/branch",
  UPDATE_USER_PROFILE: "/api/User/profile",

  // Generic endpoints
  ROLES: "/api/Generic/roles",
  ENTITIES_AND_BRANCHES: "/api/Generic/entities-and-branches",
  CURRENCIES: "/api/Generic/currencies",
  TIMEZONES: "/api/Generic/timezones",
  ORDER_STATUS_TYPES: "/api/Generic/orderstatustype",
  RESERVATION_STATUS_TYPES: "/api/Generic/reservationstatustype",
  ALLERGENS: "/api/Generic/allergens",
  BUG_SEVERITIES: "/api/Generic/bug-severities",
  BUG_CATEGORIES: "/api/Generic/bug-categories",

  // Entity endpoints
  ENTITIES: "/api/Entity",
  ENTITY_BY_ID: "/api/Entity/{id}",
  ENTITY_PRIMARY_COLOR: "/api/Entity/{id}/primary-color",

  // Branch endpoints
  BRANCHES: "/api/Branch",
  BRANCH_BY_ID: "/api/Branch/{id}",
  BRANCHES_BY_ENTITY: "/api/Branch/entity/{entityId}",
  BRANCH_CONFIGURATION: "/api/Branch/{id}/configuration",

  // Location/Table endpoints
  LOCATIONS: "/api/Location",
  LOCATION_BY_ID: "/api/Location/{id}",
  LOCATIONS_BY_BRANCH: "/api/Location/branch/{branchId}",

  // Menu endpoints
  MENU_ITEMS: "/api/menu-items",
  CREATE_MENU_ITEM: "/api/MenuItem",
  UPDATE_MENU_ITEM: "/api/MenuItem/{id}",
  DELETE_MENU_ITEM: "/api/MenuItem/{id}",

  // Inventory endpoints
  INVENTORY_CATEGORIES: "/api/inventory/categories",
  INVENTORY_CATEGORIES_SIMPLE: "/api/inventory/categories/simple/{branchId}",
  INVENTORY_CATEGORY_BY_ID: "/api/inventory/categories/{id}",
  INVENTORY_SUPPLIERS: "/api/inventory/suppliers",
  INVENTORY_SUPPLIER_BY_ID: "/api/inventory/suppliers/{id}",
  INVENTORY_ITEMS: "/api/inventory/items",
  INVENTORY_ITEMS_BY_BRANCH: "/api/inventory/items/branch/{branchId}",
  INVENTORY_ITEMS_SIMPLE_BY_BRANCH:
    "/api/inventory/items/branch/simple/{branchId}",
  INVENTORY_ITEM_BY_ID: "/api/inventory/items/{id}",

  // Inventory Stock endpoints
  INVENTORY_STOCK_BY_BRANCH: "/api/inventory/branch/{branchId}/stock",
  INVENTORY_STOCK_UPDATE: "/api/inventory/branch/{branchId}/stock/update",
  INVENTORY_LOW_STOCK_BY_BRANCH: "/api/inventory/branch/{branchId}/low-stock",

  // Inventory Wastage endpoints
  INVENTORY_WASTAGE_CREATE: "/api/inventory/wastage",
  INVENTORY_WASTAGE_BY_BRANCH: "/api/inventory/wastage",

  // Utility Expense endpoints
  UTILITY_EXPENSE_CREATE: "/api/facilityutilityrecords",
  UTILITY_EXPENSE_BY_BRANCH: "/api/facilityutilityrecords/branch/{branchId}",
  UTILITY_EXPENSE_BY_ID: "/api/facilityutilityrecords/{id}",
  UTILITY_EXPENSE_UPDATE: "/api/facilityutilityrecords/{id}",
  UTILITY_EXPENSE_DELETE: "/api/facilityutilityrecords/{id}",

  // Purchase Order endpoints
  PURCHASE_ORDERS: "/api/inventory/purchase-orders",
  PURCHASE_ORDERS_BY_BRANCH: "/api/inventory/purchase-orders/branch/{branchId}",
  PURCHASE_ORDER_BY_ID: "/api/inventory/purchase-orders/{id}",
  PURCHASE_ORDER_RECEIVE: "/api/inventory/purchase-orders/{id}/receive",
  PURCHASE_ORDER_CANCEL: "/api/inventory/purchase-orders/{id}/cancel",

  // Recipe endpoints
  RECIPES: "/api/inventory/recipes",
  RECIPE_BY_ID: "/api/inventory/recipes/{id}",
  MENU_ITEM_SEARCH: "/api/MenuItem/search/{branchId}",

  // Order endpoints
  ORDERS: "/api/orders",
  ORDER_BY_ID: "/api/orders/{id}",
  ORDERS_BY_BRANCH: "/api/Order/ByBranch",
  ordersByBranch: "/api/Order/ByBranch",
  UPDATE_ORDER_STATUS: "/api/Order",

  // MenuCategory endpoints
  MENU_CATEGORIES: "/api/MenuCategory",
  MENU_CATEGORY_BY_ID: "/api/MenuCategory/{id}",
  MENU_CATEGORIES_BY_BRANCH: "/api/MenuCategory/branch/{branchId}",
  MENU_CATEGORIES_SIMPLE_BY_BRANCH:
    "/api/MenuCategory/GetBranchById/{branchId}",

  // SubMenu endpoints
  SUBMENUS: "/api/SubMenuItems",
  SUBMENU_BY_ID: "/api/SubMenuItems/{id}",
  SUBMENUS_BY_BRANCH: "/api/SubMenuItems/branch/{branchId}",
  SUBMENUS_SIMPLE_BY_BRANCH: "/api/SubMenuItems/branch/{branchId}/simple",
  UPDATE_SUBMENU: "/api/SubMenuItems/{id}",
  DELETE_SUBMENU: "/api/SubMenuItems/{id}",

  // MenuItem endpoints
  MENU_ITEMS_BY_BRANCH: "/api/MenuItem/branch/{branchId}",
  MENU_ITEMS_SIMPLE_BY_BRANCH: "/api/MenuItem/branch/{branchId}/simple",
  MENU_ITEM_BY_ID: "/api/MenuItem/{id}",
  UPDATE_MENU_ITEM_STOCK_STATUS: "/api/MenuItem/{id}/stock-status",

  // Deals endpoints
  DEALS: "/api/Deals",
  DEAL_BY_ID: "/api/Deals/{id}",
  DEALS_BY_BRANCH: "/api/Deals/branch/{branchId}",
  DEALS_SIMPLE_BY_BRANCH: "/api/Deals/branch/{branchId}/simple",

  // Discount endpoints
  DISCOUNTS: "/api/Discount",
  DISCOUNT_BY_ID: "/api/Discount/{id}",
  DISCOUNTS_BY_BRANCH: "/api/Discount/branch/{branchId}",
  DISCOUNTS_SIMPLE_BY_BRANCH: "/api/Discount/branch/{branchId}/simple",
  BULK_DISCOUNT_DEALS: "/api/Deals/bulk-discount",
  BULK_DISCOUNT_MENU: "/api/MenuItem/bulk-discount",

  // Services endpoints
  SERVICES_BY_TYPE: "/api/Generic/services/{entityType}",
  BRANCH_SERVICES: "/api/BranchServices/{branchId}/services",

  // Subscription endpoints
  SUBSCRIPTIONS_BY_BRANCH: "/api/Subscriptions/subscriptionsByBranch",
  APPLY_SUBSCRIPTION: "/api/Subscriptions/apply",
  CURRENT_SUBSCRIPTION: "/api/Subscriptions/current",
  CALCULATE_PRORATED_AMOUNT: "/api/Subscriptions/calculate-prorated-amount",
  CHANGE_SUBSCRIPTION: "/api/Subscriptions/change",
  CANCEL_SUBSCRIPTION: "/api/Subscriptions/cancel",
  UPLOAD_PAYMENT_PROOF: "/api/Subscriptions/upload-proof",

  // Reservation endpoints
  RESERVATIONS_BY_BRANCH: "/api/Reservations/branch/{branchId}",
  RESERVATION_BY_ID: "/api/Reservations/{id}",
  RESERVATION_ACTION_UPDATE: "/api/Reservations/{id}/action",
  RESERVATIONS: "/api/Reservations",

  // Other endpoints
  ANALYTICS: "/api/analytics",
  FEEDBACKS: "/api/feedbacks",
  VENDOR_DASHBOARD_FEEDBACKS: "/api/VendorDashboard/feedbacks",
  TICKETS: "/api/tickets",

  // Issues Reporting endpoints
  ISSUES_REPORTING: "/api/IssuesReporting",
  ISSUES_REPORTING_BY_ID: "/api/IssuesReporting/{id}",
  ISSUES_REPORTING_PAGED: "/api/IssuesReporting/GetIssuesReporting",
};

// Default API configuration
export const defaultApiConfig: ApiConfig = {
  baseUrl: API_BASE_URL,
  headers: {
    Accept: "*/*",
    // No Content-Type header here - let API repository handle it dynamically
  },
  endpoints: {
    // Authentication endpoints
    login: API_ENDPOINTS.LOGIN,
    signup: API_ENDPOINTS.SIGNUP,
    refreshToken: API_ENDPOINTS.REFRESH_TOKEN,
    forgotPassword: API_ENDPOINTS.FORGOT_PASSWORD,
    resetPassword: API_ENDPOINTS.RESET_PASSWORD,

    // User endpoints
    getUsers: API_ENDPOINTS.USERS,
    getUserById: API_ENDPOINTS.USER_BY_ID,
    createUser: API_ENDPOINTS.CREATE_USER,
    updateUser: API_ENDPOINTS.UPDATE_USER,
    deleteUser: API_ENDPOINTS.DELETE_USER,
    getChefBranch: API_ENDPOINTS.CHEF_BRANCH,
    updateUserProfile: API_ENDPOINTS.UPDATE_USER_PROFILE,

    // Generic endpoints
    getRoles: API_ENDPOINTS.ROLES,
    getEntitiesAndBranches: API_ENDPOINTS.ENTITIES_AND_BRANCHES,
    getCurrencies: API_ENDPOINTS.CURRENCIES,
    getTimezones: API_ENDPOINTS.TIMEZONES,
    getOrderStatusTypes: API_ENDPOINTS.ORDER_STATUS_TYPES,
    getReservationStatusTypes: API_ENDPOINTS.RESERVATION_STATUS_TYPES,
    getAllergens: API_ENDPOINTS.ALLERGENS,
    getBugSeverities: API_ENDPOINTS.BUG_SEVERITIES,
    getBugCategories: API_ENDPOINTS.BUG_CATEGORIES,
    getServicesByType: API_ENDPOINTS.SERVICES_BY_TYPE,
    getBranchServices: API_ENDPOINTS.BRANCH_SERVICES,
    updateBranchServices: API_ENDPOINTS.BRANCH_SERVICES,

    // Subscription endpoints
    getSubscriptionsByBranch: API_ENDPOINTS.SUBSCRIPTIONS_BY_BRANCH,
    applySubscription: API_ENDPOINTS.APPLY_SUBSCRIPTION,
    getCurrentSubscription: API_ENDPOINTS.CURRENT_SUBSCRIPTION,
    calculateProratedAmount: API_ENDPOINTS.CALCULATE_PRORATED_AMOUNT,
    changeSubscription: API_ENDPOINTS.CHANGE_SUBSCRIPTION,
    cancelSubscription: API_ENDPOINTS.CANCEL_SUBSCRIPTION,
    uploadPaymentProof: API_ENDPOINTS.UPLOAD_PAYMENT_PROOF,

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
    getOrderById: API_ENDPOINTS.ORDER_BY_ID,
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
    getMenuCategoriesSimpleByBranch:
      API_ENDPOINTS.MENU_CATEGORIES_SIMPLE_BY_BRANCH,

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

    // Inventory endpoints
    getInventoryCategories: API_ENDPOINTS.INVENTORY_CATEGORIES,
    getInventoryCategoriesSimple: API_ENDPOINTS.INVENTORY_CATEGORIES_SIMPLE,
    createInventoryCategory: API_ENDPOINTS.INVENTORY_CATEGORIES,
    deleteInventoryCategory: API_ENDPOINTS.INVENTORY_CATEGORY_BY_ID,
    getInventorySuppliers: API_ENDPOINTS.INVENTORY_SUPPLIERS,
    getInventorySupplierById: API_ENDPOINTS.INVENTORY_SUPPLIER_BY_ID,
    createInventorySupplier: API_ENDPOINTS.INVENTORY_SUPPLIERS,
    updateInventorySupplier: API_ENDPOINTS.INVENTORY_SUPPLIER_BY_ID,
    deleteInventorySupplier: API_ENDPOINTS.INVENTORY_SUPPLIER_BY_ID,
    getInventoryItems: API_ENDPOINTS.INVENTORY_ITEMS,
    getInventoryItemsByBranch: API_ENDPOINTS.INVENTORY_ITEMS_BY_BRANCH,
    getInventoryItemsSimpleByBranch:
      API_ENDPOINTS.INVENTORY_ITEMS_SIMPLE_BY_BRANCH,
    getInventoryItemById: API_ENDPOINTS.INVENTORY_ITEM_BY_ID,
    createInventoryItem: API_ENDPOINTS.INVENTORY_ITEMS,
    updateInventoryItem: API_ENDPOINTS.INVENTORY_ITEM_BY_ID,
    deleteInventoryItem: API_ENDPOINTS.INVENTORY_ITEM_BY_ID,

    // Inventory Stock endpoints
    getInventoryStockByBranch: API_ENDPOINTS.INVENTORY_STOCK_BY_BRANCH,
    updateInventoryStock: API_ENDPOINTS.INVENTORY_STOCK_UPDATE,
    getInventoryLowStockByBranch: API_ENDPOINTS.INVENTORY_LOW_STOCK_BY_BRANCH,

    // Inventory Wastage endpoints
    createInventoryWastage: API_ENDPOINTS.INVENTORY_WASTAGE_CREATE,
    getInventoryWastageByBranch: API_ENDPOINTS.INVENTORY_WASTAGE_BY_BRANCH,

    // Utility Expense endpoints
    createUtilityExpense: API_ENDPOINTS.UTILITY_EXPENSE_CREATE,
    getUtilityExpensesByBranch: API_ENDPOINTS.UTILITY_EXPENSE_BY_BRANCH,
    getUtilityExpenseById: API_ENDPOINTS.UTILITY_EXPENSE_BY_ID,
    updateUtilityExpense: API_ENDPOINTS.UTILITY_EXPENSE_UPDATE,
    deleteUtilityExpense: API_ENDPOINTS.UTILITY_EXPENSE_DELETE,

    // Purchase Order endpoints
    createPurchaseOrder: API_ENDPOINTS.PURCHASE_ORDERS,
    getPurchaseOrdersByBranch: API_ENDPOINTS.PURCHASE_ORDERS_BY_BRANCH,
    getPurchaseOrderById: API_ENDPOINTS.PURCHASE_ORDER_BY_ID,
    receivePurchaseOrder: API_ENDPOINTS.PURCHASE_ORDER_RECEIVE,
    cancelPurchaseOrder: API_ENDPOINTS.PURCHASE_ORDER_CANCEL,

    // Recipe endpoints
    getRecipes: API_ENDPOINTS.RECIPES,
    getRecipeById: API_ENDPOINTS.RECIPE_BY_ID,
    createRecipe: API_ENDPOINTS.RECIPES,
    updateRecipe: API_ENDPOINTS.RECIPE_BY_ID,
    deleteRecipe: API_ENDPOINTS.RECIPE_BY_ID,
    getMenuItemsSearch: API_ENDPOINTS.MENU_ITEM_SEARCH,

    // Reservation endpoints
    getReservationsByBranch: API_ENDPOINTS.RESERVATIONS_BY_BRANCH,
    getReservationById: API_ENDPOINTS.RESERVATION_BY_ID,
    updateReservationAction: API_ENDPOINTS.RESERVATION_ACTION_UPDATE,
    createReservation: API_ENDPOINTS.RESERVATIONS,
    updateReservation: API_ENDPOINTS.RESERVATION_BY_ID,
    deleteReservation: API_ENDPOINTS.RESERVATION_BY_ID,

    // Other endpoints
    getAnalytics: API_ENDPOINTS.ANALYTICS,
    getFeedbacks: API_ENDPOINTS.FEEDBACKS,
    getVendorDashboardFeedbacks: API_ENDPOINTS.VENDOR_DASHBOARD_FEEDBACKS,
    getTickets: API_ENDPOINTS.TICKETS,

    // Issues Reporting endpoints
    getIssuesReporting: API_ENDPOINTS.ISSUES_REPORTING,
    getIssuesReportingPaged: API_ENDPOINTS.ISSUES_REPORTING_PAGED,
    getIssueReportingById: API_ENDPOINTS.ISSUES_REPORTING_BY_ID,
    createIssueReport: API_ENDPOINTS.ISSUES_REPORTING,
  },
};

// Chef API Helper Functions
export const chefApi = {
  // Get branch ID for chef user
  getChefBranch: async (): Promise<{ branchId: number }> => {
    const response = await apiRepository.call<{ branchId: number }>(
      "getChefBranch",
      "GET",
    );

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error("Failed to fetch chef branch");
    }

    return response.data;
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
    const response = await apiRepository.call(
      "getBranchesByEntity",
      "GET",
      undefined,
      {},
      true,
      { entityId },
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  // Get branch by ID
  getBranchById: async (branchId: number) => {
    const response = await apiRepository.call(
      "getBranchById",
      "GET",
      undefined,
      {},
      true,
      { id: branchId },
    );
    return response.data;
  },

  // Create new branch with FormData
  createBranch: async (branchData: any, logoFile?: File, bannerFile?: File) => {
    const formData = new FormData();

    // Add text fields
    Object.keys(branchData).forEach((key) => {
      if (branchData[key] !== undefined && branchData[key] !== null) {
        formData.append(key, branchData[key].toString());
      }
    });

    // Add files if provided
    if (logoFile) {
      formData.append("RestaurantLogo", logoFile);
    }
    if (bannerFile) {
      formData.append("RestaurantBanner", bannerFile);
    }

    const response = await apiRepository.call("createBranch", "POST", formData);
    return response.data;
  },

  // Update branch with FormData
  updateBranch: async (
    branchId: number,
    branchData: any,
    logoFile?: File,
    bannerFile?: File,
  ) => {
    console.log("updateBranch called with:", {
      branchId,
      branchData,
      logoFile,
      bannerFile,
    });

    const formData = new FormData();

    // Add text fields - Make sure EntityId is included
    Object.keys(branchData).forEach((key) => {
      if (branchData[key] !== undefined && branchData[key] !== null) {
        console.log(`Adding field ${key}:`, branchData[key]);
        formData.append(key, branchData[key].toString());
      }
    });

    // Add files if provided - for updates, these should be optional but backend requires them
    // If no new files provided, we should not include empty file fields
    if (logoFile) {
      formData.append("RestaurantLogo", logoFile);
      console.log("Added logo file to form data");
    }
    if (bannerFile) {
      formData.append("RestaurantBanner", bannerFile);
      console.log("Added banner file to form data");
    }

    console.log("Sending PUT request to update branch...");
    console.log("FormData being sent for update branch:");
    // Log formData contents for debugging
    console.log(
      "Number of form entries:",
      Array.from(formData.entries()).length,
    );

    const response = await apiRepository.call(
      "updateBranch",
      "PUT",
      formData,
      {},
      true,
      { id: branchId },
    );
    console.log("Update branch response:", response);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Delete branch
  deleteBranch: async (branchId: number) => {
    const response = await apiRepository.call(
      "deleteBranch",
      "DELETE",
      undefined,
      {},
      true,
      { id: branchId },
    );
    return response.data;
  },

  // Get branch configuration
  getBranchConfiguration: async (branchId: number) => {
    const response = await apiRepository.call(
      "getBranchConfiguration",
      "GET",
      undefined,
      {},
      true,
      { id: branchId },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Update branch configuration
  updateBranchConfiguration: async (branchId: number, configData: any) => {
    const response = await apiRepository.call(
      "updateBranchConfiguration",
      "PUT",
      configData,
      {},
      true,
      { id: branchId },
    );
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
    const response = await apiRepository.call(
      "getEntityPrimaryColor",
      "GET",
      undefined,
      {},
      true,
      { id: entityId },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Update entity primary color - using generic API repository with dynamic Bearer token
  updateEntityPrimaryColor: async (entityId: number, primaryColor: string) => {
    const requestData = { primaryColor };
    const response = await apiRepository.call(
      "updateEntityPrimaryColor",
      "PUT",
      requestData,
      {},
      true,
      { id: entityId },
    );
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
    const originalEndpoint = apiRepository.getConfig().endpoints["getUsers"];
    apiRepository.updateEndpoint(
      "getUsers",
      `${originalEndpoint}?${queryString}`,
    );

    const response = await apiRepository.call(
      "getUsers",
      "GET",
      undefined,
      {},
      true,
    );

    // Restore original endpoint
    apiRepository.updateEndpoint("getUsers", originalEndpoint);

    return response;
  },

  // Get user by ID
  getUserById: async (userId: string) => {
    return await apiRepository.call("getUserById", "GET", undefined, {}, true, {
      id: userId,
    });
  },

  // Create user with FormData
  createUser: async (formData: FormData) => {
    return await apiRepository.call("createUser", "POST", formData);
  },

  // Update user with JSON
  updateUser: async (userData: any) => {
    return await apiRepository.call("updateUser", "PUT", userData);
  },

  // Delete user
  deleteUser: async (userId: string) => {
    return await apiRepository.call(
      "deleteUser",
      "DELETE",
      undefined,
      {},
      true,
      { id: userId },
    );
  },
};

// Generic API Helper Functions
export const genericApi = {
  // Get roles
  getRoles: async () => {
    return await apiRepository.call("getRoles", "GET", undefined, {}, false);
  },

  // Get entities and branches
  getEntitiesAndBranches: async () => {
    return await apiRepository.call("getEntitiesAndBranches", "GET");
  },

  // Get currencies
  getCurrencies: async () => {
    return await apiRepository.call(
      "getCurrencies",
      "GET",
      undefined,
      {},
      false,
    );
  },

  // Get timezones
  getTimezones: async () => {
    return await apiRepository.call(
      "getTimezones",
      "GET",
      undefined,
      {},
      false,
    );
  },

  // Get reservation status types
  getReservationStatusTypes: async () => {
    return await apiRepository.call(
      "getReservationStatusTypes",
      "GET",
      undefined,
      {},
      false,
    );
  },

  // Get bug severities
  getBugSeverities: async () => {
    return await apiRepository.call(
      "getBugSeverities",
      "GET",
      undefined,
      {},
      false,
    );
  },

  // Get bug categories
  getBugCategories: async () => {
    return await apiRepository.call(
      "getBugCategories",
      "GET",
      undefined,
      {},
      false,
    );
  },
};

// Location/Table API Helper Functions
export const locationApi = {
  // Create a new table/location
  createLocation: async (locationData: {
    branchId: number;
    name: string;
    capacity: number;
  }) => {
    return await apiRepository.call("createLocation", "POST", locationData);
  },

  // Get location by ID
  getLocationById: async (locationId: string) => {
    return await apiRepository.call(
      "getLocationById",
      "GET",
      undefined,
      {},
      true,
      { id: locationId },
    );
  },

  // Get locations by branch ID
  getLocationsByBranch: async (branchId: number) => {
    return await apiRepository.call(
      "getLocationsByBranch",
      "GET",
      undefined,
      {},
      true,
      { branchId: branchId.toString() },
    );
  },

  // Update location
  updateLocation: async (
    locationId: string,
    locationData: { branchId?: number; name?: string; capacity?: number },
  ) => {
    return await apiRepository.call(
      "updateLocation",
      "PUT",
      locationData,
      {},
      true,
      { id: locationId },
    );
  },

  // Delete location
  deleteLocation: async (locationId: string) => {
    return await apiRepository.call(
      "deleteLocation",
      "DELETE",
      undefined,
      {},
      true,
      { id: locationId },
    );
  },
};

// Bug Reporting API Helper Functions
export const bugReportingApi = {
  // Create bug report with FormData
  createBugReport: async (formData: FormData) => {
    return await apiRepository.call("createIssueReport", "POST", formData);
  },
};

// Auth API Helper Functions
export const authApi = {
  // Login
  login: async (credentials: { email: string; password: string }) => {
    return await apiRepository.call(
      "login",
      "POST",
      credentials,
      undefined,
      false,
    );
  },

  // Signup
  signup: async (userData: any) => {
    return await apiRepository.call(
      "signup",
      "POST",
      userData,
      undefined,
      false,
    );
  },
};

// MenuItem API Helper Functions
export const menuItemApi = {
  // Get simple menu items by branch ID (for deals)
  getSimpleMenuItemsByBranch: async (branchId: number) => {
    return await apiRepository.call(
      "getMenuItemsSimpleByBranch",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );
  },

  // Get detailed menu items by branch ID with pagination
  getMenuItemsByBranch: async (
    branchId: number,
    pageNumber: number = 1,
    pageSize: number = 6,
    sortBy: string = "createdAt",
    isAscending: boolean = false,
    searchTerm?: string,
  ): Promise<any> => {
    const params = new URLSearchParams({
      PageNumber: pageNumber.toString(),
      PageSize: pageSize.toString(),
      SortBy: sortBy,
      IsAscending: isAscending.toString(),
    });

    if (searchTerm) {
      params.append("SearchTerm", searchTerm);
    }

    // Update endpoint with query parameters
    const originalEndpoint =
      apiRepository.getConfig().endpoints["getMenuItemsByBranch"];
    const endpointWithPath = originalEndpoint.replace(
      "{branchId}",
      branchId.toString(),
    );
    apiRepository.updateEndpoint(
      "getMenuItemsByBranch",
      `${endpointWithPath}?${params.toString()}`,
    );

    const response = await apiRepository.call(
      "getMenuItemsByBranch",
      "GET",
      undefined,
      {},
      true,
    );

    // Restore original endpoint
    apiRepository.updateEndpoint("getMenuItemsByBranch", originalEndpoint);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Get menu item by ID
  getMenuItemById: async (menuItemId: number) => {
    return await apiRepository.call(
      "getMenuItemById",
      "GET",
      undefined,
      {},
      true,
      { id: menuItemId },
    );
  },
};

// SubMenuItems API Helper Functions
export const subMenuItemApi = {
  // Get simple SubMenuItems by branch ID (for modifiers)
  getSimpleSubMenuItemsByBranch: async (branchId: number) => {
    return await apiRepository.call(
      "getSubMenusSimpleByBranch",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );
  },

  // Get detailed SubMenuItems by branch ID with pagination
  getSubMenuItemsByBranch: async (
    branchId: number,
    pageNumber: number = 1,
    pageSize: number = 6,
    sortBy: string = "createdAt",
    isAscending: boolean = false,
    searchTerm?: string,
  ): Promise<any> => {
    const params = new URLSearchParams({
      PageNumber: pageNumber.toString(),
      PageSize: pageSize.toString(),
      SortBy: sortBy,
      IsAscending: isAscending.toString(),
    });

    if (searchTerm) {
      params.append("SearchTerm", searchTerm);
    }

    // Update endpoint with query parameters
    const originalEndpoint =
      apiRepository.getConfig().endpoints["getSubMenusByBranch"];
    const endpointWithPath = originalEndpoint.replace(
      "{branchId}",
      branchId.toString(),
    );
    apiRepository.updateEndpoint(
      "getSubMenusByBranch",
      `${endpointWithPath}?${params.toString()}`,
    );

    const response = await apiRepository.call(
      "getSubMenusByBranch",
      "GET",
      undefined,
      {},
      true,
    );

    // Restore original endpoint
    apiRepository.updateEndpoint("getSubMenusByBranch", originalEndpoint);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Get SubMenuItem by ID
  getSubMenuItemById: async (subMenuItemId: number) => {
    return await apiRepository.call(
      "getSubMenuById",
      "GET",
      undefined,
      {},
      true,
      { id: subMenuItemId },
    );
  },

  // Update SubMenuItem
  updateSubMenuItem: async (
    subMenuItemId: number,
    subMenuItemData: { name: string; price: number },
  ) => {
    return await apiRepository.call(
      "updateSubMenu",
      "PUT",
      subMenuItemData,
      {},
      true,
      { id: subMenuItemId },
    );
  },

  // Delete SubMenuItem
  deleteSubMenuItem: async (subMenuItemId: number) => {
    return await apiRepository.call(
      "deleteSubMenu",
      "DELETE",
      undefined,
      {},
      true,
      { id: subMenuItemId },
    );
  },
};

// MenuCategory API Helper Functions
export const menuCategoryApi = {
  // Get menu categories by branch ID with pagination
  getMenuCategoriesByBranch: async (
    branchId: number,
    pageNumber: number = 1,
    pageSize: number = 6,
    sortBy: string = "createdAt",
    isAscending: boolean = false,
    searchTerm?: string,
  ): Promise<any> => {
    const params = new URLSearchParams({
      PageNumber: pageNumber.toString(),
      PageSize: pageSize.toString(),
      SortBy: sortBy,
      IsAscending: isAscending.toString(),
    });

    if (searchTerm) {
      params.append("SearchTerm", searchTerm);
    }

    // Update endpoint with query parameters
    const originalEndpoint =
      apiRepository.getConfig().endpoints["getMenuCategoriesByBranch"];
    const endpointWithPath = originalEndpoint.replace(
      "{branchId}",
      branchId.toString(),
    );
    apiRepository.updateEndpoint(
      "getMenuCategoriesByBranch",
      `${endpointWithPath}?${params.toString()}`,
    );

    const response = await apiRepository.call(
      "getMenuCategoriesByBranch",
      "GET",
      undefined,
      {},
      true,
    );

    // Restore original endpoint
    apiRepository.updateEndpoint("getMenuCategoriesByBranch", originalEndpoint);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Get menu category by ID
  getMenuCategoryById: async (categoryId: number) => {
    return await apiRepository.call(
      "getMenuCategoryById",
      "GET",
      undefined,
      {},
      true,
      { id: categoryId },
    );
  },

  // Create menu category
  createMenuCategory: async (categoryData: any) => {
    return await apiRepository.call("createMenuCategory", "POST", categoryData);
  },

  // Update menu category
  updateMenuCategory: async (categoryId: number, categoryData: any) => {
    return await apiRepository.call(
      "updateMenuCategory",
      "PUT",
      categoryData,
      {},
      true,
      { id: categoryId },
    );
  },

  // Delete menu category
  deleteMenuCategory: async (categoryId: number) => {
    return await apiRepository.call(
      "deleteMenuCategory",
      "DELETE",
      undefined,
      {},
      true,
      { id: categoryId },
    );
  },

  // Get simple menu categories by branch ID (no pagination)
  getMenuCategoriesSimpleByBranch: async (branchId: number) => {
    const response = await apiRepository.call<MenuCategory[]>(
      "getMenuCategoriesSimpleByBranch",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data || [];
  },
};

// Deals API Helper Functions
export const dealsApi = {
  // Create a new deal
  createDeal: async (dealData: any) => {
    return await apiRepository.call("createDeal", "POST", dealData);
  },

  // Get deals by branch with pagination (using Generic API repository)
  getDealsByBranch: async (
    branchId: number,
    queryParams?: { [key: string]: string },
  ) => {
    const response = await apiRepository.call<{
      items: Deal[];
      pageNumber: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      hasPrevious: boolean;
      hasNext: boolean;
    }>("getDealsByBranch", "GET", undefined, queryParams, true, { branchId });

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Get all deals with pagination (legacy method - kept for compatibility)
  getDeals: async (branchId: number, queryString?: string) => {
    if (!branchId) {
      throw new Error("Branch ID is required");
    }
    const endpoint = queryString
      ? `/api/Deals/branch/${branchId}?${queryString}`
      : `/api/Deals/branch/${branchId}`;
    return await apiRepository.get(endpoint);
  },

  // Get deal by ID (using Generic API repository)
  getDealById: async (dealId: number) => {
    const response = await apiRepository.call<Deal>(
      "getDealById",
      "GET",
      undefined,
      {},
      true,
      { id: dealId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Update deal (using Generic API repository)
  updateDeal: async (dealId: number, dealData: any) => {
    const response = await apiRepository.call<void>(
      "updateDeal",
      "PUT",
      dealData,
      {},
      true,
      { id: dealId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Delete deal (using Generic API repository)
  deleteDeal: async (dealId: number) => {
    const response = await apiRepository.call<void>(
      "deleteDeal",
      "DELETE",
      undefined,
      {},
      true,
      { id: dealId },
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
  getDiscountsByBranch: async (
    branchId: number,
    queryParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    const params = new URLSearchParams({
      PageNumber: (queryParams?.PageNumber || 1).toString(),
      PageSize: (queryParams?.PageSize || 10).toString(),
    });

    if (queryParams?.SortBy) {
      params.append("SortBy", queryParams.SortBy);
    }

    if (queryParams?.IsAscending !== undefined) {
      params.append("IsAscending", queryParams.IsAscending.toString());
    }

    if (queryParams?.SearchTerm) {
      params.append("SearchTerm", queryParams.SearchTerm);
    }

    // For query parameters, modify the endpoint temporarily
    const originalEndpoint =
      apiRepository.getConfig().endpoints["getDiscountsByBranch"];
    apiRepository.updateEndpoint(
      "getDiscountsByBranch",
      `${originalEndpoint}?${params.toString()}`,
    );

    const response = await apiRepository.call(
      "getDiscountsByBranch",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );

    // Restore original endpoint
    apiRepository.updateEndpoint("getDiscountsByBranch", originalEndpoint);

    return response;
  },

  // Get discount by ID
  getDiscountById: async (discountId: number) => {
    const response = await apiRepository.call(
      "getDiscountById",
      "GET",
      undefined,
      {},
      true,
      { id: discountId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Create discount using Generic API repository
  createDiscount: async (discountData: any) => {
    const response = await apiRepository.call(
      "createDiscount",
      "POST",
      discountData,
      {},
      true,
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response;
  },

  // Update discount using Generic API repository
  updateDiscount: async (discountId: number, discountData: any) => {
    const response = await apiRepository.call(
      "updateDiscount",
      "PUT",
      discountData,
      {},
      true,
      { id: discountId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response;
  },

  // Delete discount using Generic API repository
  deleteDiscount: async (discountId: number) => {
    const response = await apiRepository.call(
      "deleteDiscount",
      "DELETE",
      undefined,
      {},
      true,
      { id: discountId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response;
  },

  // Get simple menu items by branch using Generic API repository
  getMenuItemsSimpleByBranch: async (branchId: number) => {
    const response = await apiRepository.call(
      "getMenuItemsSimpleByBranch",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Get simple deals by branch using Generic API repository
  getDealsSimpleByBranch: async (branchId: number) => {
    const response = await apiRepository.call(
      "getDealsSimpleByBranch",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Get simple discounts by branch using Generic API repository
  getDiscountsSimpleByBranch: async (branchId: number) => {
    const response = await apiRepository.call(
      "getDiscountsSimpleByBranch",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Apply bulk discount to deals
  applyBulkDiscountToDeals: async (dealIds: number[], discountId: number) => {
    const response = await apiRepository.call(
      "bulkDiscountDeals",
      "PUT",
      {
        dealIds,
        discountId,
      },
      {},
      true,
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response;
  },

  // Apply bulk discount to menu items
  applyBulkDiscountToMenu: async (
    menuItemIds: number[],
    discountId: number,
  ) => {
    const response = await apiRepository.call(
      "bulkDiscountMenu",
      "PUT",
      {
        menuItemIds,
        discountId,
      },
      {},
      true,
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
    sortBy: string = "createdAt",
    isAscending: boolean = false,
    searchTerm: string = "",
  ) => {
    const params = new URLSearchParams({
      BranchId: branchId.toString(),
      PageNumber: pageNumber.toString(),
      PageSize: pageSize.toString(),
      SortBy: sortBy,
      IsAscending: isAscending.toString(),
    });

    if (searchTerm) {
      params.append("SearchTerm", searchTerm);
    }

    // For query parameters, modify the endpoint temporarily
    const originalEndpoint =
      apiRepository.getConfig().endpoints["getOrdersByBranch"];
    apiRepository.updateEndpoint(
      "getOrdersByBranch",
      `${originalEndpoint}?${params.toString()}`,
    );

    const response = await apiRepository.call<
      PaginationResponse<DetailedOrder>
    >("getOrdersByBranch", "GET", undefined, {}, true);

    // Restore original endpoint
    apiRepository.updateEndpoint("getOrdersByBranch", originalEndpoint);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Get order status types from API
  getOrderStatusTypes: async () => {
    const response = await apiRepository.call<
      Array<{ id: number; name: string }>
    >("getOrderStatusTypes", "GET");

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data || [];
  },

  // Update order status
  updateOrderStatus: async (
    orderId: number,
    statusId: number,
    comments: string = "No",
  ) => {
    const response = await apiRepository.call<{
      orderId: number;
      orderStatus: string;
    }>("updateOrderStatus", "PUT", {
      orderId: orderId,
      status: statusId,
      comments: comments,
    });

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
      "getServicesByType",
      "GET",
      undefined,
      {},
      true,
      { entityType },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data || [];
  },

  // Get branch services
  getBranchServices: async (branchId: number): Promise<BranchService[]> => {
    const response = await apiRepository.call<BranchService[]>(
      "getBranchServices",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data || [];
  },

  // Update branch services (PUT with array of service objects with price)
  updateBranchServices: async (
    branchId: number,
    services: Array<{ serviceId: number; price: number }>,
  ) => {
    const response = await apiRepository.call(
      "updateBranchServices",
      "PUT",
      services,
      {},
      true,
      { branchId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response;
  },
};

// Subscription API Helper Functions
export const subscriptionsApi = {
  // Get subscriptions by branch (using unique endpoint keys to avoid race conditions)
  getSubscriptionsByBranch: async (
    branchId: number,
  ): Promise<import("../types/schema").Subscription[]> => {
    const originalEndpoint =
      apiRepository.getConfig().endpoints["getSubscriptionsByBranch"];
    const uniqueKey = `getSubscriptionsByBranch-${Date.now()}-${Math.random()}`;

    // Add unique temporary endpoint with query params
    apiRepository.updateEndpoint(
      uniqueKey,
      `${originalEndpoint}?branchId=${branchId}`,
    );

    try {
      const response = await apiRepository.call<
        import("../types/schema").Subscription[]
      >(uniqueKey, "GET", undefined, {}, true);

      // Throw error to let React Query error boundary handle it
      if (response.error) {
        throw new Error(response.error);
      }

      // Return empty array only if the API successfully returned no data
      return Array.isArray(response.data) ? response.data : [];
    } finally {
      // Always cleanup the temporary endpoint
      delete apiRepository.getConfig().endpoints[uniqueKey];
    }
  },

  // Apply subscription
  applySubscription: async (
    data: import("../types/schema").ApplySubscriptionRequest,
  ): Promise<import("../types/schema").ApplySubscriptionResponse> => {
    const response = await apiRepository.call<
      import("../types/schema").ApplySubscriptionResponse
    >("applySubscription", "POST", data, {}, true);

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error("Failed to apply subscription");
    }

    return response.data;
  },

  // Get current subscription for branch (using unique endpoint keys to avoid race conditions)
  getCurrentSubscription: async (
    branchId: number,
  ): Promise<import("../types/schema").Subscription | null> => {
    const originalEndpoint =
      apiRepository.getConfig().endpoints["getCurrentSubscription"];
    const uniqueKey = `getCurrentSubscription-${Date.now()}-${Math.random()}`;

    // Add unique temporary endpoint with query params
    apiRepository.updateEndpoint(
      uniqueKey,
      `${originalEndpoint}?branchId=${branchId}`,
    );

    try {
      const response = await apiRepository.call<
        import("../types/schema").Subscription
      >(uniqueKey, "GET", undefined, {}, true);

      // Throw error to let React Query error boundary handle it
      if (response.error) {
        throw new Error(response.error);
      }

      // Return null if no subscription is found (but no error)
      return response.data || null;
    } finally {
      // Always cleanup the temporary endpoint
      delete apiRepository.getConfig().endpoints[uniqueKey];
    }
  },

  // Calculate prorated amount when changing subscription
  calculateProratedAmount: async (
    data: import("../types/schema").CalculateProratedAmountRequest,
  ): Promise<import("../types/schema").CalculateProratedAmountResponse> => {
    const response = await apiRepository.call<
      import("../types/schema").CalculateProratedAmountResponse
    >("calculateProratedAmount", "POST", data, {}, true);

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error("Failed to calculate prorated amount");
    }

    return response.data;
  },

  // Change subscription plan
  changeSubscription: async (
    data: import("../types/schema").ChangeSubscriptionRequest,
  ): Promise<import("../types/schema").ChangeSubscriptionResponse> => {
    const response = await apiRepository.call<
      import("../types/schema").ChangeSubscriptionResponse
    >("changeSubscription", "POST", data, {}, true);

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error("Failed to change subscription");
    }

    return response.data;
  },

  // Cancel subscription
  cancelSubscription: async (
    data: import("../types/schema").CancelSubscriptionRequest,
  ): Promise<import("../types/schema").CancelSubscriptionResponse> => {
    const response = await apiRepository.call<
      import("../types/schema").CancelSubscriptionResponse
    >("cancelSubscription", "POST", data, {}, true);

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error("Failed to cancel subscription");
    }

    return response.data;
  },

  // Upload payment proof
  uploadPaymentProof: async (
    branchSubscriptionId: number,
    proofOfPayment: File,
  ): Promise<import("../types/schema").UploadPaymentProofResponse> => {
    const formData = new FormData();
    formData.append("BranchSubscriptionId", branchSubscriptionId.toString());
    formData.append("ProofOfPayment", proofOfPayment);

    const response = await apiRepository.call<
      import("../types/schema").UploadPaymentProofResponse
    >("uploadPaymentProof", "POST", formData, {}, true);

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error("Failed to upload payment proof");
    }

    return response.data;
  },
};

// Reservation API Helper Functions
export const reservationApi = {
  // Get reservations by branch with pagination
  getReservationsByBranch: async (
    branchId: number,
    pageNumber: number = 1,
    pageSize: number = 10,
    sortBy: string = "name",
    isAscending: boolean = true,
  ): Promise<any> => {
    const params = new URLSearchParams({
      PageNumber: pageNumber.toString(),
      PageSize: pageSize.toString(),
      SortBy: sortBy,
      IsAscending: isAscending.toString(),
    });

    // Update endpoint with query parameters
    const originalEndpoint =
      apiRepository.getConfig().endpoints["getReservationsByBranch"];
    const endpointWithPath = originalEndpoint.replace(
      "{branchId}",
      branchId.toString(),
    );
    apiRepository.updateEndpoint(
      "getReservationsByBranch",
      `${endpointWithPath}?${params.toString()}`,
    );

    const response = await apiRepository.call(
      "getReservationsByBranch",
      "GET",
      undefined,
      {},
      true,
    );

    // Restore original endpoint
    apiRepository.updateEndpoint("getReservationsByBranch", originalEndpoint);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Get reservation detail by ID
  getReservationDetail: async (
    reservationId: number,
  ): Promise<import("../types/schema").ReservationDetail> => {
    const response = await apiRepository.call<
      import("../types/schema").ReservationDetail
    >("getReservationById", "GET", undefined, {}, true, { id: reservationId });

    if (response.error) {
      throw new Error(response.error);
    }

    if (!response.data) {
      throw new Error("Failed to fetch reservation");
    }

    return response.data;
  },

  // Update reservation action (status and remarks)
  updateReservationAction: async (
    reservationId: number,
    actionData: {
      actionTaken: import("../types/schema").ReservationStatus;
      remarks?: string | null;
    },
  ): Promise<void> => {
    const response = await apiRepository.call<void>(
      "updateReservationAction",
      "PUT",
      actionData,
      {},
      true,
      { id: reservationId },
    );

    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
  },

  // Get reservation status types
  getReservationStatusTypes: async () => {
    const response = await apiRepository.call(
      "getReservationStatusTypes",
      "GET",
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data || [];
  },

  // Create reservation
  createReservation: async (reservationData: any) => {
    const response = await apiRepository.call(
      "createReservation",
      "POST",
      reservationData,
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Update reservation
  updateReservation: async (reservationId: number, reservationData: any) => {
    const response = await apiRepository.call(
      "updateReservation",
      "PUT",
      reservationData,
      {},
      true,
      { id: reservationId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },

  // Delete reservation
  deleteReservation: async (reservationId: number) => {
    const response = await apiRepository.call(
      "deleteReservation",
      "DELETE",
      undefined,
      {},
      true,
      { id: reservationId },
    );

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  },
};

// Inventory API Helper Functions
export const inventoryApi = {
  // Get inventory categories by branch
  getInventoryCategories: async (
    branchId: number,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    const params = new URLSearchParams({ BranchId: branchId.toString() });

    if (paginationParams) {
      if (paginationParams.PageNumber)
        params.append("PageNumber", paginationParams.PageNumber.toString());
      if (paginationParams.PageSize)
        params.append("PageSize", paginationParams.PageSize.toString());
      if (paginationParams.SortBy)
        params.append("SortBy", paginationParams.SortBy);
      if (paginationParams.IsAscending !== undefined)
        params.append("IsAscending", paginationParams.IsAscending.toString());
      if (paginationParams.SearchTerm)
        params.append("SearchTerm", paginationParams.SearchTerm);
    }

    const baseEndpoint = "/api/inventory/categories";
    apiRepository.updateEndpoint(
      "getInventoryCategories",
      `${baseEndpoint}?${params.toString()}`,
    );

    const response = await apiRepository.call("getInventoryCategories", "GET");
    apiRepository.updateEndpoint("getInventoryCategories", baseEndpoint);

    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  },

  // Get inventory categories simple (non-paginated)
  getInventoryCategoriesSimple: async (branchId: number) => {
    const response = await apiRepository.call(
      "getInventoryCategoriesSimple",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  },

  // Create inventory category
  createInventoryCategory: async (categoryData: {
    name: string;
    branchId: number;
  }) => {
    const response = await apiRepository.call(
      "createInventoryCategory",
      "POST",
      categoryData,
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Delete inventory category
  deleteInventoryCategory: async (categoryId: number) => {
    const response = await apiRepository.call(
      "deleteInventoryCategory",
      "DELETE",
      undefined,
      {},
      true,
      { id: categoryId },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Get inventory suppliers by branch
  getInventorySuppliers: async (
    branchId: number,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    const params = new URLSearchParams({ branchId: branchId.toString() });

    if (paginationParams) {
      if (paginationParams.PageNumber)
        params.append("PageNumber", paginationParams.PageNumber.toString());
      if (paginationParams.PageSize)
        params.append("PageSize", paginationParams.PageSize.toString());
      if (paginationParams.SortBy)
        params.append("SortBy", paginationParams.SortBy);
      if (paginationParams.IsAscending !== undefined)
        params.append("IsAscending", paginationParams.IsAscending.toString());
      if (paginationParams.SearchTerm)
        params.append("SearchTerm", paginationParams.SearchTerm);
    }

    const baseEndpoint = "/api/inventory/suppliers";
    apiRepository.updateEndpoint(
      "getInventorySuppliers",
      `${baseEndpoint}?${params.toString()}`,
    );

    const response = await apiRepository.call("getInventorySuppliers", "GET");
    apiRepository.updateEndpoint("getInventorySuppliers", baseEndpoint);

    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  },

  // Get inventory supplier by ID
  getInventorySupplierById: async (supplierId: number) => {
    const response = await apiRepository.call(
      "getInventorySupplierById",
      "GET",
      undefined,
      {},
      true,
      { id: supplierId },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Create inventory supplier
  createInventorySupplier: async (supplierData: {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    branchId: number;
  }) => {
    const response = await apiRepository.call(
      "createInventorySupplier",
      "POST",
      supplierData,
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Update inventory supplier
  updateInventorySupplier: async (
    supplierId: number,
    supplierData: {
      name: string;
      contactPerson: string;
      phone: string;
      email: string;
      address: string;
    },
  ) => {
    const response = await apiRepository.call(
      "updateInventorySupplier",
      "PUT",
      supplierData,
      {},
      true,
      { id: supplierId },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Delete inventory supplier
  deleteInventorySupplier: async (supplierId: number) => {
    const response = await apiRepository.call(
      "deleteInventorySupplier",
      "DELETE",
      undefined,
      {},
      true,
      { id: supplierId },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Get inventory items by branch
  getInventoryItemsByBranch: async (
    branchId: number,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    const params = new URLSearchParams();

    if (paginationParams) {
      if (paginationParams.PageNumber)
        params.append("PageNumber", paginationParams.PageNumber.toString());
      if (paginationParams.PageSize)
        params.append("PageSize", paginationParams.PageSize.toString());
      if (paginationParams.SortBy)
        params.append("SortBy", paginationParams.SortBy);
      if (paginationParams.IsAscending !== undefined)
        params.append("IsAscending", paginationParams.IsAscending.toString());
      if (paginationParams.SearchTerm)
        params.append("SearchTerm", paginationParams.SearchTerm);
    }

    const baseEndpoint = "/api/inventory/items/branch";
    let endpoint = `${baseEndpoint}/${branchId}`;
    if (params.toString()) {
      endpoint = `${endpoint}?${params.toString()}`;
    }
    apiRepository.updateEndpoint("getInventoryItemsByBranch", endpoint);

    const response = await apiRepository.call(
      "getInventoryItemsByBranch",
      "GET",
      undefined,
      {},
      true,
    );
    apiRepository.updateEndpoint(
      "getInventoryItemsByBranch",
      baseEndpoint + "/{branchId}",
    );

    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  },

  // Get inventory items simple (non-paginated)
  getInventoryItemsSimpleByBranch: async (branchId: number) => {
    const response = await apiRepository.call(
      "getInventoryItemsSimpleByBranch",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  },

  // Get inventory item by ID
  getInventoryItemById: async (itemId: number) => {
    const response = await apiRepository.call(
      "getInventoryItemById",
      "GET",
      undefined,
      {},
      true,
      { id: itemId },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Create inventory item
  createInventoryItem: async (itemData: {
    name: string;
    categoryId: number;
    branchId: number;
    unit: string;
    reorderLevel: number;
    defaultSupplierId?: number;
  }) => {
    const response = await apiRepository.call(
      "createInventoryItem",
      "POST",
      itemData,
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Update inventory item
  updateInventoryItem: async (
    itemId: number,
    itemData: {
      name: string;
      categoryId: number;
      unit: string;
      reorderLevel: number;
      defaultSupplierId?: number;
    },
  ) => {
    const response = await apiRepository.call(
      "updateInventoryItem",
      "PUT",
      itemData,
      {},
      true,
      { id: itemId },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Delete inventory item
  deleteInventoryItem: async (itemId: number) => {
    const response = await apiRepository.call(
      "deleteInventoryItem",
      "DELETE",
      undefined,
      {},
      true,
      { id: itemId },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Get inventory stock by branch
  getInventoryStockByBranch: async (
    branchId: number,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    const params = new URLSearchParams();

    if (paginationParams) {
      if (paginationParams.PageNumber)
        params.append("PageNumber", paginationParams.PageNumber.toString());
      if (paginationParams.PageSize)
        params.append("PageSize", paginationParams.PageSize.toString());
      if (paginationParams.SortBy)
        params.append("SortBy", paginationParams.SortBy);
      if (paginationParams.IsAscending !== undefined)
        params.append("IsAscending", paginationParams.IsAscending.toString());
      if (paginationParams.SearchTerm)
        params.append("SearchTerm", paginationParams.SearchTerm);
    }

    const baseEndpoint = "/api/inventory/branch";
    let endpoint = `${baseEndpoint}/${branchId}/stock`;
    if (params.toString()) {
      endpoint = `${endpoint}?${params.toString()}`;
    }
    apiRepository.updateEndpoint("getInventoryStockByBranch", endpoint);
    const response = await apiRepository.call(
      "getInventoryStockByBranch",
      "GET",
      undefined,
      {},
      true,
    );
    apiRepository.updateEndpoint("getInventoryStockByBranch", endpoint);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  },

  // Update inventory stock
  updateInventoryStock: async (
    branchId: number,
    stockData: { inventoryItemId: number; newStock: number; reason: string },
  ) => {
    const response = await apiRepository.call(
      "updateInventoryStock",
      "POST",
      stockData,
      {},
      true,
      { branchId },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Get inventory low stock by branch
  getInventoryLowStockByBranch: async (
    branchId: number,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    const params = new URLSearchParams();

    if (paginationParams) {
      if (paginationParams.PageNumber)
        params.append("PageNumber", paginationParams.PageNumber.toString());
      if (paginationParams.PageSize)
        params.append("PageSize", paginationParams.PageSize.toString());
      if (paginationParams.SortBy)
        params.append("SortBy", paginationParams.SortBy);
      if (paginationParams.IsAscending !== undefined)
        params.append("IsAscending", paginationParams.IsAscending.toString());
      if (paginationParams.SearchTerm)
        params.append("SearchTerm", paginationParams.SearchTerm);
    }

    const baseEndpoint = "/api/inventory/branch";
    let endpoint = `${baseEndpoint}/${branchId}/low-stock`;
    if (params.toString()) {
      endpoint = `${endpoint}?${params.toString()}`;
    }
    apiRepository.updateEndpoint("getInventoryLowStockByBranch", endpoint);

    const response = await apiRepository.call(
      "getInventoryLowStockByBranch",
      "GET",
      undefined,
      {},
      true,
    );
    apiRepository.updateEndpoint("getInventoryLowStockByBranch", endpoint);

    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  },

  // Create purchase order
  createPurchaseOrder: async (orderData: {
    supplierId: number;
    branchId: number;
    orderDate: string;
    status: number;
    items: { inventoryItemId: number; quantity: number; unitPrice: number }[];
  }) => {
    const response = await apiRepository.call(
      "createPurchaseOrder",
      "POST",
      orderData,
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Get purchase orders by branch
  getPurchaseOrdersByBranch: async (
    branchId: number,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    const params = new URLSearchParams();

    if (paginationParams) {
      if (paginationParams.PageNumber)
        params.append("PageNumber", paginationParams.PageNumber.toString());
      if (paginationParams.PageSize)
        params.append("PageSize", paginationParams.PageSize.toString());
      if (paginationParams.SortBy)
        params.append("SortBy", paginationParams.SortBy);
      if (paginationParams.IsAscending !== undefined)
        params.append("IsAscending", paginationParams.IsAscending.toString());
      if (paginationParams.SearchTerm)
        params.append("SearchTerm", paginationParams.SearchTerm);
    }

    const baseEndpoint = "/api/inventory/purchase-orders/branch";
    let endpoint = `${baseEndpoint}/${branchId}`;
    if (params.toString()) {
      endpoint = `${endpoint}?${params.toString()}`;
    }
    apiRepository.updateEndpoint("getPurchaseOrdersByBranch", endpoint);

    const response = await apiRepository.call(
      "getPurchaseOrdersByBranch",
      "GET",
      undefined,
      {},
      true,
    );
    apiRepository.updateEndpoint(
      "getPurchaseOrdersByBranch",
      baseEndpoint + "/{branchId}",
    );

    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  },

  // Get purchase order by ID
  getPurchaseOrderById: async (orderId: number) => {
    const response = await apiRepository.call(
      "getPurchaseOrderById",
      "GET",
      undefined,
      {},
      true,
      { id: orderId },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Receive purchase order
  receivePurchaseOrder: async (
    orderId: number,
    items: { purchaseOrderItemId: number; receivedQuantity: number }[],
  ) => {
    const response = await apiRepository.call(
      "receivePurchaseOrder",
      "PUT",
      { items },
      {},
      true,
      { id: orderId },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Cancel purchase order
  cancelPurchaseOrder: async (orderId: number) => {
    const response = await apiRepository.call(
      "cancelPurchaseOrder",
      "PUT",
      undefined,
      {},
      true,
      { id: orderId },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Get menu items search (for recipe form)
  getMenuItemsSearch: async (branchId: number) => {
    const response = await apiRepository.call(
      "getMenuItemsSearch",
      "GET",
      undefined,
      {},
      true,
      { branchId },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Get recipes by branch
  getRecipesByBranch: async (
    branchId: number,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ): Promise<Recipe[]> => {
    const params = new URLSearchParams({ branchId: branchId.toString() });

    if (paginationParams) {
      if (paginationParams.PageNumber)
        params.append("PageNumber", paginationParams.PageNumber.toString());
      if (paginationParams.PageSize)
        params.append("PageSize", paginationParams.PageSize.toString());
      if (paginationParams.SortBy)
        params.append("SortBy", paginationParams.SortBy);
      if (paginationParams.IsAscending !== undefined)
        params.append("IsAscending", paginationParams.IsAscending.toString());
      if (paginationParams.SearchTerm)
        params.append("SearchTerm", paginationParams.SearchTerm);
    }

    const baseEndpoint = "/api/recipes";
    apiRepository.updateEndpoint(
      "getRecipes",
      `${baseEndpoint}?${params.toString()}`,
    );

    const response = await apiRepository.call("getRecipes", "GET");
    apiRepository.updateEndpoint("getRecipes", baseEndpoint);

    if (response.error) {
      throw new Error(response.error);
    }
    return (response.data || []) as Recipe[];
  },

  // Get recipe by ID
  getRecipeById: async (recipeId: number): Promise<RecipeDetail> => {
    const response = await apiRepository.call(
      "getRecipeById",
      "GET",
      undefined,
      {},
      true,
      { id: recipeId },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data as RecipeDetail;
  },

  // Create recipe
  createRecipe: async (recipeData: InsertRecipe): Promise<RecipeDetail> => {
    const response = await apiRepository.call(
      "createRecipe",
      "POST",
      recipeData,
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data as RecipeDetail;
  },

  // Update recipe
  updateRecipe: async (
    recipeId: number,
    recipeData: InsertRecipe,
  ): Promise<RecipeDetail> => {
    const response = await apiRepository.call(
      "updateRecipe",
      "PUT",
      recipeData,
      {},
      true,
      { id: recipeId },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data as RecipeDetail;
  },

  // Delete recipe
  deleteRecipe: async (recipeId: number): Promise<void> => {
    const response = await apiRepository.call(
      "deleteRecipe",
      "DELETE",
      undefined,
      {},
      true,
      { id: recipeId },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
  },

  // Create inventory wastage
  createInventoryWastage: async (wastageData: {
    branchId: number;
    inventoryItemId: number;
    quantity: number;
    reason: string;
  }) => {
    const response = await apiRepository.call(
      "createInventoryWastage",
      "POST",
      wastageData,
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Get inventory wastage by branch with date filters
  getInventoryWastageByBranch: async (
    branchId: number,
    from: string,
    to: string,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    const params = new URLSearchParams({
      branchId: branchId.toString(),
      from: from,
      to: to,
    });

    if (paginationParams) {
      if (paginationParams.PageNumber)
        params.append("PageNumber", paginationParams.PageNumber.toString());
      if (paginationParams.PageSize)
        params.append("PageSize", paginationParams.PageSize.toString());
      if (paginationParams.SortBy)
        params.append("SortBy", paginationParams.SortBy);
      if (paginationParams.IsAscending !== undefined)
        params.append("IsAscending", paginationParams.IsAscending.toString());
      if (paginationParams.SearchTerm)
        params.append("SearchTerm", paginationParams.SearchTerm);
    }

    const baseEndpoint = "/api/inventory/wastage";
    apiRepository.updateEndpoint(
      "getInventoryWastageByBranch",
      `${baseEndpoint}?${params.toString()}`,
    );

    const response = await apiRepository.call(
      "getInventoryWastageByBranch",
      "GET",
    );
    apiRepository.updateEndpoint("getInventoryWastageByBranch", baseEndpoint);

    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  },

  // Utility Expense API methods
  createUtilityExpense: async (expenseData: {
    branchId: number;
    utilityType: string;
    usageUnit: number;
    unitCost: number;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    billNumber: string;
  }) => {
    const response = await apiRepository.call(
      "createUtilityExpense",
      "POST",
      expenseData,
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  getUtilityExpensesByBranch: async (
    branchId: number,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    const params = new URLSearchParams();

    if (paginationParams) {
      if (paginationParams.PageNumber)
        params.append("PageNumber", paginationParams.PageNumber.toString());
      if (paginationParams.PageSize)
        params.append("PageSize", paginationParams.PageSize.toString());
      if (paginationParams.SortBy)
        params.append("SortBy", paginationParams.SortBy);
      if (paginationParams.IsAscending !== undefined)
        params.append("IsAscending", paginationParams.IsAscending.toString());
      if (paginationParams.SearchTerm)
        params.append("SearchTerm", paginationParams.SearchTerm);
    }

    const baseEndpoint = "/api/facilityutilityrecords/branch";
    let endpoint = `${baseEndpoint}/${branchId}`;
    if (params.toString()) {
      endpoint = `${endpoint}?${params.toString()}`;
    }
    apiRepository.updateEndpoint("getUtilityExpensesByBranch", endpoint);

    const response = await apiRepository.call(
      "getUtilityExpensesByBranch",
      "GET",
      undefined,
      undefined,
      true,
    );
    apiRepository.updateEndpoint(
      "getUtilityExpensesByBranch",
      baseEndpoint + "/{branchId}",
    );

    if (response.error) {
      throw new Error(response.error);
    }
    return response.data || [];
  },

  getUtilityExpenseById: async (id: number) => {
    const response = await apiRepository.call(
      "getUtilityExpenseById",
      "GET",
      undefined,
      undefined,
      true,
      { id },
    );
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data;
  },

  updateUtilityExpense: async (
    id: number,
    expenseData: {
      utilityType: string;
      usageUnit: number;
      unitCost: number;
      billingPeriodStart: string;
      billingPeriodEnd: string;
      billNumber: string;
      isActive: boolean;
    },
  ) => {
    const response = await apiRepository.call(
      "updateUtilityExpense",
      "PUT",
      expenseData,
      undefined,
      true,
      { id },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },

  deleteUtilityExpense: async (id: number) => {
    const response = await apiRepository.call(
      "deleteUtilityExpense",
      "DELETE",
      undefined,
      undefined,
      true,
      { id },
    );
    if (response.error && response.status >= 400) {
      throw new Error(response.error);
    }
    return response.data;
  },
};

// Helper to get full URL for images
export const getImageUrl = (relativePath: string): string => {
  if (!relativePath) return "";
  return `${API_BASE_URL}/${relativePath}`;
};
