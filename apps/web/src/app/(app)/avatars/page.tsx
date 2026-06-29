"use client";

// Avatar chat — set up a person (an avatar) and talk *to* them; they reply
// fully in character. Avatars are global (admin) + your private ones.
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { CharacterManager, type CharItem, type CharValues } from "@/components/character-manager";

export default function AvatarsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const list = trpc.character.list.useQuery();
  const modelsQ = trpc.models.listEnabled.useQuery();
  const models = (modelsQ.data ?? []).map((m) => ({ id: m.modelId, name: m.displayName }));

  const create = trpc.character.create.useMutation();
  const update = trpc.character.update.useMutation();
  const remove = trpc.character.remove.useMutation({
    onSuccess: () => utils.character.list.invalidate(),
  });
  const createConv = trpc.conversation.create.useMutation();

  async function onSave(v: CharValues, id?: string) {
    if (id) await update.mutateAsync({ id, ...v });
    else await create.mutateAsync(v);
    utils.character.list.invalidate();
  }
  async function onStartChat(it: CharItem) {
    const r = await createConv.mutateAsync({ characterId: it._id });
    utils.conversation.list.invalidate();
    router.push(`/chat/${r.id}`);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <CharacterManager
          kind="character"
          title="Avatar chat"
          subtitle="Talk to a character who stays fully in role — or create your own."
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
