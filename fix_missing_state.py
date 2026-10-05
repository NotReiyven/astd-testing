import re

with open(r'src\app\components\MainCanvas\index.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

pattern = r'const deferredSearchQuery = useDeferredValue\(searchQuery\);'
replacement = '''const deferredSearchQuery = useDeferredValue(searchQuery);

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

c = re.sub(pattern, replacement, c)

with open(r'src\app\components\MainCanvas\index.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
