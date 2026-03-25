

## Fix: Share/Download PDF Buttons in Customer Ledger and Outstanding Page (WebView)

### Problem

The share buttons in the Customer Ledger and Outstanding page fail in the Android WebView because the `downloadPDF` fallback (when `navigator.share` doesn't support files) navigates the entire page away using `window.location.href = base64DataURI`, which breaks the app.

### Fix

**File: `src/lib/share-utils.ts`** — `downloadPDF` function

Replace the WebView fallback strategy. Instead of navigating the page to a base64 data URI (which exits the app), use an anchor element with `download` attribute and the data URI as `href`. This triggers the browser/WebView download manager without navigating away:

```text
Current (broken):
  WebView → FileReader → base64 → iframe → window.location.href = base64 → PAGE NAVIGATES AWAY

Fixed:
  WebView → FileReader → base64 → <a href="data:..." download="file.pdf">.click() → DOWNLOAD DIALOG
```

**File: `src/components/customers/CustomerLedgerSheet.tsx`** — `handleSharePDF`

Add toast feedback when PDF export fails so the user gets visible error feedback instead of silent failure.

**File: `src/pages/Outstanding.tsx`** — already has toast error handling, no changes needed.

### Files Changed
1. `src/lib/share-utils.ts` — Fix WebView download to use anchor+download instead of location.href
2. `src/components/customers/CustomerLedgerSheet.tsx` — Add toast on share failure

