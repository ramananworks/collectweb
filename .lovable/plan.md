

## Plan: Merge Columns on Mobile for Invoices Table

On mobile (`< sm`), merge the Invoice #, Customer, and Invoice Date columns into a single column showing:
- **Line 1**: Customer name (bold)
- **Line 2**: Invoice number + invoice date (smaller, muted)

### Changes in `src/pages/Invoices.tsx`

**Header:**
- Remove separate `Invoice #` and `Customer` `<th>` elements
- Add a single `<th>` visible always: "Customer / Invoice"
- Keep `Invoice #` and `Customer` as separate `<th>` elements hidden on mobile (`hidden sm:table-cell`)

**Body rows:**
- Add a merged `<td>` visible only on mobile (`sm:hidden`) with:
  ```
  <div class="font-medium">{customer_name}</div>
  <div class="text-xs text-muted-foreground">{invoice_number} · {formatDisplayDate(invoice_date)}</div>
  ```
- Hide the original `Invoice #` and `Customer` `<td>` on mobile (`hidden sm:table-cell`)
- The `Invoice Date` column already has `hidden sm:table-cell` so it stays hidden on mobile

This keeps desktop layout unchanged while giving mobile a compact, readable single column.

