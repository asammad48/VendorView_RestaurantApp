import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Check, ChevronsUpDown, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { inventoryApi } from "@/lib/apiRepository";
import { cn } from "@/lib/utils";

const units = [
  // Weight Units
  { name: "Milligram", value: "mg", category: "Weight" },
  { name: "Gram", value: "g", category: "Weight" },
  { name: "Kilogram", value: "kg", category: "Weight" },
  { name: "Ounce", value: "oz", category: "Weight" },
  // Volume Units
  { name: "Milliliter", value: "ml", category: "Volume" },
  { name: "Liter", value: "L", category: "Volume" },
  // Pack Size Units
  { name: "Each", value: "Each", category: "Pack Size" },
  { name: "Piece", value: "Piece", category: "Pack Size" },
  { name: "Single", value: "Single", category: "Pack Size" },
  { name: "2 Pack", value: "2 Pack", category: "Pack Size" },
  { name: "3 Pack", value: "3 Pack", category: "Pack Size" },
  { name: "4 Pack", value: "4 Pack", category: "Pack Size" },
  { name: "5 Pack", value: "5 Pack", category: "Pack Size" },
  { name: "6 Pack", value: "6 Pack", category: "Pack Size" },
  { name: "8 Pack", value: "8 Pack", category: "Pack Size" },
  { name: "10 Pack", value: "10 Pack", category: "Pack Size" },
  { name: "12 Pack", value: "12 Pack", category: "Pack Size" },
  { name: "20 Pack", value: "20 Pack", category: "Pack Size" },
  { name: "24 Pack", value: "24 Pack", category: "Pack Size" },
  { name: "30 Pack", value: "30 Pack", category: "Pack Size" },
  { name: "50 Pack", value: "50 Pack", category: "Pack Size" },
  { name: "100 Pack", value: "100 Pack", category: "Pack Size" },
  // Count Units
  { name: "Dozen", value: "Dozen", category: "Count" },
  { name: "Half Dozen", value: "Half Dozen", category: "Count" }
];

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  categoryId: z.number().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  reorderLevel: z.number().min(0, "Reorder level must be at least 0").multipleOf(0.001, "Reorder level can have up to 3 decimal places"),
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
  const queryClient = useQueryClient();
  const isEdit = !!item;
  const [unitPopoverOpen, setUnitPopoverOpen] = useState(false);
  
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
      queryClient.invalidateQueries({ queryKey: ["inventory-items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock", branchId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-low-stock", branchId] });
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
      queryClient.invalidateQueries({ queryKey: ["inventory-items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock", branchId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-low-stock", branchId] });
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
            {categories.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No categories found.{" "}
                <Link href="/inventory-management" className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1" data-testid="link-categories">
                  Go to Categories <ExternalLink className="w-3 h-3" />
                </Link>
              </p>
            )}
            {form.formState.errors.categoryId && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.categoryId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="unit">Unit</Label>
            <Popover open={unitPopoverOpen} onOpenChange={setUnitPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={unitPopoverOpen}
                  className="w-full justify-between"
                  disabled={isEdit}
                  data-testid="select-unit"
                >
                  {form.watch("unit")
                    ? units.find((unit) => unit.value === form.watch("unit"))?.name
                    : "Select unit..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search unit..." />
                  <CommandList>
                    <CommandEmpty>No unit found.</CommandEmpty>
                    {["Weight", "Volume", "Pack Size", "Count"].map((category) => (
                      <CommandGroup key={category} heading={category}>
                        {units
                          .filter((unit) => unit.category === category)
                          .map((unit) => (
                            <CommandItem
                              key={unit.value}
                              value={unit.name}
                              onSelect={() => {
                                form.setValue("unit", unit.value);
                                setUnitPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.watch("unit") === unit.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {unit.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {form.formState.errors.unit && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.unit.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reorderLevel">Reorder Level</Label>
            <Input
              id="reorderLevel"
              type="number"
              step="0.001"
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
            {suppliers.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No suppliers found.{" "}
                <Link href="/inventory-management" className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1" data-testid="link-suppliers">
                  Go to Suppliers <ExternalLink className="w-3 h-3" />
                </Link>
              </p>
            )}
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
