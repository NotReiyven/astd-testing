import re

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('className="text-[10px] font-bold tracking-wide uppercase transition-colors leading-none"', 'className="text-xs font-semibold transition-colors leading-none"')
c = c.replace('className="text-[10px] font-black tracking-[0.2em] uppercase text-white"', 'className="text-xs font-semibold text-white"')
c = c.replace('className="text-[12px] font-bold uppercase tracking-wider leading-none mt-1 truncate text-muted-foreground"', 'className="text-sm font-medium mt-1 truncate text-muted-foreground"')
c = c.replace('className="text-[8px] font-bold uppercase text-muted-foreground bg-popover px-1.5 py-0.5 rounded-[2px] border border-transparent tracking-widest leading-none"', 'className="text-xs font-semibold text-muted-foreground bg-popover px-1.5 py-0.5 rounded-[4px] border border-transparent leading-none"')
c = c.replace('className="text-[8px] font-bold uppercase text-foreground bg-white/5 px-1.5 py-0.5 rounded-[2px] border border-transparent tracking-widest leading-none"', 'className="text-xs font-semibold text-foreground bg-white/5 px-1.5 py-0.5 rounded-[4px] border border-transparent leading-none"')
c = c.replace('className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate"', 'className="text-xs font-semibold text-muted-foreground truncate"')
c = c.replace('liqStr.toUpperCase()', 'liqStr')

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
