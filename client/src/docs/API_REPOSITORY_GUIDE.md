# API Repository System Guide

## Overview

The API Repository system provides a centralized, standardized way to handle all API calls with automatic error handling, token refresh, and configurable endpoints.

## Key Features

- ✅ **Centralized Error Handling**: Automatic handling for 400, 401, 403, 404, 500 status codes
- ✅ **Automatic Token Refresh**: Handles 401 responses by refreshing tokens automatically
- ✅ **Configurable Base URL**: Easy to change API base URL
- ✅ **Configurable Endpoints**: String-based endpoint configuration for easy updates
- ✅ **Consistent Response Format**: Standardized response structure across all API calls
- ✅ **TypeScript Support**: Full type safety for requests and responses

## Quick Start

### 1. Basic API Call

```typescript
import { apiRepository } from '../lib/apiRepository';

// GET request
const response = await apiRepository.call<User[]>('getUsers', 'GET');

// POST request
const response = await apiRepository.call<User>('createUser', 'POST', userData);

// PUT request with ID parameter
apiRepository.updateEndpoint('updateUser', '/api/users/123');
const response = await apiRepository.call<User>('updateUser', 'PUT', userData);
```

### 2. Using Service Classes (Recommended)

```typescript
import { UserService } from '../services/userService';

// Get all users
const { users, error } = await UserService.getUsers();

// Create user
const { user, error, success } = await UserService.createUser(userData);

// Update user
const { user, error, success } = await UserService.updateUser('123', userData);
```

### 3. Using React Hooks

```typescript
import { useApiCall } from '../hooks/useApiCall';
import { UserService } from '../services/userService';

function UserComponent() {
  const { data, loading, error, execute } = useApiCall(UserService.getUsers);

  useEffect(() => {
    execute(); // Fetch users on component mount
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {data?.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}
```

## Configuration

### Base URL Configuration

```typescript
import { apiRepository } from '../lib/apiRepository';

// Update base URL
apiRepository.updateConfig({ 
  baseUrl: 'https://your-new-api.com' 
});
```

### Endpoint Configuration

```typescript
// Update single endpoint
apiRepository.updateEndpoint('signup', '/api/v2/users/restaurant-owner');

// Update multiple endpoints
apiRepository.updateConfig({
  endpoints: {
    ...apiRepository.getConfig().endpoints,
    signup: '/api/v2/users/restaurant-owner',
    login: '/api/v2/auth/login'
  }
});
```

### Current Endpoints

```typescript
const endpoints = {
  // Authentication
  login: '/api/auth/login',
  signup: '/api/User/restaurant-owner',
  refreshToken: '/api/auth/refresh',
  
  // Users
  getUsers: '/api/users',
  createUser: '/api/users',
  updateUser: '/api/users/{id}',
  deleteUser: '/api/users/{id}',
  
  // Entities
  getEntities: '/api/entities',
  createEntity: '/api/entities',
  updateEntity: '/api/entities/{id}',
  deleteEntity: '/api/entities/{id}',
  
  // And more...
};
```

## Error Handling

The system automatically handles common HTTP status codes:

- **400 Bad Request**: Shows validation errors from server
- **401 Unauthorized**: Automatically refreshes tokens and retries
- **403 Forbidden**: Shows permission error
- **404 Not Found**: Shows resource not found error
- **422 Unprocessable Entity**: Processes validation error arrays and joins them with ". "
- **500 Server Error**: Shows server error message

### Custom Error Handling

```typescript
import { getErrorMessage, isResponseSuccessful } from '../lib/apiHelpers';

const response = await apiRepository.call('getUsers');

if (!isResponseSuccessful(response)) {
  const errorMsg = getErrorMessage(response);
  console.error('API Error:', errorMsg);
}
```

## Token Management

### Automatic Token Handling

The repository automatically:
1. Includes `Authorization: Bearer <token>` header for authenticated requests
2. Refreshes expired tokens when receiving 401 responses
3. Retries the original request after successful token refresh
4. Clears tokens and handles authentication failure if refresh fails

### Manual Token Management

```typescript
// Set tokens (e.g., after login)
apiRepository.setTokens(accessToken, refreshToken);

// Check authentication status
const isAuthenticated = apiRepository.isAuthenticated();

// Get current token
const token = apiRepository.getAccessToken();
```

## Adding New API Endpoints

### 1. Add to Configuration

```typescript
// In apiRepository.ts, add to defaultApiConfig.endpoints
export const defaultApiConfig: ApiConfig = {
  baseUrl: 'https://81w6jsg0-7261.inc1.devtunnels.ms',
  endpoints: {
    // ... existing endpoints
    getOrders: '/api/orders',
    createOrder: '/api/orders',
    updateOrder: '/api/orders/{id}',
    deleteOrder: '/api/orders/{id}',
  }
};
```

### 2. Create Service Class

```typescript
// Create services/orderService.ts
export class OrderService {
  static async getOrders(): Promise<{ orders?: Order[]; error?: string }> {
    const response = await apiGet<Order[]>('getOrders');
    return isResponseSuccessful(response) 
      ? { orders: response.data }
      : { error: getErrorMessage(response) };
  }

  static async createOrder(orderData: any): Promise<{ order?: Order; error?: string; success?: string }> {
    const response = await apiPost<Order>('createOrder', orderData);
    return isResponseSuccessful(response)
      ? { order: response.data, success: getSuccessMessage('create') }
      : { error: getErrorMessage(response) };
  }
}
```

### 3. Use in Components

```typescript
import { useApiCall } from '../hooks/useApiCall';
import { OrderService } from '../services/orderService';

function OrdersPage() {
  const { data: orders, loading, execute } = useApiCall(OrderService.getOrders);

  useEffect(() => {
    execute();
  }, []);

  // Component render logic...
}
```

## Best Practices

### 1. Use Service Classes
- Organize API calls by domain (users, orders, etc.)
- Include proper TypeScript types
- Handle both success and error cases

### 2. Use React Hooks for Components
- `useApiCall` for data fetching
- `useApiCallNoData` for operations like delete
- Always handle loading and error states

### 3. Centralized Configuration
- Keep all endpoints in the configuration object
- Use string constants for endpoint keys
- Update base URL in one place when needed

### 4. Consistent Error Handling
- Use `getErrorMessage()` for user-friendly error messages
- Use `isResponseSuccessful()` to check response status
- Show appropriate toast notifications

### 5. Type Safety
- Define interfaces for your data models
- Use generic types for API responses
- Leverage TypeScript for better development experience

## Example: Complete Feature Implementation

Here's how to implement a complete feature using the API repository:

```typescript
// 1. Define types
interface Restaurant {
  id: string;
  name: string;
  address: string;
  status: string;
}

// 2. Create service
export class RestaurantService {
  static async getRestaurants(): Promise<{ restaurants?: Restaurant[]; error?: string }> {
    const response = await apiGet<Restaurant[]>('getRestaurants');
    return isResponseSuccessful(response) 
      ? { restaurants: response.data }
      : { error: getErrorMessage(response) };
  }
}

// 3. Use in component
function RestaurantsPage() {
  const { data: restaurants, loading, error, execute } = useApiCall(RestaurantService.getRestaurants);

  useEffect(() => {
    execute();
  }, []);

  if (loading) return <div>Loading restaurants...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {restaurants?.map(restaurant => (
        <div key={restaurant.id}>{restaurant.name}</div>
      ))}
    </div>
  );
}
```

This system provides a robust, scalable foundation for all API interactions in your application.