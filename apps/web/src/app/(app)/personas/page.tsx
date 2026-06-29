"use client";

// Persona chat — pick a reply-style preset for the normal /chat, or make your
// own. Personas are global (admin) + your private ones.
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { CharacterManager, type CharItem, type CharValues } from "@/components/character-manager";

export default function PersonasPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const list = trpc.persona.list.useQuery();
  const modelsQ = trpc.models.listEnabled.useQuery();
  const models = (modelsQ.data ?? []).map((m) => ({ id: m.modelId, name: m.displayName }));

  const create = trpc.persona.create.useMutation();
  const update = trpc.persona.update.useMutation();
  const remove = trpc.persona.remove.useMutation({
    onSuccess: () => utils.persona.list.invalidate(),
  });

  async function onSave(v: CharValues, id?: string) {
    if (id) await update.mutateAsync({ id, ...v });
    else await create.mutateAsync(v);
    utils.persona.list.invalidate();
  }
  // don't create a conversation yet — open /chat carrying the persona; it's
  // persisted only once the user sends their first message
  function onStartChat(it: CharItem) {
    router.push(`/chat?persona=${it._id}`);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <CharacterManager
          kind="persona"
          title="Persona"
          subtitle="Pick a persona to style how the assistant replies — or create your own."
          items={(list.data ?? []) as CharItem[]}
          models={models}
          isLoading={list.isLoading}
          canManage={(it) => it.scope === "private"}
          onSave={onSave}
          onDelete={(id) => remove.mutate({ id })}
          onStartChat={onStartChat}
        />
      </div>
    </div>
  );
}
