

## Plan: Add Pagination to Invoices Page

Add client-side pagination to the invoices table in `src/pages/Invoices.tsx`.

### Changes

**`src/pages/Invoices.tsx`**
- Add `currentPage` state (default 1), reset to 1 when filters/search change
- Define `PAGE_SIZE = 20`
- Slice `filtered` array: `filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)`
- Add pagination controls below the table using the existing `Pagination` components (`PaginationPrevious`, `PaginationNext`, page numbers, `PaginationEllipsis`)
- Show "Showing X–Y of Z" text

