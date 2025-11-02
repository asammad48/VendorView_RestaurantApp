import { DetailedOrder } from '@/types/schema';
import { bluetoothPrinterService } from '@/services/bluetoothPrinterService';
import { formatReceiptDateTime } from './dateTimeUtils';

/**
 * Shared function to print order receipt via Bluetooth printer
 * Used by both SignalR service and manual print from orders table
 */
export async function printOrderReceipt(
  orderData: DetailedOrder
): Promise<{ success: boolean; error?: string }> {
  console.log('[Print Receipt] 🖨️ Preparing to print order:', orderData.orderNumber);

  // Use currency from order data
  const currency = orderData.currency || 'USD';
  console.log('[Print Receipt] Order currency:', currency);

  // Prepare items for printing
  const items = [
    ...(orderData.orderItems || []).map(item => ({
      name: item.itemName + (item.variantName ? ` (${item.variantName})` : ''),
      quantity: item.quantity,
      price: item.unitPrice,
      modifiers: item.orderItemModifiers || [],
      customizations: item.orderItemCustomizations || []
    })),
    ...(orderData.orderPackages || []).map(pkg => ({
      name: `[DEAL] ${pkg.packageName}`,
      quantity: pkg.quantity,
      price: (pkg.totalPrice || 0) / (pkg.quantity || 1)
    }))
  ];

  // Calculate subtotal from items
  const subtotal = 
    (orderData.orderItems || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0) +
    (orderData.orderPackages || []).reduce((sum, pkg) => sum + (pkg.totalPrice || 0), 0);

  console.log('[Print Receipt] Prepared receipt data:', {
    itemCount: items.length,
    subtotal,
    deliveryCharges: orderData.deliveryCharges,
    serviceCharges: orderData.serviceCharges,
    tax: orderData.taxAmount,
    discount: orderData.discountAmount,
    tip: orderData.tipAmount,
    total: orderData.totalAmount,
    hasDeliveryDetails: !!orderData.orderDeliveryDetails,
    hasPickupDetails: !!orderData.orderPickupDetails,
    specialInstruction: orderData.specialInstruction || '(none)',
    allergens: orderData.allergens?.length || 0
  });

  // Print receipt with actual order data
  const printResult = await bluetoothPrinterService.printReceipt({
    orderNumber: orderData.orderNumber,
    date: formatReceiptDateTime(orderData.createdAt),
    items: items,
    subtotal: subtotal,
    tax: orderData.taxAmount || 0,
    total: orderData.totalAmount || 0,
    branchName: orderData.branchName || 'Restaurant',
    locationName: orderData.locationName,
    orderType: orderData.orderType,
    deliveryCharges: orderData.deliveryCharges,
    serviceCharges: orderData.serviceCharges,
    discountAmount: orderData.discountAmount,
    tipAmount: orderData.tipAmount,
    allergens: orderData.allergens,
    specialInstruction: orderData.specialInstruction,
    currency: currency,
    deliveryDetails: orderData.orderDeliveryDetails ? {
      fullName: orderData.orderDeliveryDetails.fullName,
      phoneNumber: orderData.orderDeliveryDetails.phoneNumber,
      deliveryAddress: orderData.orderDeliveryDetails.deliveryAddress,
      deliveryInstruction: orderData.orderDeliveryDetails.deliveryInstruction
    } : undefined,
    pickupDetails: orderData.orderPickupDetails ? {
      name: orderData.orderPickupDetails.name,
      phoneNumber: orderData.orderPickupDetails.phoneNumber,
      pickupInstruction: orderData.orderPickupDetails.pickupInstruction
    } : undefined
  });

  if (printResult.success) {
    console.log('[Print Receipt] ✅ Receipt printed successfully!');
  } else {
    console.error('[Print Receipt] ❌ Failed to print receipt:', printResult.error);
  }

  return printResult;
}
