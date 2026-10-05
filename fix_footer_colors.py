import re

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add imports for THEORY_RARITY_SCALE and THEORY_LIQUIDITY_SCALE
if 'THEORY_RARITY_SCALE' not in c:
    c = c.replace('import { GRID_STATUS_CFG } from "../../../../data";', 'import { GRID_STATUS_CFG, THEORY_RARITY_SCALE, THEORY_LIQUIDITY_SCALE } from "../../../../data";')

pattern = r'export function GridStatFooter\([\s\S]*?\}\n    \);\n  \}'
replacement = '''export function GridStatFooter({
  rarity,
  liquidity,
}: {
  rarity: number | string;
  liquidity: number | string;
}) {
  const numVal = Number(rarity) || 0;

  const rarityDisplay =
    numVal % 1 === 0 ? String(numVal) : numVal.toFixed(1);

  const liqStr = String(liquidity || "Average");

  const liqDisplay =
    liqStr.toLowerCase() === "black marketed"
      ? "BM"
      : liqStr;

  const rarityColor = THEORY_RARITY_SCALE.find(r => r.val === Math.round(numVal))?.color || "var(--foreground)";
  const liqColorObj = THEORY_LIQUIDITY_SCALE.find(l => l.val.toLowerCase() === liqStr.toLowerCase());
  const liqColor = liqColorObj ? liqColorObj.color : "var(--foreground)";

  return (
    <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border/80 w-full font-mono">
      <div className="flex flex-col bg-muted border border-transparent rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground">
        <span className="text-[11px] font-medium text-muted-foreground mb-0.5">
          Rarity
        </span>

        <span className="text-[13px] font-black" style={{ color: rarityColor }}>
          {rarityDisplay}
        </span>
      </div>

      <div className="flex flex-col bg-muted border border-transparent rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground">
        <span className="text-[11px] font-medium text-muted-foreground mb-0.5">
          Liquidity
        </span>

        <span className="text-[12px] font-black truncate" style={{ color: liqColor }}>
          {liqDisplay}
        </span>
      </div>
    </div>
  );
}'''

c = re.sub(pattern, replacement, c)

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
