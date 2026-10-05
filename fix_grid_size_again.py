import re

with open(r'src\app\components\MainCanvas\index.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('minmax(260px, 1fr)', 'minmax(200px, 1fr)')

with open(r'src\app\components\MainCanvas\index.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open(r'src\app\components\MainCanvas\UnitGrid.tsx', 'r', encoding='utf-8') as f:
    c2 = f.read()

c2 = c2.replace('minmax(260px, 1fr)', 'minmax(200px, 1fr)')

with open(r'src\app\components\MainCanvas\UnitGrid.tsx', 'w', encoding='utf-8') as f:
    f.write(c2)
