

## Plan: Fix PDF share on Android WebView using base64 data URI

**Root cause**: In Android WebView, both `navigator.share` and `window.open(blobUrl)` are silently blocked when called from async callbacks (not direct user gesture). The PDF generates successfully but nothing happens on the delivery step.

**Fix**: Convert the PDF blob to a **base64 data URI** and use `window.location.href` to navigate directly to it. WebViews reliably handle `data:application/pdf` URIs by handing off to the system PDF viewer/download manager.

### Changes

**1. `src/lib/share-utils.ts` — Replace `downloadPDF` with base64 data URI fallback**

```typescript
export function downloadPDF(blob: Blob, filename: string) {
  const isWebView = !!(window as any).Android || /wv|WebView/i.test(navigator.userAgent);

  if (isWebView) {
    // Convert blob to base64 data URI — WebView handles this reliably
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      window.open(base64, "_blank");
    };
    reader.readAsDataURL(blob);
    return;
  }

  // Standard browser: anchor download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

**2. `src/pages/Outstanding.tsx` — Use `doc.output("datauristring")` directly for WebView**

Instead of going blob → FileReader → base64, use jsPDF's built-in `output("datauristring")` which returns a ready-to-use data URI. This is simpler and avoids the async FileReader step:

```typescript
// After generating the PDF doc...
const isWebView = !!(window as any).Android || /wv|WebView/i.test(navigator.userAgent);

if (isWebView) {
  const dataUri = doc.output("datauristring");
  window.open(dataUri, "_blank");
  return;
}

// Non-WebView: try native share, then fall back to anchor download
```

This skips `navigator.share` entirely on WebView (where it never works) and uses jsPDF's native data URI output.

**3. Apply same pattern** in `DrillDownSheet.tsx` and `CustomerLedgerSheet.tsx`.

### Summary
- WebView gets a dedicated fast path: jsPDF → data URI → `window.open` (triggers system PDF viewer)
- Standard browsers keep existing behavior (native share or anchor download)
- 4 files changed, no backend changes

