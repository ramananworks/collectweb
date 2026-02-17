import { useState } from "react";
import { Search, Phone, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { mockCustomers, formatCurrency } from "@/lib/mock-data";
import AddCustomerDialog from "@/components/forms/AddCustomerDialog";
import BulkImportCustomersDialog from "@/components/forms/BulkImportCustomersDialog";

export default function Customers() {
  const [search, setSearch] = useState("");
  const filtered = mockCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">{mockCustomers.length} parties registered</p>
        </div>
        <div className="flex gap-2">
          <BulkImportCustomersDialog />
          <AddCustomerDialog />
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl bg-card p-5 stat-card-shadow hover:stat-card-shadow-hover transition-all animate-fade-in cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Phone className="h-3 w-3" /> {c.phone}
                </div>
              </div>
              <div className={`text-right ${c.outstanding > 0 ? "text-destructive" : "text-success"}`}>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-sm font-bold">{formatCurrency(c.outstanding)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <MapPin className="h-3 w-3 shrink-0" /> {c.address}
            </div>
            {c.gstin && (
              <p className="text-xs text-muted-foreground mb-3">GSTIN: <span className="font-medium text-foreground">{c.gstin}</span></p>
            )}
            {!c.gstin && <div className="mb-3" />}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Credit Limit: <span className="font-medium text-foreground">{formatCurrency(c.credit_limit)}</span>
              </span>
              <span className={`text-xs font-medium ${c.outstanding / c.credit_limit > 0.8 ? "text-destructive" : "text-success"}`}>
                {((c.outstanding / c.credit_limit) * 100).toFixed(0)}% used
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
