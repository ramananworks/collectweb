// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

interface Stop {
  id: string;
  name: string;
  address: string;
}

interface Body {
  origin: { lat: number; lng: number } | { address: string };
  stops: Stop[];
  returnToOrigin?: boolean;
}

async function geocode(address: string, lovableKey: string, mapsKey: string) {
  const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': mapsKey,
    },
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'OK' || !data.results?.[0]) {
    return null;
  }
  const loc = data.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng, formatted: data.results[0].formatted_address };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const mapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!lovableKey) throw new Error('LOVABLE_API_KEY missing');
    if (!mapsKey) throw new Error('GOOGLE_MAPS_API_KEY missing');

    const body = (await req.json()) as Body;
    if (!body?.stops?.length) {
      return new Response(JSON.stringify({ error: 'No stops provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (body.stops.length > 25) {
      return new Response(JSON.stringify({ error: 'Maximum 25 stops supported' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve origin
    let originCoord: { lat: number; lng: number };
    if ('lat' in body.origin) {
      originCoord = { lat: body.origin.lat, lng: body.origin.lng };
    } else {
      const g = await geocode(body.origin.address, lovableKey, mapsKey);
      if (!g) throw new Error('Could not geocode origin address');
      originCoord = { lat: g.lat, lng: g.lng };
    }

    // Geocode stops in parallel
    const geocoded = await Promise.all(
      body.stops.map(async (s) => {
        const g = await geocode(s.address, lovableKey, mapsKey);
        return { ...s, coord: g };
      }),
    );

    const valid = geocoded.filter((s) => s.coord);
    const unresolved = geocoded.filter((s) => !s.coord).map((s) => ({ id: s.id, name: s.name }));

    if (valid.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not geocode any customer addresses', unresolved }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build Routes API request
    const intermediates = valid.slice(0, valid.length - (body.returnToOrigin ? 0 : 1)).map((s) => ({
      location: { latLng: { latitude: s.coord!.lat, longitude: s.coord!.lng } },
    }));

    const destination = body.returnToOrigin
      ? { location: { latLng: { latitude: originCoord.lat, longitude: originCoord.lng } } }
      : {
          location: {
            latLng: {
              latitude: valid[valid.length - 1].coord!.lat,
              longitude: valid[valid.length - 1].coord!.lng,
            },
          },
        };

    const routeReq = {
      origin: { location: { latLng: { latitude: originCoord.lat, longitude: originCoord.lng } } },
      destination,
      intermediates: body.returnToOrigin
        ? valid.map((s) => ({
            location: { latLng: { latitude: s.coord!.lat, longitude: s.coord!.lng } },
          }))
        : intermediates,
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      optimizeWaypointOrder: true,
    };

    const routesRes = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': mapsKey,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex,routes.legs.duration,routes.legs.distanceMeters',
      },
      body: JSON.stringify(routeReq),
    });

    const routesData = await routesRes.json();
    if (!routesRes.ok || !routesData.routes?.[0]) {
      throw new Error(`Routes API error: ${JSON.stringify(routesData)}`);
    }

    const route = routesData.routes[0];
    const orderIdx: number[] = route.optimizedIntermediateWaypointIndex || valid.map((_, i) => i);

    // Build ordered stops list
    const stopsToOrder = body.returnToOrigin ? valid : valid.slice(0, valid.length - 1);
    const orderedStops = orderIdx.map((i) => ({
      ...stopsToOrder[i],
      coord: stopsToOrder[i].coord,
    }));
    if (!body.returnToOrigin) orderedStops.push(valid[valid.length - 1]);

    return new Response(
      JSON.stringify({
        origin: originCoord,
        orderedStops,
        unresolved,
        totalDistanceMeters: route.distanceMeters,
        totalDurationSec: parseInt(String(route.duration).replace('s', '')),
        polyline: route.polyline?.encodedPolyline,
        returnToOrigin: !!body.returnToOrigin,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
