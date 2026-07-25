import { cn } from "@/lib/utils";

const SERIF = "Georgia, 'Times New Roman', 'Playfair Display', serif";

/**
 * Square Shepherd monogram tile — for compact/square placements
 * (collapsed sidebar, favicon-style spots). Gold serif "S" on a dark tile
 * with a hairline gold edge, so it reads in both themes.
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-xl", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.6,
        fontFamily: SERIF,
        fontWeight: 700,
        color: "var(--c-brand)",
        background: "var(--c-brand-soft)",
        border: "1px solid color-mix(in srgb, var(--c-brand) 45%, transparent)",
        boxShadow: "var(--shadow-brand)",
      }}
    >
      S
    </span>
  );
}

/**
 * Full SHEPHERDS wordmark, recreated as crisp SVG so it scales to any size and
 * inherits the theme's gold. Parchment-gold "SHEPHERDS" framed by two rules,
 * with the "WEB DESIGN & SEO AGENCY" line breaking the lower rule. Set
 * `tagline` to include the brand promise beneath (only where there's vertical
 * room — splash, login).
 */
export function LogoLockup({
  height = 30,
  className,
  tagline = false,
}: {
  height?: number;
  className?: string;
  tagline?: boolean;
}) {
  const aspect = 1300 / 210;
  const width = Math.round(height * aspect);

  return (
    <span className={cn("inline-flex flex-col items-center", className)}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 1300 210"
        role="img"
        aria-label="Shepherds — Web Design & SEO Agency"
        style={{ display: "block" }}
      >
        {/* top rule */}
        <rect x="40" y="14" width="1220" height="5" fill="var(--c-fg)" />

        {/* wordmark */}
        <text
          x="650"
          y="170"
          textAnchor="middle"
          fontFamily={SERIF}
          fontWeight={700}
          fontSize="158"
          letterSpacing="2"
          fill="var(--c-brand)"
        >
          SHEPHERDS
        </text>

        {/* lower rule, broken where the subtitle sits */}
        <rect x="40" y="188" width="300" height="4" fill="var(--c-fg)" />
        <rect x="960" y="188" width="300" height="4" fill="var(--c-fg)" />

        {/* subtitle across the lower rule */}
        <text
          x="650"
          y="203"
          textAnchor="middle"
          fontFamily={SERIF}
          fontWeight={600}
          fontSize="43"
          letterSpacing="3"
          fill="var(--c-fg)"
        >
          WEB DESIGN &amp; SEO AGENCY
        </text>
      </svg>

      {tagline && (
        <p
          className="mt-3 text-center"
          style={{
            fontFamily: SERIF,
            fontWeight: 600,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontSize: Math.max(9, Math.round(height * 0.19)),
            color: "var(--c-fg-muted)",
          }}
        >
          You will be rich, you will be wealthy, you will be successful, you will grow closer to God
        </p>
      )}
    </span>
  );
}
