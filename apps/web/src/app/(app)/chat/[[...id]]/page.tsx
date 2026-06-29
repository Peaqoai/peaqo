"use client";

import { useState, useRef } from "react";
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
    MessageAvatar,
    MessageContent,
    MessageResponse,
    MessageToolbar,
    MessageActions,
    MessageAction,
} from "@/components/ai-elements/message";
import { cn } from "@/lib/utils";
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
import {
    PaperclipIcon,
    GlobeIcon,
    BotIcon,
    CoinsIcon,
    ClockIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    CopyIcon,
    RefreshCwIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    GitBranchPlusIcon,
} from "lucide-react";
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

type ChatMeta = {
  model?: string;
  tokens?: number;
  credits?: number;
  durationMs?: number;
  feedback?: "up" | "down";
};

type StoredVariant = {
  content: string;
  model?: string;
  credits?: number;
  durationMs?: number;
};

type Variant = { parts: UIMessage["parts"]; metadata?: unknown };

const partsText = (parts: UIMessage["parts"]) =>
  parts.map((p) => ("text" in p ? p.text : "")).join("");

// branch-store variant <-> DB shape
function variantToStored(v: {
  parts: UIMessage["parts"];
  metadata?: unknown;
}): StoredVariant {
  const md = (v.metadata ?? {}) as ChatMeta;
  return {
    content: partsText(v.parts),
    model: md.model,
    credits: md.credits,
    durationMs: md.durationMs,
  };
}

function storedToVariant(v: StoredVariant) {
  return {
    parts: [{ type: "text" as const, text: v.content }],
    metadata: { model: v.model, credits: v.credits, durationMs: v.durationMs },
  };
}

// ponytail: feedback is local-only (toast). Add a tRPC mutation + DB field when
// you actually want to read these thumbs back somewhere.
function MessageMetaBar({
  meta,
  text,
  onRegenerate,
  onVote,
  branchCount = 0,
  branchIndex = 0,
  onBranch,
  onBranchChat,
}: {
  meta: ChatMeta;
  text: string;
  onRegenerate?: () => void;
  onVote?: (value: "up" | "down" | null) => void;
  branchCount?: number;
  branchIndex?: number;
  onBranch?: (active: number) => void;
  onBranchChat?: () => void;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(meta.feedback ?? null);
  const cast = (v: "up" | "down") => {
    const next = vote === v ? null : v; // click again to clear
    setVote(next);
    onVote?.(next);
  };
  return (
    <MessageToolbar>
      <MessageActions>
        {branchCount > 1 && (
          <div className="text-muted-foreground mr-1 flex items-center gap-0.5 text-xs">
            <MessageAction
              tooltip="Previous"
              disabled={branchIndex === 0}
              onClick={() => onBranch?.(branchIndex - 1)}
            >
              <ChevronLeftIcon size={14} />
            </MessageAction>
            <span className="tabular-nums">
              {branchIndex + 1}/{branchCount}
            </span>
            <MessageAction
              tooltip="Next"
              disabled={branchIndex === branchCount - 1}
              onClick={() => onBranch?.(branchIndex + 1)}
            >
              <ChevronRightIcon size={14} />
            </MessageAction>
          </div>
        )}
        <MessageAction
          tooltip="Copy"
          onClick={() => {
            navigator.clipboard.writeText(text);
            toast.success("Copied");
          }}
        >
          <CopyIcon size={14} />
        </MessageAction>
        {onRegenerate && (
          <MessageAction tooltip="Regenerate" onClick={onRegenerate}>
            <RefreshCwIcon size={14} />
          </MessageAction>
        )}
        {onBranchChat && (
          <MessageAction tooltip="Branch in new chat" onClick={onBranchChat}>
            <GitBranchPlusIcon size={14} />
          </MessageAction>
        )}
        <MessageAction
          tooltip="Good response"
          variant={vote === "up" ? "secondary" : "ghost"}
          onClick={() => cast("up")}
        >
          <ThumbsUpIcon size={14} fill={vote === "up" ? "currentColor" : "none"} />
        </MessageAction>
        <MessageAction
          tooltip="Bad response"
          variant={vote === "down" ? "secondary" : "ghost"}
          onClick={() => cast("down")}
        >
          <ThumbsDownIcon
            size={14}
            fill={vote === "down" ? "currentColor" : "none"}
          />
        </MessageAction>
      </MessageActions>
      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
        {meta.model && (
          <span className="flex items-center gap-1">
            <BotIcon size={13} /> {meta.model}
          </span>
        )}
        {meta.credits != null && (
          <span className="flex items-center gap-1">
            <CoinsIcon size={13} /> {meta.credits} credits
          </span>
        )}
        {meta.durationMs != null && (
          <span className="flex items-center gap-1">
            <ClockIcon size={13} /> {(meta.durationMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>
    </MessageToolbar>
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
    | {
        modelId?: string;
        messages?: ({ role: string; content: string; variants?: StoredVariant[] } & ChatMeta)[];
      }
    | null
    | undefined;
  const initialMessages: UIMessage[] =
    data?.messages?.map((m, i) => ({
      id: `${id}-${i}`,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
      ...(m.role === "assistant" && m.model
        ? {
            metadata: {
              model: m.model,
              credits: m.credits,
              durationMs: m.durationMs,
              feedback: m.feedback,
            },
          }
        : {}),
    })) ?? [];

  // rebuild regenerate branches (active = the stored/shown one, i.e. last)
  const initialBranches: Record<number, { variants: Variant[]; active: number }> = {};
  data?.messages?.forEach((m, i) => {
    if (m.role === "assistant" && m.variants && m.variants.length > 1) {
      initialBranches[i] = {
        variants: m.variants.map(storedToVariant),
        active: m.variants.length - 1,
      };
    }
  });

  return (
    <Thread
      key={id ?? "new"}
      initialId={id}
      initialModelId={data?.modelId ?? config.defaultModelId}
      initialMessages={initialMessages}
      initialBranches={initialBranches}
    />
  );
}

function Thread({
  initialId,
  initialModelId,
  initialMessages,
  initialBranches,
}: {
  initialId?: string;
  initialModelId: string;
  initialMessages: UIMessage[];
  initialBranches: Record<number, { variants: Variant[]; active: number }>;
}) {
  const { requireAuth } = useRequireAuth();
  const utils = trpc.useUtils();
  const createConv = trpc.conversation.create.useMutation();
  const feedbackMut = trpc.conversation.feedback.useMutation();
  const variantsMut = trpc.conversation.setVariants.useMutation();
  const branchMut = trpc.conversation.branch.useMutation();
  const [convId, setConvId] = useState(initialId);
  const [modelId, setModelId] = useState(initialModelId);
  const [text, setText] = useState("");
  const [webSearch, setWebSearch] = useState(false);

  const meQuery = trpc.user.getMe.useQuery();
  const modelsQuery = trpc.models.listEnabled.useQuery();
  const models =
    modelsQuery.data && modelsQuery.data.length > 0
      ? modelsQuery.data.map((m) => ({
          id: m.modelId,
          name: m.displayName,
          provider: m.provider,
        }))
      : [config.fallbackModel];

  // ChatGPT-style answer branches: each regenerate keeps the prior answer and
  // appends the new one, keyed by the assistant message's array index.
  // ponytail: session-only — only the shown branch persists to the DB, so a
  // refresh collapses to the last version. Persist variants when you need them
  // to survive reload.
  const [branches, setBranches] = useState<
    Record<number, { variants: Variant[]; active: number }>
  >(initialBranches);
  const regenIndexRef = useRef<number | null>(null);

  const { messages, sendMessage, status, regenerate, setMessages } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: ({ message }) => {
      utils.conversation.list.invalidate();
      utils.user.getMe.invalidate(); // refresh credits balance in sidebar
      const idx = regenIndexRef.current;
      regenIndexRef.current = null;
      if (idx == null) return;
      setBranches((b) => {
        const entry = b[idx];
        if (!entry) return b;
        const variants = [
          ...entry.variants,
          { parts: message.parts, metadata: message.metadata },
        ];
        if (convId)
          variantsMut.mutate({
            id: convId,
            index: idx,
            variants: variants.map(variantToStored),
          });
        return { ...b, [idx]: { variants, active: variants.length - 1 } };
      });
    },
    onError: (err) =>
      toast.error(err.message.includes("402") ? "Out of credits" : "Chat failed"),
  });

  function handleRegenerate(index: number, messageId: string) {
    setBranches((b) => {
      const cur = messages[index];
      if (b[index] || !cur) return b; // already tracking -> keep prior variants
      return {
        ...b,
        [index]: {
          variants: [{ parts: cur.parts, metadata: cur.metadata }],
          active: 0,
        },
      };
    });
    regenIndexRef.current = index;
    regenerate({ messageId, body: { modelId, conversationId: convId, webSearch } });
  }

  function goToBranch(index: number, active: number) {
    const entry = branches[index];
    const v = entry?.variants[active];
    if (!entry || !v) return;
    setBranches((b) => ({ ...b, [index]: { variants: entry.variants, active } }));
    setMessages((ms) =>
      ms.map((m, j) =>
        j === index ? { ...m, parts: v.parts, metadata: v.metadata } : m,
      ),
    );
  }

  // ponytail: forks from persisted DB state, not the in-memory active variant.
  // If a non-last regenerate variant is shown, the fork uses the stored version.
  function handleBranch(index: number) {
    if (!convId) return;
    requireAuth(async () => {
      const r = await branchMut.mutateAsync({ id: convId, upToIndex: index });
      utils.conversation.list.invalidate();
      window.open(`/chat/${r.id}`, "_blank");
    });
  }

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
        <PromptInputSubmit
            disabled={!text && status !== "streaming"}
            status={status}
            className="brand-gradient border-0 text-white shadow-sm shadow-primary/30 transition-all hover:opacity-90 hover:shadow-md hover:shadow-primary/40 disabled:opacity-40 disabled:shadow-none"
          />
      </PromptInputFooter>
    </PromptInput>
  );

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-2 text-center duration-700">
          <h1 className="text-brand-gradient pb-1 text-4xl font-semibold tracking-tight">
            What&rsquo;s on the agenda today?
          </h1>
          <p className="text-muted-foreground">
            Ask anything across GPT, Claude, Gemini and more — attach files or search the web.
          </p>
        </div>
        <div className="animate-in fade-in slide-in-from-bottom-6 w-full max-w-2xl duration-700">
          {promptInput}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-2xl">
          {messages.map((m, i) => (
            <Message from={m.role} key={m.id}>
              <div
                className={cn(
                  "flex w-full items-start gap-2",
                  m.role === "user" && "flex-row-reverse"
                )}
              >
                <MessageAvatar
                  from={m.role}
                  src={meQuery.data?.avatarUrl}
                  name={meQuery.data?.name}
                />
                <div className="flex min-w-0 flex-col gap-2">
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
              {m.role === "assistant" && m.metadata != null && (
                <MessageMetaBar
                  meta={m.metadata as ChatMeta}
                  text={m.parts
                    .map((p) => ("text" in p ? p.text : ""))
                    .join("")}
                  onRegenerate={() => handleRegenerate(i, m.id)}
                  branchCount={branches[i]?.variants.length ?? 0}
                  branchIndex={branches[i]?.active ?? 0}
                  onBranch={(active) => goToBranch(i, active)}
                  onBranchChat={convId ? () => handleBranch(i) : undefined}
                  onVote={
                    convId
                      ? (value) =>
                          feedbackMut.mutate({ id: convId, index: i, value })
                      : undefined
                  }
                />
              )}
                </div>
              </div>
            </Message>
          ))}
          {status === "submitted" && (
            <Message from="assistant">
              <div className="flex w-full items-start gap-2">
                <MessageAvatar from="assistant" />
                <MessageContent>
                  <Shimmer>Thinking…</Shimmer>
                </MessageContent>
              </div>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-2xl px-4 pb-4">{promptInput}</div>
    </div>
  );
}
