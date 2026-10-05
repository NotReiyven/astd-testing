import re

with open(r'src\app\components\TradingAdsChannel.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('gap-[2]', 'gap-2')
c = c.replace('gap-[4]', 'gap-4')
c = c.replace('gap-[6]', 'gap-6')
c = c.replace('p-[4]', 'p-4')
c = c.replace('p-[6]', 'p-6')
c = c.replace('mb-[4]', 'mb-4')
c = c.replace('pt-[4]', 'pt-4')

with open(r'src\app\components\TradingAdsChannel.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
