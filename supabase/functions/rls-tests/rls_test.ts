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

// Create a staff user attached to an existing company via handle_new_user metadata.
async function createStaff(
  companyId: string,
  role: "delivery_staff" | "manager" | "collection_staff" | "owner",
  suffix: string,
): Promise<TestOwner> {
  if (!admin) throw new Error("admin client not initialised");
  const email = `rls-${role}-${suffix}-${crypto.randomUUID()}@example.test`;
  const password = `Test-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: `${role} ${suffix}`,
      company_id: companyId,
      role,
      phone: "",
    },
  });
  if (error) throw error;
  const userId = data.user!.id;
  const client = createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  return { userId, companyId, client, email };
}

Deno.test(
  "RLS: delivery_staff OTP visibility scoped to assigned invoices",
  { ignore: !ENV_READY },
  async (t) => {
    if (!admin) return;
    const A = await createOwner("otp-A");
    const B = await createOwner("otp-B");
    const D = await createStaff(A.companyId, "delivery_staff", "D");
    const D2 = await createStaff(A.companyId, "delivery_staff", "D2");

    // Seed customer + invoices in company A, and one in company B.
    const { data: custA } = await admin
      .from("customers")
      .insert({ company_id: A.companyId, name: "Cust A", phone: "111" })
      .select().single();
    const { data: custB } = await admin
      .from("customers")
      .insert({ company_id: B.companyId, name: "Cust B", phone: "222" })
      .select().single();

    const today = new Date().toISOString().slice(0, 10);
    const mkInvoice = async (companyId: string, customerId: string, deliveredBy: string | null) => {
      const { data, error } = await admin!.from("invoices").insert({
        company_id: companyId,
        customer_id: customerId,
        customer_name: "x",
        invoice_number: `OTP-${crypto.randomUUID().slice(0, 8)}`,
        amount: 100,
        due_date: today,
        invoice_date: today,
        status: "pending",
        delivered_by: deliveredBy,
      }).select().single();
      if (error) throw error;
      return data;
    };

    const invMine = await mkInvoice(A.companyId, custA!.id, D.userId);
    const invOther = await mkInvoice(A.companyId, custA!.id, D2.userId);
    const invUnassigned = await mkInvoice(A.companyId, custA!.id, null);
    const invCoB = await mkInvoice(B.companyId, custB!.id, null);

    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const mkOtp = async (companyId: string, invoiceId: string, customerId: string, code: string) => {
      const { data, error } = await admin!.from("delivery_otps").insert({
        company_id: companyId,
        invoice_id: invoiceId,
        customer_id: customerId,
        otp_code: code,
        expires_at: expires,
      }).select().single();
      if (error) throw error;
      return data;
    };

    const otpMine = await mkOtp(A.companyId, invMine.id, custA!.id, "111111");
    const otpOther = await mkOtp(A.companyId, invOther.id, custA!.id, "222222");
    const otpUnassigned = await mkOtp(A.companyId, invUnassigned.id, custA!.id, "333333");
    const otpCoB = await mkOtp(B.companyId, invCoB.id, custB!.id, "444444");

    try {
      await t.step("delivery_staff CAN read OTP for invoice assigned to them", async () => {
        const { data, error } = await D.client
          .from("delivery_otps").select("id, otp_code").eq("id", otpMine.id);
        assertEquals(error, null);
        assertEquals(data?.length, 1, "assigned OTP must be visible");
      });

      await t.step("delivery_staff CAN read OTP for unassigned invoice in their company", async () => {
        const { data } = await D.client
          .from("delivery_otps").select("id").eq("id", otpUnassigned.id);
        assertEquals(data?.length, 1, "unassigned OTP in same company must be visible");
      });

      await t.step("delivery_staff CANNOT read OTP for invoice assigned to another staff", async () => {
        const { data } = await D.client
          .from("delivery_otps").select("id").eq("id", otpOther.id);
        assertEquals(data?.length ?? 0, 0, "OTP for other staff's invoice must be hidden");
      });

      await t.step("delivery_staff CANNOT read OTPs from a different company", async () => {
        const { data } = await D.client
          .from("delivery_otps").select("id").eq("id", otpCoB.id);
        assertEquals(data?.length ?? 0, 0, "cross-tenant OTP must be hidden");
      });

      await t.step("delivery_staff CANNOT update or delete OTPs", async () => {
        await D.client.from("delivery_otps").update({ verified: true }).eq("id", otpMine.id);
        await D.client.from("delivery_otps").delete().eq("id", otpMine.id);
        const { data } = await admin!.from("delivery_otps")
          .select("id, verified").eq("id", otpMine.id).single();
        assert(data, "OTP must still exist");
        assertEquals(data!.verified, false, "verified flag must not change");
      });
    } finally {
      await admin.from("delivery_otps").delete().in("id", [otpMine.id, otpOther.id, otpUnassigned.id, otpCoB.id]);
      await admin.from("invoices").delete().in("id", [invMine.id, invOther.id, invUnassigned.id, invCoB.id]);
      await admin.from("customers").delete().in("id", [custA!.id, custB!.id]);
      await cleanup(A);
      await cleanup(B);
      await admin.from("user_roles").delete().eq("user_id", D.userId);
      await admin.from("profiles").delete().eq("id", D.userId);
      await admin.auth.admin.deleteUser(D.userId);
      await admin.from("user_roles").delete().eq("user_id", D2.userId);
      await admin.from("profiles").delete().eq("id", D2.userId);
      await admin.auth.admin.deleteUser(D2.userId);
    }
  },
);

Deno.test(
  "RLS: has_role() is scoped to the user's own company",
  { ignore: !ENV_READY },
  async (t) => {
    if (!admin) return;
    // U is owner of A. Admin injects a bonus 'owner' role for U in company B.
    // has_role(U, 'owner') must still reflect U's company (A) context only:
    // a role granted in an unrelated company must NOT satisfy role checks.
    const A = await createOwner("hr-A");
    const B = await createOwner("hr-B");

    // Inject cross-company role grant directly (simulates a hypothetical mis-provisioning).
    const { error: injectErr } = await admin.from("user_roles").insert({
      user_id: A.userId,
      role: "manager",
      company_id: B.companyId,
    });
    if (injectErr) throw injectErr;

    // Seed a customer in company B; A must NOT be able to touch it despite the injected B-role.
    const { data: custB } = await admin.from("customers")
      .insert({ company_id: B.companyId, name: "Cust B", phone: "555" })
      .select().single();

    try {
      await t.step("has_role RPC returns false for a role held only in another company", async () => {
        // A holds 'manager' ONLY in B, not in A. Their profile.company_id = A,
        // so has_role(A.uid, 'manager') must be false.
        const { data, error } = await A.client.rpc("has_role", {
          _user_id: A.userId,
          _role: "manager",
        });
        assertEquals(error, null);
        assertEquals(data, false, "cross-company role must not satisfy has_role()");
      });

      await t.step("has_role RPC returns true for a role held in the user's own company", async () => {
        const { data, error } = await A.client.rpc("has_role", {
          _user_id: A.userId,
          _role: "owner",
        });
        assertEquals(error, null);
        assertEquals(data, true, "own-company role must still satisfy has_role()");
      });

      await t.step("cross-company role grant does NOT allow reading B's customers", async () => {
        const { data } = await A.client.from("customers").select("id").eq("id", custB!.id);
        assertEquals(data?.length ?? 0, 0, "cross-company role must not leak reads");
      });

      await t.step("cross-company role grant does NOT allow deleting B's customer", async () => {
        await A.client.from("customers").delete().eq("id", custB!.id);
        const { data } = await admin!.from("customers").select("id").eq("id", custB!.id);
        assertEquals(data?.length, 1, "cross-company role must not allow deletes");
      });

      await t.step("cross-company role grant does NOT allow updating B's customer", async () => {
        await A.client.from("customers").update({ name: "HIJACK" }).eq("id", custB!.id);
        const { data } = await admin!.from("customers").select("name").eq("id", custB!.id).single();
        assertEquals(data?.name, "Cust B", "cross-company role must not allow updates");
      });
    } finally {
      await admin.from("customers").delete().eq("id", custB!.id);
      await admin.from("user_roles").delete().eq("user_id", A.userId).eq("company_id", B.companyId);
      await cleanup(A);
      await cleanup(B);
    }
  },
);

Deno.test("env check (skipped if service role unavailable)", () => {
  if (!ENV_READY) {
    console.warn(
      "[rls-tests] SUPABASE_SERVICE_ROLE_KEY/SUPABASE_URL/SUPABASE_ANON_KEY missing — main RLS test is ignored. Provide them to actually exercise the policies.",
    );
  }
});
