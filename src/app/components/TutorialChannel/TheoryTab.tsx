import React from "react";
import { TooltipText } from "./TutorialUI";

const STATUS_TAGS = [
  { tag: "Stable", bg: "#3b3924", border: "#6b5f2a", color: "#E6D8A1", def: "Fair and consistently decent offers. Units that are stable are most likely not to move unless something happens." },
  { tag: "Unstable", bg: "#1e3040", border: "#3a6480", color: "#6B9EB5", def: "If a unit is unstable, it means it could rise or drop at any moment, or stabilize." },
  { tag: "Rising", bg: "#153324", border: "#246640", color: "#30A163", def: "If a unit is rising, it means the unit is being consistently overpaid." },
  { tag: "Dropping", bg: "#3d0a09", border: "#7a1410", color: "#E60A18", def: "If a unit is dropping, it means owners are constantly taking underpays." },
  { tag: "Inflated", bg: "#2d1a0a", border: "#5c3515", color: "#c27a40", def: "If a unit is has this tag, they are inflated and cost way more than they should be worth." },
  { tag: "Deflated", bg: "#0e2345", border: "#1e4a8a", color: "#3C81F3", def: "If a unit is underpriced, they are deflated and are way cheaper than they should be worth." },
  { tag: "Varies", bg: "#201b42", border: "#3d3480", color: "#9b8de8", def: "If a unit varies, then it can get fair but it can also get lowballs or highballs." },
  { tag: "Maximum", bg: "#3d220a", border: "#7a4412", color: "#E66C19", def: "If a unit has this tag, it can get fair at most, but also gets lowballs." }
];

const SECONDARY_TAGS = [
  { tag: "Hyped", bg: "#003d40", border: "#007a80", color: "#01EFFD", def: "If a unit is hyped, then it can either be a new unit, or something big changed, skyrocketing a units value and demand." },
  { tag: "Gatekept", bg: "#30202e", border: "#603d5a", color: "#AF78A8", def: "If a unit is gatekept, it means owners are refusing to trade this unit for any reason, waiting for rise or huge overpay, usually." },
  { tag: "Black Marketed", bg: "#1e2228", border: "#3a4250", color: "#9aa3b2", def: "If a unit has this tag, it means that people who buy units with outside-game currency are heavily impacting this unit." }
];

const RARITY_SCALE = [
  { val: 0, def: "Forever Obtained", color: "#8B0000", textColor: "#fff" },
  { val: 1, def: "Extremely Common", color: "#FF0000", textColor: "#fff" },
  { val: 2, def: "Very Common", color: "#FF0000", textColor: "#fff" },
  { val: 3, def: "Common", color: "#FF0000", textColor: "#fff" },
  { val: 4, def: "Pretty Common", color: "#FF0000", textColor: "#fff" },
  { val: 5, def: "Slightly Uncommon", color: "#FF0000", textColor: "#fff" },
  { val: 6, def: "Uncommon", color: "#FFA500", textColor: "#fff" },
  { val: 7, def: "Pretty Uncommon", color: "#FFA500", textColor: "#fff" },
  { val: 8, def: "Very Uncommon", color: "#FFA500", textColor: "#fff" },
  { val: 9, def: "Slightly Rare", color: "#90EE90", textColor: "#000" },
  { val: 10, def: "Pretty Rare - About as rare as Aqua (5,000 Copies)", color: "#90EE90", textColor: "#000" },
  { val: 11, def: "Decently Rare", color: "#90EE90", textColor: "#000" },
  { val: 12, def: "Rare", color: "#90EE90", textColor: "#000" },
  { val: 13, def: "Very Rare - About as Rare as Padoru/Sinbad (1,000 Copies)", color: "#90EE90", textColor: "#000" },
  { val: 14, def: "Very very Rare", color: "#90EE90", textColor: "#000" },
  { val: 15, def: "Extremely rare - About as Rare as Mai/Douma (500 Copies)", color: "#90EE90", textColor: "#000" },
  { val: 16, def: "Absurdly Rare", color: "#90EE90", textColor: "#000" },
  { val: 17, def: "Super Rare - About as Rare as Gold LBS (Expected around 100-150 Copies)", color: "#32CD32", textColor: "#fff" },
  { val: 18, def: "Mega Rare", color: "#32CD32", textColor: "#fff" },
  { val: 19, def: "Ultra Rare", color: "#00FFFF", textColor: "#000" },
  { val: 20, def: "Ultra Mega Rare (20 Copies or Less)", color: "#00FFFF", textColor: "#000" }
];

const SUPPLY_DEMAND = [
  { val: 1, def: "Very Low" },
  { val: 2, def: "Low" },
  { val: 3, def: "Average" },
  { val: 4, def: "High" },
  { val: 5, def: "Very high" }
];

export function TheoryTab() {
  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto animate-fade-in pb-8">
      
      <div className="bg-[#1E1F22] border border-[#5865F2]/30 rounded-[12px] p-5 md:p-6 shadow-sm flex items-start gap-4">
        <img src="https://static.wikia.nocookie.net/allstartd/images/c/c7/Water_Goddess.png" className="w-12 h-12 rounded-full border-2 border-[#5865F2] object-cover flex-shrink-0" alt="Aqua" />
        <div>
          <h3 className="text-[#F2F3F5] font-black text-[16px] tracking-wide mb-1">Goddess Aqua's Theory Class</h3>
          <p className="text-[#B5BAC1] text-[13px] leading-relaxed">Listen up! Raw value isn't everything. Memorize these market definitions or you'll get completely scammed. The data below is pulled directly from the official value team's internal documentation.</p>
        </div>
      </div>

      <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[12px] overflow-hidden shadow-sm">
         <div className="bg-[#1E1F22] px-5 py-3 border-b border-[rgba(255,255,255,0.04)]">
            <h3 className="text-[#F2F3F5] font-bold text-[14px] uppercase tracking-wider">Unit Tags</h3>
         </div>
         <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-[rgba(255,255,255,0.02)] text-[#80848E] text-[10px] uppercase tracking-widest">
                     <th className="px-5 py-2.5 font-bold border-b border-[rgba(255,255,255,0.04)] w-[140px]">Units Tags</th>
                     <th className="px-5 py-2.5 font-bold border-b border-[rgba(255,255,255,0.04)]">What do they mean</th>
                  </tr>
               </thead>
               <tbody>
                  {STATUS_TAGS.map((t) => (
                     <tr key={t.tag} className="border-b border-[rgba(255,255,255,0.02)] last:border-0 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                        <td className="px-5 py-3 align-middle">
                           <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-[4px] border shadow-sm block text-center w-full" style={{ backgroundColor: t.bg, color: t.color, borderColor: t.border }}>
                              {t.tag}
                           </span>
                        </td>
                        <td className="px-5 py-3 text-[#B5BAC1] text-[13px] leading-relaxed">{t.def}</td>
                     </tr>
                  ))}
                  <tr className="bg-[rgba(255,255,255,0.02)] text-[#80848E] text-[10px] uppercase tracking-widest">
                     <td className="px-5 py-2.5 font-bold border-y border-[rgba(255,255,255,0.04)] text-center">Secondary Tags</td>
                     <td className="px-5 py-2.5 font-bold border-y border-[rgba(255,255,255,0.04)]">Tags placed with Values or Supply/Demand to better define a situation</td>
                  </tr>
                  {SECONDARY_TAGS.map((t) => (
                     <tr key={t.tag} className="border-b border-[rgba(255,255,255,0.02)] last:border-0 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                        <td className="px-5 py-3 align-middle">
                           <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-[4px] border shadow-sm block text-center w-full" style={{ backgroundColor: t.bg, color: t.color, borderColor: t.border }}>
                              {t.tag}
                           </span>
                        </td>
                        <td className="px-5 py-3 text-[#B5BAC1] text-[13px] leading-relaxed">{t.def}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[12px] overflow-hidden shadow-sm">
         <div className="bg-[#1E1F22] px-5 py-3 border-b border-[rgba(255,255,255,0.04)]">
            <h3 className="text-[#F2F3F5] font-bold text-[14px] uppercase tracking-wider">Unit Rarity (0 - 20)</h3>
         </div>
         <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-[rgba(255,255,255,0.02)] text-[#80848E] text-[10px] uppercase tracking-widest">
                     <th className="px-5 py-2.5 font-bold border-b border-[rgba(255,255,255,0.04)] w-[100px] text-center">Rarity</th>
                     <th className="px-5 py-2.5 font-bold border-b border-[rgba(255,255,255,0.04)]">What does it mean</th>
                  </tr>
               </thead>
               <tbody>
                  {RARITY_SCALE.map((r) => (
                     <tr key={r.val} className="border-b border-[rgba(255,255,255,0.02)] last:border-0 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                        <td className="px-5 py-2.5 align-middle text-center" style={{ backgroundColor: r.color }}>
                           <span className="text-[12px] font-black font-mono" style={{ color: r.textColor }}>{r.val}</span>
                        </td>
                        <td className="px-5 py-2.5 text-[#B5BAC1] text-[13px] leading-relaxed font-medium">{r.def}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
         <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[12px] overflow-hidden shadow-sm">
            <div className="bg-[#1E1F22] px-5 py-3 border-b border-[rgba(255,255,255,0.04)]">
               <h3 className="text-[#F2F3F5] font-bold text-[14px] uppercase tracking-wider">Unit Supply</h3>
            </div>
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-[rgba(255,255,255,0.02)] text-[#80848E] text-[10px] uppercase tracking-widest">
                     <th className="px-5 py-2.5 font-bold border-b border-[rgba(255,255,255,0.04)] w-[80px] text-center">Value</th>
                     <th className="px-5 py-2.5 font-bold border-b border-[rgba(255,255,255,0.04)]">Definition</th>
                  </tr>
               </thead>
               <tbody>
                  {SUPPLY_DEMAND.map((s) => (
                     <tr key={s.val} className="border-b border-[rgba(255,255,255,0.02)] last:border-0">
                        <td className="px-5 py-2.5 align-middle text-center bg-[#1E1F22] border-r border-[rgba(255,255,255,0.04)]">
                           <span className="text-[12px] font-black text-[#F2F3F5] font-mono">{s.val}</span>
                        </td>
                        <td className="px-5 py-2.5 text-[#B5BAC1] text-[13px]">{s.def}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
            <div className="p-4 bg-[rgba(255,255,255,0.02)] border-t border-[rgba(255,255,255,0.04)] text-[11px] text-[#949BA4] leading-relaxed">
               <strong>Note:</strong> Supply is based on the amount of units in circulation (taking into account its rarity).
            </div>
         </div>

         <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.04)] rounded-[12px] overflow-hidden shadow-sm">
            <div className="bg-[#1E1F22] px-5 py-3 border-b border-[rgba(255,255,255,0.04)]">
               <h3 className="text-[#F2F3F5] font-bold text-[14px] uppercase tracking-wider">Unit Demand</h3>
            </div>
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-[rgba(255,255,255,0.02)] text-[#80848E] text-[10px] uppercase tracking-widest">
                     <th className="px-5 py-2.5 font-bold border-b border-[rgba(255,255,255,0.04)] w-[80px] text-center">Value</th>
                     <th className="px-5 py-2.5 font-bold border-b border-[rgba(255,255,255,0.04)]">Definition</th>
                  </tr>
               </thead>
               <tbody>
                  {SUPPLY_DEMAND.map((s) => (
                     <tr key={s.val} className="border-b border-[rgba(255,255,255,0.02)] last:border-0">
                        <td className="px-5 py-2.5 align-middle text-center bg-[#1E1F22] border-r border-[rgba(255,255,255,0.04)]">
                           <span className="text-[12px] font-black text-[#F2F3F5] font-mono">{s.val}</span>
                        </td>
                        <td className="px-5 py-2.5 text-[#B5BAC1] text-[13px]">{s.def}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
            <div className="p-4 bg-[rgba(255,255,255,0.02)] border-t border-[rgba(255,255,255,0.04)] text-[11px] text-[#949BA4] leading-relaxed">
               <strong>Note:</strong> Demand <strong className="text-[#DBDEE1]">CAN</strong> influence a unit's value, but it is <strong className="text-[#DBDEE1]">NOT</strong> a direct relation. It merely means how easy it is to find someone interested.
            </div>
         </div>
      </div>

    </div>
  );
}