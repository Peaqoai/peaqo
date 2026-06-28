"use client";

import Link from "next/link";
import { MessageSquare, Sparkles, CreditCard } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const me = trpc.user.getMe.useQuery(undefined, { enabled: !!session?.user });
  const list = trpc.conversation.list.useQuery(undefined, {
    enabled: !!session?.user,
  });

  const u = me.data;
  const used = u?.creditsUsed ?? 0;
  const limit = u?.creditsLimit ?? 0;
  const remaining = Math.max(limit - used, 0);
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
  const chats = list.data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back{u?.name ? `, ${u.name}` : ""}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
            <Sparkles className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            {me.isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold capitalize">{u?.plan}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits left</CardTitle>
            <CreditCard className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent className="space-y-2">
            {me.isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{remaining}</div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div className="bg-primary h-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-muted-foreground text-xs">
                  {used} / {limit} used
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chats</CardTitle>
            <MessageSquare className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-2xl font-bold">{chats.length}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent chats</CardTitle>
          <CardDescription>Your latest conversations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {list.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))
          ) : chats.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No chats yet.
            </p>
          ) : (
            chats.slice(0, 8).map((c) => (
              <Link
                key={String(c._id)}
                href={`/chat/${c._id}`}
                className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-2 text-sm"
              >
                <MessageSquare className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate">{c.title || "New chat"}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
