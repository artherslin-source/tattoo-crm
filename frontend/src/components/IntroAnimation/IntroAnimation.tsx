"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export default function IntroAnimation({ onFinish }: { onFinish: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const played = localStorage.getItem("introPlayed");
    if (played) {
      setShow(false);
      onFinish();
      return;
    }
    const timer = setTimeout(() => {
      setShow(false);
      localStorage.setItem("introPlayed", "true");
      onFinish();
    }, 3800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Brush stroke sweep */}
          <motion.div
            className="gold-brush absolute"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
          />

          {/* Logo */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
            className="text-6xl font-extrabold text-center bg-gradient-to-r from-[#B88746] via-[#FFD580] to-[#F6E27A] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,220,140,0.4)] tracking-[0.05em]"
          >
            TATTOO CRM
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.8, y: 0 }}
            transition={{ delay: 1.4, duration: 1 }}
            className="text-gray-400 mt-4 text-lg tracking-widest font-light"
          >
            ink your vision
          </motion.p>

          {/* Particle burst */}
          {[...Array(25)].map((_, i) => (
            <motion.span
              key={i}
              className="particle"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [1, 0],
                scale: [1, 0],
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 250,
              }}
              transition={{
                delay: 1.6 + Math.random() * 0.3,
                duration: 1.8 + Math.random() * 0.5,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

