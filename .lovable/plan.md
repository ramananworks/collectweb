

## Plan: Add User Avatar Dropdown to Mobile Header

Add a user avatar button on the right side of the mobile header that opens a dropdown with user-specific controls (profile info and sign out). No company settings link.

### Changes: `src/components/layout/AppLayout.tsx`

1. **Import** `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuTrigger` from `@/components/ui/dropdown-menu`

2. **Add after the company name div** (line 263), before `</header>`:
   - A `DropdownMenu` with avatar trigger (`h-9 w-9` circle with user initials)
   - Dropdown content:
     - Label: user name + role
     - Separator
     - "Sign Out" item → opens existing logout dialog

No navigation to `/settings` — this is purely user-level controls (identity display + sign out).

