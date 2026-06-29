"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { getModel } from "@repo/trpc/models";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";

export default function ChatHistoryPage() {
  const [search, setSearch] = useState("");

  const query = trpc.conversation.listPaged.useInfiniteQuery(
    { search },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialCursor: 0,
    },
  );

  const chats = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-5xl shrink-0 space-y-4 px-8 pt-6 pb-4">
        <div>
          <h1 className="font-(family-name:--font-brand) text-3xl font-semibold tracking-tight">
            All chats
          </h1>
          <p className="text-muted-foreground text-sm">
            Search and browse your conversation history.
          </p>
        </div>

        <Input
          placeholder="Search chats…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="max-w-md"
        />
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 overflow-y-auto px-8 pb-6">
      <div className="divide-border/60 divide-y">
        {chats.map((c) => {
          const model = getModel(c.modelId);
          return (
            <Link
              key={String(c._id)}
              href={`/chat/${c._id}`}
              className="hover:bg-accent group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors"
            >
              <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-medium">
                    {c.title || "New chat"}
                  </span>
                  <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {c.preview && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {c.preview}
                  </p>
                )}
                <div className="text-muted-foreground/70 mt-1 flex gap-2 text-[11px]">
                  <span>{model?.displayName ?? c.modelId}</span>
                  <span>·</span>
                  <span>
                    {c.messageCount} message{c.messageCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {!query.isLoading && chats.length === 0 && (
          <p className="text-muted-foreground py-12 text-center text-sm">
            {search ? "No chats match your search." : "No chats yet."}
          </p>
        )}
      </div>

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
