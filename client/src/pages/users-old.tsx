import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import UsersTable from "@/components/users-table";
import AddUserModal from "@/components/add-user-modal";
import DeleteUserModal from "@/components/delete-user-modal";
import { PaginationRequest, PaginationResponse, DEFAULT_PAGINATION_CONFIG, buildPaginationQuery } from "@/types/pagination";
import { UserListItem } from "@/types/user";
import { userApi } from "@/lib/apiRepository";

export default function Users() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGINATION_CONFIG.defaultPageSize);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [nameSearchTerm, setNameSearchTerm] = useState("");
  
  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserListItem | null>(null);

  const { data: usersResponse, isLoading } = useQuery<PaginationResponse<UserListItem>>({
    queryKey: ["users", currentPage, pageSize, nameSearchTerm],
    queryFn: async () => {
      const token = localStorage.getItem('access_token') || localStorage.getItem('auth_token');
      const paginationRequest: PaginationRequest = {
        pageNumber: currentPage,
        pageSize: pageSize,
        sortBy: 'name',
        isAscending: true,
        searchTerm: nameSearchTerm || undefined,
      };

      const queryString = buildPaginationQuery(paginationRequest);
      const response = await userApi.getUsers(queryString);
      
      if (response.error) {
        throw new Error(response.error);
      }

      return response.data as PaginationResponse<UserListItem>;
    },
  });

  const users = usersResponse?.items || [];
  const totalPages = usersResponse?.totalPages || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loading-spinner" data-testid="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="users-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800" data-testid="page-title">Users</h2>
        <Button 
          className="bg-green-500 hover:bg-green-600" 
          onClick={() => {
            setEditingUser(null);
            setIsAddUserModalOpen(true);
          }}
          data-testid="button-add-user"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>



      {/* Active Filters Display */}
      {(nameSearchTerm || roleFilters.length > 0 || branchFilter || statusFilters.length > 0) && (
        <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
          <span>Active filters:</span>
          {nameSearchTerm && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md">
              Name: "{nameSearchTerm}"
              <button
                onClick={() => setNameSearchTerm("")}
                className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                title="Remove name filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {roleFilters.map((role) => (
            <span key={role} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md">
              Role: {role}
              <button
                onClick={() => setRoleFilters(roleFilters.filter(r => r !== role))}
                className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                title={`Remove ${role} role filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {branchFilter && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md">
              Branch: "{branchFilter}"
              <button
                onClick={() => setBranchFilter("")}
                className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                title="Remove branch filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {statusFilters.map((status) => (
            <span key={status} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md">
              Status: {status}
              <button
                onClick={() => setStatusFilters(statusFilters.filter(s => s !== status))}
                className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                title={`Remove ${status} status filter`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {/* Clear All Filters Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNameSearchTerm("");
              setRoleFilters([]);
              setBranchFilter("");
              setStatusFilters([]);
            }}
            className="ml-2 text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            <X className="w-3 h-3 mr-1" />
            Clear All
          </Button>
        </div>
      )}

      {/* Users Table */}
      <UsersTable 
        users={paginatedUsers}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(newItemsPerPage) => {
          setItemsPerPage(newItemsPerPage);
          setCurrentPage(1);
        }}
        onNameSearch={setNameSearchTerm}
        onNameSearchClear={() => setNameSearchTerm("")}
        onRoleFilter={setRoleFilters}
        onRoleFilterClear={() => setRoleFilters([])}
        onBranchFilter={setBranchFilter}
        onBranchFilterClear={() => setBranchFilter("")}
        onStatusFilter={setStatusFilters}
        onStatusFilterClear={() => setStatusFilters([])}
        nameSearchValue={nameSearchTerm}
        roleFilterValues={roleFilters}
        branchFilterValue={branchFilter}
        statusFilterValues={statusFilters}
        onEditUser={(user) => {
          setEditingUser(user);
          setIsAddUserModalOpen(true);
        }}
        onDeleteUser={(user) => {
          setUserToDelete(user);
          setIsDeleteModalOpen(true);
        }}
      />

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => {
          setIsAddUserModalOpen(false);
          setEditingUser(null);
        }}
        editingUser={editingUser}
      />

      {/* Delete User Modal */}
      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        user={userToDelete}
        onConfirm={() => {
          // Handle delete logic here
          console.log("Deleting user:", userToDelete);
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        }}
      />
    </div>
  );
}
