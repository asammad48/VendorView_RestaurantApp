import { useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { type InsertService, type Service } from "@/types/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { servicesApi } from "@/lib/apiRepository";
import { useBranchCurrency } from "@/hooks/useBranchCurrency";

interface AddServicesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId?: number;
  onServicesUpdated?: () => void;
}


interface ServiceWithPrice {
  serviceId: number;
  price: number;
}

export default function AddServicesModal({ open, onOpenChange, branchId, onServicesUpdated }: AddServicesModalProps) {
  const [selectedServices, setSelectedServices] = useState<ServiceWithPrice[]>([]);
  const [displayPrices, setDisplayPrices] = useState<Record<number, string>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatPriceFromCents, getCurrencySymbol } = useBranchCurrency(branchId);



  // Fetch available services from API
  const { data: availableServices = [], isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ['services', 2],
    queryFn: async (): Promise<Service[]> => {
      return await servicesApi.getServicesByType(2); // Type 2 for restaurant
    },
    enabled: open,
  });

  const updateBranchServicesMutation = useMutation({
    mutationFn: async (services: ServiceWithPrice[]) => {
      if (!branchId) throw new Error('Branch ID is required');
      return await servicesApi.updateBranchServices(branchId, services);
    },
    onSuccess: () => {
      if (branchId) queryClient.invalidateQueries({ queryKey: ['branch-services', branchId] });
      toast({
        title: "Success",
        description: `${selectedServices.length} service(s) added to branch successfully`,
      });
      setSelectedServices([]);
      setDisplayPrices({});
      onOpenChange(false);
      if (onServicesUpdated) {
        onServicesUpdated();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add services to branch",
        variant: "destructive",
      });
    },
  });

  const handleServiceToggle = (service: Service) => {
    setSelectedServices(prev => {
      const existingIndex = prev.findIndex(s => s.serviceId === service.id);
      if (existingIndex >= 0) {
        // Remove service and its display price
        setDisplayPrices(prevDisplay => {
          const newDisplay = { ...prevDisplay };
          delete newDisplay[service.id];
          return newDisplay;
        });
        return prev.filter(s => s.serviceId !== service.id);
      } else {
        // Add service and set initial display price as empty string so user has full control
        const initialPrice = service.price / 100;
        setDisplayPrices(prev => ({ ...prev, [service.id]: "" }));
        return [...prev, { serviceId: service.id, price: initialPrice }];
      }
    });
  };

  const handlePriceChange = (serviceId: number, displayValue: string, numericValue: number) => {
    setDisplayPrices(prev => ({ ...prev, [serviceId]: displayValue }));
    setSelectedServices(prev => 
      prev.map(s => 
        s.serviceId === serviceId ? { ...s, price: numericValue } : s
      )
    );
  };

  const isServiceSelected = (serviceId: number) => {
    return selectedServices.some(s => s.serviceId === serviceId);
  };

  const getServicePrice = (serviceId: number) => {
    const service = selectedServices.find(s => s.serviceId === serviceId);
    return service?.price || 0;
  };

  const getDisplayPrice = (serviceId: number) => {
    return displayPrices[serviceId] !== undefined ? displayPrices[serviceId] : "";
  };



  const handleSubmit = () => {
    if (selectedServices.length === 0) {
      toast({
        title: "Warning",
        description: "Please select at least one service",
        variant: "destructive",
      });
      return;
    }

    updateBranchServicesMutation.mutate(selectedServices);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-6 bg-white rounded-lg max-h-[85vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold text-gray-900 mb-6">
          Add Services
        </DialogTitle>

        <div className="space-y-6">
          {/* Predefined Services */}
          <div>
            <Label className="text-lg font-medium text-gray-900 mb-4 block">
              Select from Available Services
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {isLoadingServices ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  Loading services...
                </div>
              ) : availableServices.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  No services available
                </div>
              ) : (
                availableServices.map((service) => {
                  const isSelected = isServiceSelected(service.id);
                  const currentDisplayPrice = getDisplayPrice(service.id);
                  
                  return (
                    <div key={service.id} className="flex flex-col space-y-3 p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleServiceToggle(service)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">{service.name}</p>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                service.price === 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {service.price === 0 ? 'Free' : `Default: ${formatPriceFromCents(service.price)}`}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="ml-6 flex items-center space-x-2">
                          <Label className="text-sm font-medium text-gray-700">Custom Price ({getCurrencySymbol()}):</Label>
                          <Input
                            type="text"
                            value={currentDisplayPrice}
                            onChange={(e) => {
                              // Allow leading zeros by preserving string format for display
                              const value = e.target.value;
                              // Only allow numbers and decimal points
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                // Keep display format and convert to number for API
                                const numValue = value === '' ? 0 : parseFloat(value) || 0;
                                handlePriceChange(service.id, value, numValue);
                              }
                            }}
                            className="w-24 text-sm"
                            placeholder="0500"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>



          {/* Submit Button */}
          <div className="flex justify-center pt-6 border-t">
            <Button
              onClick={handleSubmit}
              disabled={updateBranchServicesMutation.isPending || selectedServices.length === 0}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-2 rounded-md"
            >
              {updateBranchServicesMutation.isPending ? "Adding..." : `Add ${selectedServices.length} Service(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}