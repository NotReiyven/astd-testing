import React, { useState, useMemo } from "react";
import {
  GiTrashCan,
  GiHammerDrop,
  GiMagnifyingGlass,
  GiCycle,
  GiChatBubble,
  GiCheckMark,
  GiCrossMark,
} from "react-icons/gi";
import { AdminComment } from "../../../hooks/useAdminIntel";
import { UserAvatar } from "../shared/UserAvatar";
import { DiscordRolePill } from "../shared/DiscordRolePill";
import { triggerHaptic, resolveSafeUsername } from "../../../data/helpers";

interface CommentsStreamTabProps {
  comments: AdminComment[];
  isLoading: boolean;
  onDeleteComment: (
    commentId: string,
    authorId: string,
    authorUsername: string,
    reason: string
  ) => Promise<boolean>;
  onWarnUser: (
    userId: string,
    username: string,
    reason: string,
    context?: { commentId?: string; adId?: string }
  ) => Promise<boolean>;
  onInspectUser: (userId: string) => void;
  onRefresh: () => void;
}

export function CommentsStreamTab({
  comments,
  isLoading,
  onDeleteComment,
  onWarnUser,
  onInspectUser,
  onRefresh,
}: CommentsStreamTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actingComment, setActingComment] = useState<{
    type: "delete" | "warn";
    comment: AdminComment;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredComments = useMemo(() => {
    if (!searchQuery.trim()) return comments;
    const q = searchQuery.toLowerCase().trim();
    return comments.filter((c) => {
      const username = c.profiles?.username?.toLowerCase() || "";
      const content = c.content?.toLowerCase() || "";
      const adId = c.ad_id?.toLowerCase() || "";
      return username.includes(q) || content.includes(q) || adId.includes(q);
    });
  }, [comments, searchQuery]);

  const handleExecuteAction = async () => {
    if (!actingComment || !actionReason.trim()) return;
    setIsSubmitting(true);
    triggerHaptic("heavy");

    const authorName = resolveSafeUsername(actingComment.comment.profiles?.username, {
      discordId: actingComment.comment.profiles?.discord_id,
      userId: actingComment.comment.user_id,
    });
    if (actingComment.type === "delete") {
      await onDeleteComment(
        actingComment.comment.id,
        actingComment.comment.user_id,
        authorName,
        actionReason.trim()
      );
    } else {
      await onWarnUser(
        actingComment.comment.user_id,
        authorName,
        actionReason.trim(),
        {
          commentId: actingComment.comment.id,
          adId: actingComment.comment.ad_id,
        }
      );
    }

    setIsSubmitting(false);
    setActingComment(null);
    setActionReason("");
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 animate-fade-in flex flex-col gap-4 max-w-6xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-[6px] p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-[#2b2d31] border border-border flex items-center justify-center shrink-0 text-primary">
            <GiChatBubble className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-foreground tracking-tight">
                Comments & Activity Stream
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-[3px] bg-[#2b2d31] border border-border text-muted-foreground">
                {comments.length} loaded
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Live global feed of user trade comments. Moderate abuse, spam, and predatory offers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <GiMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search comments or author…"
              className="w-full h-8 pl-8 pr-2.5 bg-input border border-border rounded-[4px] text-[12px] font-mono text-foreground focus:border-primary outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onRefresh();
            }}
            disabled={isLoading}
            className="h-8 px-3 rounded-[4px] bg-[#2b2d31] hover:bg-[#35373c] border border-border text-[11px] font-mono text-foreground flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Refresh comments feed"
          >
            <GiCycle className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Action Confirmation Modal */}
      {actingComment && (
        <div className="bg-[#1e1f22] border border-[#ef4444]/60 rounded-[6px] p-4 flex flex-col gap-3 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground font-bold text-[13px]">
              {actingComment.type === "delete" ? (
                <>
                  <GiTrashCan className="w-4 h-4 text-[#ef4444]" />
                  <span>Delete Comment by @{actingComment.comment.profiles?.username || "User"}</span>
                </>
              ) : (
                <>
                  <GiHammerDrop className="w-4 h-4 text-[#f97316]" />
                  <span>Issue Formal Warning to @{actingComment.comment.profiles?.username || "User"}</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActingComment(null)}
              className="text-muted-foreground hover:text-foreground text-[14px] cursor-pointer"
            >
              <GiCrossMark className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-[#2b2d31] p-2.5 rounded-[4px] border border-border text-[12px] text-foreground font-mono italic">
            &ldquo;{actingComment.comment.content}&rdquo;
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Moderation Reason (Required for Audit Trail)
            </label>
            <input
              type="text"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="e.g. Hate speech, toxicity, external link scam, spamming…"
              autoFocus
              className="h-8 px-2.5 bg-input border border-border rounded-[4px] text-[12px] text-foreground focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setActingComment(null)}
              className="h-7 px-3 rounded-[3px] bg-[#2b2d31] text-muted-foreground hover:text-foreground text-[11px] cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteAction}
              disabled={!actionReason.trim() || isSubmitting}
              className={`h-7 px-3.5 rounded-[3px] text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                actingComment.type === "delete"
                  ? "bg-[#ef4444] hover:bg-[#dc2626]"
                  : "bg-[#f97316] hover:bg-[#ea580c]"
              }`}
            >
              <GiCheckMark className="w-3 h-3" />
              <span>{isSubmitting ? "Logging…" : "Confirm Action"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="bg-card border border-border rounded-[6px] p-3 flex flex-col gap-2">
        {filteredComments.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground bg-input/40 rounded-[5px] border border-border">
            <GiChatBubble className="w-8 h-8 opacity-40" />
            <span className="text-[12px] font-mono">
              {searchQuery
                ? `No comments match "${searchQuery}".`
                : "No trade comments recorded."}
            </span>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const dateObj = new Date(comment.created_at);
            const timeStr = dateObj.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const dateStr = dateObj.toLocaleDateString([], {
              month: "short",
              day: "numeric",
            });

            const authorName = resolveSafeUsername(comment.profiles?.username, {
              discordId: comment.profiles?.discord_id,
              userId: comment.user_id,
            });
            const authorRole = comment.profiles?.role || "user";

            return (
              <div
                key={comment.id}
                className="p-3 rounded-[5px] bg-[#1e1f22] border border-border flex flex-col gap-2 font-sans hover:border-[#3f4147] transition-colors"
              >
                {/* Author & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      avatarUrl={comment.profiles?.avatar_url}
                      username={authorName}
                      discordId={comment.profiles?.discord_id}
                      className="w-7 h-7 rounded-full shrink-0 border border-border"
                    />

                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="text-[13px] font-bold text-foreground truncate">
                        {authorName}
                      </span>

                      <DiscordRolePill name={authorRole} size="xs" />

                      <span className="text-[11px] font-mono text-muted-foreground bg-[#2b2d31] px-1.5 py-0.5 rounded border border-border">
                        Ad #{comment.ad_id ? comment.ad_id.slice(0, 8) : "N/A"}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {dateStr} at {timeStr}
                  </span>
                </div>

                {/* Comment Content */}
                <div className="pl-9 text-[12.5px] text-[#dbdee1] leading-relaxed bg-[#2b2d31]/50 p-2.5 rounded-[4px] border border-border/70 break-words font-sans">
                  {comment.content}
                </div>

                {/* Mod Action Buttons */}
                <div className="pl-9 flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      setActingComment({ type: "delete", comment });
                      setActionReason("");
                    }}
                    className="h-6 px-2.5 rounded-[3px] bg-[#ef4444] hover:bg-[#dc2626] text-white text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-colors border border-black/20 shadow-xs"
                  >
                    <GiTrashCan className="w-3 h-3" />
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      setActingComment({ type: "warn", comment });
                      setActionReason("");
                    }}
                    className="h-6 px-2.5 rounded-[3px] bg-[#f97316] hover:bg-[#ea580c] text-white text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer transition-colors border border-black/20 shadow-xs"
                  >
                    <GiHammerDrop className="w-3 h-3" />
                    <span>Warn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      onInspectUser(comment.user_id);
                    }}
                    className="h-6 px-2.5 rounded-[3px] bg-[#2b2d31] hover:bg-[#35373c] text-muted-foreground hover:text-foreground border border-border text-[10px] font-mono cursor-pointer transition-colors"
                  >
                    Inspect Profile
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
