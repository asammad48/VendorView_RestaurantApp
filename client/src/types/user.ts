// User-related interfaces
export interface User {
  id: number;
  name: string;
  email: string;
  mobileNumber: string;
  profilePicture?: string;
  branchName?: string;
  roleId?: number;
  branchId?: number;
}

export interface UserListItem {
  id: number;
  name: string;
  email: string;
  mobileNumber: string;
  profilePicture?: string;
  branchName: string;
}

export interface UserDetailsResponse {
  id: number;
  name: string;
  email: string;
  mobileNumber: string;
  profilePicture?: string;
  branchId: number;
  entityId: number;
  roleId: number;
}