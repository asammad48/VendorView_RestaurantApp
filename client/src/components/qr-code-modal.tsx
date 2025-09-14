import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useRef } from "react";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: string;
  branchName: string;
  qrCodeBase64?: string;
}

// QR Code display component that handles base64 images
const QRCodeDisplay = ({ base64Image, tableNumber, size = 200 }: { base64Image?: string; tableNumber: string; size?: number }) => {
  if (base64Image && base64Image.trim() !== '') {
    // Use the actual base64 QR code from API
    return (
      <div 
        className="bg-white border-2 border-gray-300 flex items-center justify-center p-2"
        style={{ width: size, height: size }}
      >
        <img 
          src={`data:image/png;base64,${base64Image}`}
          alt={`QR Code for ${tableNumber}`}
          style={{ maxWidth: size - 20, maxHeight: size - 20 }}
          className="object-contain"
        />
      </div>
    );
  }
  
  // Fallback: Simple QR code placeholder if no base64 image
  return (
    <div 
      className="bg-white border-2 border-gray-300 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="text-center text-gray-500">
        <div className="text-sm font-medium mb-2">QR Code</div>
        <div className="text-xs">Not Available</div>
      </div>
    </div>
  );
};

export default function QRCodeModal({ open, onOpenChange, tableNumber, branchName, qrCodeBase64 }: QRCodeModalProps) {
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (qrCodeBase64 && qrCodeBase64.trim() !== '') {
      // Download the actual base64 QR code image
      const link = document.createElement('a');
      link.download = `${tableNumber.replace(/\s+/g, '_')}_QR_Code.png`;
      link.href = `data:image/png;base64,${qrCodeBase64}`;
      link.click();
    } else {
      // Fallback: create a simple QR placeholder image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = 300;
      
      canvas.width = size;
      canvas.height = size + 60;
      
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code Not Available', size / 2, size / 2);
        ctx.fillText(`${tableNumber} - ${branchName}`, size / 2, size + 30);
        
        const link = document.createElement('a');
        link.download = `${tableNumber.replace(/\s+/g, '_')}_QR_Code.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrImageSrc = qrCodeBase64 && qrCodeBase64.trim() !== '' 
        ? `data:image/png;base64,${qrCodeBase64}` 
        : '';
        
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code - ${tableNumber}</title>
            <style>
              body {
                margin: 0;
                padding: 40px;
                display: flex;
                flex-direction: column;
                align-items: center;
                font-family: Arial, sans-serif;
              }
              .qr-container {
                text-align: center;
                margin-bottom: 20px;
              }
              .qr-title {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #333;
              }
              .qr-subtitle {
                font-size: 16px;
                color: #666;
                margin-bottom: 30px;
              }
              .qr-code {
                border: 2px solid #ccc;
                display: inline-block;
                padding: 20px;
                background: white;
              }
              .qr-image {
                max-width: 200px;
                max-height: 200px;
              }
              @media print {
                body { margin: 0; padding: 20px; }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="qr-title">${tableNumber}</div>
              <div class="qr-subtitle">${branchName}</div>
              <div class="qr-code">
                ${qrImageSrc ? `<img src="${qrImageSrc}" alt="QR Code" class="qr-image" />` : 'QR Code Not Available'}
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const qrValue = `table:${tableNumber.toLowerCase().replace(/\s+/g, '')}-${branchName.toLowerCase().replace(/\s+/g, '')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="qr-code-modal">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-2xl font-bold text-gray-900" data-testid="qr-modal-title">
            QR Code
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* Table Information */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-1" data-testid="qr-table-number">
              {tableNumber}
            </h3>
            <p className="text-sm text-gray-600" data-testid="qr-branch-name">
              {branchName}
            </p>
          </div>

          {/* QR Code */}
          <div 
            ref={qrCodeRef}
            className="flex justify-center p-4 bg-gray-50 rounded-lg"
            data-testid="qr-code-display"
          >
            <QRCodeDisplay base64Image={qrCodeBase64} tableNumber={tableNumber} size={200} />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 w-full">
            <Button
              onClick={handleDownload}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              data-testid="button-download-qr"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              data-testid="button-print-qr"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Scan this QR code to access the menu and place orders for {tableNumber}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}