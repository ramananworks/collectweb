import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCustomers, useBulkImportInvoices } from "@/hooks/use-data";

interface ParsedInvoice {
  customer_name: string;
  customer_id: string;
  is_new_customer: boolean;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  due_date: string;
  description: string;
}

interface ImportResult {
  total: number;
  valid: ParsedInvoice[];
  errors: { row: number; message: string }[];
}

const SAMPLE_CSV = `customer_name,invoice_number,invoice_date,amount,due_date,description
Amit Patel,INV-2025-010,2025-02-15,75000,2025-03-15,Steel rods delivery
Priya Electronics,INV-2025-011,2025-02-16,200000,2025-03-30,LED panels bulk order`;

export default function BulkImportInvoicesDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: customers = [] } = useCustomers();
  const bulkImport = useBulkImportInvoices();

  function parseCSV(text: string): ImportResult {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { total: 0, valid: [], errors: [{ row: 0, message: "File must have a header row and at least one data row" }] };

    const header = lines[0].toLowerCase().replace(/\r/g, "");
    const expectedCols = ["customer_name", "invoice_number", "invoice_date", "amount", "due_date"];
    const cols = header.split(",").map((h) => h.trim());

    const missingCols = expectedCols.filter((c) => !cols.includes(c));
    if (missingCols.length > 0) {
      return { total: 0, valid: [], errors: [{ row: 0, message: `Missing columns: ${missingCols.join(", ")}` }] };
    }

    const colIndex = Object.fromEntries([...expectedCols, "description"].map((c) => [c, cols.indexOf(c)]));
    const valid: ParsedInvoice[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].replace(/\r/g, "").trim();
      if (!line) continue;
      const values = line.split(",").map((v) => v.trim());

      const customer_name = values[colIndex.customer_name] || "";
      const invoice_number = values[colIndex.invoice_number] || "";
      const invoice_date = values[colIndex.invoice_date] || "";
      const amount = Number(values[colIndex.amount]) || 0;
      const due_date = values[colIndex.due_date] || "";
      const description = colIndex.description >= 0 ? (values[colIndex.description] || "") : "";

      if (!customer_name) { errors.push({ row: i + 1, message: `Row ${i + 1}: Customer name is required` }); continue; }
      const cust = customers.find((c) => c.name.toLowerCase() === customer_name.toLowerCase());
      if (!invoice_number) { errors.push({ row: i + 1, message: `Row ${i + 1}: Invoice number is required` }); continue; }
      if (!invoice_date) { errors.push({ row: i + 1, message: `Row ${i + 1}: Invoice date is required` }); continue; }
      if (amount < 1) { errors.push({ row: i + 1, message: `Row ${i + 1}: Amount must be greater than 0` }); continue; }
      if (!due_date) { errors.push({ row: i + 1, message: `Row ${i + 1}: Due date is required` }); continue; }

      valid.push({ customer_name: cust?.name || customer_name, customer_id: cust?.id || "", is_new_customer: !cust, invoice_number, invoice_date, amount, due_date, description });
    }

    return { total: lines.length - 1, valid, errors };
  }

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
        toast({ title: "Import complete", description: `${result.valid.length} invoices imported successfully.` });
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
    a.download = "invoices_sample.csv";
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
          <DialogTitle>Bulk Import Invoices</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV with columns: <span className="font-mono text-xs text-foreground">customer_name, invoice_number, invoice_date, amount, due_date, description</span>
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
                        <th className="pb-1">Customer</th><th className="pb-1">Invoice #</th><th className="pb-1">Amount</th><th className="pb-1">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.valid.slice(0, 10).map((inv, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="py-1">{inv.customer_name}</td><td className="py-1 font-mono">{inv.invoice_number}</td><td className="py-1">₹{inv.amount.toLocaleString("en-IN")}</td><td className="py-1">{inv.due_date}</td>
                        </tr>
                      ))}
                      {result.valid.length > 10 && <tr><td colSpan={4} className="py-1 text-muted-foreground">...and {result.valid.length - 10} more</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!result || result.valid.length === 0 || bulkImport.isPending} className="gradient-primary text-primary-foreground">
              {bulkImport.isPending ? "Importing..." : `Import ${result?.valid.length ?? 0} Invoices`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
