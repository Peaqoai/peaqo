"use client";

import { useSearchParams } from "next/navigation";
import { Rocket as RocketIcon, Columns3 as Columns3Icon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { SuperFiestaView } from "@/components/super-fiesta-view";
import { MultiChatView } from "@/components/multi-chat-view";
import type { SuperSession, SuperTurn } from "@/components/model-chat";

// mode is driven by the sidebar (?mode=super-fiesta | multi-chat); an optional
// ?id= loads a saved, resumable session.
export default function SuperAiPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? undefined;
  const saved = trpc.conversation.get.useQuery({ id: id! }, { enabled: !!id });

  // when resuming, the stored doc dictates the mode; otherwise use the URL
  const doc = id ? (saved.data as Record<string, unknown> | undefined) : undefined;
  const mode =
    (doc?.mode as string | undefined) ??
    (params.get("mode") === "multi-chat" ? "multi-chat" : "super-fiesta");
  const isMulti = mode === "multi-chat";

  const session: SuperSession =
    id && doc
      ? {
          id,
          models: (doc.superModels as { modelId: string; enabled: boolean }[]) ?? [],
          turns: (doc.turns as SuperTurn[]) ?? [],
        }
      : null;

  if (id && saved.isLoading) {
    return <div className="text-muted-foreground p-6 text-sm">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
        {isMulti ? (
          <Columns3Icon className="text-primary size-4" />
        ) : (
          <RocketIcon className="text-primary size-4" />
        )}
        {isMulti ? "Multi Chat" : "Super AI"}
      </div>
      <div className="min-h-0 flex-1">
        {/* key by session id so switching sessions remounts fresh state */}
        {isMulti ? (
          <MultiChatView key={id ?? "new"} session={session} />
        ) : (
          <SuperFiestaView key={id ?? "new"} session={session} />
        )}
      </div>
    </div>
  );
}
