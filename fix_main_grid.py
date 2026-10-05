import re

with open(r'src\app\components\MainCanvas\index.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace("style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))' }}", "style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}")
c = c.replace('className="grid gap-3 w-full pb-8"', 'className="grid gap-5 w-full pb-8"')

with open(r'src\app\components\MainCanvas\index.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
