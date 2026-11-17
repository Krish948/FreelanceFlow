import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ClientDialog, ProjectDialog } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClients, useProjects, useTimeLogs, usePlan } from "@/lib/data";
import { acceptProjectOrder, useOpenProjectOrders } from "@/lib/portal-data";
import { errMsg, fmtDate, money } from "@/lib/format";
import { projectOrderStatusLabel } from "@/lib/project-orders";
import { Progress } from "@/components/ui/progress";

export function FreelancerWorkHub() {
  const { data: clients = [], isLoading: clientsLoading, error: clientsError } = useClients();
  const { data: projects = [], isLoading: projectsLoading, error: projectsError } = useProjects();
  const { data: logs = [] } = useTimeLogs();
  const { data: plan } = usePlan();
  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
  } = useOpenProjectOrders();
  const [clientQuery, setClientQuery] = useState("");
  const [clientFilter, setClientFilter] = useState<"all" | "active">("all");
  const [projectStatus, setProjectStatus] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const activeClientIds = useMemo(
    () =>
      new Set(projects.filter((project) => project.status === "ACTIVE").map((p) => p.client_id)),
    [projects],
  );
  const visibleClients = clients.filter(
    (client) =>
      (clientFilter === "all" || activeClientIds.has(client.id)) &&
      [client.name, client.company, client.email].some((value) =>
        value?.toLowerCase().includes(clientQuery.toLowerCase()),
      ),
  );
  const visibleProjects = projects.filter(
    (project) => projectStatus === "ALL" || project.status === projectStatus,
  );
  const today = new Date().toISOString().slice(0, 10);

  async function acceptOrder(orderId: string) {
    setBusyId(orderId);
    try {
      const projectId = await acceptProjectOrder(orderId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["open_project_orders"] }),
        qc.invalidateQueries({ queryKey: ["client_project_orders"] }),
        qc.invalidateQueries({ queryKey: ["projects"] }),
        qc.invalidateQueries({ queryKey: ["clients"] }),
      ]);
      toast.success("Order accepted. Your project workspace is ready.");
      await navigate({ to: "/freelancer/projects/$id", params: { id: projectId } });
    } catch (error) {
      toast.error(errMsg(error as Error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="My Work"
        subtitle="Manage clients, projects, and new orders in one place."
      />
      <Tabs defaultValue="clients" className="w-full">
        <TabsList aria-label="My work sections" className="mb-6 h-auto flex-wrap justify-start">
          <TabsTrigger value="clients">My clients</TabsTrigger>
          <TabsTrigger value="projects">My projects</TabsTrigger>
          <TabsTrigger value="orders">Open orders</TabsTrigger>
        </TabsList>
        <TabsContent value="clients" className="mt-0">
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">My clients</h2>
                <p className="text-sm text-muted-foreground">
                  {plan === "FREE"
                    ? `${clients.length} of 2 clients on Free`
                    : `${clients.length} clients`}
                </p>
              </div>
              <ClientDialog
                trigger={
                  <Button>
                    <Plus className="h-4 w-4" />
                    Add client
                  </Button>
                }
              />
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="relative min-w-56 flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, company or email"
                  value={clientQuery}
                  onChange={(event) => setClientQuery(event.target.value)}
                />
              </div>
              {(["all", "active"] as const).map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={clientFilter === filter ? "default" : "outline"}
                  onClick={() => setClientFilter(filter)}
                >
                  {filter === "all" ? "All clients" : "With active projects"}
                </Button>
              ))}
            </div>
            {clientsError ? (
              <p className="text-destructive">{clientsError.message}</p>
            ) : clientsLoading ? null : visibleClients.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleClients.map((client) => (
                  <Link
                    key={client.id}
                    to="/freelancer/clients/$id"
                    params={{ id: client.id }}
                    className="rounded-xl border bg-card p-5 shadow-soft transition hover:border-primary/40"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-display font-semibold text-primary">
                      {client.name[0]?.toUpperCase()}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {client.company || client.email || "—"}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {money(client.default_hourly_rate)}/hr ·{" "}
                      {projects.filter((project) => project.client_id === client.id).length}{" "}
                      projects
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty>
                {clients.length
                  ? "No clients match these filters."
                  : "Add a client or accept an order to get started."}
              </Empty>
            )}
          </section>
        </TabsContent>

        <TabsContent value="projects" className="mt-0">
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">My projects</h2>
                <p className="text-sm text-muted-foreground">
                  {projects.filter((project) => project.status === "ACTIVE").length} active
                </p>
              </div>
              <ProjectDialog
                trigger={
                  <Button>
                    <Plus className="h-4 w-4" />
                    New project
                  </Button>
                }
              />
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {["ALL", "ACTIVE", "ON_HOLD", "COMPLETED"].map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={projectStatus === status ? "default" : "outline"}
                  onClick={() => setProjectStatus(status)}
                >
                  {status === "ALL" ? "All" : status.replace("_", " ").toLowerCase()}
                </Button>
              ))}
            </div>
            {projectsError ? (
              <p className="text-destructive">{projectsError.message}</p>
            ) : projectsLoading ? null : visibleProjects.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {visibleProjects.map((project) => {
                  const used = logs
                    .filter((log) => log.project_id === project.id)
                    .reduce((sum, log) => sum + Number(log.billable_amount), 0);
                  const percent =
                    Number(project.budget) > 0 ? (used / Number(project.budget)) * 100 : 0;
                  const late =
                    project.deadline && project.deadline < today && project.status !== "COMPLETED";
                  return (
                    <Link
                      key={project.id}
                      to="/freelancer/projects/$id"
                      params={{ id: project.id }}
                      className="rounded-xl border bg-card p-5 shadow-soft transition hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">{project.clients?.name}</p>
                        </div>
                        <StatusBadge value={project.status} />
                      </div>
                      <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                        <span>
                          {money(used)} of {money(project.budget)}
                        </span>
                        <span>{percent.toFixed(0)}%</span>
                      </div>
                      <Progress value={Math.min(percent, 100)} className="mt-1.5 h-1.5" />
                      <p
                        className={
                          late
                            ? "mt-3 text-xs font-semibold text-destructive"
                            : "mt-3 text-xs text-muted-foreground"
                        }
                      >
                        Deadline {fmtDate(project.deadline)}
                        {late ? " · overdue" : ""}
                      </p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Empty>No projects match this status.</Empty>
            )}
          </section>
        </TabsContent>

        <TabsContent value="orders" className="mt-0">
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Open orders</h2>
              <p className="text-sm text-muted-foreground">
                Client requests stay open until a freelancer accepts them.
              </p>
            </div>
            {ordersError ? (
              <p className="text-destructive">{ordersError.message}</p>
            ) : ordersLoading ? null : orders.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {orders.map((order) => (
                  <article key={order.id} className="rounded-xl border bg-card p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold">{order.name}</h3>
                      <StatusBadge value={projectOrderStatusLabel(order.status)} />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm">
                      {order.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Budget: {money(order.budget)}</span>
                      {order.hourly_rate ? <span>Hourly: {money(order.hourly_rate)}</span> : null}
                      <span>Deadline: {fmtDate(order.deadline)}</span>
                    </div>
                    <Button
                      className="mt-5"
                      onClick={() => acceptOrder(order.id)}
                      disabled={busyId === order.id}
                    >
                      {busyId === order.id ? "Accepting..." : "Accept order"}
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <Empty>There are no open orders right now.</Empty>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
