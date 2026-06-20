import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Smartphone, UtensilsCrossed } from "lucide-react";
import { useRef, useMemo } from "react";
import { apiBaseUrl } from "@/config/environment";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: string;
  branchName: string;
  qrCodeBase64?: string;
  branchLogoUrl?: string;
}

const QRCodeDisplay = ({ base64Image, tableNumber, size = 200 }: { base64Image?: string; tableNumber: string; size?: number }) => {
  if (base64Image && base64Image.trim() !== '') {
    return (
      <img
        src={`data:image/png;base64,${base64Image}`}
        alt={`QR Code for ${tableNumber}`}
        style={{ width: size, height: size }}
        className="object-contain"
      />
    );
  }
  return (
    <div
      className="bg-white flex items-center justify-center text-gray-400 text-sm"
      style={{ width: size, height: size }}
    >
      QR Not Available
    </div>
  );
};

export default function QRCodeModal({ open, onOpenChange, tableNumber, branchName, qrCodeBase64, branchLogoUrl }: QRCodeModalProps) {
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const fullBranchLogoUrl = useMemo(() => {
    if (!branchLogoUrl) return '';
    return branchLogoUrl.startsWith('http') ? branchLogoUrl : `${apiBaseUrl}/${branchLogoUrl}`;
  }, [branchLogoUrl]);

  const handleDownload = async () => {
    if (qrCodeBase64 && qrCodeBase64.trim() !== '') {
      const link = document.createElement('a');
      link.download = `${tableNumber.replace(/\s+/g, '_')}_QR_Code.png`;
      link.href = `data:image/png;base64,${qrCodeBase64}`;
      link.click();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrImageSrc = qrCodeBase64 && qrCodeBase64.trim() !== ''
      ? `data:image/png;base64,${qrCodeBase64}`
      : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${tableNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', sans-serif;
              background: #f0f0f0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            .card {
              background: #f8f5f0;
              width: 380px;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0,0,0,0.2);
              border: 1.5px solid #15803d40;
            }
            .card-header {
              background: #0f2417;
              padding: 24px 20px 28px;
              text-align: center;
              position: relative;
            }
            .card-header::after {
              content: '';
              position: absolute;
              bottom: 0; left: 0; right: 0;
              height: 3px;
              background: linear-gradient(90deg, transparent, #15803d, #22c55e, #15803d, transparent);
            }
            .logo-circle {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              border: 2px solid #15803d60;
              margin: 0 auto 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              background: #1a3020;
            }
            .logo-circle img { width: 100%; height: 100%; object-fit: contain; }
            .logo-initials {
              color: #15803d;
              font-size: 22px;
              font-weight: 700;
              letter-spacing: 2px;
            }
            .brand-name {
              color: #ffffff;
              font-size: 11px;
              letter-spacing: 4px;
              text-transform: uppercase;
              font-weight: 500;
              margin-top: 4px;
            }
            .card-body {
              padding: 28px 32px 24px;
              text-align: center;
            }
            .table-label {
              font-family: 'Playfair Display', Georgia, serif;
              font-size: 48px;
              font-weight: 700;
              color: #0f2417;
              line-height: 1;
              margin-bottom: 12px;
            }
            .divider {
              display: flex;
              align-items: center;
              gap: 8px;
              margin: 0 auto 12px;
              justify-content: center;
            }
            .divider-line {
              height: 1px;
              width: 80px;
              background: #15803d;
            }
            .divider-diamond {
              width: 8px;
              height: 8px;
              background: #15803d;
              transform: rotate(45deg);
            }
            .branch-label {
              font-size: 15px;
              color: #4b5563;
              font-weight: 400;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              border: 1.5px solid #15803d60;
              border-radius: 14px;
              padding: 16px;
              background: white;
              display: inline-block;
              margin-bottom: 22px;
            }
            .qr-wrapper img { display: block; width: 220px; height: 220px; }
            .qr-placeholder {
              width: 220px; height: 220px;
              display: flex; align-items: center; justify-content: center;
              color: #9ca3af; font-size: 13px;
            }
            .scan-row {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              margin-bottom: 16px;
            }
            .scan-icon {
              width: 32px; height: 32px;
              border: 1.5px solid #15803d;
              border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              color: #15803d;
            }
            .scan-text {
              font-size: 16px;
              font-weight: 700;
              color: #0f2417;
            }
            .card-footer {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              padding: 14px 20px;
              border-top: 1px solid #15803d30;
            }
            .footer-icon { color: #15803d; font-size: 18px; }
            .footer-text { font-size: 12px; color: #6b7280; }
            @media print {
              body { background: white; padding: 0; margin: 0; }
              .card { box-shadow: none; margin: 0 auto; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-header">
              <div class="logo-circle">
                ${fullBranchLogoUrl
                  ? `<img src="${fullBranchLogoUrl}" alt="${branchName}" />`
                  : `<span class="logo-initials">${branchName.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}</span>`
                }
              </div>
              <div class="brand-name">${branchName}</div>
            </div>
            <div class="card-body">
              <div class="table-label">${tableNumber}</div>
              <div class="divider">
                <div class="divider-line"></div>
                <div class="divider-diamond"></div>
                <div class="divider-line"></div>
              </div>
              <div class="branch-label">${branchName}</div>
              <div class="qr-wrapper">
                ${qrImageSrc
                  ? `<img src="${qrImageSrc}" alt="QR Code" />`
                  : `<div class="qr-placeholder">QR Code Not Available</div>`
                }
              </div>
              <div class="scan-row">
                <div class="scan-icon">&#128241;</div>
                <span class="scan-text">Scan to View Menu &amp; Order</span>
              </div>
              <div class="divider">
                <div class="divider-line"></div>
                <div class="divider-diamond"></div>
                <div class="divider-line"></div>
              </div>
            </div>
            <div class="card-footer">
              <span class="footer-icon">&#127860;</span>
              <span class="footer-text">Fast, contactless ordering for ${tableNumber}</span>
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
      <DialogContent className="p-0 overflow-hidden max-w-sm border-0 shadow-2xl" data-testid="qr-code-modal">
        {/* Dark header */}
        <div className="relative bg-[#0f2417] pt-6 pb-8 text-center">
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{ background: 'linear-gradient(90deg, transparent, #15803d, #22c55e, #15803d, transparent)' }}
          />
          {/* Logo */}
          <div className="w-14 h-14 rounded-full border border-[#15803d60] mx-auto mb-2 flex items-center justify-center overflow-hidden bg-[#1a3020]">
            {fullBranchLogoUrl
              ? <img src={fullBranchLogoUrl} alt={branchName} className="w-full h-full object-contain" />
              : <span className="text-[#15803d] font-bold text-lg tracking-widest">
                  {branchName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
            }
          </div>
          <p className="text-white text-[10px] tracking-[4px] uppercase font-medium">{branchName}</p>
        </div>

        {/* Body */}
        <div className="bg-[#f8f5f0] px-8 pt-7 pb-5 text-center">
          {/* Table name */}
          <h2 className="font-serif text-5xl font-bold text-[#0f2417] mb-3" style={{ fontFamily: 'Georgia, serif' }}>
            {tableNumber}
          </h2>

          {/* Divider */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-20 bg-[#15803d]" />
            <div className="w-2 h-2 bg-[#15803d] rotate-45" />
            <div className="h-px w-20 bg-[#15803d]" />
          </div>

          <p className="text-sm text-gray-500 mb-5">{branchName}</p>

          {/* QR Code box */}
          <div
            ref={qrCodeRef}
            className="border border-[#15803d60] rounded-2xl p-4 bg-white inline-block mb-5"
            data-testid="qr-code-display"
          >
            <QRCodeDisplay base64Image={qrCodeBase64} tableNumber={tableNumber} size={200} />
          </div>

          {/* Scan row */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full border border-[#15803d] flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-[#15803d]" />
            </div>
            <span className="text-base font-bold text-[#0f2417]">Scan to View Menu &amp; Order</span>
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="h-px w-20 bg-[#15803d]" />
            <div className="w-2 h-2 bg-[#15803d] rotate-45" />
            <div className="h-px w-20 bg-[#15803d]" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleDownload}
              className="flex-1 bg-[#15803d] hover:bg-[#166534] text-white"
              data-testid="button-download-qr"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1 border-[#15803d] text-[#15803d] hover:bg-[#15803d]/5"
              data-testid="button-print-qr"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f8f5f0] flex items-center justify-center gap-2 py-3 border-t border-[#15803d30]">
          <UtensilsCrossed className="w-4 h-4 text-[#15803d]" />
          <span className="text-xs text-gray-500">Fast, contactless ordering for {tableNumber}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
