import re

with open(r'src\app\components\MainCanvas\TierSections.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('className="text-[26px] font-black tracking-wide uppercase leading-none"', 'className="text-2xl font-bold leading-none"')
c = c.replace('className="text-[11px] font-black uppercase tracking-widest text-muted-foreground"', 'className="text-sm font-semibold text-muted-foreground"')
c = c.replace('TOP S TIER', 'Top S Tier')
c = c.replace('S TIER', 'S Tier')
c = c.replace('A TIER', 'A Tier')
c = c.replace('B TIER', 'B Tier')
c = c.replace('C TIER', 'C Tier')
c = c.replace('PURE', 'Pure')
c = c.replace('ODDITIES', 'Oddities')
c = c.replace('UNTIERED', 'Untiered')

with open(r'src\app\components\MainCanvas\TierSections.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
