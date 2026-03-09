

## Plan: Maximize Dropdown Menu Size

Increase the width of the mobile avatar dropdown and make its items larger/more touch-friendly.

### Changes in `src/components/layout/AppLayout.tsx`

**DropdownMenuContent (line 297)**
- Change `w-48` → `w-64` for wider menu
- Add `p-2` for more internal padding

**DropdownMenuLabel (lines 298-301)**
- Increase name to `text-base font-semibold`, role to `text-sm`
- Add `px-3 py-2.5` padding

**All DropdownMenuItems (lines 303-355)**
- Add `py-3 px-3 text-base` for larger tap targets and text
- Increase icons from `h-4 w-4` to `h-5 w-5`

**DropdownMenuSeparator**
- Add `my-1.5` for more breathing room

Single file edit, purely styling changes.

