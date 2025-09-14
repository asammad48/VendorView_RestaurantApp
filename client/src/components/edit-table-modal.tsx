import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { locationApi } from "@/lib/apiRepository";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const editTableSchema = z.object({
  capacity: z.string().min(1, "Capacity is required").refine((val) => {
    const num = parseInt(val);
    return num > 0 && num <= 50;
  }, "Capacity must be between 1 and 50"),
});

type EditTableFormData = z.infer<typeof editTableSchema>;

// API response interface for location details
interface LocationDetails {
  id: number;
  branchId: number;
  locationType: number;
  name: string;
  capacity: number;
}

interface TableData {
  id: string;
  tableNumber: string;
  branch: string;
  waiter: string;
  seats: number;
  status: "Active" | "Inactive";
}

interface EditTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: TableData | null;
}

export default function EditTableModal({ open, onOpenChange, table }: EditTableModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<EditTableFormData>({
    resolver: zodResolver(editTableSchema),
    defaultValues: {
      capacity: "",
    }
  });

  // Get location details from API
  const { data: locationData, isLoading } = useQuery<LocationDetails>({
    queryKey: ["location", table?.id],
    queryFn: async () => {
      if (!table?.id) throw new Error("No table ID");
      const response = await locationApi.getLocationById(table.id);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data as LocationDetails;
    },
    enabled: !!table?.id && open, // Only fetch when modal is open and table ID exists
  });

  // Update form when location data is loaded
  useEffect(() => {
    if (locationData) {
      form.reset({
        capacity: locationData.capacity.toString(),
      });
    }
  }, [locationData, form]);

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (data: EditTableFormData) => {
      if (!table?.id) throw new Error("No table ID");
      const response = await locationApi.updateLocation(table.id, {
        capacity: parseInt(data.capacity)
      });
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Table capacity updated successfully.",
      });
      // Get branchId from locationData or fallback to invalidate all tables
      if (locationData?.branchId) {
        queryClient.invalidateQueries({ queryKey: ["tables", "branch", locationData.branchId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["tables"] });
      }
      queryClient.invalidateQueries({ queryKey: ["location", table?.id] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update table capacity.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditTableFormData) => {
    updateLocationMutation.mutate(data);
  };

  if (!table) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="edit-table-modal">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-gray-900" data-testid="modal-title">
            Edit Table
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Loading table details...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              {/* Table Number (Read-only) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Table Name</Label>
                <Input
                  value={locationData?.name ? `Table ${locationData.name}` : table?.tableNumber || ""}
                  readOnly
                  className="bg-gray-50 text-gray-500 cursor-not-allowed"
                  data-testid="table-number-input"
                />
              </div>

              {/* Capacity */}
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Capacity</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="1"
                        max="50"
                        placeholder="Enter table capacity"
                        className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                        data-testid="capacity-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  data-testid="cancel-button"
                  disabled={updateLocationMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white"
                  data-testid="save-button"
                  disabled={updateLocationMutation.isPending}
                >
                  {updateLocationMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}