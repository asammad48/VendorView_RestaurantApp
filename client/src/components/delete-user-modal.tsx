import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { UserListItem } from "@/types/user";

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserListItem | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function DeleteUserModal({
  isOpen,
  onClose,
  user,
  onConfirm,
  isLoading = false,
}: DeleteUserModalProps) {
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-medium text-gray-900">
                Delete User
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete the user{" "}
            <span className="font-semibold text-gray-900">{user.name}</span>?
          </p>
          <div className="mt-2 text-xs text-gray-500">
            <p>Email: {user.email}</p>
            <p>Phone: {user.mobileNumber}</p>
            <p>Branch: {user.branchName}</p>
          </div>
        </div>

        <DialogFooter className="mt-6 flex space-x-3 sm:flex-row-reverse">
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            data-testid="confirm-delete-user"
          >
            {isLoading ? "Deleting..." : "Delete User"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            data-testid="cancel-delete-user"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}