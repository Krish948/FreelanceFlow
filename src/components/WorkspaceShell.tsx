import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  FolderKanban,
  Clock,
  FileText,
  Wallet,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, usePlan } from "@/lib/data";
import { TimerWidget } from "@/components/TimerWidget";
import { Button } from "@/components/ui/button";
import { roleHome, type AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

const freelancerNav = [
  { to: "/freelancer/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/freelancer/clients", label: "My Work", icon: Users },
  { to: "/freelancer/tasks", label: "Tasks", icon: ListChecks },
  { to: "/freelancer/finance", label: "Time & Reports", icon: Clock },
  { to: "/freelancer/invoices", label: "Billing", icon: FileText },
  { to: "/freelancer/profile", label: "Settings", icon: Settings },
] as const;
const clientNav = [
  { to: "/client/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/client/projects", label: "My Projects & Orders", icon: FolderKanban },
  { to: "/client/tasks", label: "Tasks & Milestones", icon: ListChecks },
  { to: "/client/invoices", label: "Billing", icon: Wallet },
  { to: "/client/notifications", label: "Notifications", icon: Bell },
  { to: "/client/account", label: "My Account", icon: Settings },
] as const;

function FreelancerFooter() {
  const { data: plan } = usePlan();
  return (
    <>
      <TimerWidget />
      <Link to="/freelancer/invoices" className="text-xs text-sidebar-foreground/70">
        {plan ?? "FREE"} plan
      </Link>
    </>
  );
}
export function WorkspaceShell({ role, children }: { role: AppRole; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }
  const side = (
    <div className="flex min-h-full flex-col p-4">
      <Link
        to={roleHome(role)}
        className="mb-1 flex items-center gap-2 px-2 py-2 font-display text-xl text-sidebar-accent-foreground"
      >
        <span className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          f
        </span>
        FreelanceFlow
      </Link>
      <p className="mb-5 px-2 text-xs text-sidebar-foreground/60">
        {role === "client" ? "CLIENT WORKSPACE" : "FREELANCER WORKSPACE"}
      </p>
      <nav
        className="grid gap-0.5"
        aria-label={role === "client" ? "Client navigation" : "Freelancer navigation"}
      >
        {(role === "client" ? clientNav : freelancerNav).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto grid gap-3 pt-5">
        {role === "freelancer" && <FreelancerFooter />}
        <div className="border-t border-sidebar-border pt-3 text-sm text-sidebar-foreground">
          <p className="truncate px-2">{profile?.name || "My account"}</p>
          <Button
            variant="ghost"
            className="mt-1 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto bg-sidebar lg:block">
        {side}
      </aside>
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "block" : "hidden")}>
        <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
        <aside className="relative h-full w-72 overflow-y-auto bg-sidebar">
          <Button
            aria-label="Close menu"
            size="icon"
            variant="ghost"
            className="absolute right-2 top-2 text-sidebar-foreground"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
          {side}
        </aside>
      </div>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background px-4 py-2 lg:hidden">
        <Button size="icon" variant="ghost" aria-label="Open menu" onClick={() => setOpen(true)}>
          <Menu />
        </Button>
        <span className="font-display text-lg">FreelanceFlow</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {role === "client" ? "Client" : "Freelancer"}
        </span>
      </header>
      <main className="px-4 py-8 lg:ml-64 lg:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
