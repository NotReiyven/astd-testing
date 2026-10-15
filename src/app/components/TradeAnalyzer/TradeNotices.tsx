import { useState } from "react";
import { GiScrollUnfurled, GiOpenBook } from "react-icons/gi";
import { TradeCard, MasterUnit } from "../../../types";
import { GRID_STATUS_CFG } from "../../../data";
import { StatusIcon } from "../MainCanvas/UnitGrid";
import {
  useTradeStore,
  DEFAULT_ANALYZER_SETTINGS,
} from "../../../store/useTradeStore";
import { triggerHaptic } from "../../../data/helpers";

const STATUS_DEFS: Record<string, string> = {
  stable:
    "Fair and consistently decent offers. Units that are stable are most likely not to move unless something happens.",
  deflated:
    "If a unit is underpriced, they are deflated and are way cheaper than they should be worth.",
  inflated:
    "If a unit has this tag, they are inflated and cost way more than they should be worth.",
  rising:
    "If a unit is rising, it means the unit is consistently gaining value in trades.",
  dropping:
    "If a unit is dropping, it means owners are consistently taking a loss in value.",
  lowballed:
    "If a unit has this tag, it typically trades at fair value or below.",
  highballed:
    "If a unit has this tag, it typically trades at fair value or above.",
  gatekept:
    "If a unit is gatekept, it means owners are refusing to trade this unit for any reason, waiting for a gain in value.",
  "black-marketed":
    "If a unit has this tag, it means that people who buy units with outside-game currency are heavily impacting it.",
  manipulated:
    "If a unit has this tag, it is currently being influenced or vote manipulated to change its value or situation.",
  varies:
    "If a unit varies, then it can trade fairly but it can also fluctuate significantly.",
};

export function TradeNotices({
  giveItems,
  getItems,
  ALL_UNITS,
}: {
  giveItems: TradeCard[];
  getItems: TradeCard[];
  ALL_UNITS: MasterUnit[];
}) {
  const rawSettings = useTradeStore((s) => s.analyzerSettings);
  const settings = {
    ...DEFAULT_ANALYZER_SETTINGS,
    ...(rawSettings || {}),
  };

  const [isBodyCollapsed, setIsBodyCollapsed] = useState(false);

  if (!settings.showTradeNotices) return null;

  const getDetails = (items: TradeCard[]) => {
    const details: { name: string; status?: string; notice?: string }[] = [];
    const statusCounts: Record<string, number> = {};

    items.forEach((item) => {
      const master = ALL_UNITS.find((u) => u.id === item.id);
      if (master) {
        if (master.status) {
          statusCounts[master.status] =
            (statusCounts[master.status] || 0) + item.qty;
        }
        if (master.status || master.notice) {
          details.push({
            name: master.name,
            status: master.status,
            notice: master.notice,
          });
        }
      }
    });

    const sortedStatuses = Object.entries(statusCounts).sort(
      (a, b) => b[1] - a[1]
    );
    return { details, statusCounts: sortedStatuses };
  };

  const giveData = getDetails(giveItems);
  const getData = getDetails(getItems);

  if (giveData.details.length === 0 && getData.details.length === 0)
    return null;

  const uniqueStatuses = Array.from(
    new Set(
      [
        ...giveData.details.map((d) => d.status),
        ...getData.details.map((d) => d.status),
      ].filter(Boolean)
    )
  ) as string[];

  const hasVisibleMomentum =
    settings.showMomentumSummary &&
    (giveData.statusCounts.length > 0 || getData.statusCounts.length > 0);
  const hasVisibleGive =
    settings.showGiveNotices && giveData.details.length > 0;
  const hasVisibleGet = settings.showGetNotices && getData.details.length > 0;
  const hasVisibleTerms =
    settings.showTermsInTrade && uniqueStatuses.length > 0;

  if (
    !hasVisibleMomentum &&
    !hasVisibleGive &&
    !hasVisibleGet &&
    !hasVisibleTerms
  ) {
    return null;
  }

  const renderMomentum = (counts: [string, number][]) => {
    if (counts.length === 0)
      return (
        <span className="text-muted-foreground text-[12px] font-medium">
          None
        </span>
      );
    return counts.map(([status, count], i) => {
      const cfg = GRID_STATUS_CFG[status as keyof typeof GRID_STATUS_CFG];
      if (!cfg) return null;
      return (
        <span key={status} className="flex items-center gap-1.5">
          <span className="text-[12px] font-bold text-foreground">
            {count}x
          </span>
          <span
            className="text-[10px] font-bold uppercase px-1.5 py-[1px] rounded-[4px] border inline-flex items-center gap-1"
            style={{
              backgroundColor: cfg.bg,
              color: cfg.color,
              borderColor: cfg.border,
            }}
          >
            <StatusIcon status={status} />
            {cfg.label}
          </span>
          {i < counts.length - 1 && (
            <span className="text-muted-foreground ml-1 mr-0.5">•</span>
          )}
        </span>
      );
    });
  };

  const renderSection = (type: "give" | "get", data: typeof giveData) => {
    if (data.details.length === 0) return null;

    const isGive = type === "give";
    const accentColor = isGive ? "#FAA61A" : "var(--primary)";
    const bgAccent = isGive
      ? "rgba(250, 166, 26, 0.03)"
      : "rgba(88, 101, 242, 0.03)";
    const title = isGive ? "You Give" : "You Get";

    return (
      <div
        className="flex flex-col gap-2.5 mt-3 p-3.5 rounded-[8px] border border-border shadow-inner"
        style={{ backgroundColor: bgAccent }}
      >
        <div className="flex items-center gap-2 border-b border-border pb-2.5 mb-1">
          <div
            className="w-1.5 h-1.5 rounded-full shadow-sm"
            style={{ backgroundColor: accentColor }}
          />
          <h4
            className="text-[11px] font-extrabold uppercase tracking-widest"
            style={{ color: accentColor }}
          >
            {title}
          </h4>
        </div>

        <div className="flex flex-col gap-3.5">
          {data.details.map((item, idx) => {
            const cfg = item.status
              ? GRID_STATUS_CFG[item.status as keyof typeof GRID_STATUS_CFG]
              : null;
            return (
              <div key={idx} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-foreground">
                    {item.name}
                  </span>
                  {cfg && (
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-[1px] rounded-[4px] border shadow-sm inline-flex items-center gap-1"
                      style={{
                        backgroundColor: cfg.bg,
                        color: cfg.color,
                        borderColor: cfg.border,
                      }}
                    >
                      <StatusIcon status={item.status} />
                      {cfg.label}
                    </span>
                  )}
                </div>
                {item.notice && (
                  <div className="flex items-start gap-1.5 mt-1.5 opacity-90">
                    <span className="text-muted-foreground text-[12px] font-mono leading-none mt-0.5 select-none">
                      ↳
                    </span>
                    <p className="text-[11.5px] text-muted-foreground leading-snug italic">
                      {item.notice}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-3 md:mx-4 mt-2 mb-6 bg-card border border-border rounded-[8px] flex flex-col shrink-0 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => {
          triggerHaptic("light");
          setIsBodyCollapsed((prev) => !prev);
        }}
        className="flex items-center justify-between w-full bg-popover hover:bg-muted/60 px-4 py-3 border-b border-border transition-colors cursor-pointer focus-visible:outline-none"
      >
        <div className="flex items-center gap-2">
          <GiScrollUnfurled className="w-4 h-4 text-[#FAA61A]" />
          <h3 className="text-[12px] font-extrabold text-foreground uppercase tracking-wider">
            Trade Notices
          </h3>
        </div>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
            isBodyCollapsed ? "" : "rotate-180"
          }`}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6L8 10L12 6" />
        </svg>
      </button>

      {!isBodyCollapsed && (
        <div className="p-4 flex flex-col gap-1">
          {hasVisibleMomentum && (
            <div className="flex flex-col gap-2.5 bg-black/20 p-3 rounded-[6px] border border-border mb-1 shadow-inner">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Status Momentum Summary
                </span>
              </div>

              <div className="flex items-center flex-wrap gap-x-3 gap-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-muted-foreground mr-1">
                    Give:
                  </span>
                  {renderMomentum(giveData.statusCounts)}
                </div>

                <span className="text-muted-foreground font-bold mx-1">➔</span>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-muted-foreground mr-1">
                    Get:
                  </span>
                  {renderMomentum(getData.statusCounts)}
                </div>
              </div>
            </div>
          )}

          {hasVisibleGive && renderSection("give", giveData)}
          {hasVisibleGet && renderSection("get", getData)}

          {hasVisibleTerms && (
            <div className="mt-5 pt-4 border-t border-border flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <GiOpenBook className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  Terms in this trade
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {uniqueStatuses.map((status) => {
                  const cfg =
                    GRID_STATUS_CFG[status as keyof typeof GRID_STATUS_CFG];
                  const def = STATUS_DEFS[status];
                  if (!cfg || !def) return null;

                  return (
                    <div
                      key={status}
                      className="flex items-start gap-2.5 bg-black/20 p-2.5 rounded-[6px] border border-border shadow-inner"
                    >
                      <span
                        className="text-[10px] font-bold uppercase px-1.5 py-[1px] rounded-[4px] border shrink-0 mt-[1px] shadow-sm inline-flex items-center gap-1"
                        style={{
                          backgroundColor: cfg.bg,
                          color: cfg.color,
                          borderColor: cfg.border,
                        }}
                      >
                        <StatusIcon status={status} />
                        {cfg.label}
                      </span>
                      <p className="text-[11.5px] text-foreground leading-relaxed">
                        {def}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
