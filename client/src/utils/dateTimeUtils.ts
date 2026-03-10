/**
 * Utility functions for date and time conversion
 * Handles UTC to local time conversion for order timestamps
 */

/**
 * Converts UTC date string to local time
 * @param utcDateString - UTC date string from API (e.g., "2025-10-19T17:48:12.037288")
 * @returns Formatted local date and time string
 */
export const convertUtcToLocal = (utcDateString: string): string => {
  if (!utcDateString) return '';
  
  try {
    const utcDate = new Date(utcDateString);
    
    // Check if the date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date string:', utcDateString);
      return '';
    }
    
    // Return local date time string
    return utcDate.toLocaleString();
  } catch (error) {
    console.error('Error converting UTC to local time:', error);
    return '';
  }
};

/**
 * Converts UTC date string to local time with custom format
 * @param utcDateString - UTC date string from API
 * @param options - Intl.DateTimeFormatOptions for custom formatting
 * @returns Formatted local date and time string
 */
export const convertUtcToLocalCustom = (
  utcDateString: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!utcDateString) return '';
  
  try {
    const utcDate = new Date(utcDateString);
    
    // Check if the date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date string:', utcDateString);
      return '';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    };
    
    return utcDate.toLocaleString(undefined, options || defaultOptions);
  } catch (error) {
    console.error('Error converting UTC to local time:', error);
    return '';
  }
};

/**
 * Converts UTC date string to local date only (no time)
 * @param utcDateString - UTC date string from API
 * @returns Formatted local date string
 */
export const convertUtcToLocalDate = (utcDateString: string): string => {
  if (!utcDateString) return '';
  
  try {
    const utcDate = new Date(utcDateString);
    
    // Check if the date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date string:', utcDateString);
      return '';
    }
    
    return utcDate.toLocaleDateString();
  } catch (error) {
    console.error('Error converting UTC to local date:', error);
    return '';
  }
};

/**
 * Converts UTC date string to local time only (no date)
 * @param utcDateString - UTC date string from API
 * @returns Formatted local time string
 */
export const convertUtcToLocalTime = (utcDateString: string): string => {
  if (!utcDateString) return '';
  
  try {
    const utcDate = new Date(utcDateString);
    
    // Check if the date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date string:', utcDateString);
      return '';
    }
    
    return utcDate.toLocaleTimeString();
  } catch (error) {
    console.error('Error converting UTC to local time:', error);
    return '';
  }
};

/**
 * Formats date for receipt printing (compact format)
 * Converts UTC time to browser's local timezone
 * @param utcDateString - UTC date string from API (e.g., "2025-10-19T17:48:12.037288")
 * @returns Formatted string like "Oct 19, 2025 10:48 PM" (in local time)
 */
export const formatReceiptDateTime = (utcDateString: string): string => {
  if (!utcDateString) return '';
  
  try {
    // Ensure the date string is treated as UTC by appending 'Z' if not present
    let dateString = utcDateString.trim();
    if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('T')) {
      // If it's a simple date format, convert to ISO
      dateString = new Date(dateString).toISOString();
    } else if (!dateString.endsWith('Z') && dateString.includes('T') && !dateString.includes('+')) {
      // If it has 'T' but no timezone indicator, append 'Z' to mark as UTC
      dateString = dateString + 'Z';
    }
    
    const utcDate = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(utcDate.getTime())) {
      console.error('Invalid date string:', utcDateString);
      return '';
    }
    
    // Log for debugging
    console.log('[DateTime] UTC input:', utcDateString);
    console.log('[DateTime] Parsed UTC date:', utcDate.toISOString());
    console.log('[DateTime] Local date:', utcDate.toLocaleString());
    
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    
    // toLocaleString automatically converts to browser's local timezone
    const localTimeString = utcDate.toLocaleString(undefined, options);
    console.log('[DateTime] Formatted local time:', localTimeString);
    
    return localTimeString;
  } catch (error) {
    console.error('Error formatting receipt date time:', error);
    return '';
  }
};
