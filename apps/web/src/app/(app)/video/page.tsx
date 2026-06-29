"use client";

// Video studio — Prism prototype UI. ponytail: front-end only, clips are
// placeholder swatches with a simulated render progress bar.
import { useState } from "react";
import {
  VideoIcon,
  PlayIcon,
  RefreshCwIcon,
  Wand2Icon,
  DownloadIcon,
  ImageIcon,
} from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Textarea } from "@repo/ui/components/textarea";
import { Badge } from "@repo/ui/components/badge";
import { Placeholder, Field, SectionTitle, Seg } from "@/components/studio-ui";

const VIDEO_MODELS = [
  { id: "veo-3", name: "Veo 3", note: "Google · audio" },
  { id: "sora-2", name: "Sora 2", note: "OpenAI" },
  { id: "kling-2", name: "Kling 2.0", note: "Cinematic" },
  { id: "runway-gen4", name: "Runway Gen-4", note: "Control" },
];

const AR_OPTIONS = ["16:9", "9:16", "1:1"] as const;
type AR = (typeof AR_OPTIONS)[number];

type Clip = {
  id: string;
  prompt: string;
  model: string;
  dur: string;
  ar: AR;
  status: "rendering" | "done";
  progress?: number;
};

const INITIAL: Clip[] = [
  {
    id: "v1",
    prompt: "Drone shot pulling back over a misty pine forest at sunrise, cinematic, slow",
    model: "veo-3",
    dur: "8s",
    ar: "16:9",
    status: "done",
  },
  {
    id: "v2",
    prompt: "Close-up of ink blooming in water, macro, high speed",
    model: "kling-2",
    dur: "5s",
    ar: "16:9",
    status: "done",
  },
  {
    id: "v3",
    prompt: "A paper airplane gliding through a sunlit office, handheld",
    model: "sora-2",
    dur: "6s",
    ar: "9:16",
    status: "rendering",
    progress: 64,
  },
];

const arRatio = (a: string) => {
  const [w = 1, h = 1] = a.split(":").map(Number);
  return w / h;
};
const modelName = (id: string) => VIDEO_MODELS.find((m) => m.id === id)?.name ?? id;

export default function VideoStudio() {
  // the generation form — these four fields feed generate() together
  const [form, setForm] = useState<{ model: string; dur: number; ar: AR; prompt: string }>({
    model: "veo-3",
    dur: 8,
    ar: "16:9",
    prompt: "",
  });
  const [clips, setClips] = useState<Clip[]>(INITIAL);
  const [selId, setSelId] = useState<string>("v1");

  const cur = clips.find((c) => c.id === selId);

  function generate() {
    const p =
      form.prompt.trim() ||
      "Slow cinematic dolly through a neon-lit Tokyo alley in the rain";
    const id = "v" + Date.now();
    setClips((c) => [
      { id, prompt: p, model: form.model, dur: form.dur + "s", ar: form.ar, status: "rendering", progress: 0 },
      ...c,
    ]);
    setForm((f) => ({ ...f, prompt: "" }));
    setSelId(id);
    let pr = 0;
    const t = setInterval(() => {
      pr += 7;
      setClips((c) =>
        c.map((x) =>
          x.id === id
            ? { ...x, progress: Math.min(pr, 100), status: pr >= 100 ? "done" : "rendering" }
            : x
        )
      );
      if (pr >= 100) clearInterval(t);
    }, 320);
  }

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]">
      {/* rail */}
      <aside className="flex flex-col gap-4 overflow-y-auto border-b p-5 md:border-r md:border-b-0">
        <SectionTitle>Generate video</SectionTitle>
        <Field label="Prompt">
          <Textarea
            placeholder="Describe the shot — motion, camera, mood…"
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
            options={VIDEO_MODELS.map((m) => ({ value: m.id, label: m.name, title: m.note }))}
          />
        </Field>
        <Field label="Aspect">
          <Seg
            value={form.ar}
            onChange={(v) => setForm((f) => ({ ...f, ar: v }))}
            options={AR_OPTIONS.map((a) => ({ value: a, label: a }))}
          />
        </Field>
        <Field label={`Duration · ${form.dur}s`}>
          <input
            type="range"
            min={2}
            max={12}
            value={form.dur}
            onChange={(e) => setForm((f) => ({ ...f, dur: +e.target.value }))}
            style={{ accentColor: "var(--primary)" }}
          />
        </Field>
        <Field label="Reference image (optional)">
          <div className="text-muted-foreground flex items-center gap-2.5 rounded-xl border border-dashed p-3.5 text-xs">
            <ImageIcon className="size-4" /> Drop an image to animate
          </div>
        </Field>
        <Button
          onClick={generate}
          className="brand-gradient justify-center border-0 py-3 text-white shadow-sm shadow-primary/30 hover:opacity-90"
        >
          <VideoIcon className="size-4" /> Render clip
        </Button>
      </aside>

      {/* main */}
      <div className="overflow-y-auto p-6">
        <p className="text-muted-foreground mb-4 text-sm">{clips.length} clips</p>

        {cur && (
          <div className="bg-card animate-in fade-in mb-6 rounded-2xl border p-5 duration-300">
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <div
                className="relative grid place-items-center overflow-hidden rounded-xl"
                style={{ aspectRatio: arRatio(cur.ar) }}
              >
                <Placeholder hue={210} />
                {cur.status === "rendering" ? (
                  <div className="relative text-center text-white">
                    <div className="text-sm font-bold">Rendering… {cur.progress ?? 0}%</div>
                    <div className="mt-2.5 h-2 w-44 overflow-hidden rounded-full bg-black/30">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${cur.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <button className="relative grid size-15 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                    <PlayIcon className="size-6" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <b className="text-sm">{modelName(cur.model)}</b>
                  <Badge variant="outline" className="font-normal">
                    {cur.dur}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {cur.ar}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{cur.prompt}</p>
                <div className="mt-auto flex flex-wrap gap-2">
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {clips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelId(c.id)}
              data-on={c.id === selId}
              className="bg-card animate-in fade-in data-[on=true]:outline-primary block overflow-hidden rounded-xl border text-left duration-300 data-[on=true]:outline-2"
            >
              <div className="relative aspect-video">
                <Placeholder hue={200} />
                <div className="absolute inset-0 grid place-items-center">
                  {c.status === "rendering" ? (
                    <span className="rounded-md bg-black/40 px-2 py-1 font-mono text-[11px] text-white">
                      rendering {c.progress ?? 0}%
                    </span>
                  ) : (
                    <span className="grid size-10 place-items-center rounded-full bg-black/40 text-white">
                      <PlayIcon className="size-4" />
                    </span>
                  )}
                </div>
                <span className="absolute right-2 top-2 rounded-md bg-black/40 px-2 py-1 font-mono text-[11px] text-white">
                  {c.dur}
                </span>
              </div>
              <div className="p-3">
                <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                  {c.prompt}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
