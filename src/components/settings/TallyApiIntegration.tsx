import { useState, useEffect } from "react";
import { Plug, Copy, RefreshCw, Trash2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface PairCode { pair_id: string; pair_code: string; expires_at: string; }
interface PairStatus { claimed: boolean; expired: boolean; device: { id: string; device_name: string; last_used_at: string | null } | null; }
interface Device { id: string; device_name: string; last_used_at: string | null; created_at: string; }

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tally-api`;
const PAIR_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tally-pair`;

async function invokePair(action: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${PAIR_BASE}/${action}${action === "status" && body?.pair_id ? `?pair_id=${body.pair_id}` : ""}`, {
    method: action === "status" ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: action === "status" ? undefined : JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? "Request failed");
  return json;
}

export default function TallyApiIntegration() {
  const [pairCode, setPairCode] = useState<PairCode | null>(null);
  const [pairStatus, setPairStatus] = useState<PairStatus | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadDevices() {
    const { data } = await supabase
      .from("api_devices")
      .select("id, device_name, last_used_at, created_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    setDevices(data ?? []);
  }
  useEffect(() => { loadDevices(); }, []);

  // Poll pair status every 2s while a code is active
  useEffect(() => {
    if (!pairCode) return;
    const tick = async () => {
      try {
        const s = await invokePair("status", { pair_id: pairCode.pair_id });
        setPairStatus(s);
        if (s.claimed) {
          toast({ title: "Connector paired", description: `${s.device?.device_name} is now connected.` });
          setPairCode(null);
          setPairStatus(null);
          loadDevices();
        }
      } catch { /* swallow */ }
    };
    const iv = setInterval(tick, 2000);
    tick();
    return () => clearInterval(iv);
  }, [pairCode]);

  async function startPair() {
    setLoading(true);
    try {
      const res = await invokePair("start");
      setPairCode(res);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function revoke(id: string, name: string) {
    if (!confirm(`Revoke "${name}"? The connector will stop syncing immediately.`)) return;
    try {
      await invokePair("revoke", { device_id: id });
      toast({ title: "Device revoked", description: `${name} can no longer access the API.` });
      loadDevices();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  }

  return (
    <div className="rounded-xl bg-card p-4 sm:p-5 stat-card-shadow max-w-xl">
      <div className="flex items-center gap-2 mb-2">
        <Plug className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Tally Prime Connector</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Pair a Tally Prime desktop connector to sync parties, invoices, and collections automatically.
      </p>

      {/* API endpoint reference */}
      <div className="rounded-lg border border-border bg-muted/40 p-3 mb-4 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-muted-foreground">API Base URL</span>
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={() => copy(API_BASE, "API URL")}>
            <Copy className="h-3 w-3" /> Copy
          </Button>
        </div>
        <code className="block text-xs break-all">{API_BASE}</code>
      </div>

      {/* Active pair code */}
      {pairCode && !pairStatus?.claimed && (
        <div className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-4 mb-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">Enter this code in the Tally connector:</p>
          <div className="text-3xl font-mono font-bold tracking-widest text-primary mb-3">
            {pairCode.pair_code}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Expires {formatDistanceToNow(new Date(pairCode.expires_at), { addSuffix: true })}
          </div>
          {pairStatus?.expired && <p className="text-xs text-destructive mt-2">Code expired — generate a new one.</p>}
        </div>
      )}

      {!pairCode && (
        <Button onClick={startPair} disabled={loading} className="gradient-primary text-primary-foreground gap-2 w-full mb-4">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Pair a new connector
        </Button>
      )}

      {/* Paired devices */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Paired devices ({devices.length})</h3>
        {devices.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">No connectors paired yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center gap-2 px-3 py-2.5">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.device_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.last_used_at
                      ? `Last sync ${formatDistanceToNow(new Date(d.last_used_at), { addSuffix: true })}`
                      : "Never used"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => revoke(d.id, d.device_name)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
