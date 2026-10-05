import re

with open('src/app/components/ProfileChannel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the compact mode block
start = content.find('                  {/* Compact Mode */}')
if start != -1:
    end = content.find('                </div>\n              </div>\n            )}', start)
    if end != -1:
        # Find the end of the compact mode block more carefully
        end = content.find('                  </div>', start)
        end = content.find('                  </div>', end + 1)
        end = content.find('                  </div>', end + 1)
        # Actually just let's look for the next thing. The next thing is probably the closing of the flex-col gap-6.
        # Let's just remove the toggle safely.
        content_to_remove_match = re.search(r'\{/\*\s*Compact Mode\s*\*/\}.*?</div>\s*</div>\s*</div>', content, re.DOTALL)
        if content_to_remove_match:
            content = content[:content_to_remove_match.start()] + content[content_to_remove_match.end():]
            print("Removed Compact Mode from ProfileChannel")

with open('src/app/components/ProfileChannel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

with open('src/app/components/WelcomeModal.tsx', 'r', encoding='utf-8') as f:
    wm_content = f.read()
    
# Remove from WelcomeModal
wm_match = re.search(r'\{/\*\s*Compact Mode\s*\*/\}.*?</button>\s*</div>\s*</div>', wm_content, re.DOTALL)
if wm_match:
    wm_content = wm_content[:wm_match.start()] + wm_content[wm_match.end():]
    with open('src/app/components/WelcomeModal.tsx', 'w', encoding='utf-8') as f:
        f.write(wm_content)
    print("Removed Compact Mode from WelcomeModal")
