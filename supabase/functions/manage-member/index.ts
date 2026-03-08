import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is owner or manager
    const { data: callerRoles } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const callerRoleList = (callerRoles || []).map((r: any) => r.role);
    const callerIsOwner = callerRoleList.includes("owner");
    const callerIsManager = callerRoleList.includes("manager");

    if (!callerIsOwner && !callerIsManager) {
      return new Response(JSON.stringify({ error: "Only owners and managers can manage members." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's company
    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("company_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.company_id) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, userId, role, roles } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // For check_invite_status, handle array of userIds with bulk company check
    if (action === "check_invite_status") {
      const userIds: string[] = Array.isArray(userId) ? userId : [userId];
      // Verify all users belong to caller's company
      const { data: targetProfiles } = await adminClient
        .from("profiles")
        .select("id, company_id")
        .in("id", userIds)
        .eq("company_id", callerProfile.company_id);

      const validIds = (targetProfiles || []).map((p: any) => p.id);
      const pending: Record<string, boolean> = {};
      for (const uid of validIds) {
        const { data: authUser } = await adminClient.auth.admin.getUserById(uid);
        pending[uid] = !!(authUser?.user && !authUser.user.last_sign_in_at);
      }
      return new Response(JSON.stringify({ pending }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify target user belongs to same company (single user actions)
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();

    if (!targetProfile || targetProfile.company_id !== callerProfile.company_id) {
      return new Response(JSON.stringify({ error: "User not found in your company" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (action === "delete" && userId === caller.id) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent modifying owners unless caller is owner
    const { data: targetRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const targetRoleList = (targetRoles || []).map((r: any) => r.role);
    if (targetRoleList.includes("owner") && !callerIsOwner) {
      return new Response(JSON.stringify({ error: "Only owners can manage other owners" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Support both old single-role and new multi-role update
    if (action === "update_role" || action === "update_roles") {
      const newRoles: string[] = action === "update_roles" && Array.isArray(roles)
        ? roles
        : role ? [role] : [];

      const validRoles = ["owner", "manager", "collection_staff", "delivery_staff"];
      if (newRoles.length === 0 || newRoles.some((r: string) => !validRoles.includes(r))) {
        return new Response(JSON.stringify({ error: "Invalid roles" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only owners can assign owner role
      if (newRoles.includes("owner") && !callerIsOwner) {
        return new Response(JSON.stringify({ error: "Only owners can assign the owner role" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete existing roles and insert new ones
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      const inserts = newRoles.map((r: string) => ({
        user_id: userId,
        role: r,
        company_id: callerProfile.company_id,
      }));
      const { error: insertError } = await adminClient.from("user_roles").insert(inserts);
      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (action === "resend_invite") {
      const { data: authUser, error: getUserErr } = await adminClient.auth.admin.getUserById(userId);
      if (getUserErr || !authUser?.user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (authUser.user.last_sign_in_at) {
        return new Response(JSON.stringify({ error: "This user has already accepted their invitation" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        authUser.user.email!,
        {
          data: authUser.user.user_metadata,
          redirectTo: "https://collectweb.lovable.app/set-password",
        }
      );

      if (inviteErr) throw inviteErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      await adminClient.from("user_roles").delete().eq("user_id", userId);
      await adminClient.from("profiles").delete().eq("id", userId);
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
