"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

/**
 * Rolls a number up from 0 to `value` when it scrolls into view.
 * Formatting is controlled by SERIALIZABLE props (currency/prefix/suffix/decimals)
 * so this can be used directly from Server Components — no function crosses the
 * server→client boundary. Respects prefers-reduced-motion.
 */
export function CountUp({
  value,
  currency = false,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.1,
  className,
}: {
  value: number;
  currency?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const fmt = (n: number) => {
    if (currency) {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
    }
    const num = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
    return `${prefix}${num}${suffix}`;
  };

  const [display, setDisplay] = useState(() => fmt(0));

  useEffect(() => {
    if (!inView) return;

    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // duration 0 snaps to the final value; onUpdate is a callback (never a
    // synchronous setState in the effect body), which keeps the lint rules happy.
    const controls = animate(0, value, {
      duration: reduce ? 0 : duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(fmt(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, duration, currency, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
