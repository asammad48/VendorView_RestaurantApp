import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { insertDealSchema, type InsertDeal, type SimpleMenuItem, type SimpleSubMenuItem, type DealMenuItem, type Deal } from "@/types/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { menuItemApi, dealsApi, subMenuItemApi } from "@/lib/apiRepository";
import { createApiQuery, createApiMutation, formatApiError } from "@/lib/errorHandling";
import { useToast } from "@/hooks/use-toast";
import { useBranchCurrency } from "@/hooks/useBranchCurrency";
import { convertToUTC, convertLocalDateToUTC, convertUTCToLocalDate } from "@/lib/currencyUtils";
import { validateImage, getConstraintDescription } from "@/lib/imageValidation";

interface AddDealsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId?: string;
  branchId?: number;
  editDealId?: number; // Changed from editDeal to editDealId
}

interface DealItem {
  menuItemId: number;
  menuItemName: string;
  variants: Array<{
    variantId: number;
    name: string;
    price: number;
    quantity: number;
  }>;
}

interface DealSubMenuItem {
  subMenuItemId: number;
  name: string;
  price: number;
  quantity: number;
}

export default function AddDealsModal({ open, onOpenChange, restaurantId, branchId, editDealId }: AddDealsModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedItems, setSelectedItems] = useState<DealItem[]>([]);
  const [selectedSubMenuItems, setSelectedSubMenuItems] = useState<DealSubMenuItem[]>([]);
  const [originalImage, setOriginalImage] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { formatPrice, getCurrencySymbol } = useBranchCurrency(branchId);

  const { data: menuItems = [], isLoading: menuItemsLoading } = useQuery({
    queryKey: ['menu-items-simple', branchId, open], // Include 'open' to refresh when modal opens
    queryFn: createApiQuery<SimpleMenuItem[]>(async () => {
      if (!branchId) return { data: [], error: undefined, status: 200 };
      const response = await menuItemApi.getSimpleMenuItemsByBranch(branchId);
      return { ...response, data: (response.data as SimpleMenuItem[]) || [] };
    }),
    enabled: open && !!branchId,
    staleTime: 0, // Always fetch fresh data when modal opens
  });

  const { data: subMenuItems = [], isLoading: subMenuItemsLoading } = useQuery({
    queryKey: ['sub-menu-items-simple', branchId, open], // Include 'open' to refresh when modal opens
    queryFn: createApiQuery<SimpleSubMenuItem[]>(async () => {
      if (!branchId) return { data: [], error: undefined, status: 200 };
      const response = await subMenuItemApi.getSimpleSubMenuItemsByBranch(branchId);
      return { ...response, data: (response.data as SimpleSubMenuItem[]) || [] };
    }),
    enabled: open && !!branchId,
    staleTime: 0, // Always fetch fresh data when modal opens
  });

  // Fetch deal data when editing - ALWAYS REFRESH when modal opens
  const { data: dealData, isLoading: isDealLoading } = useQuery({
    queryKey: ['deal', editDealId, open], // Include 'open' to refresh when modal opens
    queryFn: async (): Promise<Deal> => {
      if (!editDealId) throw new Error('Deal ID is required');
      const response = await dealsApi.getDealById(editDealId);
      if (!response) throw new Error('Deal not found');
      return response;
    },
    enabled: open && !!editDealId,
    staleTime: 0, // Always fetch fresh data when modal opens for editing
  });

  const isEditMode = !!editDealId;

  const form = useForm<InsertDeal>({
    resolver: zodResolver(insertDealSchema),
    defaultValues: {
      branchId: branchId,
      name: "",
      description: "",
      price: 0,
      packagePicture: "",
      expiryDate: "",
      menuItems: [],
      subMenuItems: [],
    },
  });

  // Effect to populate form when editing and deal data is loaded
  useEffect(() => {
    if (isEditMode && dealData && !isDealLoading && !subMenuItemsLoading && menuItems.length > 0 && subMenuItems.length > 0) {
      // Populate form with API data
      form.reset({
        branchId: dealData.branchId,
        name: dealData.name || "",
        description: dealData.description || "",
        price: dealData.price ? dealData.price / 100 : 0, // Convert cents to rupees
        packagePicture: dealData.packagePicture || "",
        expiryDate: dealData.expiryDate ? convertUTCToLocalDate(dealData.expiryDate) : "", // Convert UTC to local date for input
        menuItems: dealData.menuItems?.map(item => ({
          menuItemId: item.menuItemId,
          variants: item.variants || []
        })) || [],
        subMenuItems: dealData.subMenuItems || [],
      });
      
      // Set image if available
      if (dealData.packagePicture) {
        setOriginalImage(dealData.packagePicture); // Store original for comparison
      }
      
      // Set selected items (convert to local format for UI with variants)
      if (dealData.menuItems && dealData.menuItems.length > 0) {
        // For backward compatibility, convert old format to new variant-based format
        const selectedItemsMap = new Map<number, DealItem>();
        
        dealData.menuItems.forEach(item => {
          if (!selectedItemsMap.has(item.menuItemId)) {
            // Find the menu item to get variants
            const menuItem = menuItems.find(mi => mi.menuItemId === item.menuItemId);
            selectedItemsMap.set(item.menuItemId, {
              menuItemId: item.menuItemId,
              menuItemName: menuItem?.menuItemName || `Item ${item.menuItemId}`,
              variants: menuItem?.variants.map(v => ({
                variantId: v.id, // Use the actual variant ID from API
                name: v.name,
                price: v.price,
                quantity: item.variants.find(variant => variant.variantId === v.id)?.quantity || 0
              })) || item.variants.map(variant => ({
                variantId: variant.variantId,
                name: `Variant ${variant.variantId}`,
                price: 0,
                quantity: variant.quantity
              }))
            });
          }
        });
        
        setSelectedItems(Array.from(selectedItemsMap.values()));
      } else {
        setSelectedItems([]);
      }
      
      // Set selected sub menu items
      if (dealData.subMenuItems && dealData.subMenuItems.length > 0) {
        const selectedSubItems = dealData.subMenuItems.map(item => {
          const subMenuItem = subMenuItems.find(smi => smi.id === item.subMenuItemId);
          return {
            subMenuItemId: item.subMenuItemId,
            name: subMenuItem?.name || `SubItem ${item.subMenuItemId}`,
            price: subMenuItem?.price || 0,
            quantity: item.quantity || 1
          };
        });
        setSelectedSubMenuItems(selectedSubItems);
      } else {
        setSelectedSubMenuItems([]);
      }
    } else if (!isEditMode) {
      // Reset form for add mode
      form.reset({
        branchId: branchId,
        name: "",
        description: "",
        price: 0,
        packagePicture: "",
        expiryDate: "",
        menuItems: [],
        subMenuItems: [],
      });
      setSelectedItems([]);
      setSelectedSubMenuItems([]);
      setSelectedFile(null);
      setOriginalImage("");
    }
  }, [isEditMode, dealData, isDealLoading, subMenuItemsLoading, editDealId, open]);

  const createDealMutation = useMutation({
    mutationFn: async (data: InsertDeal) => {
      if (isEditMode && editDealId) {
        // Update existing deal
        const response = await dealsApi.updateDeal(editDealId, data);
        return response;
      } else {
        // Create new deal
        const response = await dealsApi.createDeal(data);
        if (response.error) {
          throw new Error(response.error);
        }
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      if (branchId) queryClient.invalidateQueries({ queryKey: [`deals-branch-${branchId}`] });
      toast({
        title: "Success",
        description: isEditMode ? "Deal updated successfully" : "Deal created successfully",
      });
      form.reset();
      setSelectedFile(null);
      setSelectedItems([]);
      setSelectedSubMenuItems([]);
      setOriginalImage("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save deal",
        variant: "destructive",
      });
    },
  });

  const handleItemToggle = (item: SimpleMenuItem) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.menuItemId === item.menuItemId);
      let newItems;
      if (exists) {
        newItems = prev.filter(i => i.menuItemId !== item.menuItemId);
      } else {
        // Add item with all variants and default quantity of 1
        const itemWithVariants: DealItem = {
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          variants: item.variants.map(variant => ({
            variantId: variant.id, // Use the actual variant ID from API
            name: variant.name,
            price: variant.price,
            quantity: 1
          }))
        };
        newItems = [...prev, itemWithVariants];
      }
      
      // Update form's menuItems field with new structure
      const formMenuItems = newItems
        .filter(item => item.variants.some(variant => variant.quantity > 0))
        .map(item => ({
          menuItemId: item.menuItemId,
          variants: item.variants
            .filter(variant => variant.quantity > 0)
            .map(variant => ({
              variantId: variant.variantId,
              quantity: variant.quantity
            }))
        }));
      form.setValue('menuItems', formMenuItems);
      
      return newItems;
    });
  };

  const handleSubMenuItemToggle = (item: SimpleSubMenuItem) => {
    setSelectedSubMenuItems(prev => {
      const exists = prev.find(i => i.subMenuItemId === item.id);
      let newItems;
      if (exists) {
        newItems = prev.filter(i => i.subMenuItemId !== item.id);
      } else {
        // Add sub menu item with default quantity of 1
        const newSubMenuItem: DealSubMenuItem = {
          subMenuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1
        };
        newItems = [...prev, newSubMenuItem];
      }
      
      // Update form's subMenuItems field
      const formSubMenuItems = newItems
        .filter(item => item.quantity > 0)
        .map(item => ({
          subMenuItemId: item.subMenuItemId,
          quantity: item.quantity
        }));
      form.setValue('subMenuItems', formSubMenuItems);
      
      return newItems;
    });
  };

  const handleSubMenuItemQuantityChange = (subMenuItemId: number, quantity: number) => {
    setSelectedSubMenuItems(prev => {
      const newItems = prev.map(item =>
        item.subMenuItemId === subMenuItemId ? { ...item, quantity } : item
      );
      
      // Update form's subMenuItems field
      const formSubMenuItems = newItems
        .filter(item => item.quantity > 0)
        .map(item => ({
          subMenuItemId: item.subMenuItemId,
          quantity: item.quantity
        }));
      
      form.setValue('subMenuItems', formSubMenuItems);
      
      return newItems;
    });
  };

  const handleVariantQuantityChange = (menuItemId: number, variantId: number, quantity: number) => {
    setSelectedItems(prev => {
      const newItems = prev.map(item => {
        if (item.menuItemId === menuItemId) {
          return {
            ...item,
            variants: item.variants.map(variant =>
              variant.variantId === variantId ? { ...variant, quantity } : variant
            )
          };
        }
        return item;
      });
      
      // Update form's menuItems field with new structure
      const formMenuItems = newItems
        .filter(item => item.variants.some(variant => variant.quantity > 0))
        .map(item => ({
          menuItemId: item.menuItemId,
          variants: item.variants
            .filter(variant => variant.quantity > 0)
            .map(variant => ({
              variantId: variant.variantId,
              quantity: variant.quantity
            }))
        }));
      form.setValue('menuItems', formMenuItems);
      
      return newItems;
    });
  };

  const onSubmit = (data: InsertDeal) => {
    // Handle image logic: only send base64 if image is updated, else send empty string
    let packagePicture = "";
    if (selectedFile) {
      // New image selected - use the base64 from form
      packagePicture = data.packagePicture || "";
    } else if (isEditMode && !selectedFile) {
      // Editing but no new image - send empty string as per requirements
      packagePicture = "";
    }

    if (!branchId) {
      throw new Error('Branch ID is required');
    }
    
    const dealData = {
      branchId: branchId, // Include branchId in the API call
      name: data.name,
      description: data.description,
      price: data.price, // API expects price as is (not in cents based on curl example)
      packagePicture: packagePicture,
      expiryDate: data.expiryDate ? convertLocalDateToUTC(data.expiryDate) : new Date().toISOString(),
      isActive: true,
      menuItems: selectedItems
        .filter(item => item.variants.some(variant => variant.quantity > 0))
        .map(item => ({
          menuItemId: item.menuItemId,
          variants: item.variants
            .filter(variant => variant.quantity > 0)
            .map(variant => ({
              variantId: variant.variantId,
              quantity: variant.quantity
            }))
        })),
      subMenuItems: selectedSubMenuItems
        .filter(item => item.quantity > 0)
        .map(item => ({
          subMenuItemId: item.subMenuItemId,
          quantity: item.quantity
        }))
    };

    createDealMutation.mutate(dealData);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Validate the image before processing
        const validation = await validateImage(file, 'deal');
        
        if (!validation.isValid) {
          toast({
            title: "Invalid Image",
            description: validation.error,
            variant: "destructive",
          });
          // Clear the input
          event.target.value = '';
          return;
        }

        setSelectedFile(file);
        
        // Convert file to base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64String = e.target?.result as string;
          // Remove the data:image/png;base64, prefix and keep only the base64 data
          const base64Data = base64String.split(',')[1];
          form.setValue("packagePicture", base64Data);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to validate image. Please try again.",
          variant: "destructive",
        });
        event.target.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6 bg-white rounded-lg max-h-[85vh] overflow-y-auto">
        <DialogTitle className="text-xl font-semibold text-gray-900 mb-6">
          {isEditMode ? 'Edit Deal' : 'Add Deal'}
        </DialogTitle>

        {isDealLoading && isEditMode && (
          <div className="text-center py-4">
            <div className="text-gray-600">Loading deal data...</div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Deal Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter deal name"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter deal description"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Select Items for Deal
              </Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-4 space-y-3">
                {menuItemsLoading ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Loading menu items...</p>
                  </div>
                ) : menuItems.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No menu items available</p>
                  </div>
                ) : (
                  menuItems.map((item) => {
                    const selectedItem = selectedItems.find(i => i.menuItemId === item.menuItemId);
                    const isSelected = !!selectedItem;
                    
                    return (
                      <div key={item.menuItemId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleItemToggle(item)}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-lg">{item.menuItemName}</p>
                            <p className="text-sm text-gray-500">ID: {item.menuItemId}</p>
                          </div>
                        </div>
                        
                        {isSelected && selectedItem && (
                          <div className="ml-6 space-y-2">
                            <p className="text-sm font-medium text-gray-700">Variants & Quantities:</p>
                            {selectedItem.variants.map((variant, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div className="flex-1">
                                  <p className="font-medium">{variant.name}</p>
                                  <p className="text-sm text-gray-600">₹{variant.price}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Label className="text-sm">Qty:</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={variant.quantity}
                                    onChange={(e) => handleVariantQuantityChange(
                                      item.menuItemId, 
                                      variant.variantId, 
                                      parseInt(e.target.value) || 0
                                    )}
                                    className="w-16 text-center"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Select Sub Menu Items for Deal
              </Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-4 space-y-3">
                {subMenuItemsLoading ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Loading sub menu items...</p>
                  </div>
                ) : subMenuItems.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No sub menu items available</p>
                  </div>
                ) : (
                  subMenuItems.map((item) => {
                    const selectedItem = selectedSubMenuItems.find(i => i.subMenuItemId === item.id);
                    const isSelected = !!selectedItem;
                    
                    return (
                      <div key={item.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSubMenuItemToggle(item)}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-lg">{item.name}</p>
                            <p className="text-sm text-gray-500">{formatPrice(item.price)} - ID: {item.id}</p>
                          </div>
                        </div>
                        
                        {isSelected && selectedItem && (
                          <div className="ml-6 space-y-2">
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-gray-600">{formatPrice(item.price)}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Label className="text-sm">Qty:</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={selectedItem.quantity}
                                  onChange={(e) => handleSubMenuItemQuantityChange(
                                    item.id, 
                                    parseInt(e.target.value) || 0
                                  )}
                                  className="w-16 text-center"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Deal Price ({getCurrencySymbol()})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value ? field.value.toString() : ""}
                        placeholder="0.00"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Expiry Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                        onChange={(e) => field.onChange(e.target.value || "")}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            <div>
              <Label className="text-sm font-medium text-gray-700">Deal Image</Label>
              <p className="text-xs text-gray-500 mt-1">
                Required: {getConstraintDescription('deal')}
              </p>
              <div className="flex mt-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="deal-image-upload"
                />
                <div className="flex w-full">
                  <Input
                    value={selectedFile ? selectedFile.name : "Choose File"}
                    readOnly
                    className="flex-1 bg-gray-50"
                    placeholder="Choose File"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('deal-image-upload')?.click()}
                    className="ml-2 bg-green-500 hover:bg-green-600 text-white px-4"
                  >
                    Browse
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={createDealMutation.isPending || (
                  selectedItems.length === 0 && selectedSubMenuItems.length === 0
                ) || (
                  !selectedItems.some(item => item.variants.some(v => v.quantity > 0)) &&
                  !selectedSubMenuItems.some(item => item.quantity > 0)
                )}
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-2 rounded-md"
              >
                {createDealMutation.isPending ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Deal" : "Create Deal")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}