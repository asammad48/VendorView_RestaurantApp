import { HubConnection, HubConnectionBuilder, HubConnectionState, HttpTransportType } from '@microsoft/signalr';
import { toast } from '@/hooks/use-toast';
import { signalRBaseUrl } from '@/config/environment';
import { bluetoothPrinterService } from './bluetoothPrinterService';
import { DetailedOrder } from '@/types/schema';
import { formatCurrency } from '@/lib/currencyUtils';

interface OrderCreatedPayload {
  orderId: number;
  orderNumber: string;
}

export class SignalRService {
  private connection: HubConnection | null = null;
  private baseUrl: string = signalRBaseUrl;
  private isConnecting: boolean = false;
  private getAccessToken: (() => string | null) | null = null;

  constructor() {
    // Initialize with null connection
    this.connection = null;
  }

  // Connect to SignalR hub with access token factory
  async connect(getAccessToken: () => string | null): Promise<void> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      console.log('SignalR already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('SignalR connection already in progress');
      return;
    }

    try {
      this.isConnecting = true;
      this.getAccessToken = getAccessToken;
      
      // Build connection with accessTokenFactory for automatic token refresh
      // Skip negotiation and use direct WebSocket connection to avoid negotiation errors
      this.connection = new HubConnectionBuilder()
        .withUrl(this.baseUrl, {
          skipNegotiation: true,
          transport: HttpTransportType.WebSockets,
          accessTokenFactory: () => {
            const token = this.getAccessToken?.();
            console.log('SignalR requesting access token:', token ? 'Token available' : 'No token');
            return token || '';
          }
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: retryContext => {
            if (retryContext.previousRetryCount === 0) {
              return 0;
            }
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          }
        })
        .build();

      // Set up event handlers
      this.setupEventHandlers();

      // Start connection
      await this.connection.start();
      console.log('SignalR Connected successfully');

      // Show success toast
      toast({
        title: "Real-time Connection Established",
        description: "You'll now receive live order updates",
        variant: "default",
      });

    } catch (error) {
      console.error('SignalR Connection failed:', error);
      
      // Show error toast
      toast({
        title: "Connection Error", 
        description: "Failed to establish real-time connection",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  // Register a custom OrderCreated event handler
  public onOrderCreated(handler: (payload: OrderCreatedPayload) => void): void {
    if (this.connection) {
      this.connection.on('OrderCreated', handler);
    }
  }

  // Remove OrderCreated event handler
  public offOrderCreated(handler: (payload: OrderCreatedPayload) => void): void {
    if (this.connection) {
      this.connection.off('OrderCreated', handler);
    }
  }

  // Set up event handlers
  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Listen for OrderCreated event (default toast notification)
    this.connection.on('OrderCreated', async (payload: OrderCreatedPayload) => {
      console.log('[SignalR] OrderCreated event received:', payload);
      console.log('[SignalR] Event details:', {
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        timestamp: new Date().toISOString()
      });
      
      // Show toast notification
      toast({
        title: "New Order Created! 🎉",
        description: `Order #${payload.orderNumber} (ID: ${payload.orderId}) has been created`,
        variant: "default",
      });

      // Attempt to print receipt via Bluetooth printer
      console.log('[SignalR] Checking if Bluetooth printer is connected...');
      const isPrinterConnected = bluetoothPrinterService.getConnectionStatus();
      
      if (isPrinterConnected) {
        console.log('[SignalR] ✅ Bluetooth printer is connected, fetching full order details...');
        
        try {
          // Fetch full order details from API
          console.log('[SignalR] Fetching order details from API for order ID:', payload.orderId);
          const response = await fetch(`/api/orders/${payload.orderId}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch order: ${response.status} ${response.statusText}`);
          }

          const orderData: DetailedOrder = await response.json();
          console.log('[SignalR] ✅ Order details fetched successfully:', {
            orderNumber: orderData.orderNumber,
            itemCount: orderData.orderItems?.length || 0,
            packageCount: orderData.orderPackages?.length || 0,
            total: orderData.totalAmount,
            currency: orderData.branchName,
            allergens: orderData.allergens?.length || 0
          });

          // Get branch currency (from order or default to USD)
          // Note: You may need to fetch branch details separately to get currency
          // For now, we'll try to determine it from the branchId
          let currency = 'USD';
          try {
            const branchResponse = await fetch(`/api/branches/${orderData.branchId}`);
            if (branchResponse.ok) {
              const branchData = await branchResponse.json();
              currency = branchData.currency || 'USD';
              console.log('[SignalR] Branch currency:', currency);
            }
          } catch (error) {
            console.log('[SignalR] Could not fetch branch currency, using USD as default');
          }

          // Prepare items for printing
          const items = [
            ...(orderData.orderItems || []).map(item => ({
              name: item.itemName + (item.variantName ? ` (${item.variantName})` : ''),
              quantity: item.quantity,
              price: (item.totalPrice || 0) / (item.quantity || 1)
            })),
            ...(orderData.orderPackages || []).map(pkg => ({
              name: `[DEAL] ${pkg.packageName}`,
              quantity: pkg.quantity,
              price: (pkg.totalPrice || 0) / (pkg.quantity || 1)
            }))
          ];

          // Calculate subtotal from items
          const subtotal = (orderData.orderItems || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0) +
                          (orderData.orderPackages || []).reduce((sum, pkg) => sum + (pkg.totalPrice || 0), 0);

          console.log('[SignalR] Prepared receipt data:', {
            itemCount: items.length,
            subtotal,
            deliveryCharges: orderData.deliveryCharges,
            serviceCharges: orderData.serviceCharges,
            tax: orderData.taxAmount,
            discount: orderData.discountAmount,
            tip: orderData.tipAmount,
            total: orderData.totalAmount
          });

          // Print receipt with actual order data
          const printResult = await bluetoothPrinterService.printReceipt({
            orderNumber: orderData.orderNumber,
            date: new Date(orderData.createdAt).toLocaleString(),
            items: items,
            subtotal: subtotal,
            tax: orderData.taxAmount || 0,
            total: orderData.totalAmount || 0,
            branchName: orderData.branchName || 'Restaurant',
            deliveryCharges: orderData.deliveryCharges,
            serviceCharges: orderData.serviceCharges,
            discountAmount: orderData.discountAmount,
            tipAmount: orderData.tipAmount,
            allergens: orderData.allergens,
            currency: currency
          });

          if (printResult.success) {
            console.log('[SignalR] ✅ Receipt printed successfully via Bluetooth!');
            
            toast({
              title: "Receipt Printed! 🖨️",
              description: `Receipt for Order #${payload.orderNumber} sent to printer`,
              variant: "default",
            });
          } else {
            console.error('[SignalR] ❌ Failed to print receipt:', printResult.error);
            
            toast({
              title: "Print Failed",
              description: printResult.error || 'Could not print receipt',
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('[SignalR] ❌ Error fetching order or printing receipt:', error);
          
          toast({
            title: "Print Error",
            description: error instanceof Error ? error.message : 'An error occurred while printing',
            variant: "destructive",
          });
        }
      } else {
        console.log('[SignalR] ⚠️ Bluetooth printer not connected, skipping print');
        console.log('[SignalR] To enable automatic printing, connect a Bluetooth printer from the Printer page');
      }
    });

    // Handle connection state changes
    this.connection.onreconnecting((error) => {
      console.log('SignalR Reconnecting:', error);
      toast({
        title: "Reconnecting...",
        description: "Attempting to restore real-time connection",
        variant: "default",
      });
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR Reconnected:', connectionId);
      toast({
        title: "Reconnected! ✅",
        description: "Real-time connection restored",
        variant: "default",
      });
    });

    this.connection.onclose((error) => {
      console.log('SignalR Connection closed:', error);
      if (error) {
        toast({
          title: "Connection Lost",
          description: "Real-time connection has been closed",
          variant: "destructive",
        });
      }
    });
  }

  // Disconnect from SignalR hub
  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('SignalR Disconnected');
        this.connection = null;
        this.getAccessToken = null;
      } catch (error) {
        console.error('Error disconnecting SignalR:', error);
      }
    }
  }

  // Get connection state
  getConnectionState(): HubConnectionState | null {
    return this.connection?.state || null;
  }

  // Check if connected
  isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  // Send a message to the hub (for future use if needed)
  async sendMessage(methodName: string, ...args: any[]): Promise<void> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      try {
        await this.connection.invoke(methodName, ...args);
      } catch (error) {
        console.error('Error sending SignalR message:', error);
        throw error;
      }
    } else {
      throw new Error('SignalR connection is not established');
    }
  }
}

// Create singleton instance
export const signalRService = new SignalRService();