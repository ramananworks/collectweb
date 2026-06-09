import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  authDevice,
  corsHeaders,
  errorJson,
  json,
  logRequest,
  serviceClient,
  type AuthedDevice,
} from "../_shared/tally-auth.ts";

const MAX_PAGE = 500;
const DEFAULT_PAGE = 200;
const MAX_BATCH = 500;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  // Path is /tally-api[/v1/tally]/<resource>[/<id>]
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "tally-api");
  let route = parts.slice(idx + 1);
  // Strip optional /v1/tally prefix so both work
  if (route[0] === "v1") route = route.slice(1);
  if (route[0] === "tally") route = route.slice(1);

  const resource = route[0] ?? "";
  const sub = route[1];

  const started = Date.now();
  const auth = await authDevice(req);
  if (auth instanceof Response) return auth;

  try {
    let res: Response;
    switch (resource) {
      case "ping":      res = await ping(auth); break;
      case "company":   res = await getCompany(auth); break;
      case "areas":     res = req.method === "POST" ? await upsertAreas(req, auth) : await listAreas(auth); break;
      case "parties":   res = await partiesRouter(req, auth, sub); break;
      case "invoices":  res = await invoicesRouter(req, auth, sub); break;
      case "payments":  res = await paymentsRouter(req, auth, sub); break;
      case "changes":   res = await changesFeed(req, auth); break;
      default:          res = errorJson("not_found", `Unknown resource '${resource}'`, 404);
    }
    logRequest(auth, auth.company_id, url.pathname, req.method, res.status, Date.now() - started).catch(() => {});
    return res;
  } catch (e) {
    console.error("tally-api error", e);
    const res = errorJson("internal", (e as Error).message, 500);
    logRequest(auth, auth.company_id, url.pathname, req.method, 500, Date.now() - started).catch(() => {});
    return res;
  }
});

// ---------- helpers ----------
function parsePagination(url: URL) {
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? `${DEFAULT_PAGE}`, 10) || DEFAULT_PAGE, 1), MAX_PAGE);
  const cursor = url.searchParams.get("cursor"); // ISO ts cursor on updated_at/created_at
  const updated_since = url.searchParams.get("updated_since");
  return { limit, cursor, updated_since };
}

async function readJsonArray(req: Request): Promise<any[] | Response> {
  let body: any;
  try { body = await req.json(); } catch { return errorJson("bad_request", "Invalid JSON body", 400); }
  const arr = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : null;
  if (!arr) return errorJson("bad_request", "Body must be a JSON array or { items: [...] }", 400);
  if (arr.length === 0) return [];
  if (arr.length > MAX_BATCH) return errorJson("too_large", `Batch limit is ${MAX_BATCH}`, 413);
  return arr;
}

// ---------- ping ----------
async function ping(auth: AuthedDevice) {
  const svc = serviceClient();
  const { data: device } = await svc.from("api_devices").select("device_name").eq("id", auth.device_id).maybeSingle();
  return json({
    ok: true,
    company_id: auth.company_id,
    device: device?.device_name ?? null,
    server_time: new Date().toISOString(),
    api_version: "v1",
  });
}

// ---------- company ----------
async function getCompany(auth: AuthedDevice) {
  const svc = serviceClient();
  const { data, error } = await svc.from("companies")
    .select("id, name, gstin, default_due_days, address, phone, upi_id")
    .eq("id", auth.company_id).maybeSingle();
  if (error) return errorJson("db_error", error.message, 500);
  return json(data);
}

// ---------- areas ----------
async function listAreas(auth: AuthedDevice) {
  const svc = serviceClient();
  const { data, error } = await svc.from("areas").select("id, name, created_at").eq("company_id", auth.company_id).order("name");
  if (error) return errorJson("db_error", error.message, 500);
  return json({ items: data });
}

async function upsertAreas(req: Request, auth: AuthedDevice) {
  const arr = await readJsonArray(req);
  if (arr instanceof Response) return arr;
  const svc = serviceClient();
  const rows = (arr as any[]).map((a) => ({ company_id: auth.company_id, name: String(a.name ?? "").trim() }))
    .filter((r) => r.name);
  if (rows.length === 0) return json({ items: [] });

  // Upsert by (company_id, name) — fetch existing then insert missing
  const names = rows.map((r) => r.name);
  const { data: existing } = await svc.from("areas").select("id, name").eq("company_id", auth.company_id).in("name", names);
  const existingNames = new Set((existing ?? []).map((e) => e.name.toLowerCase()));
  const toInsert = rows.filter((r) => !existingNames.has(r.name.toLowerCase()));
  let inserted: any[] = [];
  if (toInsert.length) {
    const { data, error } = await svc.from("areas").insert(toInsert).select("id, name");
    if (error) return errorJson("db_error", error.message, 500);
    inserted = data ?? [];
  }
  return json({ items: [...(existing ?? []), ...inserted] });
}

// ---------- parties ----------
async function partiesRouter(req: Request, auth: AuthedDevice, id?: string) {
  if (req.method === "GET" && !id) return listParties(req, auth);
  if (req.method === "POST" && !id) return upsertParties(req, auth);
  if (req.method === "PATCH" && id) return updateParty(req, auth, id);
  return errorJson("method_not_allowed", "Unsupported method", 405);
}

async function listParties(req: Request, auth: AuthedDevice) {
  const { limit, cursor, updated_since } = parsePagination(new URL(req.url));
  const svc = serviceClient();
  let q = svc.from("customers")
    .select("id, name, phone, address, area, gstin, default_due_days, external_ref, source, created_at")
    .eq("company_id", auth.company_id)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (cursor) q = q.gt("created_at", cursor);
  if (updated_since) q = q.gte("created_at", updated_since);
  const { data, error } = await q;
  if (error) return errorJson("db_error", error.message, 500);
  const next_cursor = data && data.length === limit ? data[data.length - 1].created_at : null;
  return json({ items: data, next_cursor });
}

async function upsertParties(req: Request, auth: AuthedDevice) {
  const arr = await readJsonArray(req);
  if (arr instanceof Response) return arr;
  const svc = serviceClient();
  const results: any[] = [];
  for (const p of arr as any[]) {
    const name = String(p.name ?? "").trim();
    if (!name) { results.push({ error: "name required" }); continue; }
    const row: any = {
      company_id: auth.company_id,
      name,
      phone: String(p.phone ?? "").trim(),
      address: String(p.address ?? "").trim(),
      area: String(p.area ?? "").trim(),
      gstin: p.gstin ? String(p.gstin).trim() : null,
      default_due_days: p.default_due_days ?? null,
      external_ref: p.external_ref ? String(p.external_ref) : null,
      source: "tally",
    };

    // Match by external_ref first, then (name, phone)
    let existing: { id: string } | null = null;
    if (row.external_ref) {
      const { data } = await svc.from("customers").select("id")
        .eq("company_id", auth.company_id).eq("external_ref", row.external_ref).maybeSingle();
      existing = data ?? null;
    }
    if (!existing && row.phone) {
      const { data } = await svc.from("customers").select("id")
        .eq("company_id", auth.company_id).eq("name", name).eq("phone", row.phone).maybeSingle();
      existing = data ?? null;
    }

    if (existing) {
      const { data, error } = await svc.from("customers").update(row).eq("id", existing.id).select("id, external_ref").single();
      results.push(error ? { error: error.message, external_ref: row.external_ref } : { id: data.id, external_ref: data.external_ref, action: "updated" });
    } else {
      const { data, error } = await svc.from("customers").insert(row).select("id, external_ref").single();
      results.push(error ? { error: error.message, external_ref: row.external_ref } : { id: data.id, external_ref: data.external_ref, action: "created" });
    }
  }
  return json({ results });
}

async function updateParty(req: Request, auth: AuthedDevice, id: string) {
  const body = await req.json().catch(() => ({}));
  const patch: any = {};
  for (const k of ["name", "phone", "address", "area", "gstin", "default_due_days"]) {
    if (k in body) patch[k] = body[k];
  }
  if (Object.keys(patch).length === 0) return errorJson("bad_request", "No updatable fields", 400);
  const svc = serviceClient();
  const { data, error } = await svc.from("customers").update(patch)
    .eq("id", id).eq("company_id", auth.company_id).select("id").maybeSingle();
  if (error) return errorJson("db_error", error.message, 500);
  if (!data) return errorJson("not_found", "Party not found", 404);
  return json({ id: data.id });
}

// ---------- invoices ----------
async function invoicesRouter(req: Request, auth: AuthedDevice, id?: string) {
  if (req.method === "GET" && !id) return listInvoices(req, auth);
  if (req.method === "POST" && !id) return upsertInvoices(req, auth);
  if (req.method === "PATCH" && id) return updateInvoice(req, auth, id);
  return errorJson("method_not_allowed", "Unsupported method", 405);
}

async function listInvoices(req: Request, auth: AuthedDevice) {
  const url = new URL(req.url);
  const { limit, cursor, updated_since } = parsePagination(url);
  const statusFilter = url.searchParams.get("status");
  const svc = serviceClient();
  let q = svc.from("invoices")
    .select("id, customer_id, customer_name, invoice_number, invoice_date, due_date, amount, paid_amount, status, description, external_ref, source, created_at")
    .eq("company_id", auth.company_id)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (cursor) q = q.gt("created_at", cursor);
  if (updated_since) q = q.gte("created_at", updated_since);
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error) return errorJson("db_error", error.message, 500);
  const next_cursor = data && data.length === limit ? data[data.length - 1].created_at : null;
  return json({ items: data, next_cursor });
}

async function resolveCustomer(svc: any, company_id: string, hint: any): Promise<string | null> {
  if (hint?.customer_id) {
    const { data } = await svc.from("customers").select("id").eq("id", hint.customer_id).eq("company_id", company_id).maybeSingle();
    if (data) return data.id;
  }
  if (hint?.customer_external_ref) {
    const { data } = await svc.from("customers").select("id").eq("company_id", company_id).eq("external_ref", hint.customer_external_ref).maybeSingle();
    if (data) return data.id;
  }
  if (hint?.customer_name && hint?.customer_phone) {
    const { data } = await svc.from("customers").select("id").eq("company_id", company_id)
      .eq("name", hint.customer_name).eq("phone", hint.customer_phone).maybeSingle();
    if (data) return data.id;
  }
  return null;
}

async function upsertInvoices(req: Request, auth: AuthedDevice) {
  const arr = await readJsonArray(req);
  if (arr instanceof Response) return arr;
  const svc = serviceClient();
  const results: any[] = [];

  for (const inv of arr as any[]) {
    const invoice_number = String(inv.invoice_number ?? "").trim();
    if (!invoice_number) { results.push({ error: "invoice_number required" }); continue; }

    const customer_id = await resolveCustomer(svc, auth.company_id, inv);
    if (!customer_id) { results.push({ error: "customer not found", external_ref: inv.external_ref }); continue; }

    // Get customer name for denorm
    const { data: cust } = await svc.from("customers").select("name").eq("id", customer_id).maybeSingle();

    const row: any = {
      company_id: auth.company_id,
      customer_id,
      customer_name: cust?.name ?? inv.customer_name ?? "",
      invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date ?? inv.invoice_date,
      due_date_source: "invoice",
      amount: Number(inv.amount ?? 0),
      description: inv.description ?? null,
      external_ref: inv.external_ref ? String(inv.external_ref) : null,
      source: "tally",
      status: "pending",
    };

    let existing: { id: string } | null = null;
    if (row.external_ref) {
      const { data } = await svc.from("invoices").select("id")
        .eq("company_id", auth.company_id).eq("external_ref", row.external_ref).maybeSingle();
      existing = data ?? null;
    }
    if (!existing) {
      const { data } = await svc.from("invoices").select("id")
        .eq("company_id", auth.company_id).eq("invoice_number", invoice_number).maybeSingle();
      existing = data ?? null;
    }

    if (existing) {
      // Don't overwrite paid_amount or status - those are ledger-derived
      const { paid_amount, status, ...updatable } = row;
      const { data, error } = await svc.from("invoices").update(updatable).eq("id", existing.id).select("id").single();
      results.push(error ? { error: error.message, invoice_number } : { id: data.id, invoice_number, action: "updated" });
    } else {
      const { data, error } = await svc.from("invoices").insert(row).select("id").single();
      results.push(error ? { error: error.message, invoice_number } : { id: data.id, invoice_number, action: "created" });
    }
  }
  return json({ results });
}

async function updateInvoice(req: Request, auth: AuthedDevice, id: string) {
  const body = await req.json().catch(() => ({}));
  const patch: any = {};
  for (const k of ["due_date", "description"]) {
    if (k in body) patch[k] = body[k];
  }
  if (Object.keys(patch).length === 0) return errorJson("bad_request", "No updatable fields (only due_date, description)", 400);
  const svc = serviceClient();
  const { data, error } = await svc.from("invoices").update(patch)
    .eq("id", id).eq("company_id", auth.company_id).select("id").maybeSingle();
  if (error) return errorJson("db_error", error.message, 500);
  if (!data) return errorJson("not_found", "Invoice not found", 404);
  return json({ id: data.id });
}

// ---------- payments ----------
async function paymentsRouter(req: Request, auth: AuthedDevice, id?: string) {
  if (req.method === "GET" && !id) return listPayments(req, auth);
  if (req.method === "POST" && !id) return recordPayments(req, auth);
  return errorJson("method_not_allowed", "Payments are immutable; use a reversing payment to correct", 405);
}

async function listPayments(req: Request, auth: AuthedDevice) {
  const { limit, cursor, updated_since } = parsePagination(new URL(req.url));
  const svc = serviceClient();
  let q = svc.from("payments")
    .select("id, invoice_id, customer_name, amount, mode, date, notes, collected_by, external_ref, source, created_at")
    .eq("company_id", auth.company_id)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (cursor) q = q.gt("created_at", cursor);
  if (updated_since) q = q.gte("created_at", updated_since);
  const { data, error } = await q;
  if (error) return errorJson("db_error", error.message, 500);
  const next_cursor = data && data.length === limit ? data[data.length - 1].created_at : null;
  return json({ items: data, next_cursor });
}

async function recordPayments(req: Request, auth: AuthedDevice) {
  const arr = await readJsonArray(req);
  if (arr instanceof Response) return arr;
  const svc = serviceClient();
  const results: any[] = [];

  for (const p of arr as any[]) {
    // Resolve invoice
    let invoice: { id: string; customer_name: string; amount: number; paid_amount: number } | null = null;
    if (p.invoice_id) {
      const { data } = await svc.from("invoices").select("id, customer_name, amount, paid_amount")
        .eq("id", p.invoice_id).eq("company_id", auth.company_id).maybeSingle();
      invoice = data;
    }
    if (!invoice && p.invoice_external_ref) {
      const { data } = await svc.from("invoices").select("id, customer_name, amount, paid_amount")
        .eq("company_id", auth.company_id).eq("external_ref", p.invoice_external_ref).maybeSingle();
      invoice = data;
    }
    if (!invoice && p.invoice_number) {
      const { data } = await svc.from("invoices").select("id, customer_name, amount, paid_amount")
        .eq("company_id", auth.company_id).eq("invoice_number", p.invoice_number).maybeSingle();
      invoice = data;
    }
    if (!invoice) { results.push({ error: "invoice not found", external_ref: p.external_ref }); continue; }

    const amount = Number(p.amount ?? 0);
    if (!(amount > 0)) { results.push({ error: "amount must be > 0", external_ref: p.external_ref }); continue; }

    // Idempotency: external_ref OR local_id
    if (p.external_ref) {
      const { data: dup } = await svc.from("payments").select("id")
        .eq("company_id", auth.company_id).eq("external_ref", String(p.external_ref)).maybeSingle();
      if (dup) { results.push({ id: dup.id, action: "duplicate", external_ref: p.external_ref }); continue; }
    }
    if (p.local_id) {
      const { data: dup } = await svc.from("payments").select("id")
        .eq("company_id", auth.company_id).eq("local_id", String(p.local_id)).maybeSingle();
      if (dup) { results.push({ id: dup.id, action: "duplicate", local_id: p.local_id }); continue; }
    }

    const mode = ["cash", "upi", "bank_transfer"].includes(p.mode) ? p.mode : "cash";

    const { data: payment, error: payErr } = await svc.from("payments").insert({
      company_id: auth.company_id,
      invoice_id: invoice.id,
      customer_name: invoice.customer_name,
      amount,
      mode,
      date: p.date ?? new Date().toISOString().slice(0, 10),
      notes: p.notes ?? null,
      collected_by: p.collected_by ?? "Tally Sync",
      external_ref: p.external_ref ? String(p.external_ref) : null,
      local_id: p.local_id ? String(p.local_id) : null,
      source: "tally",
      synced: true,
    }).select("id").single();
    if (payErr) { results.push({ error: payErr.message, external_ref: p.external_ref }); continue; }

    // Recompute paid_amount + status from ledger
    const { data: sumRows } = await svc.from("payments").select("amount").eq("invoice_id", invoice.id);
    const newPaid = (sumRows ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
    const status = newPaid >= invoice.amount ? "paid" : "pending";
    await svc.from("invoices").update({ paid_amount: newPaid, status }).eq("id", invoice.id);

    results.push({ id: payment.id, action: "created", external_ref: p.external_ref ?? null });
  }
  return json({ results });
}

// ---------- changes feed ----------
async function changesFeed(req: Request, auth: AuthedDevice) {
  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  if (!since) return errorJson("bad_request", "since=<iso> required", 400);
  const types = (url.searchParams.get("types") ?? "parties,invoices,payments").split(",").map((s) => s.trim());
  const svc = serviceClient();
  const out: Record<string, any[]> = {};
  if (types.includes("parties")) {
    const { data } = await svc.from("customers")
      .select("id, name, phone, address, area, gstin, external_ref, source, created_at")
      .eq("company_id", auth.company_id).gte("created_at", since).order("created_at").limit(MAX_PAGE);
    out.parties = data ?? [];
  }
  if (types.includes("invoices")) {
    const { data } = await svc.from("invoices")
      .select("id, customer_id, customer_name, invoice_number, invoice_date, due_date, amount, paid_amount, status, external_ref, source, created_at")
      .eq("company_id", auth.company_id).gte("created_at", since).order("created_at").limit(MAX_PAGE);
    out.invoices = data ?? [];
  }
  if (types.includes("payments")) {
    const { data } = await svc.from("payments")
      .select("id, invoice_id, customer_name, amount, mode, date, external_ref, source, created_at")
      .eq("company_id", auth.company_id).gte("created_at", since).order("created_at").limit(MAX_PAGE);
    out.payments = data ?? [];
  }
  return json({ since, server_time: new Date().toISOString(), ...out });
}
