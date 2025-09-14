import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
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
import { useState } from "react";

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
  const [localNameSearch, setLocalNameSearch] = useState(nameSearchValue);
  const [showNameSearch, setShowNameSearch] = useState(false);

  const handleNameSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNameSearch(localNameSearch);
  };

  const handleNameSearchClear = () => {
    setLocalNameSearch('');
    onNameSearchClear();
    setShowNameSearch(false);
  };

  return (
    <Card className="bg-white border border-gray-100 overflow-hidden" data-testid="users-table-card">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" data-testid="users-table">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" data-testid="header-name">
                <div className="flex items-center space-x-2">
                  <span>Name</span>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNameSearch(!showNameSearch)}
                      className="h-6 w-6 p-0"
                      data-testid="button-name-search-toggle"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    {showNameSearch && (
                      <div className="absolute top-8 left-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg p-3 min-w-[200px]">
                        <form onSubmit={handleNameSearchSubmit} className="space-y-2">
                          <Input
                            placeholder="Search by name..."
                            value={localNameSearch}
                            onChange={(e) => setLocalNameSearch(e.target.value)}
                            className="text-sm"
                            data-testid="input-name-search"
                          />
                          <div className="flex space-x-1">
                            <Button type="submit" size="sm" className="text-xs px-2 py-1" data-testid="button-name-search-apply">
                              Apply
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleNameSearchClear}
                              className="text-xs px-2 py-1"
                              data-testid="button-name-search-clear"
                            >
                              Clear
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                  {nameSearchValue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNameSearchClear}
                      className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                      data-testid="button-name-search-clear-indicator"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
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
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
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
          
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              {totalPages > 1 && (
                <>
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
                </>
              )}
              
              {/* Page number buttons */}
              <div className="flex items-center space-x-1">
                {(() => {
                  const pageNumbers = [];
                  const showPages = Math.min(5, totalPages); // Show max 5 page numbers
                  let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                  let endPage = Math.min(totalPages, startPage + showPages - 1);
                  
                  // Adjust start if we're near the end
                  if (endPage - startPage < showPages - 1) {
                    startPage = Math.max(1, endPage - showPages + 1);
                  }
                  
                  for (let i = startPage; i <= endPage; i++) {
                    pageNumbers.push(
                      <Button
                        key={i}
                        variant={currentPage === i ? "default" : "outline"}
                        className={`h-8 w-8 p-0 ${currentPage === i ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                        onClick={() => onPageChange(i)}
                        data-testid={`button-page-${i}`}
                      >
                        {i}
                      </Button>
                    );
                  }
                  return pageNumbers;
                })()}
              </div>
              
              {totalPages > 1 && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}