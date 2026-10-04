// @ts-nocheck
import React from 'react';
import { createPortal } from 'react-dom';
import { X, Crown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { MasterUnit } from '../../../types';
import { InventoryItem } from '../../../store/useInventoryStore';
import { getTier, TIER_CONFIG } from '../../../data';
import { getUnitConservativeValue } from './inventoryUtils';
import { UnitAvatar } from '../shared/UnitAvatar';

interface ValueBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: (InventoryItem & { master: MasterUnit })[];
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        
      />
    </g>
  );
};

function CountUpNumber({ targetValue }: { targetValue: number }) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let start: number;
    let frame: number;
    const duration = 1000;
    const animate = (time: number) => {
      if (!start) start = time;
      const progress = Math.min((time - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(targetValue * ease));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [targetValue]);

  return <>{displayValue.toLocaleString()}</>;
}

function ModalContent({ onClose, items }: Omit<ValueBreakdownModalProps, 'isOpen'>) {
  const topUnits = [...items].sort((a, b) => getUnitConservativeValue(b.master) - getUnitConservativeValue(a.master)).slice(0, 5);
  const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

  const dataMap = new Map<string, { value: number; count: number }>();

  items.forEach((item) => {
    const master = item.master;
    const tier = getTier(master);
    const value = getUnitConservativeValue(master) * item.quantity;
    
    if (value > 0) {
      const current = dataMap.get(tier) || { value: 0, count: 0 };
      dataMap.set(tier, { value: current.value + value, count: current.count + item.quantity });
    }
  });

  const data = Array.from(dataMap.entries())
    .map(([tierKey, stats]) => ({
      name: TIER_CONFIG[tierKey]?.label || tierKey,
      value: stats.value,
      count: stats.count,
      color: TIER_CONFIG[tierKey]?.badgeColor || "#8884d8"
    }))
    .sort((a, b) => b.value - a.value);

  const totalValue = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/95 animate-in fade-in duration-200" onClick={onClose} />
      
      <div className="bg-card border border-border rounded-[12px] shadow-2xl w-full max-w-4xl relative z-10 flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-300 ease-out">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-muted/20 flex-shrink-0">
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span className="w-2 h-6 bg-primary rounded-full"></span>
            Wealth Distribution
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-[4px] text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border overflow-y-auto custom-scrollbar">
          <div className="p-6">
            <div className="h-[250px] md:h-[280px] w-full mb-2 relative flex-shrink-0">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-70">Total Net Worth</span>
              <span className="text-3xl font-black font-mono tracking-tighter text-foreground"><CountUpNumber targetValue={totalValue} /></span>
            </div>
            <ResponsiveContainer width="100%" height="100%" className="relative z-10">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="75%"
                  paddingAngle={6}
                  dataKey="value"
                  stroke="var(--background)"
                  strokeWidth={3}
                  animationBegin={0}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                       
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[14px] text-foreground">{value.toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground">{props.payload.count} Units</span>
                    </div>, 
                    "Value"
                  ]}
                  contentStyle={{ backgroundColor: 'var(--popover)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', padding: '12px' }}
                  itemStyle={{ fontWeight: 'black' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--muted-foreground)', fontSize: '11px', textTransform: 'uppercase' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-col gap-2.5 pr-1 pb-2">
            {data.map((entry, idx) => (
              <div 
                key={idx} 
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(undefined)}
                className={`flex items-center justify-between p-3.5 rounded-[8px] border transition-all cursor-default group  ${
                  activeIndex === idx ? 'bg-muted/60 border-border/80 scale-[1.02] shadow-md' : 'bg-muted/20 border-border hover:bg-muted/40'
                }`}
                
              >
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-background/20 transition-transform duration-300 group-hover:scale-125" style={{ backgroundColor: entry.color }} />
                  <div className="flex flex-col">
                    <span className="text-[14px] font-black text-foreground tracking-wider uppercase group-hover:translate-x-1 transition-transform flex items-center gap-1.5">
                      {entry.name}
                      {idx === 0 && <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/20" />}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground group-hover:translate-x-1 transition-transform">{entry.count} Unit{entry.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-mono text-muted-foreground font-bold">{((entry.value / totalValue) * 100).toFixed(1)}%</span>
                  <span className="font-mono font-black tabular-nums text-foreground">{entry.value.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-muted/10">
          <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Top Vault Assets</h3>
          <div className="flex flex-col gap-3">
            {topUnits.map((item, idx) => {
              const unitVal = getUnitConservativeValue(item.master);
              return (
                <div key={item.id || idx} className="flex items-center gap-3 p-3 rounded-[8px] border border-border/50 bg-background/50 hover:bg-muted/40 transition-colors">
                  <div className="w-10 h-10 flex-shrink-0 relative overflow-hidden rounded-md bg-muted/20">
                    <UnitAvatar unitId={item.master.id} unitName={item.master.name} imageUrl={item.master.image} />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold text-[14px] text-foreground truncate leading-tight">{item.master.name}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{item.master.subtitle || "Standard"}</span>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="font-mono font-black text-foreground">{unitVal.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Per Unit</span>
                  </div>
                </div>
              );
            })}
            {topUnits.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">No assets found.</div>
            )}
          </div>
          <div className="mt-6 p-4 rounded-[8px] border border-border bg-muted/20 grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Total Vault Units</span>
              <span className="font-mono font-black text-lg text-foreground">{items.reduce((acc, i) => acc + i.quantity, 0).toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Avg Unit Value</span>
              <span className="font-mono font-black text-lg text-foreground">
                {totalValue > 0 ? Math.floor(totalValue / items.reduce((acc, i) => acc + i.quantity, 0)).toLocaleString() : 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

export function ValueBreakdownModal({ isOpen, onClose, items }: ValueBreakdownModalProps) {
  if (!isOpen) return null;
  return createPortal(<ModalContent onClose={onClose} items={items} />, document.body);
}




