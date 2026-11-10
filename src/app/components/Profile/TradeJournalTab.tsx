// ================================================
// FILE: src/app/components/Profile/TradeJournalTab.tsx
// ================================================

import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  GiScrollUnfurled,
  GiTrophy,
  GiCheckMark,
  GiCrossMark,
  GiFallDown,
  GiScales,
  GiInfo,
  GiCrossedSwords,
  GiTrashCan,
} from "react-icons/gi";
import {
  useTradeStore,
  TradeJournalEntry,
} from "../../../store/useTradeStore";
import { useUnits } from "../../../context/UnitContext";
import { UnitAvatar } from "../shared/UnitAvatar";
import { triggerHaptic } from "../../../data/helpers";
import { TradeCard } from "../../../types";
import { GRID_STATUS_CFG } from "../../../data";

type Unit = ReturnType<typeof useUnits>["units"][number];
type UnitLookup = Map<string, Unit>;

const IconClose = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

type ResolvedOutcome = Exclude<TradeJournalEntry["outcome"], "pending">;
type OutcomeFilter = "all" | "pending" | ResolvedOutcome;
type SortMode = "newest" | "oldest" | "best" | "worst";

const OUTCOME_CONFIG: Record<
  ResolvedOutcome,
  { label: string; icon: React.ReactNode; activeClassName: string }
> = {
  win: {
    label: "Win",
    icon: <GiTrophy className="w-3.5 h-3.5" />,
    activeClassName: "bg-success text-success-foreground border-success",
  },
  fair: {
    label: "Fair",
    icon: <GiCheckMark className="w-3.5 h-3.5" />,
    activeClassName: "bg-warning text-warning-foreground border-warning",
  },
  loss: {
    label: "Loss",
    icon: <GiCrossMark className="w-3.5 h-3.5" />,
    activeClassName:
      "bg-destructive text-destructive-foreground border-destructive",
  },
};

const OUTCOME_ORDER: ResolvedOutcome[] = ["win", "fair", "loss"];

const STRATEGY_TAGS = [
  "Upgrade",
  "Downgrade",
  "Quick Flip",
  "Long Hold",
  "Loss Cut",
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "best", label: "Best net value" },
  { value: "worst", label: "Worst net value" },
];

const TONE = {
  give: {
    title: "You gave",
    accentBar: "bg-[#FAA61A]",
    text: "text-[#FAA61A]",
    chip: "border-[#FAA61A] bg-card",
    iconWrap: "text-[#FAA61A]",
  },
  get: {
    title: "You got",
    accentBar: "bg-primary",
    text: "text-primary",
    chip: "border-primary bg-card",
    iconWrap: "text-primary",
  },
} as const;

type Tone = keyof typeof TONE;

function formatDelta(n: number) {
  return `${n > 0 ? "+" : ""}${n.toLocaleString()}`;
}

function deltaTextClass(n: number) {
  if (n > 0) return "text-success";
  if (n < 0) return "text-destructive";
  return "text-foreground";
}

function PendingBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-border bg-muted text-muted-foreground text-[11px] font-bold select-none">
      <GiScales className="w-3 h-3" aria-hidden="true" />
      <span>Needs rating</span>
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: ResolvedOutcome }) {
  const cfg = OUTCOME_CONFIG[outcome];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border text-[11px] font-bold select-none ${cfg.activeClassName}`}
    >
      {cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
}

function SummaryCard({
  label,
  hint,
  children,
}: {
  label: string;
  hint: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[8px] bg-card border border-border px-3.5 py-3 flex flex-col gap-1.5 min-w-0">
      <span className="text-[12px] font-semibold text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <span className="text-[24px] font-black font-mono tabular-nums text-foreground leading-none">
        {children}
      </span>
      <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
        {hint}
      </span>
    </div>
  );
}

/* Shared list of cards used inside the detail modal */
function TradeSide({
  tone,
  total,
  cards,
  emptyText,
  unitLookup,
}: {
  tone: Tone;
  total: number;
  cards: TradeCard[];
  emptyText: string;
  unitLookup: UnitLookup;
}) {
  const t = TONE[tone];
  return (
    <section className="flex flex-col rounded-[8px] border border-border bg-card overflow-hidden">
      <div className={`h-1 w-full ${t.accentBar}`} aria-hidden="true" />
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className={`text-[13px] font-bold ${t.text}`}>{t.title}</h3>
        <span
          className={`text-[13px] font-mono font-bold tabular-nums ${t.text}`}
        >
          {total.toLocaleString()}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3">
        {cards.length === 0 ? (
          <span className="text-[13px] text-muted-foreground italic text-center py-6">
            {emptyText}
          </span>
        ) : (
          cards.map((card, i) => {
            const master = unitLookup.get(card.id);
            const unitVal =
              master?.value === "owner"
                ? "O/C"
                : (typeof master?.value === "number"
                    ? master.value
                    : card.value
                  ).toLocaleString();
            const statusCfg = master?.status
              ? GRID_STATUS_CFG[master.status as keyof typeof GRID_STATUS_CFG]
              : null;

            return (
              <div
                key={`${card.id}-${i}`}
                className="flex items-center gap-3 bg-muted border border-border p-2 rounded-[6px]"
              >
                <div className="w-12 h-12 rounded-[4px] bg-card overflow-hidden shrink-0 relative border border-border">
                  <UnitAvatar
                    unitId={card.id}
                    unitName={card.name}
                    imageUrl={master?.imageUrl}
                    fallbackClassName="absolute inset-0 flex items-center justify-center text-white text-[12px] z-0"
                    imageClassName="absolute inset-0 w-full h-full object-cover z-10"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[14px] font-bold text-foreground truncate">
                    {card.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px] font-mono text-muted-foreground">
                      {card.qty}x at {unitVal}
                    </span>
                    {statusCfg && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-card text-muted-foreground border border-border">
                        {statusCfg.label}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[13px] font-mono font-bold tabular-nums text-foreground shrink-0">
                  {(card.value * card.qty).toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/* Compact chips used on the list cards */
function ChipList({
  tone,
  cards,
  emptyText,
  unitLookup,
}: {
  tone: Tone;
  cards: TradeCard[];
  emptyText: string;
  unitLookup: UnitLookup;
}) {
  const t = TONE[tone];
  return (
    <div className="flex flex-col gap-2 px-3.5 py-3 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className={`shrink-0 ${t.iconWrap}`}>
          <GiFallDown
            className={`w-3.5 h-3.5 ${tone === "give" ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </span>
        <span className="text-[12px] font-semibold text-muted-foreground">
          {t.title}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {cards.length === 0 ? (
          <span className="text-[12px] text-muted-foreground italic">
            {emptyText}
          </span>
        ) : (
          cards.map((card, i) => (
            <div
              key={`${card.id}-${i}`}
              className={`flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-[6px] border min-w-0 max-w-full ${t.chip}`}
            >
              <div className="w-7 h-7 rounded-[4px] bg-muted overflow-hidden shrink-0 relative">
                <UnitAvatar
                  unitId={card.id}
                  unitName={card.name}
                  imageUrl={unitLookup.get(card.id)?.imageUrl}
                  fallbackClassName="absolute inset-0 flex items-center justify-center text-white text-[9px] z-0"
                  imageClassName="absolute inset-0 w-full h-full object-cover z-10"
                />
              </div>
              <span className="text-[12px] font-bold text-foreground shrink-0 font-mono">
                {card.qty}x
              </span>
              <span className="text-[12px] text-foreground truncate font-medium">
                {card.name}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TradeDetailModal({
  entry,
  isOpen,
  unitLookup,
  onClose,
  onSetOutcome,
  onDelete,
  onSaveDetails,
}: {
  entry: TradeJournalEntry | null;
  isOpen: boolean;
  unitLookup: UnitLookup;
  onClose: () => void;
  onSetOutcome: (id: string, outcome: ResolvedOutcome) => void;
  onDelete: (id: string) => void;
  onSaveDetails: (id: string, notes: string, strategy: string) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [localNotes, setLocalNotes] = useState("");
  const [localStrategy, setLocalStrategy] = useState("");

  const entryId = entry?.id ?? null;

  // Save whatever is typed, then close. Used by every way of closing.
  const handleClose = () => {
    if (entry) onSaveDetails(entry.id, localNotes, localStrategy);
    onClose();
  };

  // Keep the latest handler in a ref so the key listener never goes stale
  // and the effects below do not re-run on every render.
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  // Load notes and strategy only when a different trade is opened.
  // Changing the outcome no longer wipes what the person is typing.
  useEffect(() => {
    if (!isOpen || !entry) return;
    setLocalNotes(entry.notes || "");
    setLocalStrategy(entry.strategy || "");
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entryId]);

  // Focus handling, scroll lock, Escape and Tab trapping. Runs once per open.
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const timer = setTimeout(() => {
      dialogRef.current?.focus();
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseRef.current();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [tabindex]:not([tabindex="-1"]), textarea, input'
          )
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        const outside = !dialogRef.current.contains(active);

        if (e.shiftKey) {
          if (active === first || active === dialogRef.current || outside) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last || outside) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen || !entry) return null;

  const dateObj = new Date(entry.timestamp);
  const fullDate = dateObj.toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const fullTime = dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const giveTotal = entry.give.reduce((acc, c) => acc + c.value * c.qty, 0);
  const getTotal = entry.get.reduce((acc, c) => acc + c.value * c.qty, 0);

  const totalValue = giveTotal + getTotal;
  const givePercent = totalValue > 0 ? (giveTotal / totalValue) * 100 : 50;
  const getPercent = totalValue > 0 ? (getTotal / totalValue) * 100 : 50;

  const toggleStrategy = (tag: string) => {
    setLocalStrategy((prev) => (prev === tag ? "" : tag));
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trade-detail-title"
      className="fixed inset-0 z-[1000000] flex items-end sm:items-center justify-center sm:p-4 font-sans"
    >
      <div
        className="absolute inset-0 bg-black/70"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="bg-card border border-border rounded-t-[12px] sm:rounded-[10px] w-full max-w-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col relative shadow-2xl overflow-hidden focus:outline-none"
      >
        <div className="px-5 py-4 border-b border-border bg-popover flex items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col min-w-0">
            <h2
              id="trade-detail-title"
              className="text-[16px] font-bold text-foreground flex items-center gap-2"
            >
              <GiCrossedSwords className="w-4 h-4 text-primary" />
              Trade details
            </h2>
            <span className="text-[12px] font-mono text-muted-foreground">
              {fullDate} at {fullTime}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 -m-2 text-muted-foreground hover:text-foreground rounded-[4px] hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Save and close details"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          {/* Net value, balance bar, and rating */}
          <div className="flex flex-col items-center gap-4 bg-muted p-4 rounded-[8px] border border-border text-center">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[12px] font-semibold text-muted-foreground">
                Net value
              </span>
              <span
                className={`text-[36px] font-black font-mono tabular-nums leading-none ${deltaTextClass(
                  entry.valueDiff
                )}`}
              >
                {formatDelta(entry.valueDiff)}
              </span>
            </div>

            <div className="w-full max-w-md flex flex-col gap-1.5">
              <div
                className="w-full h-3 rounded-full overflow-hidden flex bg-border"
                role="img"
                aria-label={`You gave ${giveTotal.toLocaleString()} and got ${getTotal.toLocaleString()}`}
              >
                <div
                  className="bg-[#FAA61A] h-full"
                  style={{ width: `${givePercent}%` }}
                />
                <div
                  className="bg-primary h-full"
                  style={{ width: `${getPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[12px] font-bold tabular-nums">
                <span className="text-[#FAA61A]">
                  Gave {giveTotal.toLocaleString()}
                </span>
                <span className="text-primary">
                  Got {getTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-[12px] font-semibold text-muted-foreground">
                {entry.outcome === "pending"
                  ? "How did this trade turn out?"
                  : "Your rating"}
              </span>
              <div
                className="inline-flex items-center rounded-[6px] border border-border bg-popover overflow-hidden shadow-sm"
                role="group"
                aria-label="Update trade outcome"
              >
                {OUTCOME_ORDER.map((outcome, index) => {
                  const cfg = OUTCOME_CONFIG[outcome];
                  const isSelected = entry.outcome === outcome;
                  return (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => onSetOutcome(entry.id, outcome)}
                      aria-pressed={isSelected}
                      className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                        index > 0 ? "border-l border-border" : ""
                      } ${
                        isSelected
                          ? cfg.activeClassName
                          : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {cfg.icon}
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TradeSide
              tone="give"
              total={giveTotal}
              cards={entry.give}
              emptyText="You gave nothing in this trade."
              unitLookup={unitLookup}
            />
            <TradeSide
              tone="get"
              total={getTotal}
              cards={entry.get}
              emptyText="You received nothing in this trade."
              unitLookup={unitLookup}
            />
          </div>

          {/* Strategy and notes */}
          <div className="flex flex-col gap-5 p-4 rounded-[8px] border border-border bg-card">
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-foreground">
                Strategy
              </span>
              <div className="flex flex-wrap gap-2">
                {STRATEGY_TAGS.map((tag) => {
                  const isActive = localStrategy === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleStrategy(tag)}
                      aria-pressed={isActive}
                      className={`px-3 py-1.5 rounded-[6px] text-[12px] font-bold transition-colors cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="trade-notes"
                className="text-[13px] font-bold text-foreground"
              >
                Notes
              </label>
              <textarea
                id="trade-notes"
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                placeholder="Why did you make this trade? For example: needed it for a set, felt rushed, or saw the value rising."
                className="w-full bg-input border border-border rounded-[6px] p-3 text-[13px] text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary resize-none h-28"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border bg-popover flex items-center justify-between gap-3 shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-destructive font-bold">
                Delete this entry for good?
              </span>
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="px-3 py-1.5 rounded-[6px] bg-destructive text-destructive-foreground text-[12px] font-bold shadow-sm transition-colors cursor-pointer hover:bg-destructive/90"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-[6px] bg-muted hover:bg-border text-foreground text-[12px] font-bold border border-border transition-colors cursor-pointer"
              >
                Keep it
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-destructive hover:bg-muted text-[12px] font-bold transition-colors cursor-pointer"
            >
              <GiTrashCan className="w-4 h-4" />
              Delete
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 rounded-[6px] bg-primary hover:bg-primary/90 text-primary-foreground text-[13px] font-bold shadow-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Save and close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function TradeJournalTab() {
  const journal = useTradeStore((s) => s.tradeJournal);
  const updateJournalOutcome = useTradeStore((s) => s.updateJournalOutcome);
  const deleteJournalEntry = useTradeStore((s) => s.deleteJournalEntry);
  const updateJournalEntry = useTradeStore((s) => s.updateJournalEntry);
  const { units: ALL_UNITS } = useUnits();

  // Store the id, not a copy of the entry, so the modal always shows live data.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OutcomeFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");

  const unitLookup = useMemo<UnitLookup>(
    () => new Map(ALL_UNITS.map((u) => [u.id, u])),
    [ALL_UNITS]
  );

  const selectedEntry = useMemo(
    () => journal.find((t) => t.id === selectedId) ?? null,
    [journal, selectedId]
  );

  const stats = useMemo(() => {
    const totalLogged = journal.length;
    const decided = journal.filter((t) => t.outcome !== "pending");
    const wins = decided.filter((t) => t.outcome === "win").length;
    const losses = decided.filter((t) => t.outcome === "loss").length;
    const fairs = decided.filter((t) => t.outcome === "fair").length;
    const pending = totalLogged - decided.length;
    const winRate =
      decided.length > 0 ? Math.round((wins / decided.length) * 100) : null;
    const avgDelta =
      decided.length > 0
        ? Math.round(
            decided.reduce((sum, entry) => sum + entry.valueDiff, 0) /
              decided.length
          )
        : null;

    return {
      totalLogged,
      decidedCount: decided.length,
      pending,
      wins,
      losses,
      fairs,
      winRate,
      avgDelta,
    };
  }, [journal]);

  const visibleEntries = useMemo(() => {
    const filtered =
      filter === "all" ? journal : journal.filter((t) => t.outcome === filter);
    const time = (t: TradeJournalEntry) => new Date(t.timestamp).getTime();
    const sorted = [...filtered];
    switch (sort) {
      case "oldest":
        sorted.sort((a, b) => time(a) - time(b));
        break;
      case "best":
        sorted.sort((a, b) => b.valueDiff - a.valueDiff);
        break;
      case "worst":
        sorted.sort((a, b) => a.valueDiff - b.valueDiff);
        break;
      default:
        sorted.sort((a, b) => time(b) - time(a));
    }
    return sorted;
  }, [journal, filter, sort]);

  const handleSetOutcome = (id: string, outcome: ResolvedOutcome) => {
    triggerHaptic("medium");
    updateJournalOutcome(id, outcome);
  };

  const handleDelete = (id: string) => {
    triggerHaptic("heavy");
    deleteJournalEntry(id);
    setSelectedId(null);
  };

  const handleSaveDetails = (id: string, notes: string, strategy: string) => {
    updateJournalEntry(id, { notes, strategy });
  };

  if (stats.totalLogged === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-3 rounded-[8px] border border-dashed border-border bg-card py-14 px-6">
        <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
          <GiScrollUnfurled className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="max-w-sm space-y-1">
          <h3 className="text-[15px] font-extrabold text-foreground">
            No trades logged yet
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            Build a trade in the Analyzer and press "Log this trade". Once you
            know how it played out, rate it here to build your win rate.
          </p>
          <button
            type="button"
            onClick={() => {
              window.document.dispatchEvent(
                new CustomEvent("navigate", { detail: "value-list" })
              );
              window.dispatchEvent(new Event("open-analyzer"));
            }}
            className="px-4 py-2 rounded-[6px] bg-primary text-primary-foreground text-[13px] font-bold shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Open the Analyzer
          </button>
        </div>
      </div>
    );
  }

  const filterChips: { value: OutcomeFilter; label: string; count: number }[] =
    [
      { value: "all", label: "All", count: stats.totalLogged },
      { value: "pending", label: "Needs rating", count: stats.pending },
      { value: "win", label: "Wins", count: stats.wins },
      { value: "fair", label: "Fair", count: stats.fairs },
      { value: "loss", label: "Losses", count: stats.losses },
    ];

  const wflTotal = stats.decidedCount || 1;

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Summary */}
        <div
          role="group"
          aria-label="Trade journal summary"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <SummaryCard
            label="Trades logged"
            hint={
              stats.pending > 0
                ? `${stats.pending} waiting for a rating`
                : "All rated"
            }
          >
            {stats.totalLogged}
          </SummaryCard>

          <SummaryCard label="Win rate" hint="of rated trades">
            {stats.winRate === null ? (
              <span className="text-muted-foreground">-</span>
            ) : (
              <span className="text-success">{stats.winRate}%</span>
            )}
          </SummaryCard>

          <SummaryCard
            label="Wins / Fair / Losses"
            hint={
              <span
                className="flex h-1.5 w-full rounded-full overflow-hidden bg-border mt-1"
                role="img"
                aria-label={`${stats.wins} wins, ${stats.fairs} fair, ${stats.losses} losses`}
              >
                <span
                  className="bg-success h-full"
                  style={{ width: `${(stats.wins / wflTotal) * 100}%` }}
                />
                <span
                  className="bg-warning h-full"
                  style={{ width: `${(stats.fairs / wflTotal) * 100}%` }}
                />
                <span
                  className="bg-destructive h-full"
                  style={{ width: `${(stats.losses / wflTotal) * 100}%` }}
                />
              </span>
            }
          >
            <span className="tabular-nums">
              <span className="text-success">{stats.wins}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-warning">{stats.fairs}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-destructive">{stats.losses}</span>
            </span>
          </SummaryCard>

          <SummaryCard label="Average net value" hint="per rated trade">
            {stats.avgDelta === null ? (
              <span className="text-muted-foreground">-</span>
            ) : (
              <span className={deltaTextClass(stats.avgDelta)}>
                {formatDelta(stats.avgDelta)}
              </span>
            )}
          </SummaryCard>
        </div>

        {/* Filters and sorting */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div
            role="group"
            aria-label="Filter trades by outcome"
            className="flex flex-wrap gap-2"
          >
            {filterChips.map((chip) => {
              const isActive = filter === chip.value;
              const isEmpty = chip.count === 0 && chip.value !== "all";
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setFilter(chip.value)}
                  aria-pressed={isActive}
                  disabled={isEmpty && !isActive}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] border text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary cursor-pointer"
                      : isEmpty
                      ? "bg-card text-muted-foreground border-border opacity-50 cursor-not-allowed"
                      : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground cursor-pointer"
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`font-mono tabular-nums ${
                      isActive ? "" : "text-foreground"
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="journal-sort"
              className="text-[12px] font-semibold text-muted-foreground"
            >
              Sort by
            </label>
            <select
              id="journal-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="bg-input border border-border rounded-[6px] px-2.5 py-1.5 text-[12px] font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Trade list */}
        {visibleEntries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center rounded-[8px] border border-dashed border-border bg-card py-10 px-6">
            <p className="text-[13px] text-muted-foreground">
              No trades match this filter.
            </p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="px-3 py-1.5 rounded-[6px] bg-muted border border-border text-foreground text-[12px] font-bold hover:border-muted-foreground transition-colors cursor-pointer"
            >
              Show all trades
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleEntries.map((entry) => {
              const dateObj = new Date(entry.timestamp);
              const dateLabel = dateObj.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const timeLabel = dateObj.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isPending = entry.outcome === "pending";

              return (
                <article
                  key={entry.id}
                  className="rounded-[8px] border border-border bg-card overflow-hidden transition-colors hover:border-muted-foreground"
                >
                  <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3.5 py-2.5 border-b border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      {isPending ? (
                        <PendingBadge />
                      ) : (
                        <OutcomeBadge outcome={entry.outcome as ResolvedOutcome} />
                      )}
                      <span className="text-[12px] font-mono text-muted-foreground tabular-nums whitespace-nowrap">
                        {dateLabel}, {timeLabel}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5 shrink-0">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Net
                      </span>
                      <span
                        className={`text-[16px] font-mono font-black tabular-nums ${deltaTextClass(
                          entry.valueDiff
                        )}`}
                      >
                        {formatDelta(entry.valueDiff)}
                      </span>
                    </div>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 items-stretch divide-y md:divide-y-0 md:divide-x divide-border">
                    <ChipList
                      tone="give"
                      cards={entry.give}
                      emptyText="Nothing given"
                      unitLookup={unitLookup}
                    />
                    <ChipList
                      tone="get"
                      cards={entry.get}
                      emptyText="Nothing received"
                      unitLookup={unitLookup}
                    />
                  </div>

                  <footer className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-t border-border bg-muted">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setSelectedId(entry.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-bold text-foreground bg-card hover:border-muted-foreground border border-border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <GiInfo className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>

                      {entry.strategy && (
                        <span className="px-2 py-1 rounded-[4px] bg-card border border-border text-[11px] font-bold text-muted-foreground">
                          {entry.strategy}
                        </span>
                      )}
                      {entry.notes && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                          <GiScrollUnfurled
                            className="w-3.5 h-3.5"
                            aria-hidden="true"
                          />
                          Has notes
                        </span>
                      )}
                    </div>

                    {isPending && (
                      <div
                        className="flex items-center gap-2"
                        role="group"
                        aria-label="Rate this trade"
                      >
                        <span className="text-[12px] font-semibold text-muted-foreground">
                          Rate it
                        </span>
                        <div className="inline-flex rounded-[6px] border border-border overflow-hidden bg-card">
                          {OUTCOME_ORDER.map((outcome, index) => {
                            const cfg = OUTCOME_CONFIG[outcome];
                            return (
                              <button
                                key={outcome}
                                type="button"
                                onClick={() =>
                                  handleSetOutcome(entry.id, outcome)
                                }
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                                  index > 0 ? "border-l border-border" : ""
                                }`}
                              >
                                {cfg.icon}
                                <span>{cfg.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <TradeDetailModal
        entry={selectedEntry}
        isOpen={!!selectedEntry}
        unitLookup={unitLookup}
        onClose={() => setSelectedId(null)}
        onSetOutcome={handleSetOutcome}
        onDelete={handleDelete}
        onSaveDetails={handleSaveDetails}
      />
    </>
  );
}