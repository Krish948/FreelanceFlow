import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { unwrap, useProfile } from "@/lib/data";
import { PageHeader, Empty, Field, selectCls } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ProjectMessages({ projects }: { projects: { id: string; name: string }[] }) {
  const [chosen, setChosen] = useState("");
  const pid = chosen || projects[0]?.id || "";
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: messages = [], error } = useQuery({
    queryKey: ["messages", pid],
    enabled: !!pid,
    queryFn: () =>
      unwrap(supabase.from("messages").select("*").eq("project_id", pid).order("created_at")),
  });
  useEffect(() => {
    if (!pid) return;
    const channel = supabase
      .channel(`messages-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${pid}` },
        () => {
          qc.invalidateQueries({ queryKey: ["messages", pid] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pid, qc]);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !pid || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from("messages")
      .insert({ project_id: pid, body: body.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody("");
    qc.invalidateQueries({ queryKey: ["messages", pid] });
  }
  return (
    <>
      <PageHeader title="Messages" />
      {projects.length === 0 ? (
        <Empty>No project conversations yet.</Empty>
      ) : (
        <>
          <Field label="Project">
            <select className={selectCls} value={pid} onChange={(e) => setChosen(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="my-6 grid min-h-64 content-start gap-3 border-y py-6">
            {error ? (
              <p className="text-destructive">{error.message}</p>
            ) : messages.length === 0 ? (
              <Empty>No messages yet.</Empty>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.sender_id === profile?.id
                      ? "ml-auto max-w-[85%] rounded-md bg-primary p-3 text-primary-foreground"
                      : "mr-auto max-w-[85%] rounded-md bg-muted p-3"
                  }
                >
                  <p className="mb-1 text-xs opacity-70">
                    {m.sender_id === profile?.id ? "You" : "Project partner"} ·{" "}
                    {new Date(m.created_at).toLocaleString("en-IN")}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={send} className="flex items-end gap-3">
            <Textarea
              aria-label="Message"
              placeholder="Write a message…"
              required
              maxLength={4000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button type="submit" disabled={busy || !body.trim()}>
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </>
      )}
    </>
  );
}
