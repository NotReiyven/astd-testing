import re

# MainCanvas/index.tsx
with open(r'src\app\components\MainCanvas\index.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('className="grid gap-[var(--gap-md)] w-full"', 'className="grid grid-cards gap-[var(--gap-md)] w-full"')
c = c.replace('style={{ gridTemplateColumns: \'repeat(auto-fill, minmax(200px, 1fr))\' }}', '')

with open(r'src\app\components\MainCanvas\index.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

# UnitGrid.tsx
with open(r'src\app\components\MainCanvas\UnitGrid.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('className="grid gap-6 w-full pb-8"', 'className="grid grid-cards gap-[var(--gap-md)] w-full pb-8"')
pattern = r'style=\{\{\s*gridTemplateColumns: "repeat\(auto-fill, minmax\(200px, 1fr\)\)",\s*\}\}'
c = re.sub(pattern, '', c)

with open(r'src\app\components\MainCanvas\UnitGrid.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

