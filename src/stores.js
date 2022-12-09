import create from "zustand";

const useAuthStore = create((set) => ({
  wallet: null,
  hasWallet: false,
  businessName: "",
  updateWallet: (wallet) => set({ wallet, hasWallet: true }),
  updateWalletStatus: () => set({ hasWallet: true }),
  updateBusinessName: (businessName) => set({ businessName }),
}));

export { useAuthStore };
