"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PROVIDERS = ["openai", "anthropic", "google", "groq", "openrouter", "cloudflare"] as const;
type ProviderT = (typeof PROVIDERS)[number];
const selectCls = "border-border bg-background rounded-md border px-2 py-1 text-sm";

export default function AdminGatewaysPage() {
  const utils = trpc.useUtils();
  const gateways = trpc.admin.gateways.list.useQuery();

  const createGateway = trpc.admin.gateways.create.useMutation({
    onSuccess: () => {
      utils.admin.gateways.list.invalidate();
      toast.success("Gateway added");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteGateway = trpc.admin.gateways.delete.useMutation({
    onSuccess: () => utils.admin.gateways.list.invalidate(),
  });
  const toggleModel = trpc.admin.models.toggleModel.useMutation({
    onSuccess: () => {
      utils.admin.models.listPaginated.invalidate();
      toast.success("Model enabled");
    },
  });

  const [gwName, setGwName] = useState("");
  const [gwUrl, setGwUrl] = useState("");
  const [provider, setProvider] = useState<ProviderT>("openai");
  const [gatewayId, setGatewayId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const fetched = trpc.admin.models.listFromProvider.useQuery(
    { provider, apiKey },
    { enabled: false },
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gateways</h1>
        <p className="text-muted-foreground text-sm">
          Manage Cloudflare AI Gateways and import models from providers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gateways</CardTitle>
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
            <Input placeholder="Name" value={gwName} onChange={(e) => setGwName(e.target.value)} />
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
          <CardTitle>Import models from provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">Provider</Label>
              <select className={selectCls} value={provider} onChange={(e) => setProvider(e.target.value as ProviderT)}>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Gateway</Label>
              <select className={selectCls} value={gatewayId} onChange={(e) => setGatewayId(e.target.value)}>
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
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </div>
            <Button onClick={() => fetched.refetch()} disabled={!apiKey || fetched.isFetching}>
              {fetched.isFetching ? "Fetching…" : "Fetch"}
            </Button>
          </div>

          {fetched.error && <p className="text-destructive text-sm">{fetched.error.message}</p>}

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {fetched.data?.map((m) => (
              <div key={m.modelId} className="flex items-center justify-between border-b py-1 text-sm">
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
    </div>
  );
}
