// Generic pagination interfaces and types
export interface PaginationRequest {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  isAscending?: boolean;
  searchTerm?: string;
}

export interface PaginationResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface PaginationConfig {
  defaultPageSize: number;
  pageSizeOptions: number[];
}

// Generic pagination configuration
export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 20, 50, 100],
};

// Helper function to create pagination request
export const createPaginationRequest = (
  pageNumber: number,
  pageSize: number = DEFAULT_PAGINATION_CONFIG.defaultPageSize,
  sortBy?: string,
  isAscending: boolean = true,
  searchTerm?: string
): PaginationRequest => ({
  pageNumber,
  pageSize,
  sortBy,
  isAscending,
  searchTerm,
});

// Helper function to build query string for pagination
export const buildPaginationQuery = (request: PaginationRequest): string => {
  const params = new URLSearchParams({
    PageNumber: request.pageNumber.toString(),
    PageSize: request.pageSize.toString(),
  });

  if (request.sortBy) {
    params.append('SortBy', request.sortBy);
  }
  
  if (request.isAscending !== undefined) {
    params.append('IsAscending', request.isAscending.toString());
  }
  
  if (request.searchTerm) {
    params.append('SearchTerm', request.searchTerm);
  }

  return params.toString();
};