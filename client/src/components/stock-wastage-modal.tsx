import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inventoryApi } from "@/lib/apiRepository";

const wastageSchema = z.object({
  inventoryItemId: z.coerce.number().min(1, "Please select an item"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  reason: z.string().min(1, "Reason is required"),
});

type WastageFormData = z.infer<typeof wastageSchema>;

interface StockWastageModalProps {
  open: boolean;
  onClose: () => void;
  branchId: number;
  inventoryItems: Array<{
    inventoryItemId: number;
    itemName: string;
    currentStock: number;
    unit: string;
  }>;
  onSuccess: () => void;
}

export default function StockWastageModal({ 
  open, 
  onClose, 
  branchId,
  inventoryItems,
  onSuccess 
}: StockWastageModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<typeof inventoryItems[0] | null>(null);

  const form = useForm<WastageFormData>({
    resolver: zodResolver(wastageSchema),
    defaultValues: {
      inventoryItemId: 0,
      quantity: 0,
      reason: "",
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        inventoryItemId: 0,
        quantity: 0,
        reason: "",
      });
      setSelectedItem(null);
    }
  }, [open, form]);

  const onSubmit = async (data: WastageFormData) => {
    setIsSubmitting(true);
    try {
      await inventoryApi.createInventoryWastage({
        branchId,
        inventoryItemId: data.inventoryItemId,
        quantity: data.quantity,
        reason: data.reason,
      });

      toast({
        title: "Success",
        description: "Stock wastage recorded successfully",
      });

      onSuccess();
      onClose();
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record wastage",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemChange = (itemId: string) => {
    const item = inventoryItems.find(i => i.inventoryItemId === parseInt(itemId));
    setSelectedItem(item || null);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Record Stock Wastage</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Add wastage entry for inventory items
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="inventoryItemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inventory Item</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleItemChange(value);
                    }} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-inventory-item">
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem 
                          key={item.inventoryItemId} 
                          value={item.inventoryItemId.toString()}
                        >
                          {item.itemName} ({item.currentStock} {item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedItem && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Available Stock: <span className="font-semibold text-gray-900">{selectedItem.currentStock} {selectedItem.unit}</span>
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wastage Quantity {selectedItem ? `(${selectedItem.unit})` : ''}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter wastage quantity"
                      {...field}
                      data-testid="input-quantity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Wastage</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Expired, Damaged, Spoiled"
                      rows={3}
                      {...field}
                      data-testid="input-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
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
                className="bg-red-500 hover:bg-red-600"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? "Recording..." : "Record Wastage"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
