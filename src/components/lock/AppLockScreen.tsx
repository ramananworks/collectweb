import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLock } from "@/contexts/AppLockContext";
import logoImg from "@/assets/logo.png";

export default function AppLockScreen() {
  const { isLocked, unlock, failedAttempts } = useAppLock();
  const [unlocking, setUnlocking] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  // Auto-trigger unlock on mount
  useEffect(() => {
    if (isLocked) {
      handleUnlock();
    }
  }, [isLocked]);

  const handleUnlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    setShowRetry(false);
    const success = await unlock();
    setUnlocking(false);
    if (!success) {
      setShowRetry(true);
    }
  };

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          <div className="flex flex-col items-center gap-6 px-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              <img src={logoImg} alt="CollectWeb" className="h-20 w-20 rounded-2xl object-cover shadow-lg" />
            </motion.div>

            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-foreground">App Locked</h2>
              <p className="text-sm text-muted-foreground">
                Verify your identity to continue
              </p>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              <Button
                size="lg"
                onClick={handleUnlock}
                disabled={unlocking}
                className="gap-2 min-w-[200px]"
              >
                <Fingerprint className="h-5 w-5" />
                {unlocking ? "Verifying..." : "Unlock"}
              </Button>

              {showRetry && failedAttempts > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-destructive text-center"
                >
                  Authentication failed ({failedAttempts}/5 attempts)
                </motion.p>
              )}
            </motion.div>

            <ShieldCheck className="h-5 w-5 text-muted-foreground/50 mt-8" />
            <p className="text-xs text-muted-foreground/50">
              Protected by your device lock screen
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
