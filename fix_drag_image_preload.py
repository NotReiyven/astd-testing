import re

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

pattern = r'const handleDragStart = \(e: React\.DragEvent\) => \{[\s\S]*?e\.dataTransfer\.setDragImage\(blankImg, 0, 0\);\n    \};'

replacement = '''const handleDragStart = (e: React.DragEvent) => {
      e.dataTransfer.setData("unit", JSON.stringify(popupUnit));
      e.dataTransfer.effectAllowed = "copy";
      
      // Use the preloaded module-level blank image to avoid Chromium decode freeze
      if (typeof window !== "undefined" && window.__blankDragImg) {
        e.dataTransfer.setDragImage(window.__blankDragImg, 0, 0);
      }
    };'''

c = re.sub(pattern, replacement, c)

# Add the preloaded image to the top of the file
if 'window.__blankDragImg' not in c:
    preload_code = '''
if (typeof window !== "undefined") {
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  (window as any).__blankDragImg = img;
}
'''
    c = c.replace('import { useTradeStore } from "../../../../store/useTradeStore";', 'import { useTradeStore } from "../../../../store/useTradeStore";\n' + preload_code)

with open(r'src\app\components\MainCanvas\UnitCard\TierGridCard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
