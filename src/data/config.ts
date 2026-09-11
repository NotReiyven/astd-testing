import { FilterKey, TierConfig, UnitStatus, TradeCard } from "../types";

export const FILTERS: FilterKey[] = ["All", "S", "A", "B", "C", "Pure", "Oddities", "Untiered"];

export const TIER_CONFIG: Record<string, TierConfig> = {
  All:      { label: "All Tiers", units: [], badgeChar: "∞", badgeColor: "#5865F2", badgeShadow: "rgba(88,101,242,0.35)", subtitle: "Every tracked unit in the value list" },
  S:        { label: "S Tier",    units: [], badgeChar: "S", badgeColor: "#dd7e6b", badgeShadow: "rgba(245,158,11,0.35)", subtitle: "Rarest & most valuable units in the game" },
  A:        { label: "A Tier",    units: [], badgeChar: "A", badgeColor: "#a855f7", badgeShadow: "rgba(168,85,247,0.35)", subtitle: "High-value units with strong demand" },
  B:        { label: "B Tier",    units: [], badgeChar: "B", badgeColor: "#3b82f6", badgeShadow: "rgba(59,130,246,0.35)", subtitle: "Mid-tier units worth holding" },
  C:        { label: "C Tier",    units: [], badgeChar: "C", badgeColor: "#22c55e", badgeShadow: "rgba(34,197,94,0.28)",  subtitle: "Lower-value units, good for bulk trades" },
  Pure:     { label: "Pure Tier", units: [], badgeChar: "P", badgeColor: "#9ca3af", badgeShadow: "rgba(156,163,175,0.28)", subtitle: "Untouched units with no upgrades" },
  Oddities: { label: "Oddities",  units: [], badgeChar: "O", badgeColor: "#8b5cf6", badgeShadow: "rgba(139,92,246,0.28)",  subtitle: "Gamepasses, Eggs, and non-unit tradables" },
  Untiered: { label: "Untiered",  units: [], badgeChar: "U", badgeColor: "#52525b", badgeShadow: "rgba(82,82,91,0.28)",    subtitle: "Units with virtually zero demand or value" },
};

export const TIER_STYLES: Record<string, string> = {
  S:    "text-yellow-300  bg-yellow-400/10  border-yellow-400/20",
  A:    "text-orange-300  bg-orange-400/10  border-orange-400/20",
  B:    "text-blue-300    bg-blue-400/10    border-blue-400/20",
  C:    "text-zinc-400    bg-zinc-500/10    border-zinc-500/20",
  Pure: "text-purple-300  bg-purple-400/10  border-purple-400/20",
};

export const GRID_STATUS_CFG: Record<UnitStatus, { label: string; tip: string; bg: string; border: string; color: string }> = {
  stable:          { label: "Stable",        tip: "Fair and consistently decent offers. Most likely won't move unless something happens.", bg: "#3b3924", border: "#6b5f2a", color: "#E6D8A1" },
  unstable:        { label: "Unstable",      tip: "Could rise or drop at any moment, or stabilize.",                                       bg: "#1e3040", border: "#3a6480", color: "#6B9EB5" },
  rising:          { label: "Rising",        tip: "If a unit is rising, it means the unit is being consistently overpaid.",                bg: "#153324", border: "#246640", color: "#30A163" },
  dropping:        { label: "Dropping",      tip: "If a unit is dropping, it means owners are constantly taking underpays.",               bg: "#3d0a09", border: "#7a1410", color: "#E60A18" },
  inflated:        { label: "Inflated",      tip: "If a unit has this tag, they are inflated and cost way more than they should be worth.", bg: "#2d1a0a", border: "#5c3515", color: "#c27a40" },
  deflated:        { label: "Deflated",      tip: "If a unit is underpriced, they are deflated and are way cheaper than they should be.",   bg: "#0e2345", border: "#1e4a8a", color: "#3C81F3" },
  varies:          { label: "Varies",        tip: "If a unit varies, then it can get fair but it can also get lowballs or highballs.",      bg: "#201b42", border: "#3d3480", color: "#9b8de8" },
  lowballed:       { label: "Lowballed",     tip: "If a unit has this tag, it can get fair at most, but also gets lowballs.",               bg: "#3d220a", border: "#7a4412", color: "#E66C19" },
  highballed:      { label: "Highballed",    tip: "If a unit has this tag, it can get fair at minimum, but also gets highballs.",           bg: "#003d40", border: "#007a80", color: "#01EFFD" },
  hyped:           { label: "Hyped",         tip: "If a unit is hyped, something big changed, skyrocketing value and demand.",              bg: "#0e1f3a", border: "#1a3a6b", color: "#3A7CE6" },
  gatekept:        { label: "Gatekept",      tip: "If a unit is gatekept, owners are refusing to trade this unit waiting for a rise.",      bg: "#30202e", border: "#603d5a", color: "#AF78A8" },
  "black-marketed":{ label: "Black Market",  tip: "People who buy units with outside-game currency are heavily impacting it.",              bg: "#1e2228", border: "#3a4250", color: "#9aa3b2" },
};

export const RARITY_SCALE: { min: number; max: number; label: string }[] = [
  { min: 0,  max: 1,  label: "Common – Easily obtainable" },
  { min: 2,  max: 4,  label: "Uncommon – Somewhat common" },
  { min: 5,  max: 7,  label: "Rare – Less frequently seen" },
  { min: 8,  max: 9,  label: "Very Rare – Hard to come by" },
  { min: 10, max: 10, label: "Pretty Rare – ~5,000 Copies (Aqua rarity)" },
  { min: 11, max: 13, label: "Super Rare – A few thousand copies" },
  { min: 14, max: 15, label: "Ultra Rare – ~1,000 Copies or fewer" },
  { min: 16, max: 17, label: "Extremely Rare – ~500 Copies or fewer" },
  { min: 18, max: 18, label: "Insanely Rare – ~200 Copies or fewer" },
  { min: 19, max: 19, label: "Legendary – ~50 Copies or fewer" },
  { min: 20, max: 20, label: "Ultra Mega Rare – 20 Copies or Less" },
];

export const LIQUIDITY_SCALE: Record<string, string> = {
  Low: "Hard to trade the unit (Supply > Demand)",
  Average: "Average difficulty to trade the unit",
  High: "Easy to trade the unit (Supply < Demand)",
};

export const MODAL_GIVE_SEED: TradeCard[] = [
  { id: "ultra-kovegu", name: "Ultra Kovegu", subtitle: "SSJ3 Gogeta", value: 20000, qty: 1 },
];

export const MODAL_GET_SEED: TradeCard[] = [
  { id: "death", name: "Death", subtitle: "Ryuk", value: 160000, qty: 1 },
];

export const SEARCHABLE_UNITS: { id: string; name: string; subtitle: string; value: number }[] = [
  { id: "koku-drip",     name: "Koku (Drip)",   subtitle: "Goku Drip",    value: 34000 },
  { id: "ultra-kovegu",  name: "Ultra Kovegu",  subtitle: "SSJ3 Gogeta",  value: 20000 },
  { id: "death",         name: "Death",         subtitle: "Ryuk",         value: 160000 },
  { id: "beardcutter",   name: "Beardcutter",   subtitle: "Goblin Slayer", value: 210000 },
  { id: "slayer-mage",   name: "Slayer Mage",   subtitle: "Frieren",       value: 40000 },
  { id: "galaxy-girl",   name: "Galaxy Girl",   subtitle: "Sasaki Miyo",   value: 350000 },
  { id: "azure-specter", name: "Azure Specter", subtitle: "Neon Edge",     value: 3200 },
  { id: "ember-shard",   name: "Ember Shard",   subtitle: "Classic Pure",  value: 900 },
];