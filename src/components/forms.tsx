import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Client, Project, ProjectOrder, Task, TimeLog } from "@/lib/data";
import { useClients, useProjects } from "@/lib/data";
import { errMsg } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectCls } from "@/components/ui-kit";

function useDialog() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

export function ClientDialog({ trigger, client }: { trigger: ReactNode; client?: Client }) {
  const { open, setOpen } = useDialog();
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    default_hourly_rate: "0",
    notes: "",
  });
  const [limit, setLimit] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setLimit(null);
      setF({
        name: client?.name ?? "",
        company: client?.company ?? "",
        email: client?.email ?? "",
        phone: client?.phone ?? "",
        address: client?.address ?? "",
        default_hourly_rate: String(client?.default_hourly_rate ?? 0),
        notes: client?.notes ?? "",
      });
    }
  }, [open, client]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...f, default_hourly_rate: Number(f.default_hourly_rate) || 0 };
    const { error } = client
      ? await supabase.from("clients").update(payload).eq("id", client.id)
      : await supabase.from("clients").insert(payload);
    if (error) {
      if (error.message.includes("PLAN_LIMIT")) return setLimit(errMsg(error));
      return toast.error(errMsg(error));
    }
    qc.invalidateQueries({ queryKey: ["clients"] });
    toast.success(client ? "Client updated" : "Client added");
    setOpen(false);
  }
  const set =
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "New client"}</DialogTitle>
        </DialogHeader>
        {limit ? (
          <div className="grid gap-4 py-2">
            <p className="text-sm">{limit}</p>
            <Button asChild>
              <Link to="/pricing">See Pro plan</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={save} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input required value={f.name} onChange={set("name")} />
              </Field>
              <Field label="Company">
                <Input value={f.company} onChange={set("company")} />
              </Field>
              <Field label="Email">
                <Input type="email" value={f.email} onChange={set("email")} />
              </Field>
              <Field label="Phone">
                <Input value={f.phone} onChange={set("phone")} />
              </Field>
            </div>
            <Field label="Address">
              <Input value={f.address} onChange={set("address")} />
            </Field>
            <Field label="Default hourly rate (₹)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={f.default_hourly_rate}
                onChange={set("default_hourly_rate")}
              />
            </Field>
            <Field label="Notes">
              <Textarea value={f.notes} onChange={set("notes")} />
            </Field>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ProjectDialog({
  trigger,
  project,
  clientId,
}: {
  trigger: ReactNode;
  project?: Project;
  clientId?: string;
}) {
  const { open, setOpen } = useDialog();
  const qc = useQueryClient();
  const { data: clients = [] } = useClients();
  const [f, setF] = useState({
    name: "",
    description: "",
    client_id: "",
    status: "ACTIVE",
    budget: "0",
    hourly_rate: "",
    start_date: "",
    deadline: "",
  });
  useEffect(() => {
    if (open)
      setF({
        name: project?.name ?? "",
        description: project?.description ?? "",
        client_id: project?.client_id ?? clientId ?? "",
        status: project?.status ?? "ACTIVE",
        budget: String(project?.budget ?? 0),
        hourly_rate: project?.hourly_rate != null ? String(project.hourly_rate) : "",
        start_date: project?.start_date ?? "",
        deadline: project?.deadline ?? "",
      });
  }, [open, project, clientId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.client_id) return toast.error("Choose a client");
    const payload = {
      name: f.name,
      description: f.description || null,
      client_id: f.client_id,
      status: f.status as Project["status"],
      budget: Number(f.budget) || 0,
      hourly_rate: f.hourly_rate === "" ? null : Number(f.hourly_rate),
      start_date: f.start_date || null,
      deadline: f.deadline || null,
    };
    const { error } = project
      ? await supabase.from("projects").update(payload).eq("id", project.id)
      : await supabase.from("projects").insert(payload);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["projects"] });
    toast.success(project ? "Project updated" : "Project created");
    setOpen(false);
  }
  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
        </DialogHeader>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a client first, then create projects for them.
          </p>
        ) : (
          <form onSubmit={save} className="grid gap-3">
            <Field label="Name">
              <Input required value={f.name} onChange={set("name")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Client">
                <select
                  className={selectCls}
                  value={f.client_id}
                  onChange={set("client_id")}
                  required
                >
                  <option value="">Select…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select className={selectCls} value={f.status} onChange={set("status")}>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </Field>
              <Field label="Budget (₹)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={f.budget}
                  onChange={set("budget")}
                />
              </Field>
              <Field label="Hourly rate (₹, optional)">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Client default"
                  value={f.hourly_rate}
                  onChange={set("hourly_rate")}
                />
              </Field>
              <Field label="Start date">
                <Input type="date" value={f.start_date} onChange={set("start_date")} />
              </Field>
              <Field label="Deadline">
                <Input type="date" value={f.deadline} onChange={set("deadline")} />
              </Field>
            </div>
            <Field label="Description">
              <Textarea value={f.description} onChange={set("description")} />
            </Field>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ProjectOrderDialog({
  trigger,
  order,
}: {
  trigger: ReactNode;
  order?: ProjectOrder;
}) {
  const { open, setOpen } = useDialog();
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: "",
    description: "",
    budget: "0",
    hourly_rate: "",
    deadline: "",
  });

  useEffect(() => {
    if (open) {
      setF({
        name: order?.name ?? "",
        description: order?.description ?? "",
        budget: String(order?.budget ?? 0),
        hourly_rate: order?.hourly_rate != null ? String(order.hourly_rate) : "",
        deadline: order?.deadline ?? "",
      });
    }
  }, [open, order]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.deadline) return toast.error("Set a deadline for the project");
    const payload = {
      name: f.name.trim(),
      description: f.description.trim() || null,
      budget: Number(f.budget) || 0,
      hourly_rate: f.hourly_rate === "" ? null : Number(f.hourly_rate),
      deadline: f.deadline || null,
      status: order?.status ?? "OPEN",
    };
    if (!payload.name) return toast.error("Give the project a clear title");

    const { error } = order
      ? await supabase.from("project_orders").update(payload).eq("id", order.id)
      : await supabase.from("project_orders").insert(payload);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["client_project_orders"] });
    qc.invalidateQueries({ queryKey: ["open_project_orders"] });
    toast.success(order ? "Project order updated" : "Project order posted");
    setOpen(false);
  }

  const set =
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{order ? "Edit project order" : "Post project order"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-3">
          <Field label="Project title">
            <Input required value={f.name} onChange={set("name")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget (₹)">
              <Input type="number" min="0" step="0.01" value={f.budget} onChange={set("budget")} />
            </Field>
            <Field label="Hourly rate (₹, optional)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={f.hourly_rate}
                onChange={set("hourly_rate")}
              />
            </Field>
          </div>
          <Field label="Deadline">
            <Input
              type="date"
              required
              min={new Date().toISOString().slice(0, 10)}
              value={f.deadline}
              onChange={set("deadline")}
            />
          </Field>
          <Field label="Project brief">
            <Textarea value={f.description} onChange={set("description")} />
          </Field>
          <DialogFooter>
            <Button type="submit">{order ? "Save" : "Post"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskDialog({
  trigger,
  task,
  projectId,
}: {
  trigger: ReactNode;
  task?: Task;
  projectId: string;
}) {
  const { open, setOpen } = useDialog();
  const qc = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [f, setF] = useState({
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    due_date: "",
  });
  useEffect(() => {
    if (open) setVisible(task?.client_visible ?? false);
    if (open)
      setF({
        title: task?.title ?? "",
        description: task?.description ?? "",
        status: task?.status ?? "TODO",
        priority: task?.priority ?? "MEDIUM",
        due_date: task?.due_date ?? "",
      });
  }, [open, task]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: f.title,
      description: f.description || null,
      status: f.status as Task["status"],
      priority: f.priority as Task["priority"],
      due_date: f.due_date || null,
      project_id: projectId,
      client_visible: visible,
    };
    const { error } = task
      ? await supabase.from("tasks").update(payload).eq("id", task.id)
      : await supabase.from("tasks").insert(payload);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["tasks"] });
    setOpen(false);
  }
  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-3">
          <Field label="Title">
            <Input required value={f.title} onChange={set("title")} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Status">
              <select className={selectCls} value={f.status} onChange={set("status")}>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </Field>
            <Field label="Priority">
              <select className={selectCls} value={f.priority} onChange={set("priority")}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </Field>
            <Field label="Due">
              <Input type="date" value={f.due_date} onChange={set("due_date")} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={f.description} onChange={set("description")} />
          </Field>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
            />
            Visible to client
          </label>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (iso: string) => {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

export function TimeLogDialog({
  trigger,
  log,
  projectId,
}: {
  trigger: ReactNode;
  log?: TimeLog;
  projectId?: string;
}) {
  const { open, setOpen } = useDialog();
  const qc = useQueryClient();
  const { data: projects = [] } = useProjects();
  const today = toLocal(new Date().toISOString()).date;
  const [f, setF] = useState({
    project_id: "",
    date: today,
    start: "09:00",
    end: "10:00",
    duration: "60",
    description: "",
    billable: true,
  });
  useEffect(() => {
    if (!open) return;
    if (log) {
      const s = toLocal(log.start_time),
        e = toLocal(log.end_time);
      setF({
        project_id: log.project_id,
        date: s.date,
        start: s.time,
        end: e.time,
        duration: String(log.duration_minutes),
        description: log.description ?? "",
        billable: log.billable,
      });
    } else
      setF({
        project_id: projectId ?? "",
        date: today,
        start: "09:00",
        end: "10:00",
        duration: "60",
        description: "",
        billable: true,
      });
  }, [open, log, projectId, today]);

  // Keep duration and end time in sync.
  const mins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const onTime = (k: "start" | "end", v: string) => {
    const next = { ...f, [k]: v };
    const d = mins(next.end) - mins(next.start);
    setF({ ...next, duration: String(d > 0 ? d : 0) });
  };
  const onDuration = (v: string) => {
    const end = mins(f.start) + (Number(v) || 0);
    setF({
      ...f,
      duration: v,
      end: end < 1440 ? `${pad(Math.floor(end / 60))}:${pad(end % 60)}` : f.end,
    });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.project_id) return toast.error("Choose a project");
    const start = new Date(`${f.date}T${f.start}`);
    const end = new Date(start.getTime() + (Number(f.duration) || 0) * 60_000);
    if (end <= start) return toast.error("Duration must be greater than zero");
    const payload = {
      project_id: f.project_id,
      description: f.description || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      billable: f.billable,
    };
    const { error } = log
      ? await supabase.from("time_logs").update(payload).eq("id", log.id)
      : await supabase.from("time_logs").insert(payload);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["time_logs"] });
    toast.success("Time saved");
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{log ? "Edit time entry" : "Add time manually"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-3">
          <Field label="Project">
            <select
              className={selectCls}
              value={f.project_id}
              onChange={(e) => setF({ ...f, project_id: e.target.value })}
              required
            >
              <option value="">Select…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Date">
              <Input
                type="date"
                value={f.date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
            </Field>
            <Field label="Start">
              <Input
                type="time"
                value={f.start}
                onChange={(e) => onTime("start", e.target.value)}
              />
            </Field>
            <Field label="End">
              <Input type="time" value={f.end} onChange={(e) => onTime("end", e.target.value)} />
            </Field>
            <Field label="Minutes">
              <Input
                type="number"
                min="1"
                value={f.duration}
                onChange={(e) => onDuration(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Description">
            <Input
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.billable}
              onChange={(e) => setF({ ...f, billable: e.target.checked })}
            />
            Billable
          </label>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
