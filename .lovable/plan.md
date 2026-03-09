

## Plan: Add Light/Dark Mode Toggle

The project already has dark mode CSS variables defined and `next-themes` installed. Just need to wire up the theme provider and add a toggle to the mobile header dropdown.

### Changes

**1. Wrap app with ThemeProvider (`src/App.tsx`)**
- Import `ThemeProvider` from `next-themes`
- Wrap the app content with `<ThemeProvider attribute="class" defaultTheme="light" storageKey="theme">`

**2. Add theme toggle to mobile header dropdown (`src/components/layout/AppLayout.tsx`)**
- Import `useTheme` from `next-themes` and `Sun`/`Moon` icons from lucide-react
- Add a "Dark Mode" / "Light Mode" toggle `DropdownMenuItem` between "Change Password" and "Sign Out"
- Clicking it calls `setTheme(theme === "dark" ? "light" : "dark")`

Two files changed, no new files needed.

