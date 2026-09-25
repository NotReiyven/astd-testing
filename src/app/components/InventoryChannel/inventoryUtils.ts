import { FilterKey, MasterUnit } from "../../../types";

export const SORT_OPTIONS = {
  "value-desc": "Value: High to Low",
  "value-asc": "Value: Low to High",
  "alpha-asc": "Alphabetical (A-Z)",
  "recent-desc": "Recently Added",
};

export const TIER_ORDER: FilterKey[] = [
  "S",
  "A",
  "B",
  "C",
  "Pure",
  "Oddities",
  "Untiered",
];

export const getUnitConservativeValue = (master: MasterUnit): number => {
  if (
    master.value === "owner" ||
    master.valueDisplay === "Owner's Choice" ||
    master.valueDisplay === "O/C"
  )
    return 0;
  if (typeof master.value === "number" && master.value > 0) return master.value;
  if (typeof master.valueMin === "number" && master.valueMin > 0)
    return master.valueMin;
  return 0;
};
