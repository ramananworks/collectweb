

## Simplify Customer Ledger: Replace Export dropdown with single PDF button

Currently the customer ledger has a Share button + an Export dropdown (CSV + Print PDF). The user wants to match the Outstanding page pattern: on mobile show "Share PDF", on desktop show a single "PDF" download button. Remove the Export dropdown entirely.

### Changes in `src/components/customers/CustomerLedgerSheet.tsx`

1. **Remove the Export dropdown** (lines 303-313) — delete the `DropdownMenu` with CSV and Print/Save PDF options
2. **Remove unused imports**: `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger`
3. **Remove unused functions**: `exportCSV`, `exportPDF`, `fmtAmount`, `downloadBlob`
4. **Update desktop button** (lines 298-301): Replace the Share modal button with a PDF download button using `handleSharePDF` (which already falls back to `downloadPDF` when share API is unavailable)
   - Mobile: `<Share2 /> Share` (triggers native share)
   - Desktop: `<Download /> PDF` (downloads the PDF)
5. **Remove `ShareOptionsModal`** usage and `shareOpen` state since desktop no longer opens it
6. **Clean up imports**: Remove `ShareOptionsModal`, `ShareSummaryData`, `DropdownMenu` components

