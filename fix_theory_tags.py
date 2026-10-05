import re

with open(r'src\data\config.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace uppercase in TheoryTab.tsx
with open(r'src\app\components\TutorialChannel\TheoryTab.tsx', 'r', encoding='utf-8') as f:
    tt = f.read()

tt = tt.replace('text-[10px] font-bold uppercase px-2 py-1 rounded-[4px] border block text-center w-full', 'text-xs font-semibold px-2 py-1 rounded-[6px] border block text-center w-full shadow-sm backdrop-blur-md')
tt = tt.replace('text-[12px] font-black font-mono uppercase px-2 py-1 rounded-[4px]', 'text-[12px] font-black font-mono px-2 py-1 rounded-[6px]')
tt = tt.replace('text-[10px] font-black uppercase px-2 py-1 rounded-[4px]', 'text-[11px] font-black px-2 py-1 rounded-[6px]')

with open(r'src\app\components\TutorialChannel\TheoryTab.tsx', 'w', encoding='utf-8') as f:
    f.write(tt)
