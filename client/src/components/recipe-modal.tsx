import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChefHat, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { inventoryApi } from "@/lib/apiRepository";
import { RecipeDetail } from "@/types/schema";

const recipeSchema = z.object({
  recipeType: z.enum(["menuItem", "subMenuItem"]),
  menuItemId: z.coerce.number().optional(),
  variantId: z.coerce.number().optional(),
  subMenuItemId: z.coerce.number().optional(),
  items: z.array(z.object({
    id: z.number().optional(),
    inventoryItemId: z.coerce.number().min(1, "Item is required"),
    quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
    unit: z.string().min(1, "Unit is required"),
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!recipe;

  // Fetch menu items search data
  const { data: menuData } = useQuery<any>({
    queryKey: ["menu-items-search", branchId],
    queryFn: async () => await inventoryApi.getMenuItemsSearch(branchId),
    enabled: !!branchId && open,
  });

  // Fetch inventory items
  const { data: inventoryItems = [] } = useQuery<any[]>({
    queryKey: ["inventory-items", branchId],
    queryFn: async () => (await inventoryApi.getInventoryItemsByBranch(branchId)) as any[],
    enabled: !!branchId && open,
  });

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      recipeType: "menuItem",
      menuItemId: 0,
      variantId: 0,
      subMenuItemId: 0,
      items: [{ inventoryItemId: 0, quantity: 1, unit: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const recipeType = form.watch("recipeType");
  const selectedMenuItemId = form.watch("menuItemId");

  // Get variants for selected menu item
  const selectedMenuItemVariants = menuData?.variants?.filter(
    (v: any) => v.menuItemId === selectedMenuItemId
  ) || [];

  // Reset variant when menu item changes
  useEffect(() => {
    if (recipeType === "menuItem") {
      form.setValue("variantId", 0);
    }
  }, [selectedMenuItemId, recipeType, form]);

  // Load recipe data for editing
  useEffect(() => {
    if (open && recipe) {
      form.reset({
        recipeType: recipe.subMenuItemId ? "subMenuItem" : "menuItem",
        menuItemId: recipe.menuItemId || 0,
        variantId: recipe.variantId || 0,
        subMenuItemId: recipe.subMenuItemId || 0,
        items: recipe.items?.map((item: any) => ({
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

      onSuccess();
      onClose();
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save recipe",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                          {menuData?.menuItems?.map((item: any) => (
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
                          {selectedMenuItemVariants.map((variant: any) => (
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
                        {menuData?.subMenuItems?.map((item: any) => (
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
                  onClick={() => append({ inventoryItemId: 0, quantity: 1, unit: "" })}
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
                <div className="w-32">
                  <p className="text-sm font-medium text-gray-700">Unit</p>
                </div>
                <div className="w-10"></div>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <FormField
                    control={form.control}
                    name={`items.${index}.inventoryItemId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid={`select-inventory-item-${index}`}>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {inventoryItems.map((item: any) => (
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
                            step="0.01"
                            placeholder="Quantity"
                            {...field}
                            data-testid={`input-quantity-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.unit`}
                    render={({ field }) => (
                      <FormItem className="w-32">
                        <FormControl>
                          <Input
                            placeholder="Unit"
                            {...field}
                            data-testid={`input-unit-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
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
      </DialogContent>
    </Dialog>
  );
}
