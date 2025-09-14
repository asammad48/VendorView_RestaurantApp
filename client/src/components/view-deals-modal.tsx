import { useQuery } from "@tanstack/react-query";
import { Clock, Users, DollarSign, Package, Calendar, Check, X as XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { dealsApi } from "@/lib/apiRepository";
import { createApiQuery } from "@/lib/errorHandling";
import { useBranchCurrency } from "@/hooks/useBranchCurrency";
import { getFullImageUrl } from "@/lib/imageUtils";
import type { Deal } from "@/types/schema";

interface ViewDealsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId?: number;
  branchId: number;
}

export default function ViewDealsModal({ isOpen, onClose, dealId, branchId }: ViewDealsModalProps) {
  const { formatPrice, getCurrencySymbol } = useBranchCurrency(branchId);

  // Fetch deal details
  const { data: dealData, isLoading, error } = useQuery({
    queryKey: [`deal-${dealId}`],
    queryFn: async () => {
      return await dealsApi.getDealById(dealId!);
    },
    enabled: !!dealId && isOpen,
  });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            View Deal
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : dealData ? (
          <div className="space-y-6">
            {/* Header with Image */}
            <div className="flex flex-col sm:flex-row gap-4">
              {dealData.packagePicture && (
                <div className="flex-shrink-0">
                  <img
                    src={getFullImageUrl(dealData.packagePicture)}
                    alt={dealData.name}
                    className="w-full sm:w-32 h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{dealData.name}</h2>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={dealData.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {dealData.isActive ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XIcon className="w-3 h-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                  <Badge variant="outline" className="text-blue-700 border-blue-200">
                    {formatPrice(dealData.price || 0)}
                  </Badge>
                </div>
                <p className="text-gray-600">
                  {dealData.description || "No description available"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Deal Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Expiry Date</p>
                  <p className="text-sm text-gray-600">
                    {dealData.expiryDate ? new Date(dealData.expiryDate).toLocaleDateString() : 'No expiry date'}
                  </p>
                </div>
              </div>
              {dealData.disountName && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <Package className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Discount</p>
                    <p className="text-sm text-gray-600">{dealData.disountName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Menu Items */}
            {dealData.menuItems && dealData.menuItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-600" />
                    Menu Items
                  </h3>
                  <div className="space-y-4">
                    {dealData.menuItems.map((item, index) => (
                      <div key={index} className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            {item.menuItemName || `Menu Item ${item.menuItemId}`}
                          </h4>
                        </div>
                        {item.variants && item.variants.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Variants:</p>
                            {item.variants.map((variant, variantIndex) => (
                              <div key={variantIndex} className="flex items-center justify-between bg-white p-2 rounded">
                                <span className="text-sm text-gray-600">
                                  {variant.variantName || `Variant ${variant.variantId}`}
                                </span>
                                <Badge variant="outline" className="text-orange-700">
                                  Qty: {variant.quantity}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* SubMenu Items */}
            {dealData.subMenuItems && dealData.subMenuItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    SubMenu Items
                  </h3>
                  <div className="grid gap-2">
                    {dealData.subMenuItems.map((subItem, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="font-medium text-gray-900">
                          {subItem.subMenuItemName || `SubMenu Item ${subItem.subMenuItemId}`}
                        </span>
                        <Badge variant="outline" className="text-purple-700">
                          Qty: {subItem.quantity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No deal found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}