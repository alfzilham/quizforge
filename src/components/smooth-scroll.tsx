"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth scroll global via Lenis (DESIGN.md §4), dipasang sekali di root layout.
 * Untuk container scroll terpisah (mis. badan dialog/modal),
 * tambahkan atribut `data-lenis-prevent` pada container tersebut.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}
