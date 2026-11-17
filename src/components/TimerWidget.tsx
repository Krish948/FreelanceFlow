import { useEffect, useState } from "react";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { timer, useTimer } from "@/lib/timer";
import { useProjects } from "@/lib/data";
import { fmtDuration, errMsg } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function TimerWidget() {
  const s = useTimer();
  const { data: projects = [] } = useProjects();
  const qc = useQueryClient();
  const [, tick] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!s.runningSince) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [s.runningSince]);

  const elapsed = timer.elapsed(s);
  const active = projects.filter((p) => p.status !== "COMPLETED");

  async function stop() {
    if (!s.projectId) return toast.error("Choose a project first");
    // Duration comes from real timestamps, not a frontend counter.
    const ms = timer.elapsed();
    if (ms < 60_000) return toast.error("Track at least one minute before saving");
    setSaving(true);
    const end = new Date();
    const start = new Date(end.getTime() - ms);
    const { error } = await supabase.from("time_logs").insert({
      project_id: s.projectId,
      description: s.description || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(errMsg(error));
    timer.reset();
    qc.invalidateQueries({ queryKey: ["time_logs"] });
    toast.success("Time saved");
  }

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent p-3 text-sidebar-foreground">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70">
          Timer
        </span>
        {s.runningSince && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-sidebar-primary" />
        )}
      </div>
      <div className="mt-1 font-display text-2xl font-semibold tabular text-sidebar-accent-foreground">
        {fmtDuration(elapsed)}
      </div>
      <select
        value={s.projectId ?? ""}
        onChange={(e) => timer.set({ projectId: e.target.value || null })}
        className="mt-2 h-8 w-full rounded-md border border-sidebar-border bg-sidebar px-2 text-xs"
      >
        <option value="">Select project…</option>
        {active.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        value={s.description}
        onChange={(e) => timer.set({ description: e.target.value })}
        placeholder="What are you working on?"
        className="mt-2 h-8 w-full rounded-md border border-sidebar-border bg-sidebar px-2 text-xs placeholder:opacity-50"
      />
      <div className="mt-2 flex gap-1.5">
        {s.runningSince ? (
          <Button size="sm" variant="secondary" className="h-8 flex-1" onClick={timer.pause}>
            <Pause className="h-3.5 w-3.5" />
            Pause
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-8 flex-1 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            onClick={() => (s.projectId ? timer.start() : toast.error("Choose a project first"))}
          >
            <Play className="h-3.5 w-3.5" />
            {elapsed > 0 ? "Resume" : "Start"}
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="h-8"
          disabled={elapsed === 0 || saving}
          onClick={stop}
          title="Stop & save"
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-sidebar-foreground hover:bg-sidebar hover:text-sidebar-foreground"
          disabled={elapsed === 0}
          onClick={timer.reset}
          title="Reset"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
