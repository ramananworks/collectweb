import { useState } from "react";
import { Plus, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/shared/StatusBadges";
import { useProfiles } from "@/hooks/use-data";
import { InviteMemberDialog } from "@/components/forms/InviteMemberDialog";
import { useAuth } from "@/contexts/AuthContext";

export default function UserManagement() {
  const { data: profiles = [] } = useProfiles();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { role } = useAuth();
  const canInvite = role === "owner" || role === "manager";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} team member{profiles.length !== 1 ? "s" : ""}</p>
        </div>
        {canInvite && (
          <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" /> Invite Member
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {profiles.map((user) => (
          <div key={user.id} className="rounded-xl bg-card p-5 stat-card-shadow hover:stat-card-shadow-hover transition-all animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{user.name}</h3>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" /> {user.email}
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {user.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
