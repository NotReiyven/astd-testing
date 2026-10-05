import re

with open(r'src\app\components\TradeAnalyzer\TradeSectionPanel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('const [isDraggingOver, setIsDraggingOver] = useState(false);', '')
c = c.replace('setIsDraggingOver(true);', '')
c = c.replace('setIsDraggingOver(false);', '')

c = re.sub(r'const handleDragLeave = \(e: React\.DragEvent\) => \{[\s\S]*?\};\n', '', c)

c = c.replace('onDragLeave={handleDragLeave}', '')

c = c.replace('if (isDraggingOver) {', 'if (isDraggingGlobal) {')

c = c.replace('isDraggingOver ? "var(--foreground)" : "var(--muted-foreground)"', 'isDraggingGlobal ? "var(--foreground)" : "var(--muted-foreground)"')

with open(r'src\app\components\TradeAnalyzer\TradeSectionPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
