import { API_BASE_URL } from './apiRepository';

/**
 * Utility function to get the full image URL
 * @param imageUrl - The image URL from the API (could be relative or absolute)
 * @returns Full image URL with base URL if needed
 */
export const getFullImageUrl = (imageUrl: string | null | undefined): string => {
  // Return empty string if no image URL
  if (!imageUrl) {
    return '';
  }

  // Return as-is if it's already a full URL (http/https) or base64 data
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // Add base URL if it's a relative path
  if (imageUrl.startsWith('/')) {
    return `${API_BASE_URL}${imageUrl}`;
  }

  // Add base URL with slash if it's a relative path without leading slash
  return `${API_BASE_URL}/${imageUrl}`;
};

/**
 * Get image URL with fallback for entity profile pictures
 */
export const getEntityImageUrl = (profilePictureUrl: string | null | undefined): string => {
  const fullUrl = getFullImageUrl(profilePictureUrl);
  return fullUrl || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200";
};

/**
 * Get image URL with fallback for branch logos
 */
export const getBranchImageUrl = (logoUrl: string | null | undefined): string => {
  const fullUrl = getFullImageUrl(logoUrl);
  return fullUrl || "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200";
};