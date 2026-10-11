import React, { useState } from "react";
import {
  GiOpenBook,
  GiPriceTag,
  GiFlame,
  GiWaterDrop,
} from "react-icons/gi";
import {
  THEORY_STATUS_TAGS,
  THEORY_SECONDARY_TAGS,
  THEORY_RARITY_SCALE,
  THEORY_LIQUIDITY_SCALE,
} from "../../../data";

const AQUA_AVATAR_URL =
  "https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png";

export function TheoryTab() {
  const [activeSection, setActiveSection] = useState<string>("tags");

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const sections = ["tags", "rarity", "liquidity"];
    const scrollPos = e.currentTarget.scrollTop;

    for (const section of sections) {
      const el = document.getElementById(`section-${section}`);
      if (el && el.offsetTop <= scrollPos + 100) {
        setActiveSection(section);
      }
    }
  };

  const scrollTo = (id: string) => {
    const container = document.getElementById("theory-content");
    const el = document.getElementById(`section-${id}`);
    if (container && el) {
      container.scrollTo({ top: el.offsetTop - 20, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto h-full font-sans">
      {/* Sidebar Navigation */}
      <nav className="hidden lg:flex flex-col w-56 shrink-0 sticky top-0 self-start pt-2">
        <div className="flex items-center gap-2.5 mb-6 text-foreground">
          <GiOpenBook className="w-5 h-5 text-primary" />
          <h2 className="text-[15px] font-black uppercase tracking-wider">
            Market Guide
          </h2>
        </div>
        <div className="flex flex-col gap-1 border-l-2 border-border pl-4">
          <button
            type="button"
            onClick={() => scrollTo("tags")}
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none cursor-pointer ${
              activeSection === "tags"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Market Tags
          </button>
          <button
            type="button"
            onClick={() => scrollTo("rarity")}
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none cursor-pointer ${
              activeSection === "rarity"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Rarity Scale
          </button>
          <button
            type="button"
            onClick={() => scrollTo("liquidity")}
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none cursor-pointer ${
              activeSection === "liquidity"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Liquidity
          </button>
        </div>
      </nav>

      <div
        id="theory-content"
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-16 flex flex-col gap-10 min-w-0"
      >
        {/* Intro */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-[26px] md:text-[30px] font-black text-foreground tracking-tight">
              How Market Values Work
            </h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed max-w-3xl mt-1">
              Raw value is only part of a trade. To avoid losing value over
              time, check a unit&apos;s Status Tag, Rarity, and Liquidity before
              you accept an offer.
            </p>
          </div>

          <div className="bg-popover border border-border rounded-[8px] p-4 flex items-start gap-4 shadow-sm">
            <img
              src={AQUA_AVATAR_URL}
              alt="Goddess Aqua"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full border border-border object-cover object-top shrink-0 bg-muted"
            />
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-black text-foreground">
                Goddess Aqua&apos;s Advice
              </span>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                &ldquo;Listen up! Even if two units have the exact same value
                number, a Rising unit with High Liquidity will get you rich,
                while an Inflated or Dropping unit will leave you broke like
                Kazuma! Read the tags below so you don&apos;t get tricked!&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Status Tags */}
        <section id="section-tags" className="flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <GiPriceTag className="w-5 h-5 text-primary" />
            <h2 className="text-[20px] font-black text-foreground">
              Market Tags
            </h2>
          </div>
          <p className="text-[14px] text-foreground leading-relaxed">
            Market tags show where a unit&apos;s price is heading based on
            recent trades. Taking a fair paper trade for a Dropping unit usually
            turns into a loss within a few days.
          </p>

          <div className="bg-card border border-border rounded-[8px] overflow-hidden shadow-sm">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-popover text-muted-foreground text-[10px] uppercase tracking-widest border-b border-border">
                    <th className="px-5 py-4 font-bold w-[140px]">Tag</th>
                    <th className="px-5 py-4 font-bold">What It Means</th>
                  </tr>
                </thead>
                <tbody>
                  {THEORY_STATUS_TAGS.map((t) => (
                    <tr
                      key={t.tag}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 align-middle">
                        <span
                          className="text-xs font-semibold px-2 py-1 rounded-[6px] border block text-center w-full shadow-sm"
                          style={{
                            backgroundColor: t.bg,
                            color: t.color,
                            borderColor: t.border,
                          }}
                        >
                          {t.tag}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-foreground text-[13px] leading-relaxed font-medium">
                        {t.def}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-popover text-muted-foreground text-[10px] uppercase tracking-widest border-y border-border">
                    <td colSpan={2} className="px-5 py-3 font-bold">
                      Secondary Multipliers
                    </td>
                  </tr>

                  {THEORY_SECONDARY_TAGS.map((t) => (
                    <tr
                      key={t.tag}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-5 py-3.5 align-middle">
                        <span
                          className="text-xs font-semibold px-2 py-1 rounded-[6px] border block text-center w-full shadow-sm"
                          style={{
                            backgroundColor: t.bg,
                            color: t.color,
                            borderColor: t.border,
                          }}
                        >
                          {t.tag}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-foreground text-[13px] leading-relaxed font-medium">
                        {t.def}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Rarity */}
        <section id="section-rarity" className="flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <GiFlame className="w-5 h-5 text-[#FAA61A]" />
            <h2 className="text-[20px] font-black text-foreground">
              Rarity Scale (0 to 20)
            </h2>
          </div>
          <p className="text-[14px] text-foreground leading-relaxed">
            Rarity measures how few copies of a unit exist across the game.
            Scarce units hold their value much better over time than common
            units with temporary update hype.
          </p>

          <div className="bg-card border border-border rounded-[8px] overflow-hidden shadow-sm">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-popover text-muted-foreground text-[10px] uppercase tracking-widest border-b border-border">
                    <th className="px-5 py-4 font-bold w-[100px] text-center">
                      Rarity
                    </th>
                    <th className="px-5 py-4 font-bold">Supply Level</th>
                  </tr>
                </thead>
                <tbody>
                  {THEORY_RARITY_SCALE.map((r) => (
                    <tr
                      key={r.val}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-5 py-3 align-middle text-center bg-popover border-r border-border">
                        <span
                          className="text-[12px] font-black font-mono px-2 py-1 rounded-[4px]"
                          style={{
                            backgroundColor: r.color,
                            color: r.textColor,
                          }}
                        >
                          {r.val}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-foreground text-[13px] leading-relaxed font-medium">
                        {r.def}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Liquidity */}
        <section id="section-liquidity" className="flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <GiWaterDrop className="w-5 h-5 text-[#23a559]" />
            <h2 className="text-[20px] font-black text-foreground">
              Liquidity
            </h2>
          </div>
          <p className="text-[14px] text-foreground leading-relaxed">
            Liquidity tells you how fast you can trade a unit away at its listed
            value.{" "}
            <strong>Paper value does not matter without liquidity.</strong> A
            high-value unit with Low liquidity can take weeks to find a buyer.
          </p>

          <div className="bg-card border border-border rounded-[8px] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-popover text-muted-foreground text-[10px] uppercase tracking-widest border-b border-border">
                  <th className="px-5 py-4 font-bold w-[120px] text-center">
                    Score
                  </th>
                  <th className="px-5 py-4 font-bold">What to Expect</th>
                </tr>
              </thead>
              <tbody>
                {THEORY_LIQUIDITY_SCALE.map((s) => (
                  <tr
                    key={s.val}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-5 py-3 align-middle text-center bg-popover border-r border-border">
                      <span
                        className="text-[12px] font-black font-mono px-2 py-1 rounded-[6px]"
                        style={{ color: s.color }}
                      >
                        {s.val}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-foreground text-[13px] font-medium">
                      {s.def}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
