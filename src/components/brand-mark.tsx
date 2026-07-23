import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Square Shepherd monogram tile — for compact/square placements
 * (collapsed sidebar, favicon-style spots). Gradient background so the
 * white "S" reads in both light and dark themes.
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-xl font-bold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.52,
        background: "linear-gradient(135deg, var(--c-brand), var(--c-accent))",
        boxShadow: "var(--shadow-brand)",
      }}
    >
      S
    </span>
  );
}

/**
 * Full Shepherd wordmark (white logo). Sits on a brand-gradient chip so the
 * white artwork stays visible on light surfaces too. Use where there's
 * horizontal room — login/signup, splash, sidebar header.
 */
export function LogoLockup({ height = 30, className, plain }: { height?: number; className?: string; plain?: boolean }) {
  const img = (
    <Image
      src="/shepherd-logo.png"
      alt="Shepherd"
      width={Math.round(height * (1200 / 329))}
      height={height}
      priority
      style={{ height, width: "auto" }}
    />
  );

  if (plain) return <span className={cn("inline-flex", className)}>{img}</span>;

  return (
    <span
      className={cn("inline-flex items-center rounded-xl px-3 py-2", className)}
      style={{
        background: "linear-gradient(135deg, var(--c-brand), var(--c-accent))",
        boxShadow: "var(--shadow-brand)",
      }}
    >
      {img}
    </span>
  );
}
