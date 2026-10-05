import json

with open(r'src\data\config.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# I will rewrite THEORY_STATUS_TAGS and THEORY_SECONDARY_TAGS to use the colors from GRID_STATUS_CFG
pattern = r'export const THEORY_STATUS_TAGS = \[[\s\S]*?\];\n\nexport const THEORY_SECONDARY_TAGS = \[[\s\S]*?\];'

replacement = '''export const THEORY_STATUS_TAGS = [
  {
    tag: "Stable",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(230, 216, 161, 0.3)",
    color: "#e6d8a1",
    def: "Fair and consistently decent offers. Units that are stable are most likely not to move unless something happens.",
  },
  {
    tag: "Unstable",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(107, 158, 181, 0.3)",
    color: "#6b9eb5",
    def: "If a unit is unstable, it means it could rise or drop at any moment, or stabilize.",
  },
  {
    tag: "Rising",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(48, 161, 99, 0.3)",
    color: "#30a163",
    def: "If a unit is rising, it means the unit is being consistently overpaid.",
  },
  {
    tag: "Dropping",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(230, 10, 24, 0.3)",
    color: "#f87171",
    def: "If a unit is dropping, it means owners are constantly taking underpays.",
  },
  {
    tag: "Inflated",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(194, 122, 64, 0.3)",
    color: "#c27a40",
    def: "If a unit has this tag, they are inflated and cost way more than they should be worth.",
  },
  {
    tag: "Deflated",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(60, 129, 243, 0.3)",
    color: "#60a5fa",
    def: "If a unit is underpriced, they are deflated and are way cheaper than they should be worth.",
  },
  {
    tag: "Varies",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(155, 141, 232, 0.3)",
    color: "#a78bfa",
    def: "If a unit varies, then it can get fair but it can also get lowballs or highballs.",
  },
  {
    tag: "Lowballed",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(230, 108, 25, 0.3)",
    color: "#fb923c",
    def: "If a unit has this tag, it can get fair at most, but also gets lowballs.",
  },
  {
    tag: "Highballed",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(1, 239, 253, 0.3)",
    color: "#38bdf8",
    def: "If a unit has this tag, it can get fair at minimum, but also gets highballs.",
  },
];

export const THEORY_SECONDARY_TAGS = [
  {
    tag: "Hyped",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(58, 124, 230, 0.3)",
    color: "#60a5fa",
    def: "If a unit is hyped, then it can either be a new unit, or something big changed, skyrocketing a units value and demand.",
  },
  {
    tag: "Gatekept",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(175, 120, 168, 0.3)",
    color: "#c084fc",
    def: "If a unit is gatekept, it means owners are refusing to trade this unit for any reason, waiting for a rise or huge overpay, usually.",
  },
  {
    tag: "Black Market",
    bg: "rgba(30, 33, 36, 0.95)",
    border: "rgba(154, 163, 178, 0.3)",
    color: "#9ca3af",
    def: "If a unit has this tag, it means that people who buy units with outside-game currency are heavily impacting this unit.",
  },
];'''

import re
c = re.sub(pattern, replacement, c)

with open(r'src\data\config.ts', 'w', encoding='utf-8') as f:
    f.write(c)
