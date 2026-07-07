import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsSuperAdmin() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["is-super-admin", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_super_admin", { _user_id: user!.id });
      if (error) return false;
      return !!data;
    },
  });
  return { isSuperAdmin: !!q.data, loading: q.isLoading };
}
