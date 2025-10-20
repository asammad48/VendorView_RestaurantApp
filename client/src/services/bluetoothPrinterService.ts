const PRINTER_DEVICE_ID_KEY = 'bluetooth_printer_device_id';
const PRINTER_DEVICE_NAME_KEY = 'bluetooth_printer_device_name';

export class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private isConnected: boolean = false;
  private hasSavedConnection: boolean = false;
  private connectionListeners: Array<(connected: boolean) => void> = [];
  private disconnectHandler: (() => void) | null = null;

  constructor() {
    // Check for previously connected device on initialization
    this.initializeFromStorage();
  }

  private initializeFromStorage(): void {
    const savedDeviceId = localStorage.getItem(PRINTER_DEVICE_ID_KEY);
    const savedDeviceName = localStorage.getItem(PRINTER_DEVICE_NAME_KEY);
    
    if (savedDeviceId && savedDeviceName) {
      this.hasSavedConnection = true;
      console.log('[Bluetooth Printer] 💾 Found saved printer preference:', savedDeviceName);
      console.log('[Bluetooth Printer] Note: User will need to reconnect the printer');
      console.log('[Bluetooth Printer] Printer info saved for convenience but not auto-connected');
      // Do NOT notify listeners as connected - that would be misleading
      // The reconnection must happen through user action due to Web Bluetooth API limitations
    }
  }

  private async establishCharacteristic(server: BluetoothRemoteGATTServer): Promise<void> {
    let service;
    try {
      service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
    } catch {
      try {
        service = await server.getPrimaryService('e7810a71-73ae-499d-8c15-faa9aef0c3f2');
        this.characteristic = await service.getCharacteristic('bef8d6c9-9c21-4c9e-b632-bd58c1009f9f');
      } catch {
        const services = await server.getPrimaryServices();
        if (services.length > 0) {
          service = services[0];
          const characteristics = await service.getCharacteristics();
          if (characteristics.length > 0) {
            this.characteristic = characteristics[0];
          }
        }
      }
    }
  }

  async connect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    console.log('[Bluetooth Printer] 🔌 Starting connection process...');
    
    if (!navigator.bluetooth) {
      console.error('[Bluetooth Printer] ❌ Web Bluetooth API not available');
      console.log('[Bluetooth Printer] Supported browsers: Chrome, Edge, Opera on Desktop/Android');
      return {
        success: false,
        error: 'Web Bluetooth API is not available in this browser. Please use Chrome, Edge, or Opera.'
      };
    }

    try {
      console.log('[Bluetooth Printer] Requesting device...');
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
        ]
      });
      
      console.log('[Bluetooth Printer] Device selected:', {
        name: this.device.name,
        id: this.device.id
      });

      if (!this.device.gatt) {
        console.error('[Bluetooth Printer] ❌ Device does not support GATT');
        return { success: false, error: 'Device does not support GATT' };
      }

      console.log('[Bluetooth Printer] Connecting to GATT server...');
      const server = await this.device.gatt.connect();
      console.log('[Bluetooth Printer] ✅ GATT server connected');

      let service;
      try {
        console.log('[Bluetooth Printer] Attempting to get primary service (UUID: 000018f0-...)');
        service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        console.log('[Bluetooth Printer] ✅ Service found, getting characteristic (UUID: 00002af1-...)');
        this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
        console.log('[Bluetooth Printer] ✅ Characteristic obtained');
      } catch {
        console.log('[Bluetooth Printer] ⚠️ Primary service not found, trying alternative (UUID: e7810a71-...)');
        try {
          service = await server.getPrimaryService('e7810a71-73ae-499d-8c15-faa9aef0c3f2');
          console.log('[Bluetooth Printer] ✅ Alternative service found');
          this.characteristic = await service.getCharacteristic('bef8d6c9-9c21-4c9e-b632-bd58c1009f9f');
          console.log('[Bluetooth Printer] ✅ Characteristic obtained from alternative service');
        } catch {
          console.log('[Bluetooth Printer] ⚠️ Known services not found, scanning all available services...');
          const services = await server.getPrimaryServices();
          console.log('[Bluetooth Printer] Found', services.length, 'services');
          
          if (services.length > 0) {
            service = services[0];
            console.log('[Bluetooth Printer] Using first service:', service.uuid);
            const characteristics = await service.getCharacteristics();
            console.log('[Bluetooth Printer] Found', characteristics.length, 'characteristics');
            
            if (characteristics.length > 0) {
              this.characteristic = characteristics[0];
              console.log('[Bluetooth Printer] ✅ Using first characteristic:', this.characteristic.uuid);
            } else {
              console.error('[Bluetooth Printer] ❌ No writable characteristics found');
              return { success: false, error: 'No writable characteristics found' };
            }
          } else {
            console.error('[Bluetooth Printer] ❌ No services found on device');
            return { success: false, error: 'No services found on device' };
          }
        }
      }

      this.isConnected = true;
      this.notifyConnectionChange(true);
      
      // Save device information to localStorage for persistence across page refreshes
      localStorage.setItem(PRINTER_DEVICE_ID_KEY, this.device.id);
      localStorage.setItem(PRINTER_DEVICE_NAME_KEY, this.device.name || 'Bluetooth Printer');
      this.hasSavedConnection = true;
      console.log('[Bluetooth Printer] 💾 Saved device info to localStorage for persistence');
      
      // Add disconnect event listener to handle unexpected disconnections
      this.disconnectHandler = () => {
        console.log('[Bluetooth Printer] ⚠️ Device disconnected unexpectedly');
        this.isConnected = false;
        this.characteristic = null;
        this.notifyConnectionChange(false);
        // Don't clear localStorage on unexpected disconnection - keep the preference
      };
      
      this.device.addEventListener('gattserverdisconnected', this.disconnectHandler);
      
      console.log('[Bluetooth Printer] ✅ Successfully connected to:', this.device.name || 'Bluetooth Printer');
      
      return {
        success: true,
        deviceName: this.device.name || 'Bluetooth Printer'
      };
    } catch (error: any) {
      console.error('[Bluetooth Printer] ❌ Connection error:', error);
      console.error('[Bluetooth Printer] Error details:', {
        message: error.message,
        name: error.name
      });
      return {
        success: false,
        error: error.message || 'Failed to connect to printer'
      };
    }
  }

  async disconnect(): Promise<void> {
    console.log('[Bluetooth Printer] 🔌 Disconnecting...');
    
    // Remove disconnect event listener
    if (this.device && this.disconnectHandler) {
      this.device.removeEventListener('gattserverdisconnected', this.disconnectHandler);
      this.disconnectHandler = null;
    }
    
    if (this.device?.gatt?.connected) {
      await this.device.gatt.disconnect();
      console.log('[Bluetooth Printer] ✅ Disconnected from device');
    } else {
      console.log('[Bluetooth Printer] ⚠️ Device was not connected');
    }
    
    // Clear localStorage on explicit disconnect
    localStorage.removeItem(PRINTER_DEVICE_ID_KEY);
    localStorage.removeItem(PRINTER_DEVICE_NAME_KEY);
    this.hasSavedConnection = false;
    console.log('[Bluetooth Printer] 🗑️ Cleared saved device info from localStorage');
    
    this.device = null;
    this.characteristic = null;
    this.isConnected = false;
    this.notifyConnectionChange(false);
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionListeners.push(callback);
  }

  offConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionListeners.forEach(callback => callback(connected));
  }

  getConnectionStatus(): boolean {
    // Only report connected if we have an actual active connection
    const isConnected = !!(this.device && this.characteristic);
    console.log('[Bluetooth Printer] Connection status check:', {
      activeConnection: isConnected,
      savedPreference: this.hasSavedConnection
    });
    return isConnected;
  }
  
  getSavedDeviceName(): string | null {
    return localStorage.getItem(PRINTER_DEVICE_NAME_KEY);
  }
  
  hasSavedDevice(): boolean {
    return this.hasSavedConnection;
  }

  getDeviceName(): string {
    const name = this.device?.name || 'Unknown Device';
    console.log('[Bluetooth Printer] Device name:', name);
    return name;
  }

  // Write a chunk with retry logic to handle GATT errors
  private async writeChunkWithRetry(
    chunk: Uint8Array, 
    chunkNumber: number, 
    totalChunks: number, 
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if we're still connected before writing
        if (!this.device?.gatt?.connected || !this.characteristic) {
          console.error('[Bluetooth Printer] ⚠️ Connection lost before chunk write, attempting reconnect...');
          
          // Attempt to reconnect
          if (this.device?.gatt) {
            await this.device.gatt.connect();
            
            // Re-establish characteristic
            const server = this.device.gatt;
            const services = await server.getPrimaryServices();
            if (services.length > 0) {
              const characteristics = await services[0].getCharacteristics();
              if (characteristics.length > 0) {
                this.characteristic = characteristics[0];
                console.log('[Bluetooth Printer] ✅ Reconnected during print job');
              }
            }
          }
          
          if (!this.characteristic) {
            throw new Error('Failed to reconnect to printer');
          }
        }
        
        // Attempt to write the chunk
        await this.characteristic.writeValue(chunk as BufferSource);
        
        // Success!
        if (attempt > 1) {
          console.log(`[Bluetooth Printer] ✅ Chunk ${chunkNumber}/${totalChunks} sent successfully on attempt ${attempt}`);
        }
        
        return true;
        
      } catch (error: any) {
        console.error(`[Bluetooth Printer] ⚠️ Attempt ${attempt}/${maxRetries} failed for chunk ${chunkNumber}/${totalChunks}:`, error.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 200ms, 400ms, 800ms
          const backoffDelay = 200 * Math.pow(2, attempt - 1);
          console.log(`[Bluetooth Printer] Retrying in ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          console.error(`[Bluetooth Printer] ❌ Failed to write chunk ${chunkNumber}/${totalChunks} after ${maxRetries} attempts`);
          console.error('[Bluetooth Printer] Error details:', {
            message: error.message,
            name: error.name,
            code: error.code
          });
          return false;
        }
      }
    }
    
    return false;
  }

  async printReceipt(orderData: {
    orderNumber: string;
    date: string;
    items: Array<{ 
      name: string; 
      quantity: number; 
      price: number; 
      modifiers?: Array<{ modifierName: string; price: number; quantity: number }>;
      customizations?: Array<{ customizationName: string; optionName: string }>;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    branchName?: string;
    locationName?: string;
    orderType?: string;
    deliveryCharges?: number;
    serviceCharges?: number;
    discountAmount?: number;
    tipAmount?: number;
    allergens?: string[];
    specialInstruction?: string;
    currency?: string;
  }): Promise<{ success: boolean; error?: string }> {
    console.log('[Bluetooth Printer] 🖨️ Print receipt requested');
    console.log('[Bluetooth Printer] Order data:', {
      orderNumber: orderData.orderNumber,
      itemCount: orderData.items.length,
      total: orderData.total
    });
    
    // Check if device is connected, try to reconnect if needed
    if (!this.device || !this.device.gatt?.connected) {
      console.log('[Bluetooth Printer] ⚠️ Device not connected, attempting to reconnect...');
      if (this.device?.gatt) {
        try {
          console.log('[Bluetooth Printer] Reconnecting to GATT...');
          await this.device.gatt.connect();
          console.log('[Bluetooth Printer] ✅ Reconnected to GATT');
          
          // Re-establish characteristic connection
          const server = this.device.gatt;
          let service;
          try {
            console.log('[Bluetooth Printer] Re-establishing service connection...');
            service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
            console.log('[Bluetooth Printer] ✅ Service and characteristic re-established');
          } catch {
            try {
              service = await server.getPrimaryService('e7810a71-73ae-499d-8c15-faa9aef0c3f2');
              this.characteristic = await service.getCharacteristic('bef8d6c9-9c21-4c9e-b632-bd58c1009f9f');
              console.log('[Bluetooth Printer] ✅ Alternative service and characteristic re-established');
            } catch {
              console.log('[Bluetooth Printer] Scanning for any available services...');
              const services = await server.getPrimaryServices();
              if (services.length > 0) {
                service = services[0];
                const characteristics = await service.getCharacteristics();
                if (characteristics.length > 0) {
                  this.characteristic = characteristics[0];
                  console.log('[Bluetooth Printer] ✅ Generic service and characteristic re-established');
                }
              }
            }
          }
        } catch (error) {
          console.error('[Bluetooth Printer] ❌ Reconnection failed:', error);
          return { success: false, error: 'Printer connection lost. Please reconnect from the Printer page.' };
        }
      } else {
        console.error('[Bluetooth Printer] ❌ No device available to reconnect');
        return { success: false, error: 'Printer not connected' };
      }
    }

    if (!this.characteristic) {
      console.error('[Bluetooth Printer] ❌ No characteristic available');
      return { success: false, error: 'Printer not connected' };
    }

    try {
      console.log('[Bluetooth Printer] Building ESC/POS receipt...');
      const ESC = '\x1B';
      const GS = '\x1D';

      // Import currency utilities
      const { formatCurrencyForPrinter } = await import('../lib/currencyUtils');
      const currency = orderData.currency || 'USD';
      const formatPrice = (amount: number | string) => formatCurrencyForPrinter(amount, currency);

      console.log('[Bluetooth Printer] Using currency:', currency);

      let receipt = ESC + '@';
      
      // Header - centered, large text
      receipt += ESC + 'a' + '\x01';
      receipt += ESC + '!' + '\x38';
      receipt += (orderData.branchName || 'RESTAURANT') + '\n';
      receipt += ESC + '!' + '\x00';
      receipt += '================================\n';
      
      // Order details - left aligned
      receipt += ESC + 'a' + '\x00';
      receipt += ESC + '!' + '\x08';
      receipt += `Order: ${orderData.orderNumber}\n`;
      receipt += ESC + '!' + '\x00';
      receipt += `Date: ${orderData.date}\n`;
      if (orderData.orderType) {
        receipt += `Type: ${orderData.orderType}\n`;
      }
      if (orderData.locationName) {
        receipt += `Location: ${orderData.locationName}\n`;
      }
      receipt += '================================\n\n';
      
      // Items section
      receipt += 'ITEMS:\n';
      receipt += '--------------------------------\n';
      orderData.items.forEach(item => {
        const itemLine = `${item.quantity}x ${item.name}`;
        const price = formatPrice(item.price);
        const spaces = 32 - itemLine.length - price.length;
        receipt += itemLine + ' '.repeat(Math.max(spaces, 1)) + price + '\n';
        
        // Add modifiers if present
        if (item.modifiers && item.modifiers.length > 0) {
          item.modifiers.forEach(modifier => {
            const modLine = `  + ${modifier.modifierName}`;
            const modPrice = formatPrice(modifier.price * modifier.quantity);
            const modQty = modifier.quantity > 1 ? ` (x${modifier.quantity})` : '';
            const modSpaces = 32 - modLine.length - modQty.length - modPrice.length;
            receipt += modLine + modQty + ' '.repeat(Math.max(modSpaces, 1)) + modPrice + '\n';
          });
        }
        
        // Add customizations if present
        if (item.customizations && item.customizations.length > 0) {
          item.customizations.forEach(custom => {
            receipt += `  * ${custom.customizationName}: ${custom.optionName}\n`;
          });
        }
      });
      
      // Calculations section
      receipt += '================================\n';
      const subtotalLine = 'Subtotal:';
      const subtotalPrice = formatPrice(orderData.subtotal);
      let spaces = 32 - subtotalLine.length - subtotalPrice.length;
      receipt += subtotalLine + ' '.repeat(Math.max(spaces, 1)) + subtotalPrice + '\n';
      
      // Delivery charges
      if (orderData.deliveryCharges && orderData.deliveryCharges > 0) {
        const deliveryLine = 'Delivery:';
        const deliveryPrice = formatPrice(orderData.deliveryCharges);
        spaces = 32 - deliveryLine.length - deliveryPrice.length;
        receipt += deliveryLine + ' '.repeat(Math.max(spaces, 1)) + deliveryPrice + '\n';
      }
      
      // Service charges
      if (orderData.serviceCharges && orderData.serviceCharges > 0) {
        const serviceLine = 'Service:';
        const servicePrice = formatPrice(orderData.serviceCharges);
        spaces = 32 - serviceLine.length - servicePrice.length;
        receipt += serviceLine + ' '.repeat(Math.max(spaces, 1)) + servicePrice + '\n';
      }
      
      // Tax
      if (orderData.tax && orderData.tax > 0) {
        const taxLine = 'Tax:';
        const taxPrice = formatPrice(orderData.tax);
        spaces = 32 - taxLine.length - taxPrice.length;
        receipt += taxLine + ' '.repeat(Math.max(spaces, 1)) + taxPrice + '\n';
      }
      
      // Tip
      if (orderData.tipAmount && orderData.tipAmount > 0) {
        const tipLine = 'Tip:';
        const tipPrice = formatPrice(orderData.tipAmount);
        spaces = 32 - tipLine.length - tipPrice.length;
        receipt += tipLine + ' '.repeat(Math.max(spaces, 1)) + tipPrice + '\n';
      }
      
      // Discount
      if (orderData.discountAmount && orderData.discountAmount > 0) {
        const discountLine = 'Discount:';
        const discountPrice = '-' + formatPrice(orderData.discountAmount);
        spaces = 32 - discountLine.length - discountPrice.length;
        receipt += discountLine + ' '.repeat(Math.max(spaces, 1)) + discountPrice + '\n';
      }
      
      // Total - bold and larger
      receipt += '--------------------------------\n';
      const totalLine = 'TOTAL:';
      const totalPrice = formatPrice(orderData.total);
      spaces = 32 - totalLine.length - totalPrice.length;
      receipt += ESC + '!' + '\x18';
      receipt += totalLine + ' '.repeat(Math.max(spaces, 1)) + totalPrice + '\n';
      receipt += ESC + '!' + '\x00';
      
      receipt += '================================\n';
      
      // Allergens section (if present)
      if (orderData.allergens && orderData.allergens.length > 0) {
        receipt += '\n';
        receipt += ESC + '!' + '\x08'; // Bold
        receipt += 'ALLERGENS:\n';
        receipt += ESC + '!' + '\x00'; // Normal
        receipt += orderData.allergens.join(', ') + '\n';
        receipt += '================================\n';
        console.log('[Bluetooth Printer] Added allergens:', orderData.allergens);
      }
      
      // Special instructions section (if present)
      if (orderData.specialInstruction && orderData.specialInstruction.trim() !== '') {
        receipt += '\n';
        receipt += ESC + '!' + '\x08'; // Bold
        receipt += 'SPECIAL INSTRUCTIONS:\n';
        receipt += ESC + '!' + '\x00'; // Normal
        receipt += orderData.specialInstruction + '\n';
        receipt += '================================\n';
        console.log('[Bluetooth Printer] Added special instructions:', orderData.specialInstruction);
      }
      
      // Footer - centered
      receipt += '\n';
      receipt += ESC + 'a' + '\x01';
      receipt += 'Thank you for your order!\n';
      receipt += 'Please come again\n\n';
      
      // Reset alignment and cut
      receipt += ESC + 'a' + '\x00';
      receipt += GS + 'V' + '\x00';

      const encoder = new TextEncoder();
      const data = encoder.encode(receipt);
      
      console.log('[Bluetooth Printer] Receipt data encoded:', data.length, 'bytes');
      console.log('[Bluetooth Printer] Sending data to printer...');
      
      // Use smaller chunks and longer delays to prevent GATT errors
      // Reduced from 512 to 128 bytes for better stability
      const chunkSize = 128;
      const delayBetweenChunks = 100; // Increased from 50ms to 100ms
      const totalChunks = Math.ceil(data.length / chunkSize);
      
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, Math.min(i + chunkSize, data.length));
        const chunkNumber = Math.floor(i / chunkSize) + 1;
        
        console.log(`[Bluetooth Printer] Sending chunk ${chunkNumber}/${totalChunks} (${chunk.length} bytes)`);
        
        // Write with retry logic to handle GATT errors
        const writeSuccess = await this.writeChunkWithRetry(chunk, chunkNumber, totalChunks);
        
        if (!writeSuccess) {
          throw new Error(`Failed to write chunk ${chunkNumber}/${totalChunks} after retries`);
        }
        
        // Longer delay between chunks to prevent buffer overflow
        if (i + chunkSize < data.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
        }
      }

      console.log('[Bluetooth Printer] ✅ Receipt printed successfully!');
      return { success: true };
    } catch (error: any) {
      console.error('[Bluetooth Printer] ❌ Print error:', error);
      console.error('[Bluetooth Printer] Error details:', {
        message: error.message,
        name: error.name
      });
      return {
        success: false,
        error: error.message || 'Failed to print receipt'
      };
    }
  }
}

export const bluetoothPrinterService = new BluetoothPrinterService();
