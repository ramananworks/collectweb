

## Plan: Haptic Feedback via Android Bridge

Since your app already runs inside an Android WebView wrapper with a JavaScript bridge (`window.Android`), we don't need Capacitor. Instead, we'll extend your existing Android bridge pattern to support haptic feedback.

### Approach

1. **Create a haptic utility** (`src/lib/haptics.ts`) that calls the Android bridge for vibration feedback, with silent fallback when the bridge isn't available (browser/desktop).

2. **Add haptic triggers** to key interactions across the app.

### New File: `src/lib/haptics.ts`

A small utility with methods like:
- `hapticLight()` — button taps, toggles (10ms vibration)
- `hapticMedium()` — form submissions, confirmations (25ms)
- `hapticHeavy()` — destructive actions, errors (50ms)
- `hapticSuccess()` — success pattern (short-short vibration)

Each method checks for `window.Android.vibrate(ms)` first, then falls back to the Web Vibration API (`navigator.vibrate()`), then silently no-ops.

### Integration Points

- **Button taps**: Nav items in `AppLayout.tsx`, quick action buttons
- **Form submissions**: `CreateInvoiceDialog`, `AddCustomerDialog`, `RecordPaymentDialog`, `EditCustomerDialog`
- **Success states**: After successful invoice creation, payment recording, delivery confirmation
- **Error states**: Validation failures, API errors
- **Destructive actions**: Logout confirmation, delete actions

### Important Note for Your Android App

Your Android wrapper needs to expose a `vibrate` method on the bridge. You'll need to add this to your Android `WebAppInterface` class:

```java
@JavascriptInterface
public void vibrate(int milliseconds) {
    Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    if (v != null && v.hasVibrator()) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            v.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE));
        } else {
            v.vibrate(milliseconds);
        }
    }
}

@JavascriptInterface
public void vibratePattern(String patternJson) {
    // patternJson = "[0, 30, 50, 30]"
    Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    if (v != null) {
        long[] pattern = parsePattern(patternJson);
        v.vibrate(pattern, -1);
    }
}
```

And add the permission in `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.VIBRATE"/>
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/haptics.ts` | Create — haptic utility functions |
| `src/components/layout/AppLayout.tsx` | Modify — add haptic on nav tap, logout |
| `src/components/forms/CreateInvoiceDialog.tsx` | Modify — haptic on submit success/error |
| `src/components/forms/AddCustomerDialog.tsx` | Modify — haptic on submit success/error |
| `src/components/forms/RecordPaymentDialog.tsx` | Modify — haptic on submit success/error |
| `src/components/forms/EditCustomerDialog.tsx` | Modify — haptic on submit success/error |
| `src/components/forms/DeliveryConfirmDialog.tsx` | Modify — haptic on OTP verify success |
| `src/components/dashboard/DashboardQuickActions.tsx` | Modify — haptic on quick action tap |

