

## Fix: Share Buttons Not Working in Mobile App (WebView)

### Problem

There are two issues causing share buttons to fail in the Android WebView:

1. **ShareOptionsModal hijacks all buttons**: When `navigator.share` is available (always true in WebView), clicking WhatsApp, Email, or SMS all trigger the same generic OS share sheet instead of opening the specific app. The channel-specific fallback code (`shareViaWhatsApp`, etc.) is never reached.

2. **`window.open` is blocked in WebView**: Even if the fallback code ran, `window.open("https://wa.me/...")` is blocked by WebView. URL schemes need `window.location.href` instead.

3. **Dashboard share buttons**: Fire-and-forget `navigator.share()` calls with no error handling — silently fails.

### Fix Plan

**File: `src/lib/share-utils.ts`**
- Change `shareViaWhatsApp`, `shareViaEmail`, `shareViaSMS` to use `window.location.href` instead of `window.open` for URL schemes, which works reliably in WebView
- For WhatsApp, use `whatsapp://send?text=...` intent URI (works in WebView) with `https://wa.me/` as fallback

**File: `src/components/shared/ShareOptionsModal.tsx`**
- Remove the blanket `navigator.share` call that intercepts all channel buttons
- Only use `navigator.share` for a dedicated "Share" action, not for specific channels
- WhatsApp/Email/SMS buttons should directly invoke their respective share functions
- PDF button remains unchanged

**File: `src/pages/Dashboard.tsx`**
- Wrap `navigator.share()` calls in try/catch
- Add clipboard fallback with toast feedback when share fails

### Technical Detail

```text
Current flow (broken):
  User taps "WhatsApp" → navigator.share() fires → generic OS picker opens
                          (never reaches shareViaWhatsApp)

Fixed flow:
  User taps "WhatsApp" → shareViaWhatsApp() → window.location.href = "whatsapp://..."
  User taps "Email"    → shareViaEmail()    → window.location.href = "mailto:..."
  User taps "SMS"      → shareViaSMS()      → window.location.href = "sms:..."
  User taps "PDF"      → generateSummaryPDF → downloadPDF (WebView-aware)
```

