"use client";

// Admin management of GLOBAL personas / avatars as a TanStack DataTable with
// search + model filter, matching the Users admin page. `kind` picks the trpc
// namespace.
import { useMemo, useState } from "react";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { DataTable } from "@/components/data-table";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";
import {
  CharacterFormDialog,
  avatarSwatch,
  type CharItem,
  type CharValues,
} from "@/components/character-form-dialog";

const selectCls = "border-border bg-background rounded-md border px-2 py-1.5 text-sm";

export function AdminCharacters({ kind }: { kind: "persona" | "character" }) {
  const utils = trpc.useUtils();
  // both namespaces share the same CRUD shape; cast to one concrete type so the
  // mutation inputs don't widen to an awkward union (extra fields are stripped
  // server-side anyway)
  const api = (kind === "persona" ? trpc.admin.personas : trpc.admin.characters) as typeof trpc.admin.characters;
  const inval = () =>
    kind === "persona"
      ? utils.admin.personas.list.invalidate()
      : utils.admin.characters.list.invalidate();

  const list = api.list.useQuery();
  const modelsQ = trpc.models.listEnabled.useQuery();
  const models = useMemo(
    () => (modelsQ.data ?? []).map((m) => ({ id: m.modelId, name: m.displayName })),
    [modelsQ.data],
  );
  const modelName = (id: string) => models.find((m) => m.id === id)?.name ?? id;

  const create = api.create.useMutation();
  const update = api.update.useMutation();
  const remove = api.remove.useMutation({
    onSuccess: () => {
      inval();
      toast.success("Deleted");
    },
  });

  const [search, setSearch] = useState("");
  const [model, setModel] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  // the dialog and the row it's editing open/close together
  const [dialog, setDialog] = useState<{ open: boolean; editing: CharItem | null }>({
    open: false,
    editing: null,
  });

  // client-side filter + paginate (the global list is small)
  const all = (list.data ?? []) as CharItem[];
  const filtered = all.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchesQ =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.tagline ?? "").toLowerCase().includes(q);
    return matchesQ && (!model || c.defaultModelId === model);
  });
  const pageRows = filtered.slice(
    pagination.pageIndex * pagination.pageSize,
    pagination.pageIndex * pagination.pageSize + pagination.pageSize,
  );

  function onFilter(setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    };
  }

  async function onSave(v: CharValues, id?: string) {
    if (id) await update.mutateAsync({ id, ...v });
    else await create.mutateAsync(v);
    inval();
  }

  const noun = kind === "persona" ? "persona" : "avatar";

  const columns = useMemo<ColumnDef<CharItem, unknown>[]>(
    () => [
      {
        header: kind === "persona" ? "Persona" : "Avatar",
        cell: ({ row }) => {
          const it = row.original;
          return (
            <div className="flex items-center gap-2.5">
              {avatarSwatch(it)}
              <div className="min-w-0">
                <div className="font-medium">{it.name}</div>
                {it.tagline && (
                  <div className="text-muted-foreground truncate text-xs">{it.tagline}</div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        header: "Tone",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.original.tone || "—"}</span>
        ),
      },
      {
        header: "Traits",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.traits?.length ? row.original.traits.join(", ") : "—"}
          </span>
        ),
      },
      {
        header: "Model",
        cell: ({ row }) => <span className="text-sm">{modelName(row.original.defaultModelId)}</span>,
      },
      {
        header: "",
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1.5">
            <Button
              size="icon"
              variant="outline"
              aria-label="Edit"
              onClick={() => setDialog({ open: true, editing: row.original })}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Delete"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ id: row.original._id })}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    // modelName depends on models; remove for delete state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, models, remove],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight capitalize">{noun}s</h1>
          <p className="text-muted-foreground text-sm">
            {kind === "persona"
              ? "Global reply-style presets available to every user."
              : "Global characters every user can chat with."}
          </p>
        </div>
        <Button onClick={() => setDialog({ open: true, editing: null })}>
          <Plus className="size-4" /> New {noun}
        </Button>
      </div>

      <CharacterFormDialog
        kind={kind}
        models={models}
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
        editing={dialog.editing}
        onSave={onSave}
      />

      <DataTable
        columns={columns}
        data={pageRows}
        total={filtered.length}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={list.isLoading}
        toolbar={
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder={`Search ${noun}s…`}
              value={search}
              onChange={(e) => onFilter(setSearch)(e.target.value)}
              className="max-w-xs"
            />
            <select
              className={selectCls}
              value={model}
              onChange={(e) => onFilter(setModel)(e.target.value)}
            >
              <option value="">All models</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        }
      />
    </div>
  );
}
