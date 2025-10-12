import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { inventoryApi } from "@/lib/apiRepository";

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  categoryId: z.number().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  reorderLevel: z.number().min(0, "Reorder level must be at least 0"),
  defaultSupplierId: z.number().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface InventoryItem {
  id: number;
  branchId: number;
  name: string;
  categoryName: string;
  unit: string;
  reorderLevel: number;
  defaultSupplierName: string | null;
}

interface InventoryCategory {
  id: number;
  name: string;
}

interface InventorySupplier {
  id: number;
  name: string;
}

interface AddInventoryItemModalProps {
  open: boolean;
  onClose: () => void;
  branchId: number;
  item?: InventoryItem & { categoryId?: number; defaultSupplierId?: number };
  categories: InventoryCategory[];
  suppliers: InventorySupplier[];
  onSuccess?: () => void;
}

export default function AddInventoryItemModal({ 
  open, 
  onClose, 
  branchId, 
  item,
  categories,
  suppliers,
  onSuccess 
}: AddInventoryItemModalProps) {
  const { toast } = useToast();
  const isEdit = !!item;
  
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      categoryId: 0,
      unit: "",
      reorderLevel: 0,
      defaultSupplierId: undefined,
    },
  });

  useEffect(() => {
    if (open && item) {
      form.reset({
        name: item.name,
        categoryId: item.categoryId || 0,
        unit: item.unit,
        reorderLevel: item.reorderLevel,
        defaultSupplierId: item.defaultSupplierId,
      });
    } else if (open && !item) {
      form.reset({
        name: "",
        categoryId: 0,
        unit: "",
        reorderLevel: 0,
        defaultSupplierId: undefined,
      });
    }
  }, [item, open, form]);

  const createItemMutation = useMutation({
    mutationFn: (data: { name: string; categoryId: number; branchId: number; unit: string; reorderLevel: number; defaultSupplierId?: number }) => 
      inventoryApi.createInventoryItem(data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item created successfully",
      });
      onSuccess?.();
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create item",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; categoryId: number; unit: string; reorderLevel: number; defaultSupplierId?: number } }) => 
      inventoryApi.updateInventoryItem(id, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      onSuccess?.();
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ItemFormData) => {
    if (isEdit && item) {
      updateItemMutation.mutate({
        id: item.id,
        data: {
          name: data.name,
          categoryId: data.categoryId,
          unit: data.unit,
          reorderLevel: data.reorderLevel,
          defaultSupplierId: data.defaultSupplierId || undefined,
        },
      });
    } else {
      createItemMutation.mutate({
        name: data.name,
        categoryId: data.categoryId,
        branchId,
        unit: data.unit,
        reorderLevel: data.reorderLevel,
        defaultSupplierId: data.defaultSupplierId || undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="add-item-modal">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Inventory Item" : "Add Inventory Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Enter item name"
              data-testid="input-item-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="categoryId">Category</Label>
            <Select
              value={form.watch("categoryId")?.toString() || ""}
              onValueChange={(value) => form.setValue("categoryId", parseInt(value))}
              disabled={isEdit}
            >
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.categoryId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              {...form.register("unit")}
              placeholder="e.g., Kg, L, pcs"
              data-testid="input-unit"
              disabled={isEdit}
            />
            {form.formState.errors.unit && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.unit.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reorderLevel">Reorder Level</Label>
            <Input
              id="reorderLevel"
              type="number"
              {...form.register("reorderLevel", { valueAsNumber: true })}
              placeholder="Enter reorder level"
              data-testid="input-reorder-level"
            />
            {form.formState.errors.reorderLevel && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.reorderLevel.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="defaultSupplierId">Default Supplier (Optional)</Label>
            <Select
              value={form.watch("defaultSupplierId")?.toString() || "none"}
              onValueChange={(value) => form.setValue("defaultSupplierId", value === "none" ? undefined : parseInt(value))}
            >
              <SelectTrigger data-testid="select-supplier">
                <SelectValue placeholder="Select supplier (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={createItemMutation.isPending || updateItemMutation.isPending}
              data-testid="button-submit"
            >
              {createItemMutation.isPending || updateItemMutation.isPending
                ? "Saving..."
                : (isEdit ? "Update Item" : "Add Item")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
