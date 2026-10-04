import { useState, useMemo } from "react";
import {
  avgStat,
  getTradeForecast,
  getLiquidityScore,
} from "./summaryUtils";
import { TradeCard, MasterUnit } from "../../../types";
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { RollingNumber } from "../shared/Formatters";

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
  const [isExpanded, setIsExpanded] = useState(false);

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
    setIsExpanded((prev) => !prev);
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


  return (
    <div
      className={`flex-shrink-0 mx-[var(--panel-p)] mt-[var(--gap-md)] rounded-[8px] p-[var(--panel-p)] relative bg-card border transition-all duration-300 z-20 shadow-sm flex flex-col gap-[var(--gap-md)] ${
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
            className="text-[16px] md:text-[18px] font-black text-foreground font-mono truncate"
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
              <span className="text-[14px] md:text-[16px] font-black font-mono text-muted-foreground">
                N/A
              </span>

              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                O/C Present
              </span>
            </>
          ) : giveTotal > 0 && getTotal > 0 ? (
            <>
              <span
                className={`text-[14px] md:text-[16px] font-black font-mono flex items-center ${
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
            className="text-[16px] md:text-[18px] font-black text-foreground font-mono truncate"
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
          <div className="w-full h-full bg-muted transition-all duration-500" />
        ) : (
          <>
            {giveTotal > 0 && (
              <div
                className="bg-[#FAA61A] transition-all duration-500"
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
                className="bg-primary transition-all duration-500"
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

      <button
        type="button"
        onClick={handleToggleExpanded}
        className="md:hidden flex items-center justify-center gap-1.5 w-full -mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[4px] py-1.5 cursor-pointer transition-colors"
        aria-expanded={isExpanded}
        aria-label={
          isExpanded
            ? "Hide trade details"
            : "Show trade details"
        }
      >
        <span>
          {isExpanded ? "Hide Details" : "View Details"}
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid grid-cols-2 lg:grid-cols-4 gap-[var(--gap-sm)] w-full ${
          isExpanded ? "grid" : "hidden"
        } md:grid`}
      >

        <div
          className="flex flex-col items-center p-2 rounded-[6px] bg-black/20 border border-border/50 hover:bg-black/30 transition-colors cursor-help relative"
          onMouseEnter={() => handleEnter("st")}
          onMouseLeave={handleLeave}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-[#FAA61A]" />

            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              ST Flip
            </span>
          </div>

          <span
            className={`text-[13px] font-black font-mono leading-none ${
              forecast.st > 0
                ? "text-[#23a559]"
                : forecast.st < 0
                ? "text-rose-400"
                : "text-foreground"
            }`}
          >
            {forecast.calculable
              ? `${forecast.st > 0 ? "+" : ""}${forecast.st.toFixed(
                  1
                )}`
              : "-"}
          </span>

          <div
            className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[180px] bg-popover border border-border text-foreground text-[11px] p-2.5 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] text-center ${
              activeTip === "st"
                ? "opacity-100"
                : "opacity-0"
            }`}
          >
            <strong className="text-[#FAA61A] block mb-1">
              Short-Term Flip
            </strong>

            Scores &gt; 0 are wins. Calculated using Raw Value,
            Liquidity, and immediate Market Tag momentum.
          </div>
        </div>

        <div
          className="flex flex-col items-center p-2 rounded-[6px] bg-black/20 border border-border/50 hover:bg-black/30 transition-colors cursor-help relative"
          onMouseEnter={() => handleEnter("lt")}
          onMouseLeave={handleLeave}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-primary" />

            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              LT Hold
            </span>
          </div>

          <span
            className={`text-[13px] font-black font-mono leading-none ${
              forecast.lt > 0
                ? "text-[#23a559]"
                : forecast.lt < 0
                ? "text-rose-400"
                : "text-foreground"
            }`}
          >
            {forecast.calculable
              ? `${forecast.lt > 0 ? "+" : ""}${forecast.lt.toFixed(
                  1
                )}`
              : "-"}
          </span>

          <div
            className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[180px] bg-popover border border-border text-foreground text-[11px] p-2.5 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] text-center ${
              activeTip === "lt"
                ? "opacity-100"
                : "opacity-0"
            }`}
          >
            <strong className="text-primary block mb-1">
              Long-Term Hold
            </strong>

            Scores &gt; 0 are wins. Weighs Rarity heavily and
            mathematically punishes "Hyped" or "Unstable" units.
          </div>
        </div>

        <div
          className="flex flex-col items-center p-2 rounded-[6px] bg-black/20 border border-border/50 hover:bg-black/30 transition-colors cursor-help relative"
          onMouseEnter={() => handleEnter("rarity")}
          onMouseLeave={handleLeave}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Rarity
          </span>

          <span className="text-[12px] font-bold text-foreground font-mono flex items-center gap-1">
            {avgStat(
              giveItems,
              "rarity",
              ALL_UNITS
            )}

            <span className="text-muted-foreground text-[9px]">
              ➔
            </span>

            {avgStat(
              getItems,
              "rarity",
              ALL_UNITS
            )}
          </span>

          <div
            className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[160px] bg-popover border border-border text-foreground text-[11px] p-2.5 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] text-center ${
              activeTip === "rarity"
                ? "opacity-100"
                : "opacity-0"
            }`}
          >
            <strong className="text-foreground block mb-1">
              Rarity (0-20)
            </strong>

            <span className="text-[#23a559] font-bold">
              Higher is better.
            </span>{" "}
            Determines absolute scarcity.
          </div>
        </div>

        <div
          className="flex flex-col items-center p-2 rounded-[6px] bg-black/20 border border-border/50 hover:bg-black/30 transition-colors cursor-help relative"
          onMouseEnter={() => handleEnter("liquidity")}
          onMouseLeave={handleLeave}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
            Liquidity
          </span>

          <span className="text-[12px] font-bold text-foreground font-mono flex items-center gap-1">
            {getLiqLabel(giveItems)}

            <span className="text-muted-foreground text-[9px]">
              ➔
            </span>

            {getLiqLabel(getItems)}
          </span>

          <div
            className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 w-[160px] bg-popover border border-border text-foreground text-[11px] p-2.5 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] text-center ${
              activeTip === "liquidity"
                ? "opacity-100"
                : "opacity-0"
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
      </div>
    </div>
  );
}
