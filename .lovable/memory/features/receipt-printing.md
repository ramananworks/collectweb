---
name: Bluetooth Receipt Printing
description: 2"/3" Bluetooth thermal printing for collection receipts via Android bridge with browser print fallback
type: feature
---
Print stack (src/lib/bluetooth-print.ts):
- Android WebView bridge contract: `window.Android.printReceipt(text, widthMm)` preferred, `printText(text)` fallback. Also declared in src/lib/haptics.ts to keep single Window.Android augmentation.
- Paper widths: 58mm (32 char/line) and 80mm (48 char/line). Stored in localStorage `cw:print:width`.
- Auto-print toggle stored in `cw:print:auto`. When ON, receipt is sent immediately on successful save. When OFF, sonner toast shows a "Print Receipt" action.
- Browser fallback: opens a print window with monospace @page sized to widthMm.

Receipt contents: company header (name/phone/address), PAYMENT RECEIPT title, receipt#, date, party name, invoice number+date, mode, AMOUNT PAID, balance due (outstanding after this payment), collected by, notes, "Thank you!".

Wired in:
- src/components/forms/RecordPaymentDialog.tsx — auto-print or toast action on success. Outstanding after = sum(invoice.amount - paid) for that customer minus current payment.
- src/pages/Collections.tsx — printer icon per row triggers `handleReprint` (uses live outstanding, not historical snapshot).
- src/components/settings/PrintSettings.tsx — Settings card for width, auto-print, and test print. Rendered in src/pages/Settings.tsx for all users who can access settings.
