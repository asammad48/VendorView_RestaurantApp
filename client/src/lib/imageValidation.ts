export interface ImageConstraints {
  width: number;
  height?: number;
  minHeight?: number;
  maxHeight?: number;
  maxSizeInMB: number;
  allowedTypes?: string[];
}

export type ImageType = 'deal' | 'menuItem' | 'entity' | 'branchLogo' | 'branchBanner';

// Define constraints for different image types
export const IMAGE_CONSTRAINTS: Record<ImageType, ImageConstraints> = {
  deal: {
    width: 400,
    height: 300,
    maxSizeInMB: 2,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  },
  menuItem: {
    width: 400,
    height: 300,
    maxSizeInMB: 2,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  },
  entity: {
    width: 400,
    height: 300,
    maxSizeInMB: 2,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  },
  branchLogo: {
    width: 512,
    height: 512,
    maxSizeInMB: 4,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  },
  branchBanner: {
    width: 1440,
    minHeight: 160,
    maxHeight: 190,
    maxSizeInMB: 7,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  }
};

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationOptions {
  checkDimensions?: boolean;
  checkFileSize?: boolean;
  checkFileType?: boolean;
}

/**
 * Validates an image file against specific constraints
 */
export async function validateImage(
  file: File,
  imageType: ImageType,
  options: ValidationOptions = {
    checkDimensions: true,
    checkFileSize: true,
    checkFileType: true
  }
): Promise<ValidationResult> {
  const constraints = IMAGE_CONSTRAINTS[imageType];

  // Check file type
  if (options.checkFileType && constraints.allowedTypes) {
    if (!constraints.allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `Invalid file type. Please select a ${constraints.allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} file.`
      };
    }
  }

  // Check file size
  if (options.checkFileSize) {
    const maxSizeInBytes = constraints.maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return {
        isValid: false,
        error: `File size exceeds ${constraints.maxSizeInMB}MB limit. Please select a smaller image.`
      };
    }
  }

  // Check image dimensions
  if (options.checkDimensions) {
    try {
      const dimensions = await getImageDimensions(file);
      
      // Check width
      if (dimensions.width !== constraints.width) {
        return {
          isValid: false,
          error: `Image width must be exactly ${constraints.width} pixels. Current image is ${dimensions.width} pixels wide.`
        };
      }
      
      // Check height (exact or range)
      if (constraints.height !== undefined) {
        // Exact height requirement
        if (dimensions.height !== constraints.height) {
          return {
            isValid: false,
            error: `Image dimensions must be exactly ${constraints.width}x${constraints.height} pixels. Current image is ${dimensions.width}x${dimensions.height} pixels.`
          };
        }
      } else if (constraints.minHeight !== undefined && constraints.maxHeight !== undefined) {
        // Height range requirement
        if (dimensions.height < constraints.minHeight || dimensions.height > constraints.maxHeight) {
          return {
            isValid: false,
            error: `Image height must be between ${constraints.minHeight} and ${constraints.maxHeight} pixels. Current image is ${dimensions.height} pixels tall.`
          };
        }
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to read image dimensions. Please select a valid image file.'
      };
    }
  }

  return { isValid: true };
}

/**
 * Gets the dimensions of an image file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Gets a user-friendly description of image constraints
 */
export function getConstraintDescription(imageType: ImageType): string {
  const constraints = IMAGE_CONSTRAINTS[imageType];
  
  let dimensionText: string;
  if (constraints.height !== undefined) {
    // Exact height
    dimensionText = `${constraints.width}x${constraints.height} pixels`;
  } else if (constraints.minHeight !== undefined && constraints.maxHeight !== undefined) {
    // Height range
    dimensionText = `${constraints.width}x${constraints.minHeight}–${constraints.maxHeight} pixels`;
  } else {
    // Fallback (should not happen with current constraints)
    dimensionText = `${constraints.width} pixels wide`;
  }
  
  return `${dimensionText}, max ${constraints.maxSizeInMB}MB`;
}

/**
 * Formats file size in a human-readable way
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}