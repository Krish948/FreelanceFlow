import { useQueryClient } from "@tanstack/react-query";
import { startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TimeLogDialog } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { ConfirmDelete, Empty, Panel, Stat } from "@/components/ui-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useTimeLogs, type TimeLog } from "@/lib/data";
import { errMsg, hours, money } from "@/lib/format";

export function TimeTrackerSection() {
  const { data: logs = [] } = useTimeLogs();
  const qc = useQueryClient();
  const now = new Date();
  const sum = (from: Date) =>
    logs
      .filter((log) => new Date(log.start_time) >= from)
      .reduce((total, log) => total + log.duration_minutes, 0);

  async function del(log: TimeLog) {
    const { error } = await supabase.from("time_logs").delete().eq("id", log.id);
    if (error) return toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: ["time_logs"] });
  }

  return (
    <section id="time-tracker" className="scroll-mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Time tracker</h2>
          <p className="text-sm text-muted-foreground">
            Use the timer in the sidebar, or add entries manually.
          </p>
        </div>
        <TimeLogDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" />
              Add time
            </Button>
          }
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Today" value={hours(sum(startOfDay(now)))} />
        <Stat label="This week" value={hours(sum(startOfWeek(now, { weekStartsOn: 1 })))} />
        <Stat label="This month" value={hours(sum(startOfMonth(now)))} />
      </div>
      <Panel className="mt-6 overflow-x-auto">
        {logs.length === 0 ? (
          <Empty>No time entries yet.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(log.start_time).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>{log.projects?.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.description || "—"}
                    {!log.billable && " · non-billable"}
                    {log.billed && " · invoiced"}
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {hours(log.duration_minutes)}
                  </TableCell>
                  <TableCell className="text-right tabular">{money(log.hourly_rate)}</TableCell>
                  <TableCell className="text-right tabular font-medium">
                    {money(log.billable_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!log.billed && (
                      <div className="flex justify-end gap-1">
                        <TimeLogDialog
                          log={log}
                          trigger={
                            <button className="rounded p-1 hover:bg-muted" aria-label="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                        <ConfirmDelete
                          title="Delete time entry?"
                          description="This can't be undone."
                          onConfirm={() => del(log)}
                          trigger={
                            <button
                              className="rounded p-1 text-destructive hover:bg-muted"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </section>
  );
}
