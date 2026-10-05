import re

with open(r'src\app\components\TradeAnalyzer\TradeSectionPanel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace handleDragEnter and onDragOver
old_drag_handlers = '''  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("unit")) {
      e.dataTransfer.dropEffect = "copy";
      
    }
  };'''

new_drag_handlers = '''  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("unit")) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("unit")) {
      e.dataTransfer.dropEffect = "copy";
    }
  };'''

c = c.replace(old_drag_handlers, new_drag_handlers)
c = c.replace('onDragOver={(e) => e.preventDefault()}', 'onDragOver={handleDragOver}')

with open(r'src\app\components\TradeAnalyzer\TradeSectionPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
