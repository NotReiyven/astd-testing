// ================================================
// FILE: src/app/components/InventoryChannel/Sparkline.tsx
// ================================================

interface SparklineProps {
  data: number[];
  baseline?: number;
  band?: [number, number];
  color?: string;
  height?: number;
  ariaLabel?: string;
}

/**
 * Renders a compact trend line. Inputs are raw values (not pre-normalized).
 * The component normalizes internally so callers do not need to compute
 * min/max themselves.
 *
 * - `baseline` draws a dashed reference line.
 * - `band` draws a semi-transparent band between y1 and y2 (e.g. ±1 sigma).
 */
export function Sparkline({
  data,
  baseline,
  band,
  color = "var(--primary)",
  height = 56,
  ariaLabel,
}: SparklineProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div
        className="w-full rounded-[4px] border border-border bg-muted/40"
        style={{ height }}
        aria-label={ariaLabel || "No sparkline data"}
      />
    );
  }

  const width = 100;
  const padTop = 4;
  const padBottom = 4;
  const drawHeight = height - padTop - padBottom;

  let lo = Math.min(...data);
  let hi = Math.max(...data);
  if (baseline !== undefined) {
    lo = Math.min(lo, baseline);
    hi = Math.max(hi, baseline);
  }
  if (band) {
    lo = Math.min(lo, band[0]);
    hi = Math.max(hi, band[1]);
  }
  if (hi === lo) {
    hi = lo + 1;
  }

  const scaleX = (i: number) =>
    data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
  const scaleY = (v: number) =>
    padTop + drawHeight - ((v - lo) / (hi - lo)) * drawHeight;

  const points = data
    .map((v, i) => `${scaleX(i).toFixed(2)},${scaleY(v).toFixed(2)}`)
    .join(" ");

  const areaPath =
    data.length === 1
      ? ""
      : `M0,${(padTop + drawHeight).toFixed(2)} L${points
          .split(" ")
          .join(" L")} L${width},${(padTop + drawHeight).toFixed(2)} Z`;

  const baselineY = baseline !== undefined ? scaleY(baseline) : null;
  const bandTop = band ? scaleY(band[1]) : null;
  const bandBottom = band ? scaleY(band[0]) : null;

  const gradientId = `spark-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full block"
      style={{ height }}
      role="img"
      aria-label={ariaLabel || "Value sparkline"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {bandTop !== null && bandBottom !== null && bandTop !== bandBottom && (
        <rect
          x={0}
          y={Math.min(bandTop, bandBottom)}
          width={width}
          height={Math.abs(bandBottom - bandTop)}
          fill={color}
          fillOpacity={0.08}
          stroke="none"
        />
      )}

      {baselineY !== null && (
        <line
          x1={0}
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke="var(--muted-foreground)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
          strokeOpacity={0.7}
        />
      )}

      {areaPath && (
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      )}

      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}