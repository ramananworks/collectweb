// Haptic feedback utility using Android bridge with web fallback
// Supports both single vibration and pattern-based vibration

declare global {
  interface Window {
    Android?: {
      vibrate?: (milliseconds: number) => void;
      vibratePattern?: (patternJson: string) => void;
      pickContact?: () => Promise<string>;
      minimizeApp?: () => void;
      exitApp?: () => void;
      printReceipt?: (text: string, widthMm: number) => void;
      printText?: (text: string) => void;
      listBluetoothPrinters?: () => string;
      connectPrinter?: (id: string) => string;
      disconnectPrinter?: () => void;
      getConnectedPrinter?: () => string;
      // Alternate bridge shape: direct address-based print
      getBluetoothDevices?: () => string;
      printBluetooth?: (address: string, base64Data: string) => void;
    };
  }
}

/**
 * Performs a single vibration for the specified duration
 */
function vibrate(milliseconds: number): void {
  // Try Android bridge first
  if (typeof window !== 'undefined' && window.Android?.vibrate) {
    window.Android.vibrate(milliseconds);
    return;
  }

  // Fall back to Web Vibration API
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(milliseconds);
    return;
  }

  // Silent no-op if neither is available
}

/**
 * Performs a pattern-based vibration
 * @param pattern Array of durations [wait, vibrate, wait, vibrate, ...]
 */
function vibratePattern(pattern: number[]): void {
  // Try Android bridge first
  if (typeof window !== 'undefined' && window.Android?.vibratePattern) {
    window.Android.vibratePattern(JSON.stringify(pattern));
    return;
  }

  // Fall back to Web Vibration API
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
    return;
  }

  // Silent no-op if neither is available
}

// Haptic feedback presets

/**
 * Light haptic feedback for button taps, toggles, selections
 */
export const hapticLight = (): void => {
  vibrate(10);
};

/**
 * Medium haptic feedback for form submissions, confirmations, transitions
 */
export const hapticMedium = (): void => {
  vibrate(25);
};

/**
 * Heavy haptic feedback for errors, destructive actions, alerts
 */
export const hapticHeavy = (): void => {
  vibrate(50);
};

/**
 * Success haptic feedback pattern for completed actions
 */
export const hapticSuccess = (): void => {
  vibratePattern([0, 30, 50, 30]);
};

/**
 * Error haptic feedback pattern for failed actions
 */
export const hapticError = (): void => {
  vibratePattern([0, 100, 100, 100]);
};