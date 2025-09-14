import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { apiRepository } from "@/lib/apiRepository";
import { createApiMutation, formatApiError } from "@/lib/errorHandling";
import { useToast } from "@/hooks/use-toast";
import type { Entity } from "@/types/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DeleteConfirmationModalProps {
  entity: Entity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteConfirmationModal({ entity, open, onOpenChange }: DeleteConfirmationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: createApiMutation<any>(async () => {
      return apiRepository.call('deleteEntity', 'DELETE', undefined, undefined, true, { id: entity.id });
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      toast({
        title: "Success",
        description: "Entity deleted successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: formatApiError(error) || "Failed to delete entity",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteMutation.mutateAsync(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Delete Entity</DialogTitle>
              <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-gray-900 dark:text-white" data-testid={`text-delete-entity-name-${entity.id}`}>
                {entity.name}
              </h4>
              <Badge variant="outline" data-testid={`badge-delete-entity-type-${entity.id}`}>
                {(entity.entityType || (entity.type === 1 ? 'hotel' : 'restaurant')).toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`text-delete-entity-address-${entity.id}`}>
              {entity.address}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`text-delete-entity-phone-${entity.id}`}>
              {entity.phone}
            </p>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Warning:</strong> Deleting this entity will permanently remove all associated data. 
              This action cannot be undone.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              data-testid={`button-cancel-delete-${entity.id}`}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={isLoading}
              variant="destructive"
              data-testid={`button-confirm-delete-${entity.id}`}
            >
              {isLoading ? "Deleting..." : "Delete Entity"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}