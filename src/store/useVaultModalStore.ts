import { create } from "zustand";
import { TradeCard } from "../types";

interface VaultModalState {
  isOpen: boolean;
  vaultItems: TradeCard[];
  traderName: string;
  openModal: (traderName: string, items: TradeCard[]) => void;
  closeModal: () => void;
}

export const useVaultModalStore = create<VaultModalState>((set) => ({
  isOpen: false,
  vaultItems: [],
  traderName: "",
  openModal: (traderName, items) =>
    set({ isOpen: true, traderName, vaultItems: items }),
  closeModal: () => set({ isOpen: false, vaultItems: [], traderName: "" }),
}));
