"use client";
import { create } from "zustand";
import { authClient } from "./auth-client";

// ponytail: tiny global store just for the auth-gate modal open state + pending action
type GateState = {
  open: boolean;
  pending: (() => void) | null;
  setOpen: (o: boolean) => void;
  setPending: (f: (() => void) | null) => void;
};

export const useGate = create<GateState>((set) => ({
  open: false,
  pending: null,
  setOpen: (open) => set({ open }),
  setPending: (pending) => set({ pending }),
}));

export function useRequireAuth() {
  const { data } = authClient.useSession();
  const setOpen = useGate((s) => s.setOpen);
  const setPending = useGate((s) => s.setPending);

  function requireAuth(fn: () => void) {
    if (data?.user) fn();
    else {
      setPending(() => fn);
      setOpen(true);
    }
  }

  return { requireAuth, isAuthed: !!data?.user };
}
