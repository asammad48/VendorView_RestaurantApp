import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inventoryApi } from "@/lib/apiRepository";

const expenseSchema = z.object({
  type: z.string().min(1, "Utility type is required"),
  unitConsumed: z.coerce.number().min(0.01, "Units consumed must be greater than 0"),
  costPerUnit: z.coerce.number().min(0.01, "Cost per unit must be greater than 0"),
  readingDate: z.string().min(1, "Reading date is required"),
  remarks: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface UtilityExpenseModalProps {
  open: boolean;
  onClose: () => void;
  branchId?: string;
  onSuccess: () => void;
}

export default function UtilityExpenseModal({ 
  open, 
  onClose, 
  branchId,
  onSuccess 
}: UtilityExpenseModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      type: "",
      unitConsumed: 0,
      costPerUnit: 0,
      readingDate: "",
      remarks: "",
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        type: "",
        unitConsumed: 0,
        costPerUnit: 0,
        readingDate: "",
        remarks: "",
      });
      setTotalCost(0);
    }
  }, [open, form]);

  // Calculate total cost
  useEffect(() => {
    const subscription = form.watch((value) => {
      const usage = parseFloat(value.unitConsumed as any) || 0;
      const cost = parseFloat(value.costPerUnit as any) || 0;
      setTotalCost(usage * cost);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      await inventoryApi.createUtilityExpense({
        branchId: branchId || "",
        type: data.type,
        unitConsumed: data.unitConsumed,
        costPerUnit: data.costPerUnit,
        readingDate: new Date(data.readingDate).toISOString(),
        remarks: data.remarks || "",
      });

      toast({
        title: "Success",
        description: "Utility expense added successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["utility-expenses", branchId] });
      onSuccess();
      onClose();
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add utility expense",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle>Add Utility Expense</DialogTitle>
              <DialogDescription>
                Record a new utility expense for this branch
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Utility Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-utility-type">
                          <SelectValue placeholder="Select utility type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Electric">Electric</SelectItem>
                        <SelectItem value="Water">Water</SelectItem>
                        <SelectItem value="Gas">Gas</SelectItem>
                        <SelectItem value="Internet">Internet</SelectItem>
                        <SelectItem value="Phone">Phone</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter remarks"
                        data-testid="input-remarks"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unitConsumed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Units Consumed</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="Enter units consumed"
                        data-testid="input-units-consumed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="costPerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Per Unit ($)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="Enter cost per unit"
                        data-testid="input-cost-per-unit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="readingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reading Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        data-testid="input-reading-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {totalCost > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-orange-600" data-testid="text-total-cost">
                  ${totalCost.toFixed(2)}
                </p>
              </div>
            )}

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
                className="bg-orange-500 hover:bg-orange-600"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
