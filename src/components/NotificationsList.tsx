import { useQueryClient } from "@tanstack/react-query";
import { Check, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/lib/portal-data";
import { PageHeader, Empty } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";

export function NotificationsList() {
  const { data: notifications = [], error } = useNotifications();
  const qc = useQueryClient();
  async function read(id?: string) {
    const query = supabase.from("notifications").update({ read: true });
    const { error } = await (id ? query.eq("id", id) : query.eq("read", false));
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          <Button
            variant="outline"
            disabled={!notifications.some((n) => !n.read)}
            onClick={() => read()}
          >
            <Check className="h-4 w-4" />
            Mark all read
          </Button>
        }
      />
      {error ? (
        <p className="text-destructive">{error.message}</p>
      ) : !notifications.length ? (
        <Empty>No notifications yet.</Empty>
      ) : (
        <ul className="divide-y">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start gap-3 py-5">
              <Bell
                className={
                  n.read ? "mt-1 h-4 w-4 text-muted-foreground" : "mt-1 h-4 w-4 text-primary"
                }
              />
              <div className="min-w-0 flex-1">
                <p className={n.read ? "font-medium text-muted-foreground" : "font-semibold"}>
                  {n.title}
                </p>
                <p className="mt-1 break-words text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{fmtDate(n.created_at)}</p>
              </div>
              {!n.read && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Mark read"
                  onClick={() => read(n.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
