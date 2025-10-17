import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { inventoryApi } from "@/lib/apiRepository";

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface AddInventoryCategoryModalProps {
  open: boolean;
  onClose: () => void;
  branchId: number;
  onSuccess?: () => void;
}

export default function AddInventoryCategoryModal({ open, onClose, branchId, onSuccess }: AddInventoryCategoryModalProps) {
  const { toast } = useToast();
  
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; branchId: number }) => inventoryApi.createInventoryCategory(data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Category created successfully",
      });
      onSuccess?.();
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    createCategoryMutation.mutate({
      name: data.name,
      branchId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="add-category-modal">
        <DialogHeader>
          <DialogTitle>Add Inventory Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Enter category name"
              data-testid="input-category-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-green-500 hover:bg-green-600"
              disabled={createCategoryMutation.isPending}
              data-testid="button-submit"
            >
              {createCategoryMutation.isPending ? "Adding..." : "Add Category"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
