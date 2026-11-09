import {
  FiClock,
  FiBell,
} from "react-icons/fi";
import { HistorySnapshot } from "../../../../hooks/useUnitHistory";
import { MasterUnit } from "../../../../types";
import { triggerHaptic } from "../../../../data/helpers";
import { SnapshotDiffList } from "./SnapshotDiffList";
import {
  ChangedField,
  TimelineEvent,
  formatShortDate,
  formatSnapValue,
  formatLiquidityLabel,
} from "./formatters";
import { useAlertStore } from "../../../../lib/alertEngine";

type Metric = "value" | "rarity" | "liquidity";

interface MarketStatsPanelProps {
  activeMetric: Metric;
  setActiveMetric: (m: Metric) => void;

  currentUnit: MasterUnit;
  latestSnap: HistorySnapshot | undefined;
  currentValFormatted: string;
  currentRarityVal: number;
  currentLiqVal: string;

  rangeSummary: {
    valuePct: number | null;
    valueDelta: number | null;
    baselineDate: string | null;
    rarityDelta: number | null;
  };
  rangeFilter: string;

  diffSinceLastVisit: {
    value: { old: unknown; new: unknown } | null;
    status: { old: string; new: string } | null;
    rarity: { old: number; new: number } | null;
  } | null;

  profile: { id: string } | null;
  currentUnitId: string;
  alertValue: string;
  setAlertValue: (v: string) => void;

  activeShiftEvent: TimelineEvent | null;
  selectedPoint: { fullDate: string; relativeTime: string; displayLabel: string } | null;
  displayHistoryLength: number;

  isCompareOpen: boolean;
  setIsCompareOpen: (v: boolean) => void;
  compareMode: "previous" | "baseline";
  setCompareMode: (m: "previous" | "baseline") => void;
  compareTargetCurr: HistorySnapshot | null;
  compareTargetPrev: HistorySnapshot | null;
  onResetSelection: () => void;

  hasUnitContext: boolean;
}

export function MarketStatsPanel({
  activeMetric,
  setActiveMetric,
  currentUnit,
  currentValFormatted,
  currentRarityVal,
  currentLiqVal,
  rangeSummary,
  rangeFilter,
  diffSinceLastVisit,
  profile,
  currentUnitId,
  alertValue,
  setAlertValue,
  activeShiftEvent,
  selectedPoint,
  displayHistoryLength,
  isCompareOpen,
  setIsCompareOpen,
  compareMode,
  setCompareMode,
  compareTargetCurr,
  compareTargetPrev,
  onResetSelection,
  hasUnitContext,
}: MarketStatsPanelProps) {
  const addAlert = useAlertStore((s) => s.addAlert);
  const removeAlert = useAlertStore((s) => s.removeAlert);
  const userAlerts = useAlertStore((s) =>
    profile ? s.alerts[profile.id] : undefined
  );

  const currentUnitAlerts = (userAlerts || []).filter(
    (a) => a.unitId === currentUnitId
  );

  const handleSetAlert = (condition: "above" | "below") => {
    if (!profile) return;
    const val = parseFloat(alertValue);
    if (isNaN(val) || val <= 0) return;
    triggerHaptic("success");
    addAlert(profile.id, { unitId: currentUnitId, condition, value: val });
    setAlertValue("");
  };

  return (
    <div className="lg:col-span-4 flex flex-col gap-5 min-w-0">
      {/* SECTION B: Market Statistics */}
      <section aria-label="Current market statistics" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">
            Market Statistics
          </h3>
          <span className="text-[11px] text-muted-foreground font-medium">
            Select to switch chart
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Select historical metric to chart"
          className="rounded-[8px] border border-border bg-card overflow-hidden divide-y divide-border shadow-sm"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMetric === "value"}
            onClick={() => {
              triggerHaptic("light");
              setActiveMetric("value");
            }}
            className={`w-full px-4 py-4 text-left transition-colors relative flex flex-col gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
              activeMetric === "value" ? "bg-primary/[0.06]" : "hover:bg-muted/50"
            }`}
          >
            {activeMetric === "value" && (
              <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-primary" />
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
                Current Value
                {activeMetric === "value" && (
                  <span className="text-[10.5px] font-bold text-primary">
                    Charting
                  </span>
                )}
              </span>
              {rangeSummary.valuePct !== null && (
                <span
                  className={`text-[12px] font-bold font-mono px-1.5 py-0.5 rounded-[4px] border ${
                    rangeSummary.valuePct >= 0
                      ? "bg-[#23a559]/10 text-[#23a559] border-[#23a559]/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}
                >
                  {rangeSummary.valuePct >= 0 ? "+" : "-"}
                  {Math.abs(rangeSummary.valuePct).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[26px] font-black font-mono text-foreground tracking-tight truncate">
                {currentValFormatted}
              </span>
              {rangeSummary.valueDelta !== null && rangeSummary.valueDelta !== 0 && (
                <span className="text-[12px] font-mono text-muted-foreground font-semibold">
                  {rangeSummary.valueDelta > 0 ? "+" : "-"}
                  {Math.abs(rangeSummary.valueDelta).toLocaleString()} ({rangeFilter})
                </span>
              )}
            </div>
          </button>

          <div className="grid grid-cols-2 divide-x divide-border">
            <button
              type="button"
              role="tab"
              aria-selected={activeMetric === "rarity"}
              onClick={() => {
                triggerHaptic("light");
                setActiveMetric("rarity");
              }}
              className={`px-4 py-3.5 text-left transition-colors relative flex flex-col gap-1.5 cursor-pointer ${
                activeMetric === "rarity"
                  ? "bg-[#4DB6AC]/[0.06]"
                  : "hover:bg-muted/50"
              }`}
            >
              {activeMetric === "rarity" && (
                <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#4DB6AC]" />
              )}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] font-semibold text-muted-foreground">
                  Rarity
                </span>
                {activeMetric === "rarity" ? (
                  <span className="text-[10.5px] font-bold text-[#4DB6AC]">
                    Charting
                  </span>
                ) : (
                  rangeSummary.rarityDelta !== null &&
                  rangeSummary.rarityDelta !== 0 && (
                    <span className="text-[11px] font-mono font-bold text-[#4DB6AC]">
                      {rangeSummary.rarityDelta > 0 ? "+" : "-"}
                      {Math.abs(rangeSummary.rarityDelta)}
                    </span>
                  )
                )}
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-[20px] font-black text-[#4DB6AC]">
                  {currentRarityVal}
                </span>
                <span className="text-[13px] text-muted-foreground font-semibold">
                  / 20
                </span>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeMetric === "liquidity"}
              onClick={() => {
                triggerHaptic("light");
                setActiveMetric("liquidity");
              }}
              className={`px-4 py-3.5 text-left transition-colors relative flex flex-col gap-1.5 cursor-pointer ${
                activeMetric === "liquidity"
                  ? "bg-[#81C784]/[0.06]"
                  : "hover:bg-muted/50"
              }`}
            >
              {activeMetric === "liquidity" && (
                <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#81C784]" />
              )}
              <div className="flex items-center justify-between gap-1">
                <span className="text-[12px] font-semibold text-muted-foreground">
                  Liquidity
                </span>
                {activeMetric === "liquidity" && (
                  <span className="text-[10.5px] font-bold text-[#81C784]">
                    Charting
                  </span>
                )}
              </div>
              <span className="text-[18px] font-black font-mono text-[#81C784] truncate">
                {currentLiqVal}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Item 12: "What Changed" Banner */}
      {diffSinceLastVisit &&
        (diffSinceLastVisit.value ||
          diffSinceLastVisit.status ||
          diffSinceLastVisit.rarity) && (
          <div className="bg-[#23a559]/10 border border-[#23a559]/30 rounded-[8px] p-4 flex flex-col gap-1.5 shadow-sm">
            <span className="text-[12px] font-bold text-[#23a559] uppercase tracking-wider flex items-center gap-1.5">
              <FiClock className="w-3.5 h-3.5" /> Changes Since Your Last Visit
            </span>
            <div className="flex flex-col gap-1 text-[12.5px] font-mono">
              {diffSinceLastVisit.value && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Value:</span>
                  <span className="text-foreground">
                    {typeof diffSinceLastVisit.value.old === "number"
                      ? diffSinceLastVisit.value.old.toLocaleString()
                      : String(diffSinceLastVisit.value.old)}{" "}
                    →{" "}
                    <strong className="font-bold">
                      {typeof diffSinceLastVisit.value.new === "number"
                        ? diffSinceLastVisit.value.new.toLocaleString()
                        : String(diffSinceLastVisit.value.new)}
                    </strong>
                  </span>
                </div>
              )}
              {diffSinceLastVisit.status && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-foreground capitalize">
                    {diffSinceLastVisit.status.old} →{" "}
                    <strong className="font-bold">
                      {diffSinceLastVisit.status.new}
                    </strong>
                  </span>
                </div>
              )}
              {diffSinceLastVisit.rarity && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rarity:</span>
                  <span className="text-foreground">
                    {diffSinceLastVisit.rarity.old} →{" "}
                    <strong className="font-bold">
                      {diffSinceLastVisit.rarity.new}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Item 15: Watchlist Alerts */}
      <section className="rounded-[8px] border border-border bg-card p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">
            Price Alerts
          </h3>
          <FiBell className="w-4 h-4 text-muted-foreground" />
        </div>

        {!profile ? (
          <span className="text-[12.5px] text-muted-foreground">
            Sign in with Discord to configure price alerts.
          </span>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Set target value..."
                value={alertValue}
                onChange={(e) => setAlertValue(e.target.value)}
                className="flex-1 bg-input border border-border rounded-[4px] px-3 py-1.5 text-[12px] text-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => handleSetAlert("above")}
                className="px-3 py-1.5 bg-muted hover:bg-[#23a559] hover:text-white rounded-[4px] text-[11px] font-bold transition-colors cursor-pointer"
              >
                Above
              </button>
              <button
                onClick={() => handleSetAlert("below")}
                className="px-3 py-1.5 bg-muted hover:bg-rose-500 hover:text-white rounded-[4px] text-[11px] font-bold transition-colors cursor-pointer"
              >
                Below
              </button>
            </div>

            {currentUnitAlerts.map((alert, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-popover p-2.5 rounded-[4px] border border-border text-[12px]"
              >
                <span className="text-muted-foreground">
                  Alert when value is{" "}
                  <strong className="text-foreground">{alert.condition}</strong>{" "}
                  {alert.value?.toLocaleString()}
                </span>
                <button
                  onClick={() =>
                    removeAlert(profile.id, currentUnitId, alert.condition)
                  }
                  className="text-destructive hover:underline text-[11px] cursor-pointer font-bold"
                >
                  Remove
                </button>
              </div>
            ))}
            {currentUnitAlerts.length === 0 && (
              <span className="text-[11.5px] text-muted-foreground italic">
                No active alerts for this unit.
              </span>
            )}
          </>
        )}
      </section>

      {/* SECTION C: Latest Shift */}
      <section
        aria-label="Latest market shift and comparison"
        className="rounded-[8px] border border-border bg-card p-4 flex flex-col gap-3 shadow-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                {selectedPoint ? "Selected Snapshot" : "Latest Shift"}
              </h3>
              {selectedPoint && (
                <button
                  type="button"
                  onClick={onResetSelection}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Reset to latest
                </button>
              )}
            </div>
            {activeShiftEvent ? (
              <span className="text-[11.5px] font-mono text-muted-foreground font-medium">
                {activeShiftEvent.dateFormatted} · {activeShiftEvent.relativeTime}
              </span>
            ) : selectedPoint ? (
              <span className="text-[11.5px] font-mono text-muted-foreground font-medium">
                {selectedPoint.fullDate} · {selectedPoint.relativeTime}
              </span>
            ) : null}
          </div>

          {displayHistoryLength > 1 && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setIsCompareOpen(!isCompareOpen);
              }}
              aria-expanded={isCompareOpen}
              className={`px-2.5 py-1 rounded-[5px] text-[11.5px] font-bold border transition-colors cursor-pointer shrink-0 ${
                isCompareOpen
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-popover border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {isCompareOpen ? "Hide Compare" : "Compare"}
            </button>
          )}
        </div>

        {activeShiftEvent ? (
          <div className="pt-3 border-t border-border/60">
            <SnapshotDiffList
              curr={activeShiftEvent.snap}
              prev={activeShiftEvent.prev}
              changed={activeShiftEvent.changed as ChangedField[]}
              compact
            />
          </div>
        ) : selectedPoint ? (
          <p className="text-[12.5px] text-muted-foreground pt-3 border-t border-border/60 leading-relaxed">
            Initial baseline snapshot in this sequence (
            <span className="font-mono text-foreground font-bold">
              {selectedPoint.displayLabel}
            </span>
            ). No prior snapshot to diff against.
          </p>
        ) : (
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            No recorded field changes in the {rangeFilter} window.
          </p>
        )}

        {isCompareOpen && compareTargetCurr && compareTargetPrev && (
          <div className="pt-4 border-t border-border flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-bold text-foreground uppercase tracking-wider">
                  Snapshot Comparison
                </span>
                <div
                  className="inline-flex items-center bg-card rounded-[5px] border border-border p-0.5"
                  role="group"
                  aria-label="Comparison baseline"
                >
                  <button
                    type="button"
                    onClick={() => setCompareMode("previous")}
                    className={`px-2.5 py-1 rounded-[3px] text-[11px] font-bold transition-colors cursor-pointer ${
                      compareMode === "previous"
                        ? "bg-muted text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Prev Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode("baseline")}
                    className={`px-2.5 py-1 rounded-[3px] text-[11px] font-bold transition-colors cursor-pointer ${
                      compareMode === "baseline"
                        ? "bg-muted text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Range Start
                  </button>
                </div>
              </div>
              <span className="text-[11.5px] font-mono text-muted-foreground">
                Comparing {formatShortDate(compareTargetPrev.recorded_at)} →{" "}
                <strong className="text-foreground font-bold">
                  {compareTargetCurr.id === "live-now"
                    ? "Current"
                    : formatShortDate(compareTargetCurr.recorded_at)}
                </strong>
              </span>
            </div>

            <div className="rounded-[6px] bg-background border border-border px-3 py-2 divide-y divide-border text-[12.5px]">
              {(
                [
                  {
                    label: "Value",
                    before: formatSnapValue(compareTargetPrev),
                    after: formatSnapValue(compareTargetCurr),
                  },
                  {
                    label: "Status",
                    before: compareTargetPrev.status || "stable",
                    after: compareTargetCurr.status || "stable",
                  },
                  {
                    label: "Rarity",
                    before: `${compareTargetPrev.rarity ?? 0} / 20`,
                    after: `${compareTargetCurr.rarity ?? 0} / 20`,
                  },
                  {
                    label: "Liquidity",
                    before: formatLiquidityLabel(compareTargetPrev.liquidity),
                    after: formatLiquidityLabel(compareTargetCurr.liquidity),
                  },
                ] as const
              ).map((row) => {
                const isSame =
                  row.before.toLowerCase() === row.after.toLowerCase();
                return (
                  <div
                    key={row.label}
                    className="py-2 flex items-center justify-between gap-2"
                  >
                    <span className="text-[12px] font-medium text-muted-foreground">
                      {row.label}
                    </span>
                    {isSame ? (
                      <span className="font-mono text-[12px] text-muted-foreground capitalize">
                        {row.after}{" "}
                        <span className="text-[11px] opacity-60 font-sans">
                          (unchanged)
                        </span>
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-foreground capitalize">
                        <span className="text-muted-foreground font-normal line-through decoration-muted-foreground/50">
                          {row.before}
                        </span>{" "}
                        → {row.after}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SECTION D: Unit Notice */}
      {hasUnitContext && (
        <section
          aria-label="Unit notice and market tags"
          className="rounded-[8px] border border-border bg-card p-4 flex flex-col gap-3 shadow-sm"
        >
          <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">
            Unit Notes
          </h3>
          {currentUnit.notice && (
            <p className="text-[13px] text-foreground/90 leading-relaxed font-medium bg-muted/50 p-3 rounded-[6px] border border-border">
              {currentUnit.notice}
            </p>
          )}
          {currentUnit.secondaryTags && currentUnit.secondaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentUnit.secondaryTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11.5px] font-bold px-2.5 py-1 rounded-[4px] bg-muted text-muted-foreground border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}