import { useSyncExternalStore } from "react";

/** Persistent stopwatch stored in localStorage so it survives navigation and reloads. */
export type TimerState = {
  projectId: string | null;
  description: string;
  /** Timestamp (ms) when the current running segment began; null when paused. */
  runningSince: number | null;
  /** Accumulated ms from previous segments. */
  accumulated: number;
  /** First start timestamp, used as the log's start time. */
  firstStart: number | null;
};

const KEY = "ff-timer";
const empty: TimerState = {
  projectId: null,
  description: "",
  runningSince: null,
  accumulated: 0,
  firstStart: null,
};
const listeners = new Set<() => void>();
let cache: TimerState = empty;
let cacheRaw: string | null = null;

function read(): TimerState {
  if (typeof window === "undefined") return empty;
  const raw = localStorage.getItem(KEY);
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = raw ? { ...empty, ...JSON.parse(raw) } : empty;
    } catch {
      cache = empty;
    }
  }
  return cache;
}
function write(next: TimerState) {
  localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export const timer = {
  get: read,
  set: (patch: Partial<TimerState>) => write({ ...read(), ...patch }),
  start() {
    const s = read();
    if (s.runningSince) return;
    const now = Date.now();
    write({ ...s, runningSince: now, firstStart: s.firstStart ?? now });
  },
  pause() {
    const s = read();
    if (!s.runningSince) return;
    write({ ...s, accumulated: s.accumulated + (Date.now() - s.runningSince), runningSince: null });
  },
  reset() {
    const s = read();
    write({ ...empty, projectId: s.projectId });
  },
  elapsed(s: TimerState = read()) {
    return s.accumulated + (s.runningSince ? Date.now() - s.runningSince : 0);
  },
};

export function useTimer() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => e.key === KEY && cb();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    read,
    () => empty,
  );
}
