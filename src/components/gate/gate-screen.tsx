"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { motion } from "motion/react";
import { Lock, Eye, EyeOff, ArrowRight, LoaderCircle } from "lucide-react";
import { LogoLockup } from "@/components/brand-mark";

type Orb = { id: number; left: string; top: string; size: number; delay: number; dur: number; drift: string; opacity: number; accent: boolean };

function Orbs() {
  const [orbs, setOrbs] = useState<Orb[]>([]);
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      setOrbs(
        Array.from({ length: 18 }).map((_, i) => ({
          id: i,
          left: `${Math.random() * 100}%`,
          top: `${50 + Math.random() * 50}%`,
          size: 3 + Math.random() * 9,
          delay: Math.random() * 4,
          dur: 6 + Math.random() * 6,
          drift: `${(Math.random() - 0.5) * 90}px`,
          opacity: 0.25 + Math.random() * 0.45,
          accent: i % 3 === 0,
        })),
      ),
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {orbs.map((o) => (
        <span
          key={o.id}
          className="absolute rounded-full"
          style={{
            left: o.left,
            top: o.top,
            width: o.size,
            height: o.size,
            background: o.accent ? "var(--c-accent)" : "var(--c-brand)",
            // @ts-expect-error custom props for the float-orb keyframes
            "--orb-drift": o.drift,
            "--orb-opacity": o.opacity,
            animation: `float-orb ${o.dur}s ease-in ${o.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shine group flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-brand px-4 py-3 text-sm font-semibold text-brand-fg shadow-[var(--shadow-brand)] transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoaderCircle size={16} className="animate-spin" /> Unlocking…
        </>
      ) : (
        <>
          Enter site
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}

export function GateScreen({
  action,
  error,
  next,
}: {
  action: (formData: FormData) => void | Promise<void>;
  error: boolean;
  next: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-bg px-5">
      {/* animated golden aurora field */}
      <div className="aurora" />
      <div className="aurora aurora-2" />
      <Orbs />
      {/* vignette so the center reads cleanly */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 85% at 50% 42%, transparent 38%, var(--c-bg) 100%)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className={`relative w-full max-w-md ${error ? "shake" : ""}`}
      >
        <div className="glass rounded-3xl border border-border p-8 text-center shadow-[var(--shadow-lift)] sm:p-10">
          <div className="mb-7 flex justify-center">
            <LogoLockup height={38} />
          </div>

          {/* glowing lock */}
          <div className="mb-5 flex justify-center">
            <span
              className="glow-pulse breathe flex h-16 w-16 items-center justify-center rounded-full text-brand"
              style={{ background: "var(--c-brand-soft)", border: "1px solid color-mix(in srgb, var(--c-brand) 45%, transparent)" }}
            >
              <Lock size={26} />
            </span>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">
            This site is <span className="gradient-text">private</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-fg-muted">
            Enter the access password to continue to the workspace.
          </p>

          <form action={action} className="mt-7 space-y-3 text-left">
            <input type="hidden" name="next" value={next} />
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                name="password"
                required
                autoFocus
                autoComplete="off"
                placeholder="Access password"
                className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 pr-11 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-brand"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-fg-subtle transition-colors hover:text-fg"
                aria-label={show ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">
                Incorrect password — try again.
              </p>
            )}

            <SubmitButton />
          </form>

          <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-fg-subtle">Shepherds Web Design &amp; SEO</p>
        </div>
      </motion.div>
    </div>
  );
}
