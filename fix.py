import re

with open(r'src\app\components\TradingAdsChannel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    'className="text-[11px] font-bold tracking-wider uppercase font-mono"',
    'className="text-xs font-medium font-mono text-muted-foreground"'
)

c = c.replace(
    'className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"',
    'className="text-sm font-semibold text-foreground"'
)

c = c.replace(
    'className="text-[9px] font-black text-muted-foreground uppercase tracking-wider"',
    'className="text-xs font-medium text-muted-foreground"'
)

c = c.replace(
    'text-[9px] font-black uppercase tracking-wider',
    'text-xs font-semibold'
)

c = c.replace('let badgeTitle = "TRADE";', 'let badgeTitle = "Trade";')
c = c.replace('badgeTitle = "LF OFFERS";', 'badgeTitle = "LF Offers";')
c = c.replace('badgeTitle = "SHOWCASE";', 'badgeTitle = "Showcase";')

c = c.replace(
    'text-[var(--ui-text-xs)] font-bold uppercase tracking-wider',
    'text-sm font-medium'
)

c = c.replace(
    'text-[var(--ui-text-sm)] font-bold uppercase tracking-wider',
    'text-sm font-semibold'
)

c = c.replace(
    'className="text-[var(--ui-text-sm)] font-bold uppercase tracking-widest"',
    'className="text-sm font-medium text-muted-foreground"'
)

c = c.replace('var(--gap-sm)', '2')
c = c.replace('var(--gap-md)', '4')
c = c.replace('var(--gap-lg)', '6')
c = c.replace('var(--card-p)', '4')
c = c.replace('var(--page-p)', '6')
c = c.replace('var(--panel-p)', '4')

with open(r'src\app\components\TradingAdsChannel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
