// ================================================
// FILE: src/app/components/ProfileChannel/tabs/JournalTab.tsx
// ================================================

import { TradeJournalTab } from "../../Profile/TradeJournalTab";
import { useTradeStore } from "../../../../store/useTradeStore";
import { ProfileChannelState } from "../hooks/useProfileChannelState";

export function JournalTab({ state }: { state: ProfileChannelState }) {
  const { isOwner, journalPublic } = state;
  const toggleJournalPrivacy = useTradeStore.getState().toggleJournalPrivacy;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[16px] font-bold text-foreground">
            Trade Journal
          </h3>
          <p className="text-[12px] text-muted-foreground">
            Log your completed trades to track your long-term win rate and
            personal performance.
          </p>
        </div>
        {isOwner && (
          <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer bg-card px-3 py-1.5 rounded-[6px] border border-border shadow-sm">
            <input
              type="checkbox"
              checked={journalPublic}
              onChange={() => toggleJournalPrivacy()}
              className="rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
            Make Journal Public
          </label>
        )}
      </div>

      {isOwner || journalPublic ? (
        <TradeJournalTab />
      ) : (
        <div className="text-center py-10 text-muted-foreground text-[13px]">
          This trader has kept their Trade Journal private.
        </div>
      )}
    </div>
  );
}