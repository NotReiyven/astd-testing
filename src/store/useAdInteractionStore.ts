import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { get as getIdb, set as setIdb } from "idb-keyval";
import { useToastStore } from "./useToastStore";
import { useNotificationStore } from "./useNotificationStore";

export interface AdComment {
  id: string;
  ad_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  profiles: {
    username: string;
    avatar_url: string;
    role: string;
    discord_id: string;
  };
}

export interface VoteData {
  upvotes: number;
  downvotes: number;
  userVote: number;
}

interface AdInteractionState {
  activeAdId: string | null;
  comments: AdComment[];
  adVotes: VoteData;
  commentVotes: Record<string, VoteData>;
  isLoading: boolean;
  isActionPending: boolean;

  openAdContext: (
    adId: string,
    currentUserId?: string
  ) => Promise<void>;

  closeAdContext: () => void;

  postComment: (
    adId: string,
    userProfile: any,
    content: string,
    parentId?: string | null
  ) => Promise<boolean>;

  deleteComment: (
    commentId: string
  ) => Promise<boolean>;

  voteAd: (
    adId: string,
    userId: string,
    value: number,
    adOwnerId?: string
  ) => Promise<void>;

  voteComment: (
    commentId: string,
    userId: string,
    value: number
  ) => Promise<void>;
}

const containsPhishingOrLink = (text: string) => {
  const normalized = text
    .normalize("NFKD")
    .toLowerCase();

  const stripped = normalized
    .replace(
      /[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g,
      ""
    )
    .replace(
      /(\s|\[|\]|\(|\)|\{|\}|\*|_|-|~|`|\||\\|\/)+/g,
      ""
    )
    .replace(/[аа]/g, "a")
    .replace(/[оо]/g, "o")
    .replace(/[ее]/g, "e")
    .replace(/[сс]/g, "c")
    .replace(/dot/g, ".");

  const aggressivePattern =
    /(https?:|www\.|[a-z0-9]+\.(com|net|org|gg|ru|io|me|co|xyz|to|link|tk)|discord\.gg|discordgg|t\.me|bit\.ly)/i;

  return aggressivePattern.test(stripped);
};

let activeInteractionChannel: RealtimeChannel | null = null;

const createWarningNotification = (
  message: string,
  userId?: string
) => {
  void useNotificationStore
    .getState()
    .createNotification({
      user_id: userId,
      type: "warning",
      message,
    });
};

export const useAdInteractionStore =
  create<AdInteractionState>((set, get) => ({
    activeAdId: null,
    comments: [],
    adVotes: {
      upvotes: 0,
      downvotes: 0,
      userVote: 0,
    },
    commentVotes: {},
    isLoading: false,
    isActionPending: false,

    openAdContext: async (
      adId: string,
      currentUserId?: string
    ) => {
      set({
        activeAdId: adId,
        isLoading: true,
        comments: [],
        adVotes: {
          upvotes: 0,
          downvotes: 0,
          userVote: 0,
        },
        commentVotes: {},
      });

      if (activeInteractionChannel) {
        void supabase.removeChannel(
          activeInteractionChannel
        );

        activeInteractionChannel = null;
      }

      const fetchInteractions = async () => {
        const {
          data: commentsData,
          error: commentsError,
        } = await supabase
          .from("ad_comments")
          .select(
            `
            *,
            profiles!ad_comments_user_id_fkey(
              username,
              avatar_url,
              role,
              discord_id
            )
          `
          )
          .eq("ad_id", adId)
          .order("created_at", {
            ascending: true,
          });

        if (commentsError) {
          console.error(
            "Fetch Comments Error:",
            commentsError.message
          );
        }

        const comments =
          (commentsData as AdComment[]) || [];

        const { data: adVotesData } =
          await supabase
            .from("ad_votes")
            .select("*")
            .eq("ad_id", adId);

        let adUp = 0;
        let adDown = 0;
        let adUserVote = 0;

        if (adVotesData) {
          adVotesData.forEach((v) => {
            if (v.vote_value === 1) {
              adUp++;
            }

            if (v.vote_value === -1) {
              adDown++;
            }

            if (
              currentUserId &&
              v.user_id === currentUserId
            ) {
              adUserVote = v.vote_value;
            }
          });
        }

        const commentVoteMap: Record<
          string,
          VoteData
        > = {};

        const commentIds = comments.map(
          (c) => c.id
        );

        if (commentIds.length > 0) {
          const { data: cVotesData } =
            await supabase
              .from("comment_votes")
              .select("*")
              .in(
                "comment_id",
                commentIds
              );

          if (cVotesData) {
            cVotesData.forEach((v) => {
              if (
                !commentVoteMap[v.comment_id]
              ) {
                commentVoteMap[v.comment_id] = {
                  upvotes: 0,
                  downvotes: 0,
                  userVote: 0,
                };
              }

              if (v.vote_value === 1) {
                commentVoteMap[
                  v.comment_id
                ].upvotes++;
              }

              if (v.vote_value === -1) {
                commentVoteMap[
                  v.comment_id
                ].downvotes++;
              }

              if (
                currentUserId &&
                v.user_id === currentUserId
              ) {
                commentVoteMap[
                  v.comment_id
                ].userVote = v.vote_value;
              }
            });
          }
        }

        set({
          comments,
          adVotes: {
            upvotes: adUp,
            downvotes: adDown,
            userVote: adUserVote,
          },
          commentVotes: commentVoteMap,
          isLoading: false,
        });
      };

      await fetchInteractions();

      activeInteractionChannel =
        supabase.channel(
          `ad-${adId}-interactions`
        );

      activeInteractionChannel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ad_comments",
            filter: `ad_id=eq.${adId}`,
          },
          fetchInteractions
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "ad_votes",
            filter: `ad_id=eq.${adId}`,
          },
          fetchInteractions
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comment_votes",
          },
          fetchInteractions
        )
        .subscribe();
    },

    closeAdContext: () => {
      if (activeInteractionChannel) {
        void supabase.removeChannel(
          activeInteractionChannel
        );

        activeInteractionChannel = null;
      }

      set({
        activeAdId: null,
        comments: [],
        commentVotes: {},
        adVotes: {
          upvotes: 0,
          downvotes: 0,
          userVote: 0,
        },
        isActionPending: false,
      });
    },

    postComment: async (
      adId,
      userProfile,
      content,
      parentId = null
    ) => {
      if (containsPhishingOrLink(content)) {
        useToastStore
          .getState()
          .addToast(
            "External links and invite URLs are strictly prohibited to prevent scams.",
            "error"
          );

        createWarningNotification(
          "Your comment was blocked because external links and invite URLs are not allowed.",
          userProfile.id
        );

        return false;
      }

      const cleanContent = content.trim();

      if (!cleanContent) {
        return false;
      }

      if (!navigator.onLine) {
        const queue: any[] =
          (await getIdb(
            "astd_offline_comments"
          )) || [];

        queue.push({
          adId,
          userProfile,
          content: cleanContent,
          parentId,
        });

        await setIdb(
          "astd_offline_comments",
          queue
        );

        useToastStore
          .getState()
          .addToast(
            "You're offline. Comment queued to post when connection is restored.",
            "info"
          );

        return true;
      }

      set({
        isActionPending: true,
      });

      const fakeId = `temp-${Date.now()}`;

      const optimisticComment: AdComment = {
        id: fakeId,
        ad_id: adId,
        user_id: userProfile.id,
        content: cleanContent,
        created_at: new Date().toISOString(),
        parent_id: parentId,
        profiles: {
          username: userProfile.username,
          avatar_url: userProfile.avatar_url,
          role: userProfile.role,
          discord_id: userProfile.discord_id,
        },
      };

      set((state) => ({
        comments: [
          ...state.comments,
          optimisticComment,
        ],
      }));

      const {
        data,
        error,
      } = await supabase
        .from("ad_comments")
        .insert({
          ad_id: adId,
          user_id: userProfile.id,
          content: cleanContent,
          parent_id: parentId,
        })
        .select("id")
        .single();

      if (error) {
        set((state) => ({
          comments: state.comments.filter(
            (c) => c.id !== fakeId
          ),
          isActionPending: false,
        }));

        useToastStore
          .getState()
          .addToast(
            "Failed to post comment. Please try again.",
            "error"
          );

        createWarningNotification(
          "Failed to post comment. You may be rate limited.",
          userProfile.id
        );

        return false;
      }

      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === fakeId
            ? {
                ...c,
                id: data.id,
              }
            : c
        ),
        isActionPending: false,
      }));

      return true;
    },

    deleteComment: async (commentId) => {
      set({
        isActionPending: true,
      });

      const currentComments =
        get().comments;

      set({
        comments: currentComments.filter(
          (c) => c.id !== commentId
        ),
      });

      const { error } = await supabase
        .from("ad_comments")
        .delete()
        .eq("id", commentId);

      if (error) {
        set({
          comments: currentComments,
          isActionPending: false,
        });

        useToastStore
          .getState()
          .addToast(
            "Failed to delete comment. Please try again.",
            "error"
          );

        createWarningNotification(
          "Failed to delete comment. Please try again."
        );

        return false;
      }

      set({
        isActionPending: false,
      });

      return true;
    },

    voteAd: async (
      adId,
      userId,
      value,
      adOwnerId
    ) => {
      const previousVotes =
        get().adVotes;

      const currentVote =
        previousVotes.userVote;

      const isRemoving =
        currentVote === value;

      const newValue =
        isRemoving ? 0 : value;

      let up =
        previousVotes.upvotes;

      let down =
        previousVotes.downvotes;

      if (currentVote === 1) {
        up--;
      }

      if (currentVote === -1) {
        down--;
      }

      if (newValue === 1) {
        up++;
      }

      if (newValue === -1) {
        down++;
      }

      set({
        adVotes: {
          upvotes: up,
          downvotes: down,
          userVote: newValue,
        },
      });

      if (isRemoving) {
        const { error } =
          await supabase
            .from("ad_votes")
            .delete()
            .match({
              ad_id: adId,
              user_id: userId,
            });

        if (error) {
          set({
            adVotes: previousVotes,
          });

          useToastStore
            .getState()
            .addToast(
              "Failed to remove your vote. Please try again.",
              "error"
            );

          createWarningNotification(
            "Failed to remove your vote. Please try again.",
            userId
          );
        }

        return;
      }

      const { error } =
        await supabase
          .from("ad_votes")
          .upsert({
            ad_id: adId,
            user_id: userId,
            vote_value: newValue,
          });

      if (error) {
        set({
          adVotes: previousVotes,
        });

        useToastStore
          .getState()
          .addToast(
            "Failed to save your vote. Please try again.",
            "error"
          );

        createWarningNotification(
          "Failed to save your vote. Please try again.",
          userId
        );

        return;
      }

      if (
        newValue === 1 &&
        adOwnerId &&
        adOwnerId !== userId
      ) {
        void useNotificationStore
          .getState()
          .createNotification({
            user_id: adOwnerId,
            actor_id: userId,
            ad_id: adId,
            type: "upvote",
          });
      }
    },

    voteComment: async (
      commentId,
      userId,
      value
    ) => {
      const { commentVotes } =
        get();

      const previousData =
        commentVotes[commentId] || {
          upvotes: 0,
          downvotes: 0,
          userVote: 0,
        };

      const currentVote =
        previousData.userVote;

      const isRemoving =
        currentVote === value;

      const newValue =
        isRemoving ? 0 : value;

      let up =
        previousData.upvotes;

      let down =
        previousData.downvotes;

      if (currentVote === 1) {
        up--;
      }

      if (currentVote === -1) {
        down--;
      }

      if (newValue === 1) {
        up++;
      }

      if (newValue === -1) {
        down++;
      }

      set({
        commentVotes: {
          ...commentVotes,
          [commentId]: {
            upvotes: up,
            downvotes: down,
            userVote: newValue,
          },
        },
      });

      if (isRemoving) {
        const { error } =
          await supabase
            .from("comment_votes")
            .delete()
            .match({
              comment_id: commentId,
              user_id: userId,
            });

        if (error) {
          set({
            commentVotes: {
              ...get().commentVotes,
              [commentId]: previousData,
            },
          });

          useToastStore
            .getState()
            .addToast(
              "Failed to remove your vote. Please try again.",
              "error"
            );

          createWarningNotification(
            "Failed to remove your comment vote. Please try again.",
            userId
          );
        }

        return;
      }

      const { error } =
        await supabase
          .from("comment_votes")
          .upsert({
            comment_id: commentId,
            user_id: userId,
            vote_value: newValue,
          });

      if (error) {
        set({
          commentVotes: {
            ...get().commentVotes,
            [commentId]: previousData,
          },
        });

        useToastStore
          .getState()
          .addToast(
            "Failed to save your vote. Please try again.",
            "error"
          );

        createWarningNotification(
          "Failed to save your comment vote. Please try again.",
          userId
        );

        return;
      }

      if (newValue === 1) {
        const targetComment =
          get().comments.find(
            (comment) =>
              comment.id === commentId
          );

        if (
          targetComment &&
          targetComment.user_id !== userId
        ) {
          void useNotificationStore
            .getState()
            .createNotification({
              user_id:
                targetComment.user_id,
              actor_id: userId,
              ad_id:
                targetComment.ad_id,
              comment_id: commentId,
              type: "upvote",
            });
        }
      }
    },
  }));