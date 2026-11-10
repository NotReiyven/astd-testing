// ================================================
// FILE: src/app/components/MainCanvas/UnitCard/SentimentVoteStrip.tsx
// ================================================

import { useEffect } from "react";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { useUnitSentimentStore } from "../../../../store/useUnitSentimentStore";
import { useAuthStore } from "../../../../store/useAuthStore";
import { triggerHaptic } from "../../../../data/helpers";
import { useToastStore } from "../../../../store/useToastStore";

export function SentimentVoteStrip({ unitId }: { unitId: string }) {
  const profile = useAuthStore((s) => s.profile);
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);
  const addToast = useToastStore((s) => s.addToast);

  const aggregate = useUnitSentimentStore((s) => s.aggregates[unitId]);
  const userVote = useUnitSentimentStore(
    (s) => (profile ? s.userVotes[profile.id]?.[unitId] : undefined) ?? 0
  );
  const pending = useUnitSentimentStore((s) =>
    Boolean(s.pendingUnitIds[unitId])
  );
  const vote = useUnitSentimentStore((s) => s.vote);
  const fetchAggregates = useUnitSentimentStore((s) => s.fetchAggregates);
  const fetchUserVotes = useUnitSentimentStore((s) => s.fetchUserVotes);

  useEffect(() => {
    void fetchAggregates([unitId]);
    if (profile) {
      void fetchUserVotes(profile.id, [unitId]);
    }
  }, [unitId, profile?.id, fetchAggregates, fetchUserVotes]);

  const upvotes = aggregate?.upvotes ?? 0;
  const downvotes = aggregate?.downvotes ?? 0;
  const total = upvotes + downvotes;
  const pct = total > 0 ? Math.round((upvotes / total) * 100) : null;

  const handleVote = (value: 1 | -1, e: React.MouseEvent) => {
    e.stopPropagation();

    // Guests must be signed in to vote
    if (!profile) {
      triggerHaptic("medium");
      addToast("Sign in with Discord to vote on market sentiment.", "warning", {
        action: {
          label: "Login",
          onClick: () => void loginWithDiscord(),
        },
      });
      return;
    }

    if (pending) return;
    triggerHaptic("light");
    void vote(unitId, profile.id, value);
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={(e) => handleVote(1, e)}
        aria-label="Vote higher next week"
        aria-pressed={userVote === 1}
        title={
          pct === null
            ? "Will this unit be higher next week? Vote higher."
            : `${pct}% bullish (${total} vote${total === 1 ? "" : "s"})`
        }
        className={`flex items-center justify-center w-6 h-6 rounded-[4px] border transition-colors cursor-pointer ${
          userVote === 1
            ? "bg-[#23a559] text-white border-[#23a559]"
            : "bg-popover border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <FiTrendingUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => handleVote(-1, e)}
        aria-label="Vote lower next week"
        aria-pressed={userVote === -1}
        title="Will this unit be lower next week? Vote lower."
        className={`flex items-center justify-center w-6 h-6 rounded-[4px] border transition-colors cursor-pointer ${
          userVote === -1
            ? "bg-destructive text-white border-destructive"
            : "bg-popover border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
      >
        <FiTrendingDown className="w-3.5 h-3.5" />
      </button>
      {pct !== null && (
        <span
          className="text-[9.5px] font-mono font-bold text-muted-foreground tabular-nums ml-0.5"
          title={`${upvotes} higher, ${downvotes} lower`}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}