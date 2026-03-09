

## Plan: Add Change Password to Mobile Header Dropdown Only

### Changes

**1. Create `src/components/forms/ChangePasswordDialog.tsx`**
- Dialog with new password + confirm password fields
- Calls `supabase.auth.updateUser({ password })` on submit
- Validates: min 6 chars, passwords match
- Success/error toast, closes on success

**2. Update `src/components/layout/AppLayout.tsx`**
- Import `Key` from lucide-react and the new `ChangePasswordDialog`
- Add `changePasswordOpen` state
- Add "Change Password" `DropdownMenuItem` with `Key` icon between user label and "Sign Out" in the **mobile header dropdown only**
- Render `<ChangePasswordDialog>` at bottom of component

No changes to the sidebar user section.

