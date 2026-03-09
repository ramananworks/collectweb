

## Plan: Fix PDF share on Android WebView — use `window.location.href` instead of `window.open`

**Root cause**: `window.open(dataUri, "_blank")` is also blocked by Android WebView's popup blocker, even with data URIs. The toast appears, PDF generates, but `window.open` silently fails.

**Fix**: Replace `window.open(dataUri)` with `window.location.href = dataUri`. This navigates the current page to the data URI, which Android WebView intercepts and hands off to the system PDF viewer/download manager. Since this replaces the current page, we need to handle it carefully — but Android WebView typically intercepts `data:application/pdf` URIs before navigation actually occurs.

An even more robust approach: use an **invisible iframe** to load the data URI, which avoids navigating away and isn't subject to popup blocking.

### Changes

**1. `src/lib/share-utils.ts` — Update `downloadPDF` WebView path**

Replace `window.open(base64, "_blank")` with an iframe-based approach:

```typescript
if (isWebView) {
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64 = reader.result as string;
    // Use a hidden iframe — not blocked by popup blocker
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = base64;
    document.body.appendChild(iframe);
    // Also try direct navigation as ultimate fallback
    setTimeout(() => {
      document.body.removeChild(iframe);
      window.location.href = base64;
    }, 1000);
  };
  reader.readAsDataURL(blob);
  return;
}
```

**2. `src/pages/Outstanding.tsx` (line 177) — Same fix**

Replace `window.open(dataUri, "_blank")` with:
```typescript
const iframe = document.createElement("iframe");
iframe.style.display = "none";
iframe.src = dataUri;
document.body.appendChild(iframe);
setTimeout(() => {
  document.body.removeChild(iframe);
  window.location.href = dataUri;
}, 1000);
```

**3. Apply same pattern** in `DrillDownSheet.tsx` and `CustomerLedgerSheet.tsx`.

### Summary
- 4 files updated: replace all `window.open(dataUri)` with iframe + `window.location.href` fallback
- No backend changes

