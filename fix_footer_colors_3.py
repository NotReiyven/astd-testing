import re

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

old = '''  const liqDisplay =
    liqStr.toLowerCase() === "black marketed"
      ? "BM"
      : liqStr;

  return (
    <div className="grid grid-cols-2 gap-2 pt-3 mt-3 border-t border-border/80 w-full font-mono">
      <div className="flex flex-col bg-muted border border-transparent rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground">
        <span className="text-[11px] font-medium text-muted-foreground mb-0.5">
          Rarity
        </span>

        <span className="text-[13px] font-black text-foreground">
          {rarityDisplay}
        </span>
      </div>

      <div className="flex flex-col bg-muted border border-transparent rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground">
        <span className="text-[11px] font-medium text-muted-foreground mb-0.5">
          Liquidity
        </span>

        <span className="text-[12px] font-black text-foreground truncate">
          {liqDisplay}
        </span>
      </div>
    </div>
  );'''

new = '''  const liqDisplay =
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
  );'''

c = c.replace(old, new)

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
