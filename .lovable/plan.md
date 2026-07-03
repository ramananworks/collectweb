## Add Bluetooth printer connection in Settings

Extend the existing "Receipt Printing" card so users can scan, pair, connect and remember a Bluetooth thermal printer — all through the Android host app, with graceful fallback when the bridge isn't available.

### What the user will see (Settings → Receipt Printing)
- New "Printer device" row showing one of:
  - `Not connected` + **Scan & connect** button
  - `Connected: <name>` + **Disconnect** / **Change**
- After tapping Scan: a modal lists nearby/paired Bluetooth printers returned by the Android bridge; tapping one pairs + connects and saves it as the default.
- Saved printer auto-reconnects silently on next print. If reconnect fails, receipt still prints via the current fallback and a toast offers **Reconnect**.
- Existing paper width, auto-print toggle and test-print button stay as-is; test-print now uses the connected device.

### Android bridge contract (extension)
Add these methods to `window.Android` (the Android WebView host app must implement them; JS side just declares + calls them):

| Method | Purpose |
|---|---|
| `listBluetoothPrinters(): string` | Returns JSON string `[{id, name, paired}]` of discoverable + paired BT printers. |
| `connectPrinter(id: string): string` | Pairs (if needed) and opens an RFCOMM socket. Returns `"ok"` or an error message. |
| `disconnectPrinter(): void` | Closes the socket. |
| `getConnectedPrinter(): string` | Returns JSON `{id, name} | null`. |
| `printReceipt(text, widthMm)` *(existing)* | Now expected to use the currently connected socket. |

Nothing changes on the ESC/POS text side — same `formatReceipt` output.

### Frontend changes
- **`src/lib/bluetooth-print.ts`**
  - Add `listPrinters()`, `connectPrinter(id)`, `disconnectPrinter()`, `getConnectedPrinter()` wrappers that call the bridge and JSON-parse safely.
  - Add `getSavedPrinter()` / `setSavedPrinter()` using `localStorage` key `cw:print:device` (`{id, name}`).
  - Add `ensurePrinterConnected()` — called before `printReceipt`; if bridge exposes `getConnectedPrinter` and returns null but a saved device exists, silently `connectPrinter(saved.id)`.
  - Expose `hasPrinterBridge()` (checks for `listBluetoothPrinters`) separately from existing `isBluetoothPrintingAvailable()`.
- **`src/lib/haptics.ts`** — extend the `Window.Android` type augmentation with the four new methods.
- **`src/components/settings/PrintSettings.tsx`**
  - New "Printer device" section with Scan/Connect/Disconnect UI, current-device label, and a shadcn `Dialog` listing scan results with a loading state.
  - Handle the no-bridge case: show an info line "In-app pairing needs the CollectWeb Android app. In browser, use the system print dialog."
  - Wire test-print to attempt `ensurePrinterConnected()` first.
- **`src/components/forms/RecordPaymentDialog.tsx`** and **`src/pages/Collections.tsx`** — call `ensurePrinterConnected()` (fire-and-forget) just before `printReceipt`. No behavior change when bridge missing.
- **`.lovable/memory/features/receipt-printing.md`** — document the new bridge methods, storage key, and auto-reconnect flow.

### Out of scope
- No Web Bluetooth path (per your choice).
- No Capacitor migration.
- No changes to receipt content, ESC/POS formatting, RLS, or edge functions.
- The Android host app itself must implement the new bridge methods; this plan only adds the JS side and UI. I'll note that clearly to you after implementation so the native side can be updated in the wrapper.