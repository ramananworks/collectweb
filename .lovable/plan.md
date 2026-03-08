

## Why Invitation Links Open on the Wrong Page

### Root Cause

When inviting a member, the `redirectUrl` is set to `window.location.origin` which resolves to the **preview URL** (`96391571-...lovableproject.com/set-password`). Supabase Auth only allows redirects to URLs in its "allowed redirect URLs" list. If the preview URL isn't whitelisted, Supabase falls back to the default site URL (which may be a lovable.dev page).

### Fix

Two changes needed:

1. **`InviteMemberDialog.tsx`** — Use the published app URL instead of `window.location.origin`:
   ```
   redirectUrl: "https://collectweb.lovable.app/set-password"
   ```

2. **Auth configuration** — Add the published domain and set it as the site URL using the `configure_auth` tool:
   - Site URL: `https://collectweb.lovable.app`
   - Additional redirect URLs: `https://collectweb.lovable.app/set-password`, `https://collectweb.lovable.app/dashboard`

### Files to Modify
- `src/components/forms/InviteMemberDialog.tsx` — hardcode published URL for redirectUrl
- Auth settings via configure_auth tool

