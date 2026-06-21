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

// NSwag-generated client singletons
import {
  userClient,
  genericClient,
  entityClient,
  branchClient,
  locationClient,
  menuCategoryClient,
  subMenuItemsClient,
  menuItemClient,
  dealsClient,
  discountClient,
  orderClient,
  reservationsClient,
  branchServicesClient,
  subscriptionsClient as subscriptionsNswagClient,
  inventoryClient,
  issuesReportingClient,
  customerSearchClient,
  vendorDashboardClient,
} from "../generated/nswag/api-client";

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
    localStorage.removeItem("restaurant_current_user");
    localStorage.removeItem("current_user");
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
    }
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
  CREATE_ORDER: "/api/order",
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

  // Customer Search Menu endpoint
  CUSTOMER_SEARCH_MENU: "/api/customer-search/branch/{branchId}",

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
    createOrder: API_ENDPOINTS.CREATE_ORDER,
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

    // Customer Search Menu endpoint
    getCustomerSearchMenu: API_ENDPOINTS.CUSTOMER_SEARCH_MENU,

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
  getChefBranch: async (): Promise<{ branchId: string }> => {
    const data = await userClient.UserGetChefBranchGet();
    if (!data) throw new Error("Failed to fetch chef branch");
    return data;
  },
};

// Create singleton instance
export const apiRepository = new ApiRepository(defaultApiConfig);

// Authentication token will be set dynamically from login response
// No hardcoded tokens - the apiRepository will load tokens from localStorage automatically

// Branch API Helper Functions
export const branchApi = {
  getBranchesByEntity: async (entityId: string): Promise<any[]> => {
    return branchClient.BranchGetBranchesByEntityGet(entityId);
  },

  getBranchById: async (branchId: string) => {
    return branchClient.BranchGetBranchByIdGet(branchId);
  },

  createBranch: async (branchData: any, logoFile?: File, bannerFile?: File) => {
    const formData = new FormData();
    Object.keys(branchData).forEach((key) => {
      if (branchData[key] !== undefined && branchData[key] !== null) {
        formData.append(key, branchData[key].toString());
      }
    });
    if (logoFile) formData.append("RestaurantLogo", logoFile);
    if (bannerFile) formData.append("RestaurantBanner", bannerFile);

    const data = await branchClient.BranchCreateBranchPost(formData);
    if (!data) throw new Error("Failed to create branch");
    return data;
  },

  updateBranch: async (
    branchId: string,
    branchData: any,
    logoFile?: File,
    bannerFile?: File,
  ) => {
    const formData = new FormData();
    Object.keys(branchData).forEach((key) => {
      if (branchData[key] !== undefined && branchData[key] !== null) {
        formData.append(key, branchData[key].toString());
      }
    });
    if (logoFile) formData.append("RestaurantLogo", logoFile);
    if (bannerFile) formData.append("RestaurantBanner", bannerFile);

    return branchClient.BranchUpdateBranchPut(branchId, formData);
  },

  deleteBranch: async (branchId: string) => {
    return branchClient.BranchDeleteBranchDelete(branchId);
  },

  getBranchConfiguration: async (branchId: string) => {
    return branchClient.BranchGetBranchConfigurationGet(branchId);
  },

  updateBranchConfiguration: async (branchId: string, configData: any) => {
    return branchClient.BranchUpdateBranchConfigurationPut(branchId, configData);
  },
};

// Entity API Helper Functions
export const entityApi = {
  getEntityPrimaryColor: async (entityId: string) => {
    return entityClient.EntityGetEntityPrimaryColorGet(entityId);
  },

  updateEntityPrimaryColor: async (entityId: string, primaryColor: string) => {
    return entityClient.EntityUpdateEntityPrimaryColorPut(entityId, { primaryColor });
  },
};

// User API Helper Functions
export const userApi = {
  getUsers: async (queryString: string) => {
    try {
      const data = await userClient.UserGetUsersGet(queryString);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getUserById: async (userId: string) => {
    try {
      const data = await userClient.UserGetUserByIdGet(userId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  createUser: async (formData: FormData) => {
    try {
      const data = await userClient.UserCreateUserPost(formData);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  updateUser: async (userData: any) => {
    try {
      const data = await userClient.UserUpdateUserPut(userData);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  deleteUser: async (userId: string) => {
    try {
      const data = await userClient.UserDeleteUserDelete(userId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },
};

// Generic API Helper Functions
export const genericApi = {
  getRoles: async () => {
    try {
      const data = await genericClient.GenericGetRolesGet();
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getEntitiesAndBranches: async () => {
    try {
      const data = await genericClient.GenericGetEntitiesAndBranchesGet();
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getCurrencies: async () => {
    try {
      const data = await genericClient.GenericGetCurrenciesGet();
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getTimezones: async () => {
    try {
      const data = await genericClient.GenericGetTimezonesGet();
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getReservationStatusTypes: async () => {
    try {
      const data = await genericClient.GenericGetReservationStatusTypesGet();
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getBugSeverities: async () => {
    try {
      const data = await genericClient.GenericGetBugSeveritiesGet();
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getBugCategories: async () => {
    try {
      const data = await genericClient.GenericGetBugCategoriesGet();
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },
};

// Location/Table API Helper Functions
export const locationApi = {
  createLocation: async (locationData: {
    branchId: string;
    name: string;
    capacity: number;
  }) => {
    try {
      const data = await locationClient.LocationCreateLocationPost(locationData);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getLocationById: async (locationId: string) => {
    try {
      const data = await locationClient.LocationGetLocationByIdGet(locationId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getLocationsByBranch: async (branchId: string) => {
    try {
      const data = await locationClient.LocationGetLocationsByBranchGet(branchId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  updateLocation: async (
    locationId: string,
    locationData: { branchId?: string; name?: string; capacity?: number },
  ) => {
    try {
      const data = await locationClient.LocationUpdateLocationPut(locationId, locationData);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  deleteLocation: async (locationId: string) => {
    try {
      const data = await locationClient.LocationDeleteLocationDelete(locationId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },
};

// Bug Reporting API Helper Functions
export const bugReportingApi = {
  createBugReport: async (formData: FormData) => {
    try {
      const data = await issuesReportingClient.IssuesReportingCreateIssuePost(formData);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },
};

// Auth API Helper Functions
export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      const data = await userClient.UserLoginPost(credentials);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  signup: async (userData: any) => {
    try {
      const data = await userClient.UserSignupPost(userData);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },
};

// MenuItem API Helper Functions
export const menuItemApi = {
  getSimpleMenuItemsByBranch: async (branchId: string) => {
    try {
      const data = await menuItemClient.MenuItemGetMenuItemsSimpleByBranchGet(branchId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getMenuItemsByBranch: async (
    branchId: string,
    pageNumber: number = 1,
    pageSize: number = 6,
    sortBy: string = "createdAt",
    isAscending: boolean = false,
    searchTerm?: string,
  ): Promise<any> => {
    return menuItemClient.MenuItemGetMenuItemsByBranchGet(branchId, {
      PageNumber: pageNumber,
      PageSize: pageSize,
      SortBy: sortBy,
      IsAscending: isAscending,
      SearchTerm: searchTerm,
    });
  },

  getMenuItemById: async (menuItemId: number) => {
    try {
      const data = await menuItemClient.MenuItemGetMenuItemByIdGet(menuItemId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },
};

// SubMenuItems API Helper Functions
export const subMenuItemApi = {
  getSimpleSubMenuItemsByBranch: async (branchId: string) => {
    try {
      const data = await subMenuItemsClient.SubMenuItemsGetSubMenusSimpleByBranchGet(branchId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getSubMenuItemsByBranch: async (
    branchId: string,
    pageNumber: number = 1,
    pageSize: number = 6,
    sortBy: string = "createdAt",
    isAscending: boolean = false,
    searchTerm?: string,
  ): Promise<any> => {
    return subMenuItemsClient.SubMenuItemsGetSubMenusByBranchGet(branchId, {
      PageNumber: pageNumber,
      PageSize: pageSize,
      SortBy: sortBy,
      IsAscending: isAscending,
      SearchTerm: searchTerm,
    });
  },

  getSubMenuItemById: async (subMenuItemId: number) => {
    try {
      const data = await subMenuItemsClient.SubMenuItemsGetSubMenuByIdGet(subMenuItemId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  updateSubMenuItem: async (
    subMenuItemId: number,
    subMenuItemData: { name: string; price: number },
  ) => {
    try {
      const data = await subMenuItemsClient.SubMenuItemsUpdateSubMenuPut(subMenuItemId, subMenuItemData);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  deleteSubMenuItem: async (subMenuItemId: number) => {
    try {
      const data = await subMenuItemsClient.SubMenuItemsDeleteSubMenuDelete(subMenuItemId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },
};

// MenuCategory API Helper Functions
export const menuCategoryApi = {
  getMenuCategoriesByBranch: async (
    branchId: string,
    pageNumber: number = 1,
    pageSize: number = 6,
    sortBy: string = "createdAt",
    isAscending: boolean = false,
    searchTerm?: string,
  ): Promise<any> => {
    return menuCategoryClient.MenuCategoryGetMenuCategoriesByBranchGet(branchId, {
      PageNumber: pageNumber,
      PageSize: pageSize,
      SortBy: sortBy,
      IsAscending: isAscending,
      SearchTerm: searchTerm,
    });
  },

  getMenuCategoryById: async (categoryId: number) => {
    try {
      const data = await menuCategoryClient.MenuCategoryGetMenuCategoryByIdGet(categoryId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  createMenuCategory: async (categoryData: any) => {
    try {
      const data = await menuCategoryClient.MenuCategoryCreateMenuCategoryPost(categoryData);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  updateMenuCategory: async (categoryId: number, categoryData: any) => {
    try {
      const data = await menuCategoryClient.MenuCategoryUpdateMenuCategoryPut(categoryId, categoryData);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  deleteMenuCategory: async (categoryId: number) => {
    try {
      const data = await menuCategoryClient.MenuCategoryDeleteMenuCategoryDelete(categoryId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getMenuCategoriesSimpleByBranch: async (branchId: string): Promise<MenuCategory[]> => {
    return menuCategoryClient.MenuCategoryGetMenuCategoriesSimpleByBranchGet(branchId) as Promise<MenuCategory[]>;
  },
};

// Deals API Helper Functions
export const dealsApi = {
  createDeal: async (dealData: any) => {
    try {
      const data = await dealsClient.DealsCreateDealPost(dealData);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getDealsByBranch: async (
    branchId: string,
    queryParams?: { [key: string]: string },
  ) => {
    return dealsClient.DealsGetDealsByBranchGet(branchId, undefined, queryParams);
  },

  getDeals: async (branchId: string, queryString?: string) => {
    if (!branchId) throw new Error("Branch ID is required");
    try {
      const data = await dealsClient.DealsGetDealsByBranchGet(branchId);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getDealById: async (dealId: string) => {
    return dealsClient.DealsGetDealByIdGet(dealId);
  },

  updateDeal: async (dealId: string, dealData: any) => {
    return dealsClient.DealsUpdateDealPut(dealId, dealData);
  },

  deleteDeal: async (dealId: number) => {
    return dealsClient.DealsDeleteDealDelete(dealId);
  },
};

// Discount API endpoints
export const discountsApi = {
  getDiscountsByBranch: async (
    branchId: string,
    queryParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    try {
      const data = await discountClient.DiscountGetDiscountsByBranchGet(branchId, queryParams);
      return { data, status: 200 } as ApiResponse<any>;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Error", status: 0 } as ApiResponse<any>;
    }
  },

  getDiscountById: async (discountId: number) => {
    return discountClient.DiscountGetDiscountByIdGet(discountId);
  },

  createDiscount: async (discountData: any) => {
    const data = await discountClient.DiscountCreateDiscountPost(discountData);
    return { data, status: 200 } as ApiResponse<any>;
  },

  updateDiscount: async (discountId: number, discountData: any) => {
    const data = await discountClient.DiscountUpdateDiscountPut(discountId, discountData);
    return { data, status: 200 } as ApiResponse<any>;
  },

  deleteDiscount: async (discountId: number) => {
    const data = await discountClient.DiscountDeleteDiscountDelete(discountId);
    return { data, status: 200 } as ApiResponse<any>;
  },

  getMenuItemsSimpleByBranch: async (branchId: string) => {
    return menuItemClient.MenuItemGetMenuItemsSimpleByBranchGet(branchId);
  },

  getDealsSimpleByBranch: async (branchId: string) => {
    return dealsClient.DealsGetDealsSimpleByBranchGet(branchId);
  },

  getDiscountsSimpleByBranch: async (branchId: string) => {
    return discountClient.DiscountGetDiscountsSimpleByBranchGet(branchId);
  },

  applyBulkDiscountToDeals: async (dealIds: string[], discountId: string) => {
    const data = await dealsClient.DealsBulkDiscountDealsPut({ dealIds, discountId } as any);
    return { data, status: 200 } as ApiResponse<any>;
  },

  applyBulkDiscountToMenu: async (menuItemIds: string[], discountId: string) => {
    const data = await menuItemClient.MenuItemBulkDiscountMenuPut({ menuItemIds, discountId } as any);
    return { data, status: 200 } as ApiResponse<any>;
  },
};

// Orders API Helper Functions
export const ordersApi = {
  getOrdersByBranch: async (
    branchId: string,
    pageNumber: number = 1,
    pageSize: number = 10,
    sortBy: string = "createdAt",
    isAscending: boolean = false,
    searchTerm: string = "",
    statuses: string[] = [],
  ): Promise<PaginationResponse<DetailedOrder> | null> => {
    return orderClient.OrderGetOrdersByBranchGet({
      BranchId: branchId,
      PageNumber: pageNumber,
      PageSize: pageSize,
      SortBy: sortBy,
      IsAscending: isAscending,
      SearchTerm: searchTerm || undefined,
      Status: statuses.length > 0 ? statuses.join(",") : undefined,
    });
  },

  getOrderStatusTypes: async (): Promise<Array<{ id: number; name: string }>> => {
    return genericClient.GenericGetOrderStatusTypesGet();
  },

  updateOrderStatus: async (
    orderId: number,
    statusId: number,
    comments: string = "No",
  ) => {
    return orderClient.OrderUpdateOrderStatusPut({
      orderId,
      status: statusId,
      comments,
    });
  },
};

// Services API Helper Functions
export const servicesApi = {
  getServicesByType: async (entityType: number): Promise<Service[]> => {
    return genericClient.GenericGetServicesByTypeGet(entityType) as Promise<Service[]>;
  },

  getBranchServices: async (branchId: string): Promise<BranchService[]> => {
    return branchServicesClient.BranchServicesGetBranchServicesGet(branchId) as Promise<BranchService[]>;
  },

  updateBranchServices: async (
    branchId: string,
    services: Array<{ serviceId: number; price: number }>,
  ) => {
    const data = await branchServicesClient.BranchServicesUpdateBranchServicesPut(branchId, services);
    return { data, status: 200 } as ApiResponse<any>;
  },
};

// Subscription API Helper Functions
export const subscriptionsApi = {
  getSubscriptionsByBranch: async (
    branchId: string,
  ): Promise<import("../types/schema").Subscription[]> => {
    const result = await subscriptionsNswagClient.SubscriptionsGetSubscriptionsByBranchGet(branchId);
    return Array.isArray(result) ? result : [];
  },

  applySubscription: async (
    data: import("../types/schema").ApplySubscriptionRequest,
  ): Promise<import("../types/schema").ApplySubscriptionResponse> => {
    const result = await subscriptionsNswagClient.SubscriptionsApplySubscriptionPost(data);
    if (!result) throw new Error("Failed to apply subscription");
    return result;
  },

  getCurrentSubscription: async (
    branchId: string,
  ): Promise<import("../types/schema").Subscription | null> => {
    return (await subscriptionsNswagClient.SubscriptionsGetCurrentSubscriptionGet(branchId)) || null;
  },

  calculateProratedAmount: async (
    data: import("../types/schema").CalculateProratedAmountRequest,
  ): Promise<import("../types/schema").CalculateProratedAmountResponse> => {
    const result = await subscriptionsNswagClient.SubscriptionsCalculateProratedAmountPost(data);
    if (!result) throw new Error("Failed to calculate prorated amount");
    return result;
  },

  changeSubscription: async (
    data: import("../types/schema").ChangeSubscriptionRequest,
  ): Promise<import("../types/schema").ChangeSubscriptionResponse> => {
    const result = await subscriptionsNswagClient.SubscriptionsChangeSubscriptionPost(data);
    if (!result) throw new Error("Failed to change subscription");
    return result;
  },

  cancelSubscription: async (
    data: import("../types/schema").CancelSubscriptionRequest,
  ): Promise<import("../types/schema").CancelSubscriptionResponse> => {
    const result = await subscriptionsNswagClient.SubscriptionsCancelSubscriptionPost(data);
    if (!result) throw new Error("Failed to cancel subscription");
    return result;
  },

  uploadPaymentProof: async (
    branchSubscriptionId: number,
    proofOfPayment: File,
  ): Promise<import("../types/schema").UploadPaymentProofResponse> => {
    const formData = new FormData();
    formData.append("BranchSubscriptionId", branchSubscriptionId.toString());
    formData.append("ProofOfPayment", proofOfPayment);
    const result = await subscriptionsNswagClient.SubscriptionsUploadPaymentProofPost(formData);
    if (!result) throw new Error("Failed to upload payment proof");
    return result;
  },
};

// Reservation API Helper Functions
export const reservationApi = {
  getReservationsByBranch: async (
    branchId: string,
    pageNumber: number = 1,
    pageSize: number = 10,
    sortBy: string = "name",
    isAscending: boolean = true,
  ): Promise<any> => {
    return reservationsClient.ReservationsGetReservationsByBranchGet(branchId, {
      PageNumber: pageNumber,
      PageSize: pageSize,
      SortBy: sortBy,
      IsAscending: isAscending,
    });
  },

  getReservationDetail: async (
    reservationId: number,
  ): Promise<import("../types/schema").ReservationDetail> => {
    const result = await reservationsClient.ReservationsGetReservationByIdGet(reservationId);
    if (!result) throw new Error("Failed to fetch reservation");
    return result;
  },

  updateReservationAction: async (
    reservationId: number,
    actionData: {
      actionTaken: import("../types/schema").ReservationStatus;
      remarks?: string | null;
    },
  ): Promise<void> => {
    await reservationsClient.ReservationsUpdateReservationActionPut(reservationId, actionData);
  },

  getReservationStatusTypes: async () => {
    return genericClient.GenericGetReservationStatusTypesGet();
  },

  createReservation: async (reservationData: any) => {
    return reservationsClient.ReservationsCreateReservationPost(reservationData);
  },

  updateReservation: async (reservationId: number, reservationData: any) => {
    return reservationsClient.ReservationsUpdateReservationPut(reservationId, reservationData);
  },

  deleteReservation: async (reservationId: number) => {
    return reservationsClient.ReservationsDeleteReservationDelete(reservationId);
  },
};

// Inventory API Helper Functions
export const inventoryApi = {
  getInventoryCategories: async (
    branchId: string,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    return inventoryClient.InventoryGetInventoryCategoriesGet(branchId, paginationParams) ?? [];
  },

  getInventoryCategoriesSimple: async (branchId: string) => {
    return inventoryClient.InventoryGetInventoryCategoriesSimpleGet(branchId);
  },

  createInventoryCategory: async (categoryData: {
    name: string;
    branchId: string;
  }) => {
    return inventoryClient.InventoryCreateInventoryCategoryPost(categoryData);
  },

  deleteInventoryCategory: async (categoryId: string) => {
    return inventoryClient.InventoryDeleteInventoryCategoryDelete(categoryId);
  },

  getInventorySuppliers: async (
    branchId: string,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    return inventoryClient.InventoryGetInventorySuppliersGet(branchId, paginationParams) ?? [];
  },

  getInventorySupplierById: async (supplierId: string) => {
    return inventoryClient.InventoryGetInventorySupplierByIdGet(supplierId);
  },

  createInventorySupplier: async (supplierData: {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    branchId: string;
  }) => {
    return inventoryClient.InventoryCreateInventorySupplierPost(supplierData);
  },

  updateInventorySupplier: async (
    supplierId: string,
    supplierData: {
      name: string;
      contactPerson: string;
      phone: string;
      email: string;
      address: string;
    },
  ) => {
    return inventoryClient.InventoryUpdateInventorySupplierPut(supplierId, supplierData);
  },

  deleteInventorySupplier: async (supplierId: string) => {
    return inventoryClient.InventoryDeleteInventorySupplierDelete(supplierId);
  },

  getInventoryItemsByBranch: async (
    branchId: string,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    return inventoryClient.InventoryGetInventoryItemsByBranchGet(branchId, paginationParams) ?? [];
  },

  getInventoryItemsSimpleByBranch: async (branchId: string) => {
    return inventoryClient.InventoryGetInventoryItemsSimpleByBranchGet(branchId);
  },

  getInventoryItemById: async (itemId: number) => {
    return inventoryClient.InventoryGetInventoryItemByIdGet(itemId);
  },

  createInventoryItem: async (itemData: {
    name: string;
    categoryId: string;
    branchId: string;
    unit: string;
    price: number;
    reorderLevel: number;
    defaultSupplierId?: string;
  }) => {
    return inventoryClient.InventoryCreateInventoryItemPost(itemData as any);
  },

  updateInventoryItem: async (
    itemId: string,
    itemData: {
      name: string;
      categoryId: string;
      unit: string;
      price: number;
      reorderLevel: number;
      defaultSupplierId?: string;
    },
  ) => {
    return inventoryClient.InventoryUpdateInventoryItemPut(itemId, itemData as any);
  },

  deleteInventoryItem: async (itemId: string) => {
    return inventoryClient.InventoryDeleteInventoryItemDelete(itemId);
  },

  getInventoryStockByBranch: async (
    branchId: string,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    return inventoryClient.InventoryGetInventoryStockByBranchGet(branchId, paginationParams) ?? [];
  },

  updateInventoryStock: async (
    branchId: string,
    stockData: { inventoryItemId: number; newStock: number; reason: string },
  ) => {
    return inventoryClient.InventoryUpdateInventoryStockPost(branchId, stockData);
  },

  getInventoryLowStockByBranch: async (
    branchId: string,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    return inventoryClient.InventoryGetInventoryLowStockByBranchGet(branchId, paginationParams) ?? [];
  },

  createPurchaseOrder: async (orderData: {
    supplierId: string;
    branchId: string;
    orderDate: string;
    status: number;
    items: { inventoryItemId: string; quantity: number; unitPrice: number }[];
  }) => {
    return inventoryClient.InventoryCreatePurchaseOrderPost(orderData as any);
  },

  getPurchaseOrdersByBranch: async (
    branchId: string,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    return inventoryClient.InventoryGetPurchaseOrdersByBranchGet(branchId, paginationParams) ?? [];
  },

  getPurchaseOrderById: async (orderId: number) => {
    return inventoryClient.InventoryGetPurchaseOrderByIdGet(orderId);
  },

  receivePurchaseOrder: async (
    orderId: number,
    items: { purchaseOrderItemId: number; receivedQuantity: number }[],
  ) => {
    return inventoryClient.InventoryReceivePurchaseOrderPut(orderId, { items });
  },

  cancelPurchaseOrder: async (orderId: number) => {
    return inventoryClient.InventoryCancelPurchaseOrderPut(orderId);
  },

  getMenuItemsSearch: async (branchId: string) => {
    return menuItemClient.MenuItemSearchGet(branchId);
  },

  getRecipesByBranch: async (
    branchId: string,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ): Promise<Recipe[]> => {
    return (await inventoryClient.InventoryGetRecipesByBranchGet(branchId, paginationParams) ?? []) as Recipe[];
  },

  getRecipeById: async (recipeId: number): Promise<RecipeDetail> => {
    return inventoryClient.InventoryGetRecipeByIdGet(recipeId) as Promise<RecipeDetail>;
  },

  createRecipe: async (recipeData: InsertRecipe): Promise<RecipeDetail> => {
    return inventoryClient.InventoryCreateRecipePost(recipeData) as Promise<RecipeDetail>;
  },

  updateRecipe: async (recipeId: string, recipeData: InsertRecipe): Promise<RecipeDetail> => {
    return inventoryClient.InventoryUpdateRecipePut(recipeId, recipeData) as Promise<RecipeDetail>;
  },

  deleteRecipe: async (recipeId: string): Promise<void> => {
    await inventoryClient.InventoryDeleteRecipeDelete(recipeId);
  },

  createInventoryWastage: async (wastageData: {
    branchId: string;
    inventoryItemId: string;
    quantity: number;
    reason: string;
  }) => {
    return inventoryClient.InventoryCreateInventoryWastagePost(wastageData as any);
  },

  getInventoryWastageByBranch: async (
    branchId: string,
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
    return inventoryClient.InventoryGetInventoryWastageByBranchGet(branchId, from, to, paginationParams) ?? [];
  },

  createUtilityExpense: async (expenseData: {
    branchId: string;
    type: string;
    unitConsumed: number;
    costPerUnit: number;
    readingDate: string;
    remarks?: string;
  }) => {
    return inventoryClient.InventoryCreateUtilityExpensePost(expenseData as any);
  },

  getUtilityExpensesByBranch: async (
    branchId: string,
    paginationParams?: {
      PageNumber?: number;
      PageSize?: number;
      SortBy?: string;
      IsAscending?: boolean;
      SearchTerm?: string;
    },
  ) => {
    return inventoryClient.InventoryGetUtilityExpensesByBranchGet(branchId, paginationParams) ?? [];
  },

  getUtilityExpenseById: async (id: number) => {
    return inventoryClient.InventoryGetUtilityExpenseByIdGet(id);
  },

  updateUtilityExpense: async (
    id: string,
    expenseData: {
      type: string;
      unitConsumed: number;
      costPerUnit: number;
      readingDate: string;
      remarks?: string;
      isActive?: boolean;
    },
  ) => {
    return inventoryClient.InventoryUpdateUtilityExpensePut(id, expenseData as any);
  },

  deleteUtilityExpense: async (id: string) => {
    return inventoryClient.InventoryDeleteUtilityExpenseDelete(id);
  },
};

// Helper to get full URL for images
export const getImageUrl = (relativePath: string): string => {
  if (!relativePath) return "";
  return `${API_BASE_URL}/${relativePath}`;
};
