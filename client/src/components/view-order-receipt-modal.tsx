import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer } from "lucide-react";
import { useBranchCurrency } from "@/hooks/useBranchCurrency";
import { formatCurrency } from "@/lib/currencyUtils";
import { DetailedOrder } from "@/types/schema";

interface ViewOrderReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: (DetailedOrder & { paymentStatus: string; orderStatus: string }) | null;
  getStatusBadge: (status: string) => React.ReactNode;
  getPaymentBadge: (status: string) => React.ReactNode;
  getOrderStatus: (order: DetailedOrder) => string;
  getPaymentStatus: (order: DetailedOrder) => string;
  formatOrderDate: (date: string) => string;
  formatOrderTime: (date: string) => string;
}

export function ViewOrderReceiptModal({
  open,
  onOpenChange,
  order,
  getStatusBadge,
  getPaymentBadge,
  getOrderStatus,
  getPaymentStatus,
  formatOrderDate,
  formatOrderTime,
}: ViewOrderReceiptModalProps) {
  const { formatPrice: formatBranchPrice } = useBranchCurrency();

  if (!order) return null;

  // Use order currency if available, otherwise fall back to branch currency
  const currency = order.currency || 'USD';
  const formatPrice = (amount: number) => formatCurrency(amount, currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0" data-testid="view-order-modal">
        {/* BEGIN View Order Receipt */}
        <div className="receipt-content p-6 bg-white" id="receipt-content">
          {/* Receipt Header */}
          <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900 mb-1">ORDER RECEIPT</h1>
            <p className="text-sm text-gray-600">{order.branchName || 'Restaurant'}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatOrderDate(order.createdAt)} • {formatOrderTime(order.createdAt)}
            </p>
          </div>

          {/* Order Info */}
          <div className="mb-4 text-center">
            <p className="text-lg font-bold text-gray-900" data-testid="view-order-number">
              Order #{order.orderNumber}
            </p>
            {order.username && (
              <p className="text-sm text-gray-600 mt-1" data-testid="view-order-customer">
                Customer: {order.username}
              </p>
            )}
            {order.orderType && (
              <p className="text-sm text-gray-600" data-testid="view-order-type">
                Type: {order.orderType}
              </p>
            )}
          </div>

          {/* Status and Payment */}
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <div data-testid="view-order-status">{getStatusBadge(getOrderStatus(order))}</div>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-500 mb-1">Payment</p>
              <div data-testid="view-order-payment">{getPaymentBadge(getPaymentStatus(order))}</div>
            </div>
          </div>

          {/* Items Header */}
          <div className="border-b border-gray-300 pb-2 mb-3">
            <div className="grid grid-cols-12 gap-1 text-xs font-semibold text-gray-700 uppercase">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>
          </div>

          {/* Order Items */}
          {order.orderItems && order.orderItems.length > 0 && (
            <div className="space-y-2 mb-4">
              {order.orderItems.map((item, index) => (
                <div key={index}>
                  <div 
                    className="grid grid-cols-12 gap-1 text-sm py-1"
                    data-testid={`view-order-item-${index}`}
                  >
                    <div className="col-span-6">
                      <p className="font-medium text-gray-900 leading-tight">{item.itemName || 'Menu Item'}</p>
                      {item.variantName && (
                        <p className="text-xs text-gray-500">{item.variantName}</p>
                      )}
                    </div>
                    <div className="col-span-2 text-center text-gray-700">{item.quantity}</div>
                    <div className="col-span-2 text-right text-gray-700">
                      {formatPrice(item.unitPrice || 0)}
                    </div>
                    <div className="col-span-2 text-right font-semibold text-gray-900">
                      {formatPrice(item.totalPrice)}
                    </div>
                  </div>
                  
                  {/* Display modifiers if present */}
                  {item.orderItemModifiers && item.orderItemModifiers.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.orderItemModifiers.map((modifier, modIndex) => (
                        <div 
                          key={modIndex} 
                          className="grid grid-cols-12 gap-1 text-xs text-gray-600"
                          data-testid={`view-order-item-${index}-modifier-${modIndex}`}
                        >
                          <div className="col-span-6 flex items-center">
                            <span className="mr-1">+</span>
                            <span>{modifier.modifierName}</span>
                            {modifier.quantity > 1 && (
                              <span className="ml-1 text-gray-500">(x{modifier.quantity})</span>
                            )}
                          </div>
                          <div className="col-span-2"></div>
                          <div className="col-span-2"></div>
                          <div className="col-span-2 text-right">
                            {formatPrice(modifier.price * modifier.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Display customizations if present */}
                  {item.orderItemCustomizations && item.orderItemCustomizations.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.orderItemCustomizations.map((custom, customIndex) => (
                        <div 
                          key={customIndex} 
                          className="text-xs text-gray-600 italic"
                          data-testid={`view-order-item-${index}-customization-${customIndex}`}
                        >
                          <span className="mr-1">*</span>
                          <span>{custom.customizationName}: {custom.optionName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Deal Packages */}
          {order.orderPackages && order.orderPackages.length > 0 && (
            <div className="space-y-2 mb-4">
              {order.orderPackages.map((pkg, index) => (
                <div 
                  key={index} 
                  className="grid grid-cols-12 gap-1 text-sm py-1 bg-blue-50 px-2 rounded"
                  data-testid={`view-order-package-${index}`}
                >
                  <div className="col-span-6">
                    <p className="font-medium text-gray-900 leading-tight">{pkg.packageName || 'Deal Package'}</p>
                    {pkg.expiryDate && (
                      <p className="text-xs text-gray-500">
                        Exp: {new Date(pkg.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 text-center text-gray-700">{pkg.quantity}</div>
                  <div className="col-span-2 text-right text-gray-700">
                    {formatPrice((pkg.totalPrice || 0) / (pkg.quantity || 1))}
                  </div>
                  <div className="col-span-2 text-right font-semibold text-gray-900">
                    {formatPrice(pkg.totalPrice)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Calculations */}
          <div className="border-t border-gray-300 pt-3 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900 font-medium">
                {formatPrice(
                  (order.orderItems || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0) +
                  (order.orderPackages || []).reduce((sum, pkg) => sum + (pkg.totalPrice || 0), 0)
                )}
              </span>
            </div>

            {order.deliveryCharges && order.deliveryCharges > 0 && (
              <div className="flex justify-between text-sm" data-testid="view-order-delivery-charges">
                <span className="text-gray-600">Delivery Charges</span>
                <span className="text-gray-900 font-medium">
                  {formatPrice(order.deliveryCharges)}
                </span>
              </div>
            )}

            {order.serviceCharges && order.serviceCharges > 0 && (
              <div className="flex justify-between text-sm" data-testid="view-order-service-charges">
                <span className="text-gray-600">Service Charges</span>
                <span className="text-gray-900 font-medium">
                  {formatPrice(order.serviceCharges)}
                </span>
              </div>
            )}

            {order.taxAmount && order.taxAmount > 0 && (
              <div className="flex justify-between text-sm" data-testid="view-order-tax">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900 font-medium">
                  {formatPrice(order.taxAmount)}
                </span>
              </div>
            )}

            {order.tipAmount && order.tipAmount > 0 && (
              <div className="flex justify-between text-sm" data-testid="view-order-tip">
                <span className="text-gray-600">Tip</span>
                <span className="text-gray-900 font-medium">
                  {formatPrice(order.tipAmount)}
                </span>
              </div>
            )}

            {order.discountAmount && order.discountAmount > 0 && (
              <div className="flex justify-between text-sm" data-testid="view-order-discount">
                <span className="text-gray-600">Discount</span>
                <span className="text-green-600 font-medium">
                  -{formatPrice(order.discountAmount)}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="border-t border-gray-300 pt-2 mt-3">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">TOTAL</span>
                <span className="text-gray-900" data-testid="view-order-total">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="text-center mt-6 pt-4 border-t-2 border-dashed border-gray-300">
            <p className="text-xs text-gray-500">Thank you for your order!</p>
            <p className="text-xs text-gray-400 mt-1">
              Receipt generated on {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
        {/* END View Order Receipt */}

        {/* Print Button - Outside receipt content */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <Button 
            onClick={() => {
              const printContent = document.getElementById('receipt-content');
              const printWindow = window.open('', '_blank');
              if (printContent && printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Order Receipt - ${order.orderNumber}</title>
                      <style>
                        body { 
                          font-family: monospace; 
                          margin: 20px; 
                          color: #000;
                          background: white;
                        }
                        .receipt-content { 
                          max-width: 350px; 
                          margin: 0 auto;
                          background: white;
                        }
                        @media print {
                          body { margin: 0; }
                          .receipt-content { max-width: none; }
                        }
                      </style>
                    </head>
                    <body>
                      ${printContent.outerHTML}
                    </body>
                  </html>
                `);
                printWindow.document.close();
                printWindow.print();
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            data-testid="button-print-receipt"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}