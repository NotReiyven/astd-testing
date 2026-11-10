// ================================================
// FILE: src/app/components/Profile/TradeJournalTab.tsx
// ================================================

import { GiScrollUnfurled, GiTrophy, GiCheckMark, GiCrossMark } from "react-icons/gi";
import {
  useTradeStore,
  TradeJournalEntry,
} from "../../../store/useTradeStore";
import { triggerHaptic } from "../../../data/helpers";

const OUTCOME_LABEL: Record<
  TradeJournalEntry["outcome"],
  { label: string; color: string; bg: string; border: string }
> = {
  pending: {
    label: "Pending",
    color: "var(--muted-foreground)",
    bg: "var(--muted)",
    border: "var(--border)",
  },
  win: {
    label: "Win",
    color: "#ffffff",
    bg: "#23a559",
    border: "rgba(35, 165, 89, 0.4)",
  },
  fair: {
    label: "Fair",
    color: "#000000",
    bg: "#eab308",
    border: "rgba(234, 179, 8, 0.4)",
  },
  loss: {
    label: "Loss",
    color: "#ffffff",
    bg: "#ef4444",
    border: "rgba(239, 68, 68, 0.4)",
  },
};

export function TradeJournalTab() {
  const journal = useTradeStore((s) => s.tradeJournal);
  const updateJournalOutcome = useTradeStore((s) => s.updateJournalOutcome);

  const totalLogged = journal.length;
  const decided = journal.filter((t) => t.outcome !== "pending");
  const wins = decided.filter((t) => t.outcome === "win").length;
  const losses = decided.filter((t) => t.outcome === "loss").length;
  const fairs = decided.filter((t) => t.outcome === "fair").length;
  const winRate =
    decided.length > 0 ? Math.round((wins / decided.length) * 100) : null;
  const avgDelta =
    decided.length > 0
      ? Math.round(
          decided.reduce((s, t) => s + t.valueDiff, 0) / decided.length
        )
      : null;

  const handleSetOutcome = (
    id: string,
    outcome: TradeJournalEntry["outcome"]
  ) => {
    triggerHaptic("medium");
    updateJournalOutcome(id, outcome);
  };

  if (totalLogged === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 rounded-[8px] border border-dashed border-border bg-card py-12 px-6">
        <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
          <GiScrollUnfurled className="w-6 h-6" />
        </div>
        <div className="max-w-sm space-y-1">
          <h3 className="text-[15px] font-extrabold text-foreground">
            Your trade journal is empty
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Build a trade in the Analyzer and press "Log this trade" to start
            tracking wins, losses, and long-term value deltas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-[8px] bg-card border border-border p-3 flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Logged
          </span>
          <span className="text-[20px] font-black font-mono text-foreground">
            {totalLogged}
          </span>
        </div>
        <div className="rounded-[8px] bg-card border border-border p-3 flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Win Rate
          </span>
          <span className="text-[20px] font-black font-mono text-[#23a559]">
            {winRate === null ? "—" : `${winRate}%`}
          </span>
        </div>
        <div className="rounded-[8px] bg-card border border-border p-3 flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            W / F / L
          </span>
          <span className="text-[16px] font-black font-mono text-foreground">
            <span className="text-[#23a559]">{wins}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-[#eab308]">{fairs}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-destructive">{losses}</span>
          </span>
        </div>
        <div className="rounded-[8px] bg-card border border-border p-3 flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Avg Δ Value
          </span>
          <span
            className={`text-[16px] font-black font-mono ${
              avgDelta === null
                ? "text-muted-foreground"
                : avgDelta >= 0
                ? "text-[#23a559]"
                : "text-destructive"
            }`}
          >
            {avgDelta === null
              ? "—"
              : `${avgDelta >= 0 ? "+" : ""}${avgDelta.toLocaleString()}`}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {journal.map((entry) => {
          const outcomeCfg = OUTCOME_LABEL[entry.outcome];
          const dateObj = new Date(entry.timestamp);
          const when = dateObj.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const timeStr = dateObj.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={entry.id}
              className="rounded-[8px] border border-border bg-card p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px] font-bold text-foreground">
                    Trade #{entry.id.slice(-6)}
                  </span>
                  <span className="text-[11.5px] font-mono text-muted-foreground">
                    {when} · {timeStr}
                  </span>
                </div>
                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border shadow-xs"
                  style={{
                    backgroundColor: outcomeCfg.bg,
                    color: outcomeCfg.color,
                    borderColor: outcomeCfg.border,
                  }}
                >
                  {outcomeCfg.label}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-[6px] border border-[#FAA61A]/25 bg-[#FAA61A]/5 p-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#FAA61A]">
                    You Gave
                  </span>
                  <ul className="mt-1 flex flex-col gap-0.5 text-foreground">
                    {entry.give.length === 0 ? (
                      <li className="text-muted-foreground italic">Nothing</li>
                    ) : (
                      entry.give.map((c) => (
                        <li key={c.id} className="truncate">
                          {c.qty}x {c.name}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="rounded-[6px] border border-primary/25 bg-primary/5 p-2">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-primary">
                    You Got
                  </span>
                  <ul className="mt-1 flex flex-col gap-0.5 text-foreground">
                    {entry.get.length === 0 ? (
                      <li className="text-muted-foreground italic">Nothing</li>
                    ) : (
                      entry.get.map((c) => (
                        <li key={c.id} className="truncate">
                          {c.qty}x {c.name}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <span
                  className={`text-[12.5px] font-mono font-bold ${
                    entry.valueDiff > 0
                      ? "text-[#23a559]"
                      : entry.valueDiff < 0
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  Δ {entry.valueDiff > 0 ? "+" : ""}
                  {entry.valueDiff.toLocaleString()}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetOutcome(entry.id, "win")}
                    className={`px-2 py-1 rounded-[4px] text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                      entry.outcome === "win"
                        ? "bg-[#23a559] text-white border-[#23a559]"
                        : "bg-popover border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <GiTrophy className="w-3 h-3" /> Win
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetOutcome(entry.id, "fair")}
                    className={`px-2 py-1 rounded-[4px] text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                      entry.outcome === "fair"
                        ? "bg-[#eab308] text-black border-[#eab308]"
                        : "bg-popover border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <GiCheckMark className="w-3 h-3" /> Fair
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetOutcome(entry.id, "loss")}
                    className={`px-2 py-1 rounded-[4px] text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                      entry.outcome === "loss"
                        ? "bg-destructive text-white border-destructive"
                        : "bg-popover border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <GiCrossMark className="w-3 h-3" /> Loss
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}