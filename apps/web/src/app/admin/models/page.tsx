"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "groq",
  "openrouter",
  "cloudflare",
] as const;
type ProviderT = (typeof PROVIDERS)[number];

export default function AdminModelsPage() {
  const router = useRouter();
  const me = trpc.user.getMe.useQuery();

  useEffect(() => {
    if (me.data && me.data.role !== "admin") router.replace("/app/chat");
  }, [me.data, router]);

  const utils = trpc.useUtils();
  const gateways = trpc.admin.gateways.list.useQuery(undefined, {
    enabled: me.data?.role === "admin",
  });
  const configured = trpc.admin.models.listConfigured.useQuery(undefined, {
    enabled: me.data?.role === "admin",
  });

  const createGateway = trpc.admin.gateways.create.useMutation({
    onSuccess: () => utils.admin.gateways.list.invalidate(),
  });
  const deleteGateway = trpc.admin.gateways.delete.useMutation({
    onSuccess: () => utils.admin.gateways.list.invalidate(),
  });
  const toggleModel = trpc.admin.models.toggleModel.useMutation({
    onSuccess: () => utils.admin.models.listConfigured.invalidate(),
  });
  const setMultiplier = trpc.admin.models.setMultiplier.useMutation({
    onSuccess: () => utils.admin.models.listConfigured.invalidate(),
  });

  // gateway form
  const [gwName, setGwName] = useState("");
  const [gwUrl, setGwUrl] = useState("");

  // model fetch form
  const [provider, setProvider] = useState<ProviderT>("openai");
  const [gatewayId, setGatewayId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const fetched = trpc.admin.models.listFromProvider.useQuery(
    { provider, apiKey },
    { enabled: false },
  );

  if (me.isLoading) return <main className="p-8">Loading…</main>;
  if (me.data?.role !== "admin") return <main className="p-8">Forbidden</main>;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Model administration</h1>

      <Card>
        <CardHeader>
          <CardTitle>Cloudflare AI Gateways</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {gateways.data?.map((g) => (
            <div key={String(g._id)} className="flex items-center justify-between">
              <span className="text-sm">
                {g.name} — <span className="text-muted-foreground">{g.url}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteGateway.mutate({ id: String(g._id) })}
              >
                Delete
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              placeholder="Name"
              value={gwName}
              onChange={(e) => setGwName(e.target.value)}
            />
            <Input
              placeholder="https://gateway.ai.cloudflare.com/..."
              value={gwUrl}
              onChange={(e) => setGwUrl(e.target.value)}
            />
            <Button
              onClick={() => {
                createGateway.mutate({ name: gwName, url: gwUrl });
                setGwName("");
                setGwUrl("");
              }}
              disabled={!gwName || !gwUrl}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fetch models from provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">Provider</Label>
              <select
                className="border-border bg-background rounded-md border px-2 py-1 text-sm"
                value={provider}
                onChange={(e) => setProvider(e.target.value as ProviderT)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Gateway</Label>
              <select
                className="border-border bg-background rounded-md border px-2 py-1 text-sm"
                value={gatewayId}
                onChange={(e) => setGatewayId(e.target.value)}
              >
                <option value="">Select gateway…</option>
                {gateways.data?.map((g) => (
                  <option key={String(g._id)} value={String(g._id)}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid flex-1 gap-1">
              <Label className="text-xs">Provider API key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => fetched.refetch()}
                disabled={!apiKey || fetched.isFetching}
              >
                {fetched.isFetching ? "Fetching…" : "Fetch"}
              </Button>
            </div>
          </div>

          {fetched.error && (
            <p className="text-destructive text-sm">{fetched.error.message}</p>
          )}

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {fetched.data?.map((m) => (
              <div
                key={m.modelId}
                className="flex items-center justify-between border-b py-1 text-sm"
              >
                <span>{m.modelId}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!gatewayId}
                  onClick={() =>
                    toggleModel.mutate({
                      provider,
                      gatewayId,
                      modelId: m.modelId,
                      displayName: m.modelId,
                      enabled: true,
                    })
                  }
                >
                  Enable
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured models</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {configured.data?.length === 0 && (
            <p className="text-muted-foreground text-sm">None yet.</p>
          )}
          {configured.data?.map((m) => (
            <div
              key={String(m._id)}
              className="flex items-center justify-between gap-2 border-b py-1 text-sm"
            >
              <span>
                {m.displayName}{" "}
                <span className="text-muted-foreground">({m.provider})</span>
              </span>
              <div className="flex items-center gap-2">
                <Label className="text-xs">×</Label>
                <Input
                  type="number"
                  step="0.1"
                  className="w-20"
                  defaultValue={m.creditMultiplier}
                  onBlur={(e) =>
                    setMultiplier.mutate({
                      modelId: m.modelId,
                      creditMultiplier: Number(e.target.value),
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    toggleModel.mutate({
                      provider: m.provider,
                      gatewayId: String(m.gatewayId),
                      modelId: m.modelId,
                      displayName: m.displayName,
                      enabled: !m.enabled,
                    })
                  }
                >
                  {m.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
