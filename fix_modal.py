import re

with open(r'src\app\components\MainCanvas\HistoryModal.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('const { isOpen, unitId, closeModal } = useHistoryModalStore();', 'const { isOpen, unitId, closeModal, initialMetric } = useHistoryModalStore();')

pattern = r'const \[activeMetric, setActiveMetric\] = useState<\s*"value" \| "rarity" \| "liquidity"\s*>\("value"\);'
replacement = 'const [activeMetric, setActiveMetric] = useState<"value" | "rarity" | "liquidity">(initialMetric || "value");'

c = re.sub(pattern, replacement, c)

# We also need to update activeMetric if initialMetric changes while modal is open, or just in useEffect when isOpen becomes true
use_effect = '''  useEffect(() => {
    if (isOpen && initialMetric) {
      setActiveMetric(initialMetric);
    }
  }, [isOpen, initialMetric]);
'''

if 'setActiveMetric(initialMetric);' not in c:
    c = c.replace('const scrollRef = useRef<HTMLDivElement>(null);', 'const scrollRef = useRef<HTMLDivElement>(null);\n\n' + use_effect)

with open(r'src\app\components\MainCanvas\HistoryModal.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
