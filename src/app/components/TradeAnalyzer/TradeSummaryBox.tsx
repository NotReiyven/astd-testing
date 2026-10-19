import { useState, useMemo } from "react";
import {
  avgStat,
  getTradeForecast,
  getLiquidityScore,
} from "./summaryUtils";
import { TradeCard, MasterUnit } from "../../../types";
import { GiUpgrade, GiHourglass } from "react-icons/gi";
import { RollingNumber } from "../shared/Formatters";
import { useTradeStore, DEFAULT_ANALYZER_SETTINGS } from "../../../store/useTradeStore";
import { triggerHaptic } from "../../../data/helpers";

interface TradeSummaryBoxProps {
  isAnalyzerTarget: boolean;
  giveTotal: number;
  getTotal: number;
  givePercent: number;
  getPercent: number;
  giveItems: TradeCard[];
  getItems: TradeCard[];
  ALL_UNITS: MasterUnit[];
  isCompact?: boolean;
}

export function TradeSummaryBox({
  isAnalyzerTarget,
  giveTotal,
  getTotal,
  givePercent,
  getPercent,
  giveItems,
  getItems,
  ALL_UNITS,
  isCompact = false,
}: TradeSummaryBoxProps) {
  const [activeTip, currentTip] = useState<string | null>(null);
  const rawSettings = useTradeStore((s) => s.analyzerSettings);
  const updateAnalyzerSettings = useTradeStore((s) => s.updateAnalyzerSettings);

  const settings = {
    ...DEFAULT_ANALYZER_SETTINGS,
    ...(rawSettings || {}),
  };

  const isMetricsVisible = settings.showSummaryMetrics;
  const visibleMetricCount = [
    settings.showStFlip,
    settings.showLtHold,
    settings.showRarity,
    settings.showLiquidity,
  ].filter(Boolean).length;

  const forecast = getTradeForecast(
    giveItems,
    getItems,
    ALL_UNITS
  );

  const isOcPresent = useMemo(() => {
    return [...giveItems, ...getItems].some((c) => {
      const master = ALL_UNITS.find((u) => u.id === c.id);

      return (
        master?.value === "owner" ||
        master?.valueDisplay === "Owner's Choice" ||
        master?.valueDisplay === "O/C"
      );
    });
  }, [giveItems, getItems, ALL_UNITS]);

  const getLiqLabel = (items: TradeCard[]) => {
    if (items.length === 0) return "-";

    const score = getLiquidityScore(
      items,
      ALL_UNITS
    );

    if (score >= 3.0) return "High";
    if (score <= 0.6) return "Low";

    return "Avg";
  };

  const handleEnter = (tip: string) => {
    if (window.matchMedia("(hover: hover)").matches) {
      currentTip(tip);
    }
  };

  const handleLeave = () => {
    currentTip(null);
  };

  const handleToggleExpanded = () => {
    triggerHaptic("light");
    updateAnalyzerSettings({
      showSummaryMetrics: !isMetricsVisible,
    });
  };

  const valDiff = getTotal - giveTotal;

  if (isCompact) {
    return (
      <div className="flex-shrink-0 mx-[var(--panel-p)] mt-[var(--gap-sm)] rounded-[6px] px-3.5 py-2.5 bg-popover border border-border flex items-center justify-between shadow-sm z-20 animate-fade-in">
        {/* Give */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] font-medium text-muted-foreground">
            Give:
          </span>

          <span className="text-[12px] font-black font-mono text-[#FAA61A] truncate">
            <RollingNumber value={giveTotal} />
          </span>
        </div>

        {/* Difference */}
        <div className="flex items-center gap-1 font-mono text-[11px] font-black shrink-0">
          {isOcPresent ? (
            <span className="text-muted-foreground">
              N/A (O/C)
            </span>
          ) : (
            <span
              className={
                valDiff > 0
                  ? "text-[#23a559]"
                  : valDiff < 0
                  ? "text-rose-400"
                  : "text-foreground"
              }
            >
              {valDiff > 0 ? "+" : ""}
              <RollingNumber value={valDiff} />
            </span>
          )}
        </div>

        {/* Get */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[12px] font-medium text-muted-foreground">
            Get:
          </span>

          <span className="text-[12px] font-black font-mono text-primary truncate">
            <RollingNumber value={getTotal} />
          </span>
        </div>
      </div>
    );
  }

  const gridColsClass =
    visibleMetricCount === 1
      ? "grid-cols-1"
      : visibleMetricCount === 2
      ? "grid-cols-2"
      : visibleMetricCount === 3
      ? "grid-cols-3"
      : "grid-cols-2 lg:grid-cols-4";

  return (
    <div
      className={`flex-shrink-0 mx-[var(--panel-p)] mt-[var(--gap-md)] rounded-[8px] p-[var(--panel-p)] relative bg-card border transition-[border-color,box-shadow] duration-300 z-20 shadow-sm flex flex-col gap-2.5 ${
        isAnalyzerTarget
          ? "border-primary shadow-[0_0_20px_var(--primary)] ring-4 ring-primary/30 z-[100005]"
          : "border-border"
      }`}
    >
      <div className="flex items-start justify-between w-full">
        {/* Total Give */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Total Give
          </p>

          <p
            className="text-[16px] md:text-[18px] font-black text-foreground font-mono tabular-nums truncate"
            title={giveTotal.toLocaleString()}
          >
            {isOcPresent && giveTotal === 0 ? (
              "O/C"
            ) : (
              <RollingNumber value={giveTotal} />
            )}
          </p>
        </div>

        {/* Center Difference */}
        <div className="flex flex-col items-center px-2 md:px-4 shrink-0">
          {isOcPresent ? (
            <>
              <span className="text-[14px] md:text-[16px] font-black font-mono tabular-nums text-muted-foreground">
                N/A
              </span>

              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                O/C Present
              </span>
            </>
          ) : giveTotal > 0 && getTotal > 0 ? (
            <>
              <span
                className={`text-[14px] md:text-[16px] font-black font-mono tabular-nums flex items-center ${
                  getTotal > giveTotal
                    ? "text-[#23a559]"
                    : getTotal < giveTotal
                    ? "text-rose-400"
                    : "text-foreground"
                }`}
              >
                {getTotal > giveTotal ? "+" : ""}
                <RollingNumber value={valDiff} />
              </span>

              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                Raw Diff
              </span>
            </>
          ) : null}
        </div>

        {/* Total Get */}
        <div className="flex-1 min-w-0 text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Total Get
          </p>

          <p
            className="text-[16px] md:text-[18px] font-black text-foreground font-mono tabular-nums truncate"
            title={getTotal.toLocaleString()}
          >
            {isOcPresent && getTotal === 0 ? (
              "O/C"
            ) : (
              <RollingNumber value={getTotal} />
            )}
          </p>
        </div>
      </div>

      <div className="flex w-full h-[6px] gap-1.5 rounded-full overflow-hidden bg-popover">
        {isOcPresent ? (
          <div className="w-full h-full bg-muted transition-[width] duration-500" />
        ) : (
          <>
            {giveTotal > 0 && (
              <div
                className="bg-[#FAA61A] transition-[width] duration-500"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, givePercent)
                  )}%`,
                }}
              />
            )}

            {getTotal > 0 && (
              <div
                className="bg-primary transition-[width] duration-500"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, getPercent)
                  )}%`,
                }}
              />
            )}
          </>
        )}
      </div>

      {visibleMetricCount > 0 && (
        <>
          <button
            type="button"
            onClick={handleToggleExpanded}
            className="flex items-center justify-between w-full -my-0.5 px-1 py-1 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none rounded-[4px] cursor-pointer transition-colors"
            aria-expanded={isMetricsVisible}
            aria-label={
              isMetricsVisible
                ? "Collapse trade metrics"
                : "Expand trade metrics"
            }
          >
            <span>
              {isMetricsVisible
                ? "Forecast & Metrics"
                : "Show Metrics (ST • LT • Rarity • Liq)"}
            </span>

            <svg
              viewBox="0 0 16 16"
              fill="none"
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isMetricsVisible ? "rotate-180" : ""
              }`}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6L8 10L12 6" />
            </svg>
          </button>

          {isMetricsVisible && (
            <div className={`grid ${gridColsClass} gap-1.5 w-full`}>
              {settings.showStFlip && (
                <div
                  className="flex flex-col items-center justify-center min-w-0 p-2 rounded-[6px] bg-black/20 border border-border/50 hover:bg-black/30 transition-colors cursor-help relative"
                  onMouseEnter={() => handleEnter("st")}
                  onMouseLeave={handleLeave}
                >
                  <div className="flex items-center gap-1 mb-1 max-w-full">
                    <GiUpgrade className="w-3 h-3 text-[#FAA61A] shrink-0" />

                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                      ST Flip
                    </span>
                  </div>

                  <span
                    className={`text-[12px] font-black font-mono tabular-nums leading-none truncate max-w-full ${
                      forecast.st > 0
                        ? "text-[#23a559]"
                        : forecast.st < 0
                        ? "text-rose-400"
                        : "text-foreground"
                    }`}
                  >
                    {forecast.calculable
                      ? `${forecast.st > 0 ? "+" : ""}${forecast.st.toFixed(1)}`
                      : "-"}
                  </span>

                  <div
                    className={`absolute top-full mt-2 left-0 w-[180px] bg-popover border border-border text-foreground text-[11px] p-2.5 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] text-center ${
                      activeTip === "st" ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <strong className="text-[#FAA61A] block mb-1">
                      Short-Term Flip
                    </strong>
                    Scores &gt; 0 are wins. Calculated using Raw Value,
                    Liquidity, and immediate Market Tag momentum.
                  </div>
                </div>
              )}

              {settings.showLtHold && (
                <div
                  className="flex flex-col items-center justify-center min-w-0 p-2 rounded-[6px] bg-black/20 border border-border/50 hover:bg-black/30 transition-colors cursor-help relative"
                  onMouseEnter={() => handleEnter("lt")}
                  onMouseLeave={handleLeave}
                >
                  <div className="flex items-center gap-1 mb-1 max-w-full">
                    <GiHourglass className="w-3 h-3 text-primary shrink-0" />

                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                      LT Hold
                    </span>
                  </div>

                  <span
                    className={`text-[12px] font-black font-mono tabular-nums leading-none truncate max-w-full ${
                      forecast.lt > 0
                        ? "text-[#23a559]"
                        : forecast.lt < 0
                        ? "text-rose-400"
                        : "text-foreground"
                    }`}
                  >
                    {forecast.calculable
                      ? `${forecast.lt > 0 ? "+" : ""}${forecast.lt.toFixed(1)}`
                      : "-"}
                  </span>

                  <div
                    className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[180px] bg-popover border border-border text-foreground text-[11px] p-2.5 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] text-center ${
                      activeTip === "lt" ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <strong className="text-primary block mb-1">
                      Long-Term Hold
                    </strong>
                    Scores &gt; 0 are wins. Weighs Rarity heavily and
                    mathematically punishes &ldquo;Hyped&rdquo; or &ldquo;Unstable&rdquo; units.
                  </div>
                </div>
              )}

              {settings.showRarity && (
                <div
                  className="flex flex-col items-center justify-center min-w-0 p-2 rounded-[6px] bg-black/20 border border-border/50 hover:bg-black/30 transition-colors cursor-help relative"
                  onMouseEnter={() => handleEnter("rarity")}
                  onMouseLeave={handleLeave}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1 truncate max-w-full">
                    Rarity
                  </span>

                  <span className="text-[11px] font-bold text-foreground font-mono tabular-nums leading-none flex items-center justify-center gap-0.5 max-w-full whitespace-nowrap overflow-hidden">
                    <span className="truncate">
                      {avgStat(giveItems, "rarity", ALL_UNITS)}
                    </span>
                    <span className="text-muted-foreground text-[8px] shrink-0">
                      ➔
                    </span>
                    <span className="truncate">
                      {avgStat(getItems, "rarity", ALL_UNITS)}
                    </span>
                  </span>

                  <div
                    className={`absolute top-full mt-2 right-0 w-[160px] bg-popover border border-border text-foreground text-[11px] p-2.5 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] text-center ${
                      activeTip === "rarity" ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <strong className="text-foreground block mb-1">
                      Rarity (0–20)
                    </strong>
                    <span className="text-[#23a559] font-bold">
                      Higher is better.
                    </span>{" "}
                    Determines absolute scarcity.
                  </div>
                </div>
              )}

              {settings.showLiquidity && (
                <div
                  className="flex flex-col items-center justify-center min-w-0 p-2 rounded-[6px] bg-black/20 border border-border/50 hover:bg-black/30 transition-colors cursor-help relative"
                  onMouseEnter={() => handleEnter("liquidity")}
                  onMouseLeave={handleLeave}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1 truncate max-w-full">
                    Liquidity
                  </span>

                  <span className="text-[11px] font-bold text-foreground font-mono tabular-nums leading-none flex items-center justify-center gap-0.5 max-w-full whitespace-nowrap overflow-hidden">
                    <span className="truncate">{getLiqLabel(giveItems)}</span>
                    <span className="text-muted-foreground text-[8px] shrink-0">
                      ➔
                    </span>
                    <span className="truncate">{getLiqLabel(getItems)}</span>
                  </span>

                  <div
                    className={`absolute top-full mt-2 right-0 w-[160px] bg-popover border border-border text-foreground text-[11px] p-2.5 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] text-center ${
                      activeTip === "liquidity" ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <strong className="text-foreground block mb-1">
                      Liquidity
                    </strong>
                    <span className="text-[#23a559] font-bold">
                      High is better.
                    </span>{" "}
                    How fast you can find a buyer.
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
