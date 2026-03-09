import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface AppLockContextType {
  isLocked: boolean;
  lockEnabled: boolean;
  biometricAvailable: boolean;
  enableLock: () => Promise<boolean>;
  disableLock: () => Promise<boolean>;
  unlock: () => Promise<boolean>;
  failedAttempts: number;
}

const AppLockContext = createContext<AppLockContextType>({
  isLocked: false,
  lockEnabled: false,
  biometricAvailable: false,
  enableLock: async () => false,
  disableLock: async () => false,
  unlock: async () => false,
  failedAttempts: 0,
});

function getStorageKey(userId: string, key: string) {
  return `app_lock_${key}_${userId}`;
}

function generateChallenge(): ArrayBuffer {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr.buffer as ArrayBuffer;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const lockEnabledRef = useRef(false);

  // Check biometric availability
  useEffect(() => {
    (async () => {
      try {
        if (
          window.PublicKeyCredential &&
          typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
        ) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available);
        }
      } catch {
        setBiometricAvailable(false);
      }
    })();
  }, []);

  // On user change, check if lock is enabled and set locked state
  useEffect(() => {
    if (!user) {
      setIsLocked(false);
      setLockEnabled(false);
      lockEnabledRef.current = false;
      return;
    }
    const enabled = localStorage.getItem(getStorageKey(user.id, "enabled")) === "true";
    const hasCredential = !!localStorage.getItem(getStorageKey(user.id, "credential"));
    const shouldLock = enabled && hasCredential;
    setLockEnabled(shouldLock);
    lockEnabledRef.current = shouldLock;
    if (shouldLock) {
      setIsLocked(true);
    }
  }, [user]);

  // Visibility change: re-lock when returning from background
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && lockEnabledRef.current) {
        setIsLocked(true);
        setFailedAttempts(0);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const enableLock = useCallback(async (): Promise<boolean> => {
    if (!user || !biometricAvailable) return false;
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: generateChallenge(),
          rp: { name: "CollectWeb", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.email || "user",
            displayName: user.email || "User",
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential | null;

      if (!credential) return false;

      localStorage.setItem(
        getStorageKey(user.id, "credential"),
        bufferToBase64(credential.rawId)
      );
      localStorage.setItem(getStorageKey(user.id, "enabled"), "true");
      setLockEnabled(true);
      lockEnabledRef.current = true;
      toast({ title: "App Lock enabled" });
      return true;
    } catch (e) {
      console.error("WebAuthn registration failed:", e);
      toast({ title: "Could not enable App Lock", description: "Device authentication was cancelled or failed.", variant: "destructive" });
      return false;
    }
  }, [user, biometricAvailable]);

  const disableLock = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const credentialId = localStorage.getItem(getStorageKey(user.id, "credential"));
      if (credentialId) {
        // Verify identity before disabling
        await navigator.credentials.get({
          publicKey: {
            challenge: generateChallenge(),
            allowCredentials: [
              { id: base64ToBuffer(credentialId), type: "public-key", transports: ["internal"] },
            ],
            userVerification: "required",
            timeout: 60000,
          },
        });
      }
      localStorage.removeItem(getStorageKey(user.id, "credential"));
      localStorage.removeItem(getStorageKey(user.id, "enabled"));
      setLockEnabled(false);
      lockEnabledRef.current = false;
      setIsLocked(false);
      toast({ title: "App Lock disabled" });
      return true;
    } catch (e) {
      console.error("WebAuthn verification failed:", e);
      toast({ title: "Could not disable App Lock", description: "Device authentication was cancelled or failed.", variant: "destructive" });
      return false;
    }
  }, [user]);

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const credentialId = localStorage.getItem(getStorageKey(user.id, "credential"));
    if (!credentialId) {
      setIsLocked(false);
      return true;
    }
    try {
      await navigator.credentials.get({
        publicKey: {
          challenge: generateChallenge(),
          allowCredentials: [
            { id: base64ToBuffer(credentialId), type: "public-key", transports: ["internal"] },
          ],
          userVerification: "required",
          timeout: 60000,
        },
      });
      setIsLocked(false);
      setFailedAttempts(0);
      return true;
    } catch (e) {
      console.error("Unlock failed:", e);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 5) {
        toast({ title: "Too many failed attempts", description: "Signing out for security.", variant: "destructive" });
        await signOut();
        localStorage.removeItem(getStorageKey(user.id, "credential"));
        localStorage.removeItem(getStorageKey(user.id, "enabled"));
        setIsLocked(false);
        setLockEnabled(false);
        lockEnabledRef.current = false;
      }
      return false;
    }
  }, [user, failedAttempts, signOut]);

  return (
    <AppLockContext.Provider
      value={{ isLocked, lockEnabled, biometricAvailable, enableLock, disableLock, unlock, failedAttempts }}
    >
      {children}
    </AppLockContext.Provider>
  );
}

export const useAppLock = () => useContext(AppLockContext);
