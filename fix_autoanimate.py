import re

with open(r'src\app\components\TradeAnalyzer\TradeSectionPanel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('import { useAutoAnimate } from "@formkit/auto-animate/react";', '')
c = c.replace('const [animationParent] = useAutoAnimate<HTMLDivElement>();', '')
c = c.replace('<div ref={animationParent}', '<div')

with open(r'src\app\components\TradeAnalyzer\TradeSectionPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
