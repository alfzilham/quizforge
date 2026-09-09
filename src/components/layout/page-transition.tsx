"use client";

import { usePathname } from "next/navigation";
import { motion } from "motion/react";

/**
 * Transisi antar route: fade + slide kecil, 150–200ms (DESIGN.md §4).
 * Dinonaktifkan otomatis oleh MotionConfig reducedMotion="user".
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
