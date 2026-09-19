import { useState } from "react";
import { Check, X, Megaphone, AlertCircle, BookOpen } from "lucide-react";
import { useTradeStore } from "../../../store/useTradeStore";
import { useTradingAdsStore } from "../../../store/useTradingAdsStore";
import { useAuthStore } from "../../../store/useAuthStore";

const TTL_OPTIONS = [
  { hours: 1, label: "1 Hour (Quick Flip)" },
  { hours: 4, label: "4 Hours (Standard)" },
  { hours: 12, label: "12 Hours (Overnight)" },
  { hours: 24, label: "24 Hours (Maximum)" }
];

const PRESET_NOTES = [
  "Upgrading only",
  "Downgrading only",
  "Taking underpays",
  "Strictly fair trades",
  "DM on Discord to offer",
  "NLF: Units with low demand"
];

export function AdComposer() {
  const { profile } = useAuthStore();
  const { giveItems, getItems, composerMode, setComposerOpen } = useTradeStore();
  const { createAd } = useTradingAdsStore();

  const [adType, setAdType] = useState<"standard" | "lf_offers" | "inventory">(composerMode);
  const [note, setNote] = useState("");
  const [ttl, setTtl] = useState(4);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");

  const handlePublish = async () => {
    if (!profile) return;
    
    if (giveItems.length === 0) {
      setError("You must offer at least 1 unit to post an ad.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (adType === "standard" && getItems.length === 0) {
      setError("Standard trades require 'Get' items. Switch to 'LF Offers' if you want open offers.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    setIsPublishing(true);
    setError("");

    try {
      await createAd({
        userId: profile.id,
        giveItems,
        getItems: adType === "lf_offers" ? [] : getItems,
        note,
        ttlHours: ttl,
        adType
      });
      
      setComposerOpen(false);
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'trading-ads' }));
    } catch (err: any) {
      setError(err.message || "Failed to publish ad.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-[#18191C] border-t border-[rgba(0,0,0,0.4)] flex flex-col shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-[100] mt-auto">
      <div className="flex items-center justify-between px-4 py-3 bg-[#2B2D31] border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#5865F2]" />
          <h3 className="text-[13px] font-black text-[#F2F3F5] uppercase tracking-wide">Publish Trading Ad</h3>
        </div>
        <button onClick={() => setComposerOpen(false)} className="text-[#80848E] hover:text-[#F2F3F5] transition-colors focus-visible:outline-none p-1 -m-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 max-h-[40vh] overflow-y-auto custom-scrollbar">
        {error && (
          <div className="bg-[#ed4245]/10 border border-[#ed4245]/30 p-2.5 rounded-[4px] text-[#ed4245] text-[12px] font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4]">Advertisement Type</label>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setAdType("standard")} 
              className={`p-2 rounded-[4px] border flex flex-col items-center justify-center gap-1 transition-all focus-visible:outline-none ${adType === "standard" ? "bg-[#5865F2]/10 border-[#5865F2] text-[#5865F2]" : "bg-[#1E1F22] border-[rgba(255,255,255,0.04)] text-[#80848E] hover:border-[#5865F2]/50 hover:text-[#DBDEE1]"}`}
            >
              <span className="text-[12px] font-bold">Specific Trade</span>
            </button>
            <button 
              onClick={() => setAdType("lf_offers")} 
              className={`p-2 rounded-[4px] border flex flex-col items-center justify-center gap-1 transition-all focus-visible:outline-none ${adType === "lf_offers" ? "bg-[#FAA61A]/10 border-[#FAA61A] text-[#FAA61A]" : "bg-[#1E1F22] border-[rgba(255,255,255,0.04)] text-[#80848E] hover:border-[#FAA61A]/50 hover:text-[#DBDEE1]"}`}
            >
              <span className="text-[12px] font-bold">LF Offers</span>
            </button>
            <button 
              onClick={() => setAdType("inventory")} 
              className={`p-2 rounded-[4px] border flex flex-col items-center justify-center gap-1 transition-all focus-visible:outline-none ${adType === "inventory" ? "bg-[#23a559]/10 border-[#23a559] text-[#23a559]" : "bg-[#1E1F22] border-[rgba(255,255,255,0.04)] text-[#80848E] hover:border-[#23a559]/50 hover:text-[#DBDEE1]"}`}
            >
              <span className="text-[12px] font-bold text-center leading-tight">Trading Inventory</span>
            </button>
          </div>
          {adType === "lf_offers" && <p className="text-[11px] text-[#FAA61A] mt-0.5"><BookOpen className="w-3 h-3 inline mr-1 -mt-0.5"/>"You Get" items will be ignored when publishing.</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4]">Trader Note (150 chars max)</label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {PRESET_NOTES.map((preset) => (
              <button
                key={preset}
                onClick={() => setNote(preset)}
                className="text-[10px] font-medium bg-[#2B2D31] hover:bg-[#3F4147] text-[#DBDEE1] px-2 py-1 rounded-[4px] border border-[rgba(255,255,255,0.04)] transition-colors focus-visible:outline-none"
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="text"
            maxLength={150}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type custom note or select a preset..."
            className="bg-[#1E1F22] text-[#F2F3F5] text-[12px] px-3 py-2.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2] shadow-inner"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#949BA4]">Listing Duration</label>
          <select
            value={ttl}
            onChange={(e) => setTtl(Number(e.target.value))}
            className="bg-[#1E1F22] text-[#F2F3F5] text-[12px] px-3 py-2.5 rounded-[4px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2] shadow-inner"
          >
            {TTL_OPTIONS.map((o) => (
              <option key={o.hours} value={o.hours}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 bg-[#2B2D31] border-t border-[rgba(255,255,255,0.04)] flex items-center justify-end gap-3">
        <button
          onClick={() => setComposerOpen(false)}
          className="px-4 py-2.5 text-[12px] font-bold text-[#DBDEE1] hover:bg-[#1E1F22] rounded-[4px] focus-visible:outline-none transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handlePublish}
          disabled={isPublishing || giveItems.length === 0}
          className="px-6 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#1E1F22] disabled:text-[#80848E] text-white text-[12px] font-bold uppercase tracking-wider rounded-[4px] transition-colors shadow-sm flex items-center gap-1.5 focus-visible:outline-none"
        >
          {isPublishing ? "Publishing..." : <><Check className="w-3.5 h-3.5" /> Publish Ad</>}
        </button>
      </div>
    </div>
  );
}