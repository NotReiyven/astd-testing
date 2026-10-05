import re

with open(r'src\hooks\useTradeGlobalInput.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# I previously removed window.addEventListener("dragstart", handleDragStart); and dragend.
# Let's put them back.
pattern = r'const handleDragEnd = \(\) => setIsGlobalDragging\(false\);\n\n    return \(\) => \{'
replacement = '''const handleDragEnd = () => setIsGlobalDragging(false);

    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("dragend", handleDragEnd);

    return () => {'''

c = re.sub(pattern, replacement, c)

with open(r'src\hooks\useTradeGlobalInput.ts', 'w', encoding='utf-8') as f:
    f.write(c)
