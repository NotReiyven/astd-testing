import re
import sys

def remove_theme_block(filepath, start_str, end_str):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    start = content.find(start_str)
    if start == -1:
        print(f"Start not found in {filepath}")
        return
    
    end = content.find(end_str, start)
    if end == -1:
        print(f"End not found in {filepath}")
        return
    
    new_content = content[:start] + content[end:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated {filepath}")

# ProfileChannel.tsx
remove_theme_block(
    'src/app/components/ProfileChannel.tsx',
    '{/* Theme Mode */}',
    '{/* Boot Routing */}'
)

# WelcomeModal.tsx
with open('src/app/components/WelcomeModal.tsx', 'r', encoding='utf-8') as f:
    wm_content = f.read()

# We need to find the Theme block in WelcomeModal
start = wm_content.find('            {/* Theme Select */}')
end = wm_content.find('            {/* Compact Mode */}')
if start != -1 and end != -1:
    new_wm = wm_content[:start] + wm_content[end:]
    with open('src/app/components/WelcomeModal.tsx', 'w', encoding='utf-8') as f:
        f.write(new_wm)
    print("Updated WelcomeModal.tsx")
else:
    print("Could not find theme block in WelcomeModal.tsx")

# Remove [data-theme="light"] and [data-theme="discord"] blocks from theme.css
with open('src/styles/theme.css', 'r', encoding='utf-8') as f:
    css = f.read()

css = re.sub(r'\[data-theme="light"\]\s*\{[^}]+\}', '', css, flags=re.DOTALL)
css = re.sub(r'\[data-theme="discord"\]\s*\{[^}]+\}', '', css, flags=re.DOTALL)

with open('src/styles/theme.css', 'w', encoding='utf-8') as f:
    f.write(css)
print("Updated theme.css")
