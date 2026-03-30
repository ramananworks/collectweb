

## Razorpay Payment Gateway for Pricing Plans

### Overview
Integrate Razorpay checkout into the Home page pricing buttons so users can pay for Pro Monthly (₹299/mo) and Pro Yearly (₹2,999/yr) plans directly. The flow: user clicks "Start 14-Day Trial" → Razorpay checkout opens → payment is processed → user is redirected to signup/dashboard.

### Prerequisites
1. **Razorpay API Key (Secret)** — Need `RAZORPAY_KEY_ID` (publishable, stored in code) and `RAZORPAY_KEY_SECRET` (stored as a backend secret) from your Razorpay dashboard
2. No existing connector for Razorpay, so we'll use a custom edge function

### Architecture

```text
User clicks Plan → Edge Function creates Razorpay Order → 
Frontend opens Razorpay Checkout → User pays → 
Razorpay callback → Edge Function verifies payment → 
Updates company plan in DB
```

### Changes

#### 1. Store Razorpay Secret
- Add `RAZORPAY_KEY_SECRET` as a backend secret
- Store `RAZORPAY_KEY_ID` (publishable key) in the frontend code

#### 2. New Edge Function: `supabase/functions/create-razorpay-order/index.ts`
- Accepts `{ plan: "pro_monthly" | "pro_yearly", company_id? }` 
- Creates a Razorpay order via their API (`POST https://api.razorpay.com/v1/orders`)
- Returns `{ order_id, amount, currency, key_id }`
- Auth: validates JWT, gets user's company

#### 3. New Edge Function: `supabase/functions/verify-razorpay-payment/index.ts`
- Accepts `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
- Verifies signature using HMAC SHA256 with `RAZORPAY_KEY_SECRET`
- On success: updates `companies.plan` to `pro_monthly` or `pro_yearly`
- Returns success/failure

#### 4. Database Migration
- Add `plan_expires_at` (timestamptz, nullable) column to `companies` table for tracking subscription expiry

#### 5. Frontend: `src/pages/Home.tsx`
- Load Razorpay checkout script (`https://checkout.razorpay.com/v1/checkout.js`)
- Replace "Start 14-Day Trial" links with buttons that:
  1. Call `create-razorpay-order` edge function
  2. Open Razorpay checkout with returned order details
  3. On success callback, call `verify-razorpay-payment`
  4. Show success toast and redirect to `/signup` or `/dashboard`

#### 6. Frontend: New hook `src/hooks/use-razorpay.ts`
- `useRazorpayCheckout()` — handles script loading, order creation, checkout opening, and verification
- Reusable across Home page and potentially Settings page for plan upgrades

### Files Changed
1. `supabase/functions/create-razorpay-order/index.ts` — New edge function
2. `supabase/functions/verify-razorpay-payment/index.ts` — New edge function  
3. `src/hooks/use-razorpay.ts` — New hook for Razorpay checkout flow
4. `src/pages/Home.tsx` — Wire pricing buttons to Razorpay checkout
5. Database migration — Add `plan_expires_at` to companies table

