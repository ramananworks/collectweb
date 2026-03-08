import { useState } from "react";
import { Plus, Mail, Phone, MoreVertical, Pencil, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/shared/StatusBadges";
import { useProfiles } from "@/hooks/use-data";
import { InviteMemberDialog } from "@/components/forms/InviteMemberDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AppRole = "owner" | "manager" | "collection_staff" | "delivery_staff";

function useUserRoles() {
  return useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role, company_id");
      if (error) throw error;
      return data as { user_id: string; role: AppRole; company_id: string }[];
    },
  });
}

function getRolesForUser(roles: { user_id: string; role: AppRole }[], userId: string): AppRole[] {
  return roles.filter((r) => r.user_id === userId).map((r) => r.role);
}

const editableRoles: { value: AppRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "collection_staff", label: "Collection Staff" },
  { value: "delivery_staff", label: "Delivery Staff" },
];

export default function UserManagement() {
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useUserRoles();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { roles: myRoles, user } = useAuth();
  const isOwner = myRoles.includes("owner");
  const canManage = isOwner || myRoles.includes("manager");
  const queryClient = useQueryClient();

  const [editUser, setEditUser] = useState<{ id: string; name: string; currentRoles: AppRole[] } | null>(null);
  const [editRoles, setEditRoles] = useState<AppRole[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  const [deleteUser, setDeleteUser] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleToggleRole = (role: AppRole) => {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleEditRoles = async () => {
    if (!editUser || editRoles.length === 0) {
      toast.error("Select at least one role");
      return;
    }
    setEditLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-member", {
        body: { action: "update_roles", userId: editUser.id, roles: editRoles },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${editUser.name}'s roles updated`);
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setEditUser(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update roles");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-member", {
        body: { action: "delete", userId: deleteUser.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${deleteUser.name} has been removed`);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      setDeleteUser(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    } finally {
      setDeleteLoading(false);
    }
  };

  const rolesUnchanged = editUser
    ? JSON.stringify([...editRoles].sort()) === JSON.stringify([...editUser.currentRoles].sort())
    : true;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-sm text-muted-foreground">{profiles.length} team member{profiles.length !== 1 ? "s" : ""}</p>
        </div>
        {canManage && (
          <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" /> Invite Member
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {profiles.map((member) => {
          const memberRoles = getRolesForUser(roles, member.id);
          const isSelf = member.id === user?.id;
          const memberIsOwner = memberRoles.includes("owner");
          const canEdit = canManage && !isSelf && !(memberIsOwner && !isOwner);

          return (
            <div key={member.id} className="rounded-xl bg-card p-5 stat-card-shadow hover:stat-card-shadow-hover transition-all animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{member.name}</h3>
                    {memberRoles.map((r) => (
                      <RoleBadge key={r} role={r} />
                    ))}
                    {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {member.email}
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {member.phone}
                      </div>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditUser({ id: member.id, name: member.name, currentRoles: memberRoles });
                          setEditRoles([...memberRoles]);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Change Roles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteUser({ id: member.id, name: member.name })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Edit Roles Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Roles</DialogTitle>
            <DialogDescription>Update {editUser?.name}'s roles. Select one or more.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {isOwner && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="role-owner"
                  checked={editRoles.includes("owner")}
                  onCheckedChange={() => handleToggleRole("owner")}
                />
                <Label htmlFor="role-owner" className="text-sm font-medium">Owner</Label>
              </div>
            )}
            {editableRoles.map((r) => (
              <div key={r.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${r.value}`}
                  checked={editRoles.includes(r.value)}
                  onCheckedChange={() => handleToggleRole(r.value)}
                />
                <Label htmlFor={`role-${r.value}`} className="text-sm font-medium">{r.label}</Label>
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button
                className="gradient-primary text-primary-foreground"
                disabled={editLoading || rolesUnchanged || editRoles.length === 0}
                onClick={handleEditRoles}
              >
                {editLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => { if (!o) setDeleteUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this member from your team. They will lose access to all company data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading}
              onClick={handleDelete}
            >
              {deleteLoading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
