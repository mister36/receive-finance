import create from "zustand";

const useAuthStore = create((set) => ({
  jwtToken: "",
  wallet: null,
  hasWallet: false,
  businessName: "",
  updateJwtToken: (token) => set({ jwtToken: token }),
  updateWallet: (wallet) => set({ wallet, hasWallet: true }),
  updateWalletStatus: () => set({ hasWallet: true }),
  updateBusinessName: (businessName) => set({ businessName }),
}));

export { useAuthStore };
