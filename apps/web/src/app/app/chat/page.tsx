"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { useRequireAuth } from "@/lib/use-require-auth";
import { AuthGateModal } from "@/components/auth-gate-modal";
import { ModelPicker } from "@/components/model-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChatPage() {
  const { requireAuth } = useRequireAuth();
  const [modelId, setModelId] = useState("gpt-4o");
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (err) => {
      // 402 -> out of credits, 401 -> handled by auth gate before send
      toast.error(err.message.includes("402") ? "Out of credits" : "Chat failed");
    },
  });

  function onSend() {
    const text = input.trim();
    if (!text) return;
    requireAuth(() => {
      sendMessage({ text }, { body: { modelId } });
      setInput("");
    });
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col p-4">
      <header className="flex items-center justify-between pb-4">
        <h1 className="font-semibold">Peaqo</h1>
        <ModelPicker value={modelId} onChange={setModelId} />
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "text-right" : "text-left"}
          >
            <span className="bg-muted inline-block rounded-lg px-3 py-2 text-sm">
              {m.parts
                .map((p) => ("text" in p ? p.text : ""))
                .join("")}
            </span>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-muted-foreground text-center text-sm">
            Ask anything to get started.
          </p>
        )}
      </div>

      <div className="flex gap-2 pt-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Message Peaqo…"
        />
        <Button onClick={onSend} disabled={status === "streaming"}>
          Send
        </Button>
      </div>

      <AuthGateModal />
    </main>
  );
}
