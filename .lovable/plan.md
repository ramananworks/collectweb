

## Plan: Add Contact Picker Inside Phone Field in Edit Customer Dialog

Add a contact picker button inside the phone number input field in `EditCustomerDialog`, matching the existing pattern from `AddCustomerDialog`.

### Changes in `src/components/forms/EditCustomerDialog.tsx`

1. **Add imports**: `Contact` from `lucide-react`, `hapticLight` from haptics, copy `supportsContacts()` helper.

2. **Add `pickFromContacts` function** inside the component — reuse the same dual-path logic (Android bridge → Web Contact Picker API) from `AddCustomerDialog`, updating form fields (name, phone, address) on success.

3. **Update phone field UI** — wrap the input in a `relative` div, add a `Contact` icon button inside the input (right side), only shown when `supportsContacts()` is true:

```tsx
<FormField control={form.control} name="phone" render={({ field }) => (
  <FormItem>
    <FormLabel>Phone Number</FormLabel>
    <FormControl>
      <div className="relative">
        <Input type="tel" inputMode="tel" {...field} className={supportsContacts() ? "pr-10" : ""} />
        {supportsContacts() && (
          <Button type="button" variant="ghost" size="icon"
            className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
            onClick={pickFromContacts}>
            <Contact className="h-4 w-4" />
          </Button>
        )}
      </div>
    </FormControl>
    <FormMessage />
  </FormItem>
)} />
```

