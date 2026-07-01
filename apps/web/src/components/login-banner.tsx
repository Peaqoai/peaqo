"use client";

import { useState } from "react";
import { XIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useGate } from "@/lib/use-require-auth";

// Top banner shown on every app page while the user is logged out.
export function LoginBanner() {
  const { data: session, isPending } = authClient.useSession();
  const setOpen = useGate((s) => s.setOpen);
  const [dismissed, setDismissed] = useState(false);

  if (isPending || session?.user || dismissed) return null;

  return (
    <div className="brand-gradient flex shrink-0 items-center justify-center gap-3 px-4 py-2 text-sm text-white">
      <span>Sign in to save your chats, personas and avatars.</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-white/20 px-3 py-0.5 font-medium hover:bg-white/30"
      >
        Sign in
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="ml-1 opacity-80 hover:opacity-100"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
