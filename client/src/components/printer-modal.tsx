import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bluetooth, Printer as PrinterIcon, CheckCircle, XCircle, Activity } from "lucide-react";
import { bluetoothPrinterService } from "@/services/bluetoothPrinterService";
import { signalRService } from "@/services/signalRService";
import { toast } from "@/hooks/use-toast";
import { apiRepository } from "@/lib/apiRepository";
import { DetailedOrder } from "@/types/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface PrinterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export default function PrinterModal({ open, onOpenChange, onConnectionChange }: PrinterModalProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry['type'], message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, type, message }]);
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        setDeviceName(bluetoothPrinterService.getDeviceName());
      } else {
        setDeviceName("");
      }
    };

    // Set initial status when modal opens
    if (open) {
      const connected = bluetoothPrinterService.getConnectionStatus();
      setIsConnected(connected);
      if (connected) {
        setDeviceName(bluetoothPrinterService.getDeviceName());
      }
    }

    // Listen for connection changes
    bluetoothPrinterService.onConnectionChange(handleConnectionChange);

    return () => {
      bluetoothPrinterService.offConnectionChange(handleConnectionChange);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return; // Only setup SignalR when modal is open

    const handleOrderCreated = async (payload: { orderId: number; orderNumber: string }) => {
      addLog('info', `New order received: ${payload.orderNumber} (ID: ${payload.orderId})`);

      if (!bluetoothPrinterService.getConnectionStatus()) {
        addLog('warning', 'Printer not connected! Please connect printer to print orders.');
        toast({
          title: "Printer Not Connected",
          description: "Please connect the Bluetooth printer to automatically print orders.",
          variant: "destructive",
        });
        return;
      }

      try {
        addLog('info', `Fetching order details for ${payload.orderNumber}...`);
        
        const response = await apiRepository.call<DetailedOrder>(
          'getOrderById',
          'GET',
          undefined,
          {},
          true,
          { orderId: payload.orderId }
        );
        
        if (response.error || !response.data) {
          addLog('error', `Failed to fetch order details: ${response.error || 'Unknown error'}`);
          return;
        }

        const order: DetailedOrder = response.data;
        addLog('success', `Order details retrieved successfully`);

        const items = order.orderItems.map(item => ({
          name: `${item.itemName} (${item.variantName})`,
          quantity: item.quantity,
          price: item.totalPrice
        }));

        addLog('info', `Printing receipt for order ${payload.orderNumber}...`);
        
        const printResult = await bluetoothPrinterService.printReceipt({
          orderNumber: order.orderNumber,
          date: new Date(order.createdAt).toLocaleString(),
          items,
          subtotal: order.subTotal,
          tax: order.taxAmount,
          total: order.totalAmount,
          branchName: order.branchName
        });

        if (printResult.success) {
          addLog('success', `Receipt printed successfully for ${payload.orderNumber}`);
          toast({
            title: "Receipt Printed",
            description: `Order ${payload.orderNumber} has been printed.`,
          });
        } else {
          addLog('error', `Print failed: ${printResult.error}`);
          toast({
            title: "Print Failed",
            description: printResult.error || "Failed to print receipt",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        addLog('error', `Error processing order: ${error.message || 'Unknown error'}`);
      }
    };

    const connectAndSetup = async () => {
      try {
        if (!signalRService.isConnected()) {
          await signalRService.connect(() => apiRepository.getAccessToken());
          addLog('success', 'Connected to real-time order notifications');
        }
        
        signalRService.onOrderCreated(handleOrderCreated);
        addLog('info', 'Listening for new order events');
      } catch (error) {
        addLog('error', 'Failed to connect to order notifications');
      }
    };

    connectAndSetup();

    return () => {
      // Cleanup SignalR subscription when modal closes
      signalRService.offOrderCreated(handleOrderCreated);
    };
  }, [open]); // Only depend on 'open' to avoid re-subscription loops

  const handleConnectPrinter = async () => {
    setIsConnecting(true);
    addLog('info', 'Attempting to connect to Bluetooth printer...');

    const result = await bluetoothPrinterService.connect();

    if (result.success) {
      setIsConnected(true);
      setDeviceName(result.deviceName || 'Bluetooth Printer');
      addLog('success', `Connected to ${result.deviceName || 'Bluetooth Printer'}`);
      toast({
        title: "Printer Connected",
        description: `Successfully connected to ${result.deviceName}`,
      });
      onConnectionChange?.(true);
    } else {
      addLog('error', `Connection failed: ${result.error || 'Unknown error'}`);
      toast({
        title: "Connection Failed",
        description: result.error || "Failed to connect to printer",
        variant: "destructive",
      });
    }

    setIsConnecting(false);
  };

  const handleDisconnectPrinter = async () => {
    await bluetoothPrinterService.disconnect();
    setIsConnected(false);
    setDeviceName("");
    addLog('info', 'Disconnected from Bluetooth printer');
    toast({
      title: "Printer Disconnected",
      description: "Bluetooth printer has been disconnected",
    });
    onConnectionChange?.(false);
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <Activity className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-400';
      case 'error':
        return 'text-red-700 dark:text-red-400';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-400';
      default:
        return 'text-blue-700 dark:text-blue-400';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Bluetooth Printer</DialogTitle>
          <DialogDescription>
            Automatically print receipts when new orders arrive
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bluetooth className="h-5 w-5" />
                Printer Connection
              </CardTitle>
              <CardDescription>
                Connect your Bluetooth thermal printer to automatically print order receipts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg" data-testid="container-connection-status">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} data-testid="indicator-connection"></div>
                  <div>
                    <p className="font-medium" data-testid="text-connection-status">
                      {isConnected ? 'Connected' : 'Not Connected'}
                    </p>
                    {isConnected && deviceName && (
                      <p className="text-sm text-muted-foreground" data-testid="text-device-name">{deviceName}</p>
                    )}
                  </div>
                </div>
                <PrinterIcon className={`h-6 w-6 ${isConnected ? 'text-green-500' : 'text-gray-400'}`} />
              </div>

              {!isConnected ? (
                <Button 
                  onClick={handleConnectPrinter} 
                  className="w-full" 
                  disabled={isConnecting}
                  data-testid="button-connect-printer"
                >
                  <Bluetooth className="mr-2 h-4 w-4" />
                  {isConnecting ? 'Connecting...' : 'Connect Printer'}
                </Button>
              ) : (
                <Button 
                  onClick={handleDisconnectPrinter} 
                  variant="outline" 
                  className="w-full"
                  data-testid="button-disconnect-printer"
                >
                  Disconnect Printer
                </Button>
              )}

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> Make sure your Bluetooth printer is turned on and in pairing mode before connecting.
                  This feature works best with ESC/POS compatible thermal printers.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Real-time connection and printing activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">SignalR Connection</span>
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Printer Status</span>
                  <span className={`text-sm font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                    {isConnected ? 'Ready' : 'Not Connected'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Auto-Print</span>
                  <span className={`text-sm font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                    {isConnected ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Activity Logs</CardTitle>
            <CardDescription>
              View connection status and print activity in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full rounded-md border bg-muted/30 overflow-hidden" data-testid="container-activity-logs">
              <ScrollArea className="h-full w-full p-4">
                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No activity yet. Connect your printer to start monitoring.
                    </p>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm" data-testid={`log-entry-${index}`}>
                        {getLogIcon(log.type)}
                        <div className="flex-1">
                          <span className="text-gray-500 text-xs">[{log.timestamp}]</span>
                          <span className={`ml-2 ${getLogColor(log.type)}`}>{log.message}</span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
