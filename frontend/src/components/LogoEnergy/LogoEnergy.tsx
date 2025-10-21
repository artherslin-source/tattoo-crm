"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function LogoEnergy() {
  const [trigger, setTrigger] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTrigger(true);
      setTimeout(() => setTrigger(false), 2000);
    }, 15000); // every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative inline-block">
      <motion.h1
        className="text-4xl font-extrabold bg-gradient-to-r from-[#B88746] via-[#FFD580] to-[#F6E27A] bg-clip-text text-transparent"
      >
        TATTOO CRM
      </motion.h1>
      {trigger && (
        <motion.div
          key={Math.random()}
          className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-[#FFD580] to-transparent opacity-30 pointer-events-none"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

