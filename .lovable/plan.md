

## Plan: Fix share button on mobile (Android WebView)

**Problem**: The share button generates a PDF and tries `navigator.share({ files: [file] })`. In Android WebView, file sharing via Web Share API is often unsupported — `navigator.canShare({ files })` returns false or the call throws. The fallback `downloadPDF` uses an anchor element with `a.download`, which also silently fails in many WebViews since programmatic downloads are blocked.

**Solution**: Add an Android bridge-aware fallback. When neither Web Share nor anchor downloads work, convert the PDF blob to a base64 data URI and open it in a new tab/window, which Android WebView can handle (triggering the system PDF viewer or download manager).

### Changes

**1. `src/lib/share-utils.ts` — Improve `downloadPDF` fallback**

Update `downloadPDF` to detect WebView/mobile environments where anchor downloads fail. After attempting the anchor click, add a fallback that opens the blob URL directly via `window.open()`, which triggers the Android system download/viewer.

```typescript
export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  // Try anchor download first
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // In WebView, anchor downloads often fail silently.
  // Open blob URL directly as fallback — triggers system viewer/download.
  if ((window as any).Android || /wv|WebView/i.test(navigator.userAgent)) {
    window.open(url, "_blank");
  } else {
    URL.revokeObjectURL(url);
  }
}
```

**2. `src/pages/Outstanding.tsx` — Wrap share in try/catch with better fallback (lines 170-181)**

The current code catches errors but only falls through to `downloadPDF` if `canShare` is false. Add handling for when `navigator.share` exists but throws (common in WebView):

```typescript
try {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Outstanding Summary" });
    return;
  }
} catch (e) {
  // Share cancelled or unsupported — fall through to download
  if ((e as DOMException)?.name === "AbortError") return;
}
downloadPDF(blob, filename);
```

**3. Same fix in `src/components/dashboard/DrillDownSheet.tsx` (lines ~155-165)** — identical pattern, apply same defensive fallback.

**4. Check other share callers** — `CustomerLedgerSheet.tsx` and `Collections.tsx` likely have the same pattern; apply consistently.

### Summary
- 1 core fix in `downloadPDF` to handle WebView environments
- ~4 files with share/PDF logic get consistent error handling
- No backend changes

