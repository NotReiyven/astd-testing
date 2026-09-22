import React, { useState, useMemo, useEffect } from "react";
import { ExternalLink, Users, Wrench, ChevronRight, Code2, Check, Terminal, MessageSquarePlus, BookOpen, FileSpreadsheet, Info, Award, FileClock, Home } from "lucide-react";
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
      className="bg-popover hover:bg-muted border border-border px-2.5 py-1.5 rounded-[4px] text-[12px] font-bold shadow-sm transition-colors active:scale-95 flex items-center justify-center min-w-[60px]" 
      style={{ 
        color: copied ? "#FFFFFF" : "inherit", 
        backgroundColor: copied ? color : undefined,
        borderColor: copied ? color : undefined
      }}
    >
      <span className="flex items-center gap-1.5">
        {copied && <Check className="w-3.5 h-3.5" />}
        {name}
      </span>
    </button>
  );
}

export function HomeChannel({ guideState }: { guideState?: { type: string | null; step: number } }) {
  const [activeSection, setActiveSection] = useState<string>("info");
  const { changelog } = useUnits();

  // Scrollspy Effect
  useEffect(() => {
    const handleScroll = () => {
      const sections = ["info", "updates", "credits"];
      const scrollPos = document.getElementById("home-content")?.scrollTop || 0;
      
      for (const section of sections) {
        const el = document.getElementById(`section-${section}`);
        if (el && el.offsetTop <= scrollPos + 150) {
          setActiveSection(section);
        }
      }
    };

    const container = document.getElementById("home-content");
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const container = document.getElementById("home-content");
    const el = document.getElementById(`section-${id}`);
    if (container && el) {
      container.scrollTo({ top: el.offsetTop - 20, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (guideState?.type === "developer") {
      setTimeout(() => scrollTo("credits"), 100);
    }
  }, [guideState]);

  // Terminal Easter Egg State
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

  const creditsBottomImage = "/units/all-star.webp";

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto h-full font-sans">
      
      {/* Sidebar Navigation */}
      <nav className="hidden md:flex flex-col w-56 shrink-0 sticky top-0 self-start pt-2">
        <div className="flex items-center justify-between mb-6 text-foreground">
          <div className="flex items-center gap-2.5">
            <Home className="w-5 h-5" />
            <h2 className="text-[15px] font-black uppercase tracking-wider">Welcome</h2>
          </div>
          <button onClick={handleSecretClick} className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none">
            <Terminal className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col gap-1 border-l-2 border-border pl-4">
          <button 
            onClick={() => scrollTo("info")} 
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none flex items-center gap-2 ${activeSection === "info" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
          >
            General Info
          </button>
          <button 
            onClick={() => scrollTo("updates")} 
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none flex items-center gap-2 ${activeSection === "updates" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
          >
            Patch Notes
          </button>
          <button 
            onClick={() => scrollTo("credits")} 
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none flex items-center gap-2 ${activeSection === "credits" ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"}`}
          >
            Credits
          </button>
        </div>

        {secretUnlocked && (
          <div className="mt-8 bg-card border border-border p-3 rounded-[6px] text-[11px] font-mono shadow-sm">
            <div className="text-[#FAA61A] mb-1">&gt; SYSTEM MESSAGE</div>
            <div className="text-muted-foreground">{secretQuotes[secretQuoteIndex]}</div>
            <button onClick={() => setSecretUnlocked(false)} className="mt-2 text-primary hover:underline">Close</button>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <div id="home-content" className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-16 flex flex-col gap-12">
        
        {/* Intro */}
        <div className="flex flex-col gap-3">
          <h1 className="text-[28px] md:text-[32px] font-black text-foreground tracking-tight">ASTD Value List</h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-3xl">
            Everything shown in this Value List is an estimation from the Value List Team made from community trades. While our changes can sometimes be inaccurate, this platform remains the most reliable source of values for ASTD.
          </p>
        </div>

        {/* Section: General Info */}
        <section id="section-info" className="flex flex-col gap-6 pt-2">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Info className="w-5 h-5 text-primary" />
            <h2 className="text-[20px] font-black text-foreground">General Info</h2>
          </div>

          <div className="bg-card border border-border rounded-[8px] p-5 flex items-start gap-4 shadow-sm">
            <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full object-cover shrink-0" alt="Fire Zio" />
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-bold text-foreground uppercase tracking-widest">Fire Zio's Briefing</span>
              <p className="text-muted-foreground text-[14px] leading-relaxed italic">
                "Read the info before asking stupid questions in chat. Yes, values are estimates based on community trades. No, we aren't psychic. Use your brain. Verify trades before wrongly assuming a unit's status."
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col h-full shadow-sm">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground mb-3">
                <FileSpreadsheet className="w-4 h-4 text-primary" /> Spreadsheet Reliance
              </h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground flex-1">
                This web platform operates entirely in reliance on the official value list spreadsheet as its live data backend. The original spreadsheet remains fully active and continues to be updated regularly. This website is provided purely as an alternative interface.
              </p>
              <a href="https://docs.google.com/spreadsheets/d/1Z20NUscF9Id2Sss-osT-Xq06gz9ooikt6Kjtianeg0I/edit?gid=163005933#gid=163005933" target="_blank" rel="noopener noreferrer" className="mt-4 bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-[4px] text-[13px] font-bold transition-colors flex items-center justify-center gap-2 border border-primary/20 hover:border-primary">
                Open Official Spreadsheet <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-card border border-border rounded-[8px] p-5 flex flex-col h-full shadow-sm">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground mb-3">
                <MessageSquarePlus className="w-4 h-4 text-primary" /> Community & Feedback
              </h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground flex-1">
                Engage with the trading community on Discord or submit bug reports, data corrections, and feature suggestions directly to the team via our feedback form.
              </p>
              <div className="flex flex-col gap-2 mt-4">
                <a href="https://discord.gg/Q7JTvPUEM" target="_blank" rel="noopener noreferrer" className="bg-popover hover:bg-muted text-foreground border border-border px-4 py-2 rounded-[4px] text-[13px] font-bold transition-colors flex items-center justify-center gap-2">
                  Join Discord Server <ExternalLink className="w-4 h-4" />
                </a>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSeUAAvBHod23it13WYD8XK61K2C-BFCWJ8tGwJxA7c0sCCVvA/viewform" target="_blank" rel="noopener noreferrer" className="bg-popover hover:bg-muted text-foreground border border-border px-4 py-2 rounded-[4px] text-[13px] font-bold transition-colors flex items-center justify-center gap-2">
                  Submit Feedback Form <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Patch Notes */}
        <section id="section-updates" className="flex flex-col gap-6 pt-2">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <FileClock className="w-5 h-5 text-primary" />
            <h2 className="text-[20px] font-black text-foreground">Patch Notes</h2>
          </div>
          <p className="text-[14px] text-foreground leading-relaxed">
            A detailed ledger of all recent modifications to the value list, including unit additions, tier adjustments, and market corrections. Check the logs before complaining about shifting values.
          </p>

          {parsedChangelog.length === 0 ? (
            <div className="bg-card border border-border rounded-[8px] p-8 text-center text-muted-foreground text-[14px]">
              No recent updates logged in the spreadsheet.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {parsedChangelog.map((block, idx) => (
                <div key={idx} className="bg-card border border-border rounded-[8px] overflow-hidden shadow-sm">
                  <div className="bg-popover px-4 py-3 border-b border-border flex items-center gap-2">
                    {block.title.toLowerCase().includes("fix") ? <Wrench className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <h3 className="font-bold text-foreground text-[14px]">{block.title}</h3>
                  </div>
                  <div className="p-4">
                    <ul className="flex flex-col gap-2.5">
                      {block.lines.map((line, lIdx) => (
                        <li key={lIdx} className="flex gap-3 items-start text-[13px]">
                          <span className="text-primary font-bold">•</span>
                          <span className="text-muted-foreground leading-relaxed font-medium">{line.replace(/^-*\s*/, "")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Credits */}
        <section id="section-credits" className="flex flex-col gap-6 pt-2">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Award className="w-5 h-5 text-primary" />
            <h2 className="text-[20px] font-black text-foreground">Credits & Contributors</h2>
          </div>
          <p className="text-[14px] text-foreground leading-relaxed">
            The people dedicated to maintaining the list, balancing the game economy, and building the tools you use daily. Show some respect to the contributors.
          </p>

          <div className={`bg-card border rounded-[8px] flex flex-col sm:flex-row items-center sm:items-start p-6 gap-6 shadow-sm transition-colors ${guideState?.type === "developer" ? "border-primary shadow-primary/10" : "border-border"}`}>
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-popover overflow-hidden shrink-0 shadow-inner">
              <img src="/units/reiyven.webp" alt="Reiyven" draggable={false} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-1.5">
                <h4 className="text-[20px] font-black text-foreground tracking-tight">Reiyven</h4>
                <span className="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border border-primary/20 flex items-center gap-1.5">
                  <Code2 className="w-3 h-3" /> Lead Web Developer
                </span>
              </div>
              <p className="text-[12px] font-bold text-muted-foreground mb-3 uppercase tracking-wide">Raven • 3rd Year BSCS @ PHILIPPINES</p>
              <p className="text-[13px] text-foreground font-medium leading-relaxed max-w-2xl bg-popover p-3 rounded-[6px] border border-border shadow-inner">
                Architect and lead engineer of the ASTD Value List web platform. Combined a background in computer science and game development to build the responsive layout, advanced parsing engine, and trading tools for the community.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="bg-card border border-border rounded-[8px] p-5 shadow-sm">
              <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3">List Founded By</h3>
              <div className="flex flex-wrap gap-2">
                <CreditBadge name="EpicInfinity" color="#7289da" />
                <CreditBadge name="Soupermunki" color="#7289da" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-[8px] p-5 shadow-sm">
              <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Value List Team</h3>
              <div className="flex flex-wrap gap-2">
                {["Batata_Uy142", "Gabe", "Goofyismad", "Azking", "Codythechickenman", "Suns_Radiance", "Vex"].map((n) => (
                  <CreditBadge key={n} name={n} color="#7289da" />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[8px] p-5 shadow-sm">
            <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Quality Assurance</h3>
            <div className="flex flex-wrap gap-2">
              {["aezkmi.", "Dark", "dummy", "george", "JC", "kushu", "plouf", "YuZO"].map((n) => (
                <CreditBadge key={n} name={n} color="#23a559" />
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-[8px] p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              <Users className="w-4 h-4" /> Ex-Staff Contributors
            </h3>
            <div className="flex flex-wrap gap-2 opacity-80 hover:opacity-100 transition-opacity">
              {exStaffList.map((n) => (
                <CreditBadge key={n} name={n} color="#6b7280" />
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-[8px] border border-border bg-card overflow-hidden shadow-sm">
            <img src={creditsBottomImage} alt="ASTD Value List" draggable={false} className="w-full h-auto object-contain block opacity-90 hover:opacity-100 transition-opacity" loading="lazy" />
          </div>
        </section>

      </div>
    </div>
  );
}