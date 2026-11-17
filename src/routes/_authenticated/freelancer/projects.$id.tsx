import { appHead } from "@/lib/route-head";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProjects, useTasks, useTimeLogs, type Task } from "@/lib/data";
import { money, hours, fmtDate, errMsg } from "@/lib/format";
import {
  PageHeader,
  Panel,
  Stat,
  StatusBadge,
  ConfirmDelete,
  Empty,
  selectCls,
} from "@/components/ui-kit";
import { ProjectDialog, TaskDialog, TimeLogDialog } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/freelancer/projects/$id")({
  head: () => appHead("Project", "Manage your FreelanceFlow project."),
  component: ProjectDetail,
});

const cols: { key: Task["status"]; label: string }[] = [
  { key: "TODO", label: "To do" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Completed" },
];

function ProjectDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useTasks();
  const { data: logs = [] } = useTimeLogs();
  const p = projects.find((x) => x.id === id);
  if (isLoading) return null;
  if (!p) return <Empty>Project not found.</Empty>;

  const pt = tasks.filter((t) => t.project_id === id);
  const pl = logs.filter((l) => l.project_id === id);
  const mins = pl.reduce((s, l) => s + l.duration_minutes, 0);
  const used = pl.reduce((s, l) => s + Number(l.billable_amount), 0);
  const budget = Number(p.budget);
  const pct = budget > 0 ? (used / budget) * 100 : 0;
  const today = new Date().toISOString().slice(0, 10);

  async function setStatus(status: string) {
    const { error } = await supabase
      .from("projects")
      .update({ status: status as "ACTIVE" | "COMPLETED" | "ON_HOLD" })
      .eq("id", id);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["projects"] });
  }
  async function moveTask(t: Task, dir: 1 | -1) {
    const i = cols.findIndex((c) => c.key === t.status) + dir;
    if (i < 0 || i >= cols.length) return;
    const { error } = await supabase.from("tasks").update({ status: cols[i].key }).eq("id", t.id);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  async function delTask(t: Task) {
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  async function remove() {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries();
    navigate({ to: "/freelancer/projects" });
  }

  return (
    <>
      <Link to="/freelancer/projects" className="text-sm text-primary hover:underline">
        ← Projects
      </Link>
      <PageHeader
        title={p.name}
        subtitle={p.description ?? undefined}
        actions={
          <>
            <select
              className={cn(selectCls, "w-36")}
              value={p.status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <ProjectDialog
              project={p}
              trigger={
                <Button variant="outline">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              }
            />
            <ConfirmDelete
              title="Delete project?"
              description="All tasks and time entries for this project will be removed."
              onConfirm={remove}
              trigger={
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </>
        }
      />

      <label className="mb-6 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={p.shared_with_client}
          onChange={async (e) => {
            const { error } = await supabase
              .from("projects")
              .update({ shared_with_client: e.target.checked })
              .eq("id", id);
            if (error) toast.error(error.message);
            else qc.invalidateQueries({ queryKey: ["projects"] });
          }}
        />
        Share project with client
      </label>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          label="Client"
          value={
            <Link
              to="/freelancer/clients/$id"
              params={{ id: p.client_id }}
              className="hover:underline"
            >
              {p.clients?.name}
            </Link>
          }
        />
        <Stat label="Deadline" value={fmtDate(p.deadline)} />
        <Stat label="Hours logged" value={hours(mins)} />
        <Stat label="Billable" value={money(used)} />
      </div>

      <Panel title="Budget" className="mt-6">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span>
            Used <b className="tabular">{money(used)}</b>
          </span>
          <span>
            Remaining{" "}
            <b className={cn("tabular", budget - used < 0 && "text-destructive")}>
              {money(budget - used)}
            </b>
          </span>
          <span>
            Budget <b className="tabular">{money(budget)}</b>
          </span>
        </div>
        <Progress
          value={Math.min(pct, 100)}
          className={cn("mt-3 h-3", pct > 100 && "[&>div]:bg-destructive")}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {budget > 0 ? `${pct.toFixed(1)}% of budget burned` : "No budget set"}
        </p>
      </Panel>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Tasks</h2>
        <div className="flex gap-2">
          <TaskDialog
            projectId={id}
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Task
              </Button>
            }
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map((c) => (
          <div key={c.key} className="rounded-xl bg-muted/60 p-3">
            <div className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">
              {c.label}
              <span className="text-muted-foreground">
                {pt.filter((t) => t.status === c.key).length}
              </span>
            </div>
            <div className="grid gap-2">
              {pt
                .filter((t) => t.status === c.key)
                .map((t) => {
                  const overdue = t.due_date && t.due_date < today && t.status !== "COMPLETED";
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "rounded-lg border bg-card p-3 shadow-soft",
                        overdue && "border-destructive/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <TaskDialog
                          projectId={id}
                          task={t}
                          trigger={
                            <button className="text-left text-sm font-medium hover:underline">
                              {t.title}
                            </button>
                          }
                        />
                        <StatusBadge value={t.priority} />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span
                          className={cn(
                            "text-xs",
                            overdue ? "font-semibold text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {[
                            t.estimated_hours != null && `${Number(t.estimated_hours)}h est.`,
                            t.source === "AI" && "AI",
                            t.due_date && (overdue ? "Overdue · " : "Due ") + fmtDate(t.due_date),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <div className="flex">
                          <button
                            disabled={c.key === "TODO"}
                            onClick={() => moveTask(t, -1)}
                            className="rounded p-1 hover:bg-muted disabled:opacity-30"
                            aria-label="Move back"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            disabled={c.key === "COMPLETED"}
                            onClick={() => moveTask(t, 1)}
                            className="rounded p-1 hover:bg-muted disabled:opacity-30"
                            aria-label="Move forward"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <ConfirmDelete
                            title="Delete task?"
                            description={t.title}
                            onConfirm={() => delTask(t)}
                            trigger={
                              <button
                                className="rounded p-1 text-muted-foreground hover:bg-muted"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <Panel
        title="Time entries"
        className="mt-8"
        action={
          <TimeLogDialog
            projectId={id}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add time
              </Button>
            }
          />
        }
      >
        {pl.length === 0 ? (
          <Empty>No time logged yet. Start the timer in the sidebar.</Empty>
        ) : (
          <ul className="divide-y text-sm">
            {pl.slice(0, 10).map((l) => (
              <li key={l.id} className="flex justify-between py-2">
                <span>
                  {l.description || "—"}{" "}
                  <span className="text-muted-foreground">· {fmtDate(l.start_time)}</span>
                </span>
                <span className="tabular">
                  {hours(l.duration_minutes)} · {money(l.billable_amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
