import { useState } from "react";
import { useClientTasks } from "@/lib/portal-data";
import { PageHeader, Empty, StatusBadge, selectCls } from "@/components/ui-kit";
import { Progress } from "@/components/ui/progress";
import { fmtDate } from "@/lib/format";

export function ClientTasks() {
  const { data: tasks = [], error } = useClientTasks();
  const [project, setProject] = useState("");
  const list = tasks.filter((t) => !project || t.project_id === project);
  const phases = [...new Set(list.map((t) => `${t.project_name} · ${t.phase || "Tasks"}`))];
  return (
    <>
      <PageHeader title="Tasks & Milestones" />
      <select
        aria-label="Filter by project"
        className={selectCls + " mb-6 max-w-sm"}
        value={project}
        onChange={(e) => setProject(e.target.value)}
      >
        <option value="">All projects</option>
        {[...new Map(tasks.map((t) => [t.project_id, t.project_name])).entries()].map(
          ([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ),
        )}
      </select>
      {error ? (
        <p className="text-destructive">{error.message}</p>
      ) : !list.length ? (
        <Empty>No client-visible tasks yet.</Empty>
      ) : (
        phases.map((phase) => {
          const group = list.filter((t) => `${t.project_name} · ${t.phase || "Tasks"}` === phase);
          const done = group.filter((t) => t.status === "COMPLETED").length;
          return (
            <section key={phase} className="mb-7">
              <div className="flex justify-between gap-3">
                <h2 className="text-lg font-semibold">{phase}</h2>
                <span className="text-sm text-muted-foreground">
                  {done}/{group.length}
                </span>
              </div>
              <Progress className="my-3 h-1.5" value={(done / group.length) * 100} />
              <ul className="divide-y">
                {group.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium break-words">{t.title}</h3>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {t.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {fmtDate(t.due_date)}
                      </p>
                    </div>
                    <StatusBadge value={t.priority} />
                    <StatusBadge value={t.status} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
