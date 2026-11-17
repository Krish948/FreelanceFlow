import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, FileText, LineChart, Users, FolderKanban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FreelanceFlow — Run your freelance business in one place" },
      {
        name: "description",
        content:
          "Clients, projects, time tracking, invoices and finances for freelancers — in one calm dashboard.",
      },
      { property: "og:title", content: "FreelanceFlow — Run your freelance business in one place" },
      {
        property: "og:description",
        content: "Clients, projects, time tracking, invoices and finances for freelancers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Users, t: "Client CRM", d: "Contacts, rates and history for every client." },
  { icon: FolderKanban, t: "Projects & tasks", d: "Budgets, deadlines and a simple Kanban board." },
  { icon: Clock, t: "Time tracking", d: "A stopwatch that keeps running while you work." },
  { icon: FileText, t: "Invoices & PDF", d: "Turn unbilled hours into a professional invoice." },
  { icon: LineChart, t: "Finance", d: "Revenue, outstanding payments and billable hours." },
  { icon: ShieldCheck, t: "Private by design", d: "Your data is visible only to you." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <nav className="flex items-center justify-between">
            <span className="font-display text-xl font-semibold">FreelanceFlow</span>
            <div className="flex gap-2">
              <Button
                asChild
                variant="ghost"
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start free
                </Link>
              </Button>
            </div>
          </nav>
          <div className="max-w-3xl py-24 md:py-32">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              For independent professionals
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.05] md:text-7xl">
              Stop juggling Trello, Excel and Word.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-primary-foreground/75">
              Track time, manage clients and send invoices from one dashboard — built for the way
              freelancers actually work.
            </p>
            <div className="mt-10 flex gap-3">
              <Button
                asChild
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create free account
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-px overflow-hidden px-6 py-20 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, t, d }) => (
          <div key={t} className="border-t p-6">
            <Icon className="h-5 w-5 text-primary" />
            <h3 className="mt-4 text-xl font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
