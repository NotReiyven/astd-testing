import re

with open(r'src\app\components\TradeAnalyzer\TradeSectionPanel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('onDragOver={handleDragOver}', 'onDragEnter={(e) => e.preventDefault()}\n        onDragOver={handleDragOver}')

with open(r'src\app\components\TradeAnalyzer\TradeSectionPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
