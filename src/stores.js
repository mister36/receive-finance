import create from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      jwtToken: "",
      mnemonic: "",
      hasWallet: false,
      businessName: "",
      updateJwtToken: (token) => set({ jwtToken: token }),
      updateWallet: (mnemonic) => set({ mnemonic }),
      updateWalletStatus: () => set({ hasWallet: true }),
      updateBusinessName: (businessName) => set({ businessName }),
    }),
    {
      name: "auth-storage",
      getStorage: () => sessionStorage,
    }
  )
);
// const useAuthStore = create((set) => ({
//   jwtToken: "",
//   wallet: null,
//   hasWallet: false,
//   businessName: "",
//   updateJwtToken: (token) => set({ jwtToken: token }),
//   updateWallet: (wallet) => set({ wallet, hasWallet: true }),
//   updateWalletStatus: () => set({ hasWallet: true }),
//   updateBusinessName: (businessName) => set({ businessName }),
// }));

export { useAuthStore };
