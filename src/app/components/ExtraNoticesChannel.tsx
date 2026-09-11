import { useState, useMemo } from "react";
import { Info, BookOpen, ShieldAlert, LucideIcon, Inbox, Search, Pin, Megaphone, Eye } from "lucide-react";
import { useUnits } from "../../context/UnitContext";
import { TiltCard } from "./ui/TiltCard";

const FIRE_ZIO_AVATAR = "/units/firezio.webp";

export function ExtraNoticesChannel() {
  const { notices } = useUnits();
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedTitles, setPinnedTitles] = useState<Record<string, boolean>>({});

  const togglePin = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedTitles(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const processedNotices = useMemo(() => {
    if (!notices) return [];
    
    const filtered = notices.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      const aPinned = pinnedTitles[a.title] ? 1 : 0;
      const bPinned = pinnedTitles[b.title] ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [notices, searchQuery, pinnedTitles]);

  // Semantic Matcher
  const getStyleForNotice = (title: string): { icon: LucideIcon, color: string } => {
    const lower = title.toLowerCase();
    if (/(manipulat|cult|leak|scam|warn|drop|unstable|fake|trap)/.test(lower)) {
      return { icon: ShieldAlert, color: "#ed4245" }; // Discord Red
    }
    if (/(demand|og|shiny|value|guide|info|convert|update)/.test(lower)) {
      return { icon: Info, color: "#5865F2" }; // Discord Blurple
    }
    return { icon: BookOpen, color: "#4e5058" }; // Stealth Gray
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338] h-full select-none font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1B1E; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #111214; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Unified Discord-Style Header */}
      <div className="flex-shrink-0 px-5 py-4 bg-[#2B2D31] border-b border-[rgba(0,0,0,0.2)] shadow-sm z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] flex items-center justify-center shadow-inner shrink-0">
            <Megaphone className="w-5 h-5 text-[#5865F2]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">Market Intelligence</span>
            <h2 className="text-[17px] font-black text-[#F2F3F5] tracking-tight">Extra Notices</h2>
          </div>
        </div>

        {notices.length > 0 && (
          <div className="relative w-full sm:w-[260px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80848E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements..."
              className="w-full bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-full pl-9 pr-4 py-2 text-[13px] text-[#F2F3F5] outline-none placeholder-[#80848E] focus:ring-1 focus:ring-[#5865F2] focus:border-[#5865F2] transition-all shadow-inner"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6 flex flex-col gap-6">
        
        {/* Fire Zio Channel Banner */}
        <div className="bg-[#111214] border-l-4 border-l-[#ed4245] border-y border-y-[rgba(255,255,255,0.04)] border-r border-r-[rgba(255,255,255,0.04)] rounded-r-[8px] p-4 shadow-inner flex items-start gap-4">
           <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e1f22]" alt="Fire Zio" />
           <div className="flex flex-col gap-1">
             <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Briefing</span>
             <p className="text-[#949BA4] text-[13px] italic font-medium leading-relaxed">
               "Read these notices before you open your mouth in the trading channels. If you ask a question that is already answered here, don't expect me to be nice about it."
             </p>
           </div>
        </div>

        {processedNotices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-60 mt-10">
            <div className="w-16 h-16 bg-[#2B2D31] rounded-full flex items-center justify-center border border-[rgba(255,255,255,0.04)] mb-4">
              <Inbox className="w-8 h-8 text-[#4e5058]" />
            </div>
            <p className="text-[#F2F3F5] text-[15px] font-bold tracking-tight">
              {notices.length === 0 ? "No Active Notices" : "No Matches Found"}
            </p>
            <p className="text-[#949BA4] text-[13px] mt-1.5 max-w-sm text-center leading-relaxed">
              {notices.length === 0 ? "Check back later for official market updates and rules from the Value List Team." : "Try adjusting your keywords to find what you're looking for."}
            </p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 xl:columns-3 gap-5 animate-fade-in pb-4">
            {processedNotices.map((notice, idx) => {
              const { icon: Icon, color } = getStyleForNotice(notice.title);
              const isPinned = pinnedTitles[notice.title];
              const activeColor = isPinned ? "#FAA61A" : color;

              return (
                <TiltCard 
                  key={idx} 
                  color={activeColor} 
                  className="break-inside-avoid mb-5 group"
                >
                  <div 
                    className="flex flex-col h-full relative z-10 border-l-[3px] rounded-r-[8px] transition-colors duration-300 border-y border-r shadow-sm overflow-hidden"
                    style={{ 
                      borderLeftColor: activeColor,
                      backgroundColor: isPinned ? "rgba(250,166,26,0.04)" : "#1E1F22",
                      borderTopColor: "rgba(255,255,255,0.03)",
                      borderRightColor: "rgba(255,255,255,0.03)",
                      borderBottomColor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    
                    {/* Header Row */}
                    <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-[rgba(255,255,255,0.03)] bg-[rgba(0,0,0,0.1)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: activeColor }} />
                        <h3 className="text-[14px] font-black text-[#F2F3F5] tracking-tight uppercase truncate">
                          {notice.title}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {notice.date && (
                          <span className="text-[10px] font-mono font-bold text-[#80848E] bg-[rgba(255,255,255,0.03)] px-2 py-1 rounded-[4px] border border-[rgba(255,255,255,0.05)]">
                            {notice.date}
                          </span>
                        )}
                        <button
                          onClick={(e) => togglePin(notice.title, e)}
                          title={isPinned ? "Unpin notice" : "Pin notice"}
                          className={`p-1.5 rounded-[4px] transition-all focus-visible:outline-none ${
                            isPinned 
                              ? "bg-[rgba(250,166,26,0.15)] text-[#FAA61A] opacity-100 border border-[rgba(250,166,26,0.3)]" 
                              : "text-[#4e5058] hover:text-[#DBDEE1] hover:bg-[rgba(255,255,255,0.05)] opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Content Body */}
                    <div className="p-5 text-[13px] text-[#B5BAC1] leading-[1.65] whitespace-pre-wrap flex-1">
                      {notice.content}
                    </div>

                  </div>
                </TiltCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}