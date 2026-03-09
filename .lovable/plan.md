
Goal: In the Invoice Creation dialog, make the Amount field clear out the prefilled/example value when the user clicks into it, so typing starts cleanly.

Implementation plan

1) Update Amount field behavior in `src/components/forms/CreateInvoiceDialog.tsx`
- Keep the existing validation (`amount` required, min 1).
- Add custom focus behavior on the Amount input:
  - When the input receives focus and its current value is the default/example value (currently `0`), clear it immediately.
  - Preserve normal editing if the value is already a meaningful amount (especially when coming from scanned invoice defaults).

2) Normalize initial/reset values to avoid unwanted “0” UX
- Adjust form defaults/reset handling so Amount does not force a confusing editable `0` state unless intentionally set.
- Ensure scanned/default extracted amounts still populate correctly and are not wiped automatically unless they match the placeholder-style default behavior.

3) Keep submission and validation safe
- Confirm that clearing on focus does not break `react-hook-form` state updates.
- Ensure empty amount still triggers existing validation message until user enters a valid number.
- No backend/database changes required.

Technical details
- File: `src/components/forms/CreateInvoiceDialog.tsx`
- Change scope:
  - Amount `FormField` render block (`<Input type="number" ... />`)
  - `useForm` `defaultValues` and `form.reset(...)` amount handling
- Intended interaction logic (high level):
  - `onFocus`: if current value is the default-style value, set field to empty
  - `onChange`: continue writing numeric input through RHF field handlers
- This is a UI/form-state change only; no migration, policies, or auth updates needed.

Validation checklist after implementation
- Open Create Invoice dialog manually: Amount is not annoyingly prefilled with a value that must be deleted.
- Click Amount when it contains default/example value: field clears.
- Click Amount when it contains a real amount (e.g., from scan): value is preserved unless user edits.
- Submit with empty Amount: shows validation error.
- Submit with valid Amount: invoice creation still succeeds.
