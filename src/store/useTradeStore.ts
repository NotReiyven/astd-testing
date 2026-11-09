import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TradeCard } from "../types";

export interface TradePreset {
  id: string;
  name: string;
  give: TradeCard[];
  get: TradeCard[];
}

export interface AnalyzerSettings {
  showSummaryMetrics: boolean;
  showStFlip: boolean;
  showLtHold: boolean;
  showRarity: boolean;
  showLiquidity: boolean;
  collapseUnitsByDefault: boolean;
  showTradeNotices: boolean;
  showMomentumSummary: boolean;
  showGiveNotices: boolean;
  showGetNotices: boolean;
  showTermsInTrade: boolean;
  enableMarkdownCopy: boolean;
}

export const DEFAULT_ANALYZER_SETTINGS: AnalyzerSettings = {
  showSummaryMetrics: true,
  showStFlip: true,
  showLtHold: true,
  showRarity: true,
  showLiquidity: true,
  collapseUnitsByDefault: false,
  showTradeNotices: true,
  showMomentumSummary: true,
  showGiveNotices: true,
  showGetNotices: true,
  showTermsInTrade: true,
  enableMarkdownCopy: true,
};

export interface TradeJournalEntry {
  id: string;
  timestamp: string;
  give: TradeCard[];
  get: TradeCard[];
  valueDiff: number;
  outcome: "pending" | "win" | "fair" | "loss";
}

interface TradeState {
  giveItems: TradeCard[];
  getItems: TradeCard[];
  pinnedIds: string[];
  isComposerOpen: boolean;
  composerMode: "standard" | "lf_offers" | "inventory";
  presets: TradePreset[];
  analyzerSettings: AnalyzerSettings;
  
  tradeJournal: TradeJournalEntry[];
  journalPublic: boolean;

  addCard: (col: "give" | "get", card: TradeCard) => void;
  changeQty: (col: "give" | "get", id: string, qty: number) => void;
  removeCard: (col: "give" | "get", id: string) => void;
  clearSection: (col: "give" | "get") => void;
  clearAllUnpinned: () => { give: TradeCard[]; get: TradeCard[] };
  swap: () => void;
  overwrite: (giveCards: TradeCard[], getCards: TradeCard[]) => void;
  togglePin: (col: "give" | "get", id: string) => void;
  setComposerOpen: (
    isOpen: boolean,
    mode?: "standard" | "lf_offers" | "inventory"
  ) => void;
  updateAnalyzerSettings: (patch: Partial<AnalyzerSettings>) => void;
  reorderCards: (col: "give" | "get", newCards: TradeCard[]) => void;

  savePreset: (name: string) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
  restorePreset: (preset: TradePreset, index: number) => void;
  loadPreset: (id: string) => void;

  logTrade: (valueDiff: number) => void;
  updateJournalOutcome: (id: string, outcome: TradeJournalEntry["outcome"]) => void;
  toggleJournalPrivacy: () => void;
}

export const useTradeStore = create<TradeState>()(
  persist(
    (set, get) => ({
      giveItems: [],
      getItems: [],
      pinnedIds: [],
      isComposerOpen: false,
      composerMode: "standard",
      presets: [],
      analyzerSettings: DEFAULT_ANALYZER_SETTINGS,
      tradeJournal: [],
      journalPublic: false,

      setComposerOpen: (isOpen, mode = "standard") =>
        set({ isComposerOpen: isOpen, composerMode: mode }),

      updateAnalyzerSettings: (patch) =>
        set((state) => ({
          analyzerSettings: {
            ...DEFAULT_ANALYZER_SETTINGS,
            ...state.analyzerSettings,
            ...patch,
          },
        })),

      reorderCards: (col, newCards) => {
        set(
          col === "give"
            ? { giveItems: newCards }
            : { getItems: newCards }
        );
      },

      addCard: (col, card) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("academy-give-get"));
        }
        set((state) => {
          const target = col === "give" ? state.giveItems : state.getItems;
          const existing = target.find((c) => c.id === card.id);
          const newTarget = existing
            ? target.map((c) =>
                c.id === card.id ? { ...c, qty: c.qty + 1 } : c
              )
            : [...target, { ...card, qty: 1 }];
          return col === "give"
            ? { giveItems: newTarget }
            : { getItems: newTarget };
        });
      },

      changeQty: (col, id, qty) =>
        set((state) => {
          const target = col === "give" ? state.giveItems : state.getItems;
          const newTarget = target.map((c) =>
            c.id === id ? { ...c, qty } : c
          );
          return col === "give"
            ? { giveItems: newTarget }
            : { getItems: newTarget };
        }),

      removeCard: (col, id) =>
        set((state) => {
          const target = col === "give" ? state.giveItems : state.getItems;
          const newTarget = target.filter((c) => c.id !== id);
          return col === "give"
            ? { giveItems: newTarget }
            : { getItems: newTarget };
        }),

      clearSection: (col) =>
        set((state) => {
          const target = col === "give" ? state.giveItems : state.getItems;
          const newTarget = target.filter((c) =>
            state.pinnedIds.includes(`${col}-${c.id}`)
          );
          return col === "give"
            ? { giveItems: newTarget }
            : { getItems: newTarget };
        }),

      clearAllUnpinned: () => {
        const state = get();
        const previousState = {
          give: [...state.giveItems],
          get: [...state.getItems],
        };
        set({
          giveItems: state.giveItems.filter((c) =>
            state.pinnedIds.includes(`give-${c.id}`)
          ),
          getItems: state.getItems.filter((c) =>
            state.pinnedIds.includes(`get-${c.id}`)
          ),
        });
        return previousState;
      },

      swap: () =>
        set((state) => ({
          giveItems: [...state.getItems],
          getItems: [...state.giveItems],
        })),

      overwrite: (giveCards, getCards) => {
        if (
          typeof window !== "undefined" &&
          (giveCards.length > 0 || getCards.length > 0)
        ) {
          window.dispatchEvent(new Event("academy-give-get"));
        }
        set({
          giveItems: giveCards,
          getItems: getCards,
        });
      },

      togglePin: (col, id) =>
        set((state) => {
          const pinKey = `${col}-${id}`;
          const isPinned = state.pinnedIds.includes(pinKey);
          if (!isPinned && typeof window !== "undefined") {
            window.dispatchEvent(new Event("academy-pinned"));
          }
          return {
            pinnedIds: isPinned
              ? state.pinnedIds.filter((p) => p !== pinKey)
              : [...state.pinnedIds, pinKey],
          };
        }),

      savePreset: (name) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("academy-saved-preset"));
        }
        set((state) => {
          const newPreset: TradePreset = {
            id: Date.now().toString(),
            name,
            give: [...state.giveItems],
            get: [...state.getItems],
          };
          return { presets: [newPreset, ...state.presets] };
        });
      },

      renamePreset: (id, name) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, name } : p
          ),
        })),

      deletePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        })),

      restorePreset: (preset, index) =>
        set((state) => {
          if (state.presets.some((p) => p.id === preset.id)) {
            return {};
          }
          const next = [...state.presets];
          const rawIdx = Number.isFinite(index) ? Math.trunc(index) : 0;
          const clampedIdx = Math.max(0, Math.min(rawIdx, next.length));
          next.splice(clampedIdx, 0, preset);
          return { presets: next };
        }),

      loadPreset: (id) =>
        set((state) => {
          const preset = state.presets.find((p) => p.id === id);
          if (!preset) return {};
          return { giveItems: [...preset.give], getItems: [...preset.get] };
        }),

      logTrade: (valueDiff) => {
        const state = get();
        if (state.giveItems.length === 0 && state.getItems.length === 0) return;
        
        const newEntry: TradeJournalEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          give: [...state.giveItems],
          get: [...state.getItems],
          valueDiff,
          outcome: "pending",
        };
        
        set({ tradeJournal: [newEntry, ...state.tradeJournal] });
        window.dispatchEvent(new Event("academy-trade-logged"));
      },

      updateJournalOutcome: (id, outcome) =>
        set((state) => ({
          tradeJournal: state.tradeJournal.map((t) =>
            t.id === id ? { ...t, outcome } : t
          ),
        })),

      toggleJournalPrivacy: () =>
        set((state) => ({ journalPublic: !state.journalPublic })),
    }),
    {
      name: "astd_trade_storage",
      version: 6,
      migrate: (persistedState: any, version: number) => {
        if (version < 3) {
          persistedState.giveItems = Array.isArray(persistedState.giveItems) ? persistedState.giveItems : [];
          persistedState.getItems = Array.isArray(persistedState.getItems) ? persistedState.getItems : [];
          persistedState.pinnedIds = Array.isArray(persistedState.pinnedIds) ? persistedState.pinnedIds : [];
          persistedState.isComposerOpen = false;
          persistedState.composerMode = "standard";
          persistedState.presets = Array.isArray(persistedState.presets) ? persistedState.presets : [];
        }
        if (version < 6) {
          persistedState.tradeJournal = [];
          persistedState.journalPublic = false;
        }
        persistedState.analyzerSettings = {
          ...DEFAULT_ANALYZER_SETTINGS,
          ...(persistedState.analyzerSettings || {}),
        };
        return persistedState as TradeState;
      },
    }
  )
);