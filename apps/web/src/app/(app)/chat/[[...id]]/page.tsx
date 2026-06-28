"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import { useRequireAuth } from "@/lib/use-require-auth";
import { trpc } from "@/lib/trpc/client";
import { config } from "@repo/trpc/config";
import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
    Message,
    MessageContent,
    MessageResponse,
} from "@/components/ai-elements/message";
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
    Tool,
    ToolContent,
    ToolHeader,
    ToolInput,
    ToolOutput,
} from "@/components/ai-elements/tool";
import {
    Attachment,
    AttachmentPreview,
    AttachmentRemove,
    Attachments,
} from "@/components/ai-elements/attachments";
import { PaperclipIcon, GlobeIcon } from "lucide-react";
import {
    PromptInput,
    PromptInputBody,
    PromptInputButton,
    PromptInputFooter,
    PromptInputHeader,
    type PromptInputMessage,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { ChatModelSelector } from "@/components/chat-model-selector";
import { Shimmer } from "@/components/ai-elements/shimmer";

function AttachButton() {
  const attachments = usePromptInputAttachments();
  return (
    <PromptInputButton tooltip="Attach files" onClick={() => attachments.openFileDialog()}>
      <PaperclipIcon size={16} />
    </PromptInputButton>
  );
}

function AttachmentsDisplay() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) return null;
  return (
    <Attachments variant="inline">
      {attachments.files.map((file) => (
        <Attachment data={file} key={file.id} onRemove={() => attachments.remove(file.id)}>
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

export default function ChatPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : undefined;
  const { isAuthed } = useRequireAuth();

  const conv = trpc.conversation.get.useQuery({ id: id! }, { enabled: !!id && isAuthed });

  if (id && isAuthed && conv.isLoading) {
    return (
      <div className="text-muted-foreground grid h-full place-items-center text-sm">
        Loading…
      </div>
    );
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
      initialModelId={data?.modelId ?? config.defaultModelId}
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
  const [text, setText] = useState("");
  const [webSearch, setWebSearch] = useState(false);

  const modelsQuery = trpc.models.listEnabled.useQuery();
  const models =
    modelsQuery.data && modelsQuery.data.length > 0
      ? modelsQuery.data.map((m) => ({
          id: m.modelId,
          name: m.displayName,
          provider: m.provider,
        }))
      : [config.fallbackModel];

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => utils.conversation.list.invalidate(),
    onError: (err) =>
      toast.error(err.message.includes("402") ? "Out of credits" : "Chat failed"),
  });

  function handleSubmit(message: PromptInputMessage) {
    const hasText = Boolean(message.text);
    const hasFiles = Boolean(message.files?.length);
    if (!hasText && !hasFiles) return;
    requireAuth(async () => {
      let cid = convId;
      if (!cid) {
        const r = await createConv.mutateAsync({ modelId });
        cid = r.id;
        setConvId(cid);
        window.history.replaceState(null, "", `/chat/${cid}`);
        utils.conversation.list.invalidate();
      }
      sendMessage(
        { text: message.text || "Sent with attachments", files: message.files },
        { body: { modelId, conversationId: cid, webSearch } },
      );
      setText("");
    });
  }

  const promptInput = (
    <PromptInput onSubmit={handleSubmit} globalDrop multiple accept="image/*">
      <PromptInputHeader>
        <AttachmentsDisplay />
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask anything…"
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <AttachButton />
          <PromptInputButton
            tooltip={{ content: "Search the web", shortcut: "⌘K" }}
            variant={webSearch ? "default" : "ghost"}
            onClick={() => setWebSearch((v) => !v)}
          >
            <GlobeIcon size={16} />
            <span>Search</span>
          </PromptInputButton>
          <ChatModelSelector value={modelId} onChange={setModelId} models={models} />
        </PromptInputTools>
        <PromptInputSubmit disabled={!text && status !== "streaming"} status={status} />
      </PromptInputFooter>
    </PromptInput>
  );

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            What&rsquo;s on the agenda today?
          </h1>
          <p className="text-muted-foreground">
            Ask anything across GPT, Claude, Gemini and more — attach files or search the web.
          </p>
        </div>
        <div className="w-full max-w-2xl">{promptInput}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-2xl">
          {messages.map((m) => (
            <Message from={m.role} key={m.id}>
              <MessageContent>
                {m.parts.map((part, i) => {
                  const key = `${m.id}-${i}`;
                  if (part.type === "text")
                    return <MessageResponse key={key}>{part.text}</MessageResponse>;
                  if (part.type === "reasoning")
                    return (
                      <Reasoning key={key} isStreaming={part.state === "streaming"}>
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  if (part.type === "file" && part.mediaType?.startsWith("image/"))
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={key}
                        src={part.url}
                        alt={part.filename ?? "attachment"}
                        className="max-w-xs rounded-lg"
                      />
                    );
                  if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                    const tp = part as {
                      type: string;
                      state: "input-streaming" | "input-available" | "output-available" | "output-error";
                      input?: unknown;
                      output?: unknown;
                      errorText?: string;
                    };
                    return (
                      <Tool key={key}>
                        <ToolHeader type={tp.type as `tool-${string}`} state={tp.state} />
                        <ToolContent>
                          <ToolInput input={tp.input} />
                          <ToolOutput output={tp.output} errorText={tp.errorText} />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-2xl px-4 pb-4">{promptInput}</div>
    </div>
  );
}
