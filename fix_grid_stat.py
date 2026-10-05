import re

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

pattern = r'''export function GridStatFooter\(\{
  rarity,
  liquidity,
\}: \{
  rarity: number \| string;
  liquidity: number \| string;
\}\) \{'''

replacement = '''export function GridStatFooter({
  rarity,
  liquidity,
  onRarityClick,
  onLiquidityClick,
}: {
  rarity: number | string;
  liquidity: number | string;
  onRarityClick?: (e: React.MouseEvent) => void;
  onLiquidityClick?: (e: React.MouseEvent) => void;
}) {'''

c = re.sub(pattern, replacement, c)

pattern_rarity_div = r'''<div className="flex flex-col bg-muted border border-transparent rounded-\[6px\] px-2\.5 py-1\.5 transition-colors hover:border-muted-foreground">
          <span className="text-\[11px\] font-medium text-muted-foreground mb-0\.5">
            Rarity'''

replacement_rarity_div = '''<div 
          onClick={onRarityClick}
          className="flex flex-col bg-muted border border-transparent rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground cursor-pointer">
          <span className="text-[11px] font-medium text-muted-foreground mb-0.5">
            Rarity'''

c = re.sub(pattern_rarity_div, replacement_rarity_div, c)

pattern_liq_div = r'''<div className="flex flex-col bg-muted border border-transparent rounded-\[6px\] px-2\.5 py-1\.5 transition-colors hover:border-muted-foreground">
          <span className="text-\[11px\] font-medium text-muted-foreground mb-0\.5">
            Liquidity'''

replacement_liq_div = '''<div 
          onClick={onLiquidityClick}
          className="flex flex-col bg-muted border border-transparent rounded-[6px] px-2.5 py-1.5 transition-colors hover:border-muted-foreground cursor-pointer">
          <span className="text-[11px] font-medium text-muted-foreground mb-0.5">
            Liquidity'''

c = re.sub(pattern_liq_div, replacement_liq_div, c)


with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
