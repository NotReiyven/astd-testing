import re

with open(r'src\app\components\MainCanvas\UnitGrid.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace("minmax(220px, 1fr)", "minmax(260px, 1fr)")

with open(r'src\app\components\MainCanvas\UnitGrid.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
