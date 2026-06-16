## Update Razorpay to Live Key

Update the `RAZORPAY_KEY_ID` secret to `rzp_live_SX6sttcI2z1CnE` and the matching `RAZORPAY_KEY_SECRET` to the live secret from your Razorpay dashboard.

### Steps
1. Call `update_secret` for both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — you'll enter both values in the secure form (Key ID: `rzp_live_SX6sttcI2z1CnE`, Key Secret: from Razorpay → Settings → API Keys).
2. Edge functions that use Razorpay (subscription/checkout) automatically pick up the new values on next invocation — no code change needed.
3. Verify by running a real test subscription checkout from the app.

### Notes
- The Key Secret must be the **live** secret paired with this live Key ID, otherwise checkout signature verification will fail.
- No frontend code changes — the publishable Key ID is fetched from the edge function at checkout time, not hardcoded.
- Live mode means real money will be charged. Make sure the Razorpay account is fully activated (KYC complete).