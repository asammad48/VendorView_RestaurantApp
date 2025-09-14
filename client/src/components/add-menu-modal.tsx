import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRepository, subMenuItemApi } from "@/lib/apiRepository";
import { createApiQuery, createApiMutation, formatApiError } from "@/lib/errorHandling";
import { useBranchCurrency } from "@/hooks/useBranchCurrency";
import { validateImage, getConstraintDescription } from "@/lib/imageValidation";
import type { InsertMenuItem, MenuCategory, MenuItem } from "@/types/schema";

const addMenuSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.number().min(1, "Category is required"),
  description: z.string().optional(),
  preparationTime: z.number().min(1, "Preparation time must be at least 1 minute"),
  restaurantId: z.string().optional(),
});

type AddMenuFormData = z.infer<typeof addMenuSchema>;

interface SubMenuItem {
  id: number;
  name: string;
  price: number;
}

interface Customization {
  name: string;
  options: string[];
}

interface Variant {
  name: string;
  price: number;
  personServing: number;
  outOfStock: boolean;
}

interface AddMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId?: string;
  branchId?: number;
  editMenuItem?: MenuItem; // MenuItem type for edit mode
}

export default function AddMenuModal({ isOpen, onClose, restaurantId, branchId, editMenuItem }: AddMenuModalProps) {
  const isEditMode = !!editMenuItem;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatPrice, getCurrencySymbol } = useBranchCurrency(branchId);
  const [image, setImage] = useState<string>("");
  const [originalImage, setOriginalImage] = useState<string>(""); // Track original image for comparison
  const [customizations, setCustomizations] = useState<Customization[]>([{ name: "", options: [""] }]);
  const [variants, setVariants] = useState<Variant[]>([{ name: "", price: 0, personServing: 1, outOfStock: false }]);
  const [selectedModifiers, setSelectedModifiers] = useState<number[]>([]);
  
  // Section visibility states
  const [showCustomizations, setShowCustomizations] = useState<boolean>(true);
  const [showModifiers, setShowModifiers] = useState<boolean>(true);

  // Fetch categories for dropdown
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: [`menu-categories-branch-${branchId}`],
    queryFn: async () => {
      const response = await apiRepository.call<{
        items: MenuCategory[];
        pageNumber: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
        hasPrevious: boolean;
        hasNext: boolean;
      }>(
        'getMenuCategoriesByBranch',
        'GET',
        undefined,
        {
          PageNumber: '1',
          PageSize: '100',
          SortBy: 'name',
          IsAscending: 'true'
        },
        true,
        { branchId: branchId || 0 }
      );
      return response.data?.items || [];
    },
    enabled: !!branchId, // Only fetch when branchId is available
  });

  // Fetch SubMenuItems for modifiers
  const { data: subMenuItems, isLoading: subMenuItemsLoading, error: subMenuItemsError } = useQuery({
    queryKey: [`submenu-items-simple-branch-${branchId}`],
    queryFn: async () => {
      console.log(`🔍 Fetching SubMenuItems for branchId: ${branchId}`);
      
      if (!branchId || branchId === 0) {
        console.error("❌ Invalid branchId:", branchId);
        throw new Error("Invalid branch ID");
      }
      
      const response = await subMenuItemApi.getSimpleSubMenuItemsByBranch(branchId);
      console.log("📡 SubMenuItems API Response:", response);
      
      if (response.error) {
        console.error("❌ SubMenuItems API Error:", response.error);
        throw new Error(response.error);
      }
      
      const items = response.data as SubMenuItem[] || [];
      console.log(`✅ SubMenuItems fetched: ${items.length} items`, items);
      
      return items;
    },
    enabled: !!branchId, // Only fetch when branchId is available
    retry: 1
  });

  // Fetch menu item data for editing
  const { data: menuItemData, isLoading: isLoadingMenuItem } = useQuery({
    queryKey: [`menu-item-${editMenuItem?.id}`],
    queryFn: createApiQuery<MenuItem>(async () => {
      return await apiRepository.call<MenuItem>(
        'getMenuItemById',
        'GET',
        undefined,
        {},
        true,
        { id: editMenuItem!.id }
      );
    }),
    enabled: !!editMenuItem?.id && isEditMode, // Only fetch when editing and we have an ID
  });

  const form = useForm<AddMenuFormData>({
    resolver: zodResolver(addMenuSchema),
    defaultValues: {
      name: "",
      categoryId: 0,
      description: "",
      preparationTime: 15,
      restaurantId: restaurantId || "",
    },
  });

  // Effect to populate form when editing
  useEffect(() => {
    if (isEditMode && menuItemData) {
      // Populate form with API data
      form.reset({
        name: menuItemData.name || "",
        categoryId: menuItemData.menuCategoryId || 0,
        description: menuItemData.description || "",
        preparationTime: menuItemData.preparationTime || 15,
        restaurantId: restaurantId || "",
      });
      
      // Set image if available
      if (menuItemData.menuItemPicture) {
        setImage(menuItemData.menuItemPicture);
        setOriginalImage(menuItemData.menuItemPicture); // Store original for comparison
      }
      
      // Set variants (convert to local format)
      if (menuItemData.variants && menuItemData.variants.length > 0) {
        setVariants(menuItemData.variants.map(v => ({
          name: v.name,
          price: v.price,
          personServing: v.personServing || 1,
          outOfStock: v.outOfStock || false
        })));
      }
      
      // Handle existing modifiers - set selected modifiers for API-based ones
      if (menuItemData.modifiers && menuItemData.modifiers.length > 0) {
        const existingModifierIds = menuItemData.modifiers
          .map((m: any) => m.subMenuItemId || m.id)
          .filter(Boolean);
        setSelectedModifiers(existingModifierIds);
        setShowModifiers(true);
      } else {
        setSelectedModifiers([]);
        setShowModifiers(true);
      }
      
      // Set customizations (convert to local format)
      if (menuItemData.customizations && menuItemData.customizations.length > 0) {
        setCustomizations(menuItemData.customizations.map(c => ({
          name: c.name,
          options: c.options.map(o => o.name)
        })));
        setShowCustomizations(true);
      } else {
        setShowCustomizations(false); // Hide section if no customizations
      }
    }
  }, [isEditMode, menuItemData, form, restaurantId]);

  const createMenuItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRepository.call(
        'menuItemCreate',
        'POST',
        data
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`menu-items-branch-${branchId}`] });
      toast({ title: "Menu item added successfully" });
      onClose();
      form.reset();
      setCustomizations([{ name: "", options: [""] }]);
      setVariants([{ name: "", price: 0, personServing: 1, outOfStock: false }]);
      setSelectedModifiers([]);
      setImage("");
      setOriginalImage("");
      setShowCustomizations(true);
      setShowModifiers(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error adding menu item",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRepository.call(
        'updateMenuItem',
        'PUT',
        data,
        undefined,
        true,
        { id: editMenuItem!.id }
      );
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`menu-items-branch-${branchId}`] });
      queryClient.invalidateQueries({ queryKey: [`menu-item-${editMenuItem!.id}`] });
      toast({ title: "Menu item updated successfully" });
      onClose();
      form.reset();
      setCustomizations([{ name: "", options: [""] }]);
      setVariants([{ name: "", price: 0, personServing: 1, outOfStock: false }]);
      setSelectedModifiers([]);
      setImage("");
      setOriginalImage("");
      setShowCustomizations(true);
      setShowModifiers(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating menu item",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Validate the image before processing
        const validation = await validateImage(file, 'menuItem');
        
        if (!validation.isValid) {
          toast({
            title: "Invalid Image",
            description: validation.error,
            variant: "destructive",
          });
          // Clear the input
          e.target.value = '';
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          // Store as base64 for API submission
          setImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to validate image. Please try again.",
          variant: "destructive",
        });
        e.target.value = '';
      }
    }
  };

  const addCustomization = () => {
    setCustomizations([...customizations, { name: "", options: [""] }]);
  };

  const updateCustomization = (index: number, field: keyof Customization, value: string | string[]) => {
    const newCustomizations = [...customizations];
    newCustomizations[index] = { ...newCustomizations[index], [field]: value };
    setCustomizations(newCustomizations);
  };

  const addCustomizationOption = (custIndex: number) => {
    const newCustomizations = [...customizations];
    newCustomizations[custIndex].options.push("");
    setCustomizations(newCustomizations);
  };

  const updateCustomizationOption = (custIndex: number, optIndex: number, value: string) => {
    const newCustomizations = [...customizations];
    newCustomizations[custIndex].options[optIndex] = value;
    setCustomizations(newCustomizations);
  };

  const addVariant = () => {
    setVariants([...variants, { name: "", price: 0, personServing: 1, outOfStock: false }]);
  };

  const updateVariant = (index: number, field: keyof Variant, value: string | number | boolean) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  // Remove functions for each section

  const removeCustomization = (index: number) => {
    if (customizations.length > 1) {
      setCustomizations(customizations.filter((_, i) => i !== index));
    }
  };

  const removeCustomizationOption = (custIndex: number, optIndex: number) => {
    const newCustomizations = [...customizations];
    if (newCustomizations[custIndex].options.length > 1) {
      newCustomizations[custIndex].options = newCustomizations[custIndex].options.filter((_, i) => i !== optIndex);
      setCustomizations(newCustomizations);
    }
  };

  const removeVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  // Section removal functions
  const removeEntireCustomizationSection = () => {
    setShowCustomizations(false);
    setCustomizations([{ name: "", options: [""] }]); // Reset to default
  };

  // Functions to restore sections
  const addCustomizationSection = () => {
    setShowCustomizations(true);
  };

  const addModifierSection = () => {
    setShowModifiers(true);
  };

  const removeModifierSection = () => {
    setShowModifiers(false);
    setSelectedModifiers([]);
  };

  // Modifier toggle function
  const toggleModifier = (modifierId: number) => {
    setSelectedModifiers(prev => 
      prev.includes(modifierId) 
        ? prev.filter(id => id !== modifierId)
        : [...prev, modifierId]
    );
  };

  const onSubmit = (data: AddMenuFormData) => {
    // Determine if image has changed (for update mode)
    const imageChanged = isEditMode && image !== originalImage;
    const imageData = isEditMode ? (imageChanged ? image : "") : image || "";

    // Prepare API payload according to the real API structure
    const menuItemData = {
      menuCategoryId: data.categoryId,
      name: data.name,
      description: data.description || "",
      isActive: true, // Required field for update
      preparationTime: data.preparationTime,
      MenuItemPicture: imageData, // Use capital M as per API spec
      variants: variants
        .filter(variant => variant.name.trim())
        .map(variant => ({
          name: variant.name,
          price: variant.price,
          personServing: variant.personServing,
          outOfStock: variant.outOfStock
        })),
      modifiers: showModifiers && selectedModifiers.length > 0
        ? selectedModifiers.map(modifierId => ({
            subMenuItemId: modifierId
          }))
        : [],
      customizations: showCustomizations
        ? customizations
          .filter(cust => cust.name.trim() && cust.options.some(opt => opt.trim()))
          .map(cust => ({
            name: cust.name,
            options: cust.options
              .filter(opt => opt.trim())
              .map(opt => ({ name: opt }))
          }))
        : []
    };

    // Use appropriate mutation based on mode
    if (isEditMode) {
      updateMenuItemMutation.mutate(menuItemData);
    } else {
      // For create mode, use different field name for image and exclude update-specific fields
      const createData = {
        branchId: branchId, // Include branchId for creation
        menuCategoryId: data.categoryId,
        name: data.name,
        description: data.description || "",
        preparationTime: data.preparationTime,
        menuItemPicture: imageData, // lowercase for create
        variants: variants
          .filter(variant => variant.name.trim())
          .map(variant => ({
            name: variant.name,
            price: variant.price,
            personServing: variant.personServing,
            outOfStock: variant.outOfStock
          })),
        modifiers: showModifiers && selectedModifiers.length > 0
          ? selectedModifiers.map(modifierId => ({
              subMenuItemId: modifierId
            }))
          : [],
        customizations: showCustomizations
          ? customizations
            .filter(cust => cust.name.trim() && cust.options.some(opt => opt.trim()))
            .map(cust => ({
              name: cust.name,
              options: cust.options
                .filter(opt => opt.trim())
                .map(opt => ({ name: opt }))
            }))
          : []
      };
      createMenuItemMutation.mutate(createData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="modal-add-menu">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{isEditMode ? 'Edit Menu Item' : 'Add Menu'}</DialogTitle>
        </DialogHeader>

        {/* Loading state for edit mode */}
        {isEditMode && isLoadingMenuItem ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading menu item data...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Enter menu item name"
                data-testid="input-menu-name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                onValueChange={(value) => form.setValue("categoryId", parseInt(value))} 
                data-testid="select-category"
                disabled={categoriesLoading || (isEditMode && isLoadingMenuItem)}
                value={form.watch("categoryId")?.toString() || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category: MenuCategory) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.categoryId && (
                <p className="text-sm text-red-500">{form.formState.errors.categoryId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Enter description"
                rows={3}
                data-testid="textarea-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preparationTime">Preparation Time (minutes)</Label>
              <Input
                id="preparationTime"
                type="number"
                min="1"
                {...form.register("preparationTime", { 
                  valueAsNumber: true,
                  setValueAs: (value) => value === "" ? undefined : Number(value)
                })}
                placeholder="15"
                data-testid="input-preparation-time"
              />
              {form.formState.errors.preparationTime && (
                <p className="text-sm text-red-500">{form.formState.errors.preparationTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image Upload</Label>
              <p className="text-xs text-gray-500">
                Required: {getConstraintDescription('menuItem')}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  data-testid="input-image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex-1 p-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50"
                >
                  {image ? "Image selected" : "Choose File"}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("image-upload")?.click()}
                  data-testid="button-browse-image"
                >
                  Browse
                </Button>
              </div>
            </div>
          </div>

          {/* API-based Modifier Section */}
          {!showModifiers ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <span className="text-gray-500">API Modifier section removed</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addModifierSection}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  data-testid="button-restore-modifier-section"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add API Modifier Section
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Available Modifiers (SubMenuItems)</h3>
                  <p className="text-sm text-gray-600">Select modifiers to add to this menu item</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeModifierSection}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  data-testid="button-remove-modifier-section"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove Section
                </Button>
              </div>
              
              {subMenuItemsLoading ? (
                <div className="text-center py-4 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto mb-2"></div>
                  Loading available modifiers for branch {branchId}...
                </div>
              ) : subMenuItemsError ? (
                <div className="col-span-full text-center text-red-500 py-8">
                  <p className="text-lg font-medium mb-2">⚠️ Error Loading SubMenuItems</p>
                  <p className="text-sm mb-4">Failed to load modifiers for branch {branchId}.</p>
                  <p className="text-xs bg-red-50 p-2 rounded border text-left">
                    Error: {subMenuItemsError instanceof Error ? subMenuItemsError.message : 'Unknown error'}
                  </p>
                  <p className="text-sm mt-2 text-gray-600">Check the browser console for more details.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-lg p-4">
                  {!subMenuItems || subMenuItems.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-8">
                      <p className="text-lg font-medium mb-2">No SubMenuItems Available</p>
                      <p className="text-sm mb-2">No modifiers are available for branch {branchId}.</p>
                      <p className="text-sm text-blue-600">Create some SubMenuItems first to use as modifiers.</p>
                      <p className="text-xs mt-2 text-gray-500">Branch ID: {branchId}</p>
                    </div>
                  ) : (
                    subMenuItems?.map((item: SubMenuItem) => (
                      <div key={item.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          id={`modifier-${item.id}`}
                          checked={selectedModifiers.includes(item.id)}
                          onCheckedChange={() => toggleModifier(item.id)}
                          data-testid={`checkbox-modifier-${item.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <label 
                            htmlFor={`modifier-${item.id}`}
                            className="text-sm font-medium text-gray-900 cursor-pointer block truncate"
                          >
                            {item.name}
                          </label>
                          <p className="text-sm text-gray-500">{formatPrice(item.price)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {selectedModifiers.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Selected Modifiers ({selectedModifiers.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedModifiers.map((modifierId) => {
                      const modifier = subMenuItems?.find((item: SubMenuItem) => item.id === modifierId);
                      return modifier ? (
                        <span 
                          key={modifierId}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {modifier.name} ({formatPrice(modifier.price)})
                          <button
                            type="button"
                            onClick={() => toggleModifier(modifierId)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customization Section */}
          {!showCustomizations ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <span className="text-gray-500">Customization section removed</span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomizationSection}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  data-testid="button-restore-customization-section"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customization Section
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Customization</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeEntireCustomizationSection}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  data-testid="button-remove-customization-section"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove Section
                </Button>
              </div>
            {customizations.map((customization, custIndex) => (
              <div key={custIndex} className="space-y-3 p-4 border rounded-lg relative">
                {customizations.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeCustomization(custIndex)}
                    className="absolute top-2 right-2 text-red-600 border-red-600 hover:bg-red-50 h-8 w-8"
                    data-testid={`button-remove-customization-${custIndex}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <Label>Customization Name</Label>
                  <Input
                    placeholder="e.g., Size, Spice Level"
                    value={customization.name}
                    onChange={(e) => updateCustomization(custIndex, "name", e.target.value)}
                    data-testid={`input-customization-name-${custIndex}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Options</Label>
                  {customization.options.map((option, optIndex) => (
                    <div key={optIndex} className="flex gap-2">
                      <Input
                        placeholder="Option"
                        value={option}
                        onChange={(e) => updateCustomizationOption(custIndex, optIndex, e.target.value)}
                        data-testid={`input-customization-option-${custIndex}-${optIndex}`}
                      />
                      {customization.options.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeCustomizationOption(custIndex, optIndex)}
                          className="text-red-600 border-red-600 hover:bg-red-50 flex-shrink-0"
                          data-testid={`button-remove-customization-option-${custIndex}-${optIndex}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCustomizationOption(custIndex)}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                    data-testid={`button-add-customization-option-${custIndex}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Option
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addCustomization}
              className="text-green-600 border-green-600 hover:bg-green-50"
              data-testid="button-add-customization"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Customization
            </Button>
            </div>
          )}

          {/* Variants Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Variants</h3>
            {variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end p-4 border rounded-lg relative">
                {variants.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeVariant(index)}
                    className="absolute top-2 right-2 text-red-600 border-red-600 hover:bg-red-50 h-8 w-8"
                    data-testid={`button-remove-variant-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g., Small, Medium, Large"
                    value={variant.name}
                    onChange={(e) => updateVariant(index, "name", e.target.value)}
                    data-testid={`input-variant-name-${index}`}
                  />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    placeholder="Price"
                    value={variant.price === 0 ? "" : variant.price}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateVariant(index, "price", value === "" ? 0 : parseFloat(value) || 0);
                    }}
                    data-testid={`input-variant-price-${index}`}
                  />
                </div>
                <div>
                  <Label>Person Serving</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    min="0"
                    value={variant.personServing === 0 ? "" : variant.personServing}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateVariant(index, "personServing", value === "" ? 0 : parseInt(value) || 0);
                    }}
                    data-testid={`input-variant-person-serving-${index}`}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`variant-out-of-stock-${index}`}
                    checked={variant.outOfStock}
                    onChange={(e) => updateVariant(index, "outOfStock", e.target.checked)}
                    className="rounded"
                    data-testid={`checkbox-variant-out-of-stock-${index}`}
                  />
                  <Label htmlFor={`variant-out-of-stock-${index}`} className="text-sm">
                    Out of Stock
                  </Label>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addVariant}
              className="text-green-600 border-green-600 hover:bg-green-50"
              data-testid="button-add-variant"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Option
            </Button>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg"
              disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending || (isEditMode && isLoadingMenuItem)}
              data-testid="button-add-menu-item"
            >
              {(createMenuItemMutation.isPending || updateMenuItemMutation.isPending)
                ? (isEditMode ? "Updating..." : "Adding...") 
                : (isEditMode ? "Update Menu Item" : "Add")
              }
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}