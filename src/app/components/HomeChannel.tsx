import { useState, useMemo, useEffect } from "react";
import { ExternalLink, Users, Wrench, ChevronRight, Code2, Check, Sparkles, Terminal, Eye } from "lucide-react";
import { useUnits } from "../../context/UnitContext";
import { TiltCard } from "./ui/TiltCard";

const FIRE_ZIO_AVATAR = "https://media.discordapp.net/attachments/1538970612947615744/1543320682430074971/image.png?ex=6a9470e4&is=6a931f64&hm=d97c87c7af214b524fdd41b313db6a4d45d5cf435046fc9a8a14fb307d258165&=&format=webp&quality=lossless";

function CreditBadge({ name, color }: { name: string; color: string }) {
  const [copied, setCopied] = useState(false);
  const [sparks, setSparks] = useState<{ id: number; tx: number; ty: number }[]>([]);

  const handleCopy = () => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    const newSparks = Array.from({ length: 8 }).map((_, i) => {
      const angle = i * 45 + Math.random() * 20;
      const distance = 25 + Math.random() * 15;
      return { id: Date.now() + i, tx: Math.cos((angle * Math.PI) / 180) * distance, ty: Math.sin((angle * Math.PI) / 180) * distance };
    });
    setSparks(newSparks);
    setTimeout(() => setCopied(false), 1500);
    setTimeout(() => setSparks([]), 600);
  };

  return (
    <button onClick={handleCopy} title="Click to copy name" className="relative bg-[#1E1F22] border px-2.5 py-1 rounded-[6px] text-[12px] font-semibold shadow-sm transition-all duration-300 ease-out active:scale-95 flex items-center justify-center min-w-[60px]" style={{ color: copied ? color : "#DBDEE1", borderColor: copied ? color : "rgba(255,255,255,0.04)", boxShadow: copied ? `0 4px 16px ${color}40` : "none", zIndex: copied ? 10 : 1 }}>
      {sparks.map((s) => (
        <span key={s.id} className="absolute w-1.5 h-1.5 rounded-full pointer-events-none animate-spark" style={{ backgroundColor: color, "--tx": `${s.tx}px`, "--ty": `${s.ty}px`, left: "50%", top: "50%", marginLeft: "-3px", marginTop: "-3px" } as React.CSSProperties} />
      ))}
      <span className={`flex items-center gap-1.5 transition-transform duration-300 ${copied ? "scale-105" : "scale-100"}`}>
        {copied && <Check className="w-3.5 h-3.5" />}
        {name}
      </span>
    </button>
  );
}

export function HomeChannel({ guideState }: { guideState?: { type: string | null; step: number } }) {
  const [activeHomeTab, setActiveHomeTab] = useState<"info" | "updates" | "credits">("info");
  const { changelog } = useUnits();
  const [devSpin, setDevSpin] = useState(0);
  
  // Force tab switch if developer guide is active
  useEffect(() => {
    if (guideState?.type === "developer") {
      setActiveHomeTab("credits");
    }
  }, [guideState]);

  // Easter Egg States
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

  const foundedByIcon = "https://media.discordapp.net/attachments/1538970612947615744/1543314410746155150/image.png?ex=6a946b0c&is=6a93198c&hm=51430aa6e9cd47b68758c044e97cf0489e0bbaabd594aa63189d08d49450d890&=&format=webp&quality=lossless";
  const valueListTeamIcon = "https://media.discordapp.net/attachments/1538970612947615744/1543314384023986226/image.png?ex=6a946b06&is=6a931986&hm=60138cd9ac5603cc1387293edb084c6dc68b972b154fb59d6de4ac4861e4e160&=&format=webp&quality=lossless";
  const qualityAssuranceIcon = "https://media.discordapp.net/attachments/1538970612947615744/1543314746856575107/thumb-up-emoticon.png?ex=6a946b5d&is=6a9319dd&hm=1460be857471c25b9e78c5292074bdfc01ce9ae89f27cfc985187f064386af73&=&format=webp&quality=lossless";
  const creditsBottomImage = "https://media.discordapp.net/attachments/1538970612947615744/1543311617964384398/noFilter.png?ex=6a946873&is=6a9316f3&hm=6d880653890bffc43446aaae20d6fa3da0854ea129516382498a674b48498124&=&format=webp&quality=lossless";
  const generalInformationIcon = "https://media.discordapp.net/attachments/1538970612947615744/1543320682430074971/image.png?ex=6a9470e4&is=6a931f64&hm=d97c87c7af214b524fdd41b313db6a4d45d5cf435046fc9a8a14fb307d258165&=&format=webp&quality=lossless";
  const teamNotesIcon = "https://media.discordapp.net/attachments/1039078990557757471/1543320704269815838/image.png?ex=6a9470e9&is=6a931f69&hm=3d9b2883ec207eb7baa82134c83bfc317160e734e9bfcbdfc7116b6e90f516b1&=&format=webp&quality=lossless";
  const latestPatchNotesIcon = "https://media.discordapp.net/attachments/1538970612947615744/1543321085087326289/image.png?ex=6a947144&is=6a931fc4&hm=6cc9614ab153bc8c54a65f6309c12e53aa37bc55825ba6db4e776e0d71db0f8d&=&format=webp&quality=lossless";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#313338] h-full select-none font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #2B2D31; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1B1E; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes sparkOut { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; } }
        .animate-spark { animation: sparkOut 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* TABS */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-[rgba(255,255,255,0.04)] bg-[#2B2D31]">
        <div className="flex bg-[#1E1F22] rounded-[6px] p-1 border border-[rgba(255,255,255,0.04)] w-full md:w-fit justify-between items-center">
          <div className="flex gap-1">
            <button onClick={() => setActiveHomeTab("info")} className={`px-6 py-1.5 rounded-[4px] text-[12px] font-bold transition-all ${activeHomeTab === "info" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}>General Info</button>
            <button onClick={() => setActiveHomeTab("updates")} className={`px-6 py-1.5 rounded-[4px] text-[12px] font-bold transition-all ${activeHomeTab === "updates" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}>Patch Notes</button>
            <button onClick={() => setActiveHomeTab("credits")} className={`px-6 py-1.5 rounded-[4px] text-[12px] font-bold transition-all ${activeHomeTab === "credits" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}>Credits</button>
          </div>
          <button onClick={handleSecretClick} title="Secret Easter Egg Button" className="ml-3 px-2 py-1 bg-[#111214] hover:bg-[#202225] text-[#FAA61A] rounded-[4px] text-[11px] font-mono flex items-center gap-1 border border-[rgba(250,166,26,0.2)]">
            <Terminal className="w-3 h-3" /> {secretClicks > 0 ? `${secretClicks}/5` : "click here"}
          </button>
        </div>
      </div>

      {secretUnlocked && (
        <div className="mx-4 md:mx-6 mt-3 bg-gradient-to-r from-[#5865F2] to-[#a855f7] p-3 rounded-[8px] text-white flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5 text-[13px] font-bold">
            <Sparkles className="w-4 h-4 text-[#FAA61A] animate-pulse" />
            <span>{secretQuotes[secretQuoteIndex]}</span>
          </div>
          <button onClick={() => setSecretUnlocked(false)} className="text-xs bg-black/20 hover:bg-black/40 px-2 py-1 rounded">Close</button>
        </div>
      )}

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 flex flex-col gap-6">
        
        {/* GENERAL INFO */}
        {activeHomeTab === "info" && (
          <div className="flex flex-col gap-6 animate-fade-in pb-4">
            
            {/* Fire Zio's General Info Note */}
            <div className="bg-[#111214] border-l-4 border-l-[#ed4245] border-y border-y-[rgba(255,255,255,0.04)] border-r border-r-[rgba(255,255,255,0.04)] rounded-r-[8px] p-4 shadow-inner flex items-start gap-4">
               <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e1f22]" alt="Fire Zio" />
               <div className="flex flex-col gap-1">
                 <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Briefing</span>
                 <p className="text-[#949BA4] text-[13px] italic font-medium leading-relaxed">
                   "Read the info before asking stupid questions in chat. Yes, values are estimates based on community trades. No, we aren't psychic. Use your brain."
                 </p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <TiltCard color="#8b7a7a">
                <div className="p-5 md:p-6 flex flex-col h-full relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-[8px] flex items-center justify-center bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] shadow-inner flex-shrink-0 overflow-hidden">
                      <img src={generalInformationIcon} alt="" draggable={false} className="w-full h-full object-cover rounded-[8px]" />
                    </div>
                    <h3 className="text-[15px] font-extrabold text-[#F2F3F5] tracking-tight leading-tight uppercase">General Information</h3>
                  </div>
                  <p className="text-[13px] text-[#DBDEE1] leading-[1.65] mb-6">
                    Everything shown in this Value List is an estimation from this Value List's Team made from community's trades, our changes can be innacurate sometimes, although, this Value List is currently the most reliable source of values for ASTD.
                  </p>
                  <div className="mt-auto flex flex-col gap-3">
                    <a href="https://discord.gg/Q7JTvPUEM" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 text-[12px] font-bold text-white bg-[#5865F2] hover:bg-[#4752C4] px-4 py-2.5 rounded-[6px] transition-colors active:scale-[0.98]">
                      Join the Value List Discord <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <p className="text-[11px] text-[#949BA4] text-center">Think any information is wrong? Make a Support Ticket in our Discord!</p>
                  </div>
                </div>
              </TiltCard>

              <TiltCard color="#8b7a7a">
                <div className="p-5 md:p-6 flex flex-col h-full relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-[8px] flex items-center justify-center bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] shadow-inner flex-shrink-0 overflow-hidden">
                      <img src={teamNotesIcon} alt="" draggable={false} className="w-full h-full object-cover rounded-[8px]" />
                    </div>
                    <h3 className="text-[15px] font-extrabold text-[#F2F3F5] tracking-tight leading-tight uppercase">Value List Team's Note</h3>
                  </div>
                  <p className="text-[13px] text-[#DBDEE1] leading-[1.65] mb-4">
                    Recently, it has been common of traders on win/loss, in our discord server, associating one bad offer/trade, which can come from a multitude of reasons, with the specific unit dropping, creating a trend which other traders follow, causing the unit to be panic traded and dropped.
                  </p>
                  <div className="bg-[#111214] p-3.5 rounded-[8px] border border-[rgba(250,166,26,0.2)] mb-4">
                    <p className="text-[11.5px] text-[#FAA61A] font-medium leading-relaxed italic">
                      "We would like to remind such behavior causes the market to be extremely unstable, causing many units to crash without any previous reason, so we from the Value List Team recommend traders to analyse the market before wrongly assuming the situation of the unit."
                    </p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.04)]">
                    <span className="text-[11px] font-bold text-[#80848E] uppercase tracking-widest">Recommendation:</span>
                    <span className="ml-2 text-[12px] text-[#DBDEE1]">Stay calm and verify trades with the analyzer!</span>
                  </div>
                </div>
              </TiltCard>
            </div>
          </div>
        )}

        {/* PATCH NOTES */}
        {activeHomeTab === "updates" && (
          <div className="flex flex-col gap-6 animate-fade-in pb-4">
            
            {/* Fire Zio's Patch Notes Note */}
            <div className="bg-[#111214] border-l-4 border-l-[#ed4245] border-y border-y-[rgba(255,255,255,0.04)] border-r border-r-[rgba(255,255,255,0.04)] rounded-r-[8px] p-4 shadow-inner flex items-start gap-4">
               <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e1f22]" alt="Fire Zio" />
               <div className="flex flex-col gap-1">
                 <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Update Log</span>
                 <p className="text-[#949BA4] text-[13px] italic font-medium leading-relaxed">
                   "Check the patch notes before you start complaining about values changing. The meta shifts, units get adjusted, and if you can't keep up, you'll stay broke."
                 </p>
               </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-5 bg-[#2B2D31] p-4 rounded-[10px] border border-[rgba(255,255,255,0.04)] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1E1F22] flex items-center justify-center border border-[rgba(255,255,255,0.06)] overflow-hidden">
                    <img src={latestPatchNotesIcon} alt="" draggable={false} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <h3 className="text-[16px] font-black text-[#F2F3F5] tracking-tight uppercase">Latest Patch Notes</h3>
                </div>
              </div>

              {parsedChangelog.length === 0 ? (
                <p className="text-[#80848E] text-sm text-center py-8">No recent updates logged in the spreadsheet.</p>
              ) : (
                <div className="columns-1 md:columns-2 xl:columns-3 gap-4">
                  {parsedChangelog.map((block, idx) => {
                    const colors = ["#949BA4", "#dd7e6b", "#a855f7", "#3b82f6", "#9ca3af", "#8b5cf6", "#23a559", "#FAA61A"];
                    const color = colors[idx % colors.length];
                    return (
                      <TiltCard key={idx} color={color} className="break-inside-avoid mb-4">
                        <div className="p-5 relative z-10">
                          <h3 className="text-[14px] font-extrabold text-[#F2F3F5] uppercase tracking-wider mb-4 border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center gap-2">
                            {block.title.toLowerCase().includes("fix") ? (
                              <Wrench className="w-4 h-4" style={{ color }} />
                            ) : (
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            )}
                            {block.title}
                          </h3>
                          <ul className="flex flex-col gap-3 text-[12px] text-[#DBDEE1]">
                            {block.lines.map((line, lIdx) => (
                              <li key={lIdx} className="flex gap-2 items-start">
                                <ChevronRight className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
                                <span>{line.replace(/^-*\s*/, "")}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </TiltCard>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CREDITS */}
        {activeHomeTab === "credits" && (
          <div className="flex flex-col gap-6 animate-fade-in pb-8">
            
            {/* Fire Zio's Credits Note */}
            <div className="bg-[#111214] border-l-4 border-l-[#ed4245] border-y border-y-[rgba(255,255,255,0.04)] border-r border-r-[rgba(255,255,255,0.04)] rounded-r-[8px] p-4 shadow-inner flex items-start gap-4">
               <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e1f22]" alt="Fire Zio" />
               <div className="flex flex-col gap-1">
                 <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Recognition</span>
                 <p className="text-[#949BA4] text-[13px] italic font-medium leading-relaxed">
                   "These are the people who keep the list running so you don't completely ruin the game economy. Show some respect to the contributors."
                 </p>
               </div>
            </div>

            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                
                {/* DEVELOPER */}
                <TiltCard color="#5865F2" className={`col-span-1 md:col-span-2 xl:col-span-3 mb-2 flex-row items-center sm:items-stretch overflow-hidden ${guideState?.type === "developer" ? "ring-4 ring-[#5865F2] shadow-[0_0_30px_rgba(88,101,242,0.4)] animate-pulse" : ""}`}>
                  <div className="p-6 relative z-10 flex flex-col sm:flex-row items-center gap-6 w-full">
                    <div onClick={() => setDevSpin((prev) => prev + 360)} className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[3px] border-[#2B2D31] shadow-[0_0_0_2px_rgba(237,66,69,0.4),_0_8px_24px_rgba(237,66,69,0.3)] overflow-hidden shrink-0 cursor-pointer" style={{ transform: `rotateY(${devSpin}deg)`, transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }} title="Click me!">
                      <img src="https://media.discordapp.net/attachments/1543674169173221520/1543674222495399936/568438777_4285260958469405_5495238692606870157_n.png?ex=6a95ba26&is=6a9468a6&hm=dd0babf47070b8017b1fb83cb00e9ac41366029d8b9480a7f940faba90b7bc6e&=&format=webp&quality=lossless" alt="Reiyven" draggable={false} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
                      <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-1">
                        <h4 className="text-[22px] font-black text-[#F2F3F5] tracking-tight">Reiyven</h4>
                        <span className="bg-[rgba(237,66,69,0.15)] text-[#ed4245] text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border border-[rgba(237,66,69,0.3)] flex items-center gap-1.5 shadow-sm">
                          <Code2 className="w-3 h-3" /> Lead Web Developer
                        </span>
                      </div>
                      <p className="text-[13px] font-medium text-[#949BA4] mb-3">Raven • 3rd Year BSCS @ PHILIPPINES</p>
                      <p className="text-[13px] text-[#DBDEE1] leading-relaxed max-w-2xl">
                        Architect and lead engineer of the ASTD Value List web platform. Combined a background in computer science and game development to build the responsive layout, advanced parsing engine, and trading tools for the community.
                      </p>
                    </div>
                  </div>
                </TiltCard>

                {/* LIST FOUNDED BY */}
                <TiltCard color="#8b7a7a">
                  <div className="p-6 relative z-10 flex flex-col items-center text-center h-full">
                    <div className="relative w-12 h-12 rounded-full bg-[#111214] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4 shadow-sm overflow-hidden group-hover:scale-110 transition-transform duration-300">
                      <img src={foundedByIcon} alt="" draggable={false} className="w-full h-full object-cover rounded-full" />
                    </div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#949BA4] mb-3">List Founded By</h4>
                    <div className="flex gap-2">
                      <CreditBadge name="EpicInfinity" color="#FAA61A" />
                      <CreditBadge name="Soupermunki" color="#FAA61A" />
                    </div>
                  </div>
                </TiltCard>

                {/* VALUE LIST TEAM */}
                <TiltCard color="#8b7a7a">
                  <div className="p-6 relative z-10 flex flex-col items-center text-center h-full">
                    <div className="relative w-12 h-12 rounded-full bg-[#111214] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4 shadow-sm overflow-hidden group-hover:scale-110 transition-transform duration-300">
                      <img src={valueListTeamIcon} alt="" draggable={false} className="w-full h-full object-cover rounded-full" />
                    </div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#949BA4] mb-3">Value List Team</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["Batata_Uy142", "Gabe", "Goofyismad", "Azking", "Codythechickenman", "Suns_Radiance", "Vex"].map((n) => (
                        <CreditBadge key={n} name={n} color="#5865F2" />
                      ))}
                    </div>
                  </div>
                </TiltCard>

                {/* QUALITY ASSURANCE */}
                <TiltCard color="#8b7a7a">
                  <div className="p-6 relative z-10 flex flex-col items-center text-center h-full">
                    <div className="relative w-12 h-12 rounded-full bg-[#111214] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4 shadow-sm overflow-hidden group-hover:scale-110 transition-transform duration-300">
                      <img src={qualityAssuranceIcon} alt="" draggable={false} className="w-full h-full object-cover rounded-full" />
                    </div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#949BA4] mb-3">Quality Assurance & Testers</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["aezkmi.", "Dark", "dummy", "george", "JC", "kushu", "plouf", "YuZO"].map((n) => (
                        <CreditBadge key={n} name={n} color="#23a559" />
                      ))}
                    </div>
                  </div>
                </TiltCard>

                {/* EX-STAFF */}
                <TiltCard color="#949BA4" className="col-span-1 md:col-span-2 xl:col-span-3">
                  <div className="p-6 relative z-10 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-[#111214] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-6 h-6 text-[#949BA4]" />
                    </div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#949BA4] mb-4">Ex-Staff Contributors</h4>
                    <div className="flex flex-wrap justify-center gap-2 max-w-5xl mx-auto">
                      {exStaffList.map((n) => (
                        <CreditBadge key={n} name={n} color="#949BA4" />
                      ))}
                    </div>
                  </div>
                </TiltCard>

              </div>

              {/* BOTTOM CREDITS IMAGE */}
              <div className="mt-6 flex justify-center">
                <div className="relative w-full max-w-5xl overflow-hidden rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#2B2D31] shadow-sm group">
                  <div className="absolute top-0 left-0 right-0 h-[3px] z-10" style={{ background: "linear-gradient(90deg, transparent, #8b7a7a, transparent)" }} />
                  <img src={creditsBottomImage} alt="ASTD Value List" draggable={false} className="block w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.01]" loading="lazy" />
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}