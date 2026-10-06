const fs = require('fs');
let c = fs.readFileSync('src/store/useHistoryModalStore.ts', 'utf8');
c = c.replace(/initialMetric/g, 'activeMetric');
c = c.replace('closeModal: () => set({ isOpen: false, unitId: null, activeMetric: "value" }),', 'closeModal: () => set({ isOpen: false, unitId: null, activeMetric: "value" }),\n  setActiveMetric: (metric: MetricType) => set({ activeMetric: metric }),');

if (!c.includes('setActiveMetric: (metric: MetricType) => void;')) {
  c = c.replace('closeModal: () => void;', 'closeModal: () => void;\n  setActiveMetric: (metric: MetricType) => void;');
}

fs.writeFileSync('src/store/useHistoryModalStore.ts', c);
console.log('Fixed useHistoryModalStore');
