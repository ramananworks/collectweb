import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen() {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      // Show splash for at least 1.5s
      const minDelay = new Promise((r) => setTimeout(r, 1500));
      const sessionResult = supabase.auth.getSession();

      const [, { data }] = await Promise.all([minDelay, sessionResult]);

      if (cancelled) return;

      setFadeOut(true);

      // Wait for fade-out animation
      setTimeout(() => {
        if (cancelled) return;
        if (data.session) {
          window.location.replace("/dashboard");
        } else {
          window.location.replace("/login");
        }
      }, 400);
    };

    checkSession();
    return () => { cancelled = true; };
  }, []);

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          <div className="flex flex-col items-center gap-5">
            {/* Logo with glow and pulse ring */}
            <div className="relative flex items-center justify-center">
              {/* Soft radial glow */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.3, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute h-40 w-40 rounded-full bg-primary/20 blur-2xl"
              />
              {/* Pulse ring */}
              <motion.div
                initial={{ opacity: 0.5, scale: 0.8 }}
                animate={{ opacity: 0, scale: 1.6 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                className="absolute h-28 w-28 rounded-2xl border-2 border-primary/30"
              />
              {/* Logo */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 150, delay: 0 }}
              >
                <img
                  src={logoImg}
                  alt="CollectWeb"
                  className="relative z-10 h-28 w-28 rounded-2xl object-cover shadow-2xl ring-1 ring-primary/10"
                />
              </motion.div>
            </div>

            {/* App name */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
              className="text-2xl font-bold text-foreground tracking-tight"
            >
              CollectWeb
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.5 }}
              className="text-sm text-muted-foreground font-medium tracking-wide"
            >
              Smart Distributor Collection Platform
            </motion.p>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.7 }}
              className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-muted"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
