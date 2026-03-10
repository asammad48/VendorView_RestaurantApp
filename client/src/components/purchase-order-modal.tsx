import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inventoryApi } from "@/lib/apiRepository";

const purchaseOrderSchema = z.object({
  supplierId: z.coerce.number().min(1, "Supplier is required"),
  orderDate: z.string().min(1, "Order date is required"),
  status: z.coerce.number().min(0).max(3),
  items: z.array(z.object({
    inventoryItemId: z.coerce.number().min(1, "Item is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  })).min(1, "At least one item is required"),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

interface PurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
  branchId: number;
  onSuccess: () => void;
}

export default function PurchaseOrderModal({ 
  open, 
  onClose, 
  branchId,
  onSuccess 
}: PurchaseOrderModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ["inventory-suppliers", branchId],
    queryFn: async () => await inventoryApi.getInventorySuppliers(branchId),
    enabled: !!branchId && open,
  });
  const suppliers = Array.isArray(suppliersData) ? suppliersData : (suppliersData as any)?.items || [];

  // Fetch inventory items
  const { data: inventoryItemsData } = useQuery({
    queryKey: ["inventory-items", branchId],
    queryFn: async () => await inventoryApi.getInventoryItemsByBranch(branchId),
    enabled: !!branchId && open,
  });
  const inventoryItems = Array.isArray(inventoryItemsData) ? inventoryItemsData : (inventoryItemsData as any)?.items || [];

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: 0,
      orderDate: new Date().toISOString().split('T')[0],
      status: 0, // Draft
      items: [{ inventoryItemId: 0, quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = async (data: PurchaseOrderFormData) => {
    setIsSubmitting(true);
    try {
      await inventoryApi.createPurchaseOrder({
        supplierId: data.supplierId,
        branchId: branchId,
        orderDate: new Date(data.orderDate).toISOString(),
        status: data.status,
        items: data.items,
      });

      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["purchase-orders", branchId] });
      onSuccess();
      onClose();
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Create Purchase Order</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Add items to create a new purchase order
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-supplier">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-order-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Draft</SelectItem>
                      <SelectItem value="1">Ordered</SelectItem>
                      <SelectItem value="2">Received</SelectItem>
                      <SelectItem value="3">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex justify-between items-center mb-3">
                <FormLabel>Items</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ inventoryItemId: 0, quantity: 1, unitPrice: 0 })}
                  data-testid="button-add-item"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="flex gap-2 items-center mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Item Name</p>
                </div>
                <div className="w-32">
                  <p className="text-sm font-medium text-gray-700">Quantity</p>
                </div>
                <div className="w-32">
                  <p className="text-sm font-medium text-gray-700">Unit Price</p>
                </div>
                <div className="w-10"></div>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <FormField
                    control={form.control}
                    name={`items.${index}.inventoryItemId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid={`select-item-${index}`}>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {inventoryItems.map((item: any) => (
                              <SelectItem key={item.id} value={item.id.toString()}>
                                {item.name} ({item.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter quantity"
                            {...field}
                            data-testid={`input-quantity-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Enter price"
                            {...field}
                            data-testid={`input-price-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      data-testid={`button-remove-item-${index}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? "Creating..." : "Create Purchase Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
