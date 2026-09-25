import React, { useState, useEffect } from "react";
import { BookOpen, Tag, Activity, Flame, ChevronRight } from "lucide-react";
import {
  THEORY_STATUS_TAGS,
  THEORY_SECONDARY_TAGS,
  THEORY_RARITY_SCALE,
  THEORY_LIQUIDITY_SCALE,
} from "../../../data";

export function TheoryTab() {
  const [activeSection, setActiveSection] = useState<string>("tags");

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["tags", "rarity", "liquidity"];
      const scrollPos =
        document.getElementById("theory-content")?.scrollTop || 0;

      for (const section of sections) {
        const el = document.getElementById(`section-${section}`);
        if (el && el.offsetTop <= scrollPos + 100) {
          setActiveSection(section);
        }
      }
    };

    const container = document.getElementById("theory-content");
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const container = document.getElementById("theory-content");
    const el = document.getElementById(`section-${id}`);
    if (container && el) {
      container.scrollTo({ top: el.offsetTop - 20, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto h-full font-sans">
      {/* Sidebar Navigation - Hidden on lg to make room for calculator overlay */}
      <nav className="hidden lg:flex flex-col w-56 shrink-0 sticky top-0 self-start pt-2">
        <div className="flex items-center gap-2.5 mb-6 text-foreground">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-[15px] font-black uppercase tracking-wider">
            Documentation
          </h2>
        </div>
        <div className="flex flex-col gap-1 border-l-2 border-border pl-4">
          <button
            onClick={() => scrollTo("tags")}
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none ${
              activeSection === "tags"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Market Tags
          </button>
          <button
            onClick={() => scrollTo("rarity")}
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none ${
              activeSection === "rarity"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Rarity Scale
          </button>
          <button
            onClick={() => scrollTo("liquidity")}
            className={`text-left text-[13px] font-medium py-1.5 transition-colors focus-visible:outline-none ${
              activeSection === "liquidity"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Liquidity
          </button>
        </div>
      </nav>

      {/* Added min-w-0 to prevent flexbox crushing */}
      <div
        id="theory-content"
        className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-16 flex flex-col gap-12 min-w-0"
      >
        {/* Intro */}
        <div className="flex flex-col gap-3">
          <h1 className="text-[28px] md:text-[32px] font-black text-foreground tracking-tight">
            Market Theory & Fundamentals
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-3xl">
            Raw value is only one variable in evaluating a trade. To accurately
            forecast short and long-term gains, you must understand how Status
            Tags, Rarity, and Liquidity mathematically affect a unit's market
            perception. This document serves as the official reference manual
            for all ASTD Value List metrics.
          </p>
        </div>

        {/* Status Tags */}
        <section id="section-tags" className="flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Tag className="w-5 h-5 text-primary" />
            <h2 className="text-[20px] font-black text-foreground">
              Market Tags
            </h2>
          </div>
          <p className="text-[14px] text-foreground leading-relaxed">
            Market tags indicate the current trajectory of a unit's value based
            on community trade data. Accepting a mathematically "fair" trade for
            a Dropping unit will result in a net loss over time.
          </p>

          <div className="bg-card border border-border rounded-[8px] overflow-hidden shadow-sm">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-popover text-muted-foreground text-[10px] uppercase tracking-widest border-b border-border">
                    <th className="px-5 py-4 font-bold w-[140px]">Tag</th>
                    <th className="px-5 py-4 font-bold">Definition</th>
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
                          className="text-[10px] font-bold uppercase px-2 py-1 rounded-[4px] border block text-center w-full"
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
                          className="text-[10px] font-bold uppercase px-2 py-1 rounded-[4px] border block text-center w-full"
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
        <section id="section-rarity" className="flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Flame className="w-5 h-5 text-[#FAA61A]" />
            <h2 className="text-[20px] font-black text-foreground">
              Rarity Scale (0 - 20)
            </h2>
          </div>
          <p className="text-[14px] text-foreground leading-relaxed">
            Rarity represents the absolute scarcity of a unit in the global
            economy. Rarity acts as a stabilizer—units with higher rarity are
            heavily insulated against market crashes and manipulation compared
            to common, hyped units.
          </p>

          <div className="bg-card border border-border rounded-[8px] overflow-hidden shadow-sm">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-popover text-muted-foreground text-[10px] uppercase tracking-widest border-b border-border">
                    <th className="px-5 py-4 font-bold w-[100px] text-center">
                      Rarity
                    </th>
                    <th className="px-5 py-4 font-bold">Volume / Definition</th>
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
        <section id="section-liquidity" className="flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Activity className="w-5 h-5 text-[#23a559]" />
            <h2 className="text-[20px] font-black text-foreground">
              Liquidity
            </h2>
          </div>
          <p className="text-[14px] text-foreground leading-relaxed">
            Liquidity is the fusion of Supply and Demand. It dictates the
            velocity at which an asset can be converted back into raw value or
            traded for other units.{" "}
            <strong>Value is meaningless without liquidity.</strong> A 10k value
            unit with "Low" liquidity is functionally a dead asset.
          </p>

          <div className="bg-card border border-border rounded-[8px] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-popover text-muted-foreground text-[10px] uppercase tracking-widest border-b border-border">
                  <th className="px-5 py-4 font-bold w-[120px] text-center">
                    Score
                  </th>
                  <th className="px-5 py-4 font-bold">Definition</th>
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
                        className="text-[12px] font-black font-mono uppercase px-2 py-1 rounded-[4px]"
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
