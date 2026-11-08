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
      if (valB !== valA) return valB - valA;
      if (b.rarity !== a.rarity) return b.rarity - a.rarity;
      return a.name.localeCompare(b.name);
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
  tier: {
    label: string;
    badgeColor: string;
    subtitle?: string;
    gradient?: string;
  };
}) {
  const c = tier.badgeColor;

  const face =
    tier.gradient ??
    `linear-gradient(180deg, color-mix(in srgb, ${c} 80%, white), ${c})`;

  const railColor = `color-mix(in srgb, ${c} 30%, black)`;
  const SKEW = "skewX(-20deg)";

  return (
    <div className="relative my-4 h-[116px] w-full select-none">
      {/* 1. MAIN COLORED FACE - BACK LAYER */}
      <div
        aria-hidden="true"
        className="absolute left-6 right-0 top-0 h-[80px]"
        style={{
          transform: SKEW,
          background: face,
          borderRadius: 6,
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
          zIndex: 2,
        }}
      >
        <div
          className="absolute inset-[6px]"
          style={{
            border: "1px solid rgba(255,255,255,0.55)",
            borderRadius: 3,
          }}
        />
      </div>

      {/* 2. SOLID METALLIC U-SHAPED FOREGROUND FRAME */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1 right-[-16px] top-[26px] h-[76px]"
        style={{
          transform: SKEW,
          zIndex: 3,
          filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.45))",
        }}
      >
        {/* Outer silver U */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #e5e7eb, #9ca3af)",
            clipPath:
              "polygon(0% 0%, 2.2% 0%, 2.2% 70%, 97.8% 70%, 97.8% 0%, 100% 0%, 100% 100%, 0% 100%)",
          }}
        />

        {/* Inner colored U */}
        <div
          className="absolute inset-0"
          style={{
            background: railColor,
            clipPath:
              "polygon(0.6% 4%, 1.6% 4%, 1.6% 73%, 98.4% 73%, 98.4% 4%, 99.4% 4%, 99% 94%, 1% 94%)",
          }}
        />
      </div>

      {/* 3. TEXT - TOP LAYER */}
      <div className="absolute left-20 right-8 top-0 z-10 flex h-[80px] min-w-0 items-center gap-5">
        <h2
          className="shrink-0 whitespace-nowrap text-[42px] leading-none text-white"
          style={{
            WebkitTextStroke: "9px #2b2b2b",
            paintOrder: "stroke fill",
            textShadow: "0 4px 0 rgba(0,0,0,0.35)",
          }}
        >
          {tier.label}
        </h2>

        {tier.subtitle && (
          <p
            className="hidden min-w-0 flex-1 truncate text-[15px] text-white/90 md:block"
            style={{
              WebkitTextStroke: "5px rgba(0,0,0,0.55)",
              paintOrder: "stroke fill",
            }}
          >
            {tier.subtitle}
          </p>
        )}
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
    <div className="flex items-center w-full py-3 mt-4 mb-2">
      <div className="flex items-baseline gap-2 shrink-0">
        <span className="text-sm font-semibold text-muted-foreground">
          {label}
        </span>
        {valueRange && (
          <span className="text-[12px] font-bold text-foreground/90 font-mono">
            {valueRange}
          </span>
        )}
      </div>

      <div className="flex-1 h-px bg-border/60 mx-4" />

      <span className="shrink-0 text-[10px] font-black font-mono text-muted-foreground bg-muted border border-border px-2 py-1 rounded-[4px] leading-none">
        {count}
      </span>
    </div>
  );
}