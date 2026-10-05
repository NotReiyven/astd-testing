import re

with open('src/app/components/WelcomeModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('            {/* Theme Select */}')
if start == -1:
    # try another anchor
    start = content.find('              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">\n                <Palette')
    # Find the start of the <div className="flex flex-col gap-2"> that contains it
    start = content.rfind('            <div className="flex flex-col gap-2">', 0, start)

end = content.find('            {/* Boot Channel */}')
if start != -1 and end != -1:
    content = content[:start] + content[end:]
    with open('src/app/components/WelcomeModal.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("WelcomeModal updated")
else:
    print("Could not find blocks")
