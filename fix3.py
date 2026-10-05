import re

with open(r'src\app\components\shared\ResponsiveToolbar.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('gap-[var(--gap-md)]', 'gap-4')
c = c.replace('px-[var(--panel-p)]', 'px-4')
c = c.replace('py-[calc(var(--panel-p)*0.75)]', 'py-3')

with open(r'src\app\components\shared\ResponsiveToolbar.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
