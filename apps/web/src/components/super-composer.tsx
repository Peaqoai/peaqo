"use client";

import { useState, type ReactNode } from "react";
import { PaperclipIcon, GlobeIcon } from "lucide-react";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@peaqo/ui/components/ai-elements/attachments";
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
} from "@peaqo/ui/components/ai-elements/prompt-input";
import { trpc } from "@/lib/trpc/client";
import { PersonaSelector } from "@/components/persona-selector";

export type ComposerSubmit = {
  text: string;
  files: PromptInputMessage["files"];
  webSearch: boolean;
  personaId?: string;
};

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

// The same rich composer as the main chat page (attach, web search, persona),
// reused by Super AI. `leading` renders to the left (e.g. the Consensus button).
export function SuperComposer({
  placeholder,
  submitDisabled,
  leading,
  onSubmit,
}: {
  placeholder: string;
  submitDisabled?: boolean;
  leading?: ReactNode;
  onSubmit: (payload: ComposerSubmit) => void;
}) {
  const [webSearch, setWebSearch] = useState(false);
  const [personaId, setPersonaId] = useState<string>();
  const personasQ = trpc.persona.list.useQuery();
  const personas = ((personasQ.data ?? []) as { _id: unknown; name: string; emoji?: string }[]).map(
    (p) => ({ _id: String(p._id), name: p.name, emoji: p.emoji }),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
      {leading}
      <PromptInput
        className="flex-1"
        globalDrop
        multiple
        accept="image/*"
        onSubmit={(m) => onSubmit({ text: m.text, files: m.files, webSearch, personaId })}
      >
        <PromptInputHeader>
          <AttachmentsDisplay />
        </PromptInputHeader>
        <PromptInputBody>
          <PromptInputTextarea placeholder={placeholder} />
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
            {personas.length > 0 && (
              <PersonaSelector value={personaId} onChange={setPersonaId} personas={personas} />
            )}
          </PromptInputTools>
          <PromptInputSubmit
            disabled={submitDisabled}
            className="brand-gradient border-0 text-white shadow-sm shadow-primary/30 transition-all hover:opacity-90 disabled:opacity-40"
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
