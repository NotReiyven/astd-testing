import { HistorySnapshot } from "../../../../hooks/useUnitHistory";
import { GRID_STATUS_CFG } from "../../../../data";
import { triggerHaptic } from "../../../../data/helpers";
import {
  ChartPoint,
  formatLiquidityLabel,
  formatSnapValue,
} from "./formatters";

type Metric = "value" | "rarity" | "liquidity";
type RangeKey = "7D" | "30D" | "90D" | "ALL";

interface HistoricalChartProps {
  activeMetric: Metric;
  setActiveMetric: (m: Metric) => void;

  currentConfig: {
    label: string;
    color: string;
    gradientId: string;
    unitLabel: string;
  };

  filteredHistory: HistorySnapshot[];
  chartData: ChartPoint[];
  plottableChartData: ChartPoint[];
  rangeSummary: { maxVal: number; minVal: number };
  ocSnapshotCount: number;

  rangeFilter: RangeKey;
  setRangeFilter: (r: RangeKey) => void;
  displayHistoryLength: number;
  rangeCounts: Record<RangeKey, number>;

  selectedSnapId: string | null;
  setSelectedSnapId: (id: string | null) => void;
  selectedPoint: ChartPoint | null;
  handleSelectSnapshot: (id: string, scrollIntoTimeline?: boolean) => void;

  RechartsLib: any;
  showChartSkeleton: boolean;
  error: string | null;

  handleChartKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  handleStepSnapshot: (dir: -1 | 1) => void;
}

export function HistoricalChart({
  activeMetric,
  setActiveMetric,
  currentConfig,
  filteredHistory,
  chartData,
  plottableChartData,
  rangeSummary,
  ocSnapshotCount,
  rangeFilter,
  setRangeFilter,
  displayHistoryLength,
  rangeCounts,
  selectedSnapId,
  setSelectedSnapId,
  selectedPoint,
  handleSelectSnapshot,
  RechartsLib,
  showChartSkeleton,
  error,
  handleChartKeyDown,
  handleStepSnapshot,
}: HistoricalChartProps) {
  const displayLen = filteredHistory.length;
  const latestSnap = filteredHistory[filteredHistory.length - 1];

  const currentValFormatted = latestSnap
    ? formatSnapValue(latestSnap)
    : "N/A";
  const currentRarityVal = latestSnap?.rarity ?? 0;
  const currentLiqVal = formatLiquidityLabel(latestSnap?.liquidity);

  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    const isSelected = payload.snapId === selectedSnapId;
    const isMax =
      activeMetric !== "liquidity" &&
      payload.value === rangeSummary.maxVal &&
      plottableChartData.length > 1 &&
      rangeSummary.maxVal !== rangeSummary.minVal;
    const isMin =
      activeMetric !== "liquidity" &&
      payload.value === rangeSummary.minVal &&
      plottableChartData.length > 1 &&
      rangeSummary.minVal !== rangeSummary.maxVal;

    const handleDotClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleSelectSnapshot(payload.snapId, true);
    };

    if (isSelected) {
      return (
        <g onClick={handleDotClick} className="cursor-pointer">
          <circle cx={cx} cy={cy} r={8} fill="none" stroke="#ffffff" strokeWidth={1.5} opacity={0.9} />
          <circle cx={cx} cy={cy} r={4.5} fill={currentConfig.color} stroke="#ffffff" strokeWidth={1.5} />
        </g>
      );
    }

    if (isMax) {
      return (
        <g onClick={handleDotClick} className="cursor-pointer">
          <circle cx={cx} cy={cy} r={4} fill="#23a559" stroke="#111214" strokeWidth={1.5} />
        </g>
      );
    }

    if (isMin) {
      return (
        <g onClick={handleDotClick} className="cursor-pointer">
          <circle cx={cx} cy={cy} r={4} fill="var(--destructive)" stroke="#111214" strokeWidth={1.5} />
        </g>
      );
    }

    return (
      <circle
        cx={cx}
        cy={cy}
        r={2.5}
        onClick={handleDotClick}
        className="cursor-pointer"
        fill="var(--popover)"
        stroke={currentConfig.color}
        strokeWidth={1.5}
      />
    );
  };

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const point: ChartPoint = payload[0].payload;
    if (!point) return null;

    const snapStatusCfg = GRID_STATUS_CFG[point.fullSnap.status as keyof typeof GRID_STATUS_CFG];

    return (
      <div
        className="bg-popover border border-border rounded-[6px] p-3 shadow-xl min-w-[200px] max-w-[250px] flex flex-col gap-1.5 pointer-events-none"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <div className="flex items-center justify-between gap-2 text-[11.5px] font-mono text-muted-foreground">
          <span>{point.fullDate}</span>
          {snapStatusCfg && (
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-[1px] rounded-[3px] shrink-0 border shadow-xs"
              style={{
                backgroundColor: snapStatusCfg.bg,
                color: snapStatusCfg.color,
                borderColor: snapStatusCfg.border,
              }}
            >
              {snapStatusCfg.label}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-3 pt-0.5">
          <span className="text-[12px] text-muted-foreground">
            {currentConfig.unitLabel}
            {point.isRange && activeMetric === "value" ? " (Range)" : ""}
          </span>
          <span className="text-[15px] font-bold font-mono text-foreground">
            {point.displayLabel}
          </span>
        </div>

        {point.prevDisplayLabel !== null &&
          point.deltaFromPrev !== null &&
          point.deltaFromPrev !== 0 && (
            <div className="flex items-center justify-between gap-2 text-[11.5px] font-mono pt-1.5 border-t border-border/60">
              <span className="text-muted-foreground font-sans">
                vs Prev Snapshot
              </span>
              <span
                className={`font-semibold ${
                  point.deltaFromPrev > 0 ? "text-[#23a559]" : "text-destructive"
                }`}
              >
                {activeMetric === "liquidity"
                  ? `${point.prevDisplayLabel} → ${point.displayLabel}`
                  : `${point.deltaFromPrev > 0 ? "+" : "-"}${Math.abs(
                      point.deltaFromPrev
                    ).toLocaleString()}${
                      point.pctFromPrev !== null
                        ? ` (${point.pctFromPrev >= 0 ? "+" : "-"}${Math.abs(
                            point.pctFromPrev
                          ).toFixed(1)}%)`
                        : ""
                    }`}
              </span>
            </div>
          )}
      </div>
    );
  };

  return (
    <section
      aria-label="Historical chart"
      className="lg:col-span-8 flex flex-col gap-3 min-w-0 w-full overflow-hidden"
    >
      <div className="flex items-center justify-between flex-wrap gap-4 bg-card p-4 rounded-[8px] border border-border shadow-sm w-full min-w-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: currentConfig.color }}
              aria-hidden="true"
            />
            <h3 className="text-foreground text-[16px] font-bold">
              {currentConfig.label}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground flex-wrap font-medium">
            <span className="font-mono">
              {filteredHistory.length} snapshot{filteredHistory.length === 1 ? "" : "s"} in range
            </span>
            {activeMetric !== "liquidity" && plottableChartData.length > 1 && (
              <>
                <span className="text-border">•</span>
                <span className="font-mono">
                  High{" "}
                  <strong className="text-foreground font-bold">
                    {rangeSummary.maxVal.toLocaleString()}
                  </strong>
                </span>
                <span className="text-border">•</span>
                <span className="font-mono">
                  Low{" "}
                  <strong className="text-foreground font-bold">
                    {rangeSummary.minVal.toLocaleString()}
                  </strong>
                </span>
              </>
            )}
            {activeMetric === "value" && ocSnapshotCount > 0 && (
              <span className="text-[#FAA61A] font-bold bg-[#FAA61A]/10 px-1.5 py-0.5 rounded border border-[#FAA61A]/20">
                {ocSnapshotCount} O/C
              </span>
            )}
          </div>
        </div>

        <div
          className="inline-flex items-center bg-popover p-1 rounded-[6px] border border-border font-mono shadow-inner"
          role="group"
          aria-label="Filter chart by time range"
        >
          {(["7D", "30D", "90D", "ALL"] as const).map((rk) => {
            const active = rangeFilter === rk;
            const disabled = rk !== "ALL" && displayHistoryLength <= 1;
            return (
              <button
                key={rk}
                type="button"
                disabled={disabled}
                onClick={() => {
                  triggerHaptic("light");
                  setRangeFilter(rk);
                }}
                className={`px-3 py-1.5 rounded-[4px] text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  disabled
                    ? "opacity-40 cursor-not-allowed text-muted-foreground"
                    : active
                    ? "bg-foreground text-background shadow-sm cursor-pointer"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                }`}
                title={
                  rk === "ALL"
                    ? `Show all ${rangeCounts.ALL} snapshots`
                    : `Filter to last ${rk} (${rangeCounts[rk]} snapshots)`
                }
              >
                {rk}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[8px] border border-border bg-card overflow-hidden flex flex-col shadow-sm w-full min-w-0 max-w-full">
        {showChartSkeleton ? (
          <div className="h-[320px] p-6 flex flex-col justify-between animate-pulse w-full">
            <div className="h-full w-full flex flex-col justify-evenly">
              <div className="border-t border-border/40" />
              <div className="border-t border-border/40" />
              <div className="border-t border-border/40" />
            </div>
          </div>
        ) : error ? (
          <div className="h-[320px] flex flex-col items-center justify-center text-center p-6 gap-2 w-full">
            <span className="text-[15px] font-bold text-destructive">
              Unable to Load Unit History
            </span>
            <p className="text-[13px] text-muted-foreground max-w-sm">{error}</p>
          </div>
        ) : displayLen <= 1 ? (
          <div className="flex flex-col items-center justify-center h-[320px] text-center p-6 gap-3 w-full">
            <p className="text-foreground font-bold text-[16px]">
              Baseline Snapshot Recorded
            </p>
            <p className="text-muted-foreground text-[13.5px] max-w-md leading-relaxed">
              This unit currently has 1 recorded snapshot ({currentValFormatted},
              Rarity {currentRarityVal}/20, {currentLiqVal} liquidity). Historical
              trend lines appear as soon as a second snapshot is recorded.
            </p>
          </div>
        ) : activeMetric === "value" && plottableChartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[320px] text-center p-6 gap-4 w-full">
            <div className="flex flex-col gap-1.5">
              <p className="text-foreground font-bold text-[16px]">
                Owner's Choice (Non-Numeric Value)
              </p>
              <p className="text-muted-foreground text-[13.5px] max-w-md leading-relaxed">
                This unit is valued as Owner's Choice (O/C) in the selected range
                and cannot be plotted on a numeric scale.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveMetric("rarity")}
                className="px-4 py-2 rounded-[6px] bg-muted hover:bg-popover border border-border text-foreground text-[12.5px] font-bold transition-colors cursor-pointer"
              >
                View Rarity Chart
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric("liquidity")}
                className="px-4 py-2 rounded-[6px] bg-muted hover:bg-popover border border-border text-foreground text-[12.5px] font-bold transition-colors cursor-pointer"
              >
                View Liquidity Chart
              </button>
            </div>
          </div>
        ) : plottableChartData.length === 1 ? (
          <div className="flex flex-col items-center justify-center h-[320px] text-center p-6 gap-4 w-full">
            <div className="flex flex-col gap-1.5">
              <p className="text-foreground font-bold text-[16px]">
                Single Snapshot in {rangeFilter} Range
              </p>
              <p className="text-muted-foreground text-[13.5px] max-w-md leading-relaxed">
                Only 1 plottable snapshot (
                <span className="text-foreground font-mono font-bold">
                  {plottableChartData[0].displayLabel}
                </span>{" "}
                on {plottableChartData[0].fullDate}) falls within this time window.
              </p>
            </div>
            {rangeFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setRangeFilter("ALL")}
                className="px-4 py-2 rounded-[6px] bg-primary text-primary-foreground text-[12.5px] font-bold transition-colors cursor-pointer hover:bg-primary/90 shadow-sm"
              >
                Switch to ALL ({displayHistoryLength} snapshots)
              </button>
            )}
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label={`${currentConfig.label} interactive chart. Use Left and Right arrow keys to step through snapshots.`}
            onKeyDown={handleChartKeyDown}
            className="h-[320px] sm:h-[360px] w-full p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary flex items-center justify-center relative bg-[#0b0c0e] overflow-hidden min-w-0 max-w-full"
          >
            {RechartsLib ? (
              (() => {
                const {
                  AreaChart,
                  Area,
                  XAxis,
                  YAxis,
                  Tooltip,
                  ResponsiveContainer,
                  CartesianGrid,
                  ReferenceLine,
                } = RechartsLib;
                const dataForChart =
                  activeMetric === "value" ? plottableChartData : chartData;
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dataForChart}
                      onClick={(state: any) => {
                        const payload = state?.activePayload?.[0]?.payload;
                        if (payload?.snapId) {
                          handleSelectSnapshot(payload.snapId, false);
                        }
                      }}
                      margin={{ top: 12, right: 14, left: 0, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient
                          id={currentConfig.gradientId}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={currentConfig.color}
                            stopOpacity={0.22}
                          />
                          <stop
                            offset="95%"
                            stopColor={currentConfig.color}
                            stopOpacity={0.0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="2 4"
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="snapId"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        tickFormatter={(snapId: string) => {
                          const pt = dataForChart.find((d) => d.snapId === snapId);
                          return pt ? pt.axisLabel : "";
                        }}
                      />
                      <YAxis
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        ticks={activeMetric === "liquidity" ? [1, 2, 3] : undefined}
                        tickFormatter={(v: any) =>
                          activeMetric === "liquidity"
                            ? v === 3
                              ? "High"
                              : v === 2
                              ? "Avg"
                              : v === 1
                              ? "Low"
                              : ""
                            : activeMetric === "value" && v >= 1000
                            ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
                            : v
                        }
                        domain={
                          activeMetric === "liquidity" ? [0.5, 3.5] : ["auto", "auto"]
                        }
                      />
                      <Tooltip
                        cursor={{
                          stroke: "rgba(255,255,255,0.22)",
                          strokeWidth: 1,
                          strokeDasharray: "3 3",
                        }}
                        content={<CustomChartTooltip />}
                      />
                      {selectedSnapId && (
                        <ReferenceLine
                          x={selectedSnapId}
                          stroke="#ffffff"
                          strokeOpacity={0.45}
                          strokeDasharray="2 2"
                        />
                      )}
                      <Area
                        type={activeMetric === "liquidity" ? "stepAfter" : "monotone"}
                        isAnimationActive={false}
                        dataKey="value"
                        stroke={currentConfig.color}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#${currentConfig.gradientId})`}
                        dot={<CustomizedDot />}
                        activeDot={{
                          r: 6,
                          fill: currentConfig.color,
                          stroke: "#111214",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                );
              })()
            ) : (
              <span className="text-[12.5px] text-muted-foreground">
                Loading chart...
              </span>
            )}
          </div>
        )}

        {chartData.length > 1 && (
          <div className="px-4 py-3 bg-popover border-t border-border flex flex-wrap items-center justify-between gap-3 text-[12px] w-full min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleStepSnapshot(-1)}
                className="px-2.5 py-1 rounded-[4px] border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-bold transition-colors cursor-pointer active:scale-95"
                title="Inspect previous snapshot (Left Arrow)"
              >
                <span aria-hidden="true">‹</span> Prev
              </button>
              <button
                type="button"
                onClick={() => handleStepSnapshot(1)}
                className="px-2.5 py-1 rounded-[4px] border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-bold transition-colors cursor-pointer active:scale-95"
                title="Inspect next snapshot (Right Arrow)"
              >
                Next <span aria-hidden="true">›</span>
              </button>
            </div>

            {selectedPoint ? (
              <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                <span className="font-mono text-muted-foreground font-medium truncate">
                  Snapshot{" "}
                  <strong className="text-foreground">
                    {selectedPoint.index + 1} of {chartData.length}
                  </strong>{" "}
                  · {selectedPoint.fullDate} ·{" "}
                  <strong className="text-foreground font-bold">
                    {selectedPoint.displayLabel}
                  </strong>
                  {selectedPoint.pctFromPrev !== null &&
                    selectedPoint.pctFromPrev !== 0 && (
                      <span
                        className={`ml-1.5 font-bold ${
                          selectedPoint.pctFromPrev > 0
                            ? "text-[#23a559]"
                            : "text-destructive"
                        }`}
                      >
                        ({selectedPoint.pctFromPrev > 0 ? "+" : "-"}
                        {Math.abs(selectedPoint.pctFromPrev).toFixed(1)}%)
                      </span>
                    )}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSnapId(null)}
                  className="text-primary hover:underline font-bold cursor-pointer shrink-0 bg-primary/10 px-2 py-0.5 rounded-[4px]"
                >
                  Clear Selection
                </button>
              </div>
            ) : (
              <span className="text-muted-foreground font-medium truncate">
                Select a chart point or timeline event to inspect a snapshot
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}