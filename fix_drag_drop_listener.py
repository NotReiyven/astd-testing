import re

with open(r'src\hooks\useTradeGlobalInput.ts', 'r', encoding='utf-8') as f:
    c = f.read()

pattern = r'window\.addEventListener\("dragend", handleDragEnd\);'
replacement = '''window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("drop", handleDragEnd);'''

c = re.sub(pattern, replacement, c)

pattern2 = r'window\.removeEventListener\("dragend", handleDragEnd\);'
replacement2 = '''window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDragEnd);'''

c = re.sub(pattern2, replacement2, c)

with open(r'src\hooks\useTradeGlobalInput.ts', 'w', encoding='utf-8') as f:
    f.write(c)
