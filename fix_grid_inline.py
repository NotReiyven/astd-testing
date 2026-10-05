import re

# MainCanvas/index.tsx
with open(r'src\app\components\MainCanvas\index.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('className="grid grid-cards gap-[var(--gap-md)] w-full"', 'className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[var(--gap-md)] w-full"')

with open(r'src\app\components\MainCanvas\index.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

# UnitGrid.tsx
with open(r'src\app\components\MainCanvas\UnitGrid.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('className="grid grid-cards gap-[var(--gap-md)] w-full pb-8"', 'className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[var(--gap-md)] w-full pb-8"')

with open(r'src\app\components\MainCanvas\UnitGrid.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
