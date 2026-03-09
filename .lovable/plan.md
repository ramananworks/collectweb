

## Plan: App Lock Using Phone's Native Lock Screen (On/Off Toggle)

Instead of building a custom PIN screen, this approach delegates authentication to the device's own lock screen (fingerprint, face, PIN, pattern) using the **Web Authentication API (WebAuthn)**. The user simply toggles App Lock on or off from the mobile header dropdown.

### How It Works

1. **Enable**: User taps "App Lock" toggle ON → browser triggers the device's native lock screen (fingerprint/PIN/pattern) via WebAuthn to register a credential → stored in localStorage per user
2. **On app resume**: If enabled, a lock overlay appears → user taps "Unlock" → device lock screen is triggered → success unlocks the app
3. **Disable**: User taps toggle OFF → device lock screen is triggered to verify identity → credential removed
4. **Fallback**: If WebAuthn/platform authenticator is unavailable, the toggle is hidden or disabled with a message

### New Files

**1. `src/contexts/AppLockContext.tsx`**
- Context provider with state: `isLocked`, `lockEnabled`, `biometricAvailable`
- On mount: checks `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` to detect device support
- Stores `app_lock_enabled_<userId>` and WebAuthn credential ID in `localStorage`
- Listens to `visibilitychange` — when app returns from background, sets `isLocked = true` if enabled
- `enableLock()`: calls `navigator.credentials.create()` with `authenticatorAttachment: "platform"` to register device authenticator, then stores credential
- `disableLock()`: calls `navigator.credentials.get()` to verify identity first, then clears storage
- `unlock()`: calls `navigator.credentials.get()` with stored credential — this triggers the phone's lock screen (fingerprint/PIN/pattern) — on success, sets `isLocked = false`

**2. `src/components/lock/AppLockScreen.tsx`**
- Full-screen fixed overlay (z-50) with app logo and "Unlock" button
- On mount: auto-triggers `unlock()` which opens the device lock screen
- If verification fails, shows "Try Again" button
- After 5 failed attempts, forces sign-out

### Modified Files

**3. `src/App.tsx`**
- Wrap with `AppLockProvider` inside `AuthProvider`
- Render `<AppLockScreen />` when `isLocked === true`, above all routes

**4. `src/components/layout/AppLayout.tsx`**
- Add `Lock` icon import from lucide-react
- Add a new `DropdownMenuItem` between "Dark Mode" and "Sign Out" showing "App Lock" with a `Switch` toggle
- Toggle calls `enableLock()` or `disableLock()` from context
- If `biometricAvailable` is false, show the item disabled with tooltip "Not supported on this device"

### Technical Notes
- WebAuthn `authenticatorAttachment: "platform"` ensures it uses the device's built-in authenticator (fingerprint, face, device PIN) — not an external security key
- No custom PIN needed — the phone's own lock settings handle security
- Works in Android WebView and modern mobile browsers
- Graceful degradation: if unsupported, the toggle simply won't appear

