import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Loader2, CheckCircle2, AlertCircle, Download, Wifi, WifiOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBulkImportCustomers } from "@/hooks/use-data";

interface TallyCustomer {
  name: string;
  phone: string;
  address: string;
  area: string;
  gstin: string;
}

const TALLY_XML_REQUEST = `<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>List of Accounts</ID></HEADER>
<BODY><DESC><STATICVARIABLES><ACCOUNTTYPE>Sundry Debtors</ACCOUNTTYPE></STATICVARIABLES></DESC></BODY>
</ENVELOPE>`;

const FALLBACK_SCRIPT = `#!/usr/bin/env python3
"""
Tally Prime Customer Export Script
Run this on the same PC where Tally Prime is running.
Usage: python tally_export.py > customers.csv
"""
import urllib.request
import xml.etree.ElementTree as ET
import csv, sys

TALLY_URL = "http://localhost:9000"

xml_req = """<ENVELOPE>
<HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>List of Accounts</ID></HEADER>
<BODY><DESC><STATICVARIABLES><ACCOUNTTYPE>Sundry Debtors</ACCOUNTTYPE></STATICVARIABLES></DESC></BODY>
</ENVELOPE>"""

try:
    req = urllib.request.Request(TALLY_URL, data=xml_req.encode(), headers={"Content-Type": "text/xml"})
    resp = urllib.request.urlopen(req, timeout=10)
    root = ET.fromstring(resp.read())
except Exception as e:
    print(f"Error connecting to Tally: {e}", file=sys.stderr)
    sys.exit(1)

w = csv.writer(sys.stdout)
w.writerow(["name", "phone", "address", "area", "gstin"])

for ledger in root.iter("LEDGER"):
    name = ledger.findtext("NAME", "").strip()
    if not name:
        continue
    addr_lines = []
    addr_el = ledger.find(".//ADDRESS.LIST")
    if addr_el is not None:
        for a in addr_el.findall("ADDRESS"):
            if a.text:
                addr_lines.append(a.text.strip())
    phone = ""
    for tag in ["LEDGERPHONE", "LEDGERMOBILE", "PHONENUMBER"]:
        val = ledger.findtext(tag, "").strip()
        if val:
            phone = val
            break
    area = ledger.findtext("LEDSTATENAME", "").strip() or ledger.findtext("COUNTRYNAME", "").strip()
    gstin = ledger.findtext("PARTYGSTIN", "").strip() or ledger.findtext("GSTIN", "").strip()
    w.writerow([name, phone, ", ".join(addr_lines), area, gstin])

print("Export complete.", file=sys.stderr)
`;

function getTextContent(el: Element, tagName: string): string {
  const found = el.getElementsByTagName(tagName);
  if (found.length > 0 && found[0].textContent) return found[0].textContent.trim();
  return "";
}

function parseTallyXml(xmlText: string): TallyCustomer[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const customers: TallyCustomer[] = [];

  const ledgers = doc.getElementsByTagName("LEDGER");
  for (let i = 0; i < ledgers.length; i++) {
    const ledger = ledgers[i];
    const name = getTextContent(ledger, "NAME");
    if (!name) continue;

    // Address
    const addrParts: string[] = [];
    const addrList = ledger.getElementsByTagName("ADDRESS");
    for (let j = 0; j < addrList.length; j++) {
      if (addrList[j].textContent) addrParts.push(addrList[j].textContent!.trim());
    }

    // Phone
    let phone = "";
    for (const tag of ["LEDGERPHONE", "LEDGERMOBILE", "PHONENUMBER"]) {
      const val = getTextContent(ledger, tag);
      if (val) { phone = val; break; }
    }

    // Area / State
    const area = getTextContent(ledger, "LEDSTATENAME") || getTextContent(ledger, "COUNTRYNAME");

    // GSTIN
    const gstin = getTextContent(ledger, "PARTYGSTIN") || getTextContent(ledger, "GSTIN");

    customers.push({ name, phone, address: addrParts.join(", "), area, gstin });
  }

  return customers;
}

export default function TallyImportDialog() {
  const [open, setOpen] = useState(false);
  const [tallyUrl, setTallyUrl] = useState("http://localhost:9000");
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error" | "fetching" | "cors_blocked">("idle");
  const [customers, setCustomers] = useState<TallyCustomer[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const bulkImport = useBulkImportCustomers();

  async function testConnection() {
    setStatus("connecting");
    try {
      const resp = await fetch(tallyUrl, { method: "GET", signal: AbortSignal.timeout(5000) });
      if (resp.ok || resp.status === 200) {
        setStatus("connected");
        toast({ title: "Connected to Tally Prime" });
      } else {
        setStatus("error");
      }
    } catch (err: any) {
      if (err?.name === "TypeError" && err?.message?.includes("Failed to fetch")) {
        setStatus("cors_blocked");
      } else {
        setStatus("error");
      }
    }
  }

  async function fetchCustomers() {
    setStatus("fetching");
    try {
      const resp = await fetch(tallyUrl, {
        method: "POST",
        headers: { "Content-Type": "text/xml" },
        body: TALLY_XML_REQUEST,
        signal: AbortSignal.timeout(15000),
      });
      const xmlText = await resp.text();
      const parsed = parseTallyXml(xmlText);
      if (parsed.length === 0) {
        toast({ title: "No customers found", description: "No Sundry Debtors found in Tally response.", variant: "destructive" });
        setStatus("connected");
        return;
      }
      setCustomers(parsed);
      setSelected(new Set(parsed.map((_, i) => i)));
      setStatus("connected");
      toast({ title: `Found ${parsed.length} customers` });
    } catch (err: any) {
      if (err?.name === "TypeError" && err?.message?.includes("Failed to fetch")) {
        setStatus("cors_blocked");
      } else {
        setStatus("error");
        toast({ title: "Failed to fetch", description: err?.message || "Could not connect to Tally", variant: "destructive" });
      }
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

  function downloadFallbackScript() {
    const blob = new Blob([FALLBACK_SCRIPT], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tally_export.py";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClose() {
    setOpen(false);
    setStatus("idle");
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
          {/* Connection */}
          <div className="space-y-2">
            <Label>Tally Server URL</Label>
            <div className="flex gap-2">
              <Input
                value={tallyUrl}
                onChange={(e) => setTallyUrl(e.target.value)}
                placeholder="http://localhost:9000"
                className="flex-1"
              />
              <Button
                onClick={status === "connected" || customers.length > 0 ? fetchCustomers : testConnection}
                disabled={status === "connecting" || status === "fetching"}
                className="gap-2 shrink-0"
              >
                {(status === "connecting" || status === "fetching") && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === "connected" && <Wifi className="h-4 w-4" />}
                {status === "connected" || customers.length > 0 ? "Fetch Customers" : "Connect"}
              </Button>
            </div>
          </div>

          {/* Status messages */}
          {status === "connected" && customers.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> Connected to Tally. Click "Fetch Customers" to load Sundry Debtors.
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <WifiOff className="h-4 w-4" /> Cannot connect. Make sure Tally Prime is running and HTTP server is enabled on port 9000.
            </div>
          )}

          {status === "cors_blocked" && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> Browser blocked the connection (CORS policy).
              </div>
              <p className="text-sm text-muted-foreground">
                Your browser blocks direct connections to local Tally. Use our export script instead:
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Download the Python script below</li>
                <li>Run it on the PC where Tally is running: <code className="text-xs bg-muted px-1 py-0.5 rounded">python tally_export.py &gt; customers.csv</code></li>
                <li>Use the "Bulk Import" button to upload the CSV</li>
              </ol>
              <Button variant="outline" size="sm" className="gap-2" onClick={downloadFallbackScript}>
                <Download className="h-4 w-4" /> Download tally_export.py
              </Button>
            </div>
          )}

          {/* Customer preview */}
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
