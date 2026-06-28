"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export default function Home() {
  const health = trpc.health.useQuery({ name: "peaqo" });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground text-sm">
        tRPC says: {health.data?.hello ?? "…"}
      </p>
      <Button>Hi</Button>
    </main>
  );
}
