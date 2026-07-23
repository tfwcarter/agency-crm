"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudDrizzle,
  CloudLightning,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { LogoLockup } from "@/components/brand-mark";

const DURATION_MS = 5000;

type Weather = { available: boolean; city?: string | null; region?: string | null; tempF?: number; code?: number; isDay?: boolean };

// Open-Meteo WMO weather codes → label + icon (day/night aware).
function describeWeather(code: number, isDay: boolean): { label: string; Icon: LucideIcon } {
  if (code === 0) return { label: "Clear", Icon: isDay ? Sun : Moon };
  if (code <= 2) return { label: "Partly cloudy", Icon: isDay ? CloudSun : CloudMoon };
  if (code === 3) return { label: "Overcast", Icon: Cloud };
  if (code <= 48) return { label: "Foggy", Icon: CloudFog };
  if (code <= 57) return { label: "Drizzle", Icon: CloudDrizzle };
  if (code <= 67) return { label: "Rain", Icon: CloudRain };
  if (code <= 77) return { label: "Snow", Icon: CloudSnow };
  if (code <= 82) return { label: "Showers", Icon: CloudRain };
  if (code <= 86) return { label: "Snow showers", Icon: CloudSnow };
  return { label: "Storms", Icon: CloudLightning };
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  if (!now) return <div className="h-[64px]" />;

  const h = now.getHours();
  const hour12 = ((h + 11) % 12) + 1;
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ampm = h < 12 ? "AM" : "PM";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline font-mono text-5xl font-semibold tabular-nums tracking-tight text-fg sm:text-6xl">
        <span>{hour12}</span>
        <span className="blink px-0.5 text-brand">:</span>
        <span>{mm}</span>
        <span className="blink px-0.5 text-brand">:</span>
        <span className="text-fg-muted">{ss}</span>
        <span className="ml-2 text-lg font-medium text-fg-subtle">{ampm}</span>
      </div>
      <p className="mt-1 text-sm text-fg-muted">{dateStr}</p>
    </div>
  );
}

type Orb = {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: number;
  dur: number;
  drift: string;
  opacity: number;
  accent: boolean;
};

function generateOrbs(): Orb[] {
  return Array.from({ length: 16 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${60 + Math.random() * 40}%`,
    size: 4 + Math.random() * 10,
    delay: Math.random() * 3,
    dur: 5 + Math.random() * 5,
    drift: `${(Math.random() - 0.5) * 80}px`,
    opacity: 0.25 + Math.random() * 0.4,
    accent: i % 3 === 0,
  }));
}

function Orbs() {
  // Generated in a rAF callback (not during render) so the random values don't
  // trip the purity lint rule and don't cause SSR/client hydration drift.
  const [orbs, setOrbs] = useState<Orb[]>([]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setOrbs(generateOrbs()));
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
            // @ts-expect-error custom props for keyframes
            "--orb-drift": o.drift,
            "--orb-opacity": o.opacity,
            animation: `float-orb ${o.dur}s ease-in ${o.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function WelcomeSplash({ greeting, firstName, orgName }: { greeting: string; firstName: string; orgName: string }) {
  // Start false on both server and client (no hydration mismatch); decide whether
  // to show on the next frame after reading sessionStorage.
  const [show, setShow] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("welcomed") === "1") return;
    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!show) return;
    sessionStorage.setItem("welcomed", "1");
    const timer = setTimeout(() => setShow(false), DURATION_MS);
    return () => clearTimeout(timer);
  }, [show]);

  useEffect(() => {
    if (!show) return;
    let alive = true;
    fetch("/api/weather")
      .then((r) => r.json())
      .then((d: Weather) => {
        if (alive && d.available) setWeather(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [show]);

  const wx = weather?.available && typeof weather.code === "number" ? describeWeather(weather.code, weather.isDay ?? true) : null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="welcome"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center overflow-hidden bg-bg"
          onClick={() => setShow(false)}
        >
          {/* moving aurora field */}
          <div className="aurora" />
          <div className="aurora aurora-2" />

          {/* faint grid vignette */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 80% at 50% 40%, transparent 40%, var(--c-bg) 100%)" }}
          />

          <Orbs />

          <div className="relative flex flex-col items-center px-6 text-center">
            <motion.div
              initial={{ scale: 0.7, y: -12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
            >
              <LogoLockup height={44} className="!rounded-2xl !px-6 !py-4" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
              className="mt-10"
            >
              <Clock />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.55, ease: "easeOut" }}
              className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              <span className="text-fg">{greeting}, </span>
              <span className="gradient-text">{firstName}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72, duration: 0.5, ease: "easeOut" }}
              className="mt-2 text-sm text-fg-muted"
            >
              Welcome back to {orgName}
            </motion.p>

            {/* weather chip — appears only when real data loads */}
            <div className="mt-6 h-9">
              <AnimatePresence>
                {wx && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="glass flex items-center gap-2.5 rounded-full border border-border px-4 py-2 text-sm shadow-[var(--shadow-card)]"
                  >
                    <wx.Icon size={17} className="text-brand" />
                    <span className="font-semibold text-fg">{weather?.tempF}°F</span>
                    <span className="text-fg-muted">{wx.label}</span>
                    {weather?.city && (
                      <span className="flex items-center gap-1 border-l border-border pl-2.5 text-fg-subtle">
                        <MapPin size={12} /> {weather.city}
                        {weather.region ? `, ${weather.region}` : ""}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* progress bar counts down the auto-dismiss */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: DURATION_MS / 1000, ease: "linear" }}
              className="mt-8 h-0.5 w-44 origin-left rounded-full"
              style={{ background: "linear-gradient(90deg, var(--c-brand), var(--c-accent))" }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="mt-4 text-[11px] uppercase tracking-widest text-fg-subtle"
            >
              Click anywhere to continue
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
