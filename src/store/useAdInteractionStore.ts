// ================================================
// FILE: src/store/useAdInteractionStore.ts
// ================================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  
  openAdContext: (adId: string, currentUserId?: string) => Promise<void>;
  closeAdContext: () => void;
  
  postComment: (adId: string, userProfile: any, content: string, parentId?: string | null) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  voteAd: (adId: string, userId: string, value: number) => Promise<void>;
  voteComment: (commentId: string, userId: string, value: number) => Promise<void>;
}

const containsPhishingOrLink = (text: string) => {
  const normalized = text.normalize('NFKD').toLowerCase();
  const stripped = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const urlPattern = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|net|org|gg|ru|io|me|co|xyz|to|link|tk)|discord\.gg|t\.me|bit\.ly)/i;
  return urlPattern.test(stripped);
};

let activeInteractionChannel: RealtimeChannel | null = null;

export const useAdInteractionStore = create<AdInteractionState>((set, get) => ({
  activeAdId: null,
  comments: [],
  adVotes: { upvotes: 0, downvotes: 0, userVote: 0 },
  commentVotes: {},
  isLoading: false,
  isActionPending: false,

  openAdContext: async (adId: string, currentUserId?: string) => {
    set({ 
      activeAdId: adId, 
      isLoading: true, 
      comments: [], 
      adVotes: { upvotes: 0, downvotes: 0, userVote: 0 },
      commentVotes: {} 
    });

    if (activeInteractionChannel) {
      supabase.removeChannel(activeInteractionChannel);
      activeInteractionChannel = null;
    }

    const fetchInteractions = async () => {
      const { data: commentsData, error: commentsError } = await supabase
        .from('ad_comments')
        .select(`*, profiles!ad_comments_user_id_fkey(username, avatar_url, role, discord_id)`)
        .eq('ad_id', adId)
        .order('created_at', { ascending: true });
        
      if (commentsError) {
        console.error("🚨 Fetch Comments Error:", commentsError.message);
      }

      const comments = (commentsData as AdComment[]) || [];
      
      const { data: adVotesData } = await supabase
        .from('ad_votes')
        .select('*')
        .eq('ad_id', adId);
        
      let adUp = 0, adDown = 0, adUserVote = 0;
      if (adVotesData) {
        adVotesData.forEach(v => {
          if (v.vote_value === 1) adUp++;
          if (v.vote_value === -1) adDown++;
          if (currentUserId && v.user_id === currentUserId) adUserVote = v.vote_value;
        });
      }

      const commentVoteMap: Record<string, VoteData> = {};
      const commentIds = comments.map(c => c.id);
      
      if (commentIds.length > 0) {
        const { data: cVotesData } = await supabase
          .from('comment_votes')
          .select('*')
          .in('comment_id', commentIds);
          
        if (cVotesData) {
          cVotesData.forEach(v => {
            if (!commentVoteMap[v.comment_id]) {
              commentVoteMap[v.comment_id] = { upvotes: 0, downvotes: 0, userVote: 0 };
            }
            if (v.vote_value === 1) commentVoteMap[v.comment_id].upvotes++;
            if (v.vote_value === -1) commentVoteMap[v.comment_id].downvotes++;
            if (currentUserId && v.user_id === currentUserId) commentVoteMap[v.comment_id].userVote = v.vote_value;
          });
        }
      }

      set({ 
        comments, 
        adVotes: { upvotes: adUp, downvotes: adDown, userVote: adUserVote },
        commentVotes: commentVoteMap,
        isLoading: false 
      });
    };

    await fetchInteractions();

    activeInteractionChannel = supabase.channel(`ad-${adId}-interactions`);
    activeInteractionChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_comments', filter: `ad_id=eq.${adId}` }, fetchInteractions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_votes', filter: `ad_id=eq.${adId}` }, fetchInteractions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_votes' }, fetchInteractions)
      .subscribe();
  },

  closeAdContext: () => {
    if (activeInteractionChannel) {
      supabase.removeChannel(activeInteractionChannel);
      activeInteractionChannel = null;
    }
    set({ activeAdId: null, comments: [], commentVotes: {}, adVotes: { upvotes: 0, downvotes: 0, userVote: 0 }, isActionPending: false });
  },

  postComment: async (adId, userProfile, content, parentId = null) => {
    if (containsPhishingOrLink(content)) {
      alert("ACTION BLOCKED: External links, domains, and invite URLs are strictly prohibited to prevent phishing and scams.");
      return false;
    }

    set({ isActionPending: true });

    // 1. Create fake optimistic comment
    const fakeId = `temp-${Date.now()}`;
    const optimisticComment: AdComment = {
      id: fakeId,
      ad_id: adId,
      user_id: userProfile.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      parent_id: parentId,
      profiles: {
        username: userProfile.username,
        avatar_url: userProfile.avatar_url,
        role: userProfile.role,
        discord_id: userProfile.discord_id
      }
    };

    // 2. Inject immediately
    set(state => ({ comments: [...state.comments, optimisticComment] }));

    // 3. Sync with DB
    const { data, error } = await supabase.from('ad_comments').insert({
      ad_id: adId,
      user_id: userProfile.id,
      content: content.trim(),
      parent_id: parentId
    }).select('id').single();
    
    if (error) {
      // Rollback on fail
      set(state => ({ 
        comments: state.comments.filter(c => c.id !== fakeId),
        isActionPending: false
      }));
      console.error("🚨 POST COMMENT FAILED:", error.message);
      alert(`FAILED TO POST COMMENT:\n${error.message}`);
      return false;
    }

    // Replace fake ID with real DB ID silently
    set(state => ({
      comments: state.comments.map(c => c.id === fakeId ? { ...c, id: data.id } : c),
      isActionPending: false
    }));

    return true;
  },

  deleteComment: async (commentId) => {
    set({ isActionPending: true });
    const currentComments = get().comments;
    // Optimistic delete
    set({ comments: currentComments.filter(c => c.id !== commentId) });

    const { error } = await supabase.from('ad_comments').delete().eq('id', commentId);
    
    if (error) {
      // Rollback
      console.error("🚨 Delete failed", error);
      set({ comments: currentComments, isActionPending: false });
      return false;
    }
    
    set({ isActionPending: false });
    return true;
  },

  voteAd: async (adId, userId, value) => {
    const { adVotes } = get();
    const currentVote = adVotes.userVote;
    const isRemoving = currentVote === value;
    const newValue = isRemoving ? 0 : value;

    // Optimistically calculate new totals
    let up = adVotes.upvotes;
    let down = adVotes.downvotes;

    if (currentVote === 1) up--;
    if (currentVote === -1) down--;
    if (newValue === 1) up++;
    if (newValue === -1) down++;

    set({ adVotes: { upvotes: up, downvotes: down, userVote: newValue } });

    if (isRemoving) {
      await supabase.from('ad_votes').delete().match({ ad_id: adId, user_id: userId });
    } else {
      await supabase.from('ad_votes').upsert({ ad_id: adId, user_id: userId, vote_value: newValue });
    }
  },

  voteComment: async (commentId, userId, value) => {
    const { commentVotes } = get();
    const currentData = commentVotes[commentId] || { upvotes: 0, downvotes: 0, userVote: 0 };
    const currentVote = currentData.userVote;
    const isRemoving = currentVote === value;
    const newValue = isRemoving ? 0 : value;

    // Optimistically calculate new totals
    let up = currentData.upvotes;
    let down = currentData.downvotes;

    if (currentVote === 1) up--;
    if (currentVote === -1) down--;
    if (newValue === 1) up++;
    if (newValue === -1) down++;

    set({ 
      commentVotes: { 
        ...commentVotes, 
        [commentId]: { upvotes: up, downvotes: down, userVote: newValue } 
      } 
    });

    if (isRemoving) {
      await supabase.from('comment_votes').delete().match({ comment_id: commentId, user_id: userId });
    } else {
      await supabase.from('comment_votes').upsert({ comment_id: commentId, user_id: userId, vote_value: newValue });
    }
  }
}));