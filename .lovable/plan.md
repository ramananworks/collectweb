

## Dynamic UPI QR Code in Record Collection Form (Popup)

### Overview
When UPI mode is selected and a valid amount is entered, a "Show QR" button appears. Tapping it opens a dedicated popup dialog showing a large, scannable UPI QR code with a close button. Fully mobile responsive.

### Changes

#### 1. Database Migration
- `ALTER TABLE public.companies ADD COLUMN upi_id text DEFAULT '';`

#### 2. New Component: `src/components/shared/UpiQrDialog.tsx`
- A Dialog component triggered by a "Show QR Code" button.
- Props: `amount`, `upiId`, `businessName`.
- Builds URI: `upi://pay?pa={upiId}&pn={businessName}&am={amount}&cu=INR`
- QR rendered via `qrcode.react` library at ~250px on mobile, ~280px on desktop.
- Shows "Scan & Pay via UPI" label, amount displayed prominently, business name subtitle.
- Validation: disabled/hidden button if amount is 0 or UPI ID missing; inline helper text for each case.
- Debounces QR URI regeneration by 400ms.
- Dialog has a visible close button (X) and "Done" footer button.
- Clean card-style layout, centered QR, padded for mobile scanning.

#### 3. `src/components/forms/RecordPaymentDialog.tsx`
- Import `useCompany()` to get UPI ID and business name.
- Watch `mode` and `amount` fields.
- When `mode === "upi"`, render a "Show QR Code" button (or disabled state with helper text) below the amount field.
- Button opens `UpiQrDialog` with current amount, company UPI ID, and company name.

#### 4. `src/pages/Settings.tsx`
- Add "UPI ID" input in Company Details section (owner-only), saved via `useUpdateCompany`.

#### 5. `src/hooks/use-data.ts`
- Include `upi_id` in `useUpdateCompany` mutation payload.

#### 6. Install `qrcode.react` package.

### Files Changed
1. Migration — add `upi_id` to `companies`
2. `src/components/shared/UpiQrDialog.tsx` — new popup QR component
3. `src/components/forms/RecordPaymentDialog.tsx` — add QR trigger button
4. `src/pages/Settings.tsx` — UPI ID config field
5. `src/hooks/use-data.ts` — update company mutation

