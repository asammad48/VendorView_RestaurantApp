import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { locationApi } from "@/lib/apiRepository";

// Reservation form schema
const reservationFormSchema = z.object({
  reservationName: z.string().min(2, "Reservation name must be at least 2 characters"),
  reservationDate: z.string().min(1, "Reservation date is required"),
  tableId: z.string().min(1, "Table selection is required"),
  tableName: z.string().min(1, "Table name is required"), // Display name for reference
  numberOfGuests: z.number().min(1, "Number of guests must be at least 1").max(50, "Maximum 50 guests allowed"),
  status: z.enum(["confirmed", "pending", "cancelled", "completed"], {
    required_error: "Status is required",
  }),
});

type ReservationFormData = z.infer<typeof reservationFormSchema>;

interface AddReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  reservation?: any;
  isEditMode?: boolean;
}

export function AddReservationModal({ 
  isOpen, 
  onClose, 
  branchId,
  reservation,
  isEditMode = false 
}: AddReservationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      reservationName: "",
      reservationDate: "",
      tableId: "",
      tableName: "",
      numberOfGuests: 1,
      status: "pending"
    },
  });

  // Fetch available tables for selection
  const { data: tables = [], isLoading: isLoadingTables } = useQuery({
    queryKey: ['tables', branchId],
    queryFn: async () => {
      try {
        const response = await locationApi.getLocationsByBranch(Number(branchId));
        return response.data || [];
      } catch (error) {
        console.error('Error fetching tables:', error);
        return [];
      }
    },
    enabled: isOpen && !!branchId,
    staleTime: 5 * 60 * 1000,
  });

  // Create/Update reservation mutation (mock for now)
  const createReservationMutation = useMutation({
    mutationFn: async (data: ReservationFormData) => {
      // Mock API call - replace with actual reservation API
      console.log('Creating/updating reservation:', data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isEditMode) {
        // Simulate update
        return { id: reservation?.id, ...data, updated: true };
      } else {
        // Simulate create
        return { id: Date.now(), ...data, created: true };
      }
    },
    onSuccess: () => {
      // Invalidate reservations cache when API is implemented
      // queryClient.invalidateQueries({ queryKey: ['reservations'] });
      // if (branchId) queryClient.invalidateQueries({ queryKey: [`reservations-branch-${branchId}`] });
      
      toast({
        title: "Success",
        description: `Reservation ${isEditMode ? 'updated' : 'created'} successfully!`,
        variant: "default",
      });
      
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      console.error('Error creating/updating reservation:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} reservation. Please try again.`,
        variant: "destructive",
      });
    },
  });

  // Pre-fill form in edit mode
  useEffect(() => {
    if (isEditMode && reservation && isOpen) {
      form.reset({
        reservationName: reservation.reservationName || "",
        reservationDate: reservation.reservationDate || "",
        tableId: reservation.tableId || "",
        tableName: reservation.tableName || "",
        numberOfGuests: reservation.numberOfGuests || 1,
        status: reservation.status || "pending"
      });
    } else if (!isEditMode && isOpen) {
      form.reset({
        reservationName: "",
        reservationDate: "",
        tableId: "",
        tableName: "",
        numberOfGuests: 1,
        status: "pending"
      });
    }
  }, [isEditMode, reservation, isOpen, form]);

  const onSubmit = (data: ReservationFormData) => {
    createReservationMutation.mutate(data);
  };

  // Get current date for minimum date validation
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {isEditMode ? "Edit Reservation" : "Add New Reservation"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            {/* Reservation Name */}
            <FormField
              control={form.control}
              name="reservationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Customer Name *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter customer name"
                      {...field}
                      className="w-full"
                      data-testid="input-reservation-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reservation Date & Time */}
            <FormField
              control={form.control}
              name="reservationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Reservation Date & Time *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      min={getCurrentDateTime()}
                      {...field}
                      className="w-full"
                      data-testid="input-reservation-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Table Selection */}
            <FormField
              control={form.control}
              name="tableId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Table *
                  </FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Also set the tableName for display purposes
                        const selectedTable = tables.find((table: any) => table.id.toString() === value);
                        if (selectedTable) {
                          form.setValue("tableName", `Table ${selectedTable.name}`);
                        }
                      }} 
                      value={field.value}
                      data-testid="select-table"
                      disabled={isLoadingTables}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingTables ? "Loading tables..." : "Select table"} />
                      </SelectTrigger>
                      <SelectContent>
                        {tables.map((table: any) => (
                          <SelectItem key={table.id} value={table.id.toString()}>
                            Table {table.name} (Capacity: {table.capacity || 'N/A'})
                          </SelectItem>
                        ))}
                        {/* Fallback options if no tables are loaded */}
                        {!isLoadingTables && tables.length === 0 && (
                          <>
                            <SelectItem value="1">Table 1</SelectItem>
                            <SelectItem value="2">Table 2</SelectItem>
                            <SelectItem value="3">Table 3</SelectItem>
                            <SelectItem value="4">Table 4</SelectItem>
                            <SelectItem value="5">Table 5</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Number of Guests */}
            <FormField
              control={form.control}
              name="numberOfGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Number of Guests *
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      placeholder="Enter number of guests"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      className="w-full"
                      data-testid="input-number-of-guests"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-900">
                    Status *
                  </FormLabel>
                  <FormControl>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      data-testid="select-status"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                data-testid="button-cancel"
                disabled={createReservationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white"
                data-testid="button-submit"
                disabled={createReservationMutation.isPending}
              >
                {createReservationMutation.isPending 
                  ? (isEditMode ? "Updating..." : "Creating...") 
                  : (isEditMode ? "Update Reservation" : "Create Reservation")
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}