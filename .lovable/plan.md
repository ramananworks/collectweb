

## Plan: Auto-fill and clear collection amount

**Goal**: When an invoice is selected in the Record Collection form, auto-fill the amount field with the remaining balance. When the user taps/clicks the amount field to edit, clear it completely for fresh input.

### Changes — `src/components/forms/RecordPaymentDialog.tsx`

1. **Watch `invoice_id`** and add a state flag `amountAutoFilled` to track whether the current value was auto-filled.

2. **Auto-fill on invoice selection**: In the invoice `Select`'s `onValueChange`, look up the selected invoice's remaining balance (`amount - paid_amount`) and call `form.setValue("amount", remainingBalance)`. Set `amountAutoFilled = true`.

3. **Clear on focus**: Update the amount field's `onFocus` handler — if `amountAutoFilled` is true, clear the field to `undefined` and set the flag to false. This ensures the auto-filled value is fully erased on first touch, letting the user type freely.

4. **Reset flag** when customer changes (since invoice resets) and when dialog closes.

No backend or schema changes needed.

