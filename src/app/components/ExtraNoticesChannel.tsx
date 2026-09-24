// ================================================
// FILE: src/app/components/ExtraNoticesChannel.tsx
// ================================================

import React, { useState, useMemo } from "react";
import { Info, BookOpen, ShieldAlert, LucideIcon, Inbox, Search, Pin, Megaphone, Filter } from "lucide-react";
import { useUnits } from "../../context/UnitContext";

const FIRE_ZIO_AVATAR = "/units/firezio.webp";

export function ExtraNoticesChannel() {
  const { notices } = useUnits();
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedTitles, setPinnedTitles] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<"all" | "pinned">("all");

  const togglePin = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedTitles(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const processedNotices = useMemo(() => {
    if (!notices) return [];

    let filtered = notices.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (activeFilter === "pinned") {
      filtered = filtered.filter(n => pinnedTitles[n.title]);
    }

    return [...filtered].sort((a, b) => {
      const aPinned = pinnedTitles[a.title] ? 1 : 0;
      const bPinned = pinnedTitles[b.title] ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [notices, searchQuery, pinnedTitles, activeFilter]);

  const getStyleForNotice = (title: string): { icon: LucideIcon, color: string } => {
    const lower = title.toLowerCase();
    if (/(manipulat|cult|leak|scam|warn|drop|unstable|fake|trap)/.test(lower)) {
      return { icon: ShieldAlert, color: "var(--destructive)" };
    }
    if (/(demand|og|shiny|value|guide|info|convert|update)/.test(lower)) {
      return { icon: Info, color: "var(--primary)" };
    }
    return { icon: BookOpen, color: "var(--muted-foreground)" }; 
  };

  return (
    <div className="flex-1 w-full h-full font-sans relative overflow-hidden flex flex-col bg-background">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      `}</style>

      <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto w-full h-full p-6 md:p-8 overflow-hidden">

        {/* Sidebar Navigation now hides on lg (1024px) to make room for calculator overlay */}
        <nav className="hidden lg:flex flex-col w-64 shrink-0 sticky top-0 self-start pt-2 z-10">
          <div className="flex items-center gap-2.5 mb-6 text-foreground">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="text-[15px] font-black uppercase tracking-wider">Intelligence</h2>
          </div>

          <div className="flex flex-col gap-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices..."
                className="w-full bg-input border border-border rounded-[4px] pl-9 pr-4 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary transition-colors shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-1 border-l-2 border-border pl-4">
              <button 
                onClick={() => setActiveFilter("all")} 
                className={`text-left text-[13px] font-bold py-1.5 transition-colors focus-visible:outline-none flex items-center justify-between cursor-pointer ${activeFilter === "all" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                All Notices
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-[2px] font-mono border border-border">{notices?.length || 0}</span>
              </button>
              <button 
                onClick={() => setActiveFilter("pinned")} 
                className={`text-left text-[13px] font-bold py-1.5 transition-colors focus-visible:outline-none flex items-center justify-between cursor-pointer ${activeFilter === "pinned" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Pinned Highlights
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-[2px] font-mono border border-border">{Object.values(pinnedTitles).filter(Boolean).length}</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Added min-w-0 to prevent flexbox crushing */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-16 flex flex-col gap-8 z-10 min-w-0">

          {/* Intro */}
          <div className="flex flex-col gap-3">
            <h1 className="text-[28px] md:text-[32px] font-black text-foreground tracking-tight">Extra Notices</h1>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-3xl font-medium">
              Official market updates, manipulation warnings, and trading guidelines directly from the Value List Team.
            </p>
          </div>

          {/* Fire Zio's Briefing */}
          <div className="bg-card border border-border rounded-[6px] p-5 flex items-start gap-4 shadow-sm">
            <img src={FIRE_ZIO_AVATAR} className="w-12 h-12 rounded-[4px] object-cover shrink-0 border border-border" alt="Fire Zio" />
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-bold text-foreground uppercase tracking-widest">Fire Zio's Briefing</span>
              <p className="text-muted-foreground text-[14px] leading-relaxed italic">
                "Read these notices before you open your mouth in the trading channels. If you ask a question that is already answered here, don't expect me to be nice about it."
              </p>
            </div>
          </div>

          {/* Notices Feed */}
          {processedNotices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-border rounded-[6px] bg-muted">
              <div className="w-12 h-12 bg-card rounded-[4px] border border-border flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-foreground text-[15px] font-bold tracking-tight">
                {notices.length === 0 ? "No Active Notices" : "No Matches Found"}
              </p>
              <p className="text-muted-foreground text-[13px] mt-1 text-center max-w-sm">
                {notices.length === 0 
                  ? "Check back later for official market updates and rules." 
                  : "Try adjusting your search keywords or clear your pinned filter."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {processedNotices.map((notice, idx) => {
                const { icon: Icon, color } = getStyleForNotice(notice.title);
                const isPinned = pinnedTitles[notice.title];
                const activeColor = isPinned ? "#FAA61A" : color;

                return (
                  <article 
                    key={idx} 
                    className="group relative bg-card border border-border rounded-[6px] overflow-hidden transition-colors hover:border-muted-foreground"
                  >
                    {/* Semantic left border indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: activeColor }} />

                    <div className="p-5 pl-6 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-[4px] bg-muted border border-border">
                            <Icon className="w-4 h-4" style={{ color: activeColor }} />
                          </div>
                          <h3 className="text-[15px] font-bold text-foreground tracking-tight">
                            {notice.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {notice.date && (
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                              {notice.date}
                            </span>
                          )}
                          <button
                            onClick={(e) => togglePin(notice.title, e)}
                            title={isPinned ? "Unpin notice" : "Pin notice"}
                            className={`p-1.5 rounded-[4px] transition-colors focus-visible:outline-none cursor-pointer border ${
                              isPinned 
                                ? "bg-muted text-[#FAA61A] border-[#FAA61A]/30" 
                                : "bg-transparent border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border"
                            }`}
                          >
                            <Pin className={`w-4 h-4 ${isPinned ? "fill-current" : ""}`} />
                          </button>
                        </div>
                      </div>

                      <div className="text-[14px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium">
                        {notice.content}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}