"use client";

import { useEffect, useState } from "react";

/**
 * `true` bila efek gerak berat sebaiknya dimatikan:
 *  - viewport di bawah 1024px (HP & tablet), atau
 *  - pengguna mengaktifkan "reduce motion" di sistemnya.
 *
 * Dipakai untuk melewati parallax berbasis scroll (useScroll + useSpring),
 * yang menjalankan loop rAF terus-menerus dan paling terasa memberatkan
 * di perangkat seluler. Desktop (>= 1024px) tidak terpengaruh sama sekali.
 *
 * Nilai awal sengaja `false` supaya render pertama di server dan klien sama;
 * penyesuaian terjadi pada efek pertama setelah mount.
 */
export function useLiteMotion(): boolean {
  const [lite, setLite] = useState(false);

  useEffect(() => {
    const small = window.matchMedia("(max-width: 1023px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => setLite(small.matches || reduced.matches);
    sync();

    small.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      small.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  return lite;
}
