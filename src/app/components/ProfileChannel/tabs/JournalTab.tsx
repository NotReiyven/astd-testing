// ================================================
// FILE: src/app/components/ProfileChannel/tabs/JournalTab.tsx
// ================================================

import { GiPadlock } from "react-icons/gi";
import { TradeJournalTab } from "../../Profile/TradeJournalTab";
import { useTradeStore } from "../../../../store/useTradeStore";
import { ProfileChannelState } from "../hooks/useProfileChannelState";

export function JournalTab({ state }: { state: ProfileChannelState }) {
  const { isOwner, journalPublic } = state;
  const toggleJournalPrivacy = useTradeStore((s) => s.toggleJournalPrivacy);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="text-[18px] font-bold text-foreground">
            Trade journal
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xl">
            Log trades from the Analyzer, then rate each one once you know how
            it played out. Your win rate and average net value build from
            there.
          </p>
        </div>

        {isOwner && (
          <div className="flex items-center gap-3 bg-card px-3.5 py-2.5 rounded-[8px] border border-border shrink-0 self-start">
            <div className="flex flex-col">
              <span
                id="journal-visibility-label"
                className="text-[13px] font-bold text-foreground"
              >
                {journalPublic ? "Public journal" : "Private journal"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {journalPublic
                  ? "Anyone can view your journal"
                  : "Only you can view your journal"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={journalPublic}
              aria-labelledby="journal-visibility-label"
              onClick={() => toggleJournalPrivacy()}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                journalPublic
                  ? "bg-primary border-primary"
                  : "bg-muted border-border"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  journalPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {isOwner || journalPublic ? (
        <TradeJournalTab />
      ) : (
        <div className="flex flex-col items-center gap-3 text-center py-12 px-6 rounded-[8px] border border-dashed border-border bg-card">
          <div className="w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
            <GiPadlock className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[15px] font-extrabold text-foreground">
              This journal is private
            </h4>
            <p className="text-[13px] text-muted-foreground">
              This trader has chosen not to share their trade journal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}