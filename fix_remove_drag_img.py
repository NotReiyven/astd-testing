import re

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

pattern = r'\s*// Use the preloaded module-level blank image to avoid Chromium decode freeze\n\s*if \(typeof window !== "undefined" && window\.__blankDragImg\) \{\n\s*e\.dataTransfer\.setDragImage\(window\.__blankDragImg, 0, 0\);\n\s*\}'
c = re.sub(pattern, '', c)

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
