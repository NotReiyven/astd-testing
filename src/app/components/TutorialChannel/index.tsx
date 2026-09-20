import { LayoutGrid, Target, BookOpen, Search } from "lucide-react";
import { GuideType } from "../guides/AquaGuideOverlay";

import { SandboxTab } from "./SandboxTab";
import { SimulatorTab } from "./SimulatorTab";
import { TheoryTab } from "./TheoryTab";
import { DictionaryTab } from "./DictionaryTab";

export function TutorialChannel({
  startGuide,
  completedGuides,
  activeTab,
  setActiveTab
}: {
  startGuide: (type: GuideType) => void;
  completedGuides: Record<string, boolean>;
  activeTab: "sandbox" | "simulator" | "theory" | "dictionary";
  setActiveTab: (tab: "sandbox" | "simulator" | "theory" | "dictionary") => void;
}) {

  return (
    <div className={`flex-1 flex flex-col overflow-hidden bg-background h-full select-none`}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--card); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      `}</style>

      {/* Navigation tabs */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-border bg-card relative z-40">
        <div 
          className="flex bg-popover rounded-[6px] p-1 border border-border w-full overflow-x-auto hide-scrollbar shadow-inner"
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
        >
          <button onClick={() => setActiveTab("sandbox")} className={`flex items-center gap-1.5 px-5 py-1.5 rounded-[4px] text-[12px] font-bold transition-all whitespace-nowrap ${activeTab === "sandbox" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutGrid className="w-3.5 h-3.5" /> Academy Checklist
          </button>
          <button onClick={() => setActiveTab("simulator")} className={`flex items-center gap-1.5 px-5 py-1.5 rounded-[4px] text-[12px] font-bold transition-all whitespace-nowrap ${activeTab === "simulator" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Target className="w-3.5 h-3.5" /> Mock Trades
          </button>
          <button onClick={() => setActiveTab("theory")} className={`flex items-center gap-1.5 px-5 py-1.5 rounded-[4px] text-[12px] font-bold transition-all whitespace-nowrap ${activeTab === "theory" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <BookOpen className="w-3.5 h-3.5" /> Market Theory
          </button>
          <button onClick={() => setActiveTab("dictionary")} className={`flex items-center gap-1.5 px-5 py-1.5 rounded-[4px] text-[12px] font-bold transition-all whitespace-nowrap ${activeTab === "dictionary" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <Search className="w-3.5 h-3.5" /> Live Parser Demo
          </button>
        </div>
      </div>

      {/* Tab viewport */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 relative z-10">
        {activeTab === "sandbox" && (
            <SandboxTab 
                startGuide={startGuide}
                completedGuides={completedGuides}
            />
        )}

        {activeTab === "simulator" && (
            <SimulatorTab />
        )}

        {activeTab === "theory" && (
            <TheoryTab />
        )}

        {activeTab === "dictionary" && (
            <DictionaryTab />
        )}
      </div>
    </div>
  );
}