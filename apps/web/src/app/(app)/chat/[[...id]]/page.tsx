"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import { useRequireAuth } from "@/lib/use-require-auth";
import { trpc } from "@/lib/trpc/client";
import { ModelPicker } from "@/components/model-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : undefined;
  const { isAuthed } = useRequireAuth();

  const conv = trpc.conversation.get.useQuery(
    { id: id! },
    { enabled: !!id && isAuthed },
  );

  if (id && isAuthed && conv.isLoading) {
    return <div className="text-muted-foreground grid h-full place-items-center text-sm">Loading…</div>;
  }

  const data = conv.data as
    | { modelId?: string; messages?: { role: string; content: string }[] }
    | null
    | undefined;
  const initialMessages: UIMessage[] =
    data?.messages?.map((m, i) => ({
      id: `${id}-${i}`,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    })) ?? [];

  return (
    <Thread
      key={id ?? "new"}
      initialId={id}
      initialModelId={data?.modelId ?? "gpt-4o"}
      initialMessages={initialMessages}
    />
  );
}

function Thread({
  initialId,
  initialModelId,
  initialMessages,
}: {
  initialId?: string;
  initialModelId: string;
  initialMessages: UIMessage[];
}) {
  const { requireAuth } = useRequireAuth();
  const utils = trpc.useUtils();
  const createConv = trpc.conversation.create.useMutation();
  const [convId, setConvId] = useState(initialId);
  const [modelId, setModelId] = useState(initialModelId);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => utils.conversation.list.invalidate(),
    onError: (err) =>
      toast.error(err.message.includes("402") ? "Out of credits" : "Chat failed"),
  });

  function onSend() {
    const text = input.trim();
    if (!text) return;
    requireAuth(async () => {
      let cid = convId;
      if (!cid) {
        const r = await createConv.mutateAsync({ modelId });
        cid = r.id;
        setConvId(cid);
        window.history.replaceState(null, "", `/chat/${cid}`);
        utils.conversation.list.invalidate();
      }
      sendMessage({ text }, { body: { modelId, conversationId: cid } });
      setInput("");
    });
  }

  const composer = (
    <div className="bg-muted/60 focus-within:ring-ring flex items-end gap-2 rounded-2xl border p-2 focus-within:ring-1">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSend()}
        placeholder="Ask anything…"
        className="border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      <ModelPicker value={modelId} onChange={setModelId} />
      <Button onClick={onSend} disabled={status === "streaming"} size="sm">
        Send
      </Button>
    </div>
  );

  if (messages.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4">
        <h1 className="mb-8 text-2xl font-semibold">What&rsquo;s on the agenda today?</h1>
        <div className="w-full">{composer}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-4">
      <div className="flex-1 space-y-6 overflow-y-auto py-6">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "bg-primary text-primary-foreground max-w-[80%] rounded-2xl px-4 py-2 text-sm"
                  : "bg-muted max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap"
              }
            >
              {m.parts.map((p) => ("text" in p ? p.text : "")).join("")}
            </div>
          </div>
        ))}
      </div>
      <div className="pb-4">{composer}</div>
    </div>
  );
}
