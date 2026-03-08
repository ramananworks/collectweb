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
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <img
              src={logoImg}
              alt="CollectWeb"
              className="h-20 w-20 rounded-2xl object-cover shadow-lg"
            />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              CollectWeb
            </h1>
            <div className="mt-4 h-1 w-16 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
