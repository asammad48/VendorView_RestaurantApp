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

/**
 * Check if a string is an image filename (has image extension)
 */
const isImageFilename = (filename: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'];
  const lowerFilename = filename.toLowerCase();
  return imageExtensions.some(ext => lowerFilename.endsWith(ext));
};

/**
 * Get profile picture URL or null if it's a text avatar (emoji)
 * @param profilePicture - Profile picture value (can be URL, path, or text/emoji)
 * @returns Image URL with base URL if it's an image path, null if it's text/emoji, or the URL if it's already a full URL
 */
export const getProfilePictureUrl = (profilePicture: string | null | undefined): string | null => {
  // Return null if no profile picture
  if (!profilePicture) {
    return null;
  }

  // If it's already a full URL (http/https) or base64 data, return as-is
  if (profilePicture.startsWith('http') || profilePicture.startsWith('data:')) {
    return profilePicture;
  }

  // If it contains a path separator (/ or \), it's an image path - prepend base URL
  if (profilePicture.includes('/') || profilePicture.includes('\\')) {
    if (profilePicture.startsWith('/')) {
      return `${API_BASE_URL}${profilePicture}`;
    }
    return `${API_BASE_URL}/${profilePicture}`;
  }

  // If it's a bare filename with image extension (e.g., "avatar.png"), treat as image
  if (isImageFilename(profilePicture)) {
    return `${API_BASE_URL}/${profilePicture}`;
  }

  // Otherwise it's text (like an emoji) - return null so it can be displayed as text
  return null;
};

/**
 * Check if profile picture is a text avatar (emoji) rather than an image URL
 */
export const isTextAvatar = (profilePicture: string | null | undefined): boolean => {
  if (!profilePicture) {
    return false;
  }
  
  // If it's a URL or base64, it's not a text avatar
  if (profilePicture.startsWith('http') || profilePicture.startsWith('data:')) {
    return false;
  }
  
  // If it contains path separators, it's an image path
  if (profilePicture.includes('/') || profilePicture.includes('\\')) {
    return false;
  }
  
  // If it has an image extension, it's an image filename
  if (isImageFilename(profilePicture)) {
    return false;
  }
  
  // Otherwise it's text (like an emoji)
  return true;
};