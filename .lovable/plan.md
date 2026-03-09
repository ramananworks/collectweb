

## Plan: Reliable PDF Share with Loading State and Native Share Sheet

**Problem**: The current share button silently fails on Android. The iframe/data-URI hacks don't reliably trigger system share. The proper solution is to use `navigator.share({ files: [...] })` which opens the native share sheet (WhatsApp, Gmail, Telegram, etc.) — but it must be called from a **synchronous user gesture context**, not after an async gap.

**Key insight**: `navigator.share` with files works on modern Android Chrome and WebViews, but the call must happen in the same microtask chain as the user click. Since PDF generation with jsPDF is synchronous (no async/await needed for `doc.output("blob")`), we can keep the entire flow synchronous from click to share.

### Changes

**1. `src/pages/Outstanding.tsx` — Add loading state + reliable share flow**

- Add `const [exporting, setExporting] = useState(false)` state
- Disable the Share button and show a `Loader2` spinner while generating
- Restructure `handleExportPDF`:
  - Set `exporting = true`
  - Generate PDF synchronously (jsPDF is sync)
  - Create `File` object from blob
  - Call `navigator.share({ files: [file] })` — this opens the native Android share sheet
  - If `navigator.share` is unavailable or fails, fall back to `downloadPDF()`
  - On error, show toast
  - Set `exporting = false` in finally block
- Button renders: `{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 />} Share`

**2. `src/lib/share-utils.ts` — Add `sharePDFFile` utility**

Add a new reusable function:
```typescript
export async function sharePDFFile(blob: Blob, filename: string, title: string): Promise<boolean> {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title });
    return true;
  }
  return false; // caller should fall back to downloadPDF
}
```

**3. Apply same pattern** to `DrillDownSheet.tsx` and `CustomerLedgerSheet.tsx` — add loading state and use `sharePDFFile` → `downloadPDF` fallback.

### Flow
1. User taps Share → button shows spinner, becomes disabled
2. PDF generates (sync, ~instant)
3. `navigator.share({ files: [pdfFile] })` opens native Android share sheet
4. User picks WhatsApp/Gmail/etc. or cancels
5. Button re-enables

### Files modified
- `src/lib/share-utils.ts` — add `sharePDFFile`
- `src/pages/Outstanding.tsx` — loading state + share flow
- `src/components/dashboard/DrillDownSheet.tsx` — same pattern
- `src/components/customers/CustomerLedgerSheet.tsx` — same pattern

