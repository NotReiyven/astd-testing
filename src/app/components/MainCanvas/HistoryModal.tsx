// ================================================
// FILE: src/app/components/MainCanvas/HistoryModal.tsx
// ================================================

import { useState, useEffect, useRef } from "react";
import { X, TrendingUp, History, BarChart2, Sparkles, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, ReferenceLine } from 'recharts';
import { useHistoryModalStore } from "../../../store/useHistoryModalStore";
import { useUnitHistory, HistorySnapshot } from "../../../hooks/useUnitHistory";
import { useUnits } from "../../../context/UnitContext";
import { GRID_STATUS_CFG, TIER_CONFIG, getProxyImage, getTier, handleImageError } from "../../../data";
import { getAvatarStyle, getInitials } from "../TradeAnalyzer/summaryUtils";
import { StatusIcon } from "./UnitGrid";
import { triggerHaptic } from "../../../data/helpers";

export function HistoryModal() {
  const { isOpen, unitId, closeModal } = useHistoryModalStore();
  const { history, loading, error } = useUnitHistory(unitId);
  const { units } = useUnits();

  const [activeMetric, setActiveMetric] = useState<'value' | 'rarity' | 'liquidity'>('value');
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        triggerHaptic('light');
        closeModal();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      setActiveMetric('value');
      setIsScrolled(false);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } else {
      document.body.style.overflow = "auto";
    }

    return () => { 
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeModal]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 10);
  };

  if (!isOpen || !unitId) return null;

  const currentUnit = units.find(u => u.id === unitId);
  if (!currentUnit) return null;

  const tierKey = getTier(currentUnit);
  const tierCfg = TIER_CONFIG[tierKey] || { badgeColor: "#5865F2", label: tierKey };
  const proxyUrl = getProxyImage(currentUnit.id, currentUnit.imageUrl);

  const displayHistory = [...history];
  if (!loading && !error) {
    const latestDbSnap = history[history.length - 1];
    const currentValNum = typeof currentUnit.value === 'number' ? currentUnit.value : currentUnit.valueMin || 0;
    
    const isLiveDifferent = !latestDbSnap || (
      (latestDbSnap.value_type === 'range' ? latestDbSnap.value_min : latestDbSnap.value) !== currentValNum ||
      latestDbSnap.status !== currentUnit.status ||
      latestDbSnap.rarity !== currentUnit.rarity ||
      (latestDbSnap.liquidity || 'Average') !== (currentUnit.liquidity || 'Average')
    );

    if (isLiveDifferent) {
      displayHistory.push({
        id: "live-now",
        unit_id: currentUnit.id,
        recorded_at: new Date().toISOString(),
        value: typeof currentUnit.value === 'number' ? currentUnit.value : null,
        value_type: typeof currentUnit.value === 'number' ? 'number' : currentUnit.value,
        value_display: currentUnit.valueDisplay,
        value_min: currentUnit.valueMin,
        status: currentUnit.status,
        rarity: currentUnit.rarity,
        liquidity: currentUnit.liquidity,
        notice: currentUnit.notice
      } as HistorySnapshot);
    }
  }

  const latestSnap: HistorySnapshot | undefined = displayHistory[displayHistory.length - 1];

  const metricConfigs = {
    value: { label: "Value Trend History", color: "var(--primary)", gradientId: "valueGrad", unitLabel: "Value" },
    rarity: { label: "Rarity Trend History", color: "#4DB6AC", gradientId: "rarityGrad", unitLabel: "Rarity" },
    liquidity: { label: "Liquidity Trend History", color: "#81C784", gradientId: "liqGrad", unitLabel: "Liquidity" },
  };

  const currentConfig = metricConfigs[activeMetric];

  const chartData = displayHistory.map(snap => {
    const dateObj = new Date(snap.recorded_at);
    const isToday = new Date().toDateString() === dateObj.toDateString();

    const dateStr = isToday 
      ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

    const fullDateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    let plotVal = 0;
    let label = "0";

    if (activeMetric === 'value') {
      if (snap.value_type === "owner") {
        label = "O/C";
      } else if (snap.value_type === "range" && snap.value_min) {
        plotVal = snap.value_min;
        label = snap.value_display || `${snap.value_min.toLocaleString()}`;
      } else {
        plotVal = snap.value || 0;
        label = plotVal.toLocaleString();
      }
    } else if (activeMetric === 'rarity') {
      plotVal = snap.rarity ?? 0;
      label = plotVal.toString();
    } else if (activeMetric === 'liquidity') {
      const liq = (snap.liquidity || 'average').toLowerCase();
      plotVal = liq === 'high' ? 3 : liq === 'low' ? 1 : 2;
      label = snap.liquidity || 'Average';
    }

    return { date: dateStr, fullDate: fullDateStr, value: plotVal, label, fullSnap: snap };
  }).filter(d => activeMetric !== 'value' || d.value > 0);

  const validChartData = chartData.filter(d => d.value > 0);
  const maxVal = validChartData.length > 0 ? Math.max(...validChartData.map(d => d.value)) : 0;
  const minVal = validChartData.length > 0 ? Math.min(...validChartData.map(d => d.value)) : 0;

  const oldestSnap = displayHistory[0];
  const oldestSnapVal = oldestSnap ? (oldestSnap.value_type === 'range' ? oldestSnap.value_min : oldestSnap.value) : null;
  const latestSnapVal = latestSnap ? (latestSnap.value_type === 'range' ? latestSnap.value_min : latestSnap.value) : null;
  const pctChange = (oldestSnapVal && latestSnapVal && oldestSnapVal > 0)
    ? ((latestSnapVal - oldestSnapVal) / oldestSnapVal) * 100
    : 0;

  const timeline: { snap: HistorySnapshot, prev: HistorySnapshot, date: string, changed: string[], chartX: string }[] = [];
  for (let i = displayHistory.length - 1; i > 0; i--) {
    const curr = displayHistory[i];
    const prev = displayHistory[i - 1];
    const changes = [];
    if (curr.value !== prev.value || curr.value_display !== prev.value_display) changes.push("Value");
    if (curr.status !== prev.status) changes.push("Status");
    if (curr.rarity !== prev.rarity) changes.push("Rarity");
    if ((curr.liquidity || 'Average') !== (prev.liquidity || 'Average')) changes.push("Liquidity");
    if (curr.notice !== prev.notice) changes.push("Notice");

    if (changes.length > 0) {
      const dateObj = new Date(curr.recorded_at);
      const isToday = new Date().toDateString() === dateObj.toDateString();
      const chartXStr = isToday 
        ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      timeline.push({ snap: curr, prev, date: dateObj.toLocaleString(), changed: changes, chartX: chartXStr });
    }
  }

  const statusCfg = GRID_STATUS_CFG[(latestSnap?.status || currentUnit.status) as keyof typeof GRID_STATUS_CFG];

  const CustomizedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;

    const isMax = payload.value === maxVal && validChartData.length > 1;
    const isMin = payload.value === minVal && validChartData.length > 1 && minVal !== maxVal;

    if (isMax) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={5} fill="#23a559" stroke="#111214" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={10} fill="none" stroke="#23a559" strokeWidth={1} opacity={0.6} className="animate-ping" />
        </g>
      );
    }

    if (isMin) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={5} fill="var(--rose-400)" stroke="#111214" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={10} fill="none" stroke="var(--rose-400)" strokeWidth={1} opacity={0.6} />
        </g>
      );
    }

    return <circle cx={cx} cy={cy} r={3} fill="var(--popover)" stroke={currentConfig.color} strokeWidth={1.5} />;
  };

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-0 sm:p-5 animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => { triggerHaptic('light'); closeModal(); }} />

      <div className="bg-card border border-border rounded-none sm:rounded-[12px] w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[94vh] flex flex-col relative shadow-2xl overflow-hidden animate-slide-up">

        <div className="absolute top-0 left-0 right-0 h-[4px] z-[200]" style={{ background: tierCfg.badgeColor }} />

        <div className={`px-5 sm:px-6 pt-6 pb-4 shrink-0 z-[100] bg-popover transition-all duration-300 ${isScrolled ? 'border-b border-border shadow-sm' : 'border-b border-transparent'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="relative shrink-0">
                <div 
                  className="relative overflow-hidden bg-black/20 flex items-center justify-center border border-border w-20 h-20 sm:w-24 sm:h-24 rounded-[8px]"
                >
                  <div className="absolute inset-0 flex items-center justify-center text-white font-black text-xl sm:text-2xl z-0" style={getAvatarStyle(currentUnit.name)}>
                    {getInitials(currentUnit.name)}
                  </div>
                  {proxyUrl && (
                    <img 
                      src={proxyUrl} 
                      alt={currentUnit.name} 
                      className="absolute inset-0 w-full h-full object-cover z-10 bg-black/20" 
                      onError={(e) => handleImageError(e, currentUnit.id)}
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col min-w-0 justify-center">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-foreground text-[20px] sm:text-[24px] font-black tracking-tight truncate">
                    {currentUnit.name}
                  </h2>
                  {statusCfg && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] border tracking-wider inline-flex items-center gap-1" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}>
                      <StatusIcon status={currentUnit.status} />
                      {statusCfg.label}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-muted-foreground text-[11px] sm:text-[12px] font-bold uppercase tracking-wider">{currentUnit.subtitle || "Official Unit"}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] bg-primary/10 text-primary border border-primary/20">
                    Tier {tierKey}
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => { triggerHaptic('light'); closeModal(); }} 
              className="text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 p-2 rounded-[6px] transition-colors focus-visible:outline-none shrink-0 self-start border border-border active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto custom-scrollbar relative bg-card/40"
        >
          <div className="p-5 sm:p-6 flex flex-col lg:flex-row gap-6 lg:gap-8">

            <div className="w-full lg:w-[300px] flex flex-col gap-3 shrink-0">
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => { triggerHaptic('light'); setActiveMetric('value'); }}
                  className={`col-span-2 rounded-[8px] p-4 flex flex-col justify-center cursor-pointer transition-all active:scale-[0.98] relative overflow-hidden group ${activeMetric === 'value' ? 'bg-card border border-primary' : 'bg-popover hover:bg-card border border-border'}`}
                >
                  {activeMetric === 'value' && <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Current Value</span>
                    {displayHistory.length > 1 && oldestSnapVal && oldestSnapVal > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[3px] flex items-center gap-0.5 ${pctChange >= 0 ? 'bg-[#23a559]/10 text-[#23a559]' : 'bg-rose-400/10 text-rose-400'}`}>
                        {pctChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {pctChange >= 0 ? `+${pctChange.toFixed(1)}%` : `${pctChange.toFixed(1)}%`}
                      </span>
                    )}
                  </div>
                  <span className="text-[18px] sm:text-[20px] font-black font-mono text-foreground mt-1.5 truncate">
                    {currentUnit.value === "owner" || currentUnit.valueDisplay === "Owner's Choice" ? "Owner's Choice" : currentUnit.valueDisplay || (currentUnit.value as number).toLocaleString()}
                  </span>
                </div>

                <div 
                  onClick={() => { triggerHaptic('light'); setActiveMetric('rarity'); }}
                  className={`rounded-[8px] p-4 flex flex-col justify-center cursor-pointer transition-all active:scale-[0.98] relative overflow-hidden group ${activeMetric === 'rarity' ? 'bg-card border border-[#4DB6AC]' : 'bg-popover hover:bg-card border border-border'}`}
                >
                  {activeMetric === 'rarity' && <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#4DB6AC]" />}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Rarity (0-20)</span>
                  <span className="text-[16px] font-black font-mono text-[#4DB6AC] mt-1.5">{latestSnap?.rarity ?? currentUnit.rarity ?? 0}</span>
                </div>

                <div 
                  onClick={() => { triggerHaptic('light'); setActiveMetric('liquidity'); }}
                  className={`rounded-[8px] p-4 flex flex-col justify-center cursor-pointer transition-all active:scale-[0.98] relative overflow-hidden group ${activeMetric === 'liquidity' ? 'bg-card border border-[#81C784]' : 'bg-popover hover:bg-card border border-border'}`}
                >
                  {activeMetric === 'liquidity' && <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#81C784]" />}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Liquidity</span>
                  <span className="text-[13px] font-black font-mono text-[#81C784] mt-1.5 uppercase">{latestSnap?.liquidity ?? currentUnit.liquidity ?? "Average"}</span>
                </div>
              </div>

              {(currentUnit.notice || (currentUnit.secondaryTags && currentUnit.secondaryTags.length > 0)) && (
                <div className="bg-popover border border-border rounded-[8px] p-4 flex flex-col gap-3">
                  {currentUnit.notice && (
                    <div className="flex flex-col gap-2">
                      <span className="flex w-fit items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[4px] bg-primary/20 text-primary border border-primary/30 shrink-0">
                        <AlertCircle className="w-3.5 h-3.5" /> Notice
                      </span>
                      <p className="text-[12px] font-medium text-foreground leading-relaxed">{currentUnit.notice}</p>
                    </div>
                  )}
                  {currentUnit.secondaryTags && currentUnit.secondaryTags.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-border mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Market Tags:</span>
                      <div className="flex flex-wrap gap-2">
                        {currentUnit.secondaryTags.map(tag => (
                          <span key={tag} className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] bg-black/20 text-foreground border border-border">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-6 min-w-0">

              {loading ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground animate-pulse gap-3 font-medium text-sm bg-popover rounded-[8px] border border-border">
                  <Sparkles className="w-6 h-6 animate-spin text-primary" />
                  Syncing historical snapshots...
                </div>
              ) : error ? (
                <div className="text-rose-400 text-sm text-center py-8 bg-popover rounded-[8px] border border-rose-400/20">Failed to load history: {error}</div>
              ) : displayHistory.length <= 1 ? (
                <div className="flex flex-col items-center justify-center h-[280px] text-center bg-popover border border-border rounded-[8px]">
                  <TrendingUp className="w-10 h-10 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-foreground font-bold text-[14px]">Tracking Initiated</p>
                  <p className="text-muted-foreground text-[12px] mt-1 max-w-sm px-6 leading-relaxed">Baseline snapshot recorded for {currentUnit.name}. Trend charts will generate as market shifts happen.</p>
                </div>
              ) : (
                <div className="bg-popover border border-border p-4 rounded-[8px] flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <h3 className="text-foreground text-[12px] font-bold uppercase tracking-wider flex items-center gap-2 shrink-0">
                      <BarChart2 className="w-4 h-4" style={{ color: currentConfig.color }} /> {currentConfig.label}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                        <span className="w-2 h-2 rounded-[2px] bg-[#23a559] inline-block" /> Peak
                        <span className="w-2 h-2 rounded-[2px] bg-rose-400 inline-block ml-1" /> Low
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-black/20 text-muted-foreground font-mono border border-border uppercase tracking-wider">
                        {displayHistory.length} Snapshots
                      </span>
                    </div>
                  </div>

                  <div className="h-[240px] sm:h-[260px] w-full bg-black/20 p-2 rounded-[6px] border border-border">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={currentConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={currentConfig.color} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={currentConfig.color} stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis 
                          stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} width={45} 
                          tickFormatter={(v) => activeMetric === 'liquidity' ? (v === 3 ? 'HIGH' : v === 2 ? 'AVG' : v === 1 ? 'LOW' : '') : (activeMetric === 'value' && v >= 1000 ? `${(v/1000).toFixed(0)}k` : v)}
                          domain={activeMetric === 'liquidity' ? [0, 4] : ['auto', 'auto']}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px' }}
                          labelStyle={{ color: 'var(--muted-foreground)', fontSize: '10px', marginBottom: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}
                          formatter={(value: any, name: any, props: any) => [props.payload.label, currentConfig.unitLabel]}
                          labelFormatter={(label, payload) => payload.length > 0 ? payload[0].payload.fullDate : label}
                        />
                        {timeline.map((t, idx) => {
                          const hasMajorShift = t.changed.includes("Rarity") || t.changed.includes("Liquidity") || t.changed.includes("Status");
                          if (!hasMajorShift) return null;
                          return (
                            <ReferenceLine 
                              key={`ref-${idx}`} 
                              x={t.chartX} 
                              stroke="rgba(255,255,255,0.15)" 
                              strokeDasharray="3 3" 
                            />
                          );
                        })}
                        <Area type="monotone" dataKey="value" stroke={currentConfig.color} strokeWidth={2} fillOpacity={1} fill={`url(#${currentConfig.gradientId})`} dot={<CustomizedDot />} activeDot={{ r: 6, fill: currentConfig.color, stroke: '#111214', strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {timeline.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-muted-foreground text-[12px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Audit Timeline
                  </h3>

                  <div className="relative pl-6 ml-2 border-l border-border flex flex-col gap-4 pb-4">
                    {timeline.map((t, idx) => {
                      const currCfg = GRID_STATUS_CFG[t.snap.status as keyof typeof GRID_STATUS_CFG];
                      const prevCfg = GRID_STATUS_CFG[t.prev.status as keyof typeof GRID_STATUS_CFG];

                      return (
                        <div key={idx} className="relative group">
                          <div className="absolute -left-[29px] top-1.5 w-2 h-2 bg-primary rounded-sm ring-4 ring-background" />

                          <div className="bg-popover border border-border rounded-[8px] p-4 flex flex-col gap-3 hover:border-muted-foreground transition-colors">
                            <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
                              <span className="text-muted-foreground text-[11px] font-mono font-bold uppercase tracking-wider">{t.date}</span>
                              <div className="flex gap-1.5 flex-wrap">
                                {t.changed.map((c: string) => (
                                  <span key={c} className="text-[9px] font-bold bg-black/20 text-foreground px-2 py-0.5 rounded-[4px] border border-border uppercase tracking-wider">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              {t.changed.includes("Value") && (
                                <div className="flex items-center justify-between bg-black/20 px-3 py-2 rounded-[6px] border border-border flex-wrap gap-2">
                                  <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Value Shift</span>
                                  <div className="flex items-center gap-3 font-mono text-[12px] font-bold">
                                    <span className="text-muted-foreground line-through decoration-rose-400">{t.prev.value_display || (t.prev.value ?? 0).toLocaleString()}</span>
                                    <span className="text-primary">➔</span>
                                    <span className="text-foreground">{t.snap.value_display || (t.snap.value ?? 0).toLocaleString()}</span>
                                  </div>
                                </div>
                              )}

                              {t.changed.includes("Status") && (
                                <div className="flex items-center justify-between bg-black/20 px-3 py-2 rounded-[6px] border border-border flex-wrap gap-2">
                                  <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Status Badge</span>
                                  <div className="flex items-center gap-3 text-[10px] font-bold tracking-wider">
                                    <span className="px-2 py-0.5 rounded-[4px] border uppercase inline-flex items-center gap-1" style={{ backgroundColor: prevCfg?.bg || 'var(--card)', color: prevCfg?.color || 'var(--muted-foreground)', borderColor: prevCfg?.border || 'var(--border)' }}>
                                      <StatusIcon status={t.prev.status} />
                                      {prevCfg?.label || t.prev.status}
                                    </span>
                                    <span className="text-primary">➔</span>
                                    <span className="px-2 py-0.5 rounded-[4px] border uppercase inline-flex items-center gap-1" style={{ backgroundColor: currCfg?.bg || 'var(--card)', color: currCfg?.color || 'var(--foreground)', borderColor: currCfg?.border || 'var(--border)' }}>
                                      <StatusIcon status={t.snap.status} />
                                      {currCfg?.label || t.snap.status}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {t.changed.includes("Rarity") && (
                                <div className="flex items-center justify-between bg-black/20 px-3 py-2 rounded-[6px] border border-border flex-wrap gap-2">
                                  <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Rarity Shift</span>
                                  <div className="flex gap-3 font-mono text-[11px] font-bold text-foreground">
                                    <span className="text-muted-foreground">{t.prev.rarity}</span> ➔ <span className="text-[#4DB6AC]">{t.snap.rarity}</span>
                                  </div>
                                </div>
                              )}

                              {t.changed.includes("Liquidity") && (
                                <div className="flex items-center justify-between bg-black/20 px-3 py-2 rounded-[6px] border border-border flex-wrap gap-2">
                                  <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Liquidity Shift</span>
                                  <div className="flex gap-3 font-mono text-[11px] font-bold text-foreground uppercase">
                                    <span className="text-muted-foreground">{t.prev.liquidity || 'Average'}</span> ➔ <span className="text-[#81C784]">{t.snap.liquidity || 'Average'}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}