import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { reservationApi } from "@/lib/apiRepository";
import { Separator } from "@/components/ui/separator";
import { ReservationDetail, ReservationStatus } from "@/types/schema";

// Action form schema for status update
const actionFormSchema = z.object({
  actionTaken: z.number().min(0).max(2, "Invalid status"),
  remarks: z.string().optional(),
});

type ActionFormData = z.infer<typeof actionFormSchema>;

interface ViewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: number;
}

const getStatusBadge = (actionTaken: number) => {
  switch (actionTaken) {
    case 0:
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    case 1:
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Confirmed</Badge>;
    case 2:
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getStatusOptions = () => [
  { value: "0", label: "Pending" },
  { value: "1", label: "Confirmed" },
  { value: "2", label: "Completed" }
];

export function ViewReservationModal({ 
  isOpen, 
  onClose, 
  reservationId 
}: ViewReservationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const form = useForm<ActionFormData>({
    resolver: zodResolver(actionFormSchema),
    defaultValues: {
      actionTaken: 0,
      remarks: "",
    },
  });

  // Fetch reservation detail
  const { data: reservationDetail, isLoading, error, refetch } = useQuery<ReservationDetail>({
    queryKey: ['reservation-detail', reservationId],
    queryFn: () => reservationApi.getReservationDetail(reservationId),
    enabled: isOpen && !!reservationId,
  });

  // Update form values when reservation detail loads
  useEffect(() => {
    if (reservationDetail) {
      form.reset({
        actionTaken: reservationDetail.actionTaken,
        remarks: reservationDetail.remarks || "",
      });
    }
  }, [reservationDetail, form]);

  // Mutation for updating reservation action
  const updateActionMutation = useMutation({
    mutationFn: (actionData: { actionTaken: ReservationStatus; remarks?: string | null }) => 
      reservationApi.updateReservationAction(reservationId, actionData),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reservation status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation-detail', reservationId] });
      refetch();
      setIsUpdatingStatus(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reservation status",
        variant: "destructive",
      });
      setIsUpdatingStatus(false);
    },
  });

  const onUpdateStatus = (data: ActionFormData) => {
    setIsUpdatingStatus(true);
    updateActionMutation.mutate({
      actionTaken: data.actionTaken as ReservationStatus,
      remarks: data.remarks || null,
    });
  };

  const handleClose = () => {
    form.reset();
    setIsUpdatingStatus(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="modal-view-reservation">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Reservation Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="loading-spinner inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Loading reservation details...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">Error loading reservation details</p>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="mt-2"
                data-testid="button-retry"
              >
                Retry
              </Button>
            </div>
          ) : reservationDetail ? (
            <>
              {/* Reservation Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Reservation Information</h3>
                  {getStatusBadge(reservationDetail.actionTaken)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Reservation Name</label>
                    <Input
                      value={reservationDetail.reservationName}
                      readOnly
                      className="bg-gray-50"
                      data-testid="input-reservation-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                    <Input
                      value={reservationDetail.emailAddress || ""}
                      readOnly
                      className="bg-gray-50"
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Reservation Date</label>
                    <Input
                      value={format(new Date(reservationDetail.reservationDate), 'PPP')}
                      readOnly
                      className="bg-gray-50"
                      data-testid="input-reservation-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Reservation Time</label>
                    <Input
                      value={reservationDetail.reservationTime || ""}
                      readOnly
                      className="bg-gray-50"
                      data-testid="input-reservation-time"
                    />
                  </div>
                </div>

                {reservationDetail.specialRequest && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Special Request</label>
                    <Textarea
                      value={reservationDetail.specialRequest}
                      readOnly
                      className="bg-gray-50"
                      data-testid="textarea-special-request"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Created:</span> {format(new Date(reservationDetail.createdDate), 'PPpp')}
                  </div>
                  {reservationDetail.modifiedDate && (
                    <div>
                      <span className="font-medium">Modified:</span> {format(new Date(reservationDetail.modifiedDate), 'PPpp')}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Status Update Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Update Status</h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onUpdateStatus)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="actionTaken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            data-testid="select-status"
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getStatusOptions().map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
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
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any remarks or notes..."
                              {...field}
                              data-testid="textarea-remarks"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        data-testid="button-cancel"
                      >
                        Close
                      </Button>
                      <Button
                        type="submit"
                        disabled={isUpdatingStatus || updateActionMutation.isPending}
                        data-testid="button-update-status"
                      >
                        {isUpdatingStatus || updateActionMutation.isPending ? "Updating..." : "Update Status"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}