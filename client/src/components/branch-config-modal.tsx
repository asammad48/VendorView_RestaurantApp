import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { Branch } from "@/types/schema";
import { branchApi } from "@/lib/apiRepository";
import { convertToUTC, getCurrencySymbol } from "@/lib/currencyUtils";
import { useBranchCurrency } from "@/hooks/useBranchCurrency";

// Configuration schema - using lowercase to match API response
const branchConfigSchema = z.object({
  isTakeaway: z.boolean(),
  isReservation: z.boolean(),
  isDelivery: z.boolean(),
  
  // Operating Hours
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  
  // Financial Configuration - Keep as strings to preserve leading zeros
  serviceCharges: z.string().optional(),
  taxPercentage: z.string().optional(),
  taxAppliedType: z.preprocess(v => v === '' || v == null ? undefined : Number(v), z.number().min(0).optional()),
  maxDiscountAmount: z.preprocess(v => v === '' || v == null ? undefined : Number(v), z.number().min(0).optional()),
  
  // Delivery Configuration
  deliveryTime: z.preprocess(v => v === '' || v == null ? undefined : Number(v), z.number().min(0).optional()),
  deliveryMinimumOrder: z.preprocess(v => v === '' || v == null ? undefined : Number(v), z.number().min(0).optional()),
  deliveryFee: z.preprocess(v => v === '' || v == null ? undefined : Number(v), z.number().min(0).optional()),
  maxDeliveryDistance: z.preprocess(v => v === '' || v == null ? undefined : Number(v), z.number().min(0).optional()),
  
  // Reservation Configuration  
  maxAdvanceDays: z.preprocess(v => v === '' || v == null ? undefined : Number(v), z.number().min(0).optional()),
  minNoticeMinutes: z.preprocess(v => v === '' || v == null ? undefined : Number(v), z.number().min(0).optional()),
  maxGuestsPerReservation: z.preprocess(v => v === '' || v == null ? undefined : Number(v), z.number().min(1).optional()),
  holdTimeMinutes: z.preprocess(v => v === '' || v == null ? undefined : Number(v), z.number().min(0).optional()),
});

type BranchConfigData = z.infer<typeof branchConfigSchema>;

// Type for API response
interface BranchConfigResponse {
  branchId: number;
  isTakeaway: boolean;
  isReservation: boolean;
  isDelivery: boolean;
  deliveryTime: number;
  deliveryMinimumOrder: number;
  deliveryFee: number;
  maxDeliveryDistance: number;
  maxAdvanceDays: number;
  minNoticeMinutes: number;
  maxGuestsPerReservation: number;
  holdTimeMinutes: number;
  openTime: string;
  closeTime: string;
  serviceCharges: number;
  taxPercentage: number;
  taxAppliedType: number;
  maxDiscountAmount: number;
}

interface BranchConfigModalProps {
  open: boolean;
  onClose: () => void;
  branch: Branch;
}

export default function BranchConfigModal({ open, onClose, branch }: BranchConfigModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { getCurrencySymbol: getBranchCurrencySymbol } = useBranchCurrency(branch?.id);
  const hasLoadedRef = useRef(false);
  
  const form = useForm<BranchConfigData>({
    resolver: zodResolver(branchConfigSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: {
      isTakeaway: true,
      isReservation: false,
      isDelivery: false,
      
      // Operating Hours defaults
      openTime: "09:00",
      closeTime: "22:00",
      
      // Financial defaults - Allow empty values
      serviceCharges: "",
      taxPercentage: "",
      taxAppliedType: 1,
      maxDiscountAmount: undefined,
      
      // Delivery defaults - Exact same as Max Discount Amount
      deliveryTime: undefined,
      deliveryMinimumOrder: undefined,
      deliveryFee: undefined,
      maxDeliveryDistance: undefined,
      
      // Reservation defaults - Exact same as Max Discount Amount
      maxAdvanceDays: undefined,
      minNoticeMinutes: undefined,
      maxGuestsPerReservation: undefined,
      holdTimeMinutes: undefined,
    },
  });

  const isReservationEnabled = form.watch("isReservation");
  const isDeliveryEnabled = form.watch("isDelivery");

  // Fetch configuration data when modal opens
  useEffect(() => {
    const fetchConfiguration = async () => {
      if (!open || !branch.id) {
        hasLoadedRef.current = false;
        return;
      }
      
      setIsLoading(true);
      try {
        const configData = await branchApi.getBranchConfiguration(branch.id) as BranchConfigResponse;
        console.log("Fetched configuration:", configData);
        
        // Convert UTC time back to local time for display
        const formatTimeFromUTC = (utcTimeString: string) => {
          if (!utcTimeString || utcTimeString === "00:00:00") return "";
          try {
            // If it's just HH:mm:ss format, create a proper UTC date object
            if (utcTimeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
              const [hours, minutes, seconds] = utcTimeString.split(':');
              
              // Create a date object with today's date and the UTC time
              const today = new Date();
              const utcDate = new Date(Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth(),
                today.getUTCDate(),
                parseInt(hours),
                parseInt(minutes),
                parseInt(seconds || '0')
              ));
              
              // Convert UTC to local time (user's timezone)
              const localHours = utcDate.getHours().toString().padStart(2, '0');
              const localMinutes = utcDate.getMinutes().toString().padStart(2, '0');
              
              return `${localHours}:${localMinutes}`;
            }
            return utcTimeString.substring(0, 5); // Fallback
          } catch (error) {
            console.error('Error converting UTC time to local:', error);
            return utcTimeString.substring(0, 5);
          }
        };

        // Only reset form once per modal open to prevent overwriting user input
        if (hasLoadedRef.current) return;
        
        // Don't reset if user has already started editing (check individual field states)
        const hasUserInteraction = Object.keys(form.getValues()).some(fieldName => {
          const fieldState = form.getFieldState(fieldName as any);
          return fieldState.isTouched || fieldState.isDirty;
        });
        if (hasUserInteraction) return;

        // Reset form with fetched data - preserve any fields user is currently editing
        form.reset({
          isTakeaway: configData.isTakeaway || false,
          isReservation: configData.isReservation || false,
          isDelivery: configData.isDelivery || false,
          openTime: formatTimeFromUTC(configData.openTime),
          closeTime: formatTimeFromUTC(configData.closeTime),
          serviceCharges: configData.serviceCharges?.toString() ?? "",
          taxPercentage: configData.taxPercentage?.toString() ?? "",
          taxAppliedType: configData.taxAppliedType ?? 1,
          maxDiscountAmount: configData.maxDiscountAmount ?? undefined,
          deliveryTime: configData.deliveryTime ?? undefined,
          deliveryMinimumOrder: configData.deliveryMinimumOrder ?? undefined,
          deliveryFee: configData.deliveryFee ?? undefined,
          maxDeliveryDistance: configData.maxDeliveryDistance ?? undefined,
          maxAdvanceDays: configData.maxAdvanceDays ?? undefined,
          minNoticeMinutes: configData.minNoticeMinutes ?? undefined,
          maxGuestsPerReservation: configData.maxGuestsPerReservation ?? undefined,
          holdTimeMinutes: configData.holdTimeMinutes ?? undefined,
        }, { keepDirtyValues: true });

        hasLoadedRef.current = true;
      } catch (error: any) {
        console.error("Failed to fetch configuration:", error);
        toast({
          title: "Warning",
          description: "Could not load current configuration. Using defaults.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfiguration();
  }, [open, branch.id]);

  const onSubmit = async (data: BranchConfigData) => {
    setIsSaving(true);
    try {
      console.log("Submitting configuration data:", data);
      
      // Convert local time to UTC for API submission
      const formatTimeForApi = (timeString: string) => {
        if (!timeString) return "00:00:00";
        try {
          const [hours, minutes] = timeString.split(':');
          
          // Create a date object for today with the local time in the user's timezone
          const today = new Date();
          const localDate = new Date(
            today.getFullYear(),
            today.getMonth(), 
            today.getDate(),
            parseInt(hours),
            parseInt(minutes),
            0,
            0
          );
          
          // Convert to UTC by getting the UTC components
          const utcHours = localDate.getUTCHours().toString().padStart(2, '0');
          const utcMinutes = localDate.getUTCMinutes().toString().padStart(2, '0');
          const utcSeconds = localDate.getUTCSeconds().toString().padStart(2, '0');
          
          return `${utcHours}:${utcMinutes}:${utcSeconds}`;
        } catch (error) {
          console.error('Error converting local time to UTC:', error);
          return timeString + ":00"; // Fallback
        }
      };

      const apiData = {
        ...data,
        openTime: formatTimeForApi(data.openTime || ""),
        closeTime: formatTimeForApi(data.closeTime || ""),
        // Convert string values back to numbers for API - preserve empty as undefined
        serviceCharges: data.serviceCharges?.trim() === '' || data.serviceCharges == null ? undefined : parseFloat(data.serviceCharges),
        taxPercentage: data.taxPercentage?.trim() === '' || data.taxPercentage == null ? undefined : parseFloat(data.taxPercentage),
        // Map to API field name
        MaxDiscountAmount: data.maxDiscountAmount,
        // Remove the camelCase version to avoid duplication
        maxDiscountAmount: undefined,
      };

      await branchApi.updateBranchConfiguration(branch.id, apiData);
      
      toast({
        title: "Success",
        description: "Branch configuration updated successfully",
      });
      onClose();
    } catch (error: any) {
      console.error("Failed to update configuration:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Configure {branch.name}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Service Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="isTakeaway"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-medium">Takeaway Service</FormLabel>
                        <p className="text-xs text-muted-foreground">Allow customers to place takeaway orders</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isReservation"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-medium">Reservation Service</FormLabel>
                        <p className="text-xs text-muted-foreground">Allow customers to make table reservations</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDelivery"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <div className="space-y-1">
                        <FormLabel className="text-sm font-medium">Delivery Service</FormLabel>
                        <p className="text-xs text-muted-foreground">Allow customers to order for delivery</p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Operating Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Operating Hours & Financial Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="openTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Time (Local Time)</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow clearing by setting to undefined
                                if (value === '') {
                                  field.onChange(undefined);
                                } else {
                                  field.onChange(value);
                                }
                              }}
                              className="w-full"
                              placeholder="09:00"
                              data-testid="input-open-time"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange(undefined)}
                              className="px-2"
                              title="Clear opening time"
                            >
                              ✕
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="closeTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Closing Time (Local Time)</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow clearing by setting to undefined
                                if (value === '') {
                                  field.onChange(undefined);
                                } else {
                                  field.onChange(value);
                                }
                              }}
                              className="w-full"
                              placeholder="22:00"
                              data-testid="input-close-time"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange(undefined)}
                              className="px-2"
                              title="Clear closing time"
                            >
                              ✕
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serviceCharges"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Charges ({getBranchCurrencySymbol()})</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              // Allow leading zeros by keeping as string
                              const value = e.target.value;
                              // Only allow numbers and decimal points
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                field.onChange(value);
                              }
                            }}
                            placeholder="Enter service charges (e.g., 5.00)"
                            data-testid="input-service-charges"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Percentage (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              // Allow leading zeros by keeping as string
                              const value = e.target.value;
                              // Only allow numbers and decimal points
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                field.onChange(value);
                              }
                            }}
                            placeholder="Enter tax percentage (e.g., 15.5)"
                            data-testid="input-tax-percentage"
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
                    name="taxAppliedType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Applied On</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tax application type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Total Amount</SelectItem>
                            <SelectItem value="2">Discount Amount</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxDiscountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Discount Amount ({getBranchCurrencySymbol()})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow immediate update for better editing experience
                              if (value === '') {
                                field.onChange(undefined);
                              } else {
                                // Allow any numeric input during typing
                                field.onChange(value);
                              }
                            }}
                            onBlur={(e) => {
                              // Parse and validate only on blur
                              const value = e.target.value;
                              if (value === '') {
                                field.onChange(undefined);
                              } else {
                                const numValue = parseFloat(value);
                                if (!isNaN(numValue) && numValue >= 0) {
                                  field.onChange(numValue);
                                } else {
                                  field.onChange(undefined);
                                }
                              }
                            }}
                            placeholder="Enter max discount amount"
                            data-testid="input-max-discount-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Delivery Configuration */}
            {isDeliveryEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Delivery Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Time (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow immediate update for better editing experience
                                if (value === '') {
                                  field.onChange(''); // Keep empty string to mark as dirty
                                } else {
                                  // Allow any numeric input during typing
                                  field.onChange(value);
                                }
                              }}
                              onBlur={(e) => {
                                // Parse and validate only on blur
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(''); // Keep empty string for clearing
                                } else {
                                  const numValue = parseInt(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    field.onChange(numValue);
                                  } else {
                                    field.onChange(undefined);
                                  }
                                }
                              }}
                              placeholder="Enter delivery time in minutes (e.g., 30)"
                              data-testid="input-delivery-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Fee ({getBranchCurrencySymbol()})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow immediate update for better editing experience
                                if (value === '') {
                                  field.onChange(''); // Keep empty string to mark as dirty
                                } else {
                                  // Allow any numeric input during typing
                                  field.onChange(value);
                                }
                              }}
                              onBlur={(e) => {
                                // Parse and validate only on blur
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(''); // Keep empty string for clearing
                                } else {
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    field.onChange(numValue);
                                  } else {
                                    field.onChange(undefined);
                                  }
                                }
                              }}
                              placeholder="Enter delivery fee (e.g., 3.99)"
                              data-testid="input-delivery-fee"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryMinimumOrder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum Order ({getBranchCurrencySymbol()})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow immediate update for better editing experience
                                if (value === '') {
                                  field.onChange(''); // Keep empty string to mark as dirty
                                } else {
                                  // Allow any numeric input during typing
                                  field.onChange(value);
                                }
                              }}
                              onBlur={(e) => {
                                // Parse and validate only on blur
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(''); // Keep empty string for clearing
                                } else {
                                  const numValue = parseFloat(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    field.onChange(numValue);
                                  } else {
                                    field.onChange(undefined);
                                  }
                                }
                              }}
                              placeholder="Enter minimum order amount (e.g., 25.00)"
                              data-testid="input-delivery-minimum-order"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxDeliveryDistance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Distance (km)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow immediate update for better editing experience
                                if (value === '') {
                                  field.onChange(''); // Keep empty string to mark as dirty
                                } else {
                                  // Allow any numeric input during typing
                                  field.onChange(value);
                                }
                              }}
                              onBlur={(e) => {
                                // Parse and validate only on blur
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(''); // Keep empty string for clearing
                                } else {
                                  const numValue = parseInt(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    field.onChange(numValue);
                                  } else {
                                    field.onChange(undefined);
                                  }
                                }
                              }}
                              placeholder="Enter max delivery distance in km (e.g., 10)"
                              data-testid="input-max-delivery-distance"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reservation Configuration */}
            {isReservationEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reservation Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maxAdvanceDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Advance Days</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow immediate update for better editing experience
                                if (value === '') {
                                  field.onChange(''); // Keep empty string to mark as dirty
                                } else {
                                  // Allow any numeric input during typing
                                  field.onChange(value);
                                }
                              }}
                              onBlur={(e) => {
                                // Parse and validate only on blur
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(''); // Keep empty string for clearing
                                } else {
                                  const numValue = parseInt(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    field.onChange(numValue);
                                  } else {
                                    field.onChange(undefined);
                                  }
                                }
                              }}
                              placeholder="Enter max advance booking days (e.g., 30)"
                              data-testid="input-max-advance-days"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minNoticeMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Notice (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow immediate update for better editing experience
                                if (value === '') {
                                  field.onChange(''); // Keep empty string to mark as dirty
                                } else {
                                  // Allow any numeric input during typing
                                  field.onChange(value);
                                }
                              }}
                              onBlur={(e) => {
                                // Parse and validate only on blur
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(''); // Keep empty string for clearing
                                } else {
                                  const numValue = parseInt(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    field.onChange(numValue);
                                  } else {
                                    field.onChange(undefined);
                                  }
                                }
                              }}
                              placeholder="Enter minimum notice time in minutes (e.g., 120)"
                              data-testid="input-min-notice-minutes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxGuestsPerReservation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Guests per Reservation</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow immediate update for better editing experience
                                if (value === '') {
                                  field.onChange(''); // Keep empty string to mark as dirty
                                } else {
                                  // Allow any numeric input during typing
                                  field.onChange(value);
                                }
                              }}
                              onBlur={(e) => {
                                // Parse and validate only on blur
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(''); // Keep empty string for clearing
                                } else {
                                  const numValue = parseInt(value);
                                  if (!isNaN(numValue) && numValue >= 1) {
                                    field.onChange(numValue);
                                  } else {
                                    field.onChange(undefined);
                                  }
                                }
                              }}
                              placeholder="Enter max guests per reservation (e.g., 8)"
                              data-testid="input-max-guests-per-reservation"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="holdTimeMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hold Time (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow immediate update for better editing experience
                                if (value === '') {
                                  field.onChange(''); // Keep empty string to mark as dirty
                                } else {
                                  // Allow any numeric input during typing
                                  field.onChange(value);
                                }
                              }}
                              onBlur={(e) => {
                                // Parse and validate only on blur
                                const value = e.target.value;
                                if (value === '') {
                                  field.onChange(''); // Keep empty string for clearing
                                } else {
                                  const numValue = parseInt(value);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    field.onChange(numValue);
                                  } else {
                                    field.onChange(undefined);
                                  }
                                }
                              }}
                              placeholder="Enter hold time in minutes (e.g., 15)"
                              data-testid="input-hold-time-minutes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
{isSaving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}