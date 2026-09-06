import { useState, useEffect } from "react";
import { X, TrendingUp, History, BarChart2, Sparkles, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { useHistoryModalStore } from "../../../store/useHistoryModalStore";
import { useUnitHistory, HistorySnapshot } from "../../../hooks/useUnitHistory";
import { useUnits } from "../../../context/UnitContext";
import { GRID_STATUS_CFG, TIER_CONFIG, getProxyImage, getTier } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";

export function HistoryModal() {
  const { isOpen, unitId, closeModal } = useHistoryModalStore();
  const { history, loading, error } = useUnitHistory(unitId);
  const { units } = useUnits();
  const [activeMetric, setActiveMetric] = useState<'value' | 'rarity' | 'supply' | 'demand'>('value');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      setActiveMetric('value');
    } else {
      document.body.style.overflow = "auto";
    }
    
    return () => { 
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeModal]);

  if (!isOpen || !unitId) return null;

  const currentUnit = units.find(u => u.id === unitId);
  if (!currentUnit) return null;

  const tierKey = getTier(currentUnit);
  const tierCfg = TIER_CONFIG[tierKey] || { badgeColor: "#5865F2", label: tierKey };
  const proxyUrl = getProxyImage(currentUnit.id, currentUnit.imageUrl);
  const latestSnap: HistorySnapshot | undefined = history[history.length - 1];

  const metricConfigs = {
    value: { label: "Value Trend History", color: "#5865F2", gradientId: "valueGrad", unitLabel: "Value" },
    rarity: { label: "Rarity Trend History", color: "#4DB6AC", gradientId: "rarityGrad", unitLabel: "Rarity" },
    supply: { label: "Supply Trend History", color: "#81C784", gradientId: "supplyGrad", unitLabel: "Supply" },
    demand: { label: "Demand Trend History", color: "#FFB74D", gradientId: "demandGrad", unitLabel: "Demand" },
  };

  const currentConfig = metricConfigs[activeMetric];

  const chartData = history.map(snap => {
    const dateStr = new Date(snap.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    let plotVal = 0;
    let label = "0";

    if (activeMetric === 'value') {
      if (snap.value_type === "owner") {
        label = "O/C";
      } else if (snap.value_type === "range" && snap.value_min) {
        plotVal = snap.value_min;
        label = snap.value_display || `${snap.value_min}`;
      } else {
        plotVal = snap.value || 0;
        label = plotVal.toLocaleString();
      }
    } else if (activeMetric === 'rarity') {
      plotVal = snap.rarity ?? 0;
      label = plotVal.toString();
    } else if (activeMetric === 'supply') {
      plotVal = snap.supply ?? 0;
      label = plotVal.toString();
    } else if (activeMetric === 'demand') {
      plotVal = snap.demand ?? 0;
      label = plotVal.toString();
    }

    return { date: dateStr, value: plotVal, label, fullSnap: snap };
  }).filter(d => activeMetric !== 'value' || d.value > 0);

  // Peak and Trough Calculations
  const validChartData = chartData.filter(d => d.value > 0);
  const maxVal = validChartData.length > 0 ? Math.max(...validChartData.map(d => d.value)) : 0;
  const minVal = validChartData.length > 0 ? Math.min(...validChartData.map(d => d.value)) : 0;

  // Percentage Gain / Loss Calculation
  const oldestSnap = history[0];
  const oldestSnapVal = oldestSnap ? (oldestSnap.value_type === 'range' ? oldestSnap.value_min : oldestSnap.value) : null;
  const latestSnapVal = latestSnap ? (latestSnap.value_type === 'range' ? latestSnap.value_min : latestSnap.value) : null;
  const pctChange = (oldestSnapVal && latestSnapVal && oldestSnapVal > 0)
    ? ((latestSnapVal - oldestSnapVal) / oldestSnapVal) * 100
    : 0;

  const timeline: { snap: HistorySnapshot, prev: HistorySnapshot, date: string, changed: string[] }[] = [];
  for (let i = history.length - 1; i > 0; i--) {
    const curr = history[i];
    const prev = history[i - 1];
    const changes = [];
    if (curr.value !== prev.value || curr.value_display !== prev.value_display) changes.push("Value");
    if (curr.status !== prev.status) changes.push("Status");
    if (curr.rarity !== prev.rarity) changes.push("Rarity");
    if (curr.supply !== prev.supply) changes.push("Supply");
    if (curr.demand !== prev.demand) changes.push("Demand");
    if (curr.notice !== prev.notice) changes.push("Notice");

    if (changes.length > 0) {
      timeline.push({ snap: curr, prev, date: new Date(curr.recorded_at).toLocaleString(), changed: changes });
    }
  }

  const statusCfg = GRID_STATUS_CFG[(latestSnap?.status || currentUnit.status) as keyof typeof GRID_STATUS_CFG];

  // Custom Dot Renderer for Peak and Trough Callouts
  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;

    const isMax = payload.value === maxVal && validChartData.length > 1;
    const isMin = payload.value === minVal && validChartData.length > 1 && minVal !== maxVal;

    if (isMax) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={7} fill="#43b581" stroke="#fff" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={14} fill="none" stroke="#43b581" strokeWidth={1.5} opacity={0.6} className="animate-ping" />
        </g>
      );
    }

    if (isMin) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={7} fill="#ed4245" stroke="#fff" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={14} fill="none" stroke="#ed4245" strokeWidth={1.5} opacity={0.6} />
        </g>
      );
    }

    return <circle cx={cx} cy={cy} r={4} fill="#1E1F22" stroke={currentConfig.color} strokeWidth={2} />;
  };

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity" onClick={closeModal} />
      
      <div className="bg-[#1E1F22] border border-[rgba(255,255,255,0.08)] rounded-[24px] w-full max-w-3xl max-h-[94vh] flex flex-col relative shadow-[0_24px_64px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up">
        
        {/* Solid Tier-Colored Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-[5px] z-20" style={{ background: tierCfg.badgeColor }} />

        {/* Hero Header */}
        <div className="px-6 pt-7 pb-5 bg-gradient-to-b from-[#2B2D31] to-[#1E1F22] border-b border-[rgba(255,255,255,0.06)] relative flex items-center justify-between">
          
          <div className="flex items-center gap-5 min-w-0">
            {/* Popped Out Avatar with Neon Glow */}
            <div className="relative group">
              <div className="absolute -inset-1 rounded-[18px] opacity-75 blur-md transition-all duration-300 group-hover:opacity-100" style={{ background: tierCfg.badgeColor }} />
              <div 
                className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-[16px] overflow-hidden bg-[#111214] flex-shrink-0 shadow-2xl flex items-center justify-center border-2 border-white/20"
              >
                {proxyUrl ? (
                  <img src={proxyUrl} alt={currentUnit.name} className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500" />
                ) : (
                  <span className="text-white font-black text-2xl" style={getAvatarStyle(currentUnit.name)}>{getInitials(currentUnit.name)}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col min-w-0 justify-center">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-[#F2F3F5] text-[22px] sm:text-[24px] font-black tracking-tight truncate drop-shadow-sm">{currentUnit.name}</h2>
                {statusCfg && (
                  <span className="text-[11px] font-extrabold uppercase px-3 py-1 rounded-full border shadow-sm tracking-wider" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}>
                    {statusCfg.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                <span className="text-[#949BA4] text-[12px] font-bold uppercase tracking-wider">{currentUnit.subtitle || "Official Unit"}</span>
                <span className="text-[#4e5058]">•</span>
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-[6px] bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/40 shadow-sm">
                  Tier {tierKey}
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={closeModal} 
            className="text-[#949BA4] hover:text-[#F2F3F5] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] p-2.5 rounded-full transition-all duration-200 focus-visible:outline-none flex-shrink-0 self-start shadow-md active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 flex flex-col gap-6 bg-[#18191C]">
          
          {/* Interactive Metric Selectors (Dashboard Cards with Percentage Gain/Loss Badges) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div 
              onClick={() => setActiveMetric('value')}
              className={`rounded-[16px] p-4 flex flex-col justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${activeMetric === 'value' ? 'bg-[#2B2D31] ring-2 ring-[#5865F2] shadow-[0_8px_20px_rgba(88,101,242,0.25)]' : 'bg-[#2B2D31]/60 hover:bg-[#2B2D31] border border-[rgba(255,255,255,0.04)]'}`}
            >
              {activeMetric === 'value' && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#5865F2]" />}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#949BA4] group-hover:text-[#F2F3F5] transition-colors">Current Value</span>
                {history.length > 1 && oldestSnapVal && oldestSnapVal > 0 && (
                  <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-[4px] flex items-center gap-0.5 ${pctChange >= 0 ? 'bg-[#43b581]/20 text-[#43b581] border border-[#43b581]/30' : 'bg-[#ed4245]/20 text-[#ed4245] border border-[#ed4245]/30'}`}>
                    {pctChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {pctChange >= 0 ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`}
                  </span>
                )}
              </div>
              <span className="text-[17px] font-black font-mono text-[#F2F3F5] mt-1.5 truncate">
                {currentUnit.value === "owner" || currentUnit.valueDisplay === "Owner's Choice" ? "Owner's Choice" : currentUnit.valueDisplay || (currentUnit.value as number).toLocaleString()}
              </span>
            </div>

            <div 
              onClick={() => setActiveMetric('rarity')}
              className={`rounded-[16px] p-4 flex flex-col justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${activeMetric === 'rarity' ? 'bg-[#2B2D31] ring-2 ring-[#4DB6AC] shadow-[0_8px_20px_rgba(77,182,172,0.25)]' : 'bg-[#2B2D31]/60 hover:bg-[#2B2D31] border border-[rgba(255,255,255,0.04)]'}`}
            >
              {activeMetric === 'rarity' && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#4DB6AC]" />}
              <span className="text-[10px] font-black uppercase tracking-widest text-[#949BA4] group-hover:text-[#F2F3F5] transition-colors">Rarity (0-20)</span>
              <span className="text-[17px] font-black font-mono text-[#4DB6AC] mt-1.5">{latestSnap?.rarity ?? currentUnit.rarity ?? 0}</span>
            </div>

            <div 
              onClick={() => setActiveMetric('supply')}
              className={`rounded-[16px] p-4 flex flex-col justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${activeMetric === 'supply' ? 'bg-[#2B2D31] ring-2 ring-[#81C784] shadow-[0_8px_20px_rgba(129,199,132,0.25)]' : 'bg-[#2B2D31]/60 hover:bg-[#2B2D31] border border-[rgba(255,255,255,0.04)]'}`}
            >
              {activeMetric === 'supply' && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#81C784]" />}
              <span className="text-[10px] font-black uppercase tracking-widest text-[#949BA4] group-hover:text-[#F2F3F5] transition-colors">Supply (1-5)</span>
              <span className="text-[17px] font-black font-mono text-[#81C784] mt-1.5">{latestSnap?.supply ?? currentUnit.supply ?? 0}</span>
            </div>

            <div 
              onClick={() => setActiveMetric('demand')}
              className={`rounded-[16px] p-4 flex flex-col justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${activeMetric === 'demand' ? 'bg-[#2B2D31] ring-2 ring-[#FFB74D] shadow-[0_8px_20px_rgba(255,183,77,0.25)]' : 'bg-[#2B2D31]/60 hover:bg-[#2B2D31] border border-[rgba(255,255,255,0.04)]'}`}
            >
              {activeMetric === 'demand' && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#FFB74D]" />}
              <span className="text-[10px] font-black uppercase tracking-widest text-[#949BA4] group-hover:text-[#F2F3F5] transition-colors">Demand (1-5)</span>
              <span className="text-[17px] font-black font-mono text-[#FFB74D] mt-1.5">{latestSnap?.demand ?? currentUnit.demand ?? 0}</span>
            </div>
          </div>

          {/* Notice & Tag Badges */}
          {(currentUnit.notice || (currentUnit.secondaryTags && currentUnit.secondaryTags.length > 0)) && (
            <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] rounded-[16px] p-4.5 flex flex-col gap-3 shadow-inner">
              {currentUnit.notice && (
                <div className="flex items-start gap-3">
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-[6px] bg-[#5865F2] text-white shadow-sm flex-shrink-0">
                    <AlertCircle className="w-3 h-3" /> Notice
                  </span>
                  <p className="text-[12.5px] font-medium text-[#DBDEE1] leading-relaxed pt-0.5">{currentUnit.notice}</p>
                </div>
              )}
              {currentUnit.secondaryTags && currentUnit.secondaryTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[rgba(255,255,255,0.04)] mt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#949BA4]">Market Tags:</span>
                  {currentUnit.secondaryTags.map(tag => (
                    <span key={tag} className="text-[10px] font-black uppercase px-2.5 py-1 rounded-[6px] bg-[#111214] text-[#F2F3F5] border border-[rgba(255,255,255,0.08)] shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="h-56 flex flex-col items-center justify-center text-[#949BA4] animate-pulse gap-3 font-medium text-sm">
              <Sparkles className="w-6 h-6 animate-spin text-[#5865F2]" />
              Syncing historical snapshots...
            </div>
          ) : error ? (
            <div className="text-[#ed4245] text-sm text-center py-8 bg-[#2B2D31] rounded-[16px]">Failed to load history: {error}</div>
          ) : history.length <= 1 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] rounded-[20px] shadow-lg">
              <TrendingUp className="w-12 h-12 text-[#949BA4] mb-3 opacity-60 animate-bounce" />
              <p className="text-[#F2F3F5] font-black text-[16px]">Fire Zio is looking...</p>
              <p className="text-[#949BA4] text-[12.5px] mt-1.5 max-w-sm px-4 leading-relaxed">Baseline snapshot recorded for {currentUnit.name}. Interactive trend charts and change logs will appear dynamically upon future value updates.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Sleek Gradient Trend Chart with Peak and Trough Markers */}
              <div className="bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] p-5 rounded-[20px] flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-[#F2F3F5] text-[13.5px] font-black uppercase tracking-wider flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" style={{ color: currentConfig.color }} /> {currentConfig.label}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#949BA4]">
                      <span className="w-2 h-2 rounded-full bg-[#43b581] inline-block" /> Peak
                      <span className="w-2 h-2 rounded-full bg-[#ed4245] inline-block ml-1" /> Low
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#111214] text-[#949BA4] font-mono border border-[rgba(255,255,255,0.06)]">
                      {history.length} Snapshots Logged
                    </span>
                  </div>
                </div>
                
                <div className="h-[240px] w-full bg-[#18191C]/60 p-3 rounded-[14px] border border-[rgba(255,255,255,0.04)]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id={currentConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={currentConfig.color} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={currentConfig.color} stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="date" stroke="#949BA4" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#949BA4" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => activeMetric === 'value' && v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={45} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111214', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.7)', padding: '10px 14px' }}
                        labelStyle={{ color: '#949BA4', fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}
                        formatter={(value: any, name: any, props: any) => [props.payload.label, currentConfig.unitLabel]}
                      />
                      <Area type="monotone" dataKey="value" stroke={currentConfig.color} strokeWidth={3} fillOpacity={1} fill={`url(#${currentConfig.gradientId})`} dot={<CustomizedDot />} activeDot={{ r: 7, fill: currentConfig.color, stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Discord Embed Style Change Log Timeline */}
              <div className="flex flex-col gap-3">
                <h3 className="text-[#949BA4] text-[12px] font-black uppercase tracking-widest flex items-center gap-2 px-1">
                  <History className="w-4 h-4 text-[#5865F2]" /> Audit Change Log ({timeline.length})
                </h3>
                
                <div className="flex flex-col gap-3.5">
                  {timeline.length === 0 ? (
                    <p className="text-[#949BA4] text-[12px] italic py-3 text-center bg-[#2B2D31]/40 rounded-[14px]">No historical attribute shifts logged between snapshots yet.</p>
                  ) : (
                    timeline.map((t, idx) => {
                      const currCfg = GRID_STATUS_CFG[t.snap.status as keyof typeof GRID_STATUS_CFG];
                      const prevCfg = GRID_STATUS_CFG[t.prev.status as keyof typeof GRID_STATUS_CFG];
                      return (
                        <div key={idx} className="bg-[#2B2D31] border border-[rgba(255,255,255,0.06)] rounded-[16px] p-4.5 flex flex-col gap-3.5 shadow-md hover:border-[rgba(255,255,255,0.12)] transition-colors">
                          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
                            <span className="text-[#DBDEE1] text-[11.5px] font-mono font-black">{t.date}</span>
                            <div className="flex gap-1.5 flex-wrap">
                              {t.changed.map((c: string) => (
                                <span key={c} className="text-[9.5px] font-black bg-[#111214] text-[#F2F3F5] px-2.5 py-0.5 rounded-[6px] border border-[rgba(255,255,255,0.08)] uppercase tracking-wider shadow-sm">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            {t.changed.includes("Value") && (
                              <div className="flex items-center justify-between bg-[#18191C]/50 px-3.5 py-2.5 rounded-[10px] border border-[rgba(255,255,255,0.03)]">
                                <span className="text-[12px] text-[#949BA4] font-bold">Value Shift</span>
                                <div className="flex items-center gap-3 font-mono text-[13.5px] font-black">
                                  <span className="text-[#949BA4] line-through decoration-[#ed4245]">{t.prev.value_display || t.prev.value}</span>
                                  <span className="text-[#5865F2]">➔</span>
                                  <span className="text-[#F2F3F5]">{t.snap.value_display || t.snap.value}</span>
                                </div>
                              </div>
                            )}

                            {t.changed.includes("Status") && (
                              <div className="flex items-center justify-between bg-[#18191C]/50 px-3.5 py-2.5 rounded-[10px] border border-[rgba(255,255,255,0.03)]">
                                <span className="text-[12px] text-[#949BA4] font-bold">Status Badge</span>
                                <div className="flex items-center gap-3 text-[11.5px] font-bold">
                                  <span className="px-2.5 py-0.5 rounded-[6px] border shadow-sm" style={{ backgroundColor: prevCfg?.bg || '#2B2D31', color: prevCfg?.color || '#949BA4', borderColor: prevCfg?.border || 'rgba(255,255,255,0.1)' }}>
                                    {prevCfg?.label || t.prev.status}
                                  </span>
                                  <span className="text-[#5865F2]">➔</span>
                                  <span className="px-2.5 py-0.5 rounded-[6px] border shadow-sm" style={{ backgroundColor: currCfg?.bg || '#2B2D31', color: currCfg?.color || '#F2F3F5', borderColor: currCfg?.border || 'rgba(255,255,255,0.1)' }}>
                                    {currCfg?.label || t.snap.status}
                                  </span>
                                </div>
                              </div>
                            )}

                            {(t.changed.includes("Rarity") || t.changed.includes("Supply") || t.changed.includes("Demand")) && (
                              <div className="flex items-center justify-between bg-[#18191C]/50 px-3.5 py-2.5 rounded-[10px] border border-[rgba(255,255,255,0.03)] text-[12px]">
                                <span className="text-[#949BA4] font-bold">Attributes Shift</span>
                                <div className="flex gap-4 font-mono text-[11.5px] font-bold text-[#DBDEE1]">
                                  {t.prev.rarity !== t.snap.rarity && <span>R: <span className="text-[#949BA4]">{t.prev.rarity}</span> ➔ <span className="text-[#4DB6AC]">{t.snap.rarity}</span></span>}
                                  {t.prev.supply !== t.snap.supply && <span>S: <span className="text-[#949BA4]">{t.prev.supply}</span> ➔ <span className="text-[#81C784]">{t.snap.supply}</span></span>}
                                  {t.prev.demand !== t.snap.demand && <span>D: <span className="text-[#949BA4]">{t.prev.demand}</span> ➔ <span className="text-[#FFB74D]">{t.snap.demand}</span></span>}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}