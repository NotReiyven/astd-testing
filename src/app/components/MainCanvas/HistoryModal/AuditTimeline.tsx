import { triggerHaptic } from "../../../../data/helpers";
import { SnapshotDiffList } from "./SnapshotDiffList";
import {
  ChangedField,
  TimelineEvent,
  formatLiquidityLabel,
  formatSnapValue,
} from "./formatters";

type TimelineFilter = "All" | ChangedField;

interface AuditTimelineProps {
  filteredTimeline: TimelineEvent[];
  groupedTimeline: [string, TimelineEvent[]][];
  timelineFilter: TimelineFilter;
  setTimelineFilter: (f: TimelineFilter) => void;
  fieldFilterCounts: Record<TimelineFilter, number>;
  totalTimelineCount: number;
  rangeFilter: string;

  selectedSnapId: string | null;
  handleSelectSnapshot: (id: string, scrollIntoTimeline?: boolean) => void;
  expandedEventIds: Record<string, boolean>;
  setExpandedEventIds: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;

  timelineRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  unitName: string;
}

export function AuditTimeline({
  filteredTimeline,
  groupedTimeline,
  timelineFilter,
  setTimelineFilter,
  fieldFilterCounts,
  totalTimelineCount,
  rangeFilter,
  selectedSnapId,
  handleSelectSnapshot,
  expandedEventIds,
  setExpandedEventIds,
  timelineRefs,
  unitName,
}: AuditTimelineProps) {
  return (
    <section
      aria-label="Audit timeline"
      className="flex flex-col gap-5 w-full pt-8 border-t border-border"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h3 className="text-foreground text-[18px] font-bold">
            Audit Timeline
          </h3>
          <span className="text-[13px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-[4px] font-bold border border-border">
            {filteredTimeline.length}{" "}
            {filteredTimeline.length === 1 ? "recorded change" : "recorded changes"}
          </span>
        </div>

        {totalTimelineCount > 0 && (
          <div
            className="flex items-center gap-2 flex-wrap"
            role="group"
            aria-label="Filter timeline by changed field"
          >
            {(
              ["All", "Value", "Status", "Rarity", "Liquidity", "Notice"] as const
            ).map((f) => {
              const count = fieldFilterCounts[f];
              if (f !== "All" && count === 0) return null;
              const active = timelineFilter === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setTimelineFilter(f);
                  }}
                  className={`px-3 py-1.5 rounded-[6px] text-[12px] font-bold transition-colors cursor-pointer flex items-center gap-2 border active:scale-95 ${
                    active
                      ? "bg-foreground text-background border-foreground shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span>{f}</span>
                  <span
                    className={`font-mono text-[10.5px] px-1.5 py-0.2 rounded-full font-bold ${
                      active
                        ? "bg-background/20 text-background"
                        : "bg-muted text-muted-foreground border border-border"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filteredTimeline.length === 0 ? (
        <div className="py-12 px-6 text-center flex flex-col items-center justify-center gap-3 border border-border rounded-[8px] bg-card shadow-sm">
          <span className="text-[16px] font-bold text-foreground">
            {totalTimelineCount === 0
              ? "No Recorded Shifts Yet"
              : `No ${timelineFilter} Changes in ${rangeFilter} Range`}
          </span>
          <p className="text-[13.5px] text-muted-foreground max-w-md leading-relaxed font-medium">
            {totalTimelineCount === 0
              ? `All snapshots for ${unitName} in this time window match its baseline values.`
              : `No events modified ${timelineFilter.toLowerCase()} during this period.`}
          </p>
          {timelineFilter !== "All" && (
            <button
              type="button"
              onClick={() => setTimelineFilter("All")}
              className="mt-2 px-4 py-2 rounded-[6px] bg-muted hover:bg-popover border border-border text-foreground text-[13px] font-bold transition-colors cursor-pointer active:scale-95"
            >
              Return to All ({totalTimelineCount})
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-8 relative pl-4 sm:pl-6">
          <div className="absolute left-[27px] sm:left-[39px] top-2 bottom-2 w-[2px] bg-border/80" />

          {groupedTimeline.map(([dateKey, events]) => (
            <div key={dateKey} className="flex flex-col gap-4 relative">
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-card border-2 border-border flex items-center justify-center shadow-sm shrink-0 -ml-3 sm:-ml-4">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                </div>
                <span className="text-[13px] font-bold font-mono text-muted-foreground uppercase tracking-widest bg-background px-2 py-0.5 rounded-[4px] border border-border/50">
                  {dateKey}
                </span>
              </div>

              <div className="flex flex-col gap-4 ml-4 sm:ml-6">
                {events.map((t) => {
                  const isSelected = selectedSnapId === t.id;
                  const isExpanded = !!expandedEventIds[t.id];

                  return (
                    <div
                      key={t.id}
                      ref={(el) => {
                        timelineRefs.current[t.id] = el;
                      }}
                      className={`transition-all duration-200 relative rounded-[8px] border bg-card overflow-hidden group ${
                        isSelected
                          ? "border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]"
                          : "border-border hover:border-border/80 shadow-sm"
                      }`}
                    >
                      <div className="absolute left-[-22px] sm:left-[-38px] top-5 w-[14px] sm:w-[22px] h-[2px] bg-border/80" />

                      <div
                        onClick={() => handleSelectSnapshot(t.id, false)}
                        className={`px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row gap-4 sm:items-center cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/[0.04]" : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex sm:flex-col items-baseline sm:items-start justify-between gap-1 w-full sm:w-[150px] shrink-0 border-b sm:border-b-0 sm:border-r border-border/50 pb-2 sm:pb-0 sm:pr-4">
                          <span className="text-[13px] font-bold font-mono text-foreground">
                            {t.dateFormatted.split(",")[1]?.trim() || t.dateFormatted}
                          </span>
                          <span className="text-[11.5px] font-bold font-mono text-muted-foreground">
                            {t.relativeTime}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <SnapshotDiffList
                            curr={t.snap}
                            prev={t.prev}
                            changed={t.changed}
                          />
                        </div>

                        <div className="shrink-0 flex items-center justify-end mt-2 sm:mt-0">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic("light");
                              setExpandedEventIds((prev) => ({
                                ...prev,
                                [t.id]: !prev[t.id],
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-[5px] text-[11.5px] font-bold border transition-colors cursor-pointer active:scale-95 ${
                              isExpanded
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                          >
                            {isExpanded ? "Hide Details" : "View Details"}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="bg-background border-t border-border px-4 py-4 sm:px-5 sm:py-5 flex flex-col gap-4 cursor-default"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/50">
                            <span className="text-[12.5px] font-bold text-foreground uppercase tracking-wider">
                              Complete Snapshot Record
                            </span>
                            <span className="text-[11.5px] font-mono text-muted-foreground">
                              ID: {t.snap.id.slice(0, 8)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex flex-col gap-1 bg-card p-3 rounded-[6px] border border-border">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Recorded Value
                              </span>
                              <span className="text-[15px] font-bold font-mono text-foreground">
                                {formatSnapValue(t.snap)}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1 bg-card p-3 rounded-[6px] border border-border">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Market Status
                              </span>
                              <span className="text-[14px] font-bold text-foreground capitalize">
                                {t.snap.status || "stable"}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1 bg-card p-3 rounded-[6px] border border-border">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Rarity Rating
                              </span>
                              <span className="text-[15px] font-bold font-mono text-[#4DB6AC]">
                                {t.snap.rarity ?? 0} / 20
                              </span>
                            </div>

                            <div className="flex flex-col gap-1 bg-card p-3 rounded-[6px] border border-border">
                              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Market Liquidity
                              </span>
                              <span className="text-[15px] font-bold font-mono text-[#81C784]">
                                {formatLiquidityLabel(t.snap.liquidity)}
                              </span>
                            </div>
                          </div>

                          {(t.prev.notice || t.snap.notice) && (
                            <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12.5px]">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-muted-foreground">
                                  Previous Notice
                                </span>
                                <span className="text-foreground/80 italic leading-relaxed bg-muted/30 p-2 rounded-[4px]">
                                  {t.prev.notice ? `"${t.prev.notice}"` : "None"}
                                </span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-muted-foreground">
                                  Recorded Notice
                                </span>
                                <span className="text-foreground italic leading-relaxed bg-primary/5 p-2 rounded-[4px] border border-primary/20">
                                  {t.snap.notice ? `"${t.snap.notice}"` : "None"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}