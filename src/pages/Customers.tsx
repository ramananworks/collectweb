import { useState } from "react";
import { Search, Phone, MapPin, MapPinned, User, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers, useAreas, useProfiles, formatCurrency, type Customer } from "@/hooks/use-data";
import AddCustomerDialog from "@/components/forms/AddCustomerDialog";
import EditCustomerDialog from "@/components/forms/EditCustomerDialog";
import BulkImportCustomersDialog from "@/components/forms/BulkImportCustomersDialog";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import PullToRefreshIndicator from "@/components/shared/PullToRefreshIndicator";
import CustomerLedgerSheet from "@/components/customers/CustomerLedgerSheet";
import { usePermissions } from "@/hooks/usePermissions";

export default function Customers() {
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { data: customers = [] } = useCustomers();
  const { data: areas = [] } = useAreas();
  const { data: profiles = [] } = useProfiles();
  const { canManageCustomers, canBulkImport } = usePermissions();

  const ptr = usePullToRefresh({ queryKeys: [["customers"], ["areas"], ["profiles"]] });

  const areaNames = areas.map((a) => a.name);

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    const p = profiles.find((p) => p.id === userId);
    return p ? (p.name || p.email) : null;
  };

  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    const matchesArea = areaFilter === "all" || c.area === areaFilter;
    const matchesUser = userFilter === "all" || c.assigned_to === userFilter;
    return matchesSearch && matchesArea && matchesUser;
  });

  const groupedAreas = [...new Set(filtered.map((c) => c.area))].sort();

  return (
    <div
      ref={ptr.containerRef}
      onTouchStart={ptr.handleTouchStart}
      onTouchMove={ptr.handleTouchMove}
      onTouchEnd={ptr.handleTouchEnd}
      className="space-y-6 relative"
    >
      <PullToRefreshIndicator
        pulling={ptr.pulling}
        refreshing={ptr.refreshing}
        pullDistance={ptr.pullDistance}
        threshold={ptr.threshold}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} parties registered</p>
        </div>
        {canManageCustomers && (
          <div className="flex gap-2">
            {canBulkImport && <BulkImportCustomersDialog />}
            <AddCustomerDialog />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-0 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Filter by area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              {areaNames.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {groupedAreas.map((area) => (
        <div key={area} className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPinned className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-primary">{area || "No Area"}</h2>
            <span className="text-xs text-muted-foreground">
              ({filtered.filter((c) => c.area === area).length} parties)
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered
              .filter((c) => c.area === area)
              .map((c) => (
                <div key={c.id} className="rounded-xl bg-card p-5 stat-card-shadow hover:stat-card-shadow-hover transition-all animate-fade-in cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{c.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      {canManageCustomers && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <div className={`text-right ${c.outstanding > 0 ? "text-destructive" : "text-success"}`}>
                        <p className="text-xs text-muted-foreground">Outstanding</p>
                        <p className="text-sm font-bold">{formatCurrency(c.outstanding)}</p>
                      </div>
                    </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <MapPin className="h-3 w-3 shrink-0" /> {c.address}
                  </div>
                  {c.gstin && (
                    <p className="text-xs text-muted-foreground mb-3">GSTIN: <span className="font-medium text-foreground">{c.gstin}</span></p>
                  )}
                  {!c.gstin && <div className="mb-1" />}
                  {c.assigned_to && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <User className="h-3 w-3 shrink-0" /> Assigned: <span className="font-medium text-foreground">{getProfileName(c.assigned_to)}</span>
                    </div>
                  )}
                  {!c.assigned_to && !c.gstin && <div className="mb-2" />}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Credit Limit: <span className="font-medium text-foreground">{formatCurrency(c.credit_limit)}</span>
                    </span>
                    <span className={`text-xs font-medium ${c.credit_limit > 0 && c.outstanding / c.credit_limit > 0.8 ? "text-destructive" : "text-success"}`}>
                      {c.credit_limit > 0 ? `${((c.outstanding / c.credit_limit) * 100).toFixed(0)}% used` : "—"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">No customers found</div>
      )}
      <CustomerLedgerSheet customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
    </div>
  );
}
