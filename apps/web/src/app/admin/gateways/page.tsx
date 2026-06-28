"use client";

import { useMemo, useState } from "react";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Gateway = { _id: string; name: string; url: string; hasKey: boolean };

export default function AdminGatewaysPage() {
  const gateways = trpc.admin.gateways.list.useQuery();
  const all = (gateways.data ?? []) as unknown as Gateway[];

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo<ColumnDef<Gateway, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "url",
        header: "URL",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.url}</span>
        ),
      },
      {
        id: "key",
        header: "Key",
        cell: ({ row }) => (
          <Badge variant={row.original.hasKey ? "secondary" : "outline"}>
            {row.original.hasKey ? "Set" : "None"}
          </Badge>
        ),
      },
    ],
    [],
  );

  const page = all.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gateways</h1>
        <p className="text-muted-foreground text-sm">
          Gateways are configured in code; their API keys come from env. Import
          their models below.
        </p>
      </div>

      <DataTable<Gateway>
        columns={columns}
        data={page}
        total={all.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={gateways.isLoading}
      />

      <ImportCard gateways={all} />
    </div>
  );
}

function ImportCard({ gateways }: { gateways: Gateway[] }) {
  const utils = trpc.useUtils();
  const selectCls =
    "border-border bg-background h-9 rounded-md border px-2 text-sm";
  const [gatewayId, setGatewayId] = useState("");
  const [search, setSearch] = useState("");

  const models = trpc.admin.models.listFromGateway.useQuery(
    { gatewayId },
    { enabled: !!gatewayId, retry: false },
  );
  const toggleModel = trpc.admin.models.toggleModel.useMutation({
    onSuccess: () => {
      utils.admin.models.listPaginated.invalidate();
      toast.success("Model enabled");
    },
    onError: (e) => toast.error(e.message),
  });
  const importAll = trpc.admin.models.importFromGateway.useMutation({
    onSuccess: (r) => {
      utils.admin.models.listPaginated.invalidate();
      toast.success(`Imported ${r.imported} new model(s) — disabled`);
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (models.data ?? []).filter((m) =>
    m.modelId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import models from a gateway</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label className="text-xs">Gateway</Label>
            <select
              className={selectCls}
              value={gatewayId}
              onChange={(e) => setGatewayId(e.target.value)}
            >
              <option value="">Select gateway…</option>
              {gateways.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid flex-1 gap-1">
            <Label className="text-xs">Search</Label>
            <Input
              placeholder="Filter models…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!models.data}
            />
          </div>
          <Button
            variant="secondary"
            disabled={!gatewayId || importAll.isPending}
            onClick={() => importAll.mutate({ gatewayId })}
          >
            {importAll.isPending ? "Importing…" : "Import all"}
          </Button>
        </div>

        {models.isFetching && (
          <p className="text-muted-foreground text-sm">Loading models…</p>
        )}
        {models.error && (
          <p className="text-destructive text-sm">{models.error.message}</p>
        )}

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {filtered.map((m) => (
            <div
              key={m.modelId}
              className="flex items-center justify-between border-b py-1 text-sm"
            >
              <span className="flex items-center gap-2">
                {m.modelId}
                <Badge variant="secondary" className="capitalize">
                  {m.provider}
                </Badge>
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!gatewayId}
                onClick={() =>
                  toggleModel.mutate({
                    provider: m.provider as never,
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
  );
}
