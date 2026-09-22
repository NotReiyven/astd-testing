// ================================================
// FILE: src/store/useExternalLinkStore.ts
// ================================================

import { create } from 'zustand';

interface ExternalLinkState {
  isOpen: boolean;
  targetUrl: string;
  openModal: (url: string) => void;
  closeModal: () => void;
}

export const useExternalLinkStore = create<ExternalLinkState>((set) => ({
  isOpen: false,
  targetUrl: "",
  openModal: (url) => set({ isOpen: true, targetUrl: url }),
  closeModal: () => set({ isOpen: false, targetUrl: "" }),
}));

// Global helper to trigger the warning modal from anywhere
export const safeOpenExternal = (url: string) => {
  if (!url) return;
  
  try {
    const parsed = new URL(url);
    const trustedDomains = ['localhost', window.location.hostname];
    
    // If it's an internal link, open directly without warning
    if (trustedDomains.includes(parsed.hostname)) {
      window.open(url, '_blank');
      return;
    }

    // Check if user previously trusted this specific domain
    const trustedCache = JSON.parse(localStorage.getItem('astd_trusted_domains') || '{}');
    if (trustedCache[parsed.hostname]) {
      window.open(url, '_blank');
      return;
    }
  } catch (e) {
    // Fallback if URL parsing fails
  }

  // Otherwise, trigger the modal warning
  useExternalLinkStore.getState().openModal(url);
};