import re

with open(r'src\app\components\MainCanvas\index.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Add defaultRangeExtractor import
c = c.replace('import { useVirtualizer } from "@tanstack/react-virtual";', 'import { useVirtualizer, defaultRangeExtractor } from "@tanstack/react-virtual";')

# Add state for draggedRowIndex
pattern_state = r'const scrollRef = useRef<HTMLDivElement>\(null\);'
replacement_state = '''const scrollRef = useRef<HTMLDivElement>(null);
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const row = target.closest("[data-index]");
      if (row) {
        const idx = row.getAttribute("data-index");
        if (idx !== null) setDraggedRowIndex(Number(idx));
      }
    };
    const handleDragEnd = () => setDraggedRowIndex(null);

    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("drop", handleDragEnd);

    return () => {
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDragEnd);
    };
  }, []);'''
c = re.sub(pattern_state, replacement_state, c)

# Add rangeExtractor to useVirtualizer
pattern_virt = r'estimateSize: \(index\) => \{'
replacement_virt = '''rangeExtractor: (range) => {
        const r = defaultRangeExtractor(range);
        if (draggedRowIndex !== null && !r.includes(draggedRowIndex)) {
          r.push(draggedRowIndex);
        }
        return r;
      },
      estimateSize: (index) => {'''
c = re.sub(pattern_virt, replacement_virt, c)

with open(r'src\app\components\MainCanvas\index.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
