import { HistorySnapshot } from "../../../../hooks/useUnitHistory";
import { GRID_STATUS_CFG } from "../../../../data";
import {
  ChangedField,
  formatSnapValue,
  formatLiquidityLabel,
  getSnapNumericValue,
} from "./formatters";

export function SnapshotDiffList({
  curr,
  prev,
  changed,
  compact = false,
}: {
  curr: HistorySnapshot;
  prev: HistorySnapshot;
  changed: ChangedField[];
  compact?: boolean;
}) {
  const currNum = getSnapNumericValue(curr);
  const prevNum = getSnapNumericValue(prev);
  const valDelta =
    currNum !== null && prevNum !== null && prevNum > 0 ? currNum - prevNum : null;
  const valPct =
    valDelta !== null && prevNum !== null && prevNum > 0
      ? (valDelta / prevNum) * 100
      : null;

  const rarityDiff = (curr.rarity ?? 0) - (prev.rarity ?? 0);

  const currCfg = GRID_STATUS_CFG[curr.status as keyof typeof GRID_STATUS_CFG];
  const prevCfg = GRID_STATUS_CFG[prev.status as keyof typeof GRID_STATUS_CFG];

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-2"
          : "grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5"
      }
    >
      {changed.includes("Value") && (
        <div className="flex items-baseline justify-between sm:justify-start gap-3 text-[13px]">
          <span className="w-[64px] shrink-0 text-[12px] text-muted-foreground">
            Value
          </span>
          <div className="flex items-baseline gap-1.5 font-mono flex-wrap">
            <span className="text-muted-foreground">{formatSnapValue(prev)}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-bold text-foreground">{formatSnapValue(curr)}</span>
            {valPct !== null && (
              <span
                className={`text-[11.5px] font-semibold ${
                  valPct >= 0 ? "text-[#23a559]" : "text-destructive"
                }`}
              >
                ({valPct >= 0 ? "+" : "-"}
                {Math.abs(valPct).toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      )}

      {changed.includes("Status") && (
        <div className="flex items-center justify-between sm:justify-start gap-3 text-[13px]">
          <span className="w-[64px] shrink-0 text-[12px] text-muted-foreground">
            Status
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[11px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] border shadow-xs inline-flex items-center"
              style={{
                backgroundColor: prevCfg?.bg || "#ffe599",
                color: prevCfg?.color || "#18181b",
                borderColor: prevCfg?.border || "rgba(0, 0, 0, 0.15)",
              }}
            >
              <span className="leading-none">
                {prevCfg?.label || prev.status || "Stable"}
              </span>
            </span>
            <span className="text-muted-foreground font-mono">→</span>
            <span
              className="text-[11px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] border shadow-xs inline-flex items-center"
              style={{
                backgroundColor: currCfg?.bg || "#ffe599",
                color: currCfg?.color || "#18181b",
                borderColor: currCfg?.border || "rgba(0, 0, 0, 0.15)",
              }}
            >
              <span className="leading-none">
                {currCfg?.label || curr.status || "Stable"}
              </span>
            </span>
          </div>
        </div>
      )}

      {changed.includes("Rarity") && (
        <div className="flex items-baseline justify-between sm:justify-start gap-3 text-[13px]">
          <span className="w-[64px] shrink-0 text-[12px] text-muted-foreground">
            Rarity
          </span>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-muted-foreground">{prev.rarity ?? 0}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-bold text-[#4DB6AC]">{curr.rarity ?? 0}</span>
            {rarityDiff !== 0 && (
              <span className="text-[11.5px] text-muted-foreground">
                ({rarityDiff > 0 ? "+" : "-"}
                {Math.abs(rarityDiff)})
              </span>
            )}
          </div>
        </div>
      )}

      {changed.includes("Liquidity") && (
        <div className="flex items-baseline justify-between sm:justify-start gap-3 text-[13px]">
          <span className="w-[64px] shrink-0 text-[12px] text-muted-foreground">
            Liquidity
          </span>
          <div className="flex items-baseline gap-1.5 font-mono">
            <span className="text-muted-foreground">
              {formatLiquidityLabel(prev.liquidity)}
            </span>
            <span className="text-muted-foreground">→</span>
            <span className="font-bold text-[#81C784]">
              {formatLiquidityLabel(curr.liquidity)}
            </span>
          </div>
        </div>
      )}

      {changed.includes("Notice") && (
        <div
          className={`flex flex-col gap-1 text-[12.5px] ${
            compact ? "" : "sm:col-span-2"
          }`}
        >
          <span className="text-[12px] text-muted-foreground font-medium">
            Notice
          </span>
          <div className="bg-muted/50 p-2.5 rounded-[4px] border border-border">
            <span className="text-foreground/90 italic leading-snug">
              {curr.notice ? `"${curr.notice}"` : "Notice cleared"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}