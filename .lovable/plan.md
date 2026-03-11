

## Plan: Searchable Customer Dropdowns in Forms

Replace the plain `<Select>` dropdowns for customer selection with a searchable combobox using the existing `cmdk`-based `<Command>` + `<Popover>` pattern (already installed).

### Files to Change

**1. Create `src/components/shared/CustomerCombobox.tsx`**
- Reusable combobox component using `Popover` + `Command` (CommandInput, CommandList, CommandEmpty, CommandItem)
- Props: `customers`, `value`, `onValueChange`, `placeholder`, `disabled`
- Shows customer name, filters by typing, displays check icon for selected item

**2. `src/components/forms/CreateInvoiceDialog.tsx`**
- Replace the `<Select>` for `customer_id` (lines 143-155) with `<CustomerCombobox>`
- Pass customers list and wire `onValueChange` to `field.onChange`

**3. `src/components/forms/RecordPaymentDialog.tsx`**
- Replace the `<Select>` for `customer_id` (lines 132-141) with `<CustomerCombobox>`
- Preserve the existing side-effect logic (reset invoice_id, amount on change)

