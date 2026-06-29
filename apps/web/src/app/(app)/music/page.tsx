"use client";

// Music studio — Prism-style prototype UI. ponytail: front-end only, tracks are
// placeholder art with a simulated render progress bar and fake waveform.
import { useState } from "react";
import {
  MusicIcon,
  PlayIcon,
  RefreshCwIcon,
  Wand2Icon,
  DownloadIcon,
} from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Textarea } from "@repo/ui/components/textarea";
import { Badge } from "@repo/ui/components/badge";
import { Placeholder, Field, SectionTitle, Seg } from "@/components/studio-ui";

const MUSIC_MODELS = [
  { id: "suno-v4", name: "Suno v4", note: "Songs + vocals" },
  { id: "udio-2", name: "Udio 2", note: "High fidelity" },
  { id: "musicgen", name: "MusicGen", note: "Open weights" },
  { id: "stable-audio", name: "Stable Audio 2", note: "Instrumental" },
];

const MOODS = ["Chill", "Energetic", "Cinematic", "Lo-fi", "Dreamy"] as const;
type Mood = (typeof MOODS)[number];

type Track = {
  id: string;
  prompt: string;
  model: string;
  mood: Mood;
  dur: string;
  status: "rendering" | "done";
  progress?: number;
};

const INITIAL: Track[] = [
  {
    id: "t1",
    prompt: "Lo-fi beats with mellow piano, vinyl crackle, for late-night coding",
    model: "suno-v4",
    mood: "Lo-fi",
    dur: "2:14",
    status: "done",
  },
  {
    id: "t2",
    prompt: "Cinematic orchestral swell building to an epic brass finale",
    model: "udio-2",
    mood: "Cinematic",
    dur: "1:48",
    status: "done",
  },
  {
    id: "t3",
    prompt: "Upbeat synthwave drive with arpeggiated bass, retro 80s",
    model: "stable-audio",
    mood: "Energetic",
    dur: "0:32",
    status: "rendering",
    progress: 48,
  },
];

const modelName = (id: string) => MUSIC_MODELS.find((m) => m.id === id)?.name ?? id;

// deterministic-ish bar heights for a fake waveform (no Math.random in render)
const WAVE = Array.from({ length: 40 }, (_, i) => 30 + ((i * 37) % 70));

function Waveform({ className }: { className?: string }) {
  return (
    <div className={"flex h-10 items-center gap-[3px] " + (className ?? "")}>
      {WAVE.map((h, i) => (
        <span
          key={i}
          className="bg-primary/60 w-[3px] rounded-full"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export default function MusicStudio() {
  // the generation form — these five fields feed generate() together
  const [form, setForm] = useState<{
    model: string;
    mood: Mood;
    dur: number;
    instrumental: boolean;
    prompt: string;
  }>({ model: "suno-v4", mood: "Lo-fi", dur: 30, instrumental: false, prompt: "" });
  const [tracks, setTracks] = useState<Track[]>(INITIAL);
  const [selId, setSelId] = useState<string>("t1");

  const cur = tracks.find((t) => t.id === selId);

  function generate() {
    const p =
      form.prompt.trim() || "Warm lo-fi hip-hop with soft Rhodes piano and a steady boom-bap beat";
    const id = "t" + Date.now();
    setTracks((t) => [
      { id, prompt: p, model: form.model, mood: form.mood, dur: `0:${String(form.dur).padStart(2, "0")}`, status: "rendering", progress: 0 },
      ...t,
    ]);
    setForm((f) => ({ ...f, prompt: "" }));
    setSelId(id);
    let pr = 0;
    const timer = setInterval(() => {
      pr += 8;
      setTracks((t) =>
        t.map((x) =>
          x.id === id
            ? { ...x, progress: Math.min(pr, 100), status: pr >= 100 ? "done" : "rendering" }
            : x
        )
      );
      if (pr >= 100) clearInterval(timer);
    }, 300);
  }

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]">
      {/* rail */}
      <aside className="flex flex-col gap-4 overflow-y-auto border-b p-5 md:border-r md:border-b-0">
        <SectionTitle>Generate music</SectionTitle>
        <Field label="Prompt">
          <Textarea
            placeholder="Describe the track — genre, instruments, mood, tempo…"
            value={form.prompt}
            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
            className="min-h-24 resize-y"
          />
        </Field>
        <Field label="Model">
          <Seg
            wrap
            value={form.model}
            onChange={(v) => setForm((f) => ({ ...f, model: v }))}
            options={MUSIC_MODELS.map((m) => ({ value: m.id, label: m.name, title: m.note }))}
          />
        </Field>
        <Field label="Mood">
          <Seg
            wrap
            value={form.mood}
            onChange={(v) => setForm((f) => ({ ...f, mood: v }))}
            options={MOODS.map((m) => ({ value: m, label: m }))}
          />
        </Field>
        <Field label={`Duration · ${form.dur}s`}>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={form.dur}
            onChange={(e) => setForm((f) => ({ ...f, dur: +e.target.value }))}
            style={{ accentColor: "var(--primary)" }}
          />
        </Field>
        <label className="flex cursor-pointer items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">Instrumental only</span>
          <input
            type="checkbox"
            checked={form.instrumental}
            onChange={(e) => setForm((f) => ({ ...f, instrumental: e.target.checked }))}
            style={{ accentColor: "var(--primary)" }}
            className="size-4"
          />
        </label>
        <Button
          onClick={generate}
          className="brand-gradient justify-center border-0 py-3 text-white shadow-sm shadow-primary/30 hover:opacity-90"
        >
          <MusicIcon className="size-4" /> Generate track
        </Button>
      </aside>

      {/* main */}
      <div className="overflow-y-auto p-6">
        <p className="text-muted-foreground mb-4 text-sm">{tracks.length} tracks</p>

        {cur && (
          <div className="bg-card animate-in fade-in mb-6 rounded-2xl border p-5 duration-300">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="size-28 shrink-0 overflow-hidden rounded-xl">
                <Placeholder hue={45} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">{modelName(cur.model)}</b>
                  <Badge variant="outline" className="font-normal">
                    {cur.mood}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {cur.dur}
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
                  {cur.prompt}
                </p>
                {cur.status === "rendering" ? (
                  <div>
                    <div className="text-muted-foreground mb-1.5 text-xs font-medium">
                      Rendering… {cur.progress ?? 0}%
                    </div>
                    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${cur.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button size="icon" className="brand-gradient size-10 shrink-0 rounded-full border-0 text-white">
                      <PlayIcon className="size-5" />
                    </Button>
                    <Waveform className="flex-1" />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCwIcon className="size-3.5" /> Re-roll
                  </Button>
                  <Button variant="outline" size="sm">
                    <Wand2Icon className="size-3.5" /> Extend
                  </Button>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="size-3.5" /> Export
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <SectionTitle className="mb-3">Library</SectionTitle>
        <div className="flex flex-col gap-2">
          {tracks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelId(t.id)}
              data-on={t.id === selId}
              className="bg-card animate-in fade-in data-[on=true]:border-primary/50 flex items-center gap-3 rounded-xl border p-3 text-left duration-300"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                <Placeholder hue={45} />
                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid size-7 place-items-center rounded-full bg-black/40 text-white">
                    <PlayIcon className="size-3.5" />
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.prompt}</p>
                <p className="text-muted-foreground text-xs">
                  {modelName(t.model)} · {t.mood}
                </p>
              </div>
              {t.status === "rendering" ? (
                <span className="text-muted-foreground shrink-0 font-mono text-xs">
                  {t.progress ?? 0}%
                </span>
              ) : (
                <span className="text-muted-foreground shrink-0 font-mono text-xs">{t.dur}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
