import { useEffect, useMemo, useRef, useState } from "react";
import { useCustomers, useInvoices, formatCurrency } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MapPin,
  Navigation,
  Loader2,
  Crosshair,
  Route as RouteIcon,
  ExternalLink,
  Search,
} from "lucide-react";
import { hapticLight, hapticSuccess, hapticHeavy } from "@/lib/haptics";

interface OrderedStop {
  id: string;
  name: string;
  address: string;
  coord: { lat: number; lng: number; formatted?: string };
}

interface PlanResult {
  origin: { lat: number; lng: number };
  orderedStops: OrderedStop[];
  unresolved: { id: string; name: string }[];
  totalDistanceMeters: number;
  totalDurationSec: number;
  polyline?: string;
  returnToOrigin: boolean;
}

declare global {
  interface Window {
    google: any;
    initRoutePlannerMap?: () => void;
  }
}

const MAPS_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
const TRACK = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

function loadMapsApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();
    const existing = document.getElementById("gmaps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    window.initRoutePlannerMap = () => resolve();
    const s = document.createElement("script");
    s.id = "gmaps-script";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&loading=async&callback=initRoutePlannerMap&channel=${TRACK}`;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
}

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

export default function RoutePlanner() {
  const { data: customers = [] } = useCustomers();
  const { data: invoices = [] } = useInvoices();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [originMode, setOriginMode] = useState<"gps" | "address">("gps");
  const [originCoord, setOriginCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [returnToOrigin, setReturnToOrigin] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [locating, setLocating] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  // Outstanding map for badge
  const outstandingByCustomer = useMemo(() => {
    const m = new Map<string, number>();
    invoices.forEach((inv: any) => {
      const due = (inv.amount || 0) - (inv.paid_amount || 0);
      if (due > 0) m.set(inv.customer_id, (m.get(inv.customer_id) || 0) + due);
    });
    return m;
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = customers.filter((c) => c.address?.trim()).map((c) => ({
      ...c,
      outstanding: outstandingByCustomer.get(c.id) || c.outstanding || 0,
    }));
    const sorted = list.sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.area?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q),
    );
  }, [customers, search, outstandingByCustomer]);

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOriginCoord({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        hapticLight();
        toast.success("Current location captured");
      },
      (err) => {
        setLocating(false);
        hapticHeavy();
        toast.error(err.message || "Could not get location");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAllVisible = () => {
    const next = new Set(selected);
    filtered.forEach((c) => next.add(c.id));
    setSelected(next);
  };

  const clearSelection = () => setSelected(new Set());

  const handlePlan = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one customer");
      return;
    }
    if (selected.size > 25) {
      toast.error("Maximum 25 stops per route");
      return;
    }
    let origin: any;
    if (originMode === "gps") {
      if (!originCoord) {
        toast.error("Capture your current location first");
        return;
      }
      origin = originCoord;
    } else {
      if (!originAddress.trim()) {
        toast.error("Enter a start address");
        return;
      }
      origin = { address: originAddress.trim() };
    }

    const stops = customers
      .filter((c) => selected.has(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        address: [c.address, c.area].filter(Boolean).join(", "),
      }));

    setPlanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("plan-route", {
        body: { origin, stops, returnToOrigin },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as PlanResult);
      hapticSuccess();
      toast.success(`Route optimized: ${data.orderedStops.length} stops`);
      if (data.unresolved?.length) {
        toast.warning(
          `Couldn't locate: ${data.unresolved.map((u: any) => u.name).join(", ")}`,
        );
      }
    } catch (e: any) {
      hapticHeavy();
      toast.error(e.message || "Failed to plan route");
    } finally {
      setPlanning(false);
    }
  };

  // Render map when result arrives
  useEffect(() => {
    if (!result || !mapRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        await loadMapsApi();
        if (cancelled || !mapRef.current) return;
        const g = window.google;
        const bounds = new g.maps.LatLngBounds();
        bounds.extend(result.origin);
        result.orderedStops.forEach((s) => bounds.extend(s.coord));

        if (!mapInstance.current) {
          mapInstance.current = new g.maps.Map(mapRef.current, {
            center: result.origin,
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }

        // Clear old
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
        if (polylineRef.current) polylineRef.current.setMap(null);

        // Origin marker
        markersRef.current.push(
          new g.maps.Marker({
            position: result.origin,
            map: mapInstance.current,
            label: { text: "S", color: "#fff", fontWeight: "bold" },
            title: "Start",
          }),
        );
        // Stop markers
        result.orderedStops.forEach((s, i) => {
          markersRef.current.push(
            new g.maps.Marker({
              position: s.coord,
              map: mapInstance.current,
              label: { text: String(i + 1), color: "#fff", fontWeight: "bold" },
              title: s.name,
            }),
          );
        });

        // Polyline
        if (result.polyline) {
          const path = decodePolyline(result.polyline);
          polylineRef.current = new g.maps.Polyline({
            path,
            strokeColor: "#2563eb",
            strokeWeight: 4,
            strokeOpacity: 0.85,
            map: mapInstance.current,
          });
        }

        mapInstance.current.fitBounds(bounds, 60);
      } catch (e: any) {
        toast.error(e.message || "Map failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result]);

  const openInGoogleMaps = () => {
    if (!result) return;
    const origin = `${result.origin.lat},${result.origin.lng}`;
    const stops = result.orderedStops;
    const destination = result.returnToOrigin
      ? origin
      : `${stops[stops.length - 1].coord.lat},${stops[stops.length - 1].coord.lng}`;
    const waypointStops = result.returnToOrigin ? stops : stops.slice(0, -1);
    const waypoints = waypointStops
      .map((s) => `${s.coord.lat},${s.coord.lng}`)
      .join("|");
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
      waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""
    }&travelmode=driving`;
    window.open(url, "_blank");
  };

  const fmtDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.round((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg gradient-primary text-primary-foreground">
          <RouteIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Route Planner</h1>
          <p className="text-sm text-muted-foreground">
            Optimize a multi-stop collection route from your starting point.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-4">
        {/* Left: setup */}
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Start location</Label>
              <div className="flex items-center gap-1 text-xs">
                <button
                  className={`px-2 py-1 rounded ${originMode === "gps" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  onClick={() => setOriginMode("gps")}
                >
                  GPS
                </button>
                <button
                  className={`px-2 py-1 rounded ${originMode === "address" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                  onClick={() => setOriginMode("address")}
                >
                  Address
                </button>
              </div>
            </div>
            {originMode === "gps" ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={captureGps}
                  disabled={locating}
                  className="gap-2"
                >
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                  {originCoord ? "Update location" : "Use current location"}
                </Button>
                {originCoord && (
                  <span className="text-xs text-muted-foreground">
                    {originCoord.lat.toFixed(4)}, {originCoord.lng.toFixed(4)}
                  </span>
                )}
              </div>
            ) : (
              <Input
                placeholder="e.g. Shop 12, MG Road, Pune"
                value={originAddress}
                onChange={(e) => setOriginAddress(e.target.value)}
              />
            )}

            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="return" className="text-sm">Return to start</Label>
              <Switch id="return" checked={returnToOrigin} onCheckedChange={setReturnToOrigin} />
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Customers ({selected.size} selected)
              </Label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={selectAllVisible}>
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, area or address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="max-h-[360px] overflow-y-auto -mx-1 px-1 space-y-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No customers with address found.
                </p>
              ) : (
                filtered.map((c) => {
                  const isSel = selected.has(c.id);
                  const out = (c as any).outstanding || 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelect(c.id)}
                      className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg border transition ${
                        isSel ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox checked={isSel} className="mt-0.5 pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{c.name}</p>
                          {out > 0 && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {formatCurrency(out)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {[c.address, c.area].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Button
            onClick={handlePlan}
            disabled={planning || selected.size === 0}
            className="w-full gradient-primary text-primary-foreground gap-2"
            size="lg"
          >
            {planning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RouteIcon className="h-4 w-4" />}
            {planning ? "Optimizing route..." : `Plan optimized route (${selected.size})`}
          </Button>
        </div>

        {/* Right: result */}
        <div className="space-y-4">
          {result ? (
            <>
              <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Total distance</p>
                      <p className="font-semibold">
                        {(result.totalDistanceMeters / 1000).toFixed(1)} km
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Est. drive time</p>
                      <p className="font-semibold">{fmtDuration(result.totalDurationSec)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Stops</p>
                      <p className="font-semibold">{result.orderedStops.length}</p>
                    </div>
                  </div>
                  <Button onClick={openInGoogleMaps} variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" /> Open in Google Maps
                  </Button>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <div ref={mapRef} className="w-full h-[360px] bg-muted" />
              </Card>

              <Card className="p-4 space-y-2">
                <h3 className="text-sm font-semibold mb-1">Stop order</h3>
                <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/40">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                    S
                  </div>
                  <div>
                    <p className="text-sm font-medium">Start</p>
                    <p className="text-xs text-muted-foreground">
                      {result.origin.lat.toFixed(5)}, {result.origin.lng.toFixed(5)}
                    </p>
                  </div>
                </div>
                {result.orderedStops.map((s, i) => (
                  <div key={s.id + i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40">
                    <div className="h-7 w-7 shrink-0 rounded-full gradient-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.coord.formatted || s.address}
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${s.coord.lat},${s.coord.lng}&travelmode=driving`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary text-xs flex items-center gap-1 shrink-0"
                    >
                      <Navigation className="h-3.5 w-3.5" /> Navigate
                    </a>
                  </div>
                ))}
                {result.unresolved.length > 0 && (
                  <div className="mt-3 p-2 rounded-lg bg-destructive/10 text-xs text-destructive">
                    Couldn't geocode: {result.unresolved.map((u) => u.name).join(", ")}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
              <MapPin className="h-10 w-10 opacity-40" />
              <p className="text-sm">
                Select your start point and customers, then plan an optimized route.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
