import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function EyeBlinkOverlay() {
  const [isUnconscious, setIsUnconscious] = useState(false);

  useEffect(() => {
    const handleUnconscious = (e: any) => {
      setIsUnconscious(e.detail);
    };
    window.addEventListener("player-unconscious", handleUnconscious);
    return () => window.removeEventListener("player-unconscious", handleUnconscious);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {/* 
        This is a central transparent div. 
        It has a massive black box-shadow that stretches far beyond the screen.
        By animating the width and height of this transparent 'hole' down to 0, 
        the black shadow collapses inward, looking exactly like an eye closing!
      */}
      <motion.div
        className="absolute top-1/2 left-1/2 rounded-[50%]"
        style={{
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 0 300vmax black"
        }}
        initial={{ width: "150vw", height: "150vh" }}
        animate={{ 
          // Width stays wide so it forms a horizontal slit
          width: isUnconscious ? "120vw" : "150vw", 
          // Height collapses to 0 to shut the eyelids
          height: isUnconscious ? "0vh" : "150vh" 
        }}
        transition={{ 
          duration: isUnconscious ? 0.5 : 0.6, 
          ease: "easeInOut",
          delay: isUnconscious ? 0.8 : 0 
        }}
      />
    </div>
  );
}
