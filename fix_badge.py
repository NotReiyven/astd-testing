import re

with open(r'src\app\components\MainCanvas\UnitCard\GridStatusBadge.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('className="text-[10px] font-bold tracking-wide uppercase transition-colors leading-none"', 'className="text-xs font-semibold transition-colors leading-none"')

with open(r'src\app\components\MainCanvas\UnitCard\GridStatusBadge.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
