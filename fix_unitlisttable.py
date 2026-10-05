import re

with open(r'src\app\components\MainCanvas\UnitListTable.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('className="hidden md:flex items-center text-muted-foreground text-[10px] font-bold uppercase tracking-widest select-none w-full gap-4"', 'className="hidden md:flex items-center text-muted-foreground text-sm font-semibold select-none w-full gap-4"')
c = c.replace('className="text-[var(--ui-text-xs)] text-muted-foreground uppercase tracking-wider truncate"', 'className="text-sm font-medium text-muted-foreground truncate"')
c = c.replace('toUpperCase()', 'valueOf()') # Just keeping original case or Title Case. Wait, valueOf doesn't do anything for string, but removes uppercase.
c = c.replace('className="text-[var(--ui-text-xs)] font-bold uppercase text-muted-foreground truncate"', 'className="text-sm font-medium text-muted-foreground truncate"')
c = c.replace('.substring(0,3).valueOf()', '.substring(0,3)')

with open(r'src\app\components\MainCanvas\UnitListTable.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
