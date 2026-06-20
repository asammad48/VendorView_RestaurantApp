import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { SearchTooltip } from "@/components/SearchTooltip";
import { UserListItem } from "@/types/user";
import { DEFAULT_PAGINATION_CONFIG, formatPageSizeLabel } from "@/types/pagination";

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
    <div className="bg-white rounded-lg border" data-testid="users-table-card">
      <Table data-testid="users-table">
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center space-x-2">
                <span>Name</span>
                <SearchTooltip
                  placeholder="Search by name..."
                  onSearch={onNameSearch}
                  onClear={onNameSearchClear}
                  currentValue={nameSearchValue}
                />
              </div>
            </TableHead>
            <TableHead data-testid="header-email">Email</TableHead>
            <TableHead data-testid="header-phone">Phone Number</TableHead>
            <TableHead data-testid="header-branch">Branch</TableHead>
            <TableHead data-testid="header-actions">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} className="hover:bg-gray-50" data-testid={`user-row-${user.id}`}>
                <TableCell data-testid={`user-name-${user.id}`}>
                  <div className="font-medium text-gray-900">{user.name}</div>
                </TableCell>
                <TableCell data-testid={`user-email-${user.id}`}>
                  <div className="text-sm text-gray-700">{user.email}</div>
                </TableCell>
                <TableCell data-testid={`user-phone-${user.id}`}>
                  <div className="text-sm text-gray-700">{user.mobileNumber || "—"}</div>
                </TableCell>
                <TableCell data-testid={`user-branch-${user.id}`}>
                  <div className="text-sm text-gray-700">{user.branchName || "—"}</div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-gray-700"
                        data-testid={`user-actions-${user.id}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditUser(user)} data-testid={`edit-user-${user.id}`}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => onDeleteUser(user)}
                        data-testid={`delete-user-${user.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Show result:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => onItemsPerPageChange(Number(value))}
          >
            <SelectTrigger className="w-20" data-testid="select-items-per-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {DEFAULT_PAGINATION_CONFIG.pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {formatPageSizeLabel(size)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
            return start + i;
          }).filter(p => p <= totalPages).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={currentPage === page ? "bg-green-700 hover:bg-green-800 text-white" : ""}
              data-testid={`button-page-${page}`}
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            data-testid="button-next-page"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
