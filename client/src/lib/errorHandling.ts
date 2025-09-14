import { ApiResponse } from './apiRepository';

/**
 * Generic error handler for API responses
 * Converts API response errors into user-friendly messages
 */
export function handleApiResponse<T>(response: ApiResponse<T>): T {
  if (response.error) {
    // Log the full response for debugging
    console.log('API Error Response:', { 
      error: response.error, 
      status: response.status,
      data: response.data 
    });
    
    // Enhance generic error messages with more specific information
    let errorMessage = response.error;
    
    // Handle common generic error messages from the API
    if (errorMessage.includes('An error occurred while saving') || 
        errorMessage.includes('See the inner exception for details')) {
      
      // Map status codes to user-friendly messages
      switch (response.status) {
        case 400:
          errorMessage = 'Invalid data provided. Please check your input and try again.';
          break;
        case 401:
          errorMessage = 'Authentication required. Please log in and try again.';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 422:
          errorMessage = 'Validation failed. Please check your input data.';
          break;
        case 500:
          errorMessage = 'Server error occurred. Please try again later.';
          break;
        default:
          errorMessage = 'An unexpected error occurred. Please try again.';
      }
    }
    
    // Add more context for debugging
    console.log('Processed error message:', errorMessage);
    
    // Return a standardized error that React Query can handle
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).originalError = response.error;
    throw error;
  }
  
  return response.data as T;
}

/**
 * Generic mutation function that handles API calls with proper error handling
 * This version doesn't throw exceptions - it lets React Query handle the error flow
 */
export function createApiMutation<TData, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>
) {
  return async (variables: TVariables): Promise<TData> => {
    try {
      const response = await mutationFn(variables);
      
      if (response.error) {
        // Log the full response for debugging
        console.log('API Error Response:', { 
          error: response.error, 
          status: response.status,
          data: response.data 
        });
        
        // Enhance generic error messages with more specific information
        let errorMessage = response.error;
        
        // Handle common generic error messages from the API
        if (errorMessage.includes('An error occurred while saving') || 
            errorMessage.includes('See the inner exception for details')) {
          
          // Map status codes to user-friendly messages
          switch (response.status) {
            case 400:
              errorMessage = 'Invalid data provided. Please check your input and try again.';
              break;
            case 401:
              errorMessage = 'Authentication required. Please log in and try again.';
              break;
            case 403:
              errorMessage = 'You do not have permission to perform this action.';
              break;
            case 404:
              errorMessage = 'The requested resource was not found.';
              break;
            case 422:
              errorMessage = 'Validation failed. Please check your input data.';
              break;
            case 500:
              errorMessage = 'Server error occurred. Please try again later.';
              break;
            default:
              errorMessage = 'An unexpected error occurred. Please try again.';
          }
        }
        
        console.log('Processed error message:', errorMessage);
        
        // Create and throw error for React Query to catch
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).originalError = response.error;
        throw error;
      }
      
      return response.data as TData;
    } catch (error) {
      // Re-throw the error so React Query's onError can handle it
      throw error;
    }
  };
}

/**
 * Error formatting for user-friendly display
 */
export function formatApiError(error: any): string {
  if (!error) return 'An unexpected error occurred';
  
  // If it's already a formatted error message from the API
  if (typeof error === 'string') {
    // Handle generic API error messages
    if (error.includes('An error occurred while saving') || 
        error.includes('See the inner exception for details')) {
      return 'Failed to save changes. Please check your input and try again.';
    }
    return error;
  }
  
  // If it has a message property
  if (error.message) {
    // Handle generic API error messages in the message property
    if (error.message.includes('An error occurred while saving') || 
        error.message.includes('See the inner exception for details')) {
      return 'Failed to save changes. Please check your input and try again.';
    }
    return error.message;
  }
  
  // If it's a validation error object
  if (error.errors && typeof error.errors === 'object') {
    const messages = Object.values(error.errors).flat();
    return messages.join('. ');
  }
  
  // Default fallback
  return 'An unexpected error occurred';
}

/**
 * Generic query function wrapper for React Query
 */
export function createApiQuery<T>(
  queryFn: () => Promise<ApiResponse<T>>
) {
  return async (): Promise<T> => {
    const response = await queryFn();
    return handleApiResponse(response);
  };
}