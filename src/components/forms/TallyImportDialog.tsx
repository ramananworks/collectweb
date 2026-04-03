import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Loader2, CheckCircle2, AlertCircle, Download, Wifi, WifiOff, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBulkImportCustomers } from "@/hooks/use-data";

interface TallyCustomer {
  name: string;
  phone: string;
  address: string;
  area: string;
  gstin: string;
}

const MIDDLEWARE_DEFAULT_URL = "http://localhost:3456";

export default function TallyImportDialog() {
  const [open, setOpen] = useState(false);
  const [middlewareUrl, setMiddlewareUrl] = useState(MIDDLEWARE_DEFAULT_URL);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error" | "fetching" | "no_middleware">("idle");
  const [tallyConnected, setTallyConnected] = useState(false);
  const [customers, setCustomers] = useState<TallyCustomer[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const bulkImport = useBulkImportCustomers();

  async function checkMiddleware() {
    setStatus("connecting");
    try {
      const resp = await fetch(`${middlewareUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await resp.json();
      if (data.status === "ok") {
        setTallyConnected(data.tally === true);
        setStatus("connected");
        toast({
          title: data.tally ? "Connected to Tally Bridge & Tally Prime" : "Tally Bridge running, but Tally Prime not detected",
          description: data.tally ? undefined : "Make sure Tally Prime is running with HTTP enabled on port 9000",
          variant: data.tally ? "default" : "destructive",
        });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("no_middleware");
    }
  }

  async function fetchCustomers() {
    setStatus("fetching");
    try {
      const resp = await fetch(`${middlewareUrl}/api/customers`, {
        signal: AbortSignal.timeout(20000),
      });
      const data = await resp.json();
      if (data.success && data.customers?.length > 0) {
        setCustomers(data.customers);
        setSelected(new Set(data.customers.map((_: any, i: number) => i)));
        setStatus("connected");
        toast({ title: `Found ${data.customers.length} customers from Tally` });
      } else if (data.success && data.customers?.length === 0) {
        toast({ title: "No customers found", description: "No Sundry Debtors found in Tally.", variant: "destructive" });
        setStatus("connected");
      } else {
        toast({ title: "Error", description: data.error || "Failed to fetch from Tally", variant: "destructive" });
        setStatus("connected");
      }
    } catch {
      toast({ title: "Connection failed", description: "Cannot reach Tally Bridge. Make sure it's running.", variant: "destructive" });
      setStatus("no_middleware");
    }
  }

  function toggleSelect(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === customers.length) setSelected(new Set());
    else setSelected(new Set(customers.map((_, i) => i)));
  }

  function handleImport() {
    const toImport = customers.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;
    bulkImport.mutate(toImport, {
      onSuccess: (data) => {
        const areasMsg = data && data.newAreasCount > 0
          ? ` ${data.newAreasCount} new area${data.newAreasCount > 1 ? "s" : ""} created.`
          : "";
        toast({ title: "Import complete", description: `${toImport.length} customers imported from Tally.${areasMsg}` });
        setCustomers([]);
        setSelected(new Set());
        setOpen(false);
      },
      onError: (err) => {
        toast({ title: "Import failed", description: err.message, variant: "destructive" });
      },
    });
  }

  function downloadBridge() {
    const a = document.createElement("a");
    a.href = "/tally-bridge.zip";
    a.download = "tally-bridge.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleClose() {
    setOpen(false);
    setStatus("idle");
    setTallyConnected(false);
    setCustomers([]);
    setSelected(new Set());
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Database className="h-4 w-4" /> Import from Tally
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Import from Tally Prime
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Middleware connection */}
          <div className="space-y-2">
            <Label>Tally Bridge URL</Label>
            <div className="flex gap-2">
              <Input
                value={middlewareUrl}
                onChange={(e) => setMiddlewareUrl(e.target.value)}
                placeholder="http://localhost:3456"
                className="flex-1"
              />
              <Button
                onClick={status === "connected" && tallyConnected ? fetchCustomers : checkMiddleware}
                disabled={status === "connecting" || status === "fetching"}
                className="gap-2 shrink-0"
              >
                {(status === "connecting" || status === "fetching") && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === "connected" && <Wifi className="h-4 w-4" />}
                {status === "connected" && tallyConnected ? "Fetch Customers" : "Connect"}
              </Button>
            </div>
          </div>

          {/* Connected but Tally not running */}
          {status === "connected" && !tallyConnected && customers.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Tally Bridge is running, but Tally Prime is not detected. Start Tally Prime and enable HTTP on port 9000.
            </div>
          )}

          {/* Connected and Tally running */}
          {status === "connected" && tallyConnected && customers.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" /> Connected to Tally Bridge & Tally Prime. Click "Fetch Customers" to load Sundry Debtors.
            </div>
          )}

          {/* Connection error */}
          {status === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <WifiOff className="h-4 w-4" /> Cannot connect. Check the Tally Bridge URL.
            </div>
          )}

          {/* Middleware not running — setup instructions */}
          {status === "no_middleware" && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" /> Tally Bridge not detected
              </div>
              <p className="text-sm text-muted-foreground">
                To import from Tally, you need to install and run the <strong>Tally Bridge</strong> on the same PC where Tally Prime is running.
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1.5">
                <li>Download the Tally Bridge package below</li>
                <li>Extract the zip on your Windows PC</li>
                <li>Double-click <code className="text-xs bg-muted px-1 py-0.5 rounded">install.bat</code> to set up</li>
                <li>Run <code className="text-xs bg-muted px-1 py-0.5 rounded">tally-bridge.exe</code> (or <code className="text-xs bg-muted px-1 py-0.5 rounded">node server.js</code>)</li>
                <li>Come back here and click <strong>Connect</strong></li>
              </ol>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="gap-2" onClick={downloadBridge}>
                  <Download className="h-4 w-4" /> Download Tally Bridge
                </Button>
                <Button variant="ghost" size="sm" className="gap-2" asChild>
                  <a href="/tally-bridge/README.md" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Setup Guide
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Customer preview table */}
          {customers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{customers.length} customers found</span>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selected.size === customers.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="p-2 w-8"></th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Area</th>
                      <th className="p-2">GSTIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr
                        key={i}
                        className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 ${selected.has(i) ? "" : "opacity-50"}`}
                        onClick={() => toggleSelect(i)}
                      >
                        <td className="p-2">
                          <input type="checkbox" checked={selected.has(i)} readOnly className="rounded" />
                        </td>
                        <td className="p-2 font-medium">{c.name}</td>
                        <td className="p-2">{c.phone || "—"}</td>
                        <td className="p-2">{c.area || "—"}</td>
                        <td className="p-2">{c.gstin || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            {customers.length > 0 && (
              <Button
                onClick={handleImport}
                disabled={selected.size === 0 || bulkImport.isPending}
                className="gradient-primary text-primary-foreground"
              >
                {bulkImport.isPending ? "Importing..." : `Import ${selected.size} Customers`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
