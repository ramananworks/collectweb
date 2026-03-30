

## Make Home Page the Default Landing Page

### Overview
Change the app so that logged-out users land on `/home` (the marketing/landing page) instead of `/login`. The splash screen redirect for unauthenticated users changes from `/login` to `/home`.

### Changes

#### 1. `src/pages/SplashScreen.tsx` (line 31)
- Change `window.location.replace("/login")` → `window.location.replace("/home")`

#### 2. `src/App.tsx` (route for `/`)
- Change the root route from `<SplashScreen />` to `<Home />` so direct visits to `/` show the landing page
- Keep `/home` route as-is for backward compatibility

#### 3. `src/components/layout/AppLayout.tsx` — Sign Out handler
- Change `window.location.replace("/login")` → `window.location.replace("/home")` so logout redirects to the landing page

### Files Changed
1. `src/pages/SplashScreen.tsx` — Redirect unauthenticated users to `/home`
2. `src/App.tsx` — Set `/` route to Home page
3. `src/components/layout/AppLayout.tsx` — Logout redirects to `/home`

