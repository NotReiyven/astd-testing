import { MasterUnit } from "../../../types";

export function getSortValue(u: MasterUnit): number {
  const disp = u.valueDisplay?.toLowerCase() || "";
  if (u.value === "owner" || disp.includes("owner's choice") || disp.includes("o/c")) return Infinity;
  if (u.value === "range" && typeof u.valueMin === "number") return u.valueMin;
  return typeof u.value === "number" ? u.value : 0;
}

export function processUnits(units: MasterUnit[], sortMode: string, statusFilter: string) {
  let processed = [...units];
  if (statusFilter !== "all") processed = processed.filter(u => u.status === statusFilter);
  
  const liqScore = (l: string | undefined) => {
    if (!l) return 2;
    const low = l.toLowerCase();
    if (low === 'high') return 3;
    if (low === 'low') return 1;
    return 2;
  };

  processed.sort((a, b) => {
    const valA = getSortValue(a);
    const valB = getSortValue(b);

    if (sortMode === "value-desc") {
      if (valA === Infinity && valB === Infinity) return a.name.localeCompare(b.name);
      return valB - valA;
    }
    if (sortMode === "value-asc") {
      if (valA === Infinity && valB === Infinity) return a.name.localeCompare(b.name);
      return valA - valB;
    }
    if (sortMode === "liq-desc") {
      const la = liqScore(a.liquidity);
      const lb = liqScore(b.liquidity);
      if (lb !== la) return lb - la;
      if (valA === Infinity && valB === Infinity) return a.name.localeCompare(b.name);
      return valB - valA;
    }
    if (sortMode === "liq-asc") {
      const la = liqScore(a.liquidity);
      const lb = liqScore(b.liquidity);
      if (la !== lb) return la - lb;
      if (valA === Infinity && valB === Infinity) return a.name.localeCompare(b.name);
      return valB - valA;
    }
    if (sortMode === "rarity-desc") {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity;
      if (valA === Infinity && valB === Infinity) return a.name.localeCompare(b.name);
      return valB - valA;
    }
    if (sortMode === "alpha-asc") return a.name.localeCompare(b.name);
    return 0;
  });
  return processed;
}

export function buildSections(units: MasterUnit[], sortMode: string, statusFilter: string, tier: string) {
  const isValueSort = sortMode === "value-desc" || sortMode === "value-asc";
  const sectionsMap = new Map<string, { label: string; range: string; units: MasterUnit[] }>();
  const isStandardTier = ["S", "A", "B", "C"].includes(tier);
  
  let topCatLabel = "";
  let topCatRange = "";
  if (isStandardTier) {
    units.forEach((u) => {
      if (u.subCategory?.toLowerCase().includes("top")) {
        topCatLabel = u.subCategory;
        topCatRange = u.subCategoryRange || "N/A";
      }
    });
  }

  units.forEach((u) => {
    let cat = u.subCategory || "Uncategorized";
    let range = u.subCategoryRange || "N/A";

    if (isValueSort && isStandardTier && getSortValue(u) === Infinity && topCatLabel) {
      cat = topCatLabel;
      range = topCatRange;
    }
    
    if (!sectionsMap.has(cat)) sectionsMap.set(cat, { label: cat, range, units: [] });
    sectionsMap.get(cat)!.units.push(u);
  });

  const mappedSections = Array.from(sectionsMap.values()).map(sec => ({
    ...sec, processedUnits: processUnits(sec.units, sortMode, statusFilter)
  })).filter(sec => sec.processedUnits.length > 0);

  if (isValueSort && isStandardTier) {
    const subCatPriority: Record<string, number> = { "top": 1, "high": 2, "mid": 3, "low": 4 };
    mappedSections.sort((a, b) => {
      const getRank = (name: string) => {
        const lower = name.toLowerCase();
        for (const key of Object.keys(subCatPriority)) {
          if (lower.includes(key)) return subCatPriority[key];
        }
        return 99;
      };

      const rankA = getRank(a.label);
      const rankB = getRank(b.label);

      if (rankA !== rankB) return sortMode === "value-desc" ? rankA - rankB : rankB - rankA;

      const valA = Math.max(...a.processedUnits.map(u => getSortValue(u)).filter(v => v !== Infinity), 0);
      const valB = Math.max(...b.processedUnits.map(u => getSortValue(u)).filter(v => v !== Infinity), 0);
      return sortMode === "value-desc" ? valB - valA : valA - valB;
    });
  }

  return mappedSections;
}

export function TierBanner({ tier }: { tier: { label: string; badgeColor: string } }) {
  return (
    <div className="relative w-full mb-8 overflow-hidden rounded-xl bg-card border border-border shadow-sm">
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% -30%, ${tier.badgeColor}25 0%, transparent 70%)` }} />
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: tier.badgeColor }} />
      <div className="relative z-10 flex min-h-[88px] items-center justify-center px-6">
        <div className="flex flex-col items-center">
          <span className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] opacity-80" style={{ color: tier.badgeColor }}>Tier</span>
          <h1 className="text-[28px] font-black uppercase tracking-[0.18em] leading-none text-center" style={{ color: tier.badgeColor }}>{tier.label}</h1>
        </div>
      </div>
    </div>
  );
}

export function TierSubHeader({ label, valueRange, count }: { label: string; valueRange: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-3 mt-4">
      <div className="flex items-baseline gap-2 flex-shrink-0">
        <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-[12px] font-semibold text-foreground">{valueRange}</span>
      </div>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-bold px-1.5 py-[2px] rounded-[4px] bg-white/5 text-muted-foreground border border-border">{count}</span>
    </div>
  );
}