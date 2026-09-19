// FILE: src/app/components/TradeAnalyzer/AdComposer.tsx

import { useState } from "react";
import { Check, X, Megaphone, AlertCircle, BookOpen, Package } from "lucide-react";
import { useTradeStore } from "../../../store/useTradeStore";
import { useTradingAdsStore } from "../../../store/useTradingAdsStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useInventoryStore } from "../../../store/useInventoryStore";
import { useUnits } from "../../../context/UnitContext";
import { TradeCard } from "../../../types";

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
  "NLF: Low demand units"
];

export function AdComposer() {
  const { profile } = useAuthStore();
  const { giveItems, getItems, composerMode, setComposerOpen } = useTradeStore();
  const { createAd, ads } = useTradingAdsStore();
  const { items: inventoryItems } = useInventoryStore();
  const { units: ALL_UNITS } = useUnits();

  const [adType, setAdType] = useState<"standard" | "lf_offers" | "inventory">(composerMode);
  const [note, setNote] = useState("");
  const [ttl, setTtl] = useState(4);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");

  const role = profile?.role;
  const canModerate = role === 'master' || role === 'admin' || role === 'mod';

  const handlePublish = async () => {
    if (!profile) return;
    
    // --- RATE LIMITING & COOLDOWNS ---
    if (!canModerate) {
      const userAds = ads.filter(a => a.user_id === profile.id);
      
      // Limit: 1 Active Ad Max
      if (userAds.length >= 1) {
        setError("Regular users are limited to 1 active listing. Please delete your current ad to post a new one.");
        setTimeout(() => setError(""), 6000);
        return;
      }

      // Cooldown: 15 Minutes
      const lastPosted = localStorage.getItem('astd_last_ad_post');
      if (lastPosted) {
        const timeSinceLastPost = Date.now() - parseInt(lastPosted, 10);
        const cooldownPeriod = 15 * 60 * 1000; // 15 minutes
        if (timeSinceLastPost < cooldownPeriod) {
          const remainingMins = Math.ceil((cooldownPeriod - timeSinceLastPost) / 60000);
          setError(`You are on cooldown. Please wait ${remainingMins} minute(s) before posting another ad.`);
          setTimeout(() => setError(""), 6000);
          return;
        }
      }
    }
    // ---------------------------------

    let submitGive = giveItems;

    if (adType === "inventory") {
      const cards: TradeCard[] = [];
      inventoryItems.forEach((inv) => {
        const master = ALL_UNITS.find((unit) => unit.id === inv.unit_id);
        if (master && !inv.is_pinned) {
          const numericVal = typeof master.value === "number" ? master.value : master.valueMin || 0;
          cards.push({ id: master.id, name: master.name, subtitle: master.subtitle, value: numericVal, qty: inv.quantity });
        }
      });
      submitGive = cards;
      if (submitGive.length === 0) {
        setError("Your unpinned inventory is empty.");
        setTimeout(() => setError(""), 3000);
        return;
      }
    } else {
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
    }

    setIsPublishing(true);
    setError("");

    try {
      await createAd({
        userId: profile.id,
        giveItems: submitGive,
        getItems: adType === "lf_offers" || adType === "inventory" ? [] : getItems,
        note,
        ttlHours: ttl,
        adType
      });
      
      // Log successful post timestamp for regular users
      if (!canModerate) {
        localStorage.setItem('astd_last_ad_post', Date.now().toString());
      }
      
      setComposerOpen(false);
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'trading-ads' }));
    } catch (err: any) {
      setError(err.message || "Failed to publish ad.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#2B2D31] overflow-y-auto custom-scrollbar animate-fade-in h-full">
      <div className="p-4 md:p-5 flex flex-col gap-5 flex-1">
        {error && (
          <div className="bg-[#ed4245]/10 border border-[#ed4245]/30 p-3 rounded-[6px] text-[#ed4245] text-[12px] font-bold flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">Format</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-[#111214] p-1 rounded-[6px] border border-[rgba(255,255,255,0.04)] shadow-inner">
            <button 
              onClick={() => setAdType("standard")} 
              className={`py-2.5 px-2 text-[11px] md:text-[12px] font-bold tracking-wide rounded-[4px] transition-all focus-visible:outline-none text-center ${adType === "standard" ? "bg-[#1E1F22] text-[#F2F3F5] shadow-sm border border-[rgba(255,255,255,0.08)]" : "text-[#80848E] hover:text-[#DBDEE1] border border-transparent"}`}
            >
              Specific Trade
            </button>
            <button 
              onClick={() => setAdType("lf_offers")} 
              className={`py-2.5 px-2 text-[11px] md:text-[12px] font-bold tracking-wide rounded-[4px] transition-all focus-visible:outline-none text-center ${adType === "lf_offers" ? "bg-[rgba(250,166,26,0.1)] border border-[rgba(250,166,26,0.2)] text-[#FAA61A] shadow-sm" : "text-[#80848E] hover:text-[#DBDEE1] border border-transparent"}`}
            >
              Taking Offers
            </button>
            <button 
              onClick={() => setAdType("inventory")} 
              className={`py-2.5 px-2 text-[11px] md:text-[12px] font-bold tracking-wide rounded-[4px] transition-all focus-visible:outline-none text-center ${adType === "inventory" ? "bg-[rgba(35,165,89,0.1)] border border-[rgba(35,165,89,0.2)] text-[#23a559] shadow-sm" : "text-[#80848E] hover:text-[#DBDEE1] border border-transparent"}`}
            >
              Vault Showcase
            </button>
          </div>
          {adType === "lf_offers" && <p className="text-[11px] font-medium text-[#FAA61A] mt-0.5 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 shrink-0"/>"You Get" items will be ignored when publishing.</p>}
          {adType === "inventory" && <p className="text-[11px] font-medium text-[#23a559] mt-0.5 flex items-center gap-1"><Package className="w-3.5 h-3.5 shrink-0"/>Directly publishes your full unpinned Inventory.</p>}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">Trader Note</label>
            <span className="text-[10px] text-[#80848E] font-mono">{note.length}/150</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-1">
            {PRESET_NOTES.map((preset) => (
              <button
                key={preset}
                onClick={() => setNote(preset)}
                className="text-[10.5px] font-semibold bg-[#1E1F22] hover:bg-[#3F4147] text-[#949BA4] hover:text-[#DBDEE1] px-2.5 py-1.5 rounded-[4px] border border-[rgba(255,255,255,0.04)] transition-colors focus-visible:outline-none shadow-sm"
              >
                {preset}
              </button>
            ))}
          </div>
          <textarea
            maxLength={150}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type custom note or select a preset above..."
            className="bg-[#1E1F22] text-[#F2F3F5] text-[13px] px-3.5 py-3 rounded-[6px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2] shadow-inner w-full resize-none h-[80px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-[#949BA4]">Listing Duration</label>
          <select
            value={ttl}
            onChange={(e) => setTtl(Number(e.target.value))}
            className="bg-[#1E1F22] text-[#F2F3F5] text-[13px] px-3.5 py-3 rounded-[6px] outline-none border border-[rgba(255,255,255,0.04)] focus:border-[#5865F2] shadow-inner w-full cursor-pointer"
          >
            {TTL_OPTIONS.map((o) => (
              <option key={o.hours} value={o.hours}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 bg-[#1E1F22] border-t border-[rgba(255,255,255,0.04)] flex items-center justify-end gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4">
        <button
          onClick={() => setComposerOpen(false)}
          className="px-5 py-2.5 text-[12px] font-bold text-[#80848E] hover:text-[#DBDEE1] hover:bg-[#2B2D31] rounded-[6px] focus-visible:outline-none transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handlePublish}
          disabled={isPublishing || (adType !== 'inventory' && giveItems.length === 0)}
          className="px-6 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#2B2D31] disabled:text-[#80848E] text-white text-[12px] font-bold uppercase tracking-wider rounded-[6px] transition-colors shadow-md flex items-center gap-2 focus-visible:outline-none active:scale-[0.98]"
        >
          {isPublishing ? "Publishing..." : <><Check className="w-4 h-4" /> Publish Ad</>}
        </button>
      </div>
    </div>
  );
}