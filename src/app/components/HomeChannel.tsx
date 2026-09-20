import { useState, useMemo, useEffect } from "react";
import { ExternalLink, Users, Wrench, ChevronRight, Code2, Check, Sparkles, Terminal, MessageSquarePlus, FileSpreadsheet } from "lucide-react";
import { useUnits } from "../../context/UnitContext";

const FIRE_ZIO_AVATAR = "/units/firezio.webp";

function CreditBadge({ name, color }: { name: string; color: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button 
      onClick={handleCopy} 
      title="Click to copy name" 
      className="bg-[#1e2124] hover:bg-[#36393e] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 rounded-[4px] text-[12px] font-bold shadow-sm transition-colors active:scale-95 flex items-center justify-center min-w-[60px]" 
      style={{ 
        color: copied ? "#FFFFFF" : "#DBDEE1", 
        backgroundColor: copied ? color : undefined,
        borderColor: copied ? color : "rgba(255,255,255,0.04)"
      }}
    >
      <span className="flex items-center gap-1.5">
        {copied && <Check className="w-3.5 h-3.5" />}
        {name}
      </span>
    </button>
  );
}

// Discord-style clean embed panel with proper separation lines and borders
function InfoPanel({ title, icon: Icon, iconUrl, color, children, className = "" }: any) {
  return (
    <div className={`bg-[#36393e] border border-[rgba(255,255,255,0.06)] rounded-[8px] flex flex-col relative overflow-hidden shadow-md ${className}`}>
      <div className="absolute top-0 left-0 right-0 h-[4px]" style={{ backgroundColor: color }} />
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center gap-2.5 mb-3 border-b border-[rgba(255,255,255,0.08)] pb-3">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="w-5 h-5 rounded-[4px] object-cover" />
          ) : (
            <Icon className="w-4 h-4" style={{ color }} />
          )}
          <h3 className="text-[13px] font-black text-[#F2F3F5] uppercase tracking-widest">{title}</h3>
        </div>
        <div className="flex-1 flex flex-col text-[13px] text-[#DBDEE1] leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export function HomeChannel({ guideState }: { guideState?: { type: string | null; step: number } }) {
  const [activeHomeTab, setActiveHomeTab] = useState<"info" | "updates" | "credits">("info");
  const { changelog } = useUnits();
  
  useEffect(() => {
    if (guideState?.type === "developer") setActiveHomeTab("credits");
  }, [guideState]);

  const [secretClicks, setSecretClicks] = useState(0);
  const [secretUnlocked, setSecretUnlocked] = useState(false);
  const [secretQuoteIndex, setSecretQuoteIndex] = useState(0);

  const secretQuotes = [
    "Why is Cody fat asl",
    "The cult of Fire ZIO will never be forgotten...",
    "DENJI AND TOSHIRO ARE NEVER GETTING THEIR EVO",
    "Stop trying to impregnate the calculator Alu",
    "GRRs were duped stopped trying to overpay for them"
  ];

  const handleSecretClick = () => {
    const next = secretClicks + 1;
    setSecretClicks(next);
    if (next >= 5) {
      setSecretUnlocked(true);
      setSecretQuoteIndex((prev) => (prev + 1) % secretQuotes.length);
    }
  };

  const parsedChangelog = useMemo(() => {
    if (!changelog || changelog.length === 0) return [];
    const blocks: { title: string; lines: string[] }[] = [];
    let currentBlock = { title: "Recent Changes", lines: [] as string[] };

    for (let i = 0; i < changelog.length; i++) {
      const clean = changelog[i].trim();
      if (!clean || clean.match(/^[-_]{3,}$/)) continue;
      const isHeader = i + 1 < changelog.length && changelog[i + 1].trim().match(/^[-_]{3,}$/);
      if (isHeader) {
        if (currentBlock.lines.length > 0) blocks.push({ ...currentBlock });
        currentBlock = { title: clean, lines: [] };
      } else {
        currentBlock.lines.push(clean);
      }
    }
    if (currentBlock.lines.length > 0) blocks.push(currentBlock);
    return blocks;
  }, [changelog]);

  const exStaffList = [
    "Ded_Sen", "Crimson Desire", "Brysans", "SquidyMotion", "Luk", "Hero", "soupermunki", "dennis.67", "hopper duper", "Poxie", "Iridescent Equinox", "Pchongle", "unobium", "Demonfox", "GorillaTactics92", "MicroJillyWilly", "Doggod", "kosu", "Paker", "Kiwami", "brogee", "Leo", "arkss", "Trvz", "Up", "Vantagehgc", "fortnitekid", "Mikoto", "En Thobias12", "Miro_y", "arkysesh", "brickz7", "Venus", "AdamSBDG7", "halw", "NathanPlayz", "orangehairfunnyman", "olivia.rodrigo", "Felta", "VerotObelyn", "Kyo"
  ];

  const foundedByIcon = "/units/astd.webp";
  const valueListTeamIcon = "/units/value-list.webp";
  const qualityAssuranceIcon = "/units/quality-assurance.webp";
  const creditsBottomImage = "/units/all-star.webp";
  const generalInformationIcon = "/units/firezio.webp";
  const teamNotesIcon = "/units/firezio.webp";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338] h-full select-none font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #282b30; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e2124; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
      `}</style>

      {/* TABS */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-[rgba(0,0,0,0.22)] bg-[#282b30]">
        <div className="flex bg-[#1e2124] rounded-[6px] p-1 w-full md:w-fit justify-between items-center shadow-inner border border-[rgba(255,255,255,0.04)]">
          <div className="flex gap-0.5">
            <button onClick={() => setActiveHomeTab("info")} className={`px-6 py-1.5 rounded-[4px] text-[12px] font-bold transition-colors ${activeHomeTab === "info" ? "bg-[#7289da] text-white shadow-sm" : "text-[#B5BAC1] hover:text-[#DBDEE1] hover:bg-[#36393e]"}`}>General Info</button>
            <button onClick={() => setActiveHomeTab("updates")} className={`px-6 py-1.5 rounded-[4px] text-[12px] font-bold transition-colors ${activeHomeTab === "updates" ? "bg-[#7289da] text-white shadow-sm" : "text-[#B5BAC1] hover:text-[#DBDEE1] hover:bg-[#36393e]"}`}>Patch Notes</button>
            <button onClick={() => setActiveHomeTab("credits")} className={`px-6 py-1.5 rounded-[4px] text-[12px] font-bold transition-colors ${activeHomeTab === "credits" ? "bg-[#7289da] text-white shadow-sm" : "text-[#B5BAC1] hover:text-[#DBDEE1] hover:bg-[#36393e]"}`}>Credits</button>
          </div>
          <button onClick={handleSecretClick} title="Terminal" className="ml-3 px-2 py-1 text-[#80848E] hover:text-[#DBDEE1] hover:bg-[#36393e] rounded-[4px] transition-colors focus-visible:outline-none">
            <Terminal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {secretUnlocked && (
        <div className="mx-4 md:mx-6 mt-4 bg-[#1e2124] border-l-4 border-l-[#FAA61A] border border-[rgba(255,255,255,0.04)] p-3 rounded-r-[6px] text-[#DBDEE1] flex items-center justify-center shadow-sm animate-fade-in text-[12px] font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#FAA61A]">&gt;</span>
            <span>{secretQuotes[secretQuoteIndex]}</span>
          </div>
          <button onClick={() => setSecretUnlocked(false)} className="text-[#80848E] hover:text-[#F2F3F5] transition-colors ml-4">Close</button>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 flex flex-col gap-5">
        
        {/* GENERAL INFO */}
        {activeHomeTab === "info" && (
          <div className="flex flex-col gap-5 animate-fade-in pb-4">
            
            {/* Fire Zio's General Info Note with proper borders */}
            <div className="bg-[#282b30] border border-[rgba(255,255,255,0.06)] border-l-4 border-l-[#424549] rounded-[8px] p-4 flex items-start gap-4 shadow-sm">
               <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.1)] object-cover shrink-0" alt="Fire Zio" />
               <div className="flex flex-col gap-1">
                 <span className="text-[11px] font-black uppercase tracking-widest text-[#B5BAC1]">Fire Zio's Briefing</span>
                 <p className="text-[#DBDEE1] text-[13px] font-medium leading-relaxed">
                   "Read the info before asking stupid questions in chat. Yes, values are estimates based on community trades. No, we aren't psychic. Use your brain."
                 </p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="flex flex-col gap-4">
                <InfoPanel title="General Information" iconUrl={generalInformationIcon} color="#7289da">
                  <p className="mb-4">
                    Everything shown in this Value List is an estimation from this Value List's Team made from community's trades. Our changes can be inaccurate sometimes, although this Value List is currently the most reliable source of values for ASTD.
                  </p>
                </InfoPanel>

                <InfoPanel title="Spreadsheet Reliance & Usage" icon={FileSpreadsheet} color="#7289da">
                  <p className="mb-4">
                    This web platform operates entirely in reliance on the official value list spreadsheet as its live data backend. <strong>The original spreadsheet remains fully active and continues to be updated regularly</strong> by the team. 
                  </p>
                  <div className="bg-[#1e2124] p-3 rounded-[6px] border border-[rgba(255,255,255,0.04)] mb-4">
                    <p className="text-[12px] text-[#B5BAC1] leading-relaxed">
                      This website is provided purely as an <strong>alternative interface</strong> featuring built-in calculators and search tools. Veteran users who prefer the traditional spreadsheet are never forced to use this website.
                    </p>
                  </div>
                  <div className="mt-auto">
                    <a href="https://docs.google.com/spreadsheets/d/1Z20NUscF9Id2Sss-osT-Xq06gz9ooikt6Kjtianeg0I/edit?gid=163005933#gid=163005933" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 text-[12px] font-bold text-white bg-[#23a559] hover:bg-[#1f914e] px-4 py-2.5 rounded-[4px] transition-colors w-full shadow-sm">
                      Access Original Google Spreadsheet <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </InfoPanel>
              </div>

              <div className="flex flex-col gap-4">
                <InfoPanel title="Value List Team's Note" iconUrl={teamNotesIcon} color="#424549">
                  <p className="mb-4">
                    Recently, it has been common of traders on win/loss, in our discord server, associating one bad offer/trade, which can come from a multitude of reasons, with the specific unit dropping, creating a trend which other traders follow, causing the unit to be panic traded and dropped.
                  </p>
                  <div className="bg-[#1e2124] border-l-2 border-[#FAA61A] p-3 rounded-r-[6px] mb-4 border border-[rgba(255,255,255,0.04)]">
                    <p className="text-[12px] text-[#FAA61A] font-medium leading-relaxed italic">
                      "We would like to remind such behavior causes the market to be extremely unstable, causing many units to crash without any previous reason, so we from the Value List Team recommend traders to analyse the market before wrongly assuming the situation of the unit."
                    </p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.06)]">
                    <span className="text-[11px] font-bold text-[#80848E] uppercase tracking-widest">Recommendation:</span>
                    <span className="ml-2 text-[12px] text-[#DBDEE1]">Stay calm and verify trades with the analyzer!</span>
                  </div>
                </InfoPanel>

                <InfoPanel title="Community & Feedback" icon={MessageSquarePlus} color="#7289da">
                  <p className="mb-4">
                    Engage with the trading community on Discord or submit bug reports, data corrections, and feature suggestions directly to the team via our feedback form.
                  </p>
                  <div className="mt-auto flex flex-col gap-2.5">
                    <a href="https://discord.gg/Q7JTvPUEM" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 text-[12px] font-bold text-white bg-[#7289da] hover:bg-[#5b73c7] px-4 py-2.5 rounded-[4px] transition-colors shadow-sm">
                      Join the Value List Discord <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a href="https://docs.google.com/forms/d/e/1FAIpQLSeUAAvBHod23it13WYD8XK61K2C-BFCWJ8tGwJxA7c0sCCVvA/viewform?usp=header" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 text-[12px] font-bold text-[#DBDEE1] bg-[#282b30] hover:bg-[#36393e] px-4 py-2.5 rounded-[4px] transition-colors border border-[rgba(255,255,255,0.04)]">
                      <MessageSquarePlus className="w-3.5 h-3.5 text-[#7289da]" /> Bugs, Reports & Suggestions Form
                    </a>
                  </div>
                </InfoPanel>
              </div>
            </div>
          </div>
        )}

        {/* PATCH NOTES */}
        {activeHomeTab === "updates" && (
          <div className="flex flex-col gap-5 animate-fade-in pb-4">
            
            <div className="bg-[#282b30] border border-[rgba(255,255,255,0.06)] border-l-4 border-l-[#424549] rounded-[8px] p-4 flex items-start gap-4 shadow-sm">
               <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.1)] object-cover shrink-0" alt="Fire Zio" />
               <div className="flex flex-col gap-1">
                 <span className="text-[11px] font-black uppercase tracking-widest text-[#B5BAC1]">Fire Zio's Update Log</span>
                 <p className="text-[#DBDEE1] text-[13px] font-medium leading-relaxed">
                   "Check the patch notes before you start complaining about values changing. The meta shifts, units get adjusted, and if you can't keep up, you'll stay broke."
                 </p>
               </div>
            </div>

            <div>
              {parsedChangelog.length === 0 ? (
                <div className="bg-[#36393e] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-8 text-center text-[#80848E] text-[13px]">
                  No recent updates logged in the spreadsheet.
                </div>
              ) : (
                <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
                  {parsedChangelog.map((block, idx) => {
                    const colors = ["#7289da", "#424549", "#7289da", "#424549"];
                    const color = colors[idx % colors.length];
                    return (
                      <InfoPanel key={idx} title={block.title} icon={block.title.toLowerCase().includes("fix") ? Wrench : ChevronRight} color={color} className="break-inside-avoid mb-4">
                        <ul className="flex flex-col gap-2">
                          {block.lines.map((line, lIdx) => (
                            <li key={lIdx} className="flex gap-2 items-start bg-[#1e2124] p-2.5 rounded-[6px] border border-[rgba(255,255,255,0.04)]">
                              <span className="text-[#7289da] select-none font-bold">•</span>
                              <span className="text-[12px] text-[#DBDEE1]">{line.replace(/^-*\s*/, "")}</span>
                            </li>
                          ))}
                        </ul>
                      </InfoPanel>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREDITS */}
        {activeHomeTab === "credits" && (
          <div className="flex flex-col gap-5 animate-fade-in pb-8">
            
            <div className="bg-[#282b30] border border-[rgba(255,255,255,0.06)] border-l-4 border-l-[#424549] rounded-[8px] p-4 flex items-start gap-4 shadow-sm">
               <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[rgba(255,255,255,0.1)] object-cover shrink-0" alt="Fire Zio" />
               <div className="flex flex-col gap-1">
                 <span className="text-[11px] font-black uppercase tracking-widest text-[#B5BAC1]">Fire Zio's Recognition</span>
                 <p className="text-[#DBDEE1] text-[13px] font-medium leading-relaxed">
                   "These are the people who keep the list running so you don't completely ruin the game economy. Show some respect to the contributors."
                 </p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              
              {/* DEVELOPER */}
              <div className={`col-span-1 md:col-span-2 xl:col-span-3 bg-[#36393e] border rounded-[8px] flex flex-col sm:flex-row items-center sm:items-start p-6 gap-6 shadow-md ${guideState?.type === "developer" ? "border-[#7289da]" : "border-[rgba(255,255,255,0.06)]"}`}>
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#282b30] overflow-hidden shrink-0 shadow-inner">
                  <img src="/units/reiyven.webp" alt="Reiyven" draggable={false} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
                  <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-1.5">
                    <h4 className="text-[20px] font-black text-[#F2F3F5] tracking-tight">Reiyven</h4>
                    <span className="bg-[#7289da]/15 text-[#7289da] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border border-[#7289da]/30 flex items-center gap-1.5">
                      <Code2 className="w-3 h-3" /> Lead Web Developer
                    </span>
                  </div>
                  <p className="text-[12px] font-bold text-[#B5BAC1] mb-3 uppercase tracking-wide">Raven • 3rd Year BSCS @ PHILIPPINES</p>
                  <p className="text-[13px] text-[#DBDEE1] leading-relaxed max-w-2xl bg-[#1e2124] p-3 rounded-[6px] border border-[rgba(255,255,255,0.04)] shadow-inner">
                    Architect and lead engineer of the ASTD Value List web platform. Combined a background in computer science and game development to build the responsive layout, advanced parsing engine, and trading tools for the community.
                  </p>
                </div>
              </div>

              <InfoPanel title="List Founded By" iconUrl={foundedByIcon} color="#7289da">
                <div className="flex flex-wrap gap-2">
                  <CreditBadge name="EpicInfinity" color="#7289da" />
                  <CreditBadge name="Soupermunki" color="#7289da" />
                </div>
              </InfoPanel>

              <InfoPanel title="Value List Team" iconUrl={valueListTeamIcon} color="#7289da">
                <div className="flex flex-wrap gap-2">
                  {["Batata_Uy142", "Gabe", "Goofyismad", "Azking", "Codythechickenman", "Suns_Radiance", "Vex"].map((n) => (
                    <CreditBadge key={n} name={n} color="#7289da" />
                  ))}
                </div>
              </InfoPanel>

              <InfoPanel title="Quality Assurance" iconUrl={qualityAssuranceIcon} color="#23a559">
                <div className="flex flex-wrap gap-2">
                  {["aezkmi.", "Dark", "dummy", "george", "JC", "kushu", "plouf", "YuZO"].map((n) => (
                    <CreditBadge key={n} name={n} color="#23a559" />
                  ))}
                </div>
              </InfoPanel>

              <div className="col-span-1 md:col-span-2 xl:col-span-3 bg-[#36393e] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-5 shadow-md">
                <div className="flex items-center gap-2 mb-4 border-b border-[rgba(255,255,255,0.08)] pb-3">
                  <Users className="w-4 h-4 text-[#B5BAC1]" />
                  <h3 className="text-[13px] font-black text-[#B5BAC1] uppercase tracking-widest">Ex-Staff Contributors</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {exStaffList.map((n) => (
                    <CreditBadge key={n} name={n} color="#424549" />
                  ))}
                </div>
              </div>

            </div>

            <div className="mt-2 flex justify-center">
              <div className="relative w-full max-w-5xl overflow-hidden rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-[#282b30] shadow-md">
                <img src={creditsBottomImage} alt="ASTD Value List" draggable={false} className="block w-full h-auto object-contain opacity-90" loading="lazy" />
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}