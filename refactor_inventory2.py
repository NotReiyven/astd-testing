import re

with open(r'src\app\components\InventoryChannel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = 'import { BulkSelectionDock } from "./shared/BulkSelectionDock";\n' + c

pattern = r'\{/\*\s*Persistent Action Dock for Selection Mode\s*\*/\}[\s\S]*?(?=\{/\*\s*Mass Import Modal\s*\*/\})'
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
        )}

        '''

c = re.sub(pattern, replacement, c)

with open(r'src\app\components\InventoryChannel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
