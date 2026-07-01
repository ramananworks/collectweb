import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getPaperWidth,
  setPaperWidth,
  getAutoPrint,
  setAutoPrint,
  printReceipt,
  isBluetoothPrintingAvailable,
  type PaperWidth,
} from "@/lib/bluetooth-print";
import { useCompany } from "@/hooks/use-data";
import { toast } from "sonner";

export default function PrintSettings() {
  const { data: company } = useCompany();
  const [width, setWidth] = useState<PaperWidth>(58);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    setWidth(getPaperWidth());
    setAuto(getAutoPrint());
  }, []);

  function handleWidth(v: string) {
    const w = (v === "80" ? 80 : 58) as PaperWidth;
    setWidth(w);
    setPaperWidth(w);
  }
  function handleAuto(v: boolean) {
    setAuto(v);
    setAutoPrint(v);
  }
  function handleTest() {
    const ok = printReceipt({
      companyName: company?.name || "My Company",
      companyPhone: (company as any)?.phone,
      companyAddress: (company as any)?.address,
      customerName: "Test Party",
      invoiceNumber: "TEST-001",
      invoiceDate: new Date().toLocaleDateString("en-IN"),
      paymentDate: new Date().toLocaleDateString("en-IN"),
      amount: 1234,
      mode: "cash",
      collectedBy: "Test Staff",
      outstandingAfter: 0,
      receiptNumber: "TEST",
    }, width);
    if (!ok) toast.error("Printing failed. Ensure Bluetooth printer is paired.");
    else toast.success("Test receipt sent to printer");
  }

  const native = isBluetoothPrintingAvailable();

  return (
    <div className="rounded-xl bg-card p-4 sm:p-5 stat-card-shadow max-w-xl">
      <div className="flex items-center gap-2 mb-4">
        <Printer className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Receipt Printing</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Print collection receipts on a paired 2" (58mm) or 3" (80mm) Bluetooth thermal printer.
        {native ? " Printer bridge detected." : " Native printer bridge not detected — receipts will use the system print dialog."}
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Paper width</Label>
          <RadioGroup value={String(width)} onValueChange={handleWidth} className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="58" id="w58" />
              <span className="text-sm">2 inch (58mm)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="80" id="w80" />
              <span className="text-sm">3 inch (80mm)</span>
            </label>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-print">Auto-print on collection</Label>
            <p className="text-xs text-muted-foreground">Send receipt automatically after recording a collection.</p>
          </div>
          <Switch id="auto-print" checked={auto} onCheckedChange={handleAuto} />
        </div>

        <Button variant="outline" onClick={handleTest} className="gap-2">
          <Printer className="h-4 w-4" /> Print test receipt
        </Button>
      </div>
    </div>
  );
}
