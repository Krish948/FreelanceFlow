import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useProjects, useTasks } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Empty, StatusBadge, selectCls } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/forms";
import { fmtDate } from "@/lib/format";

export function FreelancerTasks() {
  const { data: projects = [] } = useProjects();
  const { data: tasks = [] } = useTasks();
  const [project, setProject] = useState("");
  const qc = useQueryClient();
  const pid = project || projects[0]?.id;
  async function visible(id: string, value: boolean) {
    const { error } = await supabase.from("tasks").update({ client_visible: value }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  return (
    <>
      <PageHeader
        title="Tasks"
        actions={
          pid && (
            <TaskDialog
              projectId={pid}
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Add task
                </Button>
              }
            />
          )
        }
      />
      <select
        aria-label="Filter tasks by project"
        className={selectCls + " mb-6 max-w-sm"}
        value={project}
        onChange={(e) => setProject(e.target.value)}
      >
        <option value="">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {!tasks.length ? (
        <Empty>No tasks yet.</Empty>
      ) : (
        <ul className="divide-y">
          {tasks
            .filter((t) => !project || t.project_id === project)
            .map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium">{t.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {projects.find((p) => p.id === t.project_id)?.name} · Due {fmtDate(t.due_date)}
                  </p>
                </div>
                <StatusBadge value={t.priority} />
                <select
                  aria-label={`Status for ${t.title}`}
                  className={selectCls + " w-36"}
                  value={t.status}
                  onChange={async (e) => {
                    const { error } = await supabase
                      .from("tasks")
                      .update({ status: e.target.value as "TODO" | "IN_PROGRESS" | "COMPLETED" })
                      .eq("id", t.id);
                    if (error) toast.error(error.message);
                    else qc.invalidateQueries({ queryKey: ["tasks"] });
                  }}
                >
                  <option value="TODO">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={t.client_visible}
                    onChange={(e) => visible(t.id, e.target.checked)}
                  />
                  Client visible
                </label>
                <TaskDialog
                  projectId={t.project_id}
                  task={t}
                  trigger={
                    <Button size="icon" variant="ghost" aria-label="Edit task">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
              </li>
            ))}
        </ul>
      )}
    </>
  );
}
