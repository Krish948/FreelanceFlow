import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, Check, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDeliverables } from "@/lib/portal-data";
import { PageHeader, Empty, Field, selectCls, ConfirmDelete } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDate } from "@/lib/format";

export function DeliverablesList({
  client = false,
  projects,
}: {
  client?: boolean;
  projects: { id: string; name: string }[];
}) {
  const { data: files = [], error } = useDeliverables();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ project_id: "", title: "", description: "", version: "1" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewId, setReviewId] = useState("");
  const [feedback, setFeedback] = useState("");
  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !f.project_id || busy) return;
    setBusy(true);
    const path = `${f.project_id}/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploaded = await supabase.storage.from("deliverables").upload(path, file);
    if (uploaded.error) {
      setBusy(false);
      return toast.error(uploaded.error.message);
    }
    const { error } = await supabase
      .from("deliverables")
      .insert({ ...f, version: Number(f.version), file_path: path, file_name: file.name });
    if (error) {
      await supabase.storage.from("deliverables").remove([path]);
      toast.error(error.message);
    } else {
      setOpen(false);
      setFile(null);
      setF({ project_id: "", title: "", description: "", version: "1" });
      qc.invalidateQueries({ queryKey: ["deliverables"] });
      toast.success("Deliverable uploaded");
    }
    setBusy(false);
  }
  async function download(path: string, name: string) {
    const { data, error } = await supabase.storage.from("deliverables").download(path);
    if (error || !data) return toast.error(error?.message || "File unavailable");
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function review(id: string, decision: "APPROVED" | "REVISION_REQUESTED") {
    const { error } = await supabase.rpc("review_deliverable", {
      _id: id,
      _decision: decision,
      _feedback: decision === "APPROVED" ? "" : feedback,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["deliverables"] });
    setReviewId("");
    setFeedback("");
    toast.success(decision === "APPROVED" ? "Approved" : "Revision requested");
  }
  async function remove(id: string, path: string) {
    const { error } = await supabase.from("deliverables").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.storage.from("deliverables").remove([path]);
    qc.invalidateQueries({ queryKey: ["deliverables"] });
  }
  return (
    <>
      <PageHeader
        title="Deliverables"
        actions={
          !client && (
            <Button disabled={!projects.length} onClick={() => setOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload file
            </Button>
          )
        }
      />
      {error ? (
        <p className="text-destructive">{error.message}</p>
      ) : !files.length ? (
        <Empty>No deliverables yet.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {files.map((d) => (
            <article key={d.id} className="rounded-lg border bg-card p-5">
              <p className="text-xs text-muted-foreground">
                {projects.find((p) => p.id === d.project_id)?.name} · Version {d.version} ·{" "}
                {fmtDate(d.created_at)}
              </p>
              <h2 className="mt-2 text-xl font-semibold break-words">{d.title}</h2>
              <p className="mt-2 break-words text-sm text-muted-foreground">{d.description}</p>
              <p className="mt-3 text-sm font-medium">
                {d.status === "APPROVED"
                  ? "Approved"
                  : d.status === "REVISION_REQUESTED"
                    ? "Revision requested"
                    : "Pending review"}
              </p>
              {d.feedback && <p className="mt-2 whitespace-pre-wrap text-sm">{d.feedback}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => download(d.file_path, d.file_name)}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                {client && d.status !== "APPROVED" && (
                  <>
                    <Button size="sm" onClick={() => review(d.id, "APPROVED")}>
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReviewId(d.id);
                        setFeedback("");
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Request revision
                    </Button>
                  </>
                )}
                {!client && (
                  <ConfirmDelete
                    title="Delete deliverable?"
                    description={d.title}
                    onConfirm={() => remove(d.id, d.file_path)}
                    trigger={
                      <Button size="icon" variant="ghost" aria-label="Delete deliverable">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload deliverable</DialogTitle>
          </DialogHeader>
          <form onSubmit={upload} className="grid gap-3">
            <Field label="Project">
              <select
                required
                className={selectCls}
                value={f.project_id}
                onChange={(e) => setF({ ...f, project_id: e.target.value })}
              >
                <option value="">Choose a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <Input
                required
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
              />
            </Field>
            <Field label="Version">
              <Input
                type="number"
                min="1"
                required
                value={f.version}
                onChange={(e) => setF({ ...f, version: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={f.description}
                onChange={(e) => setF({ ...f, description: e.target.value })}
              />
            </Field>
            <Field label="File">
              <Input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!reviewId}
        onOpenChange={(v) => {
          if (!v) setReviewId("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request revision</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void review(reviewId, "REVISION_REQUESTED");
            }}
            className="grid gap-3"
          >
            <Field label="Requested changes">
              <Textarea required value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            </Field>
            <Button type="submit">Send request</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
