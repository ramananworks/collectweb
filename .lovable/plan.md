

## Fix: Share/PDF Button Does Nothing in Android WebView

### Root Cause

The current flow calls `sharePDFFile()` first, which checks `navigator.share` + `navigator.canShare`. In Android WebView, `navigator.share` exists but **silently fails** or throws — and when it throws, the function returns `false`, falling through to `downloadPDF()`. However, `downloadPDF()` uses an anchor click with a **data URI**, which many Android WebViews also silently ignore (the `download` attribute is not honored on data URIs in WebView).

Result: the button shows its loading/active state (color change) but nothing actually happens.

### Fix

**File: `src/lib/share-utils.ts`**

1. **`sharePDFFile`** — Skip `navigator.share` entirely in WebView environments. It's unreliable and blocks the fallback path. Add the WebView detection check at the top.

2. **`downloadPDF`** — The anchor+data-URI approach doesn't work in WebView either. Replace with a strategy that works:
   - Use `URL.createObjectURL(blob)` (not data URI) with an anchor click
   - If that doesn't trigger a download, fall back to opening the blob URL in a new window/tab via `window.open`, which Android WebView can handle for PDF blobs
   - As a last resort, use the Android bridge if available

**File: `src/components/customers/CustomerLedgerSheet.tsx`** — No changes needed (already has error handling).

**File: `src/pages/Outstanding.tsx`** — No changes needed (already has error handling).

### Updated `downloadPDF` logic

```text
downloadPDF(blob, filename):
  1. Create blob URL via URL.createObjectURL
  2. Create anchor with href=blobURL, download=filename, click it
  3. If WebView detected, ALSO open blobURL via window.open as fallback
     (WebView often ignores anchor download but opens blob URLs in external viewer)
  4. Revoke blob URL after short delay
```

### Updated `sharePDFFile` logic

```text
sharePDFFile(blob, filename, title):
  If WebView → return false immediately (skip navigator.share)
  Otherwise → try navigator.share as before
```

This ensures WebView always goes straight to `downloadPDF` with a working blob URL strategy instead of getting stuck on the broken `navigator.share` → data URI path.

### Files Changed
1. `src/lib/share-utils.ts` — Fix both `sharePDFFile` and `downloadPDF` for WebView

