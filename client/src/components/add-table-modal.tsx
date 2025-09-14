import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { locationApi } from "@/lib/apiRepository";
import { createApiMutation, formatApiError } from "@/lib/errorHandling";
import { useToast } from "@/hooks/use-toast";

const addTableSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  capacity: z.string().min(1, "Seating capacity is required"),
});

type AddTableFormData = z.infer<typeof addTableSchema>;

interface AddTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId?: number;
}


export default function AddTableModal({ open, onOpenChange, branchId }: AddTableModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<AddTableFormData>({
    resolver: zodResolver(addTableSchema),
    defaultValues: {
      name: "",
      capacity: "",
    }
  });

  const createTableMutation = useMutation({
    mutationFn: createApiMutation<any, AddTableFormData>(async (data: AddTableFormData) => {
      if (!branchId) {
        throw new Error('Branch ID is required');
      }
      
      const locationData = {
        branchId: branchId,
        name: data.name,
        capacity: parseInt(data.capacity)
      };
      
      return await locationApi.createLocation(locationData);
    }),
    onSuccess: (responseData: any) => {
      toast({
        title: "Success", 
        description: `Table "${responseData.name}" has been created successfully.`,
      });
      if (branchId) queryClient.invalidateQueries({ queryKey: ["tables", "branch", branchId] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: formatApiError(error) || "Failed to create table. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddTableFormData) => {
    createTableMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="add-table-modal">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-gray-900" data-testid="modal-title">
            Add Table
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            {/* Table Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Table Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Table 1 or Table A1"
                      {...field}
                      className="w-full"
                      data-testid="input-table-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Seating Capacity */}
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Seating Capacity
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g. 4"
                      min="1"
                      max="20"
                      {...field}
                      className="w-full"
                      data-testid="input-seating-capacity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-12 py-2 rounded-lg"
                disabled={createTableMutation.isPending}
                data-testid="button-submit"
              >
Create Table
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}