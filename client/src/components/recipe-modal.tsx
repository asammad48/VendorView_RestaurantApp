import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChefHat, Plus, Trash2, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { inventoryApi } from "@/lib/apiRepository";
import { RecipeDetail, MenuItemSearchData, InventoryItemSimple, MenuItemSearchVariant } from "@/types/schema";

const recipeSchema = z.object({
  recipeType: z.enum(["menuItem", "subMenuItem"]),
  menuItemId: z.coerce.number().optional(),
  variantId: z.coerce.number().optional(),
  subMenuItemId: z.coerce.number().optional(),
  items: z.array(z.object({
    id: z.number().optional(),
    inventoryItemId: z.coerce.number().min(1, "Item is required"),
    quantity: z.coerce.number().min(0.001, "Quantity must be greater than 0").multipleOf(0.001, "Quantity can have up to 3 decimal places"),
    unit: z.string().optional(),
  })).min(1, "At least one ingredient is required"),
}).refine((data) => {
  if (data.recipeType === "menuItem") {
    return data.menuItemId && data.menuItemId > 0 && data.variantId && data.variantId > 0;
  } else {
    return data.subMenuItemId && data.subMenuItemId > 0;
  }
}, {
  message: "Please select all required fields",
  path: ["recipeType"],
});

type RecipeFormData = z.infer<typeof recipeSchema>;

interface RecipeModalProps {
  open: boolean;
  onClose: () => void;
  branchId: number;
  recipe?: RecipeDetail;
  onSuccess: () => void;
}

export default function RecipeModal({ 
  open, 
  onClose, 
  branchId,
  recipe,
  onSuccess 
}: RecipeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState<number | null>(null);
  const [numberOfOrders, setNumberOfOrders] = useState<string>("");
  const isEdit = !!recipe;

  const { data: menuData } = useQuery({
    queryKey: ["menu-items-search", branchId],
    queryFn: async () => await inventoryApi.getMenuItemsSearch(branchId),
    enabled: !!branchId && open,
  });

  const { data: inventoryItemsData } = useQuery({
    queryKey: ["inventory-items-simple", branchId],
    queryFn: async () => await inventoryApi.getInventoryItemsSimpleByBranch(branchId),
    enabled: !!branchId && open,
  });

  const inventoryItems: InventoryItemSimple[] = Array.isArray(inventoryItemsData) 
    ? inventoryItemsData 
    : [];

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      recipeType: "menuItem",
      menuItemId: 0,
      variantId: 0,
      subMenuItemId: 0,
      items: [{ inventoryItemId: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const recipeType = form.watch("recipeType");
  const selectedMenuItemId = form.watch("menuItemId");
  const selectedVariantId = form.watch("variantId");
  const selectedSubMenuItemId = form.watch("subMenuItemId");

  const selectedMenuItemVariants: MenuItemSearchVariant[] = (menuData as MenuItemSearchData)?.variants?.filter(
    (v: MenuItemSearchVariant) => v.menuItemId === selectedMenuItemId
  ) || [];

  useEffect(() => {
    if (recipeType === "menuItem") {
      form.setValue("variantId", 0);
    }
  }, [selectedMenuItemId, recipeType, form]);

  useEffect(() => {
    if (fields.length === 1) {
      setSelectedIngredientIndex(0);
    }
  }, [fields.length]);

  useEffect(() => {
    if (open && recipe) {
      form.reset({
        recipeType: recipe.subMenuItemId ? "subMenuItem" : "menuItem",
        menuItemId: recipe.menuItemId || 0,
        variantId: recipe.variantId || 0,
        subMenuItemId: recipe.subMenuItemId || 0,
        items: recipe.items?.map((item) => ({
          id: item.id,
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          unit: item.unit,
        })) || [{ inventoryItemId: 0, quantity: 1, unit: "" }],
      });
    } else if (open && !recipe) {
      form.reset({
        recipeType: "menuItem",
        menuItemId: 0,
        variantId: 0,
        subMenuItemId: 0,
        items: [{ inventoryItemId: 0, quantity: 1, unit: "" }],
      });
    }
  }, [recipe, open, form]);

  const handleNumberOfOrdersChange = (value: string) => {
    setNumberOfOrders(value);
    
    if (selectedIngredientIndex !== null && value && parseFloat(value) > 0) {
      const orders = parseFloat(value);
      const calculatedQuantity = 1 / orders;
      form.setValue(`items.${selectedIngredientIndex}.quantity`, parseFloat(calculatedQuantity.toFixed(3)));
    }
  };

  const isCalculatorDisabled = () => {
    const hasMenuSelection = recipeType === "menuItem" 
      ? (selectedMenuItemId ?? 0) > 0 && (selectedVariantId ?? 0) > 0
      : (selectedSubMenuItemId ?? 0) > 0;
    
    const hasInventorySelection = selectedIngredientIndex !== null && 
      form.watch(`items.${selectedIngredientIndex}.inventoryItemId`) > 0;
    
    return !hasMenuSelection || !hasInventorySelection;
  };

  const getSelectedInventoryItemDetails = () => {
    if (selectedIngredientIndex === null) return null;
    
    const inventoryItemId = form.watch(`items.${selectedIngredientIndex}.inventoryItemId`);
    const selectedItem = inventoryItems.find((item) => item.id === inventoryItemId);
    
    return selectedItem;
  };

  const getMenuItemName = () => {
    if (recipeType === "menuItem") {
      const menuItem = (menuData as MenuItemSearchData)?.menuItems?.find((item: any) => item.id === selectedMenuItemId);
      const variant = selectedMenuItemVariants.find((v) => v.id === selectedVariantId);
      return menuItem && variant ? `${menuItem.name} - ${variant.name}` : "";
    } else {
      const subMenuItem = (menuData as MenuItemSearchData)?.subMenuItems?.find((item: any) => item.id === selectedSubMenuItemId);
      return subMenuItem?.name || "";
    }
  };

  const onSubmit = async (data: RecipeFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        menuItemId: data.recipeType === "menuItem" ? data.menuItemId : undefined,
        variantId: data.recipeType === "menuItem" ? data.variantId : undefined,
        subMenuItemId: data.recipeType === "subMenuItem" ? data.subMenuItemId : undefined,
        branchId: branchId,
        items: data.items.map((item) => ({
          id: item.id,
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      };

      if (isEdit) {
        await inventoryApi.updateRecipe(recipe.id, payload);
        toast({
          title: "Success",
          description: "Recipe updated successfully",
        });
      } else {
        await inventoryApi.createRecipe(payload);
        toast({
          title: "Success",
          description: "Recipe created successfully",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["recipes", branchId] });
      onSuccess();
      onClose();
      form.reset();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save recipe";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedItemDetails = getSelectedInventoryItemDetails();
  const menuItemName = getMenuItemName();

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100">
              <ChefHat className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {isEdit ? "Edit Recipe" : "Create Recipe"}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Define ingredients and quantities for menu items
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div className="border-r pr-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="recipeType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipe Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                          disabled={isEdit}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="menuItem" id="menuItem" data-testid="radio-menu-item" />
                            <Label htmlFor="menuItem">Menu Item with Variant</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="subMenuItem" id="subMenuItem" data-testid="radio-sub-menu-item" />
                            <Label htmlFor="subMenuItem">Sub Menu Item (Modifier)</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {recipeType === "menuItem" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="menuItemId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Menu Item</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                            disabled={isEdit}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-menu-item">
                                <SelectValue placeholder="Select menu item" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(menuData as MenuItemSearchData)?.menuItems?.map((item: any) => (
                                <SelectItem key={item.id} value={item.id.toString()}>
                                  {item.name}
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
                      name="variantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Variant</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString()}
                            disabled={isEdit || !selectedMenuItemId || selectedMenuItemVariants.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-variant">
                                <SelectValue placeholder="Select variant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {selectedMenuItemVariants.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id.toString()}>
                                  {variant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="subMenuItemId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub Menu Item</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                          disabled={isEdit}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-sub-menu-item">
                              <SelectValue placeholder="Select sub menu item" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(menuData as MenuItemSearchData)?.subMenuItems?.map((item: any) => (
                              <SelectItem key={item.id} value={item.id.toString()}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-3">
                    <FormLabel>Ingredients</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        append({ inventoryItemId: 0, quantity: 1 });
                        setSelectedIngredientIndex(fields.length);
                        setNumberOfOrders("");
                      }}
                      data-testid="button-add-ingredient"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Ingredient
                    </Button>
                  </div>

                  <div className="flex gap-2 items-center mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Inventory Item</p>
                    </div>
                    <div className="w-32">
                      <p className="text-sm font-medium text-gray-700">Quantity</p>
                    </div>
                    <div className="w-16">
                      <p className="text-sm font-medium text-gray-700">Unit</p>
                    </div>
                    <div className="w-10"></div>
                  </div>

                  {fields.map((field, index) => (
                    <div 
                      key={field.id} 
                      className={`flex gap-2 items-start p-2 rounded ${selectedIngredientIndex === index ? 'bg-blue-50 border border-blue-200' : ''}`}
                      onClick={() => setSelectedIngredientIndex(index)}
                    >
                      <FormField
                        control={form.control}
                        name={`items.${index}.inventoryItemId`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select
                              onValueChange={(value) => {
                                const selectedItem = inventoryItems.find((item) => item.id === parseInt(value));
                                field.onChange(parseInt(value));
                                if (selectedItem) {
                                  form.setValue(`items.${index}.unit`, selectedItem.unit, { shouldDirty: true });
                                }
                              }}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger data-testid={`select-inventory-item-${index}`}>
                                  <SelectValue placeholder="Select item" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {inventoryItems.map((item) => (
                                  <SelectItem key={item.id} value={item.id.toString()}>
                                    {item.name} ({item.unit})
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
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.001"
                                placeholder="Quantity"
                                {...field}
                                data-testid={`input-quantity-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="w-16 flex items-center">
                        <p className="text-sm text-gray-700 font-medium">
                          {form.watch(`items.${index}.unit`) || "-"}
                        </p>
                      </div>

                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (selectedIngredientIndex === index) {
                              setSelectedIngredientIndex(null);
                              setNumberOfOrders("");
                            }
                            remove(index);
                          }}
                          data-testid={`button-remove-ingredient-${index}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
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
                    className="bg-purple-500 hover:bg-purple-600"
                    disabled={isSubmitting}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update Recipe" : "Create Recipe")}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <div className="pl-6">
            <div className={`space-y-4 ${isCalculatorDisabled() ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                  <Calculator className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">Recipe Calculator</h3>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed">
                  This is a basic calculator to do Inventory management which will be used for calculation of Recipe by{" "}
                  <span className="font-semibold text-blue-700">{menuItemName || "[Item Name]"}</span>. 
                  How will you apply that this{" "}
                  <span className="font-semibold text-green-700">{selectedItemDetails?.name || "[Inventory Item Name]"}</span>{" "}
                  with{" "}
                  <span className="font-semibold text-purple-700">{selectedItemDetails?.unit || "[Unit]"}</span>{" "}
                  is placed in one Order consumption with Quantity 1.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numberOfOrders" className="text-sm font-medium">
                  Number of Orders to Consume
                </Label>
                <Input
                  id="numberOfOrders"
                  type="number"
                  step="0.001"
                  placeholder="Enter number of orders"
                  value={numberOfOrders}
                  onChange={(e) => handleNumberOfOrdersChange(e.target.value)}
                  disabled={isCalculatorDisabled()}
                  data-testid="input-number-of-orders"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Enter the number of orders it takes to consume this inventory item
                </p>
              </div>

              {selectedIngredientIndex !== null && numberOfOrders && parseFloat(numberOfOrders) > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">Calculated Quantity:</p>
                  <p className="text-2xl font-bold text-green-700">
                    {form.watch(`items.${selectedIngredientIndex}.quantity`).toFixed(3)}{" "}
                    <span className="text-base">{selectedItemDetails?.unit}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    1 ÷ {numberOfOrders} = {(1 / parseFloat(numberOfOrders)).toFixed(3)}
                  </p>
                </div>
              )}

              {isCalculatorDisabled() && (
                <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-600 text-center">
                    Please select a Menu Item/Sub Menu Item and an Inventory Item to use the calculator
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
