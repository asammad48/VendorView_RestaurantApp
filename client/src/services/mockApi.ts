// Mock API Service - replaces external API calls with mock data
// This ensures the application works without external dependencies

export interface MockApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Mock data for entities
const mockEntities = [
  {
    id: 1,
    name: 'Restaurant Chain A',
    primaryColor: '#16A34A', // Green
    entityType: 'restaurant'
  },
  {
    id: 2,
    name: 'Restaurant Chain B', 
    primaryColor: '#2563EB', // Blue
    entityType: 'restaurant'
  },
  {
    id: 3,
    name: 'Restaurant Chain C',
    primaryColor: '#DC2626', // Red
    entityType: 'restaurant'
  }
];

// Mock data for branches
const mockBranches = [
  {
    id: 1,
    entityId: 3,
    name: 'Downtown Branch',
    address: '123 Main St',
    phone: '+1234567890'
  },
  {
    id: 2, 
    entityId: 3,
    name: 'Mall Branch',
    address: '456 Mall Ave',
    phone: '+1234567891'
  }
];

// Mock users
const mockUsers = [
  {
    id: 1,
    entityId: 3,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin'
  }
];

// Mock API service
export class MockApiService {
  private delay(ms: number = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Entity API methods
  async getEntityPrimaryColor(entityId: number): Promise<MockApiResponse<{primaryColor: string}>> {
    await this.delay(300);
    
    const entity = mockEntities.find(e => e.id === entityId);
    if (!entity) {
      return {
        error: 'Entity not found',
        status: 404
      };
    }
    
    return {
      data: { primaryColor: entity.primaryColor },
      status: 200
    };
  }

  async updateEntityPrimaryColor(entityId: number, primaryColor: string): Promise<MockApiResponse<{success: boolean}>> {
    await this.delay(500);
    
    const entity = mockEntities.find(e => e.id === entityId);
    if (!entity) {
      return {
        error: 'Entity not found',
        status: 404
      };
    }
    
    // Update the mock data
    entity.primaryColor = primaryColor;
    
    return {
      data: { success: true },
      status: 200
    };
  }

  // Branch API methods
  async getBranchesByEntity(entityId: number): Promise<MockApiResponse<any[]>> {
    await this.delay(400);
    
    const branches = mockBranches.filter(b => b.entityId === entityId);
    return {
      data: branches,
      status: 200
    };
  }

  async getBranchById(branchId: number): Promise<MockApiResponse<any>> {
    await this.delay(300);
    
    const branch = mockBranches.find(b => b.id === branchId);
    if (!branch) {
      return {
        error: 'Branch not found',
        status: 404
      };
    }
    
    return {
      data: branch,
      status: 200
    };
  }

  // User API methods
  async getUsers(queryString: string): Promise<MockApiResponse<{items: any[], totalCount: number}>> {
    await this.delay(600);
    
    return {
      data: {
        items: mockUsers,
        totalCount: mockUsers.length
      },
      status: 200
    };
  }

  async createUser(userData: any): Promise<MockApiResponse<any>> {
    await this.delay(800);
    
    const newUser = {
      id: mockUsers.length + 1,
      ...userData
    };
    
    mockUsers.push(newUser);
    
    return {
      data: newUser,
      status: 201
    };
  }

  // Generic success response for other operations
  async genericSuccessResponse<T>(data?: T): Promise<MockApiResponse<T>> {
    await this.delay(400);
    
    return {
      data: data || ({} as T),
      status: 200
    };
  }

  // Generic error response
  async genericErrorResponse(message: string, status: number = 400): Promise<MockApiResponse<any>> {
    await this.delay(200);
    
    return {
      error: message,
      status: status
    };
  }
}

export const mockApiService = new MockApiService();