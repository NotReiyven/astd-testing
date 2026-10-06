const fs = require('fs');
let c = fs.readFileSync('src/app/components/MainCanvas/HistoryModal.tsx', 'utf8');

c = c.replace(
  'const { isOpen, unitId, closeModal, initialMetric } = useHistoryModalStore();',
  'const { isOpen, unitId, closeModal, activeMetric, setActiveMetric } = useHistoryModalStore();'
);

c = c.replace(
  'const [activeMetric, setActiveMetric] = useState<Metric>(\n    initialMetric || "value"\n  );',
  ''
);

c = c.replace(
  'const [activeMetric, setActiveMetric] = useState<Metric>(initialMetric || "value");',
  ''
);

c = c.replace(
  '  useEffect(() => {\n    if (!isOpen) return;\n    setActiveMetric(initialMetric || "value");\n    setIsScrolled(false);\n    if (scrollRef.current) scrollRef.current.scrollTop = 0;\n  }, [isOpen, unitId, initialMetric]);',
  '  useEffect(() => {\n    if (!isOpen) return;\n    setIsScrolled(false);\n    if (scrollRef.current) scrollRef.current.scrollTop = 0;\n  }, [isOpen, unitId]);'
);

// Fallback if the above formatting didn't match exactly
c = c.replace(/  useEffect\(\(\) => \{\s*if \(\!isOpen\) return;\s*setActiveMetric\(initialMetric \|\| "value"\);\s*setIsScrolled\(false\);\s*if \(scrollRef\.current\) scrollRef\.current\.scrollTop = 0;\s*\}, \[isOpen, unitId, initialMetric\]\);/g, '  useEffect(() => {\n    if (!isOpen) return;\n    setIsScrolled(false);\n    if (scrollRef.current) scrollRef.current.scrollTop = 0;\n  }, [isOpen, unitId]);');

// Delete any remaining setActiveMetric that's useState based
c = c.replace(/const \[activeMetric, setActiveMetric\] = useState<Metric>\([^)]+\);/g, '');


fs.writeFileSync('src/app/components/MainCanvas/HistoryModal.tsx', c);
console.log('Fixed HistoryModal');
