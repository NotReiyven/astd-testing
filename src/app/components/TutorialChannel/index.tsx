import React from "react";
import {
  GiChecklist,
  GiCrossedSwords,
  GiOpenBook,
  GiFairyWand,
} from "react-icons/gi";
import { GuideType } from "../guides/AquaGuideOverlay";
import { triggerHaptic } from "../../../data/helpers";

import { SandboxTab } from "./SandboxTab";
import { SimulatorTab } from "./SimulatorTab";
import { TheoryTab } from "./TheoryTab";
import { DictionaryTab } from "./DictionaryTab";

export function TutorialChannel({
  startGuide,
  completedGuides,
  activeTab,
  setActiveTab,
}: {
  startGuide: (type: GuideType, force?: boolean) => void;
  completedGuides: Record<string, boolean>;
  activeTab: "sandbox" | "simulator" | "theory" | "dictionary";
  setActiveTab: (
    tab: "sandbox" | "simulator" | "theory" | "dictionary"
  ) => void;
}) {
  const handleTabClick = (
    tab: "sandbox" | "simulator" | "theory" | "dictionary"
  ) => {
    triggerHaptic("light");
    setActiveTab(tab);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full select-none font-sans relative bg-background text-foreground">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      `}</style>

      {/* Navigation tabs */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-border bg-card relative z-40 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex bg-input rounded-[4px] p-1 border border-border overflow-x-auto hide-scrollbar shadow-inner"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => handleTabClick("sandbox")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[3px] text-[12px] font-bold transition-[transform,background-color,color,box-shadow] duration-150 whitespace-nowrap active:scale-95 focus-visible:outline-none cursor-pointer ${
              activeTab === "sandbox"
                ? "bg-foreground text-background shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
            }`}
          >
            <GiChecklist className="w-3.5 h-3.5" /> Academy Checklist
          </button>
          <button
            type="button"
            onClick={() => handleTabClick("simulator")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[3px] text-[12px] font-bold transition-[transform,background-color,color,box-shadow] duration-150 whitespace-nowrap active:scale-95 focus-visible:outline-none cursor-pointer ${
              activeTab === "simulator"
                ? "bg-foreground text-background shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
            }`}
          >
            <GiCrossedSwords className="w-3.5 h-3.5" /> Mock Trades
          </button>
          <button
            type="button"
            onClick={() => handleTabClick("theory")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[3px] text-[12px] font-bold transition-[transform,background-color,color,box-shadow] duration-150 whitespace-nowrap active:scale-95 focus-visible:outline-none cursor-pointer ${
              activeTab === "theory"
                ? "bg-foreground text-background shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
            }`}
          >
            <GiOpenBook className="w-3.5 h-3.5" /> Market Guide
          </button>
          <button
            type="button"
            onClick={() => handleTabClick("dictionary")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[3px] text-[12px] font-bold transition-[transform,background-color,color,box-shadow] duration-150 whitespace-nowrap active:scale-95 focus-visible:outline-none cursor-pointer ${
              activeTab === "dictionary"
                ? "bg-foreground text-background shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border"
            }`}
          >
            <GiFairyWand className="w-3.5 h-3.5" /> Custom Slang
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("light");
            startGuide("guest_tour", true);
          }}
          className="px-3 py-1.5 rounded-[6px] bg-popover hover:bg-muted border border-border text-foreground text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
        >
          Replay Aqua Tour
        </button>
      </div>

      {/* Tab viewport */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 relative z-10 bg-transparent">
        {activeTab === "sandbox" && (
          <SandboxTab completedGuides={completedGuides} />
        )}

        {activeTab === "simulator" && <SimulatorTab />}

        {activeTab === "theory" && <TheoryTab />}

        {activeTab === "dictionary" && <DictionaryTab />}
      </div>
    </div>
  );
}
