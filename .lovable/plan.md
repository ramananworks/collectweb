

## Plan: Multi-Role Assignment for Team Members

### Problem
Currently each user has a single role row in `user_roles`. An owner cannot assign both "Collection Staff" and "Delivery Staff" to the same employee.

### Approach
The `user_roles` table already has a structure that supports multiple rows per user (composite unique on `user_id + role`). We need to shift from "single role per user" to "multiple roles per user" across the entire stack.

### Database Changes
1. **Remove the unique constraint** on `(user_id, role)` if it prevents multiple role rows — actually this constraint allows it (one row per role). The issue is the app currently uses `.single()` queries expecting one role. We need to allow multiple rows per user_id (different roles).
2. No schema migration needed — the existing `user_roles` table already supports multiple rows per user with different roles.

### Code Changes

**1. AuthContext (`src/contexts/AuthContext.tsx`)**
- Change `role: AppRole | null` to `roles: AppRole[]`
- Fetch all roles: `.select("role").eq("user_id", userId)` (remove `.single()`)
- Expose `roles` array instead of single `role`

**2. usePermissions (`src/hooks/usePermissions.ts`)**
- Accept `roles` array from AuthContext
- `isOwner = roles.includes("owner")`, etc.
- Permissions become unions: `canConfirmDelivery = isOwner || isManager || isDeliveryStaff`

**3. AppLayout (`src/components/layout/AppLayout.tsx`)**
- Filter nav items checking if any of user's roles match the allowed roles array

**4. UserManagement (`src/pages/UserManagement.tsx`)**
- Display multiple role badges per user
- **Edit Role dialog**: Replace single `<Select>` with checkboxes for each role (Manager, Collection Staff, Delivery Staff)
- Call manage-member edge function with a roles array

**5. InviteMemberDialog (`src/components/forms/InviteMemberDialog.tsx`)**
- Allow selecting multiple roles via checkboxes when inviting

**6. Edge Functions**
- **`manage-member`**: `update_role` action → delete existing roles, insert new role rows
- **`invite-member`**: Accept roles array in metadata
- **`delivery-otp`**: Check if user has delivery-capable role (any of their roles)

**7. `handle_new_user` DB function**
- Update to handle a JSON array of roles from `raw_user_meta_data` and insert multiple `user_roles` rows

**8. StatusBadges (`src/components/shared/StatusBadges.tsx`)**
- Support rendering multiple `<RoleBadge>` components per user

**9. `useUserRoles` hook in UserManagement**
- Group roles by `user_id` to return `Map<string, AppRole[]>`

### Summary of Files to Modify
- `src/contexts/AuthContext.tsx` — roles array
- `src/hooks/usePermissions.ts` — array-based checks
- `src/components/layout/AppLayout.tsx` — multi-role nav filtering
- `src/pages/UserManagement.tsx` — multi-select UI for roles
- `src/components/forms/InviteMemberDialog.tsx` — multi-select on invite
- `src/components/shared/StatusBadges.tsx` — render multiple badges
- `supabase/functions/manage-member/index.ts` — handle roles array
- `supabase/functions/invite-member/index.ts` — handle roles array
- `supabase/functions/delivery-otp/index.ts` — check any matching role
- DB function `handle_new_user` — insert multiple role rows (migration)

