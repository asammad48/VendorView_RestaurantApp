import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
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

const Divider = () => (
  <div className="flex items-center justify-center gap-2 my-4">
    <div className="h-px flex-1 bg-[#15803d30]" />
    <div className="w-1.5 h-1.5 bg-[#15803d] rotate-45" />
    <div className="h-px flex-1 bg-[#15803d30]" />
  </div>
);

const DashedDivider = () => (
  <div className="border-t border-dashed border-[#15803d30] my-3" />
);

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
  if (!order) return null;

  const currency = order.currency || 'USD';
  const formatPrice = (amount: number) => formatCurrency(amount, currency);

  const subtotal =
    (order.orderItems || []).reduce((s, i) => s + (i.totalPrice || 0), 0) +
    (order.orderPackages || []).reduce((s, p) => s + (p.totalPrice || 0), 0);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = (order.orderItems || []).map((item, idx) => `
      <div class="item-row" data-index="${idx}">
        <div class="item-main">
          <div class="item-name-col">
            <span class="item-name">${item.itemName || 'Menu Item'}</span>
            ${item.variantName ? `<span class="item-variant">${item.variantName}</span>` : ''}
          </div>
          <span class="item-qty">${item.quantity}</span>
          <span class="item-price">${formatPrice(item.unitPrice || 0)}</span>
          <span class="item-total">${formatPrice(item.totalPrice)}</span>
        </div>
        ${(item.orderItemModifiers || []).map(m => `
          <div class="modifier-row">
            <span class="modifier-name">+ ${m.modifierName}${m.quantity > 1 ? ` (x${m.quantity})` : ''}</span>
            <span class="modifier-price">${formatPrice(m.price * m.quantity)}</span>
          </div>
        `).join('')}
        ${(item.orderItemCustomizations || []).map(c => `
          <div class="custom-row">* ${c.customizationName}: ${c.optionName}</div>
        `).join('')}
      </div>
    `).join('');

    const packagesHtml = (order.orderPackages || []).map(pkg => `
      <div class="item-row">
        <div class="item-main">
          <div class="item-name-col">
            <span class="item-name">${pkg.packageName || 'Deal Package'}</span>
            ${pkg.expiryDate ? `<span class="item-variant">Exp: ${new Date(pkg.expiryDate).toLocaleDateString()}</span>` : ''}
          </div>
          <span class="item-qty">${pkg.quantity}</span>
          <span class="item-price">${formatPrice((pkg.totalPrice || 0) / (pkg.quantity || 1))}</span>
          <span class="item-total">${formatPrice(pkg.totalPrice)}</span>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt - ${order.orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0ede8; display: flex; justify-content: center; padding: 30px 20px; }
            .card { background: #f8f5f0; width: 420px; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); border: 1.5px solid #15803d40; }
            .card-header { background: #0f2417; padding: 24px 28px 28px; text-align: center; position: relative; }
            .card-header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, #15803d, #22c55e, #15803d, transparent); }
            .header-title { color: #fff; font-size: 20px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px; }
            .header-branch { color: #86efac; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
            .header-date { color: #6b7280; font-size: 11px; }
            .body { padding: 24px 28px; }
            .order-num { text-align: center; font-size: 17px; font-weight: 800; color: #0f2417; letter-spacing: 1px; margin-bottom: 4px; }
            .order-meta { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 2px; }
            .divider { display: flex; align-items: center; gap: 8px; margin: 14px 0; }
            .divider-line { height: 1px; flex: 1; background: #15803d30; }
            .divider-diamond { width: 6px; height: 6px; background: #15803d; transform: rotate(45deg); }
            .dash-divider { border-top: 1px dashed #15803d30; margin: 12px 0; }
            .status-row { display: flex; gap: 16px; justify-content: center; margin: 12px 0; }
            .status-box { text-align: center; }
            .status-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .badge { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
            .badge-green { background: #dcfce7; color: #15803d; }
            .badge-blue { background: #dbeafe; color: #1d4ed8; }
            .badge-amber { background: #fef3c7; color: #92400e; }
            .badge-red { background: #fee2e2; color: #991b1b; }
            .items-header { display: grid; grid-template-columns: 1fr 36px 72px 72px; gap: 4px; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px; border-bottom: 1px solid #15803d20; margin-bottom: 8px; }
            .items-header span:nth-child(n+2) { text-align: right; }
            .item-row { margin-bottom: 10px; }
            .item-main { display: grid; grid-template-columns: 1fr 36px 72px 72px; gap: 4px; align-items: start; }
            .item-name-col { display: flex; flex-direction: column; }
            .item-name { font-size: 13px; font-weight: 600; color: #111827; }
            .item-variant { font-size: 11px; color: #15803d; }
            .item-qty, .item-price { font-size: 12px; color: #6b7280; text-align: right; padding-top: 2px; }
            .item-total { font-size: 13px; font-weight: 700; color: #111827; text-align: right; padding-top: 2px; }
            .modifier-row { display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; padding-left: 12px; margin-top: 2px; }
            .custom-row { font-size: 11px; color: #9ca3af; font-style: italic; padding-left: 12px; margin-top: 2px; }
            .section-label { font-size: 11px; font-weight: 700; color: #374151; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
            .allergen-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
            .allergen-tag { background: #fee2e2; color: #991b1b; font-size: 11px; padding: 2px 8px; border-radius: 4px; }
            .detail-row { font-size: 12px; color: #6b7280; margin-bottom: 3px; }
            .detail-row strong { color: #374151; }
            .calc-row { display: flex; justify-content: space-between; font-size: 13px; color: #6b7280; margin-bottom: 6px; }
            .calc-row span:last-child { font-weight: 600; color: #111827; }
            .calc-row.discount span:last-child { color: #15803d; }
            .total-row { display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #0f2417; margin-top: 8px; }
            .total-row span { font-size: 17px; font-weight: 800; color: #0f2417; }
            .footer { text-align: center; padding: 14px 28px 20px; border-top: 1px solid #15803d20; }
            .footer-thanks { font-size: 13px; font-weight: 600; color: #15803d; margin-bottom: 4px; }
            .footer-date { font-size: 11px; color: #9ca3af; }
            @media print { body { background: white; padding: 0; } .card { box-shadow: none; margin: 0 auto; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-header">
              <div class="header-title">Order Receipt</div>
              <div class="header-branch">${order.branchName || 'Restaurant'}</div>
              <div class="header-date">${formatOrderDate(order.createdAt)} &bull; ${formatOrderTime(order.createdAt)}</div>
            </div>
            <div class="body">
              <div class="order-num">Order #${order.orderNumber}</div>
              ${order.username ? `<div class="order-meta">Customer: ${order.username}</div>` : ''}
              ${order.orderType ? `<div class="order-meta">Type: ${order.orderType}</div>` : ''}

              <div class="divider"><div class="divider-line"></div><div class="divider-diamond"></div><div class="divider-line"></div></div>

              <div class="status-row">
                <div class="status-box">
                  <div class="status-label">Status</div>
                  <span class="badge badge-green">${getOrderStatus(order)}</span>
                </div>
                <div class="status-box">
                  <div class="status-label">Payment</div>
                  <span class="badge badge-blue">${getPaymentStatus(order)}</span>
                </div>
              </div>

              <div class="dash-divider"></div>

              <div class="items-header">
                <span>Item</span><span>Qty</span><span>Price</span><span>Total</span>
              </div>
              ${itemsHtml}
              ${packagesHtml}

              ${order.specialInstruction ? `
                <div class="dash-divider"></div>
                <div class="section-label">Special Instructions</div>
                <p style="font-size:12px;color:#6b7280;font-style:italic">${order.specialInstruction}</p>
              ` : ''}

              ${order.allergens && order.allergens.length > 0 ? `
                <div class="dash-divider"></div>
                <div class="section-label">Allergen Warnings</div>
                <div class="allergen-wrap">${order.allergens.map((a: string) => `<span class="allergen-tag">${a}</span>`).join('')}</div>
              ` : ''}

              ${order.orderDeliveryDetails ? `
                <div class="dash-divider"></div>
                <div class="section-label">Delivery Details</div>
                <div class="detail-row"><strong>Name:</strong> ${order.orderDeliveryDetails.fullName}</div>
                <div class="detail-row"><strong>Phone:</strong> ${order.orderDeliveryDetails.phoneNumber}</div>
                <div class="detail-row"><strong>Address:</strong> ${order.orderDeliveryDetails.deliveryAddress}</div>
                ${order.orderDeliveryDetails.deliveryInstruction ? `<div class="detail-row"><strong>Instructions:</strong> ${order.orderDeliveryDetails.deliveryInstruction}</div>` : ''}
              ` : ''}

              ${order.orderPickupDetails ? `
                <div class="dash-divider"></div>
                <div class="section-label">Pickup Details</div>
                <div class="detail-row"><strong>Name:</strong> ${order.orderPickupDetails.name}</div>
                <div class="detail-row"><strong>Phone:</strong> ${order.orderPickupDetails.phoneNumber}</div>
                ${order.orderPickupDetails.pickupInstruction ? `<div class="detail-row"><strong>Instructions:</strong> ${order.orderPickupDetails.pickupInstruction}</div>` : ''}
              ` : ''}

              <div class="divider"><div class="divider-line"></div><div class="divider-diamond"></div><div class="divider-line"></div></div>

              <div class="calc-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
              ${order.deliveryCharges && order.deliveryCharges > 0 ? `<div class="calc-row"><span>Delivery Charges</span><span>${formatPrice(order.deliveryCharges)}</span></div>` : ''}
              ${order.serviceCharges && order.serviceCharges > 0 ? `<div class="calc-row"><span>Service Charges</span><span>${formatPrice(order.serviceCharges)}</span></div>` : ''}
              ${order.taxAmount && order.taxAmount > 0 ? `<div class="calc-row"><span>Tax</span><span>${formatPrice(order.taxAmount)}</span></div>` : ''}
              ${order.tipAmount && order.tipAmount > 0 ? `<div class="calc-row"><span>Tip</span><span>${formatPrice(order.tipAmount)}</span></div>` : ''}
              ${order.discountAmount && order.discountAmount > 0 ? `<div class="calc-row discount"><span>Discount</span><span>-${formatPrice(order.discountAmount)}</span></div>` : ''}

              <div class="total-row"><span>TOTAL</span><span>${formatPrice(order.totalAmount)}</span></div>
            </div>
            <div class="footer">
              <div class="footer-thanks">Thank you for your order!</div>
              <div class="footer-date">Receipt generated on ${new Date().toLocaleDateString()}</div>
            </div>
          </div>
          <script>window.onload = () => { setTimeout(() => window.print(), 500); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-md border-0 shadow-2xl" data-testid="view-order-modal">
        <div className="max-h-[90vh] overflow-y-auto">

          {/* Dark Header */}
          <div className="relative bg-[#0f2417] px-7 pt-6 pb-8 text-center flex-shrink-0">
            <div
              className="absolute bottom-0 left-0 right-0 h-[3px]"
              style={{ background: 'linear-gradient(90deg, transparent, #15803d, #22c55e, #15803d, transparent)' }}
            />
            <h1 className="text-white text-lg font-black tracking-[3px] uppercase mb-1">Order Receipt</h1>
            <p className="text-green-300 text-sm font-medium">{order.branchName || 'Restaurant'}</p>
            <p className="text-gray-500 text-xs mt-1">
              {formatOrderDate(order.createdAt)} &bull; {formatOrderTime(order.createdAt)}
            </p>
          </div>

          {/* Body */}
          <div className="bg-[#f8f5f0] px-7 py-5" id="receipt-content">

            {/* Order number + meta */}
            <div className="text-center mb-1">
              <p className="text-[#0f2417] text-base font-black tracking-wide" data-testid="view-order-number">
                Order #{order.orderNumber}
              </p>
              {order.username && (
                <p className="text-xs text-gray-500 mt-0.5" data-testid="view-order-customer">Customer: {order.username}</p>
              )}
              {order.orderType && (
                <p className="text-xs text-gray-500" data-testid="view-order-type">Type: {order.orderType}</p>
              )}
            </div>

            <Divider />

            {/* Status + Payment */}
            <div className="flex justify-center gap-10 mb-1">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Status</p>
                <div data-testid="view-order-status">{getStatusBadge(getOrderStatus(order))}</div>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Payment</p>
                <div data-testid="view-order-payment">{getPaymentBadge(getPaymentStatus(order))}</div>
              </div>
            </div>

            <DashedDivider />

            {/* Items Table Header */}
            <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-[#15803d20]">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Order Items */}
            {order.orderItems && order.orderItems.length > 0 && (
              <div className="space-y-2 mt-2 mb-1">
                {order.orderItems.map((item, index) => (
                  <div key={index} data-testid={`view-order-item-${index}`}>
                    <div className="grid grid-cols-12 gap-1 text-sm py-0.5">
                      <div className="col-span-6">
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{item.itemName || 'Menu Item'}</p>
                        {item.variantName && (
                          <p className="text-xs text-[#15803d]">{item.variantName}</p>
                        )}
                      </div>
                      <div className="col-span-2 text-center text-gray-500 text-sm">{item.quantity}</div>
                      <div className="col-span-2 text-right text-gray-500 text-sm">{formatPrice(item.unitPrice || 0)}</div>
                      <div className="col-span-2 text-right font-bold text-gray-900 text-sm">{formatPrice(item.totalPrice)}</div>
                    </div>
                    {item.orderItemModifiers && item.orderItemModifiers.length > 0 && (
                      <div className="ml-3 space-y-0.5 mt-0.5">
                        {item.orderItemModifiers.map((mod, mi) => (
                          <div key={mi} className="flex justify-between text-xs text-gray-500" data-testid={`view-order-item-${index}-modifier-${mi}`}>
                            <span>+ {mod.modifierName}{mod.quantity > 1 ? ` (x${mod.quantity})` : ''}</span>
                            <span>{formatPrice(mod.price * mod.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.orderItemCustomizations && item.orderItemCustomizations.length > 0 && (
                      <div className="ml-3 space-y-0.5 mt-0.5">
                        {item.orderItemCustomizations.map((c, ci) => (
                          <p key={ci} className="text-xs text-gray-400 italic" data-testid={`view-order-item-${index}-customization-${ci}`}>
                            * {c.customizationName}: {c.optionName}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Deal Packages */}
            {order.orderPackages && order.orderPackages.length > 0 && (
              <div className="space-y-2 mt-2 mb-1">
                {order.orderPackages.map((pkg, index) => (
                  <div key={index} className="grid grid-cols-12 gap-1 text-sm py-1 bg-[#15803d08] px-2 rounded-lg" data-testid={`view-order-package-${index}`}>
                    <div className="col-span-6">
                      <p className="font-semibold text-gray-900">{pkg.packageName || 'Deal Package'}</p>
                      {pkg.expiryDate && <p className="text-xs text-gray-400">Exp: {new Date(pkg.expiryDate).toLocaleDateString()}</p>}
                    </div>
                    <div className="col-span-2 text-center text-gray-500">{pkg.quantity}</div>
                    <div className="col-span-2 text-right text-gray-500">{formatPrice((pkg.totalPrice || 0) / (pkg.quantity || 1))}</div>
                    <div className="col-span-2 text-right font-bold text-gray-900">{formatPrice(pkg.totalPrice)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Special Instructions */}
            {order.specialInstruction && (
              <>
                <DashedDivider />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Special Instructions</p>
                <p className="text-xs text-gray-600 italic">{order.specialInstruction}</p>
              </>
            )}

            {/* Allergens */}
            {order.allergens && order.allergens.length > 0 && (
              <>
                <DashedDivider />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Allergen Warnings</p>
                <div className="flex flex-wrap gap-1">
                  {order.allergens.map((allergen: string, i: number) => (
                    <span key={i} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded" data-testid={`allergen-${i}`}>
                      {allergen}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Delivery Details */}
            {order.orderDeliveryDetails && (
              <>
                <DashedDivider />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery Details</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><span className="font-semibold text-gray-700">Name:</span> {order.orderDeliveryDetails.fullName}</p>
                  <p><span className="font-semibold text-gray-700">Phone:</span> {order.orderDeliveryDetails.phoneNumber}</p>
                  <p><span className="font-semibold text-gray-700">Address:</span> {order.orderDeliveryDetails.deliveryAddress}</p>
                  {order.orderDeliveryDetails.deliveryInstruction && (
                    <p><span className="font-semibold text-gray-700">Instructions:</span> {order.orderDeliveryDetails.deliveryInstruction}</p>
                  )}
                </div>
              </>
            )}

            {/* Pickup Details */}
            {order.orderPickupDetails && (
              <>
                <DashedDivider />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pickup Details</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><span className="font-semibold text-gray-700">Name:</span> {order.orderPickupDetails.name}</p>
                  <p><span className="font-semibold text-gray-700">Phone:</span> {order.orderPickupDetails.phoneNumber}</p>
                  {order.orderPickupDetails.pickupInstruction && (
                    <p><span className="font-semibold text-gray-700">Instructions:</span> {order.orderPickupDetails.pickupInstruction}</p>
                  )}
                </div>
              </>
            )}

            <Divider />

            {/* Calculations */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
              </div>
              {order.deliveryCharges && order.deliveryCharges > 0 && (
                <div className="flex justify-between text-sm" data-testid="view-order-delivery-charges">
                  <span className="text-gray-500">Delivery Charges</span>
                  <span className="font-semibold text-gray-900">{formatPrice(order.deliveryCharges)}</span>
                </div>
              )}
              {order.serviceCharges && order.serviceCharges > 0 && (
                <div className="flex justify-between text-sm" data-testid="view-order-service-charges">
                  <span className="text-gray-500">Service Charges</span>
                  <span className="font-semibold text-gray-900">{formatPrice(order.serviceCharges)}</span>
                </div>
              )}
              {order.taxAmount && order.taxAmount > 0 && (
                <div className="flex justify-between text-sm" data-testid="view-order-tax">
                  <span className="text-gray-500">Tax</span>
                  <span className="font-semibold text-gray-900">{formatPrice(order.taxAmount)}</span>
                </div>
              )}
              {order.tipAmount && order.tipAmount > 0 && (
                <div className="flex justify-between text-sm" data-testid="view-order-tip">
                  <span className="text-gray-500">Tip</span>
                  <span className="font-semibold text-gray-900">{formatPrice(order.tipAmount)}</span>
                </div>
              )}
              {order.discountAmount && order.discountAmount > 0 && (
                <div className="flex justify-between text-sm" data-testid="view-order-discount">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-semibold text-[#15803d]">-{formatPrice(order.discountAmount)}</span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-[#0f2417] mt-2">
                <span className="text-[#0f2417] text-base font-black uppercase tracking-wide">Total</span>
                <span className="text-[#0f2417] text-base font-black" data-testid="view-order-total">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#f8f5f0] text-center py-3 border-t border-[#15803d20]">
            <p className="text-xs font-semibold text-[#15803d]">Thank you for your order!</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Receipt generated on {new Date().toLocaleDateString()}</p>
          </div>

          {/* Print Button */}
          <div className="bg-white px-6 py-4 border-t border-gray-100">
            <Button
              onClick={handlePrint}
              className="w-full bg-[#15803d] hover:bg-[#166534] text-white"
              data-testid="button-print-receipt"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
