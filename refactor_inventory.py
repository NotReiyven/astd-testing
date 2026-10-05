import re

with open(r'src\app\components\InventoryChannel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('import { Search, Loader2', 'import { BulkSelectionDock } from "./shared/BulkSelectionDock";\nimport { Search, Loader2')

pattern = r'\{/\*\s*Persistent Action Dock for Selection Mode\s*\*/\}\s*\{isSelectMode && \([\s\S]*?\}\s*\)\}'
replacement = '''{/* Persistent Action Dock for Selection Mode */}
        {isSelectMode && selectedUnits.size > 0 && (
          <BulkSelectionDock
            selectedCount={selectedUnits.size}
            onClearSelection={() => {
              setIsSelectMode(false);
              setSelectedUnits(new Set());
            }}
            onPostAsAd={handlePostAsAd}
            onSendToGive={() => handleSendToAnalyzer("give")}
            onSendToGet={() => handleSendToAnalyzer("get")}
          />
        )}'''

c = re.sub(pattern, replacement, c)

with open(r'src\app\components\InventoryChannel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
