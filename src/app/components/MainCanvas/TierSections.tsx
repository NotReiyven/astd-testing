import { MasterUnit } from "../../../types";

export function getSortValue(u: MasterUnit): number {
  const disp = u.valueDisplay?.toLowerCase() || "";
  if (
    u.value === "owner" ||
    disp.includes("owner's choice") ||
    disp.includes("o/c")
  )
    return Infinity;
  if (u.value === "range" && typeof u.valueMin === "number") return u.valueMin;
  return typeof u.value === "number" ? u.value : 0;
}

export function processUnits(
  units: MasterUnit[],
  sortMode: string,
  statusFilter: string
) {
  let processed = [...units];
  if (statusFilter !== "all")
    processed = processed.filter((u) => u.status === statusFilter);

  const liqScore = (l: string | undefined) => {
    if (!l) return 2;
    const low = l.toLowerCase();
    if (low === "high") return 3;
    if (low === "low") return 1;
    return 2;
  };

  processed.sort((a, b) => {
    const valA = getSortValue(a);
    const valB = getSortValue(b);

    if (sortMode === "value-desc") {
      if (valA === Infinity && valB === Infinity)
        return a.name.localeCompare(b.name);
      return valB - valA;
    }
    if (sortMode === "value-asc") {
      if (valA === Infinity && valB === Infinity)
        return a.name.localeCompare(b.name);
      return valA - valB;
    }
    if (sortMode === "liq-desc") {
      const la = liqScore(a.liquidity);
      const lb = liqScore(b.liquidity);
      if (lb !== la) return lb - la;
      if (valA === Infinity && valB === Infinity)
        return a.name.localeCompare(b.name);
      return valB - valA;
    }
    if (sortMode === "liq-asc") {
      const la = liqScore(a.liquidity);
      const lb = liqScore(b.liquidity);
      if (la !== lb) return la - lb;
      if (valA === Infinity && valB === Infinity)
        return a.name.localeCompare(b.name);
      return valB - valA;
    }
    if (sortMode === "rarity-desc") {
      if (b.rarity !== a.rarity) return b.rarity - a.rarity;
      if (valA === Infinity && valB === Infinity)
        return a.name.localeCompare(b.name);
      return valB - valA;
    }
    if (sortMode === "alpha-asc") return a.name.localeCompare(b.name);
    return 0;
  });
  return processed;
}

export function buildSections(
  units: MasterUnit[],
  sortMode: string,
  statusFilter: string,
  tier: string
) {
  const isValueSort = sortMode === "value-desc" || sortMode === "value-asc";
  const sectionsMap = new Map<
    string,
    { label: string; range: string; units: MasterUnit[] }
  >();
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

    if (
      isValueSort &&
      isStandardTier &&
      getSortValue(u) === Infinity &&
      topCatLabel
    ) {
      cat = topCatLabel;
      range = topCatRange;
    }

    if (!sectionsMap.has(cat))
      sectionsMap.set(cat, { label: cat, range, units: [] });
    sectionsMap.get(cat)!.units.push(u);
  });

  const mappedSections = Array.from(sectionsMap.values())
    .map((sec) => ({
      ...sec,
      processedUnits: processUnits(sec.units, sortMode, statusFilter),
    }))
    .filter((sec) => sec.processedUnits.length > 0);

  if (isValueSort && isStandardTier) {
    const subCatPriority: Record<string, number> = {
      top: 1,
      high: 2,
      mid: 3,
      low: 4,
    };
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

      if (rankA !== rankB)
        return sortMode === "value-desc" ? rankA - rankB : rankB - rankA;

      const valA = Math.max(
        ...a.processedUnits
          .map((u) => getSortValue(u))
          .filter((v) => v !== Infinity),
        0
      );
      const valB = Math.max(
        ...b.processedUnits
          .map((u) => getSortValue(u))
          .filter((v) => v !== Infinity),
        0
      );
      return sortMode === "value-desc" ? valB - valA : valA - valB;
    });
  }

  return mappedSections;
}

export function TierBanner({
  tier,
}: {
  tier: { label: string; badgeColor: string; subtitle?: string };
}) {
  return (
    <div className="flex items-center justify-between py-4 px-1 border-b border-border my-2">
      <div className="flex items-center gap-3">
        <div
          className="w-1.5 h-6 rounded-full"
          style={{ backgroundColor: tier.badgeColor }}
        />
        <div className="flex flex-col">
          <h2 className="text-[18px] font-black text-foreground tracking-tight uppercase flex items-center gap-2">
            {tier.label}
          </h2>
          {tier.subtitle && (
            <p className="text-[11px] text-muted-foreground font-medium tracking-wide mt-0.5">
              {tier.subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TierSubHeader({
  label,
  valueRange,
  count,
}: {
  label: string;
  valueRange?: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-1 text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-black uppercase tracking-widest text-foreground">
          {label}
        </span>
        {valueRange && (
          <span className="text-[11px] font-mono text-muted-foreground">
            • {valueRange}
          </span>
        )}
      </div>
      <span className="text-[11px] font-mono font-bold bg-card border border-border px-2 py-0.5 rounded-[4px]">
        {count} {count === 1 ? "Unit" : "Units"}
      </span>
    </div>
  );
}
