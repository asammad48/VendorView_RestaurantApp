import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inventoryApi } from "@/lib/apiRepository";

const expenseSchema = z.object({
  utilityType: z.string().min(1, "Utility type is required"),
  usageUnit: z.coerce.number().min(0.01, "Usage unit must be greater than 0"),
  unitCost: z.coerce.number().min(0.01, "Unit cost must be greater than 0"),
  billingPeriodStart: z.string().min(1, "Billing period start is required"),
  billingPeriodEnd: z.string().min(1, "Billing period end is required"),
  billNumber: z.string().min(1, "Bill number is required"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface UtilityExpenseModalProps {
  open: boolean;
  onClose: () => void;
  branchId: number;
  onSuccess: () => void;
}

export default function UtilityExpenseModal({ 
  open, 
  onClose, 
  branchId,
  onSuccess 
}: UtilityExpenseModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      utilityType: "",
      usageUnit: 0,
      unitCost: 0,
      billingPeriodStart: "",
      billingPeriodEnd: "",
      billNumber: "",
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        utilityType: "",
        usageUnit: 0,
        unitCost: 0,
        billingPeriodStart: "",
        billingPeriodEnd: "",
        billNumber: "",
      });
      setTotalCost(0);
    }
  }, [open, form]);

  // Calculate total cost
  useEffect(() => {
    const subscription = form.watch((value) => {
      const usage = parseFloat(value.usageUnit as any) || 0;
      const cost = parseFloat(value.unitCost as any) || 0;
      setTotalCost(usage * cost);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      await inventoryApi.createUtilityExpense({
        branchId,
        utilityType: data.utilityType,
        usageUnit: data.usageUnit,
        unitCost: data.unitCost,
        billingPeriodStart: new Date(data.billingPeriodStart).toISOString(),
        billingPeriodEnd: new Date(data.billingPeriodEnd).toISOString(),
        billNumber: data.billNumber,
      });

      toast({
        title: "Success",
        description: "Utility expense added successfully",
      });

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
                name="utilityType"
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
                name="billNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill Number</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter bill number" 
                        data-testid="input-bill-number"
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
                name="usageUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usage Unit</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01"
                        placeholder="Enter usage unit" 
                        data-testid="input-usage-unit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost ($)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01"
                        placeholder="Enter unit cost" 
                        data-testid="input-unit-cost"
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
                name="billingPeriodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Period Start</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date" 
                        data-testid="input-period-start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billingPeriodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Period End</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date" 
                        data-testid="input-period-end"
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
