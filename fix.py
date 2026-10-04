import re
with open("src/app/components/TradingAdsChannel.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = re.sub(r'return \(\s*<div\s*key={`empty-\$\{i\}`}.*?</div>\s*\);', 'return null;', text, flags=re.DOTALL)

with open("src/app/components/TradingAdsChannel.tsx", "w", encoding="utf-8") as f:
    f.write(text)
