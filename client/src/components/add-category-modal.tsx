import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRepository } from "@/lib/apiRepository";
import { createApiMutation, formatApiError } from "@/lib/errorHandling";
import type { MenuCategory, InsertMenuCategory } from "@/types/schema";

const addCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  branchId: z.number().min(1, "Branch ID is required"),
});

type AddCategoryFormData = z.infer<typeof addCategorySchema>;

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: number;
  editCategory?: MenuCategory;
}

export default function AddCategoryModal({ isOpen, onClose, branchId, editCategory }: AddCategoryModalProps) {
  const isEditMode = !!editCategory;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddCategoryFormData>({
    resolver: zodResolver(addCategorySchema),
    defaultValues: {
      name: editCategory?.name || "",
      branchId: branchId,
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: createApiMutation<MenuCategory, InsertMenuCategory>(async (data: InsertMenuCategory) => {
      return await apiRepository.call<MenuCategory>(
        'createMenuCategory',
        'POST',
        data
      );
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`menu-categories-branch-${branchId}`] });
      toast({ title: "Category added successfully" });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding category",
        description: formatApiError(error) || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: createApiMutation<MenuCategory, { name: string }>(async (data: { name: string }) => {
      return await apiRepository.call<MenuCategory>(
        'updateMenuCategory',
        'PUT',
        data,
        undefined,
        true,
        { id: editCategory!.id }
      );
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`menu-categories-branch-${branchId}`] });
      toast({ title: "Category updated successfully" });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating category",
        description: formatApiError(error) || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddCategoryFormData) => {
    if (isEditMode) {
      updateCategoryMutation.mutate({ name: data.name });
    } else {
      const categoryData: InsertMenuCategory = {
        name: data.name,
        branchId: data.branchId,
      };
      createCategoryMutation.mutate(categoryData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="modal-add-category">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">{isEditMode ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter category name"
                data-testid="input-category-name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-12 py-2 rounded-lg"
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              data-testid="button-add-category"
            >
              {(createCategoryMutation.isPending || updateCategoryMutation.isPending)
                ? (isEditMode ? "Updating..." : "Adding...") 
                : (isEditMode ? "Update Category" : "Add Category")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}