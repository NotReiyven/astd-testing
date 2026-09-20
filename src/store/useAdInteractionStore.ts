// ================================================
// FILE: src/store/useAdInteractionStore.ts
// ================================================

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
  
  postComment: (adId: string, userId: string, content: string, parentId?: string | null) => Promise<boolean>;
  deleteComment: (commentId: string) => Promise<boolean>;
  voteAd: (adId: string, userId: string, value: number) => Promise<void>;
  voteComment: (commentId: string, userId: string, value: number) => Promise<void>;
}

// Anti-Phishing & Scam Link Filter
const containsPhishingOrLink = (text: string) => {
  // Normalize to catch Cyrillic homoglyphs and weird unicode spacings, then strip zero-width chars
  const normalized = text.normalize('NFKD').toLowerCase();
  const stripped = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  const urlPattern = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|net|org|gg|ru|io|me|co|xyz|to|link|tk)|discord\.gg|t\.me|bit\.ly)/i;
  return urlPattern.test(stripped);
};

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

    supabase.channel(`ad-${adId}-interactions`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_comments', filter: `ad_id=eq.${adId}` }, fetchInteractions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_votes', filter: `ad_id=eq.${adId}` }, fetchInteractions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_votes' }, fetchInteractions)
      .subscribe();
  },

  closeAdContext: () => {
    const { activeAdId } = get();
    if (activeAdId) {
      supabase.removeChannel(supabase.channel(`ad-${activeAdId}-interactions`));
    }
    set({ activeAdId: null, comments: [], commentVotes: {}, adVotes: { upvotes: 0, downvotes: 0, userVote: 0 } });
  },

  postComment: async (adId, userId, content, parentId = null) => {
    if (containsPhishingOrLink(content)) {
      alert("ACTION BLOCKED: External links, domains, and invite URLs are strictly prohibited to prevent phishing and scams.");
      return false;
    }

    set({ isActionPending: true });
    const { error } = await supabase.from('ad_comments').insert({
      ad_id: adId,
      user_id: userId,
      content: content.trim(),
      parent_id: parentId
    });
    
    set({ isActionPending: false });
    
    if (error) {
      console.error("🚨 POST COMMENT FAILED:", error.message);
      alert(`FAILED TO POST COMMENT:\n${error.message}`);
      return false;
    }
    return true;
  },

  deleteComment: async (commentId) => {
    set({ isActionPending: true });
    const { error } = await supabase.from('ad_comments').delete().eq('id', commentId);
    set({ isActionPending: false });
    return !error;
  },

  voteAd: async (adId, userId, value) => {
    const { adVotes } = get();
    const isRemoving = adVotes.userVote === value;
    const newValue = isRemoving ? 0 : value;

    set({ adVotes: { ...adVotes, userVote: newValue } });

    if (isRemoving) {
      await supabase.from('ad_votes').delete().match({ ad_id: adId, user_id: userId });
    } else {
      await supabase.from('ad_votes').upsert({ ad_id: adId, user_id: userId, vote_value: newValue });
    }
  },

  voteComment: async (commentId, userId, value) => {
    const { commentVotes } = get();
    const currentVote = commentVotes[commentId]?.userVote || 0;
    const isRemoving = currentVote === value;
    const newValue = isRemoving ? 0 : value;

    set({ 
      commentVotes: { 
        ...commentVotes, 
        [commentId]: { ...(commentVotes[commentId] || { upvotes: 0, downvotes: 0 }), userVote: newValue } 
      } 
    });

    if (isRemoving) {
      await supabase.from('comment_votes').delete().match({ comment_id: commentId, user_id: userId });
    } else {
      await supabase.from('comment_votes').upsert({ comment_id: commentId, user_id: userId, vote_value: newValue });
    }
  }
}));