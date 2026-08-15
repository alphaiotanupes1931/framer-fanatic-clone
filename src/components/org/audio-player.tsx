import { useSyncExternalStore } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { resolveMediaUrl } from "@/components/smart-image";

type State = { id: string | null; status: "idle" | "loading" | "playing" };

let audio: HTMLAudioElement | null = null;
let state: State = { id: null, status: "idle" };
const subs = new Set<() => void>();

function set(next: State) {
  state = next;
  subs.forEach((f) => f());
}

function getAudio() {
  if (!audio) {
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("ended", () => set({ id: null, status: "idle" }));
    audio.addEventListener("pause", () => {
      if (state.status === "playing") set({ ...state, status: "idle" });
    });
    audio.addEventListener("play", () => set({ id: state.id, status: "playing" }));
  }
  return audio;
}

/** Plays a track, or pauses it when it is already the active one. */
export async function toggleTrack(id: string, src: string) {
  const el = getAudio();
  if (state.id === id && state.status === "playing") {
    el.pause();
    set({ id, status: "idle" });
    return;
  }
  set({ id, status: "loading" });
  try {
    const url = (await resolveMediaUrl(src)) ?? src;
    el.src = url;
    await el.play();
    set({ id, status: "playing" });
  } catch {
    set({ id: null, status: "idle" });
    toast.error("Could not play that track");
  }
}

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => subs.delete(cb);
}

export function usePlayer(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Round play / pause control used across music, album and single views. */
export function PlayButton({
  id,
  src,
  size = "md",
  className = "",
}: {
  id: string;
  src: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const player = usePlayer();
  const active = player.id === id;
  const box = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); void toggleTrack(id, src); }}
      aria-label={active && player.status === "playing" ? "Pause" : "Play"}
      className={`grid ${box} shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 ${className}`}
    >
      {active && player.status === "loading"
        ? <Loader2 className={`${icon} animate-spin`} />
        : active && player.status === "playing"
          ? <Pause className={`${icon} fill-current`} />
          : <Play className={`${icon} translate-x-[1px] fill-current`} />}
    </button>
  );
}
