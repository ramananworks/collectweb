import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Check, X, MapPin, Settings as SettingsIcon, Save, Building2, CreditCard, ChevronRight, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompany, useAreas, useAddArea, useUpdateArea, useDeleteArea, useUpdateCompany } from "@/hooks/use-data";
import { toast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import TallyApiIntegration from "@/components/settings/TallyApiIntegration";

export default function Settings() {
  const { data: company } = useCompany();
  const { data: areas = [] } = useAreas();
  const addArea = useAddArea();
  const updateArea = useUpdateArea();
  const deleteArea = useDeleteArea();
  const updateCompany = useUpdateCompany();
  const { canManageSettings, canManageCustomers } = usePermissions();

  const [newArea, setNewArea] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [defaultDueDays, setDefaultDueDays] = useState<number | null>(null);
  const [isEditingDueDays, setIsEditingDueDays] = useState(false);

  // Company details state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyGstin, setCompanyGstin] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyUpiId, setCompanyUpiId] = useState("");
  useEffect(() => {
    if (company) {
      setCompanyAddress((company as any).address ?? "");
      setCompanyGstin((company as any).gstin ?? "");
      setCompanyPhone((company as any).phone ?? "");
      setCompanyUpiId((company as any).upi_id ?? "");
    }
  }, [company]);

  const currentDueDays = defaultDueDays ?? company?.default_due_days ?? 30;

  function handleSaveCompanySettings() {
    if (currentDueDays < 1 || currentDueDays > 365) {
      toast({ title: "Invalid value", description: "Due days must be between 1 and 365.", variant: "destructive" });
      return;
    }
    if (!company) return;
    updateCompany.mutate({ id: company.id, default_due_days: currentDueDays }, {
      onSuccess: () => {
        setIsEditingDueDays(false);
        toast({ title: "Settings saved", description: `Company default due days set to ${currentDueDays}.` });
      },
    });
  }

  function handleAddArea() {
    const trimmed = newArea.trim();
    if (!trimmed) return;
    if (areas.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Duplicate area", description: "This area already exists.", variant: "destructive" });
      return;
    }
    addArea.mutate(trimmed, {
      onSuccess: () => {
        setNewArea("");
        toast({ title: "Area added", description: `"${trimmed}" has been added.` });
      },
    });
  }

  function handleStartEdit(id: string, name: string) {
    setEditingId(id);
    setEditValue(name);
  }

  function handleSaveEdit(id: string) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    if (areas.some((a) => a.id !== id && a.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Duplicate area", description: "This area already exists.", variant: "destructive" });
      return;
    }
    updateArea.mutate({ id, name: trimmed }, {
      onSuccess: () => {
        setEditingId(null);
        toast({ title: "Area updated", description: `Area renamed to "${trimmed}".` });
      },
    });
  }

  function handleDeleteArea(id: string, name: string) {
    deleteArea.mutate(id, {
      onSuccess: () => {
        setEditingId(null);
        toast({ title: "Area removed", description: `"${name}" has been removed.` });
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-sm text-muted-foreground">Manage company-wide configuration</p>
      </div>

      {!canManageSettings && !canManageCustomers && (
        <div className="rounded-xl bg-muted p-8 text-center text-muted-foreground">
          You don't have permission to manage settings. Contact your owner or manager.
        </div>
      )}

      {/* Billing - Owner only */}
      {canManageSettings && (
        <Link
          to="/settings/billing"
          className="block rounded-xl bg-card p-4 sm:p-5 stat-card-shadow max-w-xl hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-semibold">Billing & Subscription</div>
              <div className="text-xs text-muted-foreground">Manage your CollectWeb Pro plan and seats</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* Plan Status - Owner only */}
      {canManageSettings && (
        <Link
          to="/settings/plan-status"
          className="block rounded-xl bg-card p-4 sm:p-5 stat-card-shadow max-w-xl hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-semibold">Plan Status</div>
              <div className="text-xs text-muted-foreground">View current plan, complimentary flag & exact expiry</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* Company Details - Owner only */}
      {canManageSettings && (<>
      {/* Company Details */}
      <div className="rounded-xl bg-card p-4 sm:p-5 stat-card-shadow max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Company Details</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_phone">Mobile / Phone</Label>
            <Input id="company_phone" placeholder="e.g. 9876543210" value={companyPhone} disabled={!isEditingDetails} onChange={(e) => setCompanyPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_gstin">GSTIN</Label>
            <Input id="company_gstin" placeholder="e.g. 22AAAAA0000A1Z5" value={companyGstin} disabled={!isEditingDetails} onChange={(e) => setCompanyGstin(e.target.value)} />
          </div>
           <div className="space-y-2">
             <Label htmlFor="company_address">Address</Label>
             <Textarea id="company_address" placeholder="Company address" className="resize-none" rows={3} value={companyAddress} disabled={!isEditingDetails} onChange={(e) => setCompanyAddress(e.target.value)} />
           </div>
           <div className="space-y-2">
             <Label htmlFor="company_upi_id">UPI ID</Label>
             <Input id="company_upi_id" placeholder="e.g. yourname@upi" value={companyUpiId} disabled={!isEditingDetails} onChange={(e) => setCompanyUpiId(e.target.value)} />
           </div>
          {isEditingDetails ? (
            <div className="flex gap-2">
              <Button
                className="gradient-primary text-primary-foreground gap-2"
                disabled={updateCompany.isPending}
                onClick={() => {
                  if (!company) return;
                  updateCompany.mutate({ id: company.id, address: companyAddress, gstin: companyGstin || null, phone: companyPhone, upi_id: companyUpiId }, {
                    onSuccess: () => {
                      setIsEditingDetails(false);
                      toast({ title: "Details saved", description: "Company details updated successfully." });
                    },
                  });
                }}
              >
                <Save className="h-4 w-4" /> Save
              </Button>
               <Button variant="outline" onClick={() => {
                 setCompanyAddress((company as any)?.address ?? "");
                 setCompanyGstin((company as any)?.gstin ?? "");
                 setCompanyPhone((company as any)?.phone ?? "");
                 setCompanyUpiId((company as any)?.upi_id ?? "");
                 setIsEditingDetails(false);
               }}>Cancel</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsEditingDetails(true)}>Edit</Button>
          )}
        </div>
      </div>

      {/* Default Due Days */}
      <div className="rounded-xl bg-card p-4 sm:p-5 stat-card-shadow max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Default Due Days</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="space-y-2 flex-1 max-w-xs">
            <Label htmlFor="default_due_days">Company-wide Default</Label>
            <p className="text-xs text-muted-foreground">Applied when no invoice or customer-level due date is set.</p>
            <Input
              id="default_due_days"
              type="number"
              min={1}
              max={365}
              value={currentDueDays}
              disabled={!isEditingDueDays}
              onChange={(e) => setDefaultDueDays(Number(e.target.value))}
            />
          </div>
          {isEditingDueDays ? (
            <div className="flex gap-2">
              <Button onClick={handleSaveCompanySettings} className="gradient-primary text-primary-foreground gap-2" disabled={updateCompany.isPending}>
                <Save className="h-4 w-4" /> Save
              </Button>
              <Button variant="outline" onClick={() => { setDefaultDueDays(null); setIsEditingDueDays(false); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsEditingDueDays(true)}>Edit</Button>
          )}
        </div>
      </div>
      </>)}

      {/* Area List - Owner & Manager */}
      {canManageCustomers && (
      <div className="rounded-xl bg-card p-4 sm:p-5 stat-card-shadow max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Area List</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Manage the predefined list of areas used to classify customers across the application.
        </p>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Enter new area name"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddArea()}
            className="flex-1"
          />
          <Button onClick={handleAddArea} className="gradient-primary text-primary-foreground gap-2" disabled={!newArea.trim() || addArea.isPending}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        <ul className="divide-y divide-border rounded-lg border">
          {areas.map((area) => (
            <li key={area.id} className="flex items-center gap-2 px-3 py-2.5">
              {editingId === area.id ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(area.id)}
                    className="flex-1 h-8"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleSaveEdit(area.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{area.name}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(area.id, area.name)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDeleteArea(area.id, area.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </li>
          ))}
          {areas.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">No areas defined yet.</li>
          )}
        </ul>
      </div>
      )}

      {/* Tally Prime Connector API - Owner only */}
      {canManageSettings && <TallyApiIntegration />}
    </div>
  );
}
