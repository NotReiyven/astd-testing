// ================================================
// FILE: src/store/useUnitSentimentStore.ts
// ================================================

import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { useToastStore } from "./useToastStore";
import { logger } from "../lib/logger";

interface Aggregate {
  upvotes: number;
  downvotes: number;
}

interface SentimentState {
  aggregates: Record<string, Aggregate>;
  userVotes: Record<string, Record<string, number>>;
  pendingUnitIds: Record<string, boolean>;
  fetchAggregates: (unitIds: string[]) => Promise<void>;
  fetchUserVotes: (userId: string, unitIds: string[]) => Promise<void>;
  vote: (unitId: string, userId: string, value: 1 | -1) => Promise<void>;
}

const inFlight = new Set<string>();

export const useUnitSentimentStore = create<SentimentState>((set, get) => ({
  aggregates: {},
  userVotes: {},
  pendingUnitIds: {},

  fetchAggregates: async (unitIds) => {
    const ids = Array.from(new Set(unitIds.filter(Boolean)));
    if (ids.length === 0) return;

    const { data, error } = await supabase
      .from("unit_sentiment")
      .select("unit_id, vote")
      .in("unit_id", ids);

    if (error) {
      logger.warn("ASTD-SENT-001", "Failed to fetch unit sentiment", {
        scope: "useUnitSentimentStore",
        action: "fetchAggregates",
        metadata: { count: ids.length },
        error,
      });
      return;
    }

    const aggregates: Record<string, Aggregate> = {};
    for (const id of ids) aggregates[id] = { upvotes: 0, downvotes: 0 };
    for (const row of data ?? []) {
      const bucket = aggregates[row.unit_id];
      if (!bucket) continue;
      if (row.vote === 1) bucket.upvotes++;
      else if (row.vote === -1) bucket.downvotes++;
    }

    set((state) => ({
      aggregates: { ...state.aggregates, ...aggregates },
    }));
  },

  fetchUserVotes: async (userId, unitIds) => {
    if (!userId) return;
    const ids = Array.from(new Set(unitIds.filter(Boolean)));
    if (ids.length === 0) return;

    const { data, error } = await supabase
      .from("unit_sentiment")
      .select("unit_id, vote")
      .eq("user_id", userId)
      .in("unit_id", ids);

    if (error) {
      logger.warn("ASTD-SENT-002", "Failed to fetch user unit sentiment", {
        scope: "useUnitSentimentStore",
        action: "fetchUserVotes",
        metadata: { count: ids.length },
        error,
      });
      return;
    }

    const votesForUser: Record<string, number> = {};
    for (const row of data ?? []) {
      votesForUser[row.unit_id] = row.vote;
    }

    set((state) => ({
      userVotes: { ...state.userVotes, [userId]: votesForUser },
    }));
  },

  vote: async (unitId, userId, value) => {
    // 1. Strict Auth Guard
    if (!unitId || !userId) return;
    
    // 2. Lock against rapid clicking
    if (inFlight.has(unitId)) return;
    inFlight.add(unitId);

    const state = get();
    const previousAggregate = state.aggregates[unitId] ?? {
      upvotes: 0,
      downvotes: 0,
    };
    const previousUserVote = state.userVotes[userId]?.[unitId] ?? 0;

    // 3. Toggle Logic: If the user clicks the same button again, remove the vote.
    const isRemoving = previousUserVote === value;
    const nextValue: -1 | 0 | 1 = isRemoving ? 0 : value;

    // 4. Optimistic UI Update
    const nextAggregate: Aggregate = { ...previousAggregate };
    if (previousUserVote === 1) nextAggregate.upvotes = Math.max(0, nextAggregate.upvotes - 1);
    if (previousUserVote === -1) nextAggregate.downvotes = Math.max(0, nextAggregate.downvotes - 1);
    if (nextValue === 1) nextAggregate.upvotes += 1;
    if (nextValue === -1) nextAggregate.downvotes += 1;

    set((s) => ({
      aggregates: { ...s.aggregates, [unitId]: nextAggregate },
      userVotes: {
        ...s.userVotes,
        [userId]: { ...(s.userVotes[userId] ?? {}), [unitId]: nextValue },
      },
      pendingUnitIds: { ...s.pendingUnitIds, [unitId]: true },
    }));

    try {
      // 5. Database Commit
      if (nextValue === 0) {
        const { error } = await supabase
          .from("unit_sentiment")
          .delete()
          .eq("unit_id", unitId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // Upsert handles changing from +1 to -1 without duplicate rows
        const { error } = await supabase
          .from("unit_sentiment")
          .upsert(
            { unit_id: unitId, user_id: userId, vote: nextValue },
            { onConflict: "unit_id,user_id" }
          );
        if (error) throw error;
      }
    } catch (err) {
      // 6. Rollback on failure
      logger.error("ASTD-SENT-003", "Failed to save unit sentiment vote", {
        scope: "useUnitSentimentStore",
        action: "vote",
        metadata: { unitId },
        error: err,
      });

      set((s) => ({
        aggregates: { ...s.aggregates, [unitId]: previousAggregate },
        userVotes: {
          ...s.userVotes,
          [userId]: {
            ...(s.userVotes[userId] ?? {}),
            [unitId]: previousUserVote,
          },
        },
      }));

      useToastStore.getState().addToast(
        "Could not save your vote. Try again.",
        "error",
        {
          action: {
            label: "Retry",
            onClick: () => {
              void get().vote(unitId, userId, value);
            },
          },
        }
      );
    } finally {
      // 7. Release lock
      inFlight.delete(unitId);
      set((s) => ({
        pendingUnitIds: { ...s.pendingUnitIds, [unitId]: false },
      }));
    }
  },
}));