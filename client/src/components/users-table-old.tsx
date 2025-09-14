import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, ArrowUpDown, Search, Edit, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SearchTooltip } from "@/components/SearchTooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserListItem } from "@/types/user";
import { DEFAULT_PAGINATION_CONFIG } from "@/types/pagination";

interface UsersTableProps {
  users: UserListItem[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  onNameSearch?: (value: string) => void;
  onNameSearchClear?: () => void;
  nameSearchValue?: string;
  onEditUser?: (user: UserListItem) => void;
  onDeleteUser?: (user: UserListItem) => void;
}

export default function UsersTable({
  users,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  onNameSearch = () => {},
  onNameSearchClear = () => {},
  nameSearchValue = '',
  onEditUser = () => {},
  onDeleteUser = () => {},
}: UsersTableProps) {
  

  return (
    <Card className="bg-white border border-gray-100 overflow-hidden" data-testid="users-table-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" data-testid="users-table">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-name">
                <div className="flex items-center space-x-2">
                  <span>Name</span>
                  <SearchTooltip
                    placeholder="Search by name..."
                    onSearch={onNameSearch}
                    onClear={onNameSearchClear}
                    currentValue={nameSearchValue}
                  />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-email">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-phone">
                Phone Number
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-branch">
                Branch
              </th>

              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-actions">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="table-row" data-testid={`user-row-${user.id}`}>
                <td className="px-6 py-4 whitespace-nowrap" data-testid={`user-name-${user.id}`}>
                  <div className="flex items-center">
                    {user.profilePicture && (
                      <img 
                        className="h-10 w-10 rounded-full mr-3" 
                        src={user.profilePicture} 
                        alt={user.name}
                      />
                    )}
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap" data-testid={`user-email-${user.id}`}>
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap" data-testid={`user-phone-${user.id}`}>
                  <div className="text-sm text-gray-900">{user.mobileNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap" data-testid={`user-branch-${user.id}`}>
                  <div className="text-sm text-gray-900">{user.branchName || "-"}</div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800"
                        data-testid={`user-actions-${user.id}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onEditUser(user)}
                        data-testid={`edit-user-${user.id}`}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDeleteUser(user)}
                        data-testid={`delete-user-${user.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <CardContent>
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => onItemsPerPageChange(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[70px]" data-testid="select-items-per-page">
                    <SelectValue placeholder={itemsPerPage.toString()} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map((pageSize) => (
                      <SelectItem key={pageSize} value={pageSize.toString()}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  data-testid="button-first-page"
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  data-testid="button-last-page"
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronRight className="h-4 w-4" />
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
