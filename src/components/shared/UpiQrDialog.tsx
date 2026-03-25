import { useState, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/hooks/use-data";

interface UpiQrDialogProps {
  amount: number;
  upiId: string;
  businessName: string;
}

export default function UpiQrDialog({ amount, upiId, businessName }: UpiQrDialogProps) {
  const [open, setOpen] = useState(false);
  const [debouncedAmount, setDebouncedAmount] = useState(amount);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(amount), 400);
    return () => clearTimeout(t);
  }, [amount]);

  const upiUri = useMemo(() => {
    if (!upiId || debouncedAmount <= 0) return "";
    return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(businessName)}&am=${debouncedAmount}&cu=INR`;
  }, [upiId, businessName, debouncedAmount]);

  const isAmountValid = amount > 0;
  const isUpiConfigured = !!upiId;
  const canShowQr = isAmountValid && isUpiConfigured;

  return (
    <>
      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={!canShowQr}
          onClick={() => setOpen(true)}
        >
          <QrCode className="h-4 w-4" /> Show QR Code
        </Button>
        {!isUpiConfigured && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> UPI ID not configured in Settings
          </p>
        )}
        {isUpiConfigured && !isAmountValid && (
          <p className="text-xs text-muted-foreground">Enter valid amount to generate QR</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm max-w-[92vw] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-center">Scan & Pay via UPI</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 px-6 pb-2">
            <p className="text-2xl font-bold text-primary">{formatCurrency(debouncedAmount)}</p>
            <p className="text-sm text-muted-foreground">{businessName}</p>
            {upiUri ? (
              <div className="rounded-xl border bg-background p-4">
                <QRCodeSVG
                  value={upiUri}
                  size={250}
                  level="M"
                  className="h-[200px] w-[200px] sm:h-[250px] sm:w-[250px]"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Cannot generate QR code</p>
            )}
            <p className="text-xs text-muted-foreground text-center break-all">{upiId}</p>
          </div>
          <div className="px-6 pb-6 pt-2">
            <Button className="w-full" variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
