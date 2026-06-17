# Make the landing page reachable at the root URL

## Problem
Today the root URL `/` mounts `SplashScreen`, which always redirects:
- to `/dashboard` if a session exists
- to `/login` if not

The marketing/landing page lives at `/home` and is a public route, but new visitors landing on `collectweb.in` never see it — they are immediately sent to `/login`. That's why "the home page isn't loading."

## Fix
Stop using the splash as the unauthenticated entry point. The root URL should show the landing page for guests and the dashboard for signed-in users.

### Changes
1. **`src/App.tsx`**
   - Route `/` to a small `RootRedirect` component instead of `SplashScreen`.
   - `RootRedirect` reads `useAuth()`:
     - while `loading` → show the existing splash visual (so we keep the branded loading state)
     - if `session` → `<Navigate to="/dashboard" replace />`
     - else → render `<Home />` directly (no redirect to `/login`)
   - Keep `/home` as an alias that always renders `<Home />` (so existing inbound links still work).
   - Keep `/login`, `/signup`, `/dashboard`, etc. unchanged.

2. **`src/pages/SplashScreen.tsx`**
   - Extract the visual JSX (logo, pulse ring, tagline, progress bar) into a reusable `SplashVisual` so `RootRedirect` can show it during the auth-loading state without the auto-redirect side effect.
   - The old `SplashScreen` page is no longer routed; remove the import from `App.tsx`.

3. **No backend, no styling, no copy changes.** Landing page content stays as-is.

## Result
- `https://collectweb.in/` → shows the landing page for guests, dashboard for signed-in users.
- `https://collectweb.in/home` → still shows the landing page (back-compat).
- Signed-in users still get the dashboard immediately; the branded splash visual still appears briefly while the session check resolves.
