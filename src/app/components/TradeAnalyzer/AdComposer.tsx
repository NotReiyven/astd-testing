// ================================================
// FILE: src/app/components/TradeAnalyzer/AdComposer.tsx
// ================================================

import { useState } from "react";
import { Check, X, AlertCircle, Loader2 } from "lucide-react";
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
  const { createAd } = useTradingAdsStore();
  const { items: inventoryItems } = useInventoryStore();
  const { units: ALL_UNITS } = useUnits();

  const [adType, setAdType] = useState<"standard" | "lf_offers" | "inventory">(composerMode);
  const [note, setNote] = useState("");
  const [ttl, setTtl] = useState(4);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");

  const hasGiveItems = giveItems.length > 0;
  const hasGetItems = getItems.length > 0;
  const hasUnpinnedInventory = inventoryItems.some(i => !i.is_pinned);

  let isReadyToPublish = true;
  let validationHint = "Publish Ad";

  if (adType === "standard") {
    if (!hasGiveItems && !hasGetItems) {
      isReadyToPublish = false;
      validationHint = "Add Give & Get Items";
    } else if (!hasGiveItems) {
      isReadyToPublish = false;
      validationHint = "Add Give Items";
    } else if (!hasGetItems) {
      isReadyToPublish = false;
      validationHint = "Add Get Items";
    }
  } else if (adType === "lf_offers") {
    if (!hasGiveItems) {
      isReadyToPublish = false;
      validationHint = "Add Give Items";
    }
  } else if (adType === "inventory") {
    if (!hasUnpinnedInventory) {
      isReadyToPublish = false;
      validationHint = "Vault is Empty";
    }
  }

  const handlePublish = async () => {
    if (!profile || !isReadyToPublish) return;
    
    let submitGive = giveItems;

    if (adType === "inventory") {
      const ObjectCards: TradeCard[] = [];
      
      const sortedInv = [...inventoryItems].sort((a, b) => {
        const m1 = ALL_UNITS.find(u => u.id === a.unit_id);
        const m2 = ALL_UNITS.find(u => u.id === b.unit_id);
        const v1 = m1 ? (typeof m1.value === 'number' ? m1.value : m1.valueMin || 0) : 0;
        const v2 = m2 ? (typeof m2.value === 'number' ? m2.value : m2.valueMin || 0) : 0;
        return v2 - v1;
      });

      sortedInv.forEach((inv) => {
        const master = ALL_UNITS.find((unit) => unit.id === inv.unit_id);
        if (master && !inv.is_pinned && ObjectCards.length < 25) {
          const numericVal = typeof master.value === "number" ? master.value : master.valueMin || 0;
          ObjectCards.push({ id: master.id, name: master.name, subtitle: master.subtitle, value: numericVal, qty: inv.quantity });
        }
      });
      
      submitGive = ObjectCards;
    }

    setIsPublishing(true);
    setError("");

    try {
      const result = await createAd({
        userId: profile.id,
        giveItems: submitGive,
        getItems: adType === "lf_offers" || adType === "inventory" ? [] : getItems,
        note,
        ttlHours: ttl,
        adType
      });
      
      if (result?.error) throw result.error;
      
      setComposerOpen(false);
      window.document.dispatchEvent(new CustomEvent('navigate', { detail: 'trading-ads' }));
    } catch (err: any) {
      setError(err.message || "Failed to publish ad.");
      setTimeout(() => setError(""), 6000);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-card overflow-y-auto custom-scrollbar animate-fade-in h-full">
      <div className="p-4 md:p-6 flex flex-col gap-6 flex-1">
        {error && (
          <div className="bg-destructive/15 border border-destructive/40 p-3.5 rounded-[8px] text-destructive text-[13px] font-bold flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* CLEAN TYPOGRAPHIC FORMAT CARDS */}
        <div className="flex flex-col gap-2.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">Listing Format</label>
          <div className="grid grid-cols-1 gap-2.5">
            
            <button 
              type="button"
              onClick={() => setAdType("standard")} 
              className={`flex flex-col text-left p-4 rounded-[8px] transition-all focus-visible:outline-none cursor-pointer border ${
                adType === "standard" 
                  ? "bg-popover border-primary ring-1 ring-primary/30 shadow-md" 
                  : "bg-card hover:bg-muted/60 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[13px] font-extrabold uppercase tracking-wide text-foreground">Specific Trade</span>
                {adType === "standard" && <Check className="w-4 h-4 text-primary" />}
              </div>
              <span className="text-[12px] text-muted-foreground leading-relaxed">
                Offer specific units in exchange for specific requested units. Requires items in both <strong>Give</strong> and <strong>Get</strong>.
              </span>
            </button>

            <button 
              type="button"
              onClick={() => setAdType("lf_offers")} 
              className={`flex flex-col text-left p-4 rounded-[8px] transition-all focus-visible:outline-none cursor-pointer border ${
                adType === "lf_offers" 
                  ? "bg-popover border-[#FAA61A] ring-1 ring-[#FAA61A]/30 shadow-md" 
                  : "bg-card hover:bg-muted/60 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[13px] font-extrabold uppercase tracking-wide text-foreground">Taking Offers (LF Offers)</span>
                {adType === "lf_offers" && <Check className="w-4 h-4 text-[#FAA61A]" />}
              </div>
              <span className="text-[12px] text-muted-foreground leading-relaxed">
                Offer your units and leave the request open to general community offers. Requires items only in <strong>Give</strong>.
              </span>
            </button>

            <button 
              type="button"
              onClick={() => setAdType("inventory")} 
              className={`flex flex-col text-left p-4 rounded-[8px] transition-all focus-visible:outline-none cursor-pointer border ${
                adType === "inventory" 
                  ? "bg-popover border-[#23a559] ring-1 ring-[#23a559]/30 shadow-md" 
                  : "bg-card hover:bg-muted/60 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-[13px] font-extrabold uppercase tracking-wide text-foreground">Vault Showcase</span>
                {adType === "inventory" && <Check className="w-4 h-4 text-[#23a559]" />}
              </div>
              <span className="text-[12px] text-muted-foreground leading-relaxed">
                Showcase your entire personal vault collection on the trading board. Automatically pulls your unpinned vault items.
              </span>
            </button>

          </div>
        </div>

        {/* TRADER NOTE */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trader Note</label>
            <span className="text-[10px] text-muted-foreground font-mono">{note.length}/150</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-1">
            {PRESET_NOTES.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setNote(preset)}
                className="text-[11px] font-semibold bg-popover hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-2 rounded-[6px] border border-border transition-colors focus-visible:outline-none shadow-sm cursor-pointer"
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
            className="bg-input text-foreground text-[13px] px-3.5 py-3 rounded-[6px] outline-none border border-border focus:border-primary shadow-inner w-full resize-none h-[88px]"
          />
        </div>

        {/* LISTING DURATION */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">Listing Duration</label>
          <select
            value={ttl}
            onChange={(e) => setTtl(Number(e.target.value))}
            className="bg-input text-foreground text-[13px] px-3.5 py-3 rounded-[6px] outline-none border border-border focus:border-primary shadow-inner w-full cursor-pointer min-h-[44px]"
          >
            {TTL_OPTIONS.map((o) => (
              <option key={o.hours} value={o.hours}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 bg-popover border-t border-border flex items-center justify-end gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 shadow-sm">
        <button
          type="button"
          onClick={() => setComposerOpen(false)}
          className="px-5 py-2.5 min-h-[44px] text-[12px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border rounded-[4px] focus-visible:outline-none transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing || !isReadyToPublish}
          className="px-6 py-2.5 min-h-[44px] bg-primary hover:bg-primary/80 disabled:bg-popover disabled:opacity-40 text-primary-foreground text-[12px] font-bold uppercase tracking-wider rounded-[4px] transition-colors shadow-md flex items-center gap-2 focus-visible:outline-none active:scale-[0.98] cursor-pointer"
        >
          {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isPublishing ? "Publishing..." : validationHint}
        </button>
      </div>
    </div>
  );
}