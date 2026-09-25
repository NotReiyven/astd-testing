import { FilterKey, TierConfig, UnitStatus, TradeCard } from "../types";

export const FILTERS: FilterKey[] = [
  "All",
  "S",
  "A",
  "B",
  "C",
  "Pure",
  "Oddities",
  "Untiered",
];

export const TIER_CONFIG: Record<string, TierConfig> = {
  All: {
    label: "All Tiers",
    units: [],
    badgeChar: "∞",
    badgeColor: "#7289da",
    badgeShadow: "rgba(114,137,218,0.35)",
    subtitle: "Every tracked unit in the value list",
  },
  S: {
    label: "S Tier",
    units: [],
    badgeChar: "S",
    badgeColor: "#dd7e6b",
    badgeShadow: "rgba(221,126,107,0.35)",
    subtitle: "Rarest & most valuable units in the game",
  },
  A: {
    label: "A Tier",
    units: [],
    badgeChar: "A",
    badgeColor: "#a855f7",
    badgeShadow: "rgba(168,85,247,0.35)",
    subtitle: "High-value units with strong demand",
  },
  B: {
    label: "B Tier",
    units: [],
    badgeChar: "B",
    badgeColor: "#3b82f6",
    badgeShadow: "rgba(59,130,246,0.35)",
    subtitle: "Mid-tier units worth holding",
  },
  C: {
    label: "C Tier",
    units: [],
    badgeChar: "C",
    badgeColor: "#22c55e",
    badgeShadow: "rgba(34,197,94,0.28)",
    subtitle: "Lower-value units, good for bulk trades",
  },
  Pure: {
    label: "Pure Tier",
    units: [],
    badgeChar: "P",
    badgeColor: "#9ca3af",
    badgeShadow: "rgba(156,163,175,0.28)",
    subtitle: "Untouched units with no upgrades",
  },
  Oddities: {
    label: "Oddities",
    units: [],
    badgeChar: "O",
    badgeColor: "#8b5cf6",
    badgeShadow: "rgba(139,92,246,0.28)",
    subtitle: "Gamepasses, Eggs, and non-unit tradables",
  },
  Untiered: {
    label: "Untiered",
    units: [],
    badgeChar: "U",
    badgeColor: "#52525b",
    badgeShadow: "rgba(82,82,91,0.28)",
    subtitle: "Units with virtually zero demand or value",
  },
};

export const TIER_STYLES: Record<string, string> = {
  S: "text-yellow-300  bg-yellow-400/10  border-yellow-400/20",
  A: "text-orange-300  bg-orange-400/10  border-orange-400/20",
  B: "text-blue-300    bg-blue-400/10    border-blue-400/20",
  C: "text-zinc-400    bg-zinc-500/10    border-zinc-500/20",
  Pure: "text-purple-300  bg-purple-400/10  border-purple-400/20",
};

export const GRID_STATUS_CFG: Record<
  UnitStatus,
  { label: string; tip: string; bg: string; border: string; color: string }
> = {
  stable: {
    label: "Stable",
    tip: "Fair and consistently decent offers. Most likely won't move unless something happens.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(230, 216, 161, 0.3)",
    color: "#e6d8a1",
  },
  unstable: {
    label: "Unstable",
    tip: "Could rise or drop at any moment, or stabilize.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(107, 158, 181, 0.3)",
    color: "#6b9eb5",
  },
  rising: {
    label: "Rising",
    tip: "If a unit is rising, it means the unit is being consistently overpaid.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(48, 161, 99, 0.3)",
    color: "#30a163",
  },
  dropping: {
    label: "Dropping",
    tip: "If a unit is dropping, it means owners are constantly taking underpays.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(230, 10, 24, 0.3)",
    color: "#f87171",
  },
  inflated: {
    label: "Inflated",
    tip: "If a unit has this tag, they are inflated and cost way more than they should be worth.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(194, 122, 64, 0.3)",
    color: "#d97706",
  },
  deflated: {
    label: "Deflated",
    tip: "If a unit is underpriced, they are deflated and are way cheaper than they should be.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(60, 129, 243, 0.3)",
    color: "#60a5fa",
  },
  varies: {
    label: "Varies",
    tip: "If a unit varies, then it can get fair but it can also get lowballs or highballs.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(155, 141, 232, 0.3)",
    color: "#a78bfa",
  },
  lowballed: {
    label: "Lowballed",
    tip: "If a unit has this tag, it can get fair at most, but also gets lowballs.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(230, 108, 25, 0.3)",
    color: "#fb923c",
  },
  highballed: {
    label: "Highballed",
    tip: "If a unit has this tag, it can get fair at minimum, but also gets highballs.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(1, 239, 253, 0.3)",
    color: "#38bdf8",
  },
  hyped: {
    label: "Hyped",
    tip: "If a unit is hyped, something big changed, skyrocketing value and demand.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(58, 124, 230, 0.3)",
    color: "#60a5fa",
  },
  gatekept: {
    label: "Gatekept",
    tip: "If a unit is gatekept, owners are refusing to trade this unit waiting for a rise.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(175, 120, 168, 0.3)",
    color: "#c084fc",
  },
  "black-marketed": {
    label: "Black Market",
    tip: "People who buy units with outside-game currency are heavily impacting it.",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(154, 163, 178, 0.3)",
    color: "#9ca3af",
  },
};

export const RARITY_SCALE: { min: number; max: number; label: string }[] = [
  { min: 0, max: 1, label: "Common – Easily obtainable" },
  { min: 2, max: 4, label: "Uncommon – Somewhat common" },
  { min: 5, max: 7, label: "Rare – Less frequently seen" },
  { min: 8, max: 9, label: "Very Rare – Hard to come by" },
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
  {
    id: "ultra-kovegu",
    name: "Ultra Kovegu",
    subtitle: "SSJ3 Gogeta",
    value: 20000,
    qty: 1,
  },
];

export const MODAL_GET_SEED: TradeCard[] = [
  { id: "death", name: "Death", subtitle: "Ryuk", value: 160000, qty: 1 },
];

export const SEARCHABLE_UNITS: {
  id: string;
  name: string;
  subtitle: string;
  value: number;
}[] = [
  { id: "koku-drip", name: "Koku (Drip)", subtitle: "Goku Drip", value: 34000 },
  {
    id: "ultra-kovegu",
    name: "Ultra Kovegu",
    subtitle: "SSJ3 Gogeta",
    value: 20000,
  },
  { id: "death", name: "Death", subtitle: "Ryuk", value: 160000 },
  {
    id: "beardcutter",
    name: "Beardcutter",
    subtitle: "Goblin Slayer",
    value: 210000,
  },
  { id: "slayer-mage", name: "Slayer Mage", subtitle: "Frieren", value: 40000 },
  {
    id: "galaxy-girl",
    name: "Galaxy Girl",
    subtitle: "Sasaki Miyo",
    value: 350000,
  },
  {
    id: "azure-specter",
    name: "Azure Specter",
    subtitle: "Neon Edge",
    value: 3200,
  },
  {
    id: "ember-shard",
    name: "Ember Shard",
    subtitle: "Classic Pure",
    value: 900,
  },
];

export const AQUA_DIALOGUES: Record<string, string[]> = {
  main: [
    "",
    "Listen up, you shut-in NEET! I, the beautiful and wise Goddess Aqua, have descended to save you from getting completely scammed! First, click the ^^Value List^^ channel in the sidebar so we can begin!",
    "Hmph, even someone with your pitiful intelligence stat can do this part. Let's build a mock trade. ^^Click or tap^^ any unit card to open its menu, then toss it into your *Give* or *Get* side! Don't mess this up!",
    "W-Wait! Don't just accept a trade blindly! Are you trying to lose all your value?! Use the divine tool I've graciously bestowed upon you! Click that glowing ^^Calculator^^ button up top to open the Analyzer!",
    "See?! It instantly breaks down the value differences and market momentum! But wait—you're not done! I've enrolled you in the Academy to finish your training. Go complete your Graduation Checklist!",
  ],
  channels: [
    "",
    "Lost, are we? Typical. The sidebar on the left is your holy map! ^^My Inventory^^ is your personal vault. ^^Trading Ads^^ is the live market. And ^^Extra Notices^^ has crucial market rules you probably ignored!",
  ],
  advanced: [
    "",
    "Want to be a pro? The Academy Sandbox tracks your progress. Open your Calculator and use the ^^Pin^^ icon to lock units, or click the ^^Wand^^ to import text trades! Go finish your Graduation Checklist!",
  ],
  developer: [
    "",
    "Oh, you want to know who built this shrine to my greatness? It was my loyal head developer, ^^Reiyven!^^ He spent way too much time coding this instead of going outside.",
  ],
  filters: [
    "",
    "Don't just blindly scroll! Open the ^^Status Dropdown^^ and filter out the trash! Holding onto Dropping units is a one-way ticket to being as broke as I am! Read the Market Theory tab if you're confused!",
  ],
  dictionary: [
    "",
    "I'm a Goddess, not a mind reader! The Smart Parser uses the exact Dictionary logic you can test in the Academy! Teach me your weird abbreviations so I can read your messy trades!",
  ],
  stats: [
    "",
    "Stop staring at the raw value like an idiot! Read the ^^Market Theory^^ tab to understand Rarity, Supply, and Demand. High value means nothing if the unit has terrible Demand!",
  ],
  management: [
    "",
    "Listen closely! When testing offers, click the ^^Pin^^ icon on your 'Give' units. That way, when you clear the board, your core inventory stays put! The Academy tracks this, so go do it!",
  ],
  annoyed: [
    "",
    "Stop poking me! Figure it out yourself or go bother ^^Reiyven^^ with a support ticket! I have Goddess things to do!",
  ],
  academy_grad: [
    "",
    "Oh ho? You actually completed the Graduation Checklist?! I didn't think a NEET like you had the attention span!",
    "I guess my divine guidance is just *that* good! You're officially a certified trader now. Go post an Ad on the live board! ^^Praise Aqua!^^",
  ],
};

export const THEORY_STATUS_TAGS = [
  {
    tag: "Stable",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#E6D8A166",
    color: "#E6D8A1",
    def: "Fair and consistently decent offers. Units that are stable are most likely not to move unless something happens.",
  },
  {
    tag: "Unstable",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#6B9EB566",
    color: "#6B9EB5",
    def: "If a unit is unstable, it means it could rise or drop at any moment, or stabilize.",
  },
  {
    tag: "Rising",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#30A16366",
    color: "#30A163",
    def: "If a unit is rising, it means the unit is being consistently overpaid.",
  },
  {
    tag: "Dropping",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#E60A1866",
    color: "#E60A18",
    def: "If a unit is dropping, it means owners are constantly taking underpays.",
  },
  {
    tag: "Inflated",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#c27a4066",
    color: "#c27a40",
    def: "If a unit has this tag, they are inflated and cost way more than they should be worth.",
  },
  {
    tag: "Deflated",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#3C81F366",
    color: "#3C81F3",
    def: "If a unit is underpriced, they are deflated and are way cheaper than they should be worth.",
  },
  {
    tag: "Varies",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#9b8de866",
    color: "#9b8de8",
    def: "If a unit varies, then it can get fair but it can also get lowballs or highballs.",
  },
  {
    tag: "Lowballed",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#E66C1966",
    color: "#E66C19",
    def: "If a unit has this tag, it can get fair at most, but also gets lowballs.",
  },
  {
    tag: "Highballed",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#01EFFD66",
    color: "#01EFFD",
    def: "If a unit has this tag, it can get fair at minimum, but also gets highballs.",
  },
];

export const THEORY_SECONDARY_TAGS = [
  {
    tag: "Hyped",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#3A7CE666",
    color: "#3A7CE6",
    def: "If a unit is hyped, then it can either be a new unit, or something big changed, skyrocketing a units value and demand.",
  },
  {
    tag: "Gatekept",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#AF78A866",
    color: "#AF78A8",
    def: "If a unit is gatekept, it means owners are refusing to trade this unit for any reason, waiting for a rise or huge overpay, usually.",
  },
  {
    tag: "Black Market",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "#9aa3b266",
    color: "#9aa3b2",
    def: "If a unit has this tag, it means that people who buy units with outside-game currency are heavily impacting this unit.",
  },
];

export const THEORY_RARITY_SCALE = [
  { val: 0, def: "Forever Obtainable", color: "#8B0000", textColor: "#fff" },
  { val: 1, def: "Extremely Common", color: "#FF0000", textColor: "#fff" },
  { val: 2, def: "Very Common", color: "#FF0000", textColor: "#fff" },
  { val: 3, def: "Common", color: "#FF0000", textColor: "#fff" },
  { val: 4, def: "Pretty Common", color: "#FF0000", textColor: "#fff" },
  { val: 5, def: "Slightly Uncommon", color: "#FF0000", textColor: "#fff" },
  { val: 6, def: "Uncommon", color: "#FFA500", textColor: "#fff" },
  { val: 7, def: "Pretty Uncommon", color: "#FFA500", textColor: "#fff" },
  { val: 8, def: "Very Uncommon", color: "#FFA500", textColor: "#fff" },
  { val: 9, def: "Slightly Rare", color: "#90EE90", textColor: "#000" },
  {
    val: 10,
    def: "Pretty Rare - About as rare as Aqua (5,000 Copies)",
    color: "#90EE90",
    textColor: "#000",
  },
  { val: 11, def: "Decently Rare", color: "#90EE90", textColor: "#000" },
  { val: 12, def: "Rare", color: "#90EE90", textColor: "#000" },
  {
    val: 13,
    def: "Very Rare - About as Rare as Padoru/Sinbad (1,000 Copies)",
    color: "#90EE90",
    textColor: "#000",
  },
  { val: 14, def: "Very very Rare", color: "#90EE90", textColor: "#000" },
  {
    val: 15,
    def: "Extremely rare - About as Rare as Mai/Douma (500 Copies)",
    color: "#90EE90",
    textColor: "#000",
  },
  { val: 16, def: "Absurdly Rare", color: "#90EE90", textColor: "#000" },
  {
    val: 17,
    def: "Super Rare - About as Rare as Gold Muramasa (Expected around 100-150 Copies)",
    color: "#32CD32",
    textColor: "#fff",
  },
  { val: 18, def: "Mega Rare", color: "#32CD32", textColor: "#fff" },
  { val: 19, def: "Ultra Rare", color: "#00FFFF", textColor: "#000" },
  {
    val: 20,
    def: "Ultra Mega Rare (20 Copies or Less)",
    color: "#00FFFF",
    textColor: "#000",
  },
];

export const THEORY_LIQUIDITY_SCALE = [
  {
    val: "Low",
    def: "Hard to trade the unit (Supply > Demand)",
    color: "#E57373",
    bg: "#111214",
  },
  {
    val: "Average",
    def: "Average difficulty to trade the unit",
    color: "#B5BAC1",
    bg: "#111214",
  },
  {
    val: "High",
    def: "Easy to trade the unit (Supply < Demand)",
    color: "#4DB6AC",
    bg: "#111214",
  },
];
