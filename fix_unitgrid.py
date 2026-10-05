import re

with open(r'src\app\components\MainCanvas\UnitGrid.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('gap-[var(--gap-md)]', 'gap-6')
c = c.replace('pb-[var(--gap-lg)]', 'pb-8')
c = c.replace('minmax(min(100%, 160px), 1fr)', 'minmax(220px, 1fr)')

with open(r'src\app\components\MainCanvas\UnitGrid.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
