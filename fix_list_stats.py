import re

with open(r'src\app\components\MainCanvas\UnitListTable.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

if 'useHistoryModalStore' not in c:
    c = c.replace('import { UnitAvatar } from "../shared/UnitAvatar";', 'import { UnitAvatar } from "../shared/UnitAvatar";\nimport { useHistoryModalStore } from "../../../store/useHistoryModalStore";')

# Desktop Layout values
pattern_desktop_val = r'''<div className="flex-1 flex justify-end">
                 \{/\* Display Val logic \*/\}
                 <span className="text-\[var\(--ui-text-base\)\] font-black text-foreground">
                   \{unit\.valueDisplay \|\| unit\.value\.toLocaleString\(\)\}
                 </span>
              </div>'''

replacement_desktop_val = '''<div className="flex-1 flex justify-end">
                 {/* Display Val logic */}
                 <span 
                   className="text-[var(--ui-text-base)] font-black text-foreground cursor-pointer hover:opacity-80"
                   onClick={(e) => { e.stopPropagation(); useHistoryModalStore.getState().openModal(unit.id, "value"); }}
                 >
                   {unit.valueDisplay || unit.value.toLocaleString()}
                 </span>
              </div>'''

c = re.sub(pattern_desktop_val, replacement_desktop_val, c)

pattern_desktop_r = r'''<div className="w-16 flex justify-center text-\[12px\] font-bold" style=\{\{ color: getStatColor\("R", unit\.rarity\) \}\}>
               \{unit\.rarity\}
              </div>'''

replacement_desktop_r = '''<div 
                className="w-16 flex justify-center text-[12px] font-bold cursor-pointer hover:opacity-80" 
                style={{ color: getStatColor("R", unit.rarity) }}
                onClick={(e) => { e.stopPropagation(); useHistoryModalStore.getState().openModal(unit.id, "rarity"); }}
              >
               {unit.rarity}
              </div>'''

c = re.sub(pattern_desktop_r, replacement_desktop_r, c)

pattern_desktop_l = r'''<div className="w-16 flex justify-center text-\[12px\] font-bold" style=\{\{ color: getStatColor\("L", unit\.liquidity \|\| 'average'\) \}\}>
               \{\(unit\.liquidity \|\| 'Average'\)\.substring\(0,3\)\}
              </div>'''

replacement_desktop_l = '''<div 
                className="w-16 flex justify-center text-[12px] font-bold cursor-pointer hover:opacity-80" 
                style={{ color: getStatColor("L", unit.liquidity || 'average') }}
                onClick={(e) => { e.stopPropagation(); useHistoryModalStore.getState().openModal(unit.id, "liquidity"); }}
              >
               {(unit.liquidity || 'Average').substring(0,3)}
              </div>'''

c = re.sub(pattern_desktop_l, replacement_desktop_l, c)


# Mobile Layout values
pattern_mobile_val = r'''<div className="shrink-0 text-right font-mono font-black text-\[var\(--ui-text-lg\)\]">
               \{unit\.valueDisplay \|\| unit\.value\.toLocaleString\(\)\}
              </div>'''

replacement_mobile_val = '''<div 
                className="shrink-0 text-right font-mono font-black text-[var(--ui-text-lg)] cursor-pointer hover:opacity-80"
                onClick={(e) => { e.stopPropagation(); useHistoryModalStore.getState().openModal(unit.id, "value"); }}
              >
               {unit.valueDisplay || unit.value.toLocaleString()}
              </div>'''

c = re.sub(pattern_mobile_val, replacement_mobile_val, c)


pattern_mobile_rl = r'''<span className="text-muted-foreground">R <span style=\{\{ color: getStatColor\("R", unit\.rarity\) \}\}>\{unit\.rarity\}</span></span>
              <span className="text-border">\|</span>
              <span className="text-muted-foreground">L <span style=\{\{ color: getStatColor\("L", unit\.liquidity \|\| 'average'\) \}\}>\{\(unit\.liquidity \|\| 'Avg'\)\.substring\(0,3\)\}</span></span>'''

replacement_mobile_rl = '''<span 
                className="text-muted-foreground cursor-pointer hover:opacity-80"
                onClick={(e) => { e.stopPropagation(); useHistoryModalStore.getState().openModal(unit.id, "rarity"); }}
              >R <span style={{ color: getStatColor("R", unit.rarity) }}>{unit.rarity}</span></span>
              <span className="text-border">|</span>
              <span 
                className="text-muted-foreground cursor-pointer hover:opacity-80"
                onClick={(e) => { e.stopPropagation(); useHistoryModalStore.getState().openModal(unit.id, "liquidity"); }}
              >L <span style={{ color: getStatColor("L", unit.liquidity || 'average') }}>{(unit.liquidity || 'Avg').substring(0,3)}</span></span>'''

c = re.sub(pattern_mobile_rl, replacement_mobile_rl, c)

with open(r'src\app\components\MainCanvas\UnitListTable.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
