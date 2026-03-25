

## Fix: Contact Picker Should Only Update Phone in Edit Customer Form

When editing an existing customer and using the contact picker, the customer's name should not be overwritten — only the phone number should be updated.

### Change

**`src/components/forms/EditCustomerDialog.tsx`** — Remove the `form.setValue("name", ...)` calls from both the Android bridge and Web Contact Picker paths inside `pickFromContacts()`.

Lines to remove:
- Android path: `if (contact.name) form.setValue("name", contact.name);`
- Web path: `if (c.name?.[0]) form.setValue("name", c.name[0]);`

Also remove the address setValue calls since the user only wants phone updated:
- Android path: `if (contact.address) form.setValue("address", contact.address);`
- Web path: the address block

Keep only the phone setValue lines in both paths.

### Files Changed
1. `src/components/forms/EditCustomerDialog.tsx` — Strip name/address updates from contact picker, keep phone only

