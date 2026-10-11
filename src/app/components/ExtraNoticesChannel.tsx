import React, { useState, useMemo } from "react";
import { useUnits } from "../../context/UnitContext";
import { getUnitAssetUrl } from "../../data/helpers";

// Inline SVG icons — no lucide-react
const IconInfo = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const IconShield = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconBook = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const IconInbox = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);
const IconSearch = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconPin = ({ className, style, filled }: { className?: string; style?: React.CSSProperties; filled?: boolean }) => (
  <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
  </svg>
);
const IconMegaphone = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

type IconComponent = (props: { className?: string; style?: React.CSSProperties }) => React.ReactElement;

const FIRE_ZIO_AVATAR = getUnitAssetUrl("firezio") || "";

export function ExtraNoticesChannel() {
  const { notices } = useUnits();
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedTitles, setPinnedTitles] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<"all" | "pinned">("all");

  const togglePin = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedTitles((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const processedNotices = useMemo(() => {
    if (!notices) return [];

    let filtered = notices.filter(
      (n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (activeFilter === "pinned") {
      filtered = filtered.filter((n) => pinnedTitles[n.title]);
    }

    return [...filtered].sort((a, b) => {
      const aPinned = pinnedTitles[a.title] ? 1 : 0;
      const bPinned = pinnedTitles[b.title] ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [notices, searchQuery, pinnedTitles, activeFilter]);

  const getStyleForNotice = (
    title: string
  ): { icon: IconComponent; color: string } => {
    const lower = title.toLowerCase();
    if (/(manipulat|cult|leak|scam|warn|drop|unstable|fake|trap)/.test(lower)) {
      return { icon: IconShield, color: "var(--destructive)" };
    }
    if (/(demand|og|shiny|value|guide|info|convert|update)/.test(lower)) {
      return { icon: IconInfo, color: "var(--primary)" };
    }
    return { icon: IconBook, color: "var(--muted-foreground)" };
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
            <IconMegaphone className="w-5 h-5 text-primary" />
            <h2 className="text-[15px] font-black uppercase tracking-wider">
              Intelligence
            </h2>
          </div>

          <div className="flex flex-col gap-6">
            <div className="relative w-full">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                className={`text-left text-[13px] font-bold py-1.5 transition-colors focus-visible:outline-none flex items-center justify-between cursor-pointer ${
                  activeFilter === "all"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Notices
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-[2px] font-mono border border-border">
                  {notices?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setActiveFilter("pinned")}
                className={`text-left text-[13px] font-bold py-1.5 transition-colors focus-visible:outline-none flex items-center justify-between cursor-pointer ${
                  activeFilter === "pinned"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pinned Highlights
                <span className="text-[10px] bg-muted px-2 py-0.5 rounded-[2px] font-mono border border-border">
                  {Object.values(pinnedTitles).filter(Boolean).length}
                </span>
              </button>
            </div>
          </div>
        </nav>

        {/* Added min-w-0 to prevent flexbox crushing */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-16 flex flex-col gap-8 z-10 min-w-0">
          {/* Intro */}
          <div className="flex flex-col gap-3">
            <h1 className="text-[28px] md:text-[32px] font-black text-foreground tracking-tight">
              Extra Notices
            </h1>
            <p className="text-[15px] text-muted-foreground leading-relaxed max-w-3xl font-medium">
              Official market updates, manipulation warnings, and trading
              guidelines directly from the Value List Team.
            </p>
          </div>

          {/* Fire Zio's Briefing */}
          <div className="bg-card border border-border rounded-[6px] p-5 flex items-start gap-4 shadow-sm">
            <img
              src={FIRE_ZIO_AVATAR}
              className="w-12 h-12 rounded-[4px] object-cover shrink-0 border border-border"
              alt="Fire Zio"
            />
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-bold text-foreground uppercase tracking-widest">
                Fire Zio's Briefing
              </span>
              <p className="text-muted-foreground text-[14px] leading-relaxed italic">
                "Read these notices before you open your mouth in the trading
                channels. If you ask a question that is already answered here,
                don't expect me to be nice about it."
              </p>
            </div>
          </div>

          {/* Notices Feed */}
          {processedNotices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-border rounded-[6px] bg-muted">
              <div className="w-12 h-12 bg-card rounded-[4px] border border-border flex items-center justify-center mb-3">
                <IconInbox className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-foreground text-[15px] font-bold tracking-tight">
                {notices.length === 0
                  ? "No Active Notices"
                  : "No Matches Found"}
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
                    className="group relative bg-card border border-border rounded-[6px] overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:-translate-y-[2px]"
                  >
                    {/* Semantic left border indicator */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[4px]"
                      style={{ backgroundColor: activeColor }}
                    />

                    <div className="p-5 pl-6 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-[4px] bg-muted border border-border overflow-hidden">
                            <Icon
                              className="w-4 h-4 group-hover:scale-110 transition-transform duration-300"
                              style={{ color: activeColor }}
                            />
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
                            <IconPin
                              className="w-4 h-4"
                              filled={isPinned}
                            />
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


