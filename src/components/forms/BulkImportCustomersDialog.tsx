import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBulkImportCustomers } from "@/hooks/use-data";

interface ParsedCustomer {
  name: string;
  phone: string;
  address: string;
  gstin: string;
}

interface ImportResult {
  total: number;
  valid: ParsedCustomer[];
  errors: { row: number; message: string }[];
}

function parseCSV(text: string): ImportResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { total: 0, valid: [], errors: [{ row: 0, message: "File must have a header row and at least one data row" }] };

  const header = lines[0].toLowerCase().replace(/\r/g, "");
  const expectedCols = ["name", "phone", "address", "gstin"];
  const cols = header.split(",").map((h) => h.trim());

  const missingCols = expectedCols.filter((c) => !cols.includes(c));
  if (missingCols.length > 0) {
    return { total: 0, valid: [], errors: [{ row: 0, message: `Missing columns: ${missingCols.join(", ")}` }] };
  }

  const colIndex = Object.fromEntries(expectedCols.map((c) => [c, cols.indexOf(c)]));
  const valid: ParsedCustomer[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r/g, "").trim();
    if (!line) continue;
    const values = line.split(",").map((v) => v.trim());

    const name = values[colIndex.name] || "";
    const phone = values[colIndex.phone] || "";
    const address = values[colIndex.address] || "";
    const gstin = values[colIndex.gstin] || "";

    if (!name || name.length < 2) { errors.push({ row: i + 1, message: `Row ${i + 1}: Name is required (min 2 chars)` }); continue; }
    if (!phone || phone.length < 10) { errors.push({ row: i + 1, message: `Row ${i + 1}: Valid phone is required (min 10 chars)` }); continue; }
    if (!address || address.length < 5) { errors.push({ row: i + 1, message: `Row ${i + 1}: Address is required (min 5 chars)` }); continue; }

    valid.push({ name, phone, address, gstin });
  }

  return { total: lines.length - 1, valid, errors };
}

const SAMPLE_CSV = `name,phone,address,gstin,credit_limit
Amit Patel,+91 99887 11234,15 MG Road Pune,27AABCP1234A1Z5,500000
Priya Electronics,+91 98123 45678,22 Station Rd Mumbai,,1000000`;

export default function BulkImportCustomersDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkImport = useBulkImportCustomers();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setResult(parseCSV(text));
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!result || result.valid.length === 0) return;
    bulkImport.mutate(result.valid, {
      onSuccess: () => {
        toast({ title: "Import complete", description: `${result.valid.length} customers imported successfully.` });
        setResult(null);
        setOpen(false);
        if (fileRef.current) fileRef.current.value = "";
      },
      onError: (err) => {
        toast({ title: "Import failed", description: err.message, variant: "destructive" });
      },
    });
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setResult(null); if (fileRef.current) fileRef.current.value = ""; } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" /> Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Customers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with columns: <span className="font-mono text-xs text-foreground">name, phone, address, gstin, credit_limit</span>
          </p>
          <Button variant="link" className="h-auto p-0 text-xs" onClick={downloadSample}>
            <Download className="h-3 w-3 mr-1" /> Download sample CSV
          </Button>

          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" />

          {result && (
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" /> {result.valid.length} valid</span>
                {result.errors.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-4 w-4" /> {result.errors.length} errors</span>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive">{err.message}</p>
                  ))}
                </div>
              )}
              {result.valid.length > 0 && (
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-1">Name</th><th className="pb-1">Phone</th><th className="pb-1">Credit Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.valid.slice(0, 10).map((c, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="py-1">{c.name}</td><td className="py-1">{c.phone}</td><td className="py-1">₹{c.credit_limit.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                      {result.valid.length > 10 && <tr><td colSpan={3} className="py-1 text-muted-foreground">...and {result.valid.length - 10} more</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!result || result.valid.length === 0 || bulkImport.isPending} className="gradient-primary text-primary-foreground">
              {bulkImport.isPending ? "Importing..." : `Import ${result?.valid.length ?? 0} Customers`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
