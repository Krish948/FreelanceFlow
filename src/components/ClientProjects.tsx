import { useState } from "react";
import { useClientProjectOrders, useClientProjects, useClientTasks } from "@/lib/portal-data";
import { PageHeader, Empty, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fmtDate } from "@/lib/format";
import { ProjectOrderDialog } from "@/components/forms";
import { projectOrderStatusLabel } from "@/lib/project-orders";

export function ClientProjects() {
  const { data: projects = [], error } = useClientProjects();
  const { data: tasks = [] } = useClientTasks();
  const { data: projectOrders = [] } = useClientProjectOrders();
  const [status, setStatus] = useState("ALL");
  const [expanded, setExpanded] = useState("");
  return (
    <>
      <PageHeader
        title="My Projects"
        subtitle={`${projects.length} shared projects`}
        actions={<ProjectOrderDialog trigger={<Button>Post project order</Button>} />}
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {["ALL", "ACTIVE", "COMPLETED", "ON_HOLD"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => setStatus(s)}
          >
            {s === "ALL" ? "All" : s.replace("_", " ").toLowerCase()}
          </Button>
        ))}
      </div>
      {error ? (
        <p className="text-destructive">{error.message}</p>
      ) : !projects.length ? (
        <Empty>No projects have been shared with your account.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects
            .filter((p) => status === "ALL" || status === p.status)
            .map((p) => (
              <article key={p.id} className="rounded-lg border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{p.name}</h2>
                    <p className="text-sm text-muted-foreground">{p.freelancer_name}</p>
                  </div>
                  <StatusBadge value={p.status} />
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm">{p.description}</p>
                <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {p.done_tasks} / {p.total_tasks} tasks complete
                  </span>
                  <span>Due {fmtDate(p.deadline)}</span>
                </div>
                <Progress
                  className="mt-2 h-2"
                  value={p.total_tasks ? (p.done_tasks / p.total_tasks) * 100 : 0}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => setExpanded(expanded === p.id ? "" : p.id)}
                >
                  {expanded === p.id ? "Hide tasks" : "View tasks"}
                </Button>
                {expanded === p.id && (
                  <ul className="mt-2 divide-y text-sm">
                    {tasks
                      .filter((t) => t.project_id === p.id)
                      .map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                          <span>{t.title}</span>
                          <StatusBadge value={t.status} />
                        </li>
                      ))}
                  </ul>
                )}
              </article>
            ))}
        </div>
      )}

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Project orders</h2>
          <ProjectOrderDialog trigger={<Button variant="outline">New order</Button>} />
        </div>
        {!projectOrders.length ? (
          <Empty>You have not posted any project orders yet.</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projectOrders.map((order) => (
              <article key={order.id} className="rounded-lg border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold">{order.name}</h3>
                  <StatusBadge value={projectOrderStatusLabel(order.status)} />
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm">{order.description}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Budget: ₹{Number(order.budget ?? 0).toLocaleString()}</span>
                  {order.hourly_rate ? (
                    <span>Hourly: ₹{Number(order.hourly_rate).toLocaleString()}</span>
                  ) : null}
                  {order.deadline ? <span>Deadline: {fmtDate(order.deadline)}</span> : null}
                </div>
                {order.status === "OPEN" ? (
                  <ProjectOrderDialog
                    order={order}
                    trigger={
                      <Button className="mt-4" size="sm" variant="outline">
                        Edit order
                      </Button>
                    }
                  />
                ) : order.project_id ? (
                  <p className="mt-4 text-xs text-muted-foreground">
                    This order is now available in My Projects above.
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
