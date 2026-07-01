"use client";

import { useParams, useRouter } from "next/navigation";
import { Rocket as RocketIcon, Columns3 as Columns3Icon, Plus as PlusIcon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { SuperFiestaView } from "@/components/super-fiesta-view";
import { MultiChatView } from "@/components/multi-chat-view";
import type { SuperSession, SuperTurn } from "@/components/model-chat";

// Shared shell for the two Super AI routes, nested under /chat like avatars:
// Super Fiesta at /chat/super-ai (+ /chat/super-ai/<id>); Multi Chat at
// /chat/multi (+ /chat/multi/<id>).
export function SuperPage({ mode }: { mode: "super-fiesta" | "multi-chat" }) {
  const router = useRouter();
  const params = useParams();
  const seg = Array.isArray(params.id) ? params.id : params.id ? [params.id] : [];
  const id = seg[0];
  const isMulti = mode === "multi-chat";
  const base = isMulti ? "/chat/multi" : "/chat/super-ai";

  const saved = trpc.conversation.get.useQuery({ id: id! }, { enabled: !!id });
  const doc = id ? (saved.data as Record<string, unknown> | undefined) : undefined;

  const session: SuperSession =
    id && doc
      ? {
          id,
          models: (doc.superModels as { modelId: string; enabled: boolean }[]) ?? [],
          turns: (doc.turns as SuperTurn[]) ?? [],
        }
      : null;

  const savedTitle = doc?.title as string | undefined;
  const title = savedTitle && savedTitle !== "New chat" ? savedTitle : isMulti ? "Multi Chat" : "Super AI";

  if (id && saved.isLoading) {
    return <div className="text-muted-foreground p-6 text-sm">Loading…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {isMulti ? (
            <Columns3Icon className="text-primary size-4 shrink-0" />
          ) : (
            <RocketIcon className="text-primary size-4 shrink-0" />
          )}
          <span className="truncate">{title}</span>
        </div>
        <button
          type="button"
          onClick={() => router.push(base)}
          className="hover:bg-accent flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium"
        >
          <PlusIcon className="size-4" /> New chat
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {/* key by id so switching sessions (or New chat) remounts fresh state */}
        {isMulti ? (
          <MultiChatView key={id ?? "new"} session={session} />
        ) : (
          <SuperFiestaView key={id ?? "new"} session={session} />
        )}
      </div>
    </div>
  );
}
