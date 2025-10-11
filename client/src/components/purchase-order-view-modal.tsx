import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, Check, X, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { inventoryApi } from "@/lib/apiRepository";

const receiveOrderSchema = z.object({
  items: z.array(z.object({
    purchaseOrderItemId: z.number(),
    receivedQuantity: z.coerce.number().min(0, "Received quantity must be 0 or greater"),
  })),
});

type ReceiveOrderFormData = z.infer<typeof receiveOrderSchema>;

interface PurchaseOrderViewModalProps {
  open: boolean;
  onClose: () => void;
  orderId: number;
  onSuccess: () => void;
}

const purchaseOrderStatusMap: { [key: number]: { label: string; variant: "default" | "secondary" | "outline" | "destructive" } } = {
  0: { label: "Draft", variant: "secondary" },
  1: { label: "Ordered", variant: "default" },
  2: { label: "Received", variant: "outline" },
  3: { label: "Cancelled", variant: "destructive" },
};

export default function PurchaseOrderViewModal({ 
  open, 
  onClose, 
  orderId,
  onSuccess 
}: PurchaseOrderViewModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReceiveForm, setShowReceiveForm] = useState(false);

  // Fetch purchase order details
  const { data: orderDetails, isLoading } = useQuery<any>({
    queryKey: ["purchase-order", orderId],
    queryFn: async () => await inventoryApi.getPurchaseOrderById(orderId),
    enabled: !!orderId && open,
  });

  const form = useForm<ReceiveOrderFormData>({
    resolver: zodResolver(receiveOrderSchema),
    defaultValues: {
      items: orderDetails?.items?.map((item: any) => ({
        purchaseOrderItemId: item.id,
        receivedQuantity: item.quantity - item.receivedQuantity,
      })) || [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Update form when order details load
  useState(() => {
    if (orderDetails?.items) {
      form.reset({
        items: orderDetails.items.map((item: any) => ({
          purchaseOrderItemId: item.id,
          receivedQuantity: item.quantity - item.receivedQuantity,
        })),
      });
    }
  });

  // Receive mutation
  const receiveMutation = useMutation({
    mutationFn: async (data: ReceiveOrderFormData) => {
      await inventoryApi.receivePurchaseOrder(orderId, data.items);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order received successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] });
      onSuccess();
      setShowReceiveForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to receive purchase order",
        variant: "destructive",
      });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      await inventoryApi.cancelPurchaseOrder(orderId);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order cancelled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", orderId] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel purchase order",
        variant: "destructive",
      });
    },
  });

  const onSubmitReceive = async (data: ReceiveOrderFormData) => {
    receiveMutation.mutate(data);
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel this purchase order?")) {
      cancelMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <p>Loading...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!orderDetails) {
    return null;
  }

  const canReceive = orderDetails.status === 0 || orderDetails.status === 1; // Draft or Ordered
  const canCancel = orderDetails.status === 0 || orderDetails.status === 1; // Draft or Ordered

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">Purchase Order #{orderDetails.id}</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                {orderDetails.supplierName} • {new Date(orderDetails.orderDate).toLocaleDateString()}
              </DialogDescription>
            </div>
            <Badge variant={purchaseOrderStatusMap[orderDetails.status]?.variant || "default"}>
              {purchaseOrderStatusMap[orderDetails.status]?.label || "Unknown"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Supplier</p>
              <p className="font-semibold">{orderDetails.supplierName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Branch</p>
              <p className="font-semibold">{orderDetails.branchName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Order Date</p>
              <p className="font-semibold">{new Date(orderDetails.orderDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-semibold">{orderDetails.totalAmount.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Items</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderDetails.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell>{item.receivedQuantity}</TableCell>
                      <TableCell>{item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {showReceiveForm && canReceive ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitReceive)} className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Receive Items</h3>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <span className="flex-1 text-sm">
                          {orderDetails.items[index]?.itemName}
                        </span>
                        <FormField
                          control={form.control}
                          name={`items.${index}.receivedQuantity`}
                          render={({ field }) => (
                            <FormItem className="w-32">
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  {...field}
                                  data-testid={`input-received-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <span className="text-sm text-gray-600 w-20">
                          / {orderDetails.items[index]?.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReceiveForm(false)}
                    disabled={receiveMutation.isPending}
                    data-testid="button-cancel-receive"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600"
                    disabled={receiveMutation.isPending}
                    data-testid="button-submit-receive"
                  >
                    {receiveMutation.isPending ? "Receiving..." : "Confirm Receipt"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                data-testid="button-close"
              >
                Close
              </Button>
              {canCancel && (
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  data-testid="button-cancel-order"
                >
                  <X className="w-4 h-4 mr-2" />
                  {cancelMutation.isPending ? "Cancelling..." : "Cancel Order"}
                </Button>
              )}
              {canReceive && (
                <Button
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => setShowReceiveForm(true)}
                  data-testid="button-receive-order"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Receive Order
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
