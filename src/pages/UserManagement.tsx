import { useState } from "react";
import { Plus, Mail, Phone, Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleBadge } from "@/components/shared/StatusBadges";
import { mockStaff, mockCompany } from "@/lib/mock-data";
import { toast } from "@/hooks/use-toast";

export default function UserManagement() {
  const [defaultDueDays, setDefaultDueDays] = useState(mockCompany.default_due_days);
  const [isEditing, setIsEditing] = useState(false);

  function handleSaveCompanySettings() {
    if (defaultDueDays < 1 || defaultDueDays > 365) {
      toast({ title: "Invalid value", description: "Due days must be between 1 and 365.", variant: "destructive" });
      return;
    }
    mockCompany.default_due_days = defaultDueDays;
    setIsEditing(false);
    toast({ title: "Settings saved", description: `Company default due days set to ${defaultDueDays}.` });
  }

  return (
    <div className="space-y-6">
      {/* Company Settings */}
      <div className="rounded-xl bg-card p-5 stat-card-shadow">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Company Settings</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="space-y-2 flex-1 max-w-xs">
            <Label htmlFor="default_due_days">Default Due Days (Company-wide)</Label>
            <p className="text-xs text-muted-foreground">Applied when no invoice or customer-level due date is set.</p>
            <Input
              id="default_due_days"
              type="number"
              min={1}
              max={365}
              value={defaultDueDays}
              disabled={!isEditing}
              onChange={(e) => setDefaultDueDays(Number(e.target.value))}
            />
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSaveCompanySettings} className="gradient-primary text-primary-foreground gap-2">
                <Save className="h-4 w-4" /> Save
              </Button>
              <Button variant="outline" onClick={() => { setDefaultDueDays(mockCompany.default_due_days); setIsEditing(false); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-sm text-muted-foreground">{mockStaff.length} team members</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Invite Member
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mockStaff.map((user) => (
          <div key={user.id} className="rounded-xl bg-card p-5 stat-card-shadow hover:stat-card-shadow-hover transition-all animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {user.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{user.name}</h3>
                  <RoleBadge role={user.role} />
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" /> {user.email}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {user.phone}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
