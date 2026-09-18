import { TriangleAlert, Info, CornerDownRight, BookOpen } from "lucide-react";
import { TradeCard, MasterUnit } from "../../../types";
import { GRID_STATUS_CFG } from "../../../data";
import { StatusIcon } from "../MainCanvas/UnitGrid";

const STATUS_DEFS: Record<string, string> = {
  stable: "Fair and consistently decent offers. Units that are stable are most likely not to move unless something happens.",
  deflated: "If a unit is underpriced, they are deflated and are way cheaper than they should be worth.",
  inflated: "If a unit has this tag, they are inflated and cost way more than they should be worth.",
  rising: "If a unit is rising, it means the unit is being consistently overpaid.",
  dropping: "If a unit is dropping, it means owners are constantly taking underpays.",
  lowballed: "If a unit has this tag, it can get fair at most, but also gets lowballs.",
  highballed: "If a unit has this tag, it can get fair at minimum, but also gets highballs.",
  gatekept: "If a unit is gatekept, it means owners are refusing to trade this unit for any reason, waiting for rise.",
  "black-marketed": "If a unit has this tag, it means that people who buy units with outside-game currency are heavily impacting it.",
  varies: "If a unit varies, then it can get fair but it can also get lowballs or highballs."
};

export function TradeNotices({ giveItems, getItems, ALL_UNITS }: { giveItems: TradeCard[], getItems: TradeCard[], ALL_UNITS: MasterUnit[] }) {
  const getDetails = (items: TradeCard[]) => {
    const details: { name: string; status?: string; notice?: string }[] = [];
    const statusCounts: Record<string, number> = {};

    items.forEach(item => {
      const master = ALL_UNITS.find(u => u.id === item.id);
      if (master) {
        if (master.status) {
          statusCounts[master.status] = (statusCounts[master.status] || 0) + item.qty;
        }
        if (master.status || master.notice) {
          details.push({
            name: master.name,
            status: master.status,
            notice: master.notice
          });
        }
      }
    });

    const sortedStatuses = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]);
    return { details, statusCounts: sortedStatuses };
  };

  const giveData = getDetails(giveItems);
  const getData = getDetails(getItems);

  if (giveData.details.length === 0 && getData.details.length === 0) return null;

  const uniqueStatuses = Array.from(
    new Set([
      ...giveData.details.map(d => d.status),
      ...getData.details.map(d => d.status)
    ].filter(Boolean))
  ) as string[];

  const renderMomentum = (counts: [string, number][]) => {
    if (counts.length === 0) return <span className="text-[#80848E] text-[12px] font-medium">None</span>;
    return counts.map(([status, count], i) => {
      const cfg = GRID_STATUS_CFG[status as keyof typeof GRID_STATUS_CFG];
      if (!cfg) return null;
      return (
        <span key={status} className="flex items-center gap-1.5">
          <span className="text-[12px] font-bold text-[#DBDEE1]">{count}x</span>
          <span 
            className="text-[10px] font-bold uppercase px-1.5 py-[1px] rounded-[4px] border inline-flex items-center gap-1" 
            style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}
          >
            <StatusIcon status={status} />
            {cfg.label}
          </span>
          {i < counts.length - 1 && <span className="text-[#4E5058] ml-1 mr-0.5">•</span>}
        </span>
      );
    });
  };

  const renderSection = (type: "give" | "get", data: typeof giveData) => {
    if (data.details.length === 0) return null;

    const isGive = type === "give";
    const accentColor = isGive ? "#FAA61A" : "#5865F2";
    const bgAccent = isGive ? "rgba(250, 166, 26, 0.03)" : "rgba(88, 101, 242, 0.03)";
    const title = isGive ? "You Give" : "You Get";

    return (
      <div 
        className="flex flex-col gap-2.5 mt-3 p-3.5 rounded-[8px] border border-[rgba(255,255,255,0.03)] shadow-inner" 
        style={{ backgroundColor: bgAccent }}
      >
        <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)] pb-2.5 mb-1">
          <div className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: accentColor }} />
          <h4 className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: accentColor }}>{title}</h4>
        </div>
        
        <div className="flex flex-col gap-3.5">
          {data.details.map((item, idx) => {
             const cfg = item.status ? GRID_STATUS_CFG[item.status as keyof typeof GRID_STATUS_CFG] : null;
             return (
               <div key={idx} className="flex flex-col">
                 <div className="flex items-center gap-2">
                   <span className="text-[13px] font-bold text-[#F2F3F5]">{item.name}</span>
                   {cfg && (
                     <span 
                       className="text-[10px] font-bold uppercase px-1.5 py-[1px] rounded-[4px] border shadow-sm inline-flex items-center gap-1" 
                       style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}
                     >
                       <StatusIcon status={item.status} />
                       {cfg.label}
                     </span>
                   )}
                 </div>
                 {item.notice && (
                   <div className="flex items-start gap-1.5 mt-1.5 opacity-90">
                     <CornerDownRight className="w-3.5 h-3.5 text-[#80848E] shrink-0 mt-0.5" />
                     <p className="text-[11.5px] text-[#B5BAC1] leading-snug italic">
                       {item.notice}
                     </p>
                   </div>
                 )}
               </div>
             );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-3 md:mx-4 mt-2 mb-6 bg-[#1E1F22] border border-[rgba(255,255,255,0.04)] rounded-[8px] flex flex-col shadow-sm">
      <div className="flex items-center gap-2 bg-[#2B2D31] px-4 py-3 border-b border-[rgba(255,255,255,0.04)] rounded-t-[8px]">
        <TriangleAlert className="w-4 h-4 text-[#FAA61A]" />
        <h3 className="text-[12px] font-extrabold text-[#DBDEE1] uppercase tracking-wider">Trade Notices</h3>
      </div>

      <div className="p-4 flex flex-col gap-1">
        {(giveData.statusCounts.length > 0 || getData.statusCounts.length > 0) && (
          <div className="flex flex-col gap-2.5 bg-[#111214] p-3 rounded-[6px] border border-[rgba(255,255,255,0.02)] mb-1 shadow-inner">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Info className="w-3.5 h-3.5 text-[#5865F2]" />
              <span className="text-[11px] font-bold text-[#949BA4] uppercase tracking-widest">Status Momentum Summary</span>
            </div>
            
            <div className="flex items-center flex-wrap gap-x-3 gap-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] font-semibold text-[#80848E] mr-1">Give:</span>
                {renderMomentum(giveData.statusCounts)}
              </div>
              
              <span className="text-[#4E5058] font-bold mx-1">➔</span>
              
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[12px] font-semibold text-[#80848E] mr-1">Get:</span>
                {renderMomentum(getData.statusCounts)}
              </div>
            </div>
          </div>
        )}

        {renderSection("give", giveData)}
        {renderSection("get", getData)}

        {uniqueStatuses.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.04)] flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#949BA4]" />
              <span className="text-[11px] font-bold text-[#949BA4] uppercase tracking-widest">Terms in this trade</span>
            </div>
            <div className="flex flex-col gap-2">
              {uniqueStatuses.map(status => {
                const cfg = GRID_STATUS_CFG[status as keyof typeof GRID_STATUS_CFG];
                const def = STATUS_DEFS[status];
                if (!cfg || !def) return null;

                return (
                  <div key={status} className="flex items-start gap-2.5 bg-[#111214] p-2.5 rounded-[6px] border border-[rgba(255,255,255,0.02)] shadow-inner">
                    <span 
                      className="text-[10px] font-bold uppercase px-1.5 py-[1px] rounded-[4px] border shrink-0 mt-[1px] shadow-sm inline-flex items-center gap-1" 
                      style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border }}
                    >
                      <StatusIcon status={status} />
                      {cfg.label}
                    </span>
                    <p className="text-[11.5px] text-[#DBDEE1] leading-relaxed">
                      {def}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}