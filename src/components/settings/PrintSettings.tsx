import { useEffect, useState } from "react";
import { Printer, Bluetooth, Loader2, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  getPaperWidth, setPaperWidth,
  getAutoPrint, setAutoPrint,
  printReceipt, isBluetoothPrintingAvailable,
  hasPrinterBridge, listPrinters, connectPrinter, disconnectPrinter,
  getConnectedPrinter, getSavedPrinter, setSavedPrinter, ensurePrinterConnected,
  type PaperWidth, type BluetoothPrinterDevice,
} from "@/lib/bluetooth-print";
import { useCompany } from "@/hooks/use-data";
import { toast } from "sonner";

export default function PrintSettings() {
  const { data: company } = useCompany();
  const [width, setWidth] = useState<PaperWidth>(58);
  const [auto, setAuto] = useState(false);
  const [saved, setSaved] = useState<BluetoothPrinterDevice | null>(null);
  const [connected, setConnected] = useState<BluetoothPrinterDevice | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothPrinterDevice[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  useEffect(() => {
    setWidth(getPaperWidth());
    setAuto(getAutoPrint());
    setSaved(getSavedPrinter());
    setConnected(getConnectedPrinter());
  }, []);

  function refreshState() {
    setSaved(getSavedPrinter());
    setConnected(getConnectedPrinter());
  }

  function handleWidth(v: string) {
    const w = (v === "80" ? 80 : 58) as PaperWidth;
    setWidth(w);
    setPaperWidth(w);
  }
  function handleAuto(v: boolean) {
    setAuto(v);
    setAutoPrint(v);
  }

  function openScan() {
    setScanOpen(true);
    setScanning(true);
    // small delay lets the native scan populate
    setTimeout(() => {
      setDevices(listPrinters());
      setScanning(false);
    }, 400);
  }

  function rescan() {
    setScanning(true);
    setTimeout(() => {
      setDevices(listPrinters());
      setScanning(false);
    }, 400);
  }

  function pickDevice(d: BluetoothPrinterDevice) {
    setConnectingId(d.id);
    const res = connectPrinter(d.id);
    setConnectingId(null);
    if (!res.ok) {
      toast.error(res.message || `Could not connect to ${d.name}`);
      return;
    }
    setSavedPrinter(d);
    refreshState();
    setScanOpen(false);
    toast.success(`Connected to ${d.name}`);
  }

  function handleDisconnect() {
    disconnectPrinter();
    setSavedPrinter(null);
    refreshState();
    toast.success("Printer disconnected");
  }

  function handleTest() {
    ensurePrinterConnected();
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

  const nativePrint = isBluetoothPrintingAvailable();
  const canPair = hasPrinterBridge();
  const activeName = connected?.name || saved?.name;

  return (
    <div className="rounded-xl bg-card p-4 sm:p-5 stat-card-shadow max-w-xl">
      <div className="flex items-center gap-2 mb-4">
        <Printer className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Receipt Printing</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Print collection receipts on a paired 2" (58mm) or 3" (80mm) Bluetooth thermal printer.
        {nativePrint ? " Printer bridge detected." : " Native printer bridge not detected — receipts will use the system print dialog."}
      </p>

      <div className="space-y-5">
        {/* Printer device */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bluetooth className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Printer device</Label>
          </div>
          {canPair ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {activeName ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-medium truncate">{activeName}</span>
                      {!connected && saved && (
                        <span className="text-xs text-muted-foreground">(saved)</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not connected</span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={openScan}>
                    {activeName ? "Change" : "Scan & connect"}
                  </Button>
                  {(saved || connected) && (
                    <Button size="sm" variant="ghost" onClick={handleDisconnect}>
                      Disconnect
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Saved printer auto-reconnects before each receipt.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              In-app pairing needs the CollectWeb Android app. In a browser, receipts open the system print dialog where you can pick any paired printer.
            </p>
          )}
        </div>

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

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Bluetooth printer</DialogTitle>
            <DialogDescription>
              Make sure your thermal printer is powered on and in range.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-[160px] max-h-[320px] overflow-y-auto rounded-md border divide-y">
            {scanning ? (
              <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Scanning nearby printers…
              </div>
            ) : devices.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground text-center px-4">
                No printers found. Pair the printer in Android Bluetooth settings, then rescan.
              </div>
            ) : (
              devices.map((d) => {
                const isSaved = saved?.id === d.id;
                const isConn = connected?.id === d.id;
                const isBusy = connectingId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => pickDevice(d)}
                    disabled={isBusy}
                    className="w-full text-left px-3 py-3 hover:bg-accent flex items-center gap-3 disabled:opacity-60"
                  >
                    <Bluetooth className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{d.name || d.id}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.paired ? "Paired" : "Available"}{isConn ? " · Connected" : isSaved ? " · Saved" : ""}
                      </div>
                    </div>
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : isConn ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter className="sm:justify-between gap-2">
            <Button variant="outline" onClick={rescan} disabled={scanning}>
              {scanning ? "Scanning…" : "Rescan"}
            </Button>
            <Button variant="ghost" onClick={() => setScanOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
