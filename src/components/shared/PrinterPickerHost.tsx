import { useEffect, useState } from "react";
import { Bluetooth, Loader2, Check } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  listPrinters, connectPrinter, setSavedPrinter, getSavedPrinter, getConnectedPrinter,
  type BluetoothPrinterDevice,
} from "@/lib/bluetooth-print";
import { toast } from "sonner";

// Simple pub/sub for opening the picker from anywhere.
type Resolver = (device: BluetoothPrinterDevice | null) => void;
let pendingResolver: Resolver | null = null;

export function promptPickPrinter(): Promise<BluetoothPrinterDevice | null> {
  return new Promise((resolve) => {
    pendingResolver = resolve;
    window.dispatchEvent(new CustomEvent("cw:pick-printer"));
  });
}

export default function PrinterPickerHost() {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothPrinterDevice[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      rescan();
    };
    window.addEventListener("cw:pick-printer", onOpen);
    return () => window.removeEventListener("cw:pick-printer", onOpen);
  }, []);

  function rescan() {
    setScanning(true);
    setTimeout(() => {
      setDevices(listPrinters());
      setScanning(false);
    }, 300);
  }

  function finish(device: BluetoothPrinterDevice | null) {
    setOpen(false);
    const r = pendingResolver;
    pendingResolver = null;
    r?.(device);
  }

  function pick(d: BluetoothPrinterDevice) {
    setBusyId(d.id);
    const res = connectPrinter(d.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.message || `Could not connect to ${d.name}`);
      return;
    }
    setSavedPrinter(d);
    toast.success(`Connected to ${d.name}`);
    finish(d);
  }

  const saved = getSavedPrinter();
  const connected = getConnectedPrinter();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) finish(null);
        else setOpen(true);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choose Bluetooth printer</DialogTitle>
          <DialogDescription>
            Select which paired printer to send this receipt to. Your choice will be remembered for next time.
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
              const busy = busyId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => pick(d)}
                  disabled={busy}
                  className="w-full text-left px-3 py-3 hover:bg-accent flex items-center gap-3 disabled:opacity-60"
                >
                  <Bluetooth className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name || d.id}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {d.paired ? "Paired" : "Available"}
                      {isConn ? " · Connected" : isSaved ? " · Saved" : ""}
                    </div>
                  </div>
                  {busy ? (
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
          <Button variant="ghost" onClick={() => finish(null)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
