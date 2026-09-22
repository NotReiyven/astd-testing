// ================================================
// FILE: src/app/components/TradeAnalyzer/TradeSummaryBox.tsx
// ================================================

import { useState } from "react";
import { avgStat, getTradeForecast, getLiquidityScore } from "./summaryUtils";
import { TradeCard, MasterUnit } from "../../../types";
import { TrendingUp, Clock, AlertTriangle } from "lucide-react"; 
import { RollingNumber } from "../shared/Formatters";

interface TradeSummaryBoxProps {
  isMainStep4: boolean;
  giveTotal: number;
  getTotal: number;
  givePercent: number;
  getPercent: number;
  giveItems: TradeCard[];
  getItems: TradeCard[];
  ALL_UNITS: MasterUnit[];
  isCompact?: boolean;
}

export function TradeSummaryBox({
  isMainStep4, giveTotal, getTotal, givePercent, getPercent, giveItems, getItems, ALL_UNITS, isCompact = false
}: TradeSummaryBoxProps) {
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const forecast = getTradeForecast(giveItems, getItems, ALL_UNITS);

  const getLiqLabel = (items: TradeCard[]) => {
    if (items.length === 0) return "—";
    const score = getLiquidityScore(items, ALL_UNITS);
    if (score >= 3.0) return "High";
    if (score <= 0.6) return "Low";
    return "Avg";
  };

  const handleEnter = (tip: string) => {
    if (window.matchMedia('(hover: hover)').matches) setActiveTip(tip);
  };

  const handleLeave = () => setActiveTip(null);

  // Compact collapsed bar when mobile user is typing/searching to prevent keyboard overlap
  if (isCompact) {
    const valDiff = getTotal - giveTotal;
    return (
      <div className="flex-shrink-0 mx-3 mt-2 rounded-[6px] px-3.5 py-2.5 bg-popover border border-border flex items-center justify-between shadow-sm z-20 animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Give:</span>
          <span className="text-[12px] font-black font-mono text-[#FAA61A]"><RollingNumber value={giveTotal} /></span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] font-black">
          <span className={valDiff > 0 ? 'text-[#23a559]' : valDiff < 0 ? 'text-rose-400' : 'text-foreground'}>
            {valDiff > 0 ? '+' : ''}<RollingNumber value={valDiff} />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Get:</span>
          <span className="text-[12px] font-black font-mono text-primary"><RollingNumber value={getTotal} /></span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-shrink-0 mx-4 mt-5 rounded-[8px] px-5 py-4 md:px-6 md:py-5 relative bg-card border transition-all duration-300 z-20 ${isMainStep4 ? 'border-primary shadow-[0_0_20px_var(--primary)] ring-4 ring-primary/30' : 'border-border'}`}>
      <div className="mb-5">
        
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Total Give</p>
            <p className="text-[16px] sm:text-[18px] font-black text-foreground font-mono truncate" title={giveTotal.toLocaleString()}><RollingNumber value={giveTotal} /></p>
          </div>
          
          {giveTotal > 0 && getTotal > 0 && (
             <div className="flex flex-col items-center flex-shrink-0 px-3">
                <span className={`text-[13px] sm:text-[14px] font-black font-mono flex items-center ${getTotal > giveTotal ? 'text-[#23a559]' : getTotal < giveTotal ? 'text-rose-400' : 'text-foreground'}`}>
                  {getTotal > giveTotal ? '+' : ''}<RollingNumber value={getTotal - giveTotal} />
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Raw Diff</span>
             </div>
          )}

          <div className="min-w-0 flex-1 text-right">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Total Get</p>
            <p className="text-[16px] sm:text-[18px] font-black text-foreground font-mono truncate" title={getTotal.toLocaleString()}><RollingNumber value={getTotal} /></p>
          </div>
        </div>

        <div className="flex w-full h-[6px] gap-1.5 mb-5">
          {giveTotal > 0 && <div className="rounded-full bg-[#FAA61A]" style={{ width: `${givePercent}%`, transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }} />}
          {getTotal > 0 && <div className="rounded-full bg-primary" style={{ width: `${getPercent}%`, transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }} />}
          {giveTotal === 0 && getTotal === 0 && <div className="w-full h-full rounded-full bg-popover transition-all duration-500" />}
        </div>

        <div className="bg-black/20 rounded-[6px] p-3.5">
          {forecast.calculable ? (
            <div className="flex justify-between items-stretch">
               <div 
                 className="flex flex-col flex-1 border-r border-border/60 pr-4 py-1 relative cursor-help"
                 onMouseEnter={() => handleEnter('st')}
                 onMouseLeave={handleLeave}
               >
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[#FAA61A]" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Short-Term Flip</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                     <span className={`text-[16px] sm:text-[20px] font-black font-mono leading-none ${forecast.st > 0 ? 'text-[#23a559]' : forecast.st < 0 ? 'text-rose-400' : 'text-foreground'}`}>
                       {forecast.st > 0 ? '+' : ''}{forecast.st.toFixed(1)}
                     </span>
                  </div>
                  <div className={`absolute top-full mt-2 left-0 w-[200px] bg-popover border border-border text-foreground text-[11px] p-3 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] ${activeTip === 'st' ? 'opacity-100' : 'opacity-0'}`}>
                    <strong className="text-[#FAA61A] block mb-1">Short-Term Flip</strong>
                    Scores &gt; 0 are wins. Calculated using Raw Value, Liquidity, and immediate Market Tag momentum.
                  </div>
               </div>
               
               <div 
                 className="flex flex-col flex-1 pl-4 py-1 relative cursor-help"
                 onMouseEnter={() => handleEnter('lt')}
                 onMouseLeave={handleLeave}
               >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Long-Term Hold</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                     <span className={`text-[16px] sm:text-[20px] font-black font-mono leading-none ${forecast.lt > 0 ? 'text-[#23a559]' : forecast.lt < 0 ? 'text-rose-400' : 'text-foreground'}`}>
                       {forecast.lt > 0 ? '+' : ''}{forecast.lt.toFixed(1)}
                     </span>
                  </div>
                  <div className={`absolute top-full mt-2 right-0 w-[200px] bg-popover border border-border text-foreground text-[11px] p-3 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] ${activeTip === 'lt' ? 'opacity-100' : 'opacity-0'}`}>
                    <strong className="text-primary block mb-1">Long-Term Hold</strong>
                    Scores &gt; 0 are wins. Weighs Rarity heavily and mathematically punishes "Hyped" or "Unstable" units.
                  </div>
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2.5 text-center gap-1.5">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-[#FAA61A] opacity-80" />
              <span className="text-[10px] sm:text-[11px] font-bold text-foreground">Forecast Unavailable</span>
              <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">
                {giveItems.length === 0 || getItems.length === 0 
                  ? "Add units to both sides to generate a market projection." 
                  : "Cannot accurately predict trades containing Owner's Choice units."}
              </span>
            </div>
          )}
        </div>

      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        {/* RARITY */}
        <div 
          className="flex flex-col items-center p-2.5 rounded-[6px] bg-black/20 border border-border/50 transition-all duration-300 hover:bg-black/30 relative cursor-help"
          onMouseEnter={() => handleEnter('rarity')}
          onMouseLeave={handleLeave}
        >
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Rarity</span>
          <span className="text-[10px] sm:text-[12px] font-bold text-foreground font-mono flex items-center gap-1.5">{avgStat(giveItems, "rarity", ALL_UNITS)} <span className="text-muted-foreground text-[9px] sm:text-[10px]">➔</span> {avgStat(getItems, "rarity", ALL_UNITS)}</span>
          <div className={`absolute top-full mt-2 left-0 sm:left-1/2 sm:-translate-x-1/2 w-[160px] bg-popover border border-border text-foreground text-[11px] p-2.5 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] text-left sm:text-center ${activeTip === 'rarity' ? 'opacity-100' : 'opacity-0'}`}>
            <strong className="text-foreground block mb-1">Rarity (0-20)</strong>
            <span className="text-[#23a559] font-bold">Higher is better.</span> Determines absolute scarcity. Impacts Long-Term hold scores heavily.
          </div>
        </div>
        {/* LIQUIDITY */}
        <div 
          className="flex flex-col items-center p-2.5 rounded-[6px] bg-black/20 border border-border/50 transition-all duration-300 hover:bg-black/30 relative cursor-help"
          onMouseEnter={() => handleEnter('liquidity')}
          onMouseLeave={handleLeave}
        >
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Liquidity</span>
          <span className="text-[10px] sm:text-[12px] font-bold text-foreground font-mono flex items-center gap-1.5">{getLiqLabel(giveItems)} <span className="text-muted-foreground text-[9px] sm:text-[10px]">➔</span> {getLiqLabel(getItems)}</span>
          <div className={`absolute top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 w-[160px] bg-popover border border-border text-foreground text-[11px] p-2.5 rounded-[6px] shadow-lg pointer-events-none transition-opacity z-[100] text-right sm:text-center ${activeTip === 'liquidity' ? 'opacity-100' : 'opacity-0'}`}>
            <strong className="text-foreground block mb-1">Liquidity</strong>
            <span className="text-[#23a559] font-bold">High is better.</span> How fast you can find a buyer. Dictates short-term viability.
          </div>
        </div>
      </div>
    </div>
  );
}