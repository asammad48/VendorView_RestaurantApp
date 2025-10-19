export class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!navigator.bluetooth) {
      return {
        success: false,
        error: 'Web Bluetooth API is not available in this browser. Please use Chrome, Edge, or Opera.'
      };
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
        ]
      });

      if (!this.device.gatt) {
        return { success: false, error: 'Device does not support GATT' };
      }

      const server = await this.device.gatt.connect();

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
            } else {
              return { success: false, error: 'No writable characteristics found' };
            }
          } else {
            return { success: false, error: 'No services found on device' };
          }
        }
      }

      this.isConnected = true;
      return {
        success: true,
        deviceName: this.device.name || 'Bluetooth Printer'
      };
    } catch (error: any) {
      console.error('Bluetooth connection error:', error);
      return {
        success: false,
        error: error.message || 'Failed to connect to printer'
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.isConnected = false;
  }

  getConnectionStatus(): boolean {
    // Check if we have a device and characteristic ready
    return !!(this.device && this.characteristic);
  }

  getDeviceName(): string {
    return this.device?.name || 'Unknown Device';
  }

  async printReceipt(orderData: {
    orderNumber: string;
    date: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
    branchName?: string;
  }): Promise<{ success: boolean; error?: string }> {
    // Check if device is connected, try to reconnect if needed
    if (!this.device || !this.device.gatt?.connected) {
      if (this.device?.gatt) {
        try {
          await this.device.gatt.connect();
          // Re-establish characteristic connection
          const server = this.device.gatt;
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
        } catch (error) {
          return { success: false, error: 'Printer connection lost. Please reconnect from the Printer page.' };
        }
      } else {
        return { success: false, error: 'Printer not connected' };
      }
    }

    if (!this.characteristic) {
      return { success: false, error: 'Printer not connected' };
    }

    try {
      const ESC = '\x1B';
      const GS = '\x1D';

      let receipt = ESC + '@';
      
      receipt += ESC + 'a' + '\x01';
      receipt += ESC + '!' + '\x38';
      receipt += (orderData.branchName || 'RESTAURANT') + '\n';
      receipt += ESC + '!' + '\x00';
      receipt += '================================\n';
      
      receipt += ESC + 'a' + '\x00';
      receipt += ESC + '!' + '\x08';
      receipt += `Order: ${orderData.orderNumber}\n`;
      receipt += ESC + '!' + '\x00';
      receipt += `Date: ${orderData.date}\n`;
      receipt += '================================\n\n';
      
      receipt += 'ITEMS:\n';
      receipt += '--------------------------------\n';
      orderData.items.forEach(item => {
        const itemLine = `${item.quantity}x ${item.name}`;
        const price = `$${item.price.toFixed(2)}`;
        const spaces = 32 - itemLine.length - price.length;
        receipt += itemLine + ' '.repeat(Math.max(spaces, 1)) + price + '\n';
      });
      
      receipt += '================================\n';
      const subtotalLine = 'Subtotal:';
      const subtotalPrice = `$${orderData.subtotal.toFixed(2)}`;
      let spaces = 32 - subtotalLine.length - subtotalPrice.length;
      receipt += subtotalLine + ' '.repeat(Math.max(spaces, 1)) + subtotalPrice + '\n';
      
      const taxLine = 'Tax:';
      const taxPrice = `$${orderData.tax.toFixed(2)}`;
      spaces = 32 - taxLine.length - taxPrice.length;
      receipt += taxLine + ' '.repeat(Math.max(spaces, 1)) + taxPrice + '\n';
      
      receipt += '--------------------------------\n';
      const totalLine = 'TOTAL:';
      const totalPrice = `$${orderData.total.toFixed(2)}`;
      spaces = 32 - totalLine.length - totalPrice.length;
      receipt += ESC + '!' + '\x18';
      receipt += totalLine + ' '.repeat(Math.max(spaces, 1)) + totalPrice + '\n';
      receipt += ESC + '!' + '\x00';
      
      receipt += '================================\n\n';
      receipt += ESC + 'a' + '\x01';
      receipt += 'Thank you for your order!\n';
      receipt += 'Please come again\n\n';
      
      receipt += ESC + 'a' + '\x00';
      receipt += GS + 'V' + '\x00';

      const encoder = new TextEncoder();
      const data = encoder.encode(receipt);
      
      const chunkSize = 512;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await this.characteristic.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return { success: true };
    } catch (error: any) {
      console.error('Print error:', error);
      return {
        success: false,
        error: error.message || 'Failed to print receipt'
      };
    }
  }
}

export const bluetoothPrinterService = new BluetoothPrinterService();
