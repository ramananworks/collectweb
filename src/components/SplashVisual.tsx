import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

export default function SplashVisual() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.3, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute h-40 w-40 rounded-full bg-primary/20 blur-2xl"
          />
          <motion.div
            initial={{ opacity: 0.5, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
            className="absolute h-28 w-28 rounded-2xl border-2 border-primary/30"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 150 }}
          >
            <img
              src={logoImg}
              alt="CollectWeb"
              className="relative z-10 h-28 w-28 rounded-2xl object-cover shadow-2xl ring-1 ring-primary/10"
            />
          </motion.div>
        </div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
          className="text-2xl font-bold text-foreground tracking-tight"
        >
          CollectWeb
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.5 }}
          className="text-sm text-muted-foreground font-medium tracking-wide"
        >
          Smart Distributor Collection Platform
        </motion.p>
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
    </div>
  );
}
