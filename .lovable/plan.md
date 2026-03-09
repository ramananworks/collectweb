

## Plan: Android Back Button Closes Open Overlays

### Change: `src/components/layout/AppLayout.tsx`

Update the `handlePopState` logic in the existing `useEffect` to:

1. Add a `sidebarOpenRef` that syncs with `sidebarOpen` state so the event listener always has the current value.

2. In `handlePopState`, before the double-press exit logic:
   - Check if sidebar is open → close it, re-push history state, return.
   - Check DOM for `[role="dialog"], [role="alertdialog"]` → dispatch `Escape` keydown event, re-push history state, return.

3. If neither overlay nor sidebar is open, keep existing double-press-to-exit behavior unchanged.

### Code Changes

```typescript
// Add ref to track sidebar state
const sidebarOpenRef = useRef(sidebarOpen);
useEffect(() => { sidebarOpenRef.current = sidebarOpen; }, [sidebarOpen]);

// Updated handlePopState
const handlePopState = () => {
  window.history.pushState(null, "", window.location.href);

  // 1. Close sidebar if open
  if (sidebarOpenRef.current) {
    setSidebarOpen(false);
    return;
  }

  // 2. Close any open dialog/sheet/alert
  const openOverlay = document.querySelector(
    '[role="dialog"], [role="alertdialog"]'
  );
  if (openOverlay) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    return;
  }

  // 3. Existing double-press to exit (unchanged)
  if (backPressedRef.current) {
    const android = (window as any).Android;
    if (android?.minimizeApp) android.minimizeApp();
    else if (android?.exitApp) android.exitApp();
    backPressedRef.current = false;
  } else {
    backPressedRef.current = true;
    toast({ title: "Press back again to exit" });
    backTimerRef.current = setTimeout(() => {
      backPressedRef.current = false;
    }, 2000);
  }
};
```

No other files need changes — all Radix UI dialogs/sheets already respond to the Escape key natively.

