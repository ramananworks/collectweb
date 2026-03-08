import { useState } from "react";
import { Plus, Mail, Phone, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/shared/StatusBadges";
import { useProfiles } from "@/hooks/use-data";
import { InviteMemberDialog } from "@/components/forms/InviteMemberDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function UserManagement() {
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useUserRoles();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { role, user } = useAuth();
  const canManage = role === "owner" || role === "manager";
  const queryClient = useQueryClient();

  const [editUser, setEditUser] = useState<{ id: string; name: string; currentRole: AppRole } | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("staff");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteUser, setDeleteUser] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getRoleForUser = (userId: string): AppRole => {
    return roles.find((r) => r.user_id === userId)?.role || "staff";
  };

  const handleEditRole = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-member", {
        body: { action: "update_role", userId: editUser.id, role: editRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${editUser.name}'s role updated to ${editRole}`);
      queryClient.invalidateQueries({ queryKey: ["user_roles"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setEditUser(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
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
          const memberRole = getRoleForUser(member.id);
          const isSelf = member.id === user?.id;
          const canEdit = canManage && !isSelf && !(memberRole === "owner" && role !== "owner");

          return (
            <div key={member.id} className="rounded-xl bg-card p-5 stat-card-shadow hover:stat-card-shadow-hover transition-all animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{member.name}</h3>
                    <RoleBadge role={memberRole} />
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
                          setEditUser({ id: member.id, name: member.name, currentRole: memberRole });
                          setEditRole(memberRole);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" /> Change Role
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

      {/* Edit Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>Update {editUser?.name}'s role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {role === "owner" && <SelectItem value="owner">Owner</SelectItem>}
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button
                className="gradient-primary text-primary-foreground"
                disabled={editLoading || editRole === editUser?.currentRole}
                onClick={handleEditRole}
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
