"use client";

// Chat fiesta — a multi-model group chat where several models riff together.
// ponytail: prototype only — thread is mocked, composer echoes locally; no real
// fan-out to providers yet.
import { useState } from "react";
import { ArrowUpIcon } from "lucide-react";
import { Textarea } from "@repo/ui/components/textarea";
import { cn } from "@repo/ui/lib/utils";

const PARTICIPANTS = [
  { id: "claude", name: "Claude", short: "A", color: "#d97757" },
  { id: "gpt", name: "GPT-5", short: "O", color: "#10a37f" },
  { id: "gemini", name: "Gemini", short: "G", color: "#4285f4" },
  { id: "grok", name: "Grok", short: "X", color: "#9aa0a6" },
];

type Msg = { who: string; name?: string; color?: string; short?: string; text: string };

const THREAD: Msg[] = [
  { who: "user", text: "Pitch me a name for a multi-model AI super-app." },
  {
    who: "claude",
    name: "Claude",
    color: "#d97757",
    short: "A",
    text: "“Prism” — one surface that refracts your prompt across every model. Clean, visual, memorable.",
  },
  {
    who: "gpt",
    name: "GPT-5",
    color: "#10a37f",
    short: "O",
    text: "Or “Chorus” — many voices, one conversation. Leans into the multi-model angle.",
  },
  {
    who: "gemini",
    name: "Gemini",
    color: "#4285f4",
    short: "G",
    text: "“Atlas” works too — it implies breadth and carrying a lot at once. Though it’s a bit overused.",
  },
];

export default function ChatFiesta() {
  const [active, setActive] = useState<Record<string, boolean>>({
    claude: true,
    gpt: true,
    gemini: true,
    grok: false,
  });
  const [msgs, setMsgs] = useState<Msg[]>(THREAD);
  const [text, setText] = useState("");

  function send() {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { who: "user", text: text.trim() }]);
    setText("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* participants */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className="text-muted-foreground mr-1 text-xs font-semibold uppercase tracking-wide">
          Room
        </span>
        {PARTICIPANTS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive((a) => ({ ...a, [p.id]: !a[p.id] }))}
            data-on={active[p.id]}
            className="data-[on=true]:border-primary/50 data-[on=false]:opacity-50 flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition-all"
          >
            <span
              className="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ background: p.color }}
            >
              {p.short}
            </span>
            {p.name}
          </button>
        ))}
      </div>

      {/* thread */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 p-4">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-3",
                m.who === "user" && "flex-row-reverse"
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-md text-[11px] font-bold text-white",
                  m.who === "user" && "bg-muted text-muted-foreground"
                )}
                style={m.who === "user" ? undefined : { background: m.color }}
              >
                {m.who === "user" ? "You" : m.short}
              </span>
              <div className={cn("min-w-0", m.who === "user" && "text-right")}>
                {m.name && (
                  <div className="mb-1 text-xs font-semibold" style={{ color: m.color }}>
                    {m.name}
                  </div>
                )}
                <div
                  className={cn(
                    "inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.who === "user"
                      ? "bg-secondary"
                      : "bg-card border"
                  )}
                >
                  {m.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* composer */}
      <div className="mx-auto w-full max-w-2xl p-4">
        <div className="bg-card focus-within:border-primary/40 flex items-end gap-2 rounded-[18px] border p-2 shadow-lg shadow-black/5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message the room…  ⌘↵ to send"
            className="max-h-40 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={send}
            className="brand-gradient grid size-9 shrink-0 place-items-center rounded-xl text-white shadow-sm shadow-primary/30 hover:opacity-90"
          >
            <ArrowUpIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
