import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { discountsApi } from "@/lib/apiRepository";

const applyDiscountSchema = z.object({
  selectedItems: z.array(z.string()).min(1, "Please select at least one item"),
  discountId: z.string().min(1, "Please select a discount"),
});

type ApplyDiscountFormData = z.infer<typeof applyDiscountSchema>;

interface ApplyDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'menu' | 'deals';
  branchId: number;
}

interface SimpleMenuItem {
  menuItemId: number;
  menuItemName: string;
}

interface SimpleDeal {
  id: number;
  name: string;
}

interface SimpleDiscount {
  id: number;
  name: string;
  discountValue: number;
}

export default function ApplyDiscountModal({ isOpen, onClose, mode, branchId }: ApplyDiscountModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Query for menu items (only when mode is 'menu')
  const { data: menuItems = [], isLoading: isLoadingMenuItems } = useQuery<SimpleMenuItem[]>({
    queryKey: ['menu-items-simple', branchId],
    queryFn: async (): Promise<SimpleMenuItem[]> => {
      const response = await discountsApi.getMenuItemsSimpleByBranch(branchId);
      return Array.isArray(response) ? response : [];
    },
    enabled: isOpen && mode === 'menu',
  });

  // Query for deals (only when mode is 'deals')
  const { data: deals = [], isLoading: isLoadingDeals } = useQuery<SimpleDeal[]>({
    queryKey: ['deals-simple', branchId],
    queryFn: async (): Promise<SimpleDeal[]> => {
      const response = await discountsApi.getDealsSimpleByBranch(branchId);
      return Array.isArray(response) ? response : [];
    },
    enabled: isOpen && mode === 'deals',
  });

  // Query for discounts (for both modes)
  const { data: discounts = [], isLoading: isLoadingDiscounts } = useQuery<SimpleDiscount[]>({
    queryKey: ['discounts-simple', branchId],
    queryFn: async (): Promise<SimpleDiscount[]> => {
      const response = await discountsApi.getDiscountsSimpleByBranch(branchId);
      return Array.isArray(response) ? response : [];
    },
    enabled: isOpen,
  });

  const form = useForm<ApplyDiscountFormData>({
    resolver: zodResolver(applyDiscountSchema),
    defaultValues: {
      selectedItems: [],
      discountId: "",
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      form.reset();
      setSelectedItems([]);
    }
  }, [isOpen, form]);

  const applyDiscountMutation = useMutation({
    mutationFn: async (data: ApplyDiscountFormData) => {
      const itemIds = selectedItems.map(id => parseInt(id));
      const discountId = parseInt(data.discountId);
      
      if (mode === 'deals') {
        return await discountsApi.applyBulkDiscountToDeals(itemIds, discountId);
      } else {
        return await discountsApi.applyBulkDiscountToMenu(itemIds, discountId);
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh tables
      if (mode === 'menu') {
        queryClient.invalidateQueries({ queryKey: [`menu-items-branch-${branchId}`] });
        queryClient.invalidateQueries({ queryKey: ['menu-items-simple', branchId] });
      } else {
        queryClient.invalidateQueries({ queryKey: [`deals-branch-${branchId}`] });
        queryClient.invalidateQueries({ queryKey: ['deals-simple', branchId] });
      }
      
      toast({ 
        title: "Success",
        description: `Discount applied successfully to ${mode === 'deals' ? 'deals' : 'menu items'}`
      });
      onClose();
      form.reset();
      setSelectedItems([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error applying discount",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const getItemsData = () => {
    if (mode === 'menu') {
      return menuItems.map((item: SimpleMenuItem) => ({
        id: item.menuItemId.toString(),
        name: item.menuItemName,
      }));
    } else {
      return deals.map((deal: SimpleDeal) => ({
        id: deal.id.toString(),
        name: deal.name,
      }));
    }
  };

  const getIsLoading = () => {
    return mode === 'menu' ? isLoadingMenuItems : isLoadingDeals;
  };

  const handleItemSelect = (itemId: string) => {
    const newSelectedItems = selectedItems.includes(itemId)
      ? selectedItems.filter((id: string) => id !== itemId)
      : [...selectedItems, itemId];
    
    setSelectedItems(newSelectedItems);
    form.setValue("selectedItems", newSelectedItems);
  };

  const handleSelectAll = () => {
    const itemsData = getItemsData();
    const allItemIds = itemsData.map((item: { id: string; name: string }) => item.id);
    const allSelected = allItemIds.length > 0 && allItemIds.every((id: string) => selectedItems.includes(id));
    
    const newSelectedItems = allSelected ? [] : allItemIds;
    setSelectedItems(newSelectedItems);
    form.setValue("selectedItems", newSelectedItems);
  };

  const onSubmit = (data: ApplyDiscountFormData) => {
    const formData = {
      ...data,
      selectedItems,
    };
    applyDiscountMutation.mutate(formData);
  };

  const itemsData = getItemsData();
  const isLoading = getIsLoading();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="modal-apply-discount">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Apply Discount to {mode === 'menu' ? 'Menu Items' : 'Deals'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Items Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Select {mode === 'menu' ? 'Menu Items' : 'Deals'}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8 px-3 text-xs"
                  data-testid="button-select-all"
                >
                  {itemsData.length > 0 && itemsData.every((item: { id: string; name: string }) => selectedItems.includes(item.id)) ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="border rounded-lg max-h-64 overflow-y-auto" data-testid="items-selection-area">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    Loading {mode === 'menu' ? 'menu items' : 'deals'}...
                  </div>
                ) : itemsData.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No {mode === 'menu' ? 'menu items' : 'deals'} available
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {itemsData.map((item: { id: string; name: string }) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedItems.includes(item.id)
                            ? "bg-green-50 border-green-200"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => handleItemSelect(item.id)}
                        data-testid={`item-option-${item.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{item.name}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleItemSelect(item.id)}
                            className="ml-3 rounded border-gray-300"
                            data-testid={`checkbox-item-${item.id}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {form.formState.errors.selectedItems && (
                <p className="text-sm text-red-500">{form.formState.errors.selectedItems.message}</p>
              )}
            </div>

            {/* Discount Selection */}
            <div className="space-y-2">
              <Label htmlFor="discountId">Select Discount</Label>
              <Select onValueChange={(value) => form.setValue("discountId", value)}>
                <SelectTrigger data-testid="select-discount">
                  <SelectValue placeholder={isLoadingDiscounts ? "Loading discounts..." : "Select a discount"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingDiscounts ? (
                    <SelectItem value="loading" disabled>Loading discounts...</SelectItem>
                  ) : discounts.length === 0 ? (
                    <SelectItem value="no-discounts" disabled>No discounts available</SelectItem>
                  ) : (
                    discounts.map((discount: SimpleDiscount) => (
                      <SelectItem 
                        key={discount.id} 
                        value={discount.id.toString()}
                        data-testid={`discount-option-${discount.id}`}
                      >
                        {discount.name} ({discount.discountValue}%)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.discountId && (
                <p className="text-sm text-red-500">{form.formState.errors.discountId.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-12 py-2 rounded-lg"
              disabled={applyDiscountMutation.isPending || selectedItems.length === 0}
              data-testid="button-apply-discount"
            >
              {applyDiscountMutation.isPending ? "Applying..." : "Apply Discount"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}