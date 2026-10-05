import re

with open(r'src\app\components\MainCanvas\index.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

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

c = c.replace('<button ref={scrollTopBtnRef}', dock + '\n\n      <button ref={scrollTopBtnRef}')

with open(r'src\app\components\MainCanvas\index.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
