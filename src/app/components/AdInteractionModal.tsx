// FILE: src/app/components/AdInteractionModal.tsx

import { useState, useEffect, useRef } from "react";
import { X, MessageSquare, ArrowBigUp, ArrowBigDown, Send, Trash2, ShieldAlert, Clock, Reply, Calculator } from "lucide-react";
import { useAdInteractionStore, AdComment } from "../../store/useAdInteractionStore";
import { useTradingAdsStore } from "../../store/useTradingAdsStore";
import { useAuthStore } from "../../store/useAuthStore";
import { useTradeStore } from "../../store/useTradeStore";
import { useUnits } from "../../context/UnitContext";
import { getProxyImage, handleImageError } from "../../data";
import { triggerHaptic } from "../../data/helpers";

function getTimeAgoShort(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const MAX_INDENT_LEVEL = 3;

export function AdInteractionModal() {
  const { 
    activeAdId, comments, adVotes, commentVotes,
    isLoading, isActionPending, closeAdContext, 
    postComment, deleteComment, voteAd, voteComment 
  } = useAdInteractionStore();
  
  const { ads } = useTradingAdsStore();
  const { profile } = useAuthStore();
  const { overwrite } = useTradeStore();
  const { units: ALL_UNITS } = useUnits();
  
  const activeAd = ads.find(a => a.id === activeAdId);
  
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string, username: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  if (!activeAdId || !activeAd) return null;

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile) return;
    
    triggerHaptic('light');
    const success = await postComment(activeAdId, profile.id, newComment, replyingTo?.id || null);
    if (success) {
      setNewComment("");
      setReplyingTo(null);
    }
  };

  const handleLoadIntoCalculator = () => {
    triggerHaptic('medium');
    overwrite(activeAd.get_items, activeAd.give_items);
    window.dispatchEvent(new Event("open-analyzer"));
    // Removed closeAdContext() so the modal stays open while items load
  };

  const canModerate = (commentUserId: string) => {
    if (!profile) return false;
    return profile.id === commentUserId || ['mod', 'admin', 'master'].includes(profile.role);
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  const CommentThread = ({ comment, depth = 0 }: { comment: AdComment, depth?: number }) => {
    const votes = commentVotes[comment.id] || { upvotes: 0, downvotes: 0, userVote: 0 };
    const score = votes.upvotes - votes.downvotes;
    const replies = getReplies(comment.id);

    const effectiveDepth = Math.min(depth, MAX_INDENT_LEVEL);
    const isNested = depth > 0;

    return (
      <div className={`flex flex-col ${isNested ? `ml-${effectiveDepth * 4} mt-2.5 pl-2.5 border-l-2 border-[rgba(255,255,255,0.06)]` : 'mt-3'}`}>
        <div className="flex items-start justify-between gap-3 group bg-[#2B2D31]/40 hover:bg-[#2B2D31]/80 p-3.5 rounded-[8px] transition-colors border border-transparent hover:border-[rgba(255,255,255,0.04)]">
          
          <div className="flex gap-3 min-w-0 flex-1">
            {/* Comment Voting Column */}
            <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
              <button 
                onClick={() => profile && voteComment(comment.id, profile.id, 1)}
                className={`focus-visible:outline-none transition-colors hover:text-[#23a559] ${votes.userVote === 1 ? 'text-[#23a559]' : 'text-[#80848E]'}`}
              >
                <ArrowBigUp className={`w-4 h-4 ${votes.userVote === 1 ? 'fill-current' : ''}`} />
              </button>
              <span className={`text-[11px] font-bold ${score > 0 ? 'text-[#23a559]' : score < 0 ? 'text-[#ed4245]' : 'text-[#80848E]'}`}>
                {score}
              </span>
              <button 
                onClick={() => profile && voteComment(comment.id, profile.id, -1)}
                className={`focus-visible:outline-none transition-colors hover:text-[#ed4245] ${votes.userVote === -1 ? 'text-[#ed4245]' : 'text-[#80848E]'}`}
              >
                <ArrowBigDown className={`w-4 h-4 ${votes.userVote === -1 ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Comment Content */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <img src={comment.profiles.avatar_url || "/units/firezio.webp"} className="w-5 h-5 rounded-full bg-[#111214] object-cover" alt="" />
                <span className="text-[13px] font-bold text-[#F2F3F5] flex items-center gap-1">
                  {comment.profiles.username}
                  {['mod', 'admin', 'master'].includes(comment.profiles.role) && <ShieldAlert className="w-3 h-3 text-[#7289da]" />}
                </span>
                <span className="text-[10px] font-medium text-[#80848E]">{getTimeAgoShort(comment.created_at)}</span>
              </div>
              
              <p className="text-[13px] text-[#DBDEE1] mt-1.5 leading-relaxed break-words whitespace-pre-wrap">
                {comment.content}
              </p>

              <div className="flex items-center gap-4 mt-2.5">
                <button 
                  onClick={() => setReplyingTo({ id: comment.id, username: comment.profiles.username })}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#80848E] hover:text-[#DBDEE1] transition-colors focus-visible:outline-none"
                >
                  <Reply className="w-3 h-3 text-[#7289da]" /> Reply
                </button>
                {canModerate(comment.user_id) && (
                  <button 
                    onClick={() => deleteComment(comment.id)}
                    className="flex items-center gap-1 text-[11px] font-bold text-[#80848E] hover:text-[#ed4245] transition-colors focus-visible:outline-none"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Render Replies Recursively */}
        {replies.length > 0 && (
          <div className="flex flex-col">
            {replies.map(reply => <CommentThread key={reply.id} comment={reply} depth={depth + 1} />)}
          </div>
        )}
      </div>
    );
  };

  const adScore = adVotes.upvotes - adVotes.downvotes;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#313338] w-full max-w-6xl rounded-[12px] shadow-2xl border border-[rgba(255,255,255,0.06)] flex flex-col md:flex-row h-[90vh] max-h-[900px] overflow-hidden">
        
        {/* LEFT PANE: Ad Context & Load Button */}
        <div className="w-full md:w-[320px] bg-[#2B2D31] border-b md:border-b-0 md:border-r border-[rgba(0,0,0,0.2)] flex flex-col shrink-0">
          <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.04)]">
            <h3 className="text-[13px] font-black text-[#F2F3F5] uppercase tracking-wider">Original Listing</h3>
            <button onClick={closeAdContext} className="md:hidden text-[#80848E] hover:text-white focus-visible:outline-none p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5">
            
            {/* Ad Voting & User */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center gap-1 shrink-0 bg-[#1E1F22] p-1.5 rounded-[8px] border border-[rgba(255,255,255,0.04)]">
                <button 
                  onClick={() => profile && voteAd(activeAd.id, profile.id, 1)}
                  className={`focus-visible:outline-none transition-colors hover:text-[#23a559] ${adVotes.userVote === 1 ? 'text-[#23a559]' : 'text-[#80848E]'}`}
                >
                  <ArrowBigUp className={`w-5 h-5 ${adVotes.userVote === 1 ? 'fill-current' : ''}`} />
                </button>
                <span className={`text-[13px] font-bold ${adScore > 0 ? 'text-[#23a559]' : adScore < 0 ? 'text-[#ed4245]' : 'text-[#F2F3F5]'}`}>
                  {adScore}
                </span>
                <button 
                  onClick={() => profile && voteAd(activeAd.id, profile.id, -1)}
                  className={`focus-visible:outline-none transition-colors hover:text-[#ed4245] ${adVotes.userVote === -1 ? 'text-[#ed4245]' : 'text-[#80848E]'}`}
                >
                  <ArrowBigDown className={`w-5 h-5 ${adVotes.userVote === -1 ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <img src={activeAd.profiles?.avatar_url || "/units/firezio.webp"} className="w-6 h-6 rounded-full bg-[#111214] object-cover" alt="" />
                  <span className="text-[14px] font-bold text-[#F2F3F5] truncate">{activeAd.profiles?.username}</span>
                </div>
                <span className="text-[13px] text-[#DBDEE1] break-all leading-relaxed">
                  {activeAd.note || "No additional notes provided."}
                </span>
              </div>
            </div>

            {/* Ad Content Renders */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="bg-[#1E1F22] rounded-[8px] p-3 border border-[rgba(255,255,255,0.02)]">
                <span className="text-[10px] font-bold text-[#949BA4] uppercase tracking-widest block mb-2">
                  {activeAd.ad_type === 'inventory' ? 'Showcase' : 'Offering'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeAd.give_items.map((item, i) => {
                    const master = ALL_UNITS.find(u => u.id === item.id);
                    const proxyUrl = master ? getProxyImage(item.id, master.imageUrl) : null;
                    return (
                      <div key={i} className="relative w-10 h-10 bg-[#111214] rounded-[4px] border border-[rgba(255,255,255,0.06)] overflow-hidden shrink-0" title={item.name}>
                        {proxyUrl && <img src={proxyUrl} className="absolute inset-0 w-full h-full object-cover" alt="" onError={(e) => handleImageError(e, item.id)} />}
                        {item.qty > 1 && <div className="absolute bottom-0 right-0 bg-[#1E1F22] text-[#DBDEE1] text-[9px] font-black px-1 rounded-tl-[4px] z-10">x{item.qty}</div>}
                      </div>
                    );
                  })}
                  {activeAd.give_items.length === 0 && <span className="text-[12px] text-[#80848E]">Nothing</span>}
                </div>
              </div>

              {activeAd.ad_type !== 'inventory' && (
                <div className="bg-[#1E1F22] rounded-[8px] p-3 border border-[rgba(255,255,255,0.02)]">
                  <span className="text-[10px] font-bold text-[#949BA4] uppercase tracking-widest block mb-2">Requesting</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeAd.get_items.map((item, i) => {
                      const master = ALL_UNITS.find(u => u.id === item.id);
                      const proxyUrl = master ? getProxyImage(item.id, master.imageUrl) : null;
                      return (
                        <div key={i} className="relative w-10 h-10 bg-[#111214] rounded-[4px] border border-[rgba(255,255,255,0.06)] overflow-hidden shrink-0" title={item.name}>
                          {proxyUrl && <img src={proxyUrl} className="absolute inset-0 w-full h-full object-cover" alt="" onError={(e) => handleImageError(e, item.id)} />}
                          {item.qty > 1 && <div className="absolute bottom-0 right-0 bg-[#1E1F22] text-[#DBDEE1] text-[9px] font-black px-1 rounded-tl-[4px] z-10">x{item.qty}</div>}
                        </div>
                      );
                    })}
                    {activeAd.get_items.length === 0 && <span className="text-[12px] text-[#80848E]">Taking Offers</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Load into Calculator Action */}
            <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.04)]">
              <button
                onClick={handleLoadIntoCalculator}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#7289da] hover:bg-[#5b6eae] text-white text-[13px] font-bold rounded-[6px] transition-colors shadow-sm focus-visible:outline-none"
              >
                <Calculator className="w-4 h-4" /> Load into Calculator
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT PANE: Discussion Thread */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
          <div className="hidden md:flex items-center justify-between px-6 py-4 bg-[#2B2D31] border-b border-[rgba(0,0,0,0.2)] shrink-0">
            <h2 className="text-[15px] font-black text-[#F2F3F5] tracking-tight uppercase flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#7289da]" /> Disqus
            </h2>
            <button onClick={closeAdContext} className="text-[#80848E] hover:text-[#F2F3F5] transition-colors focus-visible:outline-none p-1 bg-transparent hover:bg-[rgba(255,255,255,0.04)] rounded-[4px]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Comments Feed */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 flex flex-col pb-8">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-[#80848E] gap-2">
                <Clock className="w-4 h-4 animate-spin" /> <span className="text-[12px] font-bold uppercase tracking-widest">Loading...</span>
              </div>
            ) : rootComments.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <MessageSquare className="w-12 h-12 text-[#80848E] mb-3" />
                <span className="text-[15px] font-bold text-[#F2F3F5]">No messages yet</span>
                <span className="text-[13px] text-[#80848E] mt-1">Be the first to start the negotiation.</span>
              </div>
            ) : (
              rootComments.map((comment) => (
                <CommentThread key={comment.id} comment={comment} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#2B2D31] border-t border-[rgba(0,0,0,0.2)] shrink-0 flex flex-col gap-2">
            {replyingTo && (
              <div className="flex items-center justify-between bg-[#1E1F22] px-3 py-1.5 rounded-[6px] border border-[#7289da]/30">
                <span className="text-[12px] font-bold text-[#F2F3F5] flex items-center gap-1.5">
                  <Reply className="w-3.5 h-3.5 text-[#7289da]" /> Replying to {replyingTo.username}
                </span>
                <button onClick={() => setReplyingTo(null)} className="text-[#80848E] hover:text-[#ed4245] focus-visible:outline-none">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            {profile ? (
              <form onSubmit={handlePost} className="relative flex items-center">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyingTo ? `Write a reply...` : `Add a comment...`}
                  maxLength={500}
                  disabled={isActionPending}
                  className="w-full bg-[#383A40] text-[#F2F3F5] text-[14px] pl-4 pr-12 py-3 rounded-[8px] outline-none border border-transparent focus:border-[#7289da] transition-colors font-medium placeholder:text-[#80848E]"
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim() || isActionPending}
                  className="absolute right-2 w-8 h-8 flex items-center justify-center rounded-[6px] bg-[#7289da] hover:bg-[#5b6eae] text-white disabled:opacity-50 disabled:hover:bg-[#7289da] transition-colors focus-visible:outline-none"
                >
                  <Send className="w-4 h-4 -ml-0.5" />
                </button>
              </form>
            ) : (
              <div className="w-full bg-[#383A40] text-[#80848E] text-[13px] font-bold text-center py-3 rounded-[8px]">
                You must be logged in to participate.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}