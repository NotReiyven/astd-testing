import re

with open(r'src\app\components\TradeAnalyzer\TradeSectionPanel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

pattern = 'const handleDragOver = (e: React.DragEvent) => {'
replacement = '''const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("unit")) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {'''

c = c.replace(pattern, replacement)

with open(r'src\app\components\TradeAnalyzer\TradeSectionPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
