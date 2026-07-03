---
name: Bluetooth Receipt Printing
description: 2"/3" Bluetooth thermal printing for collection receipts via Android bridge with in-app pairing and browser print fallback
type: feature
---
Print stack (src/lib/bluetooth-print.ts):
- Android WebView bridge (declared in src/lib/haptics.ts — single Window.Android augmentation):
  - `printReceipt(text, widthMm)` preferred, `printText(text)` fallback (existing).
  - `listBluetoothPrinters(): string` → JSON `[{id,name,paired}]`
  - `connectPrinter(id): string` → "ok" or error message
  - `disconnectPrinter()`
  - `getConnectedPrinter(): string` → JSON `{id,name} | null`
- Paper widths: 58mm (32 char/line) and 80mm (48 char/line). Stored in localStorage `cw:print:width`.
- Auto-print toggle stored in `cw:print:auto`. When ON, receipt is sent immediately on successful save; else sonner toast shows a "Print Receipt" action.
- Saved printer stored in `cw:print:device` as `{id,name}`. `ensurePrinterConnected()` runs before every print: if bridge present and nothing connected, silently reconnects the saved device.
- `hasPrinterBridge()` checks for `listBluetoothPrinters` (pairing UI capability) — separate from `isBluetoothPrintingAvailable()` (print capability).
- Browser fallback: opens a print window with monospace @page sized to widthMm.

Receipt contents: company header (name/phone/address), PAYMENT RECEIPT title, receipt#, date, party name, invoice number+date, mode, AMOUNT PAID, balance due (outstanding after this payment), collected by, notes, "Thank you!".

Wired in:
- src/components/forms/RecordPaymentDialog.tsx — calls ensurePrinterConnected() then printReceipt on auto-print or toast action.
- src/pages/Collections.tsx — reprint icon per row; live outstanding, not historical snapshot.
- src/components/settings/PrintSettings.tsx — Settings card with Scan & connect / Disconnect / Change dialog listing bridge-returned devices, plus paper width, auto-print, test print.
