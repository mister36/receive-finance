import create from "zustand";

const useAuthStore = create((set) => ({
  wallet: null,
  hasWallet: false,
  updateWallet: (wallet) => set({ wallet, hasWallet: true }),
  updateWalletStatus: () => set({ hasWallet: true }),
}));

export { useAuthStore };
