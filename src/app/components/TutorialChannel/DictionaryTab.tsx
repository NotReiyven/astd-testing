import React, { useState, useMemo, useEffect } from "react";
import { BrainCircuit, Activity, MessageSquare } from "lucide-react";
import { useUnits } from "../../../context/UnitContext";
import { TierGridCard } from "../MainCanvas/UnitGrid";
import { parseSmartTrade } from "../TradeAnalyzer/smartParser";
import { MasterUnit } from "../../../types";

const DEMO_QUERIES = [
  "trading drb and fem law for overpays",
  "lf udbz offering 8x trash",
  "my gogeta for 3x speed"
];

export function DictionaryTab() {
  const { units: ALL_UNITS } = useUnits();

  // Live Parser (Dictionary) State
  const [liveParserInput, setLiveParserInput] = useState("");
  const [resolutions, setResolutions] = useState<Record<number, { unit: MasterUnit | null, col: "give" | "get", qty: number }>>({});

  // Reset local resolutions if the user changes the input text
  useEffect(() => {
    setResolutions({});
  }, [liveParserInput]);

  // Process the input using the REAL parseSmartTrade engine
  const parsedData = useMemo(() => {
    if (!liveParserInput.trim()) return { give: [], get: [], ambig: [], total: 0 };
    
    const result = parseSmartTrade(liveParserInput, ALL_UNITS);

    // Map TradeCards back to MasterUnits for the TierGridCard
    const resolveUnits = (cards: any[]) => cards.map(c => ({
       unit: ALL_UNITS.find(u => u.id === c.id)!,
       qty: c.qty
    })).filter(x => x.unit);

    return {
      give: resolveUnits(result.giveCards),
      get: resolveUnits(result.getCards),
      ambig: result.ambiguous,
      total: result.giveCards.length + result.getCards.length + result.ambiguous.length
    };
  }, [liveParserInput, ALL_UNITS]);

  // Compute final display arrays (combining parsed exact matches with user-resolved ambiguous items)
  const displayGive = [...parsedData.give];
  const displayGet = [...parsedData.get];
  const displayAmbig: any[] = [];

  parsedData.ambig.forEach((ambig, i) => {
    const res = resolutions[i];
    if (res) {
      if (res.unit) {
        if (res.col === "give") displayGive.push({ unit: res.unit, qty: res.qty });
        else displayGet.push({ unit: res.unit, qty: res.qty });
      }
      // If res.unit is null, the user clicked "Ignore Error"
    } else {
      displayAmbig.push({ ...ambig, originalIndex: i });
    }
  });

  const aquaReaction = useMemo(() => {
    const q = liveParserInput.toLowerCase();
    if (q.includes("scam") || q.includes("trash")) return "Hey! Are you trying to get me to evaluate garbage?!";
    if (q.includes("aqua") || q.includes("water goddess") || q.includes("konosuba")) return "Oh? Talking about me? Make sure you overpay!";
    if (q.includes("reiyven") || q.includes("developer")) return "Reiyven built this, but *I* am the face of it!";
    return null;
  }, [liveParserInput]);

  return (
    <div className="animate-fade-in pb-8 max-w-5xl mx-auto flex flex-col h-full gap-5">
      <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.06)] rounded-[12px] p-5 md:p-8 shadow-xl flex flex-col gap-4 relative">
          
          {/* Background effects container */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[12px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#5865F2]/5 rounded-full blur-[40px]" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#23a559]/5 rounded-full blur-[40px]" />
          </div>

          <div className="flex items-center gap-3 mb-2 relative z-10">
              <BrainCircuit className="w-6 h-6 text-[#5865F2]" />
              <h2 className="text-[18px] font-black text-[#F2F3F5] uppercase tracking-wide">Test The AI Parser</h2>
          </div>
          <p className="text-[13px] text-[#B5BAC1] max-w-2xl leading-relaxed relative z-10">
              Type a messy, realistic Discord trade message below. The parser uses Natural Language Processing to instantly identify unit slang and acronyms. Use the glowing <strong className="text-white">Calculator</strong> and <strong className="text-white">Wand</strong> icons in the TopBar to use this feature with live trades.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2 relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#80848E] mr-1">Try this:</span>
              {DEMO_QUERIES.map((q, i) => (
                  <button 
                      key={i} 
                      onClick={() => setLiveParserInput(q)}
                      className="bg-[#2B2D31] hover:bg-[#5865F2] text-[#DBDEE1] hover:text-white px-3 py-1.5 rounded-[4px] text-[11px] font-bold transition-colors border border-[rgba(255,255,255,0.04)] hover:border-[#5865F2] focus-visible:outline-none"
                  >
                      "{q}"
                  </button>
              ))}
          </div>

          <div className="relative mt-2 z-20 flex flex-col gap-3">
              <textarea 
                  value={liveParserInput}
                  onChange={(e) => setLiveParserInput(e.target.value)}
                  placeholder="e.g., 'trading flaw and udbz for overpays...'"
                  className="w-full bg-[#111214] border border-[rgba(255,255,255,0.08)] rounded-[8px] p-4 text-[#F2F3F5] text-[15px] font-medium resize-none outline-none focus:border-[#5865F2] focus:ring-1 focus:ring-[#5865F2] transition-all shadow-inner leading-relaxed min-h-[100px]"
              />

              {/* Aqua Reaction positioned safely inside document flow to prevent Z-index clipping */}
              {aquaReaction && (
                  <div className="bg-[#2B2D31] border-l-4 border-l-[#ed4245] px-4 py-3 rounded-[8px] shadow-sm flex items-center gap-3 animate-fade-in self-end w-fit max-w-full">
                      <img src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" className="w-8 h-8 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#111214]" alt="Aqua" />
                      <span className="text-[#DBDEE1] text-[13px] font-medium italic pr-2">"{aquaReaction}"</span>
                  </div>
              )}
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px] text-[#80848E] font-bold uppercase tracking-wider relative z-10">
              <span>{parsedData.total} Data Points Recognized</span>
              <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-[#23a559] animate-pulse" /> Live Engine Active</span>
          </div>
      </div>

      {parsedData.total === 0 ? (
          <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[12px] p-5 md:p-6 shadow-sm min-h-[300px] flex flex-col items-center justify-center opacity-50 text-center">
              <MessageSquare className="w-12 h-12 text-[#80848E] mb-4" />
              <p className="text-[#DBDEE1] font-bold text-[14px]">No units recognized in your input.</p>
              <p className="text-[#80848E] text-[12px] mt-2">Try typing common slang or clicking one of the examples above.</p>
          </div>
      ) : (
          <div className="flex flex-col gap-6 animate-fade-in">
              
              {/* AMBIGUOUS ITEMS SECTION */}
              {displayAmbig.length > 0 && (
                  <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[12px] p-5 md:p-6 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-2 mb-1">
                         <div className="w-2 h-2 rounded-full bg-[#FAA61A]" />
                         <h3 className="text-[#FAA61A] font-black text-[14px] uppercase tracking-widest">Ambiguous (Needs Clarification)</h3>
                      </div>
                      <div className="flex flex-col gap-4">
                          {displayAmbig.map((ambig) => (
                              <div key={ambig.originalIndex} className="bg-[#1E1F22] p-4 rounded-[8px] border border-[rgba(255,255,255,0.04)] border-l-4 border-l-[#FAA61A] shadow-sm">
                                  <div className="mb-4">
                                      <span className="text-[13px] text-[#B5BAC1] font-medium flex items-center flex-wrap gap-1.5">
                                          For 
                                          <strong className="text-[#F2F3F5] font-bold px-2 py-0.5 bg-[rgba(255,255,255,0.06)] rounded border border-[rgba(255,255,255,0.02)]">"{ambig.rawName}"</strong>
                                          <span className="text-[#80848E] text-[12px]">(Quantity: {ambig.qty}, Side: {ambig.col})</span>
                                      </span>
                                  </div>
                                  
                                  <p className="text-[11.5px] font-bold text-[#FAA61A] mb-3 uppercase tracking-wide">Click the correct variant below to resolve:</p>
                                  
                                  <div className="flex flex-col gap-2.5">
                                      {ambig.options.slice(0, 4).map((opt: MasterUnit) => (
                                          <button 
                                              key={opt.id} 
                                              onClick={() => setResolutions(prev => ({ ...prev, [ambig.originalIndex]: { unit: opt, col: ambig.col, qty: ambig.qty } }))} 
                                              className="group flex items-center justify-between bg-[#2B2D31] hover:bg-[#5865F2] text-[#DBDEE1] hover:text-white px-4 py-3 rounded-[6px] transition-all duration-200 border border-[rgba(255,255,255,0.06)] hover:border-[#5865F2] active:scale-[0.98] shadow-sm focus-visible:outline-none cursor-pointer"
                                          >
                                              <div className="flex flex-col items-start text-left">
                                                  <span className="text-[14px] font-black tracking-tight">{opt.name}</span>
                                                  {opt.subtitle && <span className="text-[11px] font-bold text-[#80848E] group-hover:text-white/80 transition-colors uppercase tracking-wider mt-0.5">{opt.subtitle}</span>}
                                              </div>
                                              <div className="w-5 h-5 rounded-full border-2 border-[rgba(255,255,255,0.1)] group-hover:border-white/50 flex items-center justify-center shrink-0 ml-3">
                                                 <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-white transition-colors" />
                                              </div>
                                          </button>
                                      ))}
                                      
                                      <div className="flex items-center justify-between mt-1">
                                          {ambig.options.length > 4 ? (
                                              <div className="px-3 py-1.5 rounded-[4px] text-[11px] text-[#80848E] font-bold uppercase tracking-wider cursor-default">
                                                  +{ambig.options.length - 4} more variants...
                                              </div>
                                          ) : <div />}
                                          
                                          <button 
                                              onClick={() => setResolutions(prev => ({ ...prev, [ambig.originalIndex]: { unit: null, col: ambig.col, qty: 0 } }))} 
                                              className="text-[#80848E] hover:text-[#ed4245] px-3 py-1.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none hover:bg-[rgba(237,66,69,0.1)]"
                                          >
                                              Ignore Error
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* RESOLVED CARDS SECTION */}
              {(displayGive.length > 0 || displayGet.length > 0) && (
                  <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[12px] p-5 md:p-6 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                          {/* GIVE CARDS */}
                          <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-4 border-b border-[rgba(255,255,255,0.04)] pb-2">
                                 <div className="w-2 h-2 rounded-full bg-[#FAA61A]" />
                                 <h3 className="text-[#FAA61A] font-black text-[14px] uppercase tracking-widest">Interpreted as: You Give</h3>
                              </div>
                              {displayGive.length > 0 ? (
                                  <div className="flex flex-wrap gap-3 sm:gap-4 w-full">
                                      {displayGive.map((item, i) => (
                                          <div key={`${item.unit.id}-${i}`} className="relative group w-full sm:w-[145px]">
                                              {item.qty > 1 && <div className="absolute -top-2.5 -right-2.5 bg-[#FAA61A] text-white text-[12px] font-black px-2.5 py-0.5 rounded-full z-20 shadow-lg border-2 border-[#2B2D31]">x{item.qty}</div>}
                                              <TierGridCard unit={item.unit} />
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="flex-1 flex items-center justify-center min-h-[140px] bg-[#1E1F22] rounded-[8px] border border-dashed border-[rgba(255,255,255,0.05)] text-[#80848E] text-[12px] font-medium">
                                      No units detected
                                  </div>
                              )}
                          </div>

                          {/* GET CARDS */}
                          <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-4 border-b border-[rgba(255,255,255,0.04)] pb-2">
                                 <div className="w-2 h-2 rounded-full bg-[#5865F2]" />
                                 <h3 className="text-[#5865F2] font-black text-[14px] uppercase tracking-widest">Interpreted as: You Get</h3>
                              </div>
                              {displayGet.length > 0 ? (
                                  <div className="flex flex-wrap gap-3 sm:gap-4 w-full">
                                      {displayGet.map((item, i) => (
                                          <div key={`${item.unit.id}-${i}`} className="relative group w-full sm:w-[145px]">
                                              {item.qty > 1 && <div className="absolute -top-2.5 -right-2.5 bg-[#5865F2] text-white text-[12px] font-black px-2.5 py-0.5 rounded-full z-20 shadow-lg border-2 border-[#2B2D31]">x{item.qty}</div>}
                                              <TierGridCard unit={item.unit} />
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <div className="flex-1 flex items-center justify-center min-h-[140px] bg-[#1E1F22] rounded-[8px] border border-dashed border-[rgba(255,255,255,0.05)] text-[#80848E] text-[12px] font-medium">
                                      No units detected
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}
    </div>
  );
}