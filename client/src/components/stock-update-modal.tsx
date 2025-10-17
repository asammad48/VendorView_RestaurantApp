import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { inventoryApi } from "@/lib/apiRepository";

const stockUpdateSchema = z.object({
  newStock: z.coerce.number().min(0, "Stock must be 0 or greater"),
  reason: z.string().min(1, "Reason is required"),
});

type StockUpdateFormData = z.infer<typeof stockUpdateSchema>;

interface StockUpdateModalProps {
  open: boolean;
  onClose: () => void;
  branchId: number;
  stockItem: {
    inventoryItemId: number;
    itemName: string;
    currentStock: number;
    unit: string;
  };
  onSuccess: () => void;
}

export default function StockUpdateModal({ 
  open, 
  onClose, 
  branchId,
  stockItem,
  onSuccess 
}: StockUpdateModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StockUpdateFormData>({
    resolver: zodResolver(stockUpdateSchema),
    defaultValues: {
      newStock: stockItem.currentStock,
      reason: "",
    },
  });

  // Reset form when stockItem changes or modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        newStock: stockItem.currentStock,
        reason: "",
      });
    }
  }, [open, stockItem, form]);

  const onSubmit = async (data: StockUpdateFormData) => {
    setIsSubmitting(true);
    try {
      await inventoryApi.updateInventoryStock(branchId, {
        inventoryItemId: stockItem.inventoryItemId,
        newStock: data.newStock,
        reason: data.reason,
      });

      toast({
        title: "Success",
        description: "Stock updated successfully",
      });

      onSuccess();
      onClose();
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update stock",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Update Stock</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {stockItem.itemName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Current Stock: <span className="font-semibold text-gray-900">{stockItem.currentStock} {stockItem.unit}</span></p>
            </div>

            <FormField
              control={form.control}
              name="newStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Stock ({stockItem.unit})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter new stock quantity"
                      {...field}
                      data-testid="input-new-stock"
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
                  <FormLabel>Reason for Update</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., First time entry, Damaged goods, Stock count correction"
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
                className="bg-green-500 hover:bg-green-600"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? "Updating..." : "Update Stock"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
