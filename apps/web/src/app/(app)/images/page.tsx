"use client";

// Image studio — Prism prototype UI. ponytail: front-end only, generations are
// placeholder swatches; wire to a real image model when the backend exists.
import { useState } from "react";
import {
  SparklesIcon,
  Wand2Icon,
  LayersIcon,
  DownloadIcon,
  RefreshCwIcon,
  PlusIcon,
  ChevronDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Placeholder, Field, SectionTitle, Seg } from "@/components/studio-ui";
import { cn } from "@/lib/utils";

const IMAGE_MODELS = [
  { id: "ideogram-3", name: "Ideogram 3.0", note: "Text & typography" },
  { id: "flux-1-1-pro", name: "FLUX 1.1 Pro", note: "Photoreal" },
  { id: "imagen-4", name: "Imagen 4", note: "Google" },
  { id: "dalle-4", name: "DALL·E 4", note: "OpenAI" },
  { id: "sd-3-5", name: "Stable Diffusion 3.5", note: "Open weights" },
];

const AR_OPTIONS = ["1:1", "4:3", "3:2", "16:9", "9:16"] as const;
type AR = (typeof AR_OPTIONS)[number];

type Gen = {
  id: string;
  prompt: string;
  model: string;
  ar: AR;
  iter: number;
  seed: string;
};

const INITIAL: Gen[] = [
  {
    id: "g1",
    prompt:
      "A glass prism on a concrete plinth refracting a single beam into a soft rainbow, studio light, minimal, 35mm",
    model: "flux-1-1-pro",
    ar: "1:1",
    iter: 3,
    seed: "48211",
  },
  {
    id: "g2",
    prompt: "Isometric workspace of a designer, warm dusk light, muted palette, soft shadows",
    model: "ideogram-3",
    ar: "4:3",
    iter: 1,
    seed: "90233",
  },
  {
    id: "g3",
    prompt: "Macro of dewdrops on a spiderweb at dawn, bokeh, hyperreal",
    model: "imagen-4",
    ar: "3:2",
    iter: 2,
    seed: "11920",
  },
];

const arRatio = (a: string) => {
  const [w = 1, h = 1] = a.split(":").map(Number);
  return w / h;
};
const modelName = (id: string) => IMAGE_MODELS.find((m) => m.id === id)?.name ?? id;
const hueOf = (seed: string) => (seed.charCodeAt(0) * 7) % 360;

export default function ImageStudio() {
  const [model, setModel] = useState("flux-1-1-pro");
  const [ar, setAr] = useState<AR>("1:1");
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(4);
  const [gens, setGens] = useState<Gen[]>(INITIAL);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [activeIter, setActiveIter] = useState(0);

  const focus = gens.find((g) => g.id === focusId);

  function generate() {
    const p =
      prompt.trim() ||
      "A glass prism refracting light into a soft spectrum, studio still life";
    const id = "g" + Date.now();
    setGens((g) => [
      { id, prompt: p, model, ar, iter: 1, seed: String(Math.floor(Math.random() * 99999)) },
      ...g,
    ]);
    setPrompt("");
    setFocusId(id);
    setActiveIter(0);
  }

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]">
      {/* rail */}
      <aside className="flex flex-col gap-4 overflow-y-auto border-b p-5 md:border-r md:border-b-0">
        <Field label="Prompt">
          <Textarea
            placeholder="Describe the image… include style, lens, lighting"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-24 resize-y"
          />
        </Field>
        <Field label="Model">
          <Seg
            wrap
            value={model}
            onChange={setModel}
            options={IMAGE_MODELS.map((m) => ({ value: m.id, label: m.name, title: m.note }))}
          />
        </Field>
        <Field label="Aspect ratio">
          <Seg
            value={ar}
            onChange={setAr}
            options={AR_OPTIONS.map((a) => ({ value: a, label: a }))}
          />
        </Field>
        <Field label={`Images per run · ${count}`}>
          <input
            type="range"
            min={1}
            max={8}
            value={count}
            onChange={(e) => setCount(+e.target.value)}
            style={{ accentColor: "var(--primary)" }}
          />
        </Field>
        <Button
          onClick={generate}
          className="brand-gradient justify-center border-0 py-3 text-white shadow-sm shadow-primary/30 hover:opacity-90"
        >
          <SparklesIcon className="size-4" /> Generate
        </Button>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Tip: open any result to <span className="text-foreground font-semibold">iterate</span> —
          tweak a variant, change strength, or branch a new seed without losing the original.
        </p>
      </aside>

      {/* main */}
      <div className="overflow-y-auto p-6">
        {focus ? (
          <div className="animate-in fade-in duration-300">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={() => setFocusId(null)}
            >
              <ChevronDownIcon className="size-4 rotate-90" /> Back to gallery
            </Button>
            <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
              {/* stage */}
              <div className="bg-card flex flex-col gap-4 rounded-2xl border p-5">
                <div
                  className="overflow-hidden rounded-xl"
                  style={{ aspectRatio: arRatio(focus.ar) }}
                >
                  <Placeholder
                    hue={(265 + activeIter * 40) % 360}
                    label={`${modelName(focus.model)} · ${focus.ar} · iter ${activeIter + 1}`}
                  />
                </div>
                <div>
                  <div className="text-muted-foreground mb-2 text-xs font-semibold">
                    ITERATIONS
                  </div>
                  <div className="flex gap-2.5">
                    {Array.from({ length: focus.iter }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveIter(i)}
                        data-on={i === activeIter}
                        className="data-[on=true]:border-primary relative grid size-16 place-items-center overflow-hidden rounded-lg border-2 border-transparent"
                      >
                        <Placeholder hue={(265 + i * 40) % 360} />
                        <span className="relative font-bold text-white">{i + 1}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setGens((g) =>
                          g.map((x) => (x.id === focus.id ? { ...x, iter: x.iter + 1 } : x))
                        );
                        setActiveIter(focus.iter);
                      }}
                      className="border-input text-muted-foreground hover:border-primary/40 grid size-16 place-items-center rounded-lg border border-dashed"
                    >
                      <PlusIcon className="size-5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCwIcon className="size-3.5" /> Variations
                  </Button>
                  <Button variant="outline" size="sm">
                    <Wand2Icon className="size-3.5" /> Inpaint
                  </Button>
                  <Button variant="outline" size="sm">
                    <LayersIcon className="size-3.5" /> Upscale 4×
                  </Button>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="size-3.5" /> Download
                  </Button>
                </div>
              </div>
              {/* settings */}
              <div className="flex flex-col gap-4">
                <div className="bg-card rounded-2xl border p-4">
                  <SectionTitle className="mb-3">Prompt</SectionTitle>
                  <Textarea defaultValue={focus.prompt} className="min-h-28 resize-y" />
                  <Button
                    size="sm"
                    className="brand-gradient mt-2.5 w-full justify-center border-0 text-white hover:opacity-90"
                  >
                    <SparklesIcon className="size-3.5" /> Re-run iteration
                  </Button>
                </div>
                <div className="bg-card flex flex-col gap-3 rounded-2xl border p-4">
                  <SectionTitle>Settings</SectionTitle>
                  <SettingRow k="Model" v={modelName(focus.model)} />
                  <SettingRow k="Seed" v={focus.seed} mono />
                  <Field label="Variation strength · 0.45">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      defaultValue={45}
                      style={{ accentColor: "var(--primary)" }}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-4 text-sm">
              {gens.length} generations · click any image to iterate
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {gens.map((g) => (
                <div
                  key={g.id}
                  className="bg-card animate-in fade-in overflow-hidden rounded-xl border duration-300"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setFocusId(g.id);
                      setActiveIter(0);
                    }}
                    className="block aspect-square w-full"
                  >
                    <Placeholder hue={hueOf(g.seed)} label={`${g.ar} · ${modelName(g.model)}`} />
                  </button>
                  <div className="p-3">
                    <p className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                      {g.prompt}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Badge variant="outline" className="font-normal">
                        {g.iter} iter{g.iter > 1 ? "s" : ""}
                      </Badge>
                      <span className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setFocusId(g.id);
                          setActiveIter(0);
                        }}
                      >
                        <LayersIcon className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm">
                        <DownloadIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SettingRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn("font-semibold", mono && "font-mono")}>{v}</span>
    </div>
  );
}
