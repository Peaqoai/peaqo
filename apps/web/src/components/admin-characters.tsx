"use client";

// Admin management of GLOBAL personas / avatars. Shared between the two admin
// pages — `kind` picks the trpc namespace.
import { trpc } from "@/lib/trpc/client";
import { CharacterManager, type CharItem, type CharValues } from "@/components/character-manager";

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
  const models = (modelsQ.data ?? []).map((m) => ({ id: m.modelId, name: m.displayName }));

  const create = api.create.useMutation();
  const update = api.update.useMutation();
  const remove = api.remove.useMutation({ onSuccess: inval });

  async function onSave(v: CharValues, id?: string) {
    if (id) await update.mutateAsync({ id, ...v });
    else await create.mutateAsync(v);
    inval();
  }

  return (
    <CharacterManager
      kind={kind}
      title={kind === "persona" ? "Personas" : "Avatars"}
      subtitle={
        kind === "persona"
          ? "Global reply-style presets available to every user."
          : "Global characters every user can chat with."
      }
      items={(list.data ?? []) as CharItem[]}
      models={models}
      isLoading={list.isLoading}
      canManage={() => true}
      onSave={onSave}
      onDelete={(id) => remove.mutate({ id })}
    />
  );
}
