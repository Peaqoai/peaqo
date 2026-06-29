"use client";

// Persona chat — pick a character to chat with. ponytail: prototype gallery;
// "Start chat" routes to the real /chat (persona presets not wired yet).
import Link from "next/link";

const PERSONAS = [
  {
    name: "Atlas",
    emoji: "🧭",
    role: "Strategy partner",
    model: "Claude Opus 4.6",
    tone: "Direct, analytical",
    hue: 18,
    traits: ["Decisive", "Big-picture", "Skeptical"],
  },
  {
    name: "Sol",
    emoji: "🌞",
    role: "Creative writer",
    model: "GPT-5",
    tone: "Warm, playful",
    hue: 70,
    traits: ["Vivid", "Lyrical", "Curious"],
  },
  {
    name: "Vera",
    emoji: "⚙️",
    role: "Code reviewer",
    model: "DeepSeek R1",
    tone: "Terse, exacting",
    hue: 265,
    traits: ["Precise", "Pedantic", "Fast"],
  },
  {
    name: "Iris",
    emoji: "🔬",
    role: "Research analyst",
    model: "Gemini 2.5 Pro",
    tone: "Measured, cited",
    hue: 160,
    traits: ["Thorough", "Neutral", "Sourced"],
  },
  {
    name: "Mara",
    emoji: "🎮",
    role: "Game designer",
    model: "Claude Sonnet 4.6",
    tone: "Energetic, ideative",
    hue: 330,
    traits: ["Playful", "Bold", "Visual"],
  },
  {
    name: "Kenji",
    emoji: "🏔️",
    role: "Stoic mentor",
    model: "Kimi K2",
    tone: "Calm, grounded",
    hue: 195,
    traits: ["Patient", "Frank", "Wise"],
  },
];

export default function PersonaChat() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Persona chat</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Chat with a character — each persona has its own voice, model, and style.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map((p) => (
            <div
              key={p.name}
              className="bg-card hover:border-primary/40 rounded-2xl border p-5 transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl"
                  style={{
                    background: `color-mix(in oklab, hsl(${p.hue} 70% 55%) 22%, transparent)`,
                  }}
                >
                  {p.emoji}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-muted-foreground truncate text-xs">{p.role}</div>
                </div>
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                {p.tone} · {p.model}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.traits.map((t) => (
                  <span
                    key={t}
                    className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-medium"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <Link
                href="/chat"
                className="border-input hover:bg-accent mt-4 flex h-9 w-full items-center justify-center rounded-md border text-sm font-medium transition-colors"
              >
                Start chat
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
