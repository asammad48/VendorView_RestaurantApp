import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, Minus, Printer, ShoppingCart, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { apiRepository } from "@/lib/apiRepository";
import type {
  CustomerMenuItem,
  CustomerDeal,
  CustomerSubMenuItem,
  CustomerSearchMenuResponse,
  BranchConfiguration,
  CreateOrderRequest,
  CreateOrderResponse,
  CreateOrderItem,
  CreateOrderPackage,
  CreateOrderItemModifier,
  CreateOrderItemCustomization,
  Branch,
  CreateOrderPickupDetails,
  CreateOrderDeliveryDetails,
  OrderType,
} from "@/types/schema";

interface LocationData {
  id: number;
  name: string;
}

interface OrderItemSelection {
  type: 'menuItem' | 'deal';
  item: CustomerMenuItem | CustomerDeal;
  quantity: number;
  selectedVariation?: number;
  selectedModifiers: CreateOrderItemModifier[];
  selectedCustomizations: CreateOrderItemCustomization[];
  price: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: number;
  onOrderCreated?: (order: CreateOrderResponse) => void;
}

export default function CreateOrderModal({
  isOpen,
  onClose,
  branchId,
  onOrderCreated,
}: CreateOrderModalProps) {
  const { toast } = useToast();
  const [orderItems, setOrderItems] = useState<OrderItemSelection[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [tipAmount, setTipAmount] = useState(0);
  const [selectedAllergens, setSelectedAllergens] = useState<number[]>([]);
  const [menuItemSearch, setMenuItemSearch] = useState("");
  const [dealSearch, setDealSearch] = useState("");
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);
  const [selectedItemToCustomize, setSelectedItemToCustomize] = useState<CustomerMenuItem | null>(null);
  const [orderType, setOrderType] = useState<number>(3); // Default to DineIn
  
  // Pickup details state
  const [pickupName, setPickupName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [pickupInstruction, setPickupInstruction] = useState("");
  const [pickupTime, setPickupTime] = useState<string>("");
  
  // Delivery details state
  const [deliveryFullName, setDeliveryFullName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryInstruction, setDeliveryInstruction] = useState("");
  const [deliveryTime, setDeliveryTime] = useState<string>("");
  const [showDeliveryForm, setShowDeliveryForm] = useState(true);
  const [showPickupForm, setShowPickupForm] = useState(true);

  // Auto-collapse forms when details are filled
  useEffect(() => {
    if (orderType === 1 && deliveryFullName && deliveryPhone && deliveryAddress) {
      setShowDeliveryForm(false);
    }
  }, [orderType, deliveryFullName, deliveryPhone, deliveryAddress]);

  useEffect(() => {
    if (orderType === 2 && pickupName && pickupPhone) {
      setShowPickupForm(false);
    }
  }, [orderType, pickupName, pickupPhone]);

  // Reset form visibility when order type changes
  useEffect(() => {
    if (orderType === 1) {
      setShowDeliveryForm(true);
      setShowPickupForm(false);
    } else if (orderType === 2) {
      setShowPickupForm(true);
      setShowDeliveryForm(false);
    } else {
      setShowDeliveryForm(false);
      setShowPickupForm(false);
    }
  }, [orderType]);

  // Fetch branch details
  const { data: branch } = useQuery({
    queryKey: ["branch", branchId],
    queryFn: async () => {
      const response = await apiRepository.call<Branch>(
        "getBranchById",
        "GET",
        undefined,
        {},
        true,
        { id: branchId }
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: isOpen,
  });

  // Fetch branch configuration
  const { data: branchConfig } = useQuery({
    queryKey: ["branchConfiguration", branchId],
    queryFn: async () => {
      const response = await apiRepository.call<BranchConfiguration>(
        "getBranchConfiguration",
        "GET",
        undefined,
        {},
        true,
        { id: branchId }
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: isOpen,
  });

  // Fetch locations/tables
  const { data: locations } = useQuery({
    queryKey: ["locations", branchId],
    queryFn: async () => {
      const response = await apiRepository.call<LocationData[]>(
        "getLocationsByBranch",
        "GET",
        undefined,
        {},
        true,
        { branchId }
      );
      if (response.error) throw new Error(response.error);
      return response.data || [];
    },
    enabled: isOpen,
  });

  // Fetch menu data
  const { data: menuData, isLoading: isLoadingMenu } = useQuery({
    queryKey: ["customerSearchMenu", branchId],
    queryFn: async () => {
      const response = await apiRepository.call<CustomerSearchMenuResponse>(
        "getCustomerSearchMenu",
        "GET",
        undefined,
        {},
        true,
        { branchId }
      );
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: isOpen && !!branchId,
  });

  // Fetch allergens
  const { data: allergens } = useQuery({
    queryKey: ["allergens"],
    queryFn: async () => {
      const response = await apiRepository.call<Array<{ id: number; name: string }>>(
        "getAllergens",
        "GET"
      );
      if (response.error) throw new Error(response.error);
      return response.data || [];
    },
    enabled: isOpen,
  });

  // Calculate discounted price
  const calculateDiscountedPrice = (originalPrice: number, discount: any) => {
    if (!discount) return originalPrice;
    const discountAmount = (originalPrice * discount.value) / 100;
    return originalPrice - discountAmount;
  };

  // Calculate item price with modifiers and customizations
  const calculateItemPrice = (
    item: CustomerMenuItem | CustomerDeal,
    type: 'menuItem' | 'deal',
    selectedVariation?: number,
    selectedModifiers: CreateOrderItemModifier[] = [],
    selectedCustomizations: CreateOrderItemCustomization[] = []
  ): number => {
    let basePrice = 0;

    if (type === 'menuItem') {
      const menuItem = item as CustomerMenuItem;
      const variation = menuItem.variations.find(v => v.id === selectedVariation) || menuItem.variations[0];
      basePrice = variation?.price || 0;

      // Add modifier prices
      selectedModifiers.forEach(mod => {
        const modifier = menuItem.modifiers.find(m => m.id === mod.modifierId);
        if (modifier) {
          basePrice += modifier.price * mod.quantity;
        }
      });

      // Add customization prices
      selectedCustomizations.forEach(cust => {
        const customization = menuItem.customizations.find(c => c.id === cust.customizationId);
        if (customization) {
          const option = customization.options.find(o => o.id === cust.optionId);
          if (option) {
            basePrice += option.price;
          }
        }
      });

      // Apply discount
      if (menuItem.discount) {
        basePrice = calculateDiscountedPrice(basePrice, menuItem.discount);
      }
    } else if (type === 'deal') {
      const deal = item as CustomerDeal;
      basePrice = deal.discount 
        ? calculateDiscountedPrice(deal.price, deal.discount)
        : deal.price;
    }

    return basePrice;
  };

  // Add menu item to order - opens customization modal
  const addMenuItem = (item: CustomerMenuItem) => {
    if (!item.variations || item.variations.length === 0) {
      toast({
        title: "No variations available",
        description: "This item doesn't have any variations to select.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedItemToCustomize(item);
    setCustomizeModalOpen(true);
  };

  // Add customized menu item to order
  const addCustomizedMenuItem = (
    item: CustomerMenuItem,
    selectedVariation: number,
    selectedModifiers: CreateOrderItemModifier[],
    selectedCustomizations: CreateOrderItemCustomization[]
  ) => {
    const newItem: OrderItemSelection = {
      type: 'menuItem',
      item,
      quantity: 1,
      selectedVariation,
      selectedModifiers,
      selectedCustomizations,
      price: calculateItemPrice(item, 'menuItem', selectedVariation, selectedModifiers, selectedCustomizations),
    };
    setOrderItems([...orderItems, newItem]);
    setCustomizeModalOpen(false);
    setSelectedItemToCustomize(null);
  };

  // Add deal to order
  const addDeal = (deal: CustomerDeal) => {
    const newItem: OrderItemSelection = {
      type: 'deal',
      item: deal,
      quantity: 1,
      selectedModifiers: [],
      selectedCustomizations: [],
      price: calculateItemPrice(deal, 'deal'),
    };
    setOrderItems([...orderItems, newItem]);
  };


  // Update item quantity
  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...orderItems];
    newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
    setOrderItems(newItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Calculate order totals
  const calculateTotals = () => {
    const subTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const config = branchConfig || {};
    const discountPercentage = config.discountPercentage || 0;
    const serviceChargePercentage = config.serviceChargePercentage || 0;
    const taxPercentage = config.taxPercentage || 0;
    const isDiscountOnTotal = config.isDiscountOnTotal !== false;

    let discountAmount = 0;
    let taxableAmount = subTotal;

    if (isDiscountOnTotal && discountPercentage > 0) {
      discountAmount = (subTotal * discountPercentage) / 100;
      taxableAmount = subTotal - discountAmount;
    }

    const taxAmount = (taxableAmount * taxPercentage) / 100;
    const serviceCharges = (taxableAmount * serviceChargePercentage) / 100;

    if (!isDiscountOnTotal && discountPercentage > 0) {
      discountAmount = (taxAmount * discountPercentage) / 100;
    }

    const totalAmount = taxableAmount + taxAmount + serviceCharges + tipAmount - (isDiscountOnTotal ? 0 : discountAmount);

    return {
      subTotal,
      discountAmount,
      taxAmount,
      serviceCharges,
      tipAmount,
      totalAmount,
    };
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      // Process menu items
      const menuItemsPayload = orderItems
        .filter(item => item.type === 'menuItem')
        .map(item => {
          const menuItem = item.item as CustomerMenuItem;
          return {
            menuItemId: menuItem.menuItemId,
            variantId: item.selectedVariation || menuItem.variations[0].id,
            quantity: item.quantity,
            modifiers: item.selectedModifiers,
            customizations: item.selectedCustomizations,
          };
        });

      // Process deals/packages
      const orderPackagesPayload = orderItems
        .filter(item => item.type === 'deal')
        .map(item => {
          const deal = item.item as CustomerDeal;
          return {
            menuPackageId: deal.dealId,
            quantity: item.quantity,
          };
        });

      // Build delivery details if order type is Delivery
      let deliveryDetails: CreateOrderDeliveryDetails | null = null;
      if (orderType === 1) {
        if (!deliveryFullName || !deliveryPhone || !deliveryAddress) {
          throw new Error("Please fill all required delivery details");
        }
        deliveryDetails = {
          fullName: deliveryFullName,
          phoneNumber: deliveryPhone,
          deliveryAddress: deliveryAddress,
          deliveryInstruction: deliveryInstruction,
          prefferedDeliveryTime: deliveryTime || "",
        };
      }

      // Build pickup details if order type is TakeAway
      let pickupDetails: CreateOrderPickupDetails | null = null;
      if (orderType === 2) {
        if (!pickupName || !pickupPhone) {
          throw new Error("Please fill all required pickup details");
        }
        pickupDetails = {
          name: pickupName,
          phoneNumber: pickupPhone,
          pickupInstruction: pickupInstruction,
          prefferedPickupTime: pickupTime || "",
        };
      }

      const request: CreateOrderRequest = {
        branchId,
        locationId: selectedLocation,
        deviceInfo: "POS-Web",
        tipAmount,
        username: localStorage.getItem("username") || "admin",
        orderType: orderType,
        specialInstruction: specialInstructions,
        orderItems: menuItemsPayload,
        orderPackages: orderPackagesPayload,
        deliveryDetails,
        pickupDetails,
        splitBills: null,
        allergenIds: selectedAllergens,
      };

      const response = await apiRepository.call<CreateOrderResponse>(
        "createOrder",
        "POST",
        request
      );

      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        toast({
          title: "Order Created",
          description: `Order ${data.orderNumber} created successfully!`,
        });
        
        // Invalidate orders cache to refresh the table
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["orders", branchId] });
        
        onOrderCreated?.(data);
        onClose();
        
        // Reset all form fields
        setOrderItems([]);
        setSpecialInstructions("");
        setTipAmount(0);
        setSelectedAllergens([]);
        setOrderType(3);
        setPickupName("");
        setPickupPhone("");
        setPickupInstruction("");
        setPickupTime("");
        setDeliveryFullName("");
        setDeliveryPhone("");
        setDeliveryAddress("");
        setDeliveryInstruction("");
        setDeliveryTime("");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const totals = calculateTotals();
  const currency = branch?.currency || menuData?.currency || "PKR";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-bold">Create Order</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Side - Menu Display */}
          <div className="flex-1 border-r overflow-hidden flex flex-col">
            <div className="px-6 pb-4 space-y-4">
              {/* Order Type Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Order Type</label>
                <Select value={orderType.toString()} onValueChange={(val) => setOrderType(parseInt(val))}>
                  <SelectTrigger data-testid="select-order-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Dine In</SelectItem>
                    <SelectItem value="2">Take Away</SelectItem>
                    <SelectItem value="1">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Selection (for Dine In) */}
              {orderType === 3 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Table/Location</label>
                  <Select value={selectedLocation?.toString()} onValueChange={(val) => setSelectedLocation(parseInt(val))}>
                    <SelectTrigger data-testid="select-location">
                      <SelectValue placeholder="Select Table/Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 px-6">
              {isLoadingMenu ? (
                <div className="text-center py-8">Loading menu...</div>
              ) : (
                <Tabs defaultValue="menu-items" className="w-full">
                  <TabsList className="w-full">
                    <TabsTrigger value="menu-items" data-testid="tab-menu-items">Menu Items</TabsTrigger>
                    <TabsTrigger value="deals" data-testid="tab-deals">Deals</TabsTrigger>
                  </TabsList>

                  <TabsContent value="menu-items" className="space-y-4 mt-4">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search menu items..."
                        value={menuItemSearch}
                        onChange={(e) => setMenuItemSearch(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-menu-items"
                      />
                    </div>
                    {menuData?.menuItems?.filter(item => 
                      item.name.toLowerCase().includes(menuItemSearch.toLowerCase()) ||
                      (item.description ?? '').toLowerCase().includes(menuItemSearch.toLowerCase())
                    ).map((item) => (
                      <Card key={item.menuItemId} data-testid={`menu-item-${item.menuItemId}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{item.name}</h3>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                              <Badge variant="outline" className="mt-2">{item.categoryName}</Badge>
                              {item.allergenItemContains && (
                                <p className="text-xs text-red-600 mt-1">
                                  Allergens: {item.allergenItemContains}
                                </p>
                              )}
                              <div className="mt-2">
                                {item.discount ? (
                                  <div className="flex items-center gap-2">
                                    <span className="line-through text-muted-foreground">
                                      {currency} {item.variations[0]?.price.toFixed(2)}
                                    </span>
                                    <span className="font-bold text-green-600">
                                      {currency} {calculateDiscountedPrice(item.variations[0]?.price, item.discount).toFixed(2)}
                                    </span>
                                    <Badge variant="destructive">{item.discount.value}% OFF</Badge>
                                  </div>
                                ) : (
                                  <span className="font-bold">
                                    {currency} {item.variations[0]?.price.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => addMenuItem(item)}
                              data-testid={`button-add-item-${item.menuItemId}`}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="deals" className="space-y-4 mt-4">
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search deals..."
                        value={dealSearch}
                        onChange={(e) => setDealSearch(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-deals"
                      />
                    </div>
                    {menuData?.deals?.filter(deal => 
                      deal.name.toLowerCase().includes(dealSearch.toLowerCase()) ||
                      (deal.description ?? '').toLowerCase().includes(dealSearch.toLowerCase())
                    ).map((deal) => (
                      <Card key={deal.dealId} data-testid={`deal-${deal.dealId}`}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{deal.name}</h3>
                              <p className="text-sm text-muted-foreground">{deal.description}</p>
                              <div className="mt-2">
                                {deal.discount ? (
                                  <div className="flex items-center gap-2">
                                    <span className="line-through text-muted-foreground">
                                      {currency} {deal.price.toFixed(2)}
                                    </span>
                                    <span className="font-bold text-green-600">
                                      {currency} {calculateDiscountedPrice(deal.price, deal.discount).toFixed(2)}
                                    </span>
                                    <Badge variant="destructive">{deal.discount.value}% OFF</Badge>
                                  </div>
                                ) : (
                                  <span className="font-bold">
                                    {currency} {deal.price.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              onClick={() => addDeal(deal)}
                              data-testid={`button-add-deal-${deal.dealId}`}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                </Tabs>
              )}
            </ScrollArea>
          </div>

          {/* Right Side - Order Summary */}
          <div className="w-[400px] flex flex-col bg-muted/30">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Order Summary
              </h3>
            </div>

            <ScrollArea className="flex-1 px-6 py-4">
              {/* Delivery Details Form/Summary */}
              {orderType === 1 && (
                <div className="mb-4">
                  {showDeliveryForm ? (
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <h3 className="font-semibold text-sm">Delivery Details</h3>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Full Name *</label>
                          <Input
                            placeholder="Customer full name"
                            value={deliveryFullName}
                            onChange={(e) => setDeliveryFullName(e.target.value)}
                            data-testid="input-delivery-fullname"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Phone Number *</label>
                          <Input
                            placeholder="Phone number"
                            value={deliveryPhone}
                            onChange={(e) => setDeliveryPhone(e.target.value)}
                            data-testid="input-delivery-phone"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Delivery Address *</label>
                          <Textarea
                            placeholder="Full delivery address"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="min-h-[60px]"
                            data-testid="input-delivery-address"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Delivery Instruction</label>
                          <Textarea
                            placeholder="Special instructions..."
                            value={deliveryInstruction}
                            onChange={(e) => setDeliveryInstruction(e.target.value)}
                            className="min-h-[60px]"
                            data-testid="input-delivery-instruction"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Preferred Delivery Time</label>
                          <Input
                            type="datetime-local"
                            value={deliveryTime}
                            onChange={(e) => setDeliveryTime(e.target.value)}
                            data-testid="input-delivery-time"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setShowDeliveryForm(true)}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-sm">Delivery To:</h4>
                            <p className="text-sm">{deliveryFullName}</p>
                            <p className="text-sm text-muted-foreground">{deliveryPhone}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{deliveryAddress}</p>
                          </div>
                          <Button variant="ghost" size="sm" data-testid="button-edit-delivery">
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Separator className="my-4" />
                </div>
              )}

              {/* Pickup Details Form/Summary */}
              {orderType === 2 && (
                <div className="mb-4">
                  {showPickupForm ? (
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <h3 className="font-semibold text-sm">Pickup Details</h3>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Name *</label>
                          <Input
                            placeholder="Customer name"
                            value={pickupName}
                            onChange={(e) => setPickupName(e.target.value)}
                            data-testid="input-pickup-name"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Phone Number *</label>
                          <Input
                            placeholder="Phone number"
                            value={pickupPhone}
                            onChange={(e) => setPickupPhone(e.target.value)}
                            data-testid="input-pickup-phone"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Pickup Instruction</label>
                          <Textarea
                            placeholder="Special instructions..."
                            value={pickupInstruction}
                            onChange={(e) => setPickupInstruction(e.target.value)}
                            className="min-h-[60px]"
                            data-testid="input-pickup-instruction"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Preferred Pickup Time</label>
                          <Input
                            type="datetime-local"
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            data-testid="input-pickup-time"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setShowPickupForm(true)}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-sm">Pickup By:</h4>
                            <p className="text-sm">{pickupName}</p>
                            <p className="text-sm text-muted-foreground">{pickupPhone}</p>
                          </div>
                          <Button variant="ghost" size="sm" data-testid="button-edit-pickup">
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Separator className="my-4" />
                </div>
              )}

              {orderItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No items added yet
                </div>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((orderItem, index) => {
                    const item = orderItem.item;
                    const itemName = orderItem.type === 'menuItem' 
                      ? (item as CustomerMenuItem).name
                      : (item as CustomerDeal).name;

                    return (
                      <Card key={index} data-testid={`order-item-${index}`}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{itemName}</p>
                              <p className="text-sm text-muted-foreground">
                                {currency} {orderItem.price.toFixed(2)} each
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              data-testid={`button-remove-item-${index}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(index, -1)}
                                data-testid={`button-decrease-${index}`}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center" data-testid={`quantity-${index}`}>
                                {orderItem.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(index, 1)}
                                data-testid={`button-increase-${index}`}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                            <span className="font-semibold" data-testid={`item-total-${index}`}>
                              {currency} {(orderItem.price * orderItem.quantity).toFixed(2)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <Separator className="my-4" />

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Special Instructions</label>
                  <Textarea
                    placeholder="Any special requests..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="mt-1"
                    data-testid="input-special-instructions"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Tip Amount ({currency})</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={tipAmount || ''}
                    onChange={(e) => setTipAmount(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                    data-testid="input-tip-amount"
                  />
                </div>

                {allergens && allergens.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Allergens</label>
                    <Select
                      value={selectedAllergens.join(',')}
                      onValueChange={(val) => setSelectedAllergens(val.split(',').map(Number).filter(Boolean))}
                    >
                      <SelectTrigger data-testid="select-allergens">
                        <SelectValue placeholder="Select allergens" />
                      </SelectTrigger>
                      <SelectContent>
                        {allergens.map((allergen) => (
                          <SelectItem key={allergen.id} value={allergen.id.toString()}>
                            {allergen.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="px-6 py-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span data-testid="text-subtotal">{currency} {totals.subTotal.toFixed(2)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span data-testid="text-discount">- {currency} {totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span data-testid="text-tax">{currency} {totals.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Service Charges:</span>
                <span data-testid="text-service-charges">{currency} {totals.serviceCharges.toFixed(2)}</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tip:</span>
                  <span data-testid="text-tip">{currency} {tipAmount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span data-testid="text-total">{currency} {totals.totalAmount.toFixed(2)}</span>
              </div>

              <Button
                className="w-full mt-4"
                onClick={() => createOrderMutation.mutate()}
                disabled={orderItems.length === 0 || createOrderMutation.isPending}
                data-testid="button-create-order"
              >
                {createOrderMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Customization Modal */}
      {selectedItemToCustomize && (
        <MenuItemCustomizationModal
          isOpen={customizeModalOpen}
          onClose={() => {
            setCustomizeModalOpen(false);
            setSelectedItemToCustomize(null);
          }}
          menuItem={selectedItemToCustomize}
          onAdd={addCustomizedMenuItem}
          currency={currency}
        />
      )}
    </Dialog>
  );
}

// Menu Item Customization Modal Component
interface MenuItemCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: CustomerMenuItem;
  onAdd: (
    item: CustomerMenuItem,
    selectedVariation: number,
    selectedModifiers: CreateOrderItemModifier[],
    selectedCustomizations: CreateOrderItemCustomization[]
  ) => void;
  currency: string;
}

function MenuItemCustomizationModal({
  isOpen,
  onClose,
  menuItem,
  onAdd,
  currency,
}: MenuItemCustomizationModalProps) {
  const [selectedVariation, setSelectedVariation] = useState<number>(menuItem.variations[0]?.id || 0);
  const [selectedModifiers, setSelectedModifiers] = useState<Map<number, number>>(new Map());
  const [selectedCustomizations, setSelectedCustomizations] = useState<Map<number, number>>(new Map());

  const handleModifierChange = (modifierId: number, quantity: number) => {
    const newMap = new Map(selectedModifiers);
    if (quantity > 0) {
      newMap.set(modifierId, quantity);
    } else {
      newMap.delete(modifierId);
    }
    setSelectedModifiers(newMap);
  };

  const handleCustomizationChange = (customizationId: number, optionId: number) => {
    const newMap = new Map(selectedCustomizations);
    newMap.set(customizationId, optionId);
    setSelectedCustomizations(newMap);
  };

  const handleAdd = () => {
    const modifiers: CreateOrderItemModifier[] = Array.from(selectedModifiers.entries()).map(([modifierId, quantity]) => ({
      modifierId,
      quantity,
    }));

    const customizations: CreateOrderItemCustomization[] = Array.from(selectedCustomizations.entries()).map(([customizationId, optionId]) => ({
      customizationId,
      optionId,
    }));

    onAdd(menuItem, selectedVariation, modifiers, customizations);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize {menuItem.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Variation Selection */}
          {menuItem.variations && menuItem.variations.length > 1 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Select Variation</label>
              <Select 
                value={selectedVariation.toString()} 
                onValueChange={(val) => setSelectedVariation(parseInt(val))}
              >
                <SelectTrigger data-testid="select-variation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {menuItem.variations.map((variation) => (
                    <SelectItem key={variation.id} value={variation.id.toString()}>
                      {variation.name} - {currency} {variation.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Modifiers */}
          {menuItem.modifiers && menuItem.modifiers.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Modifiers</label>
              <div className="space-y-3">
                {menuItem.modifiers.map((modifier) => (
                  <Card key={modifier.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{modifier.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {currency} {modifier.price.toFixed(2)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleModifierChange(modifier.id, (selectedModifiers.get(modifier.id) || 0) - 1)}
                            disabled={!selectedModifiers.has(modifier.id) || selectedModifiers.get(modifier.id) === 0}
                            data-testid={`button-decrease-modifier-${modifier.id}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center" data-testid={`modifier-quantity-${modifier.id}`}>
                            {selectedModifiers.get(modifier.id) || 0}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleModifierChange(modifier.id, (selectedModifiers.get(modifier.id) || 0) + 1)}
                            data-testid={`button-increase-modifier-${modifier.id}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Customizations */}
          {menuItem.customizations && menuItem.customizations.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Customizations</label>
              <div className="space-y-4">
                {menuItem.customizations.map((customization) => (
                  <div key={customization.id}>
                    <p className="font-medium mb-2">{customization.name}</p>
                    <Select
                      value={selectedCustomizations.get(customization.id)?.toString() || ''}
                      onValueChange={(val) => handleCustomizationChange(customization.id, parseInt(val))}
                    >
                      <SelectTrigger data-testid={`select-customization-${customization.id}`}>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {customization.options.map((option) => (
                          <SelectItem key={option.id} value={option.id.toString()}>
                            {option.name} {option.price > 0 && `(+${currency} ${option.price.toFixed(2)})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-testid="button-cancel-customize"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleAdd}
              data-testid="button-confirm-add"
            >
              Add to Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
