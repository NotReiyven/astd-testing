import re

with open(r'src\app\components\MainCanvas\index.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = 'import { BulkSelectionDock } from "../shared/BulkSelectionDock";\n' + c

pattern = r'const handleBulkAddToTrade = \(type: "give" \| "get"\) => \{[\s\S]*?\};'
replacement = '''const handleBulkAddToTrade = (type: "give" | "get") => {
    if (selectedUnitIds.size === 0) return;
    ALL_UNITS.filter((u) => selectedUnitIds.has(u.id)).forEach((u) => {
      addCard(type, {
        id: u.id,
        name: u.name,
        subtitle: u.subtitle,
        value: typeof u.value === "number" ? u.value : 0,
        qty: 1,
      });
      window.dispatchEvent(
        new CustomEvent("trade-added", {
          detail: {
            name: u.name,
            type,
          },
        })
      );
    });
    window.dispatchEvent(new Event("open-analyzer"));
    setIsSelectMode(false);
    setSelectedUnitIds(new Set());
  };'''

c = re.sub(pattern, replacement, c)

dock = '''{isSelectMode && selectedUnitIds.size > 0 && (
          <BulkSelectionDock
            selectedCount={selectedUnitIds.size}
            onClearSelection={() => {
              setIsSelectMode(false);
              setSelectedUnitIds(new Set());
            }}
            onSendToGive={() => handleBulkAddToTrade("give")}
            onSendToGet={() => handleBulkAddToTrade("get")}
          />
        )}'''

c = c.replace('{/* Global Mobile Hotkeys (optional) */}', dock + '\n        {/* Global Mobile Hotkeys (optional) */}')

with open(r'src\app\components\MainCanvas\index.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
