import re

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

pattern_val = r'''<div
                className="pl-2 border-l-\[3px\] w-full min-w-0 mb-1"
                style={{
                  borderColor: tierColor,
                }}
              >
                <GridValueDisplay
                  unit=\{unit as GridUnit\}
                />
              </div>'''

replacement_val = '''<div
                className="pl-2 border-l-[3px] w-full min-w-0 mb-1 hover:bg-white/5 cursor-pointer rounded-r transition-colors py-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  const { openModal } = useHistoryModalStore.getState();
                  openModal(unit.id, "value");
                }}
                style={{
                  borderColor: tierColor,
                }}
              >
                <GridValueDisplay
                  unit={unit as GridUnit}
                />
              </div>'''

c = re.sub(pattern_val, replacement_val, c)


pattern_stat = r'''<GridStatFooter
                rarity=\{unit\.rarity\}
                liquidity=\{unit\.liquidity \|\| "Average"\}
              />'''

replacement_stat = '''<GridStatFooter
                rarity={unit.rarity}
                liquidity={unit.liquidity || "Average"}
                onRarityClick={(e) => {
                  e.stopPropagation();
                  const { openModal } = useHistoryModalStore.getState();
                  openModal(unit.id, "rarity");
                }}
                onLiquidityClick={(e) => {
                  e.stopPropagation();
                  const { openModal } = useHistoryModalStore.getState();
                  openModal(unit.id, "liquidity");
                }}
              />'''

c = re.sub(pattern_stat, replacement_stat, c)

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
