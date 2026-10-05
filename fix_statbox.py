import re

with open(r'src\app\components\MainCanvas\UnitCard\GridStatBox.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('stringVal.toUpperCase()', 'liqKey')
c = c.replace('className="text-[8px] md:text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5"', 'className="text-xs font-semibold text-muted-foreground mb-1"')
c = c.replace('className="text-[10px] md:text-[14px] font-black tracking-wide truncate"', 'className="text-sm font-semibold truncate"')

with open(r'src\app\components\MainCanvas\UnitCard\GridStatBox.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
