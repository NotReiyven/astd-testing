import re

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

pattern = r'const handleDragStart = \(e: React\.DragEvent\) => \{[\s\S]*?e\.dataTransfer\.effectAllowed = "copy";\n    \};'
replacement = '''const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData(
        "unit",
        JSON.stringify(popupUnit)
      );
      e.dataTransfer.effectAllowed = "copy";

      // Fix for Windows Chrome/Edge freezing when rasterizing complex DOM elements during drag
      const blankImg = new Image();
      blankImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(blankImg, 0, 0);
    };'''

c = re.sub(pattern, replacement, c)

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
