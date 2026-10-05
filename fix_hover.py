import re

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('hover:-translate-y-1 hover:shadow-xl', 'hover:-translate-y-2 hover:shadow-2xl hover:scale-[1.02] ease-out')
c = c.replace('p-[var(--card-p)]', 'p-5')

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
