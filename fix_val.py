import re

with open(r'src\app\components\MainCanvas\UnitCard\GridValueDisplay.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add onClick prop
c = c.replace('export function GridValueDisplay({ unit }: { unit: GridUnit }) {', 'export function GridValueDisplay({ unit, onClick }: { unit: GridUnit, onClick?: (e: React.MouseEvent) => void }) {')

# Wrap the returns in a div or span that accepts onClick. Wait, we can just attach it to the parent wrapper in TierGridCard!
