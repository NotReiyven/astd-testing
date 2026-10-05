import re

with open(r'src\hooks\useTradeGlobalInput.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('window.addEventListener("dragstart", handleDragStart);', '')
c = c.replace('window.addEventListener("dragend", handleDragEnd);', '')

with open(r'src\hooks\useTradeGlobalInput.ts', 'w', encoding='utf-8') as f:
    f.write(c)
