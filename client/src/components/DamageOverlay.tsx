import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function DamageOverlay() {
  const [showRed, setShowRed] = useState(false);

  useEffect(() => {
    const onHazard = (e: any) => {
      const { impactAngle } = e.detail;
      
      // ONLY trigger for hurdles
      if (impactAngle === "hurdle") {
         setShowRed(true);
         // Auto-hide after 800ms
         setTimeout(() => setShowRed(false), 800);
      }
    };
    window.addEventListener("hazard-impact", onHazard);
    return () => window.removeEventListener("hazard-impact", onHazard);
  }, []);

  return (
    <AnimatePresence>
      {showRed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }} // Fade out duration
          className="absolute inset-0 pointer-events-none z-40"
          style={{
            // Red vignette on the edges, transparent in the middle
            background: "radial-gradient(circle, transparent 40%, rgba(200, 0, 0, 0.45) 100%)"
          }}
        />
      )}
    </AnimatePresence>
  );
}
