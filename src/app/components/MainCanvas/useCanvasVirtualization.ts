import { useMemo } from "react";
import { FilterKey, MasterUnit } from "../../../types";
import { TIER_CONFIG, getTier } from "../../../data";
import { processUnits, buildSections } from "./TierSections";

export type VirtualItem =
  | { type: "space-top"; id: string }
  | { type: "welcome"; id: string }
  | { type: "search-stats"; id: string; count: number }
  | { type: "no-results"; id: string }
  | { type: "tier-banner"; id: string; tier: any }
  | {
      type: "sub-header";
      id: string;
      label: string;
      range: string;
      count: number;
    }
  | {
      type: "grid-row";
      id: string;
      units: MasterUnit[];
      searchQuery: string;
    }
  | {
      type: "list-row";
      id: string;
      unit: MasterUnit;
      isLast: boolean;
      searchQuery: string;
    }
  | { type: "space-bottom"; id: string };

interface UseCanvasVirtualizationProps {
  ALL_UNITS: MasterUnit[];
  showWelcome: boolean;
  deferredSearchQuery: string;
  statusFilter: string;
  sortMode: string;
  activeTierFilter: FilterKey;
  viewMode: "grid" | "list" | "compact";
}

export function useCanvasVirtualization({
  ALL_UNITS,
  showWelcome,
  deferredSearchQuery,
  statusFilter,
  sortMode,
  activeTierFilter,
  viewMode,
}: UseCanvasVirtualizationProps) {
  const isDefaultView =
    sortMode === "value-desc" &&
    statusFilter === "all" &&
    deferredSearchQuery === "";

  const UNITS_BY_TIER = useMemo(() => {
    const map: Record<string, MasterUnit[]> = {};
    Object.keys(TIER_CONFIG).forEach((t) => (map[t] = []));
    ALL_UNITS.forEach((u) => {
      const t = getTier(u);
      if (map[t]) map[t].push(u);
    });
    return map;
  }, [ALL_UNITS]);

  const filteredAllUnits = useMemo(() => {
    // filtering logic unchanged
    const rawFiltered = ALL_UNITS.filter((u) => {
      const q = deferredSearchQuery.toLowerCase();
      const matchesSearch =
        deferredSearchQuery === "" ||
        (u.name?.toLowerCase() || "").includes(q) ||
        (u.subtitle?.toLowerCase() || "").includes(q) ||
        (u.aliases && u.aliases.some((a) => a.toLowerCase().includes(q)));
      const matchesTier =
        deferredSearchQuery !== "" ||
        activeTierFilter === "All" ||
        getTier(u) === activeTierFilter;
      return matchesSearch && matchesTier;
    });
    return processUnits(rawFiltered, sortMode, statusFilter);
  }, [
    ALL_UNITS,
    deferredSearchQuery,
    activeTierFilter,
    sortMode,
    statusFilter,
  ]);

  const flattenedItems = useMemo(() => {
    const items: VirtualItem[] = [];
    items.push({ type: "space-top", id: "space-top" });

    if (
      showWelcome &&
      !deferredSearchQuery &&
      statusFilter === "all" &&
      sortMode === "value-desc"
    ) {
      items.push({ type: "welcome", id: "welcome" });
    }

    const TIER_ORDER = Object.keys(TIER_CONFIG).filter(
      (k) => k !== "All"
    ) as FilterKey[];

    // Helper to package units into a grid chunk or individual list rows. 
    // By providing all units to the grid-row, CSS grid auto-fill takes over rendering.
    const pushUnits = (units: MasterUnit[], idPrefix: string) => {
        if (viewMode === "grid") {
             // We pass all units for this section into a single grid-row element.
             // CSS `grid-template-columns: repeat(auto-fill, ...)` handles the columns.
             items.push({
                 type: "grid-row",
                 id: idPrefix,
                 units: units,
                 searchQuery: deferredSearchQuery
             });
        } else {
             units.forEach((u, i) => {
                items.push({
                  type: "list-row",
                  id: `list-${u.id}`,
                  unit: u,
                  isLast: i === units.length - 1,
                  searchQuery: deferredSearchQuery,
                });
              });
        }
    };

    if (deferredSearchQuery) {
      items.push({
        type: "search-stats",
        id: "search-stats",
        count: filteredAllUnits.length,
      });
      if (filteredAllUnits.length === 0) {
        items.push({ type: "no-results", id: "no-results" });
        return items;
      }

      TIER_ORDER.forEach((tKey) => {
        const unitsInTier = filteredAllUnits.filter((u) => getTier(u) === tKey);
        if (unitsInTier.length === 0) return;

        items.push({
          type: "tier-banner",
          id: `banner-${tKey}`,
          tier: TIER_CONFIG[tKey],
        });
        
        pushUnits(unitsInTier, `grid-${tKey}`);
      });
    } else {
      const tiersToRender =
        activeTierFilter === "All" ? TIER_ORDER : [activeTierFilter];

      tiersToRender.forEach((tKey) => {
        const rawUnits = UNITS_BY_TIER[tKey] || [];
        const processed = processUnits(rawUnits, sortMode, statusFilter);

        if (processed.length === 0 && activeTierFilter !== "All") {
          items.push({
            type: "tier-banner",
            id: `banner-${tKey}`,
            tier: TIER_CONFIG[tKey],
          });
          items.push({ type: "no-results", id: `no-results-${tKey}` });
          return;
        }
        if (processed.length === 0) return;

        items.push({
          type: "tier-banner",
          id: `banner-${tKey}`,
          tier: TIER_CONFIG[tKey],
        });

        if (isDefaultView) {
          const sections = buildSections(
            rawUnits,
            sortMode,
            statusFilter,
            tKey
          );
          sections.forEach((sec) => {
            items.push({
              type: "sub-header",
              id: `sub-${tKey}-${sec.label}`,
              label: sec.label,
              range: sec.range,
              count: sec.processedUnits.length,
            });
            pushUnits(sec.processedUnits, `grid-${sec.label}`);
          });
        } else {
          pushUnits(processed, `grid-${tKey}`);
        }
      });
    }

    items.push({ type: "space-bottom", id: "space-bottom" });
    return items;
  }, [
    showWelcome,
    deferredSearchQuery,
    statusFilter,
    sortMode,
    activeTierFilter,
    viewMode,
    filteredAllUnits,
    UNITS_BY_TIER,
    isDefaultView,
  ]);

  return { flattenedItems };
}