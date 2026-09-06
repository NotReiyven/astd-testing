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
    <div className={`flex-1 flex flex-col overflow-hidden bg-[#313338] h-full select-none`}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #2B2D31; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1A1B1E; border-radius: 3px; }
      `}</style>

      {/* Navigation tabs */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-[rgba(255,255,255,0.04)] bg-[#2B2D31] relative z-40">
        <div 
          className="flex bg-[#1E1F22] rounded-[6px] p-1 border border-[rgba(255,255,255,0.04)] w-full overflow-x-auto hide-scrollbar"
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
        >
          <button onClick={() => setActiveTab("sandbox")} className={`flex items-center gap-1.5 px-5 py-1.5 rounded-[4px] text-[12px] font-bold transition-all whitespace-nowrap ${activeTab === "sandbox" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}>
            <LayoutGrid className="w-3.5 h-3.5" /> Academy Checklist
          </button>
          <button onClick={() => setActiveTab("simulator")} className={`flex items-center gap-1.5 px-5 py-1.5 rounded-[4px] text-[12px] font-bold transition-all whitespace-nowrap ${activeTab === "simulator" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}>
            <Target className="w-3.5 h-3.5" /> Mock Trades
          </button>
          <button onClick={() => setActiveTab("theory")} className={`flex items-center gap-1.5 px-5 py-1.5 rounded-[4px] text-[12px] font-bold transition-all whitespace-nowrap ${activeTab === "theory" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}>
            <BookOpen className="w-3.5 h-3.5" /> Market Theory
          </button>
          <button onClick={() => setActiveTab("dictionary")} className={`flex items-center gap-1.5 px-5 py-1.5 rounded-[4px] text-[12px] font-bold transition-all whitespace-nowrap ${activeTab === "dictionary" ? "bg-[#5865F2] text-white shadow-sm" : "text-[#949BA4] hover:text-[#DBDEE1]"}`}>
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