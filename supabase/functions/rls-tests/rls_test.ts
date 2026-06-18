// Automated multi-tenant RLS isolation tests.
//
// Verifies that an authenticated user from company B cannot:
//   - SELECT customers belonging to company A
//   - DELETE A's customers
//   - UPDATE A's customers (including moving them into B)
//   - INSERT a customer with company_id = A (WITH CHECK)
//   - INSERT an invoice in B that references A's customer (cross-tenant FK trigger)
//
// Run via:  supabase__test_edge_functions { functions: ["rls-tests"] }

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const ENV_READY = Boolean(SUPABASE_URL && SERVICE_ROLE && ANON);

const admin: SupabaseClient | null = ENV_READY
  ? createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

interface TestOwner {
  userId: string;
  companyId: string;
  client: SupabaseClient;
  email: string;
}

async function createOwner(suffix: string): Promise<TestOwner> {
  if (!admin) throw new Error("admin client not initialised");
  const email = `rls-test-${suffix}-${crypto.randomUUID()}@example.test`;
  const password = `Test-${crypto.randomUUID()}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: `Owner ${suffix}`,
      company_name: `RLS Test Co ${suffix}`,
      phone: "",
    },
  });
  if (error) throw error;
  const userId = data.user!.id;

  // The handle_new_user trigger created a company + profile. Look it up.
  const { data: prof, error: pErr } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single();
  if (pErr) throw pErr;

  const client = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;

  return { userId, companyId: prof!.company_id as string, client, email };
}

async function cleanup(owner: TestOwner) {
  if (!admin) return;
  await admin.from("invoices").delete().eq("company_id", owner.companyId);
  await admin.from("customers").delete().eq("company_id", owner.companyId);
  await admin.from("areas").delete().eq("company_id", owner.companyId);
  await admin.from("user_roles").delete().eq("user_id", owner.userId);
  await admin.from("profiles").delete().eq("id", owner.userId);
  await admin.from("companies").delete().eq("id", owner.companyId);
  await admin.auth.admin.deleteUser(owner.userId);
}

Deno.test("RLS multi-tenant isolation", { ignore: !ENV_READY }, async (t) => {
  if (!admin) return;
  const A = await createOwner("A");
  const B = await createOwner("B");

  // Seed a customer in company A via service role (bypasses RLS).
  const { data: custA, error: insErr } = await admin
    .from("customers")
    .insert({
      company_id: A.companyId,
      name: "Cust A",
      phone: "1234567890",
    })
    .select()
    .single();
  if (insErr) throw insErr;

  try {
    await t.step("B cannot SELECT A's customers", async () => {
      const { data, error } = await B.client
        .from("customers")
        .select("id")
        .eq("id", custA.id);
      assertEquals(error, null);
      assertEquals(data?.length ?? 0, 0, "RLS should hide cross-tenant rows");
    });

    await t.step("B cannot DELETE A's customer", async () => {
      await B.client.from("customers").delete().eq("id", custA.id);
      const { data: stillThere } = await admin
        .from("customers")
        .select("id")
        .eq("id", custA.id);
      assertEquals(stillThere?.length, 1, "customer should still exist");
    });

    await t.step("B cannot UPDATE A's customer (move into B)", async () => {
      await B.client
        .from("customers")
        .update({ company_id: B.companyId, name: "HIJACKED" })
        .eq("id", custA.id);
      const { data: row } = await admin
        .from("customers")
        .select("company_id, name")
        .eq("id", custA.id)
        .single();
      assertEquals(row?.company_id, A.companyId, "company_id must not change");
      assertEquals(row?.name, "Cust A", "name must not change");
    });

    await t.step("B cannot INSERT a customer forged with A's company_id", async () => {
      const { error } = await B.client.from("customers").insert({
        company_id: A.companyId,
        name: "Forged",
        phone: "9999999999",
      });
      assert(error, "RLS WITH CHECK must block forged company_id");
    });

    await t.step("B cannot INSERT an invoice in B referencing A's customer", async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await B.client.from("invoices").insert({
        company_id: B.companyId,
        customer_id: custA.id,
        customer_name: "Cust A",
        invoice_number: `RLS-${Date.now()}`,
        amount: 100,
        due_date: today,
        invoice_date: today,
        status: "pending",
      });
      assert(error, "cross-tenant FK trigger must reject the insert");
    });

    await t.step("B cannot UPDATE A's customer via direct field edit", async () => {
      await B.client
        .from("customers")
        .update({ phone: "0000000000" })
        .eq("id", custA.id);
      const { data: row } = await admin
        .from("customers")
        .select("phone")
        .eq("id", custA.id)
        .single();
      assertEquals(row?.phone, "1234567890", "phone must not change");
    });
  } finally {
    await admin.from("customers").delete().eq("id", custA.id);
    await cleanup(A);
    await cleanup(B);
  }
});
