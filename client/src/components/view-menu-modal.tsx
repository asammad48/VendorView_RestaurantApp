import { useQuery } from "@tanstack/react-query";
import { X, Clock, Users, DollarSign, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRepository } from "@/lib/apiRepository";
import { createApiQuery } from "@/lib/errorHandling";
import { useBranchCurrency } from "@/hooks/useBranchCurrency";
import { getFullImageUrl } from "@/lib/imageUtils";
import type { MenuItem, MenuCategory } from "@/types/schema";

interface ViewMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItemId?: number;
  branchId?: number;
}

export default function ViewMenuModal({ isOpen, onClose, menuItemId, branchId }: ViewMenuModalProps) {
  const { formatPrice, getCurrencySymbol } = useBranchCurrency(branchId);
  
  // Fetch menu item details
  const { data: menuItemData, isLoading } = useQuery({
    queryKey: [`menu-item-${menuItemId}`],
    queryFn: async () => {
      const result = await apiRepository.call<MenuItem>(
        'getMenuItemById',
        'GET',
        undefined,
        {},
        true,
        { id: menuItemId! }
      );
      // Return the actual data from the API response
      return result?.data || result;
    },
    enabled: !!menuItemId && isOpen,
  });

  // Fetch categories for category name
  const { data: categories } = useQuery({
    queryKey: [`menu-categories-branch-${branchId}`],
    queryFn: async () => {
      const response = await apiRepository.call<{
        items: MenuCategory[];
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
    enabled: !!branchId && isOpen,
  });

  // Fetch SubMenu items for modifier details
  const { data: subMenuItems = [] } = useQuery({
    queryKey: ['sub-menu-items-simple', branchId, isOpen],
    queryFn: async () => {
      if (!branchId) return [];
      const response = await apiRepository.call(
        'getSubMenusSimpleByBranch',
        'GET',
        undefined,
        {},
        true,
        { branchId }
      );
      return response?.data || [];
    },
    enabled: !!branchId && isOpen,
  });

  if (!isOpen) return null;

  const categoryName = categories?.find(cat => cat.id === menuItemData?.menuCategoryId)?.name || 'Unknown Category';
  
  // Create a lookup map for SubMenu items
  const subMenuItemsLookup = new Map();
  subMenuItems?.forEach((item: any) => {
    subMenuItemsLookup.set(item.id, item);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            View Menu Item
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : menuItemData ? (
          <div className="space-y-6">
            {/* Header with Image */}
            <div className="flex flex-col sm:flex-row gap-4">
              {menuItemData.menuItemPicture && (
                <div className="flex-shrink-0">
                  <img
                    src={getFullImageUrl(menuItemData.menuItemPicture)}
                    alt={menuItemData.name}
                    className="w-full sm:w-32 h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{menuItemData.name}</h2>
                <Badge className="bg-green-100 text-green-800 mb-2">
                  {categoryName}
                </Badge>
                <p className="text-gray-600">
                  {menuItemData.description || "No description available"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Preparation Time</p>
                  <p className="text-sm text-gray-900">{menuItemData.preparationTime || 15} minutes</p>
                </div>
              </div>
              {menuItemData.disountName && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Package className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Discount</p>
                    <p className="text-sm text-gray-900">{menuItemData.disountName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Variants */}
            {menuItemData.variants && menuItemData.variants.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Variants & Pricing
                  </h3>
                  <div className="grid gap-3">
                    {menuItemData.variants.map((variant, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{variant.name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="w-3 h-3" />
                              <span>Serves {variant.personServing || 1}</span>
                              {variant.outOfStock && (
                                <Badge variant="destructive" className="text-xs">
                                  Out of Stock
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatPrice(variant.price || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Modifiers */}
            {menuItemData?.modifiers && Array.isArray(menuItemData.modifiers) && menuItemData.modifiers.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Modifiers
                  </h3>
                  <div className="grid gap-2">
                    {menuItemData.modifiers.map((modifier: any, index: number) => {
                      const subMenuItem = subMenuItemsLookup.get(modifier.subMenuItemId);
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <span className="font-medium text-gray-900">
                            {subMenuItem?.name || `SubMenu Item ${modifier.subMenuItemId}`}
                          </span>
                          <span className="text-purple-700 font-semibold">
                            {formatPrice(subMenuItem?.price || 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Customizations */}
            {menuItemData.customizations && menuItemData.customizations.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Customizations</h3>
                  <div className="space-y-3">
                    {menuItemData.customizations.map((customization, index) => (
                      <div key={index} className="p-3 bg-amber-50 rounded-lg">
                        <p className="font-medium text-gray-900 mb-2">{customization.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {customization.options.map((option, optionIndex) => (
                            <Badge key={optionIndex} variant="outline" className="border-amber-200 text-amber-800">
                              {option.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Menu item not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}