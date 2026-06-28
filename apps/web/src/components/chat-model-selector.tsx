"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";

export type ChatModel = { id: string; name: string; provider: string };

// our provider enum -> models.dev logo slug
const LOGO: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  groq: "groq",
  openrouter: "openrouter",
  cloudflare: "cloudflare-workers-ai",
};

export function ChatModelSelector({
  value,
  onChange,
  models,
}: {
  value: string;
  onChange: (id: string) => void;
  models: ChatModel[];
}) {
  const [open, setOpen] = useState(false);
  const selected = models.find((m) => m.id === value) ?? models[0];

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium">
        {selected && <ModelSelectorLogo provider={LOGO[selected.provider] ?? selected.provider} />}
        {selected?.name ?? "Select model"}
        <ChevronDownIcon className="size-4 opacity-60" />
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models…" />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="Models">
            {models.map((m) => (
              <ModelSelectorItem
                key={m.id}
                value={m.name}
                onSelect={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
              >
                <ModelSelectorLogo provider={LOGO[m.provider] ?? m.provider} />
                <ModelSelectorName>{m.name}</ModelSelectorName>
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}
