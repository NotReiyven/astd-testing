import React from "react";
import { THEORY_STATUS_TAGS, THEORY_SECONDARY_TAGS, THEORY_RARITY_SCALE, THEORY_LIQUIDITY_SCALE } from "../../../data";

const FIRE_ZIO_AVATAR = "/units/firezio.webp";

export function TheoryTab() {
  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto animate-fade-in pb-8 font-sans">
      
      <div className="bg-[#1e2124] border-l-4 border-l-[#ed4245] border-y border-y-[#424549] border-r border-r-[#424549] rounded-r-[8px] p-5 shadow-sm flex items-start gap-4">
        <img src={FIRE_ZIO_AVATAR} className="w-12 h-12 rounded-full border border-[#ed4245] object-cover flex-shrink-0" alt="Fire Zio" />
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Market Theory Briefing</span>
          <p className="text-[#b9bbbe] text-[13px] italic font-medium leading-relaxed">
            "Raw value isn't everything. Memorize these market definitions or you'll get completely scammed. The data below is pulled directly from our internal documentation."
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-[#282b30] border border-[#424549] rounded-[8px] overflow-hidden shadow-sm">
           <div className="bg-[#1e2124] px-5 py-3 border-b border-[#424549]">
              <h3 className="text-[#ffffff] font-bold text-[14px] uppercase tracking-wider">Unit Tags</h3>
           </div>
           <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-[#1e2124] text-[#b9bbbe] text-[10px] uppercase tracking-widest border-b border-[#424549]">
                       <th className="px-5 py-3 font-bold w-[140px]">Units Tags</th>
                       <th className="px-5 py-3 font-bold">What do they mean</th>
                    </tr>
                 </thead>
                 <tbody>
                    {THEORY_STATUS_TAGS.map((t) => (
                       <tr key={t.tag} className="border-b border-[rgba(255,255,255,0.02)] last:border-0 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                          <td className="px-5 py-3 align-middle">
                             <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-[4px] border block text-center w-full" style={{ backgroundColor: t.bg, color: t.color, borderColor: t.border }}>
                                {t.tag}
                             </span>
                          </td>
                          <td className="px-5 py-3 text-[#ffffff] text-[13px] leading-relaxed">{t.def}</td>
                       </tr>
                    ))}
                    <tr className="bg-[#1e2124] text-[#b9bbbe] text-[10px] uppercase tracking-widest border-y border-[#424549]">
                       <td className="px-5 py-3 font-bold text-center">Secondary Tags</td>
                       <td className="px-5 py-3 font-bold">Tags placed with Values or Liquidity to better define a situation</td>
                    </tr>
                    {THEORY_SECONDARY_TAGS.map((t) => (
                       <tr key={t.tag} className="border-b border-[rgba(255,255,255,0.02)] last:border-0 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                          <td className="px-5 py-3 align-middle">
                             <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-[4px] border block text-center w-full" style={{ backgroundColor: t.bg, color: t.color, borderColor: t.border }}>
                                {t.tag}
                             </span>
                          </td>
                          <td className="px-5 py-3 text-[#ffffff] text-[13px] leading-relaxed">{t.def}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="bg-[#1e2124] border-l-4 border-l-[#ed4245] border-y border-y-[#424549] border-r border-r-[#424549] rounded-r-[8px] p-4 shadow-inner flex items-start gap-4">
            <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e2124]" alt="Fire Zio" />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Reality Check</span>
              <p className="text-[#b9bbbe] text-[13px] italic font-medium leading-relaxed">
                "Read the tags. If you blindly accept an 'Inflated' or 'Dropping' unit just because the raw value looks like a win, you're an idiot. Enjoy holding a brick."
              </p>
            </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-[#282b30] border border-[#424549] rounded-[8px] overflow-hidden shadow-sm">
           <div className="bg-[#1e2124] px-5 py-3 border-b border-[#424549]">
              <h3 className="text-[#ffffff] font-bold text-[14px] uppercase tracking-wider">Unit Rarity (0 - 20)</h3>
           </div>
           <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-[#1e2124] text-[#b9bbbe] text-[10px] uppercase tracking-widest border-b border-[#424549]">
                       <th className="px-5 py-3 font-bold w-[100px] text-center">Rarity</th>
                       <th className="px-5 py-3 font-bold">What does it mean</th>
                    </tr>
                 </thead>
                 <tbody>
                    {THEORY_RARITY_SCALE.map((r) => (
                       <tr key={r.val} className="border-b border-[rgba(255,255,255,0.02)] last:border-0 hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                          <td className="px-5 py-2.5 align-middle text-center bg-[#1e2124] border-r border-[#424549]">
                             <span className="text-[12px] font-black font-mono px-2 py-1 rounded-[4px]" style={{ backgroundColor: r.color, color: r.textColor }}>{r.val}</span>
                          </td>
                          <td className="px-5 py-2.5 text-[#ffffff] text-[13px] leading-relaxed font-medium">{r.def}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="bg-[#1e2124] border-l-4 border-l-[#ed4245] border-y border-y-[#424549] border-r border-r-[#424549] rounded-r-[8px] p-4 shadow-inner flex items-start gap-4">
            <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e2124]" alt="Fire Zio" />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Market Note</span>
              <p className="text-[#b9bbbe] text-[13px] italic font-medium leading-relaxed">
                "Rarity 20 means there are literally less than 20 copies in existence. If you ever pull one, lock your inventory and don't accept any trades until you consult an actual analyst. Don't throw away a unicorn."
              </p>
            </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
         <div className="bg-[#282b30] border border-[#424549] rounded-[8px] overflow-hidden shadow-sm h-full flex flex-col">
            <div className="bg-[#1e2124] px-5 py-3 border-b border-[#424549]">
               <h3 className="text-[#ffffff] font-bold text-[14px] uppercase tracking-wider">Unit Liquidity</h3>
            </div>
            <table className="w-full text-left border-collapse flex-1">
               <thead>
                  <tr className="bg-[#1e2124] text-[#b9bbbe] text-[10px] uppercase tracking-widest border-b border-[#424549]">
                     <th className="px-5 py-3 font-bold w-[120px] text-center">Value</th>
                     <th className="px-5 py-3 font-bold">Definition</th>
                  </tr>
               </thead>
               <tbody>
                  {THEORY_LIQUIDITY_SCALE.map((s) => (
                     <tr key={s.val} className="border-b border-[rgba(255,255,255,0.02)] last:border-0">
                        <td className="px-5 py-2.5 align-middle text-center bg-[#1e2124] border-r border-[#424549]">
                           <span className="text-[12px] font-black font-mono px-2 py-1 rounded-[4px]" style={{ color: s.color }}>{s.val.toUpperCase()}</span>
                        </td>
                        <td className="px-5 py-2.5 text-[#ffffff] text-[13px]">{s.def}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
            <div className="p-4 bg-[#1e2124] border-t border-[#424549] text-[11px] text-[#b9bbbe] leading-relaxed">
               <strong>Note:</strong> Liquidity is Supply & Demand fused. It dictates how easy a unit is to trade off to others.
            </div>
         </div>

         <div className="bg-[#1e2124] border-l-4 border-l-[#ed4245] border-y border-y-[#424549] border-r border-r-[#424549] rounded-r-[8px] p-4 shadow-inner flex items-start gap-4">
            <img src={FIRE_ZIO_AVATAR} className="w-10 h-10 rounded-full border border-[#ed4245] object-cover shrink-0 bg-[#1e2124]" alt="Fire Zio" />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#ed4245]">Fire Zio's Final Warning</span>
              <p className="text-[#b9bbbe] text-[13px] italic font-medium leading-relaxed">
                "A unit with 10k value and 'Low' liquidity is functionally worthless. It's a dead asset. Stop asking in the trading channels why nobody wants your garbage. Value means nothing without liquidity."
              </p>
            </div>
         </div>
      </div>

    </div>
  );
}