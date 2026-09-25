export type UnitStatus =
  | "stable"
  | "unstable"
  | "rising"
  | "dropping"
  | "inflated"
  | "deflated"
  | "varies"
  | "lowballed"
  | "highballed"
  | "hyped"
  | "gatekept"
  | "black-marketed";

export type FilterKey =
  | "All"
  | "S"
  | "A"
  | "B"
  | "C"
  | "Pure"
  | "Oddities"
  | "Untiered";

export interface MasterUnit {
  id: string;
  name: string;
  subtitle: string;
  value: number | "owner" | "range";
  valueDisplay?: string;
  valueMin?: number;
  rarity: number;
  liquidity?: string;
  aliases?: string[];
  status?: UnitStatus;
  secondaryTags?: string[];
  isNew?: boolean;
  notice?: string;
  imageUrl?: string;
  tier?: string;
  subCategory?: string;
  subCategoryRange?: string;
  obtainability?: "OBT" | "UNOB";
}

export type Unit = MasterUnit;
export type GridUnit = MasterUnit;

export interface PopupUnit {
  id: string;
  name: string;
  subtitle: string;
  value: number;
}

export interface PopupState {
  unit: PopupUnit;
  x: number;
  y: number;
}

export interface TierConfig {
  label: string;
  units: MasterUnit[];
  badgeChar: string;
  badgeColor: string;
  badgeShadow: string;
  subtitle: string;
}

export interface TradeCard {
  id: string;
  name: string;
  subtitle: string;
  value: number;
  qty: number;
}
